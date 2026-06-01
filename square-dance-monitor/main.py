from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
from geo.buffer_check import (
    load_parks_from_csv,
    load_residential_areas_from_csv,
    check_park_proximity
)
from data.complaint_matcher import (
    load_complaints_from_csv,
    match_complaints_to_parks,
    get_complaint_summary
)

app = FastAPI(title="广场舞噪音监测系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')


@app.get("/")
async def root():
    return {
        "message": "广场舞噪音监测系统 API",
        "version": "1.0.0",
        "endpoints": {
            "/parks": "获取所有公园列表",
            "/parks/risk": "获取所有公园的风险评估",
            "/parks/high-risk": "获取高风险公园列表",
            "/complaints": "获取所有投诉列表",
            "/complaints/matched": "获取匹配到公园的投诉数据",
            "/complaints/summary": "获取投诉统计摘要",
            "/park/{park_id}": "获取单个公园的详细信息（含投诉）"
        }
    }


@app.get("/parks")
async def get_parks():
    try:
        parks = load_parks_from_csv(os.path.join(DATA_DIR, 'parks.csv'))
        return {"count": len(parks), "data": parks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/parks/risk")
async def get_parks_risk():
    try:
        parks = load_parks_from_csv(os.path.join(DATA_DIR, 'parks.csv'))
        residential = load_residential_areas_from_csv(os.path.join(DATA_DIR, 'residential_areas.csv'))
        parks_with_risk = check_park_proximity(parks, residential, buffer_meters=250)
        return {"count": len(parks_with_risk), "data": parks_with_risk}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/parks/high-risk")
async def get_high_risk_parks_endpoint():
    try:
        parks = load_parks_from_csv(os.path.join(DATA_DIR, 'parks.csv'))
        residential = load_residential_areas_from_csv(os.path.join(DATA_DIR, 'residential_areas.csv'))
        complaints = load_complaints_from_csv(os.path.join(DATA_DIR, 'complaints.csv'))
        
        parks_with_risk = check_park_proximity(parks, residential, buffer_meters=250)
        parks_with_complaints = match_complaints_to_parks(parks_with_risk, complaints, max_distance_meters=500)
        
        high_risk = [p for p in parks_with_complaints if p['risk_level'] == 'high']
        return {"count": len(high_risk), "data": high_risk}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/complaints")
async def get_complaints():
    try:
        complaints = load_complaints_from_csv(os.path.join(DATA_DIR, 'complaints.csv'))
        return {"count": len(complaints), "data": complaints}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/complaints/matched")
async def get_matched_complaints():
    try:
        parks = load_parks_from_csv(os.path.join(DATA_DIR, 'parks.csv'))
        residential = load_residential_areas_from_csv(os.path.join(DATA_DIR, 'residential_areas.csv'))
        complaints = load_complaints_from_csv(os.path.join(DATA_DIR, 'complaints.csv'))
        
        parks_with_risk = check_park_proximity(parks, residential, buffer_meters=250)
        parks_with_complaints = match_complaints_to_parks(parks_with_risk, complaints, max_distance_meters=500)
        
        return {"count": len(parks_with_complaints), "data": parks_with_complaints}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/complaints/summary")
async def get_complaints_summary():
    try:
        parks = load_parks_from_csv(os.path.join(DATA_DIR, 'parks.csv'))
        residential = load_residential_areas_from_csv(os.path.join(DATA_DIR, 'residential_areas.csv'))
        complaints = load_complaints_from_csv(os.path.join(DATA_DIR, 'complaints.csv'))
        
        parks_with_risk = check_park_proximity(parks, residential, buffer_meters=250)
        parks_with_complaints = match_complaints_to_parks(parks_with_risk, complaints, max_distance_meters=500)
        
        summary = get_complaint_summary(parks_with_complaints)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/park/{park_id}")
async def get_park_detail(park_id: str):
    try:
        parks = load_parks_from_csv(os.path.join(DATA_DIR, 'parks.csv'))
        residential = load_residential_areas_from_csv(os.path.join(DATA_DIR, 'residential_areas.csv'))
        complaints = load_complaints_from_csv(os.path.join(DATA_DIR, 'complaints.csv'))
        
        parks_with_risk = check_park_proximity(parks, residential, buffer_meters=250)
        parks_with_complaints = match_complaints_to_parks(parks_with_risk, complaints, max_distance_meters=500)
        
        for park in parks_with_complaints:
            if park['park_id'] == park_id:
                return park
        
        raise HTTPException(status_code=404, detail=f"Park with id {park_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
