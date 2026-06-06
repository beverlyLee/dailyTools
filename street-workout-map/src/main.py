import os
import sys
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")

sys.path.insert(0, BASE_DIR)

from sanic import Sanic, response
from sanic.response import json as sanic_json, html, file

from src.social.fitness_topic_spider import FitnessTopicSpider
from src.poi.park_facility_checker import ParkFacilityChecker
from src.heat.workout_heat import WorkoutHeatCalculator

app = Sanic("StreetWorkoutMap")
app.static("/static", STATIC_DIR)


def _get_heat_data():
    heat_file = os.path.join(DATA_DIR, "workout_heat_data.json")
    if os.path.exists(heat_file):
        with open(heat_file, "r", encoding="utf-8") as f:
            return json.load(f)
    
    spider = FitnessTopicSpider(city="上海", use_mock=True)
    posts = spider.crawl()
    locations = spider.extract_locations()
    
    checker = ParkFacilityChecker(use_mock=True)
    verified = checker.batch_verify(locations)
    
    heat_calc = WorkoutHeatCalculator()
    heat_calc.load_social_data(posts)
    heat_calc.load_poi_data(verified)
    
    results = heat_calc.calculate_heat()
    heat_calc.save_results()
    
    return results


@app.get("/")
async def index(request):
    template_path = os.path.join(TEMPLATES_DIR, "index.html")
    if os.path.exists(template_path):
        with open(template_path, "r", encoding="utf-8") as f:
            return html(f.read())
    return html("<h1>街头健身地图</h1><p>页面加载中...</p>")


@app.get("/api/heat")
async def get_heat_data(request):
    try:
        data = _get_heat_data()
        return sanic_json({
            "code": 0,
            "message": "success",
            "total": len(data),
            "data": data
        })
    except Exception as e:
        return sanic_json({
            "code": 500,
            "message": f"获取数据失败: {str(e)}",
            "data": []
        }, status=500)


@app.get("/api/locations")
async def get_locations(request):
    try:
        data = _get_heat_data()
        
        min_heat = request.args.get("min_heat")
        if min_heat:
            try:
                min_score = float(min_heat)
                data = [d for d in data if d["heat_score"] >= min_score]
            except ValueError:
                pass
        
        district = request.args.get("district")
        if district:
            data = [d for d in data if d.get("district") == district]
        
        only_parks = request.args.get("only_parks")
        if only_parks and only_parks.lower() == "true":
            data = [d for d in data if d.get("is_park")]
        
        return sanic_json({
            "code": 0,
            "message": "success",
            "total": len(data),
            "data": data
        })
    except Exception as e:
        return sanic_json({
            "code": 500,
            "message": f"获取数据失败: {str(e)}",
            "data": []
        }, status=500)


@app.get("/api/location/<location_id>")
async def get_location_detail(request, location_id):
    try:
        data = _get_heat_data()
        location = None
        for loc in data:
            if loc.get("id") == location_id or loc.get("name") == location_id:
                location = loc
                break
        
        if not location:
            return sanic_json({
                "code": 404,
                "message": "未找到该地点",
                "data": None
            }, status=404)
        
        return sanic_json({
            "code": 0,
            "message": "success",
            "data": location
        })
    except Exception as e:
        return sanic_json({
            "code": 500,
            "message": f"获取详情失败: {str(e)}",
            "data": None
        }, status=500)


@app.get("/api/districts")
async def get_districts(request):
    try:
        data = _get_heat_data()
        districts = {}
        for loc in data:
            district = loc.get("district", "未知")
            if district not in districts:
                districts[district] = {
                    "name": district,
                    "count": 0,
                    "avg_heat": 0.0,
                    "locations": []
                }
            districts[district]["count"] += 1
            districts[district]["avg_heat"] += loc.get("heat_score", 0)
            districts[district]["locations"].append(loc["name"])
        
        for d in districts.values():
            if d["count"] > 0:
                d["avg_heat"] = round(d["avg_heat"] / d["count"], 2)
        
        district_list = sorted(districts.values(), key=lambda x: x["avg_heat"], reverse=True)
        
        return sanic_json({
            "code": 0,
            "message": "success",
            "data": district_list
        })
    except Exception as e:
        return sanic_json({
            "code": 500,
            "message": f"获取区域数据失败: {str(e)}",
            "data": []
        }, status=500)


@app.get("/api/health")
async def health(request):
    heat_file = os.path.join(DATA_DIR, "workout_heat_data.json")
    has_data = os.path.exists(heat_file)
    
    return sanic_json({
        "status": "ok",
        "has_data": has_data,
        "data_file": "workout_heat_data.json" if has_data else None
    })


if __name__ == "__main__":
    print("街头健身地图 - Sanic 服务启动中...")
    print(f"数据目录: {DATA_DIR}")
    print(f"模板目录: {TEMPLATES_DIR}")
    
    _get_heat_data()
    print("数据初始化完成")
    
    app.run(host="0.0.0.0", port=8000, debug=True)
