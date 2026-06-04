import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from src.poi.convenience_crawler import run_crawl, load_pois, SHANGHAI_FULL, SHANGHAI_INNER
from src.grid.density_calculator import (
    calculate_density,
    save_density,
    load_density,
    load_density_geojson,
    density_to_geojson,
)
from src.analysis.blind_spot import (
    find_blind_spots,
    analyze_coverage,
    save_analysis,
    load_blind_spots,
    load_analysis,
    find_low_density_areas,
)
from src.config import get_data_source, set_data_source

crawl_status = {
    "running": False,
    "progress": "",
    "pois_count": 0,
    "grid_count": 0,
    "success_grid_count": 0,
    "empty_grid_count": 0,
    "failed_grid_count": 0,
    "has_error": False,
    "error_type": None,
    "error_message": None,
    "error_summary": None,
    "status_code": None,
    "started_at": None,
    "finished_at": None,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Convenience Store Map API started")
    yield


app = FastAPI(title="便利店地图 - 网格密度分析", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/pois")
def get_pois():
    pois = load_pois()
    return {"count": len(pois), "pois": pois}


@app.post("/api/crawl")
async def start_crawl(background_tasks: BackgroundTasks, area: str = "full", grid_step: float = 500.0):
    if crawl_status["running"]:
        return {"status": "already_running", "message": "爬虫正在运行中"}

    bounds = SHANGHAI_INNER if area == "inner" else SHANGHAI_FULL

    async def _crawl():
        import datetime
        crawl_status["running"] = True
        crawl_status["progress"] = "crawling"
        crawl_status["pois_count"] = 0
        crawl_status["grid_count"] = 0
        crawl_status["success_grid_count"] = 0
        crawl_status["empty_grid_count"] = 0
        crawl_status["failed_grid_count"] = 0
        crawl_status["has_error"] = False
        crawl_status["error_type"] = None
        crawl_status["error_message"] = None
        crawl_status["error_summary"] = None
        crawl_status["status_code"] = None
        crawl_status["started_at"] = datetime.datetime.now().isoformat()
        crawl_status["finished_at"] = None

        try:
            result = await run_crawl(bounds, grid_step)
            pois = result["pois"]
            crawl_status["pois_count"] = result["pois_count"]
            crawl_status["grid_count"] = result["grid_count"]
            crawl_status["success_grid_count"] = result["success_grid_count"]
            crawl_status["empty_grid_count"] = result["empty_grid_count"]
            crawl_status["failed_grid_count"] = result["failed_grid_count"]

            if result.get("error_summary"):
                crawl_status["has_error"] = True
                crawl_status["error_type"] = "api_error"
                crawl_status["error_summary"] = result["error_summary"]
                first_err = result["error_summary"].get("first_error")
                if first_err:
                    crawl_status["error_message"] = first_err.get("message")
                    crawl_status["status_code"] = first_err.get("status_code")

            if result["pois_count"] == 0 and not result.get("error_summary"):
                crawl_status["error_type"] = "no_data"
                crawl_status["has_error"] = True
                crawl_status["error_message"] = "爬取成功但未获取到任何便利店数据，请检查搜索条件或区域范围"

            crawl_status["progress"] = "calculating_density"

            grids = calculate_density(pois, bounds, grid_step)
            save_density(grids)

            blind = find_blind_spots(grids, pois)
            analysis = analyze_coverage(grids, pois)
            save_analysis(blind, analysis)

            if crawl_status["has_error"]:
                crawl_status["progress"] = "completed_with_errors"
            else:
                crawl_status["progress"] = "done"

            set_data_source("crawled", {
                "pois_count": result["pois_count"],
                "grids_count": len(grids) if 'grids' in locals() else 0,
                "area": area,
                "grid_step": grid_step,
            })

        except Exception as e:
            crawl_status["progress"] = "failed"
            crawl_status["has_error"] = True
            crawl_status["error_type"] = "internal_error"
            crawl_status["error_message"] = str(e)
        finally:
            crawl_status["running"] = False
            crawl_status["finished_at"] = datetime.datetime.now().isoformat()

    background_tasks.add_task(_crawl)
    return {"status": "started", "message": "爬虫已启动"}


@app.get("/api/crawl/status")
def get_crawl_status():
    return crawl_status


@app.get("/api/density")
def get_density():
    grids = load_density()
    return {"count": len(grids), "grids": grids}


@app.get("/api/density/geojson")
def get_density_geojson():
    geojson = load_density_geojson()
    return geojson


@app.get("/api/blind-spots")
def get_blind_spots():
    spots = load_blind_spots()
    return {"count": len(spots), "blind_spots": spots}


@app.get("/api/analysis")
def get_analysis():
    analysis = load_analysis()
    return analysis


@app.get("/api/brand-distribution")
def get_brand_distribution():
    analysis = load_analysis()
    return analysis.get("brand_distribution", {})


@app.get("/api/overview")
def get_overview():
    pois = load_pois()
    grids = load_density()
    analysis = load_analysis()
    blind = load_blind_spots()
    data_source = get_data_source()

    health = {}
    data_source_type = data_source.get("source", "unknown")
    if data_source_type == "crawled":
        expected_min_pois = 500
        health["status"] = "healthy" if len(pois) >= expected_min_pois else "warning"
        health["message"] = (
            "数据正常" if len(pois) >= expected_min_pois
            else f"POI 数量较低（{len(pois)}），建议检查 API 配额或爬取范围"
        )
        health["threshold"] = expected_min_pois
    elif data_source_type == "demo":
        health["status"] = "demo"
        health["message"] = "当前使用演示数据，建议爬取真实数据"
    else:
        health["status"] = "unknown"
        health["message"] = "数据来源未知"

    return {
        "pois_count": len(pois),
        "grids_count": len(grids),
        "blind_spots_count": len(blind),
        "analysis": analysis,
        "data_source": data_source,
        "data_health": health,
    }


frontend_dist = __file__.replace("src/main.py", "frontend/dist")
import os
if os.path.isdir(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(frontend_dist, "index.html"))

    @app.get("/{path:path}")
    async def serve_spa(path: str):
        file_path = os.path.join(frontend_dist, path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
