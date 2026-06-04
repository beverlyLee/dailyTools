import os
import json
import logging
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from src.poi.subway_poi_spider import SubwayPOISpider
from src.traffic.congestion_inference import CongestionInferenceEngine
from src.analysis.crowd_level import CrowdLevelAnalyzer, CrowdData

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("logs/api.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Subway Sardine Index API",
    description="地铁拥挤度指数API - 基于周边路况反推地铁站人流密度",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StationRequest(BaseModel):
    city: str
    station_name: Optional[str] = None


class AnalysisResponse(BaseModel):
    timestamp: str
    city: str
    total_stations: int
    data: List[Dict]
    statistics: Dict


@app.get("/")
async def root():
    return {
        "name": "Subway Sardine Index API",
        "version": "1.0.0",
        "description": "地铁拥挤度指数API",
        "endpoints": {
            "/stations": "获取城市地铁站点列表",
            "/congestion": "获取实时拥堵数据",
            "/analyze": "分析拥挤度",
            "/simulate": "模拟早高峰数据",
            "/statistics": "获取统计信息",
        },
    }


@app.get("/stations")
async def get_stations(
    city: str = Query(..., description="城市名称，如：北京、上海"),
    refresh: bool = Query(False, description="是否重新爬取数据"),
):
    """获取指定城市的地铁站点列表"""
    try:
        data_dir = Path("data")
        data_file = data_dir / f"{city}_subway_stations.json"

        if data_file.exists() and not refresh:
            logger.info(f"Loading cached stations for {city}")
            with open(data_file, "r", encoding="utf-8") as f:
                stations = json.load(f)
        else:
            logger.info(f"Fetching stations for {city}")
            spider = SubwayPOISpider()
            stations_data = spider.search_subway_stations(city)
            stations = [s.to_dict() for s in stations_data]

        return {
            "city": city,
            "count": len(stations),
            "stations": stations,
            "cached": data_file.exists() and not refresh,
        }
    except Exception as e:
        logger.error(f"Error getting stations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/congestion")
async def get_congestion(
    city: str = Query(..., description="城市名称"),
    use_simulation: Optional[bool] = Query(None, description="是否使用模拟数据"),
):
    """获取地铁站周边拥堵数据"""
    try:
        data_dir = Path("data")
        station_file = data_dir / f"{city}_subway_stations.json"

        if not station_file.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Station data for {city} not found. Please call /stations first.",
            )

        with open(station_file, "r", encoding="utf-8") as f:
            stations = json.load(f)

        engine = CongestionInferenceEngine()

        if use_simulation is None:
            use_simulation = not engine.is_morning_peak()

        if use_simulation:
            logger.info(f"Using simulation mode for {city}")
            congestion_data = engine.simulate_morning_peak(stations)
        else:
            logger.info(f"Using real API data for {city}")
            congestion_data = engine.bulk_get_congestion(stations)

        congestion_dicts = [c.to_dict() for c in congestion_data]

        return {
            "city": city,
            "timestamp": datetime.now().isoformat(),
            "is_morning_peak": engine.is_morning_peak(),
            "mode": "simulation" if use_simulation else "real",
            "count": len(congestion_dicts),
            "data": congestion_dicts,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting congestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analyze", response_model=AnalysisResponse)
async def analyze_crowd_levels(
    city: str = Query(..., description="城市名称"),
    use_simulation: Optional[bool] = Query(None, description="是否使用模拟数据"),
):
    """分析地铁站拥挤度等级"""
    try:
        data_dir = Path("data")
        station_file = data_dir / f"{city}_subway_stations.json"

        if not station_file.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Station data for {city} not found. Please call /stations first.",
            )

        with open(station_file, "r", encoding="utf-8") as f:
            stations = json.load(f)

        engine = CongestionInferenceEngine()

        if use_simulation is None:
            use_simulation = not engine.is_morning_peak()

        if use_simulation:
            logger.info(f"Using simulation mode for {city}")
            congestion_data = engine.simulate_morning_peak(stations)
        else:
            logger.info(f"Using real API data for {city}")
            congestion_data = engine.bulk_get_congestion(stations)

        congestion_dicts = [c.to_dict() for c in congestion_data]

        analyzer = CrowdLevelAnalyzer()
        crowd_data = analyzer.analyze(congestion_dicts, stations)
        crowd_dicts = [c.to_dict() for c in crowd_data]
        statistics = analyzer.get_statistics(crowd_data)

        return AnalysisResponse(
            timestamp=datetime.now().isoformat(),
            city=city,
            total_stations=len(crowd_dicts),
            data=crowd_dicts,
            statistics=statistics,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing crowd levels: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/simulate")
async def simulate_peak(
    city: str = Query(..., description="城市名称"),
    peak_hour: int = Query(8, description="模拟的高峰小时"),
):
    """模拟早高峰时段的拥挤度"""
    try:
        data_dir = Path("data")
        station_file = data_dir / f"{city}_subway_stations.json"

        if not station_file.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Station data for {city} not found. Please call /stations first.",
            )

        with open(station_file, "r", encoding="utf-8") as f:
            stations = json.load(f)

        engine = CongestionInferenceEngine()
        congestion_data = engine.simulate_morning_peak(stations, peak_hour)
        congestion_dicts = [c.to_dict() for c in congestion_data]

        analyzer = CrowdLevelAnalyzer()
        crowd_data = analyzer.analyze(congestion_dicts, stations)
        crowd_dicts = [c.to_dict() for c in crowd_data]
        statistics = analyzer.get_statistics(crowd_data)

        geojson_path = data_dir / f"{city}_crowd_data.geojson"
        analyzer.export_to_geojson(crowd_data, str(geojson_path))

        return {
            "city": city,
            "peak_hour": peak_hour,
            "timestamp": datetime.now().isoformat(),
            "mode": "simulation",
            "total_stations": len(crowd_dicts),
            "data": crowd_dicts,
            "statistics": statistics,
            "geojson_file": str(geojson_path),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error simulating peak: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/statistics")
async def get_statistics(
    city: str = Query(..., description="城市名称"),
):
    """获取城市地铁拥挤度统计信息"""
    try:
        latest_data = _get_latest_congestion_data(city)
        if not latest_data:
            raise HTTPException(
                status_code=404,
                detail=f"No congestion data found for {city}. Please call /analyze first.",
            )

        analyzer = CrowdLevelAnalyzer()
        crowd_data = [CrowdData(**d) for d in latest_data["data"]]
        statistics = analyzer.get_statistics(crowd_data)

        return {
            "city": city,
            "timestamp": latest_data.get("timestamp"),
            **statistics,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _get_latest_congestion_data(city: str) -> Optional[Dict]:
    data_dir = Path("data")
    pattern = f"congestion_data_*.json"
    files = sorted(data_dir.glob(pattern), reverse=True)

    for file in files:
        try:
            with open(file, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data and data[0].get("city") == city:
                    return {"timestamp": file.stem.replace("congestion_data_", ""), "data": data}
        except Exception:
            continue

    return None


@app.post("/crawl/stations")
async def crawl_stations(city: str = Query(..., description="城市名称")):
    """爬取指定城市的地铁站点数据"""
    try:
        spider = SubwayPOISpider()
        stations = spider.search_subway_stations(city)
        return {
            "city": city,
            "count": len(stations),
            "message": f"Successfully crawled {len(stations)} stations",
        }
    except Exception as e:
        logger.error(f"Error crawling stations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
