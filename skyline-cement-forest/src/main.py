import os
import sys
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(__file__))
from property.building_crawler import BuildingCrawler, BuildingData
from 3d.building_generator import BuildingGenerator, Building3D
from timeline.timeline_controller import TimelineController, TimelineStats

app = FastAPI(
    title="Skyline Cement Forest API",
    description="城市建筑密度增长模拟 - 3D 可视化后端 API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), '../data')
os.makedirs(DATA_DIR, exist_ok=True)

crawler = BuildingCrawler()
generator = BuildingGenerator()
timeline = TimelineController()


class CrawlRequest(BaseModel):
    city: str = "深圳"
    district: str = "南山区"
    count: int = 200
    use_mock: bool = True


@app.get("/")
async def root():
    return {
        "name": "Skyline Cement Forest API",
        "version": "1.0.0",
        "endpoints": {
            "GET /api/buildings": "获取所有建筑数据",
            "GET /api/buildings/{year}": "获取指定年份及之前的建筑数据",
            "GET /api/timeline": "获取时间轴数据",
            "GET /api/stats": "获取统计数据",
            "GET /api/stats/{year}": "获取指定年份的统计数据",
            "POST /api/crawl": "触发数据爬取",
            "GET /api/animation": "获取动画帧数据"
        }
    }


@app.get("/api/buildings")
async def get_buildings(
    start_year: Optional[int] = Query(None, description="起始年份"),
    end_year: Optional[int] = Query(None, description="结束年份"),
    format: str = Query("deckgl", description="返回格式: deckgl, geojson, raw")
):
    buildings = _get_cached_buildings()
    
    if start_year is not None or end_year is not None:
        start = start_year or 2000
        end = end_year or 2025
        filtered = [b for b in buildings if start <= b.build_year <= end]
    else:
        filtered = buildings
    
    if format == "deckgl":
        return {"data": generator.to_deckgl_format(filtered)}
    elif format == "geojson":
        return generator.to_geojson(filtered)
    else:
        return {"data": [b.__dict__ for b in filtered]}


@app.get("/api/buildings/{year}")
async def get_buildings_by_year(year: int):
    buildings = _get_cached_buildings()
    timeline.set_buildings(buildings)
    buildings_up_to = timeline.get_buildings_up_to_year(year)
    return {
        "year": year,
        "count": len(buildings_up_to),
        "data": generator.to_deckgl_format(buildings_up_to)
    }


@app.get("/api/timeline")
async def get_timeline(
    start_year: Optional[int] = Query(None),
    end_year: Optional[int] = Query(None)
):
    buildings = _get_cached_buildings()
    timeline.set_buildings(buildings)
    return timeline.to_deckgl_timeline(start_year, end_year)


@app.get("/api/stats")
async def get_stats():
    buildings = _get_cached_buildings()
    timeline.set_buildings(buildings)
    stats = timeline.get_stats()
    return stats.__dict__


@app.get("/api/stats/{year}")
async def get_stats_by_year(year: int):
    buildings = _get_cached_buildings()
    timeline.set_buildings(buildings)
    stats = timeline.get_stats_up_to_year(year)
    return {
        "year": year,
        **stats.__dict__
    }


@app.get("/api/animation")
async def get_animation_frames(
    start_year: int = Query(2000),
    end_year: int = Query(2020),
    step: int = Query(1)
):
    buildings = _get_cached_buildings()
    timeline.set_buildings(buildings)
    frames = timeline.get_animation_frames(start_year, end_year, step)
    return {
        "startYear": start_year,
        "endYear": end_year,
        "step": step,
        "frameCount": len(frames),
        "frames": frames
    }


@app.post("/api/crawl")
async def crawl_buildings(request: CrawlRequest):
    try:
        if request.use_mock:
            buildings = crawler.generate_mock_data(
                city=request.city,
                district=request.district,
                count=request.count
            )
        else:
            if request.city == "深圳":
                buildings = crawler.crawl_anjuke("shenzhen")
            else:
                buildings = crawler.crawl_anjuke()
        
        filepath = crawler.save_to_json(buildings, 'buildings.json')
        
        buildings_3d = generator.generate_all_buildings(buildings)
        timeline.set_buildings(buildings_3d)
        
        _cache_buildings(buildings_3d)
        
        return {
            "success": True,
            "count": len(buildings),
            "filepath": filepath,
            "stats": timeline.get_stats().__dict__
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/data/buildings.json")
async def get_buildings_json():
    filepath = os.path.join(DATA_DIR, 'buildings.json')
    if os.path.exists(filepath):
        return FileResponse(filepath)
    raise HTTPException(status_code=404, detail="Data not found")


@app.get("/api/data/deckgl.json")
async def get_deckgl_json():
    filepath = os.path.join(DATA_DIR, 'buildings_deckgl.json')
    if os.path.exists(filepath):
        return FileResponse(filepath)
    
    buildings = _get_cached_buildings()
    data = generator.to_deckgl_format(buildings)
    return JSONResponse(content=data)


def _get_cached_buildings() -> List[Building3D]:
    cache_path = os.path.join(DATA_DIR, 'buildings_3d_cache.json')
    
    if timeline.buildings:
        return timeline.buildings
    
    if os.path.exists(cache_path):
        import json
        with open(cache_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        buildings = [Building3D(**item) for item in data]
        timeline.set_buildings(buildings)
        return buildings
    
    buildings_3d = _generate_default_buildings()
    _cache_buildings(buildings_3d)
    return buildings_3d


def _cache_buildings(buildings: List[Building3D]):
    cache_path = os.path.join(DATA_DIR, 'buildings_3d_cache.json')
    import json
    with open(cache_path, 'w', encoding='utf-8') as f:
        json.dump([b.__dict__ for b in buildings], f, ensure_ascii=False, indent=2)


def _generate_default_buildings() -> List[Building3D]:
    from 3d.building_generator import generate_sample_buildings
    buildings = generate_sample_buildings(300)
    timeline.set_buildings(buildings)
    
    generator.save_geojson(buildings, os.path.join(DATA_DIR, 'buildings_3d.geojson'))
    generator.save_deckgl_json(buildings, os.path.join(DATA_DIR, 'buildings_deckgl.json'))
    
    return buildings


@app.on_event("startup")
async def startup_event():
    _get_cached_buildings()
    print("Skyline Cement Forest API started successfully")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
