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


@app.get("/api/territories")
async def get_all_territories():
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
            "lat": v.get("latitude"),
            "lng": v.get("longitude"),
            "title": v.get("title", ""),
            "platform": v.get("platform", ""),
            "poi_name": v.get("poi_name", ""),
            "likes": v.get("likes", 0),
        }
        for v in videos
        if v.get("latitude") and v.get("longitude")
    ]

    return {
        "videos": video_points,
        "clusters": clusters,
        "conflicts": conflicts,
        "conflict_summary": summary,
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

        clusterer = TerritoryClusterer(eps_meters=180, min_samples=4)
        clusterer.cluster(video_dicts)
        cluster_dicts = clusterer.get_clusters_as_dict()

        detector = OverlapDetector(conflict_threshold=0.1)
        detector.detect_conflicts(cluster_dicts)

        spider.save_to_file(os.path.join(DATA_DIR, "square_dance_videos.json"))
        clusterer.save_clusters(os.path.join(DATA_DIR, "territory_clusters.json"))
        detector.save_conflicts(os.path.join(DATA_DIR, "conflicts.json"))

        return {
            "status": "success",
            "videos": len(videos),
            "clusters": len(cluster_dicts),
            "conflicts": len(detector.conflicts),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5001,
        reload=True,
    )
