from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional
from contextlib import asynccontextmanager

from src.data.mock_data import generate_mock_notes, get_all_pois, get_pois_by_city, get_poi_by_id, POI as POIData
from src.mining.route_extractor import RouteExtractor
from src.analysis.hotspot_finder import HotspotFinder
from src.models.schemas import POI, Route, POIPair, RouteRecommendation


extractor = RouteExtractor()
hotspot_finder = HotspotFinder()


@asynccontextmanager
async def lifespan(app: FastAPI):
    notes = generate_mock_notes()
    routes = extractor.extract_routes_from_notes(notes)
    hotspot_finder.analyze_routes(routes)
    yield


app = FastAPI(
    title="特种兵旅游路线挖掘工具",
    description="从社交媒体数据中挖掘大学生'30小时吃6顿'的行程规律，识别被高频串联的景点组合",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api")
async def root():
    return {
        "name": "特种兵旅游路线挖掘工具 API",
        "version": "1.0.0",
        "endpoints": {
            "/api/pois": "获取所有POI",
            "/api/pois/{city}": "按城市获取POI",
            "/api/routes": "获取所有路线",
            "/api/routes/{city}": "按城市获取路线",
            "/api/routes/stats": "获取路线统计",
            "/api/hotspots/pairs": "获取高频POI组合",
            "/api/hotspots/pairs/{city}": "按城市获取高频POI组合",
            "/api/hotspots/top-pois": "获取热门POI",
            "/api/hotspots/top-pois/{city}": "按城市获取热门POI",
            "/api/arcs": "获取弧线图数据",
            "/api/arcs/{city}": "按城市获取弧线图数据",
            "/api/recommendations/{city}": "获取城市推荐路线",
            "/api/stats": "获取总体统计",
            "/api/stats/{city}": "获取城市统计"
        }
    }


@app.get("/api/pois", response_model=List[POI])
async def get_all_pois_endpoint():
    pois_dict = get_all_pois()
    return list(pois_dict.values())


@app.get("/api/pois/{city}", response_model=List[POI])
async def get_pois_by_city_endpoint(city: str):
    pois_dict = get_pois_by_city(city)
    if not pois_dict:
        raise HTTPException(status_code=404, detail=f"未找到城市 {city} 的POI数据")
    return list(pois_dict.values())


@app.get("/api/routes", response_model=List[Route])
async def get_all_routes():
    return extractor.routes


@app.get("/api/routes/{city}", response_model=List[Route])
async def get_routes_by_city(city: str):
    routes = extractor.get_routes_by_city(city)
    if not routes:
        raise HTTPException(status_code=404, detail=f"未找到城市 {city} 的路线数据")
    return routes


@app.get("/api/routes/stats")
async def get_route_statistics():
    return extractor.get_route_statistics()


@app.get("/api/routes/time-distribution")
async def get_time_distribution():
    return extractor.get_time_distribution()


@app.get("/api/routes/patterns")
async def get_route_patterns(min_support: Optional[int] = 3):
    return extractor.extract_route_patterns(min_support=min_support)


@app.get("/api/hotspots/pairs", response_model=List[POIPair])
async def get_hotspot_pairs(top_n: Optional[int] = 20):
    return hotspot_finder.get_top_pairs(top_n=top_n)


@app.get("/api/hotspots/pairs/{city}", response_model=List[POIPair])
async def get_hotspot_pairs_by_city(city: str, top_n: Optional[int] = 20):
    pairs = hotspot_finder.get_top_pairs(city=city, top_n=top_n)
    if not pairs:
        raise HTTPException(status_code=404, detail=f"未找到城市 {city} 的热点组合")
    return pairs


@app.get("/api/hotspots/top-pois")
async def get_top_pois(top_n: Optional[int] = 10):
    return hotspot_finder.get_top_pois(top_n=top_n)


@app.get("/api/hotspots/top-pois/{city}")
async def get_top_pois_by_city(city: str, top_n: Optional[int] = 10):
    pois = hotspot_finder.get_top_pois(city=city, top_n=top_n)
    if not pois:
        raise HTTPException(status_code=404, detail=f"未找到城市 {city} 的热门POI")
    return pois


@app.get("/api/arcs")
async def get_arc_data(city: Optional[str] = None):
    return hotspot_finder.get_arc_data(city=city)


@app.get("/api/arcs/{city}")
async def get_arc_data_by_city(city: str):
    arcs = hotspot_finder.get_arc_data(city=city)
    if not arcs:
        raise HTTPException(status_code=404, detail=f"未找到城市 {city} 的弧线数据")
    return arcs


@app.get("/api/recommendations/{city}", response_model=List[RouteRecommendation])
async def get_recommendations(city: str, num: Optional[int] = 3):
    valid_cities = ["南京", "重庆", "长沙"]
    if city not in valid_cities:
        raise HTTPException(status_code=400, detail=f"仅支持以下城市: {', '.join(valid_cities)}")
    recommendations = hotspot_finder.generate_route_recommendations(city, num_recommendations=num)
    if not recommendations:
        raise HTTPException(status_code=404, detail=f"无法为城市 {city} 生成推荐路线")
    return recommendations


@app.get("/api/stats")
async def get_overall_stats():
    route_stats = extractor.get_route_statistics()
    time_dist = extractor.get_time_distribution()

    city_stats = []
    for city in ["南京", "重庆", "长沙"]:
        stats = hotspot_finder.get_city_stats(city)
        city_stats.append(stats)

    city_stats.sort(key=lambda x: x["total_flow"], reverse=True)

    return {
        "route_statistics": route_stats,
        "time_distribution": time_dist,
        "city_rankings": city_stats,
        "total_pois": len(get_all_pois()),
        "supported_cities": ["南京", "重庆", "长沙"]
    }


@app.get("/api/stats/{city}")
async def get_city_stats(city: str):
    valid_cities = ["南京", "重庆", "长沙"]
    if city not in valid_cities:
        raise HTTPException(status_code=400, detail=f"仅支持以下城市: {', '.join(valid_cities)}")

    stats = hotspot_finder.get_city_stats(city)
    top_pois = hotspot_finder.get_top_pois(city=city, top_n=10)
    top_pairs = hotspot_finder.get_top_pairs(city=city, top_n=5)
    routes = extractor.get_routes_by_city(city)

    return {
        "city": city,
        "basic_stats": stats,
        "top_pois": top_pois,
        "top_pairs": top_pairs,
        "total_routes": len(routes)
    }
