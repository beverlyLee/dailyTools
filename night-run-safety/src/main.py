import os
import sys
import logging
from typing import List, Dict, Optional
from contextlib import asynccontextmanager

_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

from src.models.schemas import (
    RouteRequest,
    RouteResponse,
    ScoredSegment,
    SegmentData,
    MapBounds,
)
from src.data_acquisition.osm_crawler import OSMCrawler
from src.scoring.safety_algorithm import SafetyScorer
from src.recommendation.safe_path_finder import SafePathFinder

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()


class AppState:
    def __init__(self):
        self.crawler: Optional[OSMCrawler] = None
        self.scorer: Optional[SafetyScorer] = None
        self.path_finder: Optional[SafePathFinder] = None
        self.segments: List[SegmentData] = []
        self.scored_segments: List[ScoredSegment] = []
        self.is_initialized = False


app_state = AppState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting application initialization...")
    try:
        initialize_app()
    except Exception as e:
        logger.warning(f"Initialization error (continuing): {e}")
    yield
    logger.info("Shutting down application...")


app = FastAPI(
    title="夜跑安全地图 API",
    description="基于 OpenStreetMap 和高德地图的夜跑安全路线推荐系统",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def initialize_app() -> None:
    if app_state.is_initialized:
        return

    gaode_key = os.getenv("GAODE_WEB_API_KEY", "")

    app_state.crawler = OSMCrawler()
    app_state.scorer = SafetyScorer(gaode_key)
    app_state.path_finder = SafePathFinder(gaode_key)

    try:
        data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
        if os.path.exists(os.path.join(data_dir, "segments.json")):
            logger.info("Loading existing segment data...")
            app_state.segments = app_state.crawler.load_data(data_dir)
            app_state.scored_segments = app_state.scorer.score_segments(
                app_state.segments, use_traffic_api=False
            )
            app_state.path_finder.update_segments(app_state.scored_segments)
            logger.info(f"Loaded {len(app_state.segments)} segments")
        else:
            logger.info("No existing data found, will crawl on demand")
    except Exception as e:
        logger.warning(f"Failed to load data: {e}")

    app_state.is_initialized = True
    logger.info("Application initialized successfully")


class HealthResponse(BaseModel):
    status: str
    segments_count: int
    gaode_api_configured: bool


class CrawlRequest(BaseModel):
    bounds: Optional[MapBounds] = None
    city_name: Optional[str] = None


class SegmentsResponse(BaseModel):
    segments: List[Dict]
    count: int


class SegmentInfoResponse(BaseModel):
    segment_id: str
    road_name: str
    has_lighting: bool
    safety_score: float
    light_score: float
    width_score: float
    traffic_score: float
    road_width: float
    traffic_flow: float
    safety_level: str
    safety_color: str


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    gaode_key = os.getenv("GAODE_WEB_API_KEY", "")
    return HealthResponse(
        status="healthy" if app_state.is_initialized else "initializing",
        segments_count=len(app_state.scored_segments),
        gaode_api_configured=bool(gaode_key),
    )


@app.get("/api/config")
async def get_config():
    gaode_js_key = os.getenv("GAODE_JS_API_KEY", "")
    gaode_web_key = os.getenv("GAODE_WEB_API_KEY", "")
    city_name = os.getenv("CITY_NAME", "Shanghai")
    bounds_str = os.getenv("CITY_BOUNDS", "121.40,31.15,121.55,31.25")
    parts = [float(x.strip()) for x in bounds_str.split(",")]

    return {
        "gaode_js_api_key": gaode_js_key,
        "gaode_web_api_key": gaode_web_key,
        "city_name": city_name,
        "center": [(parts[0] + parts[2]) / 2, (parts[1] + parts[3]) / 2],
        "bounds": {
            "min_lng": parts[0],
            "min_lat": parts[1],
            "max_lng": parts[2],
            "max_lat": parts[3],
        },
    }


@app.post("/api/crawl")
async def crawl_data(request: CrawlRequest):
    if not app_state.crawler:
        raise HTTPException(status_code=500, detail="Crawler not initialized")

    try:
        logger.info(f"Starting crawl request: {request}")
        bounds = request.bounds or app_state.crawler.city_bounds
        app_state.segments = app_state.crawler.crawl_and_process(bounds)

        app_state.scored_segments = app_state.scorer.score_segments(
            app_state.segments, use_traffic_api=False
        )
        app_state.path_finder.update_segments(app_state.scored_segments)

        return {
            "status": "success",
            "segments_count": len(app_state.segments),
            "scored_segments_count": len(app_state.scored_segments),
            "bounds": bounds.model_dump(),
        }
    except Exception as e:
        logger.error(f"Crawl failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/segments", response_model=SegmentsResponse)
async def get_segments(
    min_score: Optional[float] = Query(None, ge=0, le=100),
    max_score: Optional[float] = Query(None, ge=0, le=100),
    has_lighting: Optional[bool] = None,
):
    filtered = app_state.scored_segments

    if min_score is not None:
        filtered = [s for s in filtered if s.safety_score.total_score >= min_score]
    if max_score is not None:
        filtered = [s for s in filtered if s.safety_score.total_score <= max_score]
    if has_lighting is not None:
        filtered = [s for s in filtered if s.safety_score.has_lighting == has_lighting]

    segments_data = []
    for seg in filtered:
        segments_data.append({
            "segment_id": seg.segment_id,
            "coordinates": seg.coordinates,
            "safety_score": seg.safety_score.total_score,
            "has_lighting": seg.safety_score.has_lighting,
            "road_name": seg.name or "未知道路",
            "safety_color": app_state.scorer.get_safety_color(seg.safety_score.total_score),
            "safety_level": app_state.scorer.get_safety_level(seg.safety_score.total_score),
            "length": seg.length,
            "width": seg.width,
        })

    return SegmentsResponse(
        segments=segments_data,
        count=len(segments_data),
    )


@app.get("/api/segment/info", response_model=SegmentInfoResponse)
async def get_segment_info(
    lng: float = Query(..., description="经度"),
    lat: float = Query(..., description="纬度"),
):
    if not app_state.path_finder:
        raise HTTPException(status_code=500, detail="Path finder not initialized")

    info = app_state.path_finder.get_segment_safety_info((lng, lat))
    if not info:
        raise HTTPException(status_code=404, detail="No segment found near this location")

    return SegmentInfoResponse(**info)


@app.post("/api/route", response_model=RouteResponse)
async def find_route(request: RouteRequest):
    if not app_state.path_finder:
        raise HTTPException(status_code=500, detail="Path finder not initialized")

    try:
        route = app_state.path_finder.find_safe_route(request)

        if not route.route:
            logger.warning("No route found, returning fallback")
            return RouteResponse(
                route=[],
                total_distance=0.0,
                total_safety_score=0.0,
                estimated_time=0.0,
                dark_segments_count=0,
                paved_segments_count=0,
            )

        return route
    except Exception as e:
        logger.error(f"Route finding failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/safety/heatmap")
async def get_heatmap_data(
    grid_size: float = Query(0.001, gt=0, description="网格大小"),
):
    if not app_state.scored_segments:
        return {"grid_size": grid_size, "points": []}

    bounds = app_state.crawler.city_bounds if app_state.crawler else None
    if not bounds:
        bounds_str = os.getenv("CITY_BOUNDS", "121.40,31.15,121.55,31.25")
        parts = [float(x.strip()) for x in bounds_str.split(",")]
        bounds = MapBounds(
            min_lng=parts[0],
            min_lat=parts[1],
            max_lng=parts[2],
            max_lat=parts[3],
        )

    heatmap_points = []
    for seg in app_state.scored_segments:
        for coord in seg.coordinates:
            if (bounds.min_lng <= coord[0] <= bounds.max_lng and
                bounds.min_lat <= coord[1] <= bounds.max_lat):
                heatmap_points.append({
                    "lng": coord[0],
                    "lat": coord[1],
                    "count": seg.safety_score.total_score / 20,
                    "safety_score": seg.safety_score.total_score,
                    "has_lighting": seg.safety_score.has_lighting,
                })

    return {
        "grid_size": grid_size,
        "points": heatmap_points,
        "bounds": bounds.model_dump(),
    }


@app.get("/api/safety/stats")
async def get_safety_stats():
    if not app_state.scored_segments:
        return {
            "total_segments": 0,
            "avg_score": 0,
            "lit_segments": 0,
            "dark_segments": 0,
            "safe_segments": 0,
            "dangerous_segments": 0,
        }

    total = len(app_state.scored_segments)
    scores = [s.safety_score.total_score for s in app_state.scored_segments]
    avg_score = sum(scores) / total if total > 0 else 0

    lit_count = sum(1 for s in app_state.scored_segments if s.safety_score.has_lighting)
    dark_count = total - lit_count
    safe_count = sum(1 for s in app_state.scored_segments if s.safety_score.total_score >= 70)
    dangerous_count = sum(1 for s in app_state.scored_segments if s.safety_score.total_score < 40)

    score_distribution = {
        "0-20": sum(1 for s in scores if 0 <= s < 20),
        "20-40": sum(1 for s in scores if 20 <= s < 40),
        "40-60": sum(1 for s in scores if 40 <= s < 60),
        "60-80": sum(1 for s in scores if 60 <= s < 80),
        "80-100": sum(1 for s in scores if 80 <= s <= 100),
    }

    return {
        "total_segments": total,
        "avg_score": round(avg_score, 1),
        "min_score": round(min(scores) if scores else 0, 1),
        "max_score": round(max(scores) if scores else 0, 1),
        "lit_segments": lit_count,
        "dark_segments": dark_count,
        "safe_segments": safe_count,
        "dangerous_segments": dangerous_count,
        "score_distribution": score_distribution,
    }


frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    initialize_app()

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
