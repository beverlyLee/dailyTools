import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.models.schemas import (
    OfficeBuilding,
    AnalysisResponse,
    LunchWindowAnalysis,
)
from src.crawlers.dianping_spider import DianpingSpider
from src.engine.route_planner import RoutePlanner
from src.analysis.time_window import LunchTimeWindowAnalyzer

load_dotenv()

app = FastAPI(
    title="LunchDrift API",
    description="白领午休流动规律分析系统",
    version="1.0.0",
)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

spider = DianpingSpider(headless=True)
route_planner = RoutePlanner()
analyzer = LunchTimeWindowAnalyzer(lunch_duration_minutes=60)


class AnalysisRequest(BaseModel):
    building_name: str = "国贸大厦"
    building_address: str = "北京市朝阳区建国门外大街1号"
    longitude: float = 116.460770
    latitude: float = 39.909012
    keywords: Optional[List[str]] = None
    radius: int = 1000
    use_mock: bool = True


PRESET_BUILDINGS = {
    "国贸大厦": {
        "name": "国贸大厦",
        "address": "北京市朝阳区建国门外大街1号",
        "longitude": 116.460770,
        "latitude": 39.909012,
    },
    "银泰中心": {
        "name": "银泰中心",
        "address": "北京市朝阳区建国门外大街2号",
        "longitude": 116.459500,
        "latitude": 39.907200,
    },
    "财富中心": {
        "name": "财富中心",
        "address": "北京市朝阳区光华路7号",
        "longitude": 116.462500,
        "latitude": 39.911500,
    },
}


@app.get("/")
async def root():
    return {
        "name": "LunchDrift API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "GET /api/buildings": "获取预设写字楼列表",
            "GET /api/config": "获取前端配置",
            "POST /api/analyze": "执行午休流动分析",
        },
    }


@app.get("/api/config")
async def get_config():
    return {
        "gaode_js_api_key": os.getenv("GAODE_JS_API_KEY", ""),
        "default_center": [116.460770, 39.909012],
        "default_zoom": 16,
    }


@app.get("/api/buildings")
async def get_buildings():
    return {"status": "success", "data": list(PRESET_BUILDINGS.values())}


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_lunch_drift(request: AnalysisRequest):
    try:
        if request.building_name in PRESET_BUILDINGS and request.longitude == 116.460770:
            preset = PRESET_BUILDINGS[request.building_name]
            building = OfficeBuilding(
                name=preset["name"],
                address=preset["address"],
                longitude=preset["longitude"],
                latitude=preset["latitude"],
            )
        else:
            building = OfficeBuilding(
                name=request.building_name,
                address=request.building_address,
                longitude=request.longitude,
                latitude=request.latitude,
            )

        keywords = request.keywords if request.keywords else ["快餐", "简餐", "小吃"]

        restaurants = await spider.search_nearby_restaurants(
            building=building,
            keywords=keywords,
            radius=request.radius,
            use_mock=request.use_mock,
        )

        if not restaurants:
            raise HTTPException(
                status_code=404, detail="未找到任何餐饮商户数据"
            )

        routes = await route_planner.batch_calculate_routes(
            building=building,
            restaurants=restaurants,
            use_mock=request.use_mock,
        )

        analysis_result = analyzer.analyze(
            building=building,
            restaurants=restaurants,
            routes=routes,
        )

        stats = analyzer.get_time_statistics(routes)
        heatmap_data = analyzer.generate_heatmap_data(restaurants, routes)
        isochrone_radius = route_planner.calculate_isochrone_radius(
            analysis_result.max_walk_time
        )

        return AnalysisResponse(
            status="success",
            data=analysis_result,
            message=f"分析完成，共发现 {len(restaurants)} 家餐饮商户",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


@app.get("/api/statistics")
async def get_statistics(building_name: str = "国贸大厦"):
    if building_name not in PRESET_BUILDINGS:
        raise HTTPException(status_code=404, detail="未找到该写字楼")

    preset = PRESET_BUILDINGS[building_name]
    building = OfficeBuilding(**preset)

    restaurants = await spider.search_nearby_restaurants(building=building, use_mock=True)
    routes = await route_planner.batch_calculate_routes(
        building=building, restaurants=restaurants, use_mock=True
    )

    stats = analyzer.get_time_statistics(routes)

    return {"status": "success", "data": stats}


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("SERVER_HOST", "0.0.0.0")
    port = int(os.getenv("SERVER_PORT", "8000"))
    uvicorn.run(app, host=host, port=port)
