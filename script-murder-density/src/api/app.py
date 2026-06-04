import os
import json
from typing import Optional
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from src.spiders.dianping_detail_spider import DianpingDetailSpider
from src.nlp.tag_clusterer import TagClusterer
from src.profiling.district_profiler import DistrictProfiler
from src.config import GAODE_API_KEY, GAODE_JS_API_KEY

app = FastAPI(title="剧本杀密度分析", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

spider = DianpingDetailSpider()
clusterer = TagClusterer()
profiler = DistrictProfiler()

frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")


@app.get("/")
async def serve_frontend():
    index_path = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not built. Run: cd frontend && npm run build"}


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/config")
async def get_config():
    return {
        "success": True,
        "data": {
            "gaode_api_key": GAODE_API_KEY,
            "gaode_js_key": GAODE_JS_API_KEY,
        },
    }


@app.get("/api/shops")
async def get_shops(city: Optional[str] = Query(None)):
    if city:
        shops = spider._get_demo_data(city)
    else:
        shops = spider.get_all_cities_data()
    return {"success": True, "data": shops, "total": len(shops)}


@app.get("/api/clusters")
async def get_clusters(city: Optional[str] = Query(None)):
    shops = spider._get_demo_data(city) if city else spider.get_all_cities_data()
    result = clusterer.fit(shops)
    simplified = {}
    for label, info in result.get("clusters", {}).items():
        simplified[label] = {
            "cluster_id": info["cluster_id"],
            "count": info["count"],
            "shop_names": [s["name"] for s in info["shops"][:10]],
        }
    return {
        "success": True,
        "data": {
            "clusters": simplified,
            "tag_stats": result.get("tag_stats", {}),
        },
    }


@app.get("/api/districts")
async def get_districts(city: Optional[str] = Query(None)):
    shops = spider._get_demo_data(city) if city else spider.get_all_cities_data()
    profiles = profiler.get_all_profiles(shops)
    if city and city in profiles:
        return {"success": True, "data": profiles[city]}
    return {"success": True, "data": profiles}


@app.get("/api/radar/{city}/{district}")
async def get_radar(city: str, district: str):
    shops = spider._get_demo_data(city)
    district_shops = [s for s in shops if s.get("district") == district]
    if not district_shops:
        return {"success": False, "message": f"No data for {city} {district}"}
    radar = clusterer.get_radar_data(district_shops)
    return {"success": True, "data": radar}


@app.get("/api/overview")
async def get_overview():
    all_shops = spider.get_all_cities_data()
    all_profiles = profiler.get_all_profiles(all_shops)
    cluster_result = clusterer.fit(all_shops)

    city_summaries = {}
    for city, profile in all_profiles.items():
        city_summaries[city] = profile.get("summary", {})

    tag_stats = cluster_result.get("tag_stats", {})

    return {
        "success": True,
        "data": {
            "total_shops": len(all_shops),
            "cities": city_summaries,
            "tag_stats": tag_stats,
            "cluster_counts": {
                label: info["count"]
                for label, info in cluster_result.get("clusters", {}).items()
            },
        },
    }
