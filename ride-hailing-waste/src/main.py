import os
import sys
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

_src_dir = Path(__file__).parent
if str(_src_dir) not in sys.path:
    sys.path.insert(0, str(_src_dir))

_env_path = _src_dir.parent / ".env"
if _env_path.exists():
    load_dotenv(dotenv_path=str(_env_path))
else:
    load_dotenv()

from traffic.road_status_spider import RoadStatusSpider, BEIJING_KEY_AREAS
from simulation.empty_trip_sim import EmptyTripSimulator
from metric.waste_calculator import WasteCalculator

app = FastAPI(title="网约车空驶浪费分析系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

static_dir = Path(__file__).parent / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

_traffic_spider = None
_simulator = None


def get_spider():
    global _traffic_spider
    if _traffic_spider is None:
        _traffic_spider = RoadStatusSpider()
    return _traffic_spider


def get_simulator():
    global _simulator
    if _simulator is None:
        _simulator = EmptyTripSimulator(get_spider())
    return _simulator


@app.get("/")
async def root():
    index_path = static_dir / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return JSONResponse({
        "name": "网约车空驶浪费分析系统",
        "version": "1.0.0",
        "endpoints": {
            "/api/traffic": "路况数据",
            "/api/simulate": "空驶轨迹模拟",
            "/api/waste": "浪费计算",
            "/api/visualization": "可视化数据",
            "/api/areas": "关键区域信息",
        }
    })


@app.get("/api/traffic")
async def get_traffic_status(
    road_name: Optional[str] = None,
    use_cache: bool = True,
):
    spider = get_spider()
    if road_name:
        data = spider.fetch_road_traffic(road_name)
        return {"road": road_name, "data": data}
    segments = spider.get_all_road_segments(use_cache=use_cache)
    return {
        "count": len(segments),
        "segments": [
            {
                "id": s.id,
                "name": s.name,
                "speed": s.speed,
                "status": s.status,
                "length_m": s.length,
                "polyline": s.polyline,
            }
            for s in segments
        ]
    }


@app.get("/api/traffic/area")
async def get_area_traffic(
    lng: float = Query(..., description="中心点经度"),
    lat: float = Query(..., description="中心点纬度"),
    radius: float = Query(0.05, description="搜索半径（度）"),
):
    spider = get_spider()
    summary = spider.get_area_traffic_summary(lng, lat, radius)
    return {"center": [lng, lat], "radius": radius, "summary": summary}


@app.get("/api/simulate")
async def simulate_trips(
    num_vehicles: int = Query(100, ge=1, le=1000, description="模拟车辆数"),
    focus_areas: Optional[str] = Query(None, description="重点区域，逗号分隔"),
    vehicle_type: str = Query("gasoline", description="车型: gasoline/hybrid/electric"),
):
    simulator = get_simulator()

    focus_list = None
    if focus_areas:
        focus_list = [a.strip() for a in focus_areas.split(",") if a.strip()]

    sim_result = simulator.simulate_batch(num_vehicles=num_vehicles, focus_areas=focus_list)

    calc = WasteCalculator(vehicle_type)
    metrics = calc.calculate_from_simulation(sim_result)
    metrics.area_breakdown = calc.calculate_area_breakdown(sim_result.trajectories, BEIJING_KEY_AREAS)

    return {
        "simulation": {
            "total_vehicles": sim_result.total_vehicles,
            "total_distance_km": round(sim_result.total_distance / 1000, 2),
            "empty_distance_km": round(sim_result.total_empty_distance / 1000, 2),
            "empty_ratio_percent": round(sim_result.empty_ratio * 100, 2),
        },
        "waste_metrics": calc.to_dict(metrics),
    }


@app.get("/api/waste")
async def get_waste_metrics(
    num_vehicles: int = Query(200, ge=1, le=2000, description="模拟车辆数"),
    vehicle_type: str = Query("gasoline", description="车型: gasoline/hybrid/electric"),
    compare: bool = Query(False, description="是否对比不同车型"),
):
    simulator = get_simulator()
    sim_result = simulator.simulate_batch(num_vehicles=num_vehicles)

    calc = WasteCalculator(vehicle_type)
    metrics = calc.calculate_from_simulation(sim_result)
    metrics.area_breakdown = calc.calculate_area_breakdown(sim_result.trajectories, BEIJING_KEY_AREAS)

    result = {
        "vehicle_type": vehicle_type,
        "waste_metrics": calc.to_dict(metrics),
    }

    if compare:
        result["comparison"] = calc.get_comparison_metrics(sim_result)

    return result


@app.get("/api/visualization")
async def get_visualization_data(
    num_vehicles: int = Query(200, ge=1, le=1000, description="模拟车辆数"),
    focus_areas: Optional[str] = Query(None, description="重点区域，逗号分隔"),
    vehicle_type: str = Query("gasoline", description="车型"),
):
    simulator = get_simulator()

    focus_list = None
    if focus_areas:
        focus_list = [a.strip() for a in focus_areas.split(",") if a.strip()]

    viz_data = simulator.get_trajectories_for_visualization(
        num_vehicles=num_vehicles,
        focus_areas=focus_list
    )
    calc = WasteCalculator(vehicle_type)

    sim_result = simulator.simulate_batch(num_vehicles=num_vehicles, focus_areas=focus_list)
    metrics = calc.calculate_from_simulation(sim_result)
    area_breakdown = calc.calculate_area_breakdown(sim_result.trajectories, BEIJING_KEY_AREAS)

    viz_data["waste_metrics"] = calc.to_dict(metrics)
    viz_data["area_breakdown"] = area_breakdown

    return viz_data


@app.get("/api/areas")
async def get_key_areas():
    areas = {}
    for name, info in BEIJING_KEY_AREAS.items():
        areas[name] = {
            "center": info["center"],
            "radius": info["radius"],
            "density_level": info["density"],
            "type": _get_area_type(name),
        }
    return {"count": len(areas), "areas": areas}


def _get_area_type(name: str) -> str:
    if "airport" in name:
        return "airport"
    if "station" in name or "south" in name or "west" in name:
        return "station"
    if "cbd" in name:
        return "cbd"
    if "wangjing" in name or "zhongguancun" in name:
        return "tech_park"
    return "other"


@app.get("/api/config")
async def get_config():
    return {
        "gaode_web_key": os.getenv("GAODE_WEB_API_KEY", os.getenv("GAODE_TRAFFIC_KEY", "")),
        "center": [float(os.getenv("CENTER_LNG", 116.4074)), float(os.getenv("CENTER_LAT", 39.9042))],
        "city": os.getenv("CITY", "beijing"),
    }


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "api_key_loaded": bool(os.getenv("GAODE_TRAFFIC_KEY"))}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=True)
