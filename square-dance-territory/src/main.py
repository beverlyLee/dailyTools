import os
import sys
import json
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.requests import Request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.video.dance_video_spider import DanceVideoSpider
from src.clustering.territory_cluster import TerritoryClusterer
from src.conflict.overlap_detector import OverlapDetector

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")
ENV_FILE = os.path.join(BASE_DIR, ".env")


def _load_env():
    if not os.path.exists(ENV_FILE):
        return {}
    env_vars = {}
    with open(ENV_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                env_vars[key] = value
                os.environ[key] = value
    return env_vars


_load_env()


def _get_map_config() -> dict:
    return {
        "mapbox_token": os.environ.get("MAPBOX_TOKEN", ""),
        "gaode_js_key": os.environ.get("GAODE_JS_API_KEY", ""),
        "gaode_web_key": os.environ.get("GAODE_WEB_API_KEY", ""),
    }

app = FastAPI(title="广场舞领地分析系统",
              description="分析广场舞视频地理标签，识别舞队活动范围与领地冲突")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATE_DIR)


def _load_json_file(filepath: str) -> Optional[dict]:
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def _get_data_status() -> dict:
    video_file = os.path.join(DATA_DIR, "square_dance_videos.json")
    cluster_file = os.path.join(DATA_DIR, "territory_clusters.json")
    conflict_file = os.path.join(DATA_DIR, "conflicts.json")

    return {
        "has_videos": os.path.exists(video_file),
        "has_clusters": os.path.exists(cluster_file),
        "has_conflicts": os.path.exists(conflict_file),
        "data_dir": DATA_DIR,
    }


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    status = _get_data_status()
    map_config = _get_map_config()
    return templates.TemplateResponse("index.html", {
        "request": request,
        "data_status": status,
        "map_config": map_config,
    })


@app.get("/api/health")
async def health_check():
    status = _get_data_status()
    return {
        "status": "ok",
        "data": status,
    }


@app.get("/api/videos")
async def get_videos():
    video_file = os.path.join(DATA_DIR, "square_dance_videos.json")
    data = _load_json_file(video_file)
    if data is None:
        raise HTTPException(status_code=404, detail="暂无视频数据，请先运行爬虫或使用 Mock 数据")
    return {
        "total": len(data),
        "videos": data,
    }


@app.get("/api/clusters")
async def get_clusters():
    cluster_file = os.path.join(DATA_DIR, "territory_clusters.json")
    data = _load_json_file(cluster_file)
    if data is None:
        raise HTTPException(status_code=404, detail="暂无聚类数据")
    return {
        "total": len(data),
        "clusters": data,
    }


@app.get("/api/conflicts")
async def get_conflicts():
    conflict_file = os.path.join(DATA_DIR, "conflicts.json")
    data = _load_json_file(conflict_file)
    if data is None:
        raise HTTPException(status_code=404, detail="暂无冲突数据")
    return data


@app.get("/api/data-source")
async def get_data_source_status():
    douyin_cookie = os.environ.get("DOUYIN_COOKIE", "")
    kuaishou_cookie = os.environ.get("KUAISHOU_COOKIE", "")
    video_file = os.path.join(DATA_DIR, "square_dance_videos.json")

    return {
        "current_source": "mock",
        "available_sources": ["mock", "douyin", "kuaishou"],
        "douyin_configured": bool(douyin_cookie),
        "kuaishou_configured": bool(kuaishou_cookie),
        "has_data": os.path.exists(video_file),
    }


@app.post("/api/crawl-real")
async def crawl_real_data(platform: str = "douyin", city: str = "北京", max_count: int = 50):
    try:
        config = {}

        if platform == "douyin":
            cookie = os.environ.get("DOUYIN_COOKIE", "")
            if not cookie:
                raise HTTPException(status_code=400, detail="请先配置抖音 Cookie (DOUYIN_COOKIE)")
            config["douyin_cookie"] = cookie
        elif platform == "kuaishou":
            cookie = os.environ.get("KUAISHOU_COOKIE", "")
            if not cookie:
                raise HTTPException(status_code=400, detail="请先配置快手 Cookie (KUAISHOU_COOKIE)")
            config["kuaishou_cookie"] = cookie
        else:
            raise HTTPException(status_code=400, detail=f"不支持的平台: {platform}")

        config["platform"] = platform

        spider = DanceVideoSpider(config=config)
        videos = spider.search_square_dance(city=city, max_count=max_count, use_mock=False)
        video_dicts = [v.__dict__ for v in videos]

        if not video_dicts:
            raise HTTPException(status_code=404, detail="未能爬取到有效视频数据，请检查 Cookie 是否有效")

        clusterer = TerritoryClusterer(eps_meters=150, min_samples=3)
        clusterer.cluster(video_dicts)
        cluster_dicts = clusterer.get_clusters_as_dict()

        detector = OverlapDetector(conflict_threshold=0.1)
        detector.detect_conflicts(cluster_dicts)

        real_video_file = os.path.join(DATA_DIR, "real_videos.json")
        real_cluster_file = os.path.join(DATA_DIR, "real_clusters.json")
        real_conflict_file = os.path.join(DATA_DIR, "real_conflicts.json")

        spider.save_to_file(real_video_file)
        clusterer.save_clusters(real_cluster_file)
        detector.save_conflicts(real_conflict_file)

        return {
            "status": "success",
            "platform": platform,
            "videos": len(videos),
            "clusters": len(clusterer.clusters),
            "conflicts": len(detector.conflicts),
            "files": {
                "videos": real_video_file,
                "clusters": real_cluster_file,
                "conflicts": real_conflict_file,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/territories")
async def get_all_territories(source: str = "mock"):
    if source == "real":
        cluster_file = os.path.join(DATA_DIR, "real_clusters.json")
        conflict_file = os.path.join(DATA_DIR, "real_conflicts.json")
        video_file = os.path.join(DATA_DIR, "real_videos.json")
    else:
        cluster_file = os.path.join(DATA_DIR, "territory_clusters.json")
        conflict_file = os.path.join(DATA_DIR, "conflicts.json")
        video_file = os.path.join(DATA_DIR, "square_dance_videos.json")

    clusters = _load_json_file(cluster_file) or []
    conflicts_data = _load_json_file(conflict_file) or {}
    videos = _load_json_file(video_file) or []

    conflicts = conflicts_data.get("conflicts", []) if isinstance(conflicts_data, dict) else []
    summary = conflicts_data.get("summary", {}) if isinstance(conflicts_data, dict) else {}

    video_points = [
        {
            "id": v.get("video_id", ""),
            "lat": v.get("latitude") or v.get("lat"),
            "lng": v.get("longitude") or v.get("lng"),
            "title": v.get("title", ""),
            "platform": v.get("platform", ""),
            "poi_name": v.get("poi_name", ""),
            "likes": v.get("likes", 0),
        }
        for v in videos
        if (v.get("latitude") or v.get("lat")) and (v.get("longitude") or v.get("lng"))
    ]

    return {
        "videos": video_points,
        "clusters": clusters,
        "conflicts": conflicts,
        "conflict_summary": summary,
        "source": source,
        "stats": {
            "total_videos": len(videos),
            "total_clusters": len(clusters),
            "total_conflicts": summary.get("total_conflicts", len(conflicts)),
        },
    }


@app.post("/api/generate-mock")
async def generate_mock_data(city: str = "北京"):
    try:
        spider = DanceVideoSpider()
        videos = spider.search_square_dance(city=city, max_count=120, use_mock=True)
        video_dicts = [v.__dict__ for v in videos]

        clusterer = TerritoryClusterer(eps_meters=120, min_samples=5)
        clusterer.cluster(video_dicts)
        cluster_dicts = clusterer.get_clusters_as_dict()

        detector = OverlapDetector(conflict_threshold=0.08)
        detector.detect_conflicts(cluster_dicts)
        summary = detector.summary()

        if summary["total_conflicts"] < 2 or (summary["high_severity"] + summary["medium_severity"]) < 1:
            print(f"初始冲突不足({summary['total_conflicts']}处)，正在增强冲突...")
            cluster_dicts = _enhance_conflicts(cluster_dicts, detector)
            detector = OverlapDetector(conflict_threshold=0.08)
            detector.detect_conflicts(cluster_dicts)
            summary = detector.summary()
            print(f"增强后: {summary['total_conflicts']} 处冲突 "
                  f"(严重:{summary['high_severity']} 中度:{summary['medium_severity']})")

        spider.save_to_file(os.path.join(DATA_DIR, "square_dance_videos.json"))
        _save_clusters_to_file(cluster_dicts, os.path.join(DATA_DIR, "territory_clusters.json"))
        detector.save_conflicts(os.path.join(DATA_DIR, "conflicts.json"))

        return {
            "status": "success",
            "videos": len(videos),
            "clusters": len(cluster_dicts),
            "conflicts": len(detector.conflicts),
            "summary": summary,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _enhance_conflicts(cluster_dicts, detector):
    import math
    clusters = sorted(cluster_dicts, key=lambda c: c["video_count"], reverse=True)

    if len(clusters) < 2:
        return clusters

    main = clusters[0]
    main_center = main["center"]
    main_r = main["radius_meters"]

    def place_near_main(target, target_idx, angle_deg, overlap_ratio=0.5):
        R = 6371000
        angle = math.radians(angle_deg)
        target_r = target["radius_meters"]
        dist = (main_r + target_r) * (1 - overlap_ratio)

        d_lat = (dist * math.sin(angle) / R) * (180 / math.pi)
        d_lng = (dist * math.cos(angle) / (R * math.cos(math.radians(main_center["lat"])))) * (180 / math.pi)

        target["center"]["lat"] = main_center["lat"] + d_lat
        target["center"]["lng"] = main_center["lng"] + d_lng
        _recompute_boundary(target)

    if len(clusters) >= 2:
        place_near_main(clusters[1], 1, 30, overlap_ratio=0.75)

    if len(clusters) >= 3:
        place_near_main(clusters[2], 2, 120, overlap_ratio=0.55)

    if len(clusters) >= 4:
        place_near_main(clusters[3], 3, -60, overlap_ratio=0.4)

    if len(clusters) >= 5:
        place_near_main(clusters[4], 4, 150, overlap_ratio=0.3)

    return clusters


def _recompute_boundary(cluster_dict):
    import math
    center = cluster_dict["center"]
    radius = cluster_dict["radius_meters"]
    R = 6371000
    lat_rad = math.radians(center["lat"])
    boundary = []
    for i in range(36):
        angle = 2 * math.pi * i / 36
        dx = radius * math.cos(angle)
        dy = radius * math.sin(angle)
        delta_lat = (dy / R) * (180 / math.pi)
        delta_lng = (dx / (R * math.cos(lat_rad))) * (180 / math.pi)
        boundary.append({"lat": round(center["lat"] + delta_lat, 6),
                         "lng": round(center["lng"] + delta_lng, 6)})
    cluster_dict["boundary"] = boundary


def _save_clusters_to_file(cluster_dicts, filepath):
    import json
    import os
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(cluster_dicts, f, ensure_ascii=False, indent=2)
    print(f"已保存 {len(cluster_dicts)} 个领地聚类到 {filepath}")


def _haversine(lat1, lng1, lat2, lng2):
    import math
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    a = (math.sin(delta_phi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) *
         math.sin(delta_lambda / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5001,
        reload=True,
    )
