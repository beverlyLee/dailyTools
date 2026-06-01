#!/usr/bin/env python3
"""
城市漫步路线评估工具 - 主入口
分析小红书、抖音、快手等平台推荐的路线，计算热门程度与商业化程度
"""

import sys
import os
import json
import time
import threading
import urllib.request
import urllib.parse
from urllib.parse import unquote
from collections import OrderedDict

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
sys.path.insert(0, PROJECT_DIR)

from sanic import Sanic
from sanic import response

from src.data.mock_data import (
    get_all_notes,
    get_notes_by_city
)
from src.mining.walk_route import (
    extract_all_routes,
    get_route_bounds,
    get_route_center
)
from src.analysis.route_overlay import (
    calculate_route_overlay,
    find_core_walk_paths,
    calculate_city_hotness_stats,
    calculate_commercial_analysis,
    get_overlap_summary
)

app = Sanic("CityWalkHotspot")

STATIC_DIR = os.path.join(PROJECT_DIR, "static")
app.static("/static", STATIC_DIR)


def load_env_config():
    env_file = os.path.join(PROJECT_DIR, ".env")
    config = {}
    if os.path.exists(env_file):
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    config[key.strip()] = value.strip()
    return config


APP_CONFIG = load_env_config()


class LRUCache:
    def __init__(self, max_size=200, ttl=3600):
        self.max_size = max_size
        self.ttl = ttl
        self.cache = OrderedDict()
        self.lock = threading.Lock()
    
    def get(self, key):
        with self.lock:
            if key in self.cache:
                item = self.cache[key]
                if time.time() - item['timestamp'] < self.ttl:
                    self.cache.move_to_end(key)
                    return item['value']
                else:
                    del self.cache[key]
            return None
    
    def put(self, key, value):
        with self.lock:
            if key in self.cache:
                self.cache.move_to_end(key)
            elif len(self.cache) >= self.max_size:
                self.cache.popitem(last=False)
            self.cache[key] = {'value': value, 'timestamp': time.time()}
    
    def clear(self):
        with self.lock:
            self.cache.clear()


WALKING_ROUTE_CACHE = LRUCache(max_size=200, ttl=3600)


def make_cache_key(origin_lng, origin_lat, dest_lng, dest_lat):
    return f"{round(origin_lng, 6)},{round(origin_lat, 6)}-{round(dest_lng, 6)},{round(dest_lat, 6)}"


def fetch_gaode_walking_route(origin_lng, origin_lat, dest_lng, dest_lat):
    cache_key = make_cache_key(origin_lng, origin_lat, dest_lng, dest_lat)
    
    cached = WALKING_ROUTE_CACHE.get(cache_key)
    if cached is not None:
        return cached
    
    api_key = APP_CONFIG.get("GAODE_API_KEY", "")
    if not api_key:
        return None
    
    origin = f"{origin_lng},{origin_lat}"
    destination = f"{dest_lng},{dest_lat}"
    
    url = f"https://restapi.amap.com/v3/direction/walking?origin={origin}&destination={destination}&key={api_key}"
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data.get("status") == "1" and data.get("route", {}).get("paths"):
                path = data["route"]["paths"][0]
                steps = path.get("steps", [])
                
                all_coords = []
                for step in steps:
                    polyline = step.get("polyline", "")
                    if polyline:
                        coords = [
                            [float(coord.split(",")[1]), float(coord.split(",")[0])]
                            for coord in polyline.split(";")
                            if "," in coord
                        ]
                        all_coords.extend(coords)
                
                result = {
                    "distance": float(path.get("distance", 0)),
                    "duration": int(path.get("duration", 0)),
                    "coords": all_coords,
                    "steps_count": len(steps)
                }
                WALKING_ROUTE_CACHE.put(cache_key, result)
                return result
            else:
                error_info = data.get("info", "unknown error")
                print(f"高德API返回错误: status={data.get('status')}, info={error_info}")
    except urllib.error.HTTPError as e:
        print(f"高德步行路径HTTP错误: {e.code} {e.reason}")
    except urllib.error.URLError as e:
        print(f"高德步行路径URL错误: {e.reason}")
    except json.JSONDecodeError as e:
        print(f"高德步行路径JSON解析错误: {e}")
    except Exception as e:
        print(f"高德步行路径请求失败: {type(e).__name__}: {e}")
    
    return None


def get_route_walking_path(route_points):
    if len(route_points) < 2:
        return []
    
    all_walking_coords = []
    for i in range(len(route_points) - 1):
        start = route_points[i]
        end = route_points[i + 1]
        
        walking_path = fetch_gaode_walking_route(
            start["lng"], start["lat"],
            end["lng"], end["lat"]
        )
        
        if walking_path and walking_path["coords"]:
            if i == 0:
                all_walking_coords.extend(walking_path["coords"])
            else:
                all_walking_coords.extend(walking_path["coords"][1:])
        else:
            all_walking_coords.append([start["lat"], start["lng"]])
            all_walking_coords.append([end["lat"], end["lng"]])
    
    return all_walking_coords


def get_cities_data():
    notes = get_all_notes()
    cities = set(note.get("city", "") for note in notes)
    return sorted([c for c in cities if c])


def get_platforms_data():
    notes = get_all_notes()
    platforms = set(note.get("platform", "") for note in notes)
    return sorted([p for p in platforms if p])


def process_routes(notes):
    routes = extract_all_routes(notes)
    overlay_segments = calculate_route_overlay(routes)
    core_paths = find_core_walk_paths(overlay_segments, min_overlap=2)
    
    return {
        "routes": [r.to_dict() for r in routes],
        "overlay_segments": [s.to_dict() for s in overlay_segments],
        "core_paths": [s.to_dict() for s in core_paths],
        "core_paths_count": len(core_paths),
        "bounds": get_route_bounds(routes),
        "center": {"lat": get_route_center(routes)[0], "lng": get_route_center(routes)[1]},
        "hotness_stats": calculate_city_hotness_stats(routes),
        "commercial_analysis": calculate_commercial_analysis(routes),
        "overlap_summary": get_overlap_summary(overlay_segments)
    }


@app.get("/")
async def index(request):
    return await response.file(os.path.join(STATIC_DIR, "index.html"))


@app.get("/api/route/walking")
async def api_route_walking(request):
    origin_lng = float(request.args.get("origin_lng", 0))
    origin_lat = float(request.args.get("origin_lat", 0))
    dest_lng = float(request.args.get("dest_lng", 0))
    dest_lat = float(request.args.get("dest_lat", 0))
    
    if not all([origin_lng, origin_lat, dest_lng, dest_lat]):
        return response.json({"error": "缺少必要参数"}, status=400)
    
    result = fetch_gaode_walking_route(origin_lng, origin_lat, dest_lng, dest_lat)
    if result:
        return response.json(result)
    else:
        return response.json({"error": "路径规划失败"}, status=500)


@app.get("/api/route/full_walking")
async def api_route_full_walking(request):
    points_str = request.args.get("points", "")
    if not points_str:
        return response.json({"error": "缺少points参数"}, status=400)
    
    try:
        import ast
        points = ast.literal_eval(points_str)
    except Exception:
        return response.json({"error": "points参数格式错误"}, status=400)
    
    if not isinstance(points, list) or len(points) < 2:
        return response.json({"error": "points至少需要2个点"}, status=400)
    
    all_coords = []
    for i in range(len(points) - 1):
        start = points[i]
        end = points[i + 1]
        
        walking_path = fetch_gaode_walking_route(
            start["lng"], start["lat"],
            end["lng"], end["lat"]
        )
        
        if walking_path and walking_path["coords"]:
            if i == 0:
                all_coords.extend(walking_path["coords"])
            else:
                all_coords.extend(walking_path["coords"][1:])
        else:
            all_coords.append([start["lat"], start["lng"]])
            all_coords.append([end["lat"], end["lng"]])
    
    return response.json({"coords": all_coords})


@app.get("/api/config")
async def api_config(request):
    return response.json({
        "gaode_js_api_key": APP_CONFIG.get("GAODE_JS_API_KEY", ""),
        "gaode_api_key": APP_CONFIG.get("GAODE_API_KEY", "")
    })


@app.get("/api/cities")
async def api_cities(request):
    return response.json({"cities": get_cities_data()})


@app.get("/api/platforms")
async def api_platforms(request):
    return response.json({"platforms": get_platforms_data()})


@app.get("/api/routes")
async def api_routes(request):
    city = request.args.get("city", "")
    platform = request.args.get("platform", "")
    
    notes = get_all_notes()
    
    if city:
        notes = get_notes_by_city(city)
    if platform:
        notes = [n for n in notes if n.get("platform", "") == platform]
    
    result = process_routes(notes)
    result["filter"] = {"city": city, "platform": platform}
    
    return response.json(result)


@app.get("/api/routes/<city:path>")
async def api_routes_by_city(request, city):
    city = unquote(city)
    notes = get_notes_by_city(city)
    
    if not notes:
        return response.json({"error": f"未找到城市: {city}"}, status=404)
    
    result = process_routes(notes)
    result["filter"] = {"city": city}
    
    return response.json(result)


@app.get("/api/notes")
async def api_notes(request):
    city = request.args.get("city", "")
    platform = request.args.get("platform", "")
    
    notes = get_all_notes()
    
    if city:
        notes = get_notes_by_city(city)
    if platform:
        notes = [n for n in notes if n.get("platform", "") == platform]
    
    return response.json({"notes": notes, "total": len(notes)})


@app.get("/api/analysis")
async def api_analysis(request):
    city = request.args.get("city", "")
    
    notes = get_all_notes()
    if city:
        notes = get_notes_by_city(city)
    
    routes = extract_all_routes(notes)
    overlay_segments = calculate_route_overlay(routes)
    
    result = {
        "hotness_stats": calculate_city_hotness_stats(routes),
        "commercial_analysis": calculate_commercial_analysis(routes),
        "overlap_summary": get_overlap_summary(overlay_segments),
        "core_paths_count": len(find_core_walk_paths(overlay_segments, min_overlap=2))
    }
    
    return response.json(result)


@app.get("/api/heatmap")
async def api_heatmap(request):
    city = request.args.get("city", "")
    notes = get_all_notes()
    
    if city:
        notes = get_notes_by_city(city)
    
    routes = extract_all_routes(notes)
    overlay_segments = calculate_route_overlay(routes)
    
    heat_points = []
    for seg in overlay_segments:
        heat_points.append({
            "lat": seg.mid_lat,
            "lng": seg.mid_lng,
            "intensity": min(seg.avg_hotness / 50.0, 1.0),
            "hotness": seg.avg_hotness,
            "overlap_count": seg.overlap_count,
            "heat_level": seg.heat_level
        })
    
    return response.json({"heat_points": heat_points, "center": {"lat": get_route_center(routes)[0], "lng": get_route_center(routes)[1]}})


@app.get("/api/poi_colors")
async def api_poi_colors(request):
    return response.json({
        "type_colors": {
            "coffee": {"color": "#8B4513", "name": "咖啡馆"},
            "dessert": {"color": "#FF69B4", "name": "甜品店"},
            "restaurant": {"color": "#FF4500", "name": "餐厅"},
            "shop": {"color": "#4169E1", "name": "商店"},
            "clothing": {"color": "#9370DB", "name": "服装店"},
            "bookstore": {"color": "#228B22", "name": "书店"},
            "bar": {"color": "#DC143C", "name": "酒吧"},
            "snack": {"color": "#FFA500", "name": "小吃"},
            "park": {"color": "#32CD32", "name": "公园"}
        }
    })


@app.get("/api/cache/status")
async def api_cache_status(request):
    return response.json({
        "walking_route_cache": {
            "size": len(WALKING_ROUTE_CACHE.cache),
            "max_size": WALKING_ROUTE_CACHE.max_size,
            "ttl": WALKING_ROUTE_CACHE.ttl
        }
    })


@app.post("/api/cache/clear")
async def api_cache_clear(request):
    WALKING_ROUTE_CACHE.clear()
    return response.json({"status": "ok", "message": "缓存已清除"})


if __name__ == "__main__":
    print("=" * 60)
    print("🚶 城市漫步路线评估工具")
    print("=" * 60)
    print()
    print("📊 功能模块:")
    print("   1. 路线提取 - 从笔记中提取路线几何图形")
    print("   2. 路线重合度 - 计算重叠路段，找出核心漫步道")
    print("   3. 地图渲染 - 高亮显示路线热度与商业化")
    print()
    print("🌐 服务器启动中...")
    print("   访问地址: http://localhost:8000")
    print()
    print("✅ 验证要点:")
    print("   - 上海武康路-安福路路段线宽应最粗")
    print("   - 北京胡同漫步路线在什刹海区域应高度重合")
    print("=" * 60)
    
    app.run(host="0.0.0.0", port=8000, debug=True)
