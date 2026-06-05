import os
import sys
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.traffic.highway_status_spider import HighwayStatusSpider
from src.direction.flow_direction import FlowDirectionAnalyzer
from src.destination.poi_association import POIAssociator

load_dotenv()

CITY_CENTER_LNG = float(os.getenv("CITY_CENTER_LNG", "116.397428"))
CITY_CENTER_LAT = float(os.getenv("CITY_CENTER_LAT", "39.90923"))
CITY_NAME = os.getenv("CITY_NAME", "北京")
GAODE_TRAFFIC_KEY = os.getenv("GAODE_TRAFFIC_KEY", "")

app = FastAPI(title="Weekend Escape API", version="1.0.0")

static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


class TrafficDataRequest(BaseModel):
    radii: Optional[List[int]] = None
    use_cache: bool = True


class TrafficFlowResponse(BaseModel):
    city: str
    center: List[float]
    timestamp: str
    flow_direction: str
    direction_clusters: List[Dict[str, Any]]
    radial_lines: List[Dict[str, Any]]
    scenic_associations: List[Dict[str, Any]]


def detect_flow_direction() -> str:
    now = datetime.now()
    weekday = now.weekday()
    hour = now.hour
    
    if weekday == 4 and 16 <= hour <= 20:
        return "outbound"
    elif weekday == 0 and 8 <= hour <= 12:
        return "inbound"
    else:
        return "outbound"


def generate_mock_traffic_data(flow_direction: str = "outbound") -> List[Dict[str, Any]]:
    import random
    import math
    
    segments = []
    
    directions = [10, 45, 90, 135, 180, 225, 270, 315]
    
    if flow_direction == "inbound":
        directions = [(d + 180) % 360 for d in directions]
    
    flow_weights = [30, 25, 15, 10, 8, 5, 4, 3]
    
    for i, base_dir in enumerate(directions):
        for j in range(flow_weights[i]):
            direction = base_dir + random.uniform(-15, 15)
            angle_rad = math.radians(direction)
            
            dist = random.uniform(5, 30)
            start_lng = CITY_CENTER_LNG + (dist / 111.32) * math.cos(angle_rad)
            start_lat = CITY_CENTER_LAT + (dist / 111.32) * math.sin(angle_rad)
            
            end_dist = dist + random.uniform(2, 5)
            end_lng = CITY_CENTER_LNG + (end_dist / 111.32) * math.cos(angle_rad)
            end_lat = CITY_CENTER_LAT + (end_dist / 111.32) * math.sin(angle_rad)
            
            congestion = random.choices([2, 3, 4], weights=[0.3, 0.4, 0.3])[0]
            speed = {2: 40, 3: 25, 4: 15}[congestion] + random.uniform(-5, 5)
            
            segments.append({
                "name": f"高速{i+1}",
                "start_lng": start_lng,
                "start_lat": start_lat,
                "end_lng": end_lng,
                "end_lat": end_lat,
                "status": congestion,
                "speed": speed,
                "direction": direction,
                "distance_from_center": dist * 1000,
                "is_congested": True,
                "congestion_level": congestion
            })
    
    return segments


@app.get("/")
async def root():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Weekend Escape API"}


@app.get("/api/config")
async def get_config():
    return {
        "mapbox_token": os.getenv("MAPBOX_TOKEN", ""),
        "gaode_key": GAODE_TRAFFIC_KEY,
        "city_center": [CITY_CENTER_LNG, CITY_CENTER_LAT],
        "city_name": CITY_NAME
    }


@app.get("/api/traffic/flow")
async def get_traffic_flow(use_mock: bool = True):
    try:
        flow_direction = detect_flow_direction()
        
        if use_mock:
            segments = generate_mock_traffic_data(flow_direction)
        else:
            spider = HighwayStatusSpider()
            segments = spider.fetch_multi_radius_traffic()
            if not segments:
                segments = generate_mock_traffic_data(flow_direction)
        
        direction_analyzer = FlowDirectionAnalyzer()
        clusters = direction_analyzer.analyze_traffic_directions(segments)
        
        poi_associator = POIAssociator()
        associations = poi_associator.associate_directions_with_pois(clusters)
        radial_lines = poi_associator.get_radial_lines_with_destinations(associations)
        
        response = {
            "city": CITY_NAME,
            "center": [CITY_CENTER_LNG, CITY_CENTER_LAT],
            "timestamp": datetime.now().isoformat(),
            "flow_direction": flow_direction,
            "direction_clusters": clusters,
            "radial_lines": radial_lines,
            "scenic_associations": associations
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/traffic/segments")
async def get_traffic_segments(use_mock: bool = True):
    try:
        if use_mock:
            flow_direction = detect_flow_direction()
            segments = generate_mock_traffic_data(flow_direction)
        else:
            spider = HighwayStatusSpider()
            segments = spider.fetch_multi_radius_traffic()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "total_segments": len(segments),
            "segments": segments
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/destinations")
async def get_destinations():
    try:
        poi_associator = POIAssociator()
        return {
            "scenic_spots": poi_associator.scenic_spots
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/traffic/refresh")
async def refresh_traffic_data():
    try:
        spider = HighwayStatusSpider()
        segments = spider.fetch_multi_radius_traffic()
        spider.save_data()
        
        return {
            "message": "Traffic data refreshed",
            "total_segments": len(segments),
            "congested_segments": len([s for s in segments if s.get("is_congested")])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "flow_direction": detect_flow_direction()
    }


def main():
    import uvicorn
    print(f"Starting Weekend Escape server for {CITY_NAME}...")
    print(f"City center: {CITY_CENTER_LNG}, {CITY_CENTER_LAT}")
    print(f"Current flow direction: {detect_flow_direction()}")
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
