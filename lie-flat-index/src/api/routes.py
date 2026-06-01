from fastapi import APIRouter, HTTPException, Query
from typing import List
from src.core_engine import FlatnessScorer

router = APIRouter()
scorer = FlatnessScorer(use_real_data=True)


@router.get("/")
async def root():
    return {"message": "Welcome to Lie-Flat Index API", "version": "1.0"}


@router.get("/data-source")
async def get_data_source_info():
    try:
        info = scorer.get_data_source_info()
        return {
            "success": True,
            "data": info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/data-source")
async def set_data_source(use_real_data: bool = Query(..., description="是否使用真实数据")):
    try:
        scorer.set_data_source(use_real_data)
        info = scorer.get_data_source_info()
        return {
            "success": True,
            "message": f"已切换为{'真实公开数据' if use_real_data else '模拟演示数据'}",
            "data": info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ranking")
async def get_ranking(use_real_data: bool = Query(None, description="是否使用真实数据，不传则使用当前设置")):
    try:
        if use_real_data is not None:
            scorer.set_data_source(use_real_data)
        rankings = scorer.get_all_cities_ranking()
        data_source = scorer.get_data_source_info()
        return {
            "success": True,
            "data": rankings,
            "total": len(rankings),
            "data_source": data_source
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/city/{city_name}")
async def get_city_data(city_name: str, use_real_data: bool = Query(None)):
    try:
        if use_real_data is not None:
            scorer.set_data_source(use_real_data)
        city_data = scorer.calculate_flatness_index(city_name)
        if not city_data:
            raise HTTPException(status_code=404, detail=f"City {city_name} not found")
        return {
            "success": True,
            "data": city_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/radar")
async def get_radar_data(cities: str = "北京,上海,成都", use_real_data: bool = Query(None)):
    try:
        if use_real_data is not None:
            scorer.set_data_source(use_real_data)
        city_list = cities.split(",")
        radar_data = scorer.get_radar_chart_data(city_list)
        data_source = scorer.get_data_source_info()
        return {
            "success": True,
            "data": radar_data,
            "data_source": data_source
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
