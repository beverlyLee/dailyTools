from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from src.analysis.gap_calculator import GapCalculator
from typing import Optional
import os

app = FastAPI(title="充电桩基础设施匹配分析系统", version="1.0.0")

GAODE_API_KEY = os.getenv("GAODE_API_KEY", "62894d3a0f745186ad4c99050a491b2f")
GAODE_JS_API_KEY = os.getenv("GAODE_JS_API_KEY", "62894d3a0f745186ad4c99050a491b2f")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    index_path = os.path.join(os.path.dirname(__file__), "static", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "充电桩基础设施匹配分析系统 API 服务"}


@app.get("/api/statistics")
async def get_statistics(
    warning_ratio: Optional[float] = Query(5.0, description="车桩比警戒线"),
    mock: Optional[bool] = Query(True, description="是否使用模拟数据")
):
    calculator = GapCalculator(warning_ratio=warning_ratio, use_mock=mock)
    return calculator.calculate_gap_statistics()


@app.get("/api/cities")
async def get_cities(
    warning_ratio: Optional[float] = Query(5.0, description="车桩比警戒线"),
    status: Optional[str] = Query(None, description="筛选状态: gap/warning/safe/None"),
    mock: Optional[bool] = Query(True, description="是否使用模拟数据")
):
    calculator = GapCalculator(warning_ratio=warning_ratio, use_mock=mock)
    viz_data = calculator.get_visualization_data()

    cities = viz_data['cities']

    if status:
        cities = [city for city in cities if city['status'] == status]

    return {
        "total": len(cities),
        "cities": cities
    }


@app.get("/api/gap-cities")
async def get_gap_cities(
    warning_ratio: Optional[float] = Query(5.0, description="车桩比警戒线"),
    mock: Optional[bool] = Query(True, description="是否使用模拟数据")
):
    calculator = GapCalculator(warning_ratio=warning_ratio, use_mock=mock)
    gap_cities = calculator.get_cities_with_gap()
    return {
        "total": len(gap_cities),
        "cities": gap_cities
    }


@app.get("/api/safe-cities")
async def get_safe_cities(
    warning_ratio: Optional[float] = Query(5.0, description="车桩比警戒线"),
    mock: Optional[bool] = Query(True, description="是否使用模拟数据")
):
    calculator = GapCalculator(warning_ratio=warning_ratio, use_mock=mock)
    safe_cities = calculator.get_cities_safe()
    return {
        "total": len(safe_cities),
        "cities": safe_cities
    }


@app.get("/api/visualization")
async def get_visualization_data(
    warning_ratio: Optional[float] = Query(5.0, description="车桩比警戒线"),
    mock: Optional[bool] = Query(True, description="是否使用模拟数据")
):
    calculator = GapCalculator(warning_ratio=warning_ratio, use_mock=mock)
    return calculator.get_visualization_data()


@app.get("/api/map-config")
async def get_map_config():
    return {
        "gaode_js_api_key": GAODE_JS_API_KEY,
        "gaode_api_key": GAODE_API_KEY,
        "map_center": [104.114, 35.650],
        "map_zoom": 4
    }


@app.get("/api/city/{city_name}")
async def get_city_detail(
    city_name: str,
    warning_ratio: Optional[float] = Query(5.0, description="车桩比警戒线"),
    mock: Optional[bool] = Query(True, description="是否使用模拟数据")
):
    calculator = GapCalculator(warning_ratio=warning_ratio, use_mock=mock)
    viz_data = calculator.get_visualization_data()

    for city in viz_data['cities']:
        if city['name'] == city_name:
            return city

    return {"error": "城市未找到"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
