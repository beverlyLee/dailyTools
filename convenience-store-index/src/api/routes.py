import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from src.data_pipeline.index_downloader import IndexDownloader
from src.core_engine.geo_joiner import GeoJoiner

app = FastAPI(
    title="中国城市便利店发展指数 API",
    description="基于中国连锁经营协会发布的数据，分析全国各城市'15分钟生活圈'便利度",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

index_downloader = IndexDownloader()
geo_joiner = GeoJoiner()


class CityResponse(BaseModel):
    city_name: str
    province: str
    store_count: int
    population: float
    density_per_10k: float
    rank: int
    growth_rate: float


@app.get("/")
async def root():
    return {
        "message": "中国城市便利店发展指数 API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "/api/cities": "获取所有城市便利店指数排名",
            "/api/cities/{city_name}": "获取单个城市详细信息",
            "/api/map-data": "获取地图可视化所需数据",
            "/api/color-scale": "获取颜色分级数据"
        }
    }


@app.get("/api/cities", response_model=List[CityResponse])
async def get_cities(year: int = 2024):
    try:
        cities = index_downloader.get_city_list(year)
        return cities
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取城市列表失败: {str(e)}")


@app.get("/api/cities/{city_name}", response_model=CityResponse)
async def get_city_detail(city_name: str, year: int = 2024):
    try:
        city = index_downloader.get_city_detail(city_name, year)
        if city is None:
            raise HTTPException(status_code=404, detail=f"未找到城市: {city_name}")
        return city
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取城市详情失败: {str(e)}")


@app.get("/api/map-data")
async def get_map_data(year: int = 2024):
    try:
        city_data = index_downloader.download_index(year)
        result = geo_joiner.get_joined_data(city_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取地图数据失败: {str(e)}")


@app.get("/api/color-scale")
async def get_color_scale(year: int = 2024):
    try:
        city_data = index_downloader.download_index(year)
        province_agg = geo_joiner.aggregate_by_province(city_data)
        color_scale = geo_joiner.calculate_color_scale(province_agg)
        return color_scale
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取色阶数据失败: {str(e)}")


@app.get("/api/gaode-district")
async def get_gaode_district(keywords: str = "中国", subdistrict: int = 1):
    try:
        result = index_downloader.download_from_gaode(keywords)
        if not result:
            return {"message": "请配置有效的高德地图API Key"}
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取行政区划数据失败: {str(e)}")
