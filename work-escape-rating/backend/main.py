import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from dotenv import load_dotenv

load_dotenv()

from src.nlp.feature_extractor import feature_extractor
from src.scoring.productivity_score import scorer
from src.data.places_data import get_all_places, get_place_by_id

app = FastAPI(title="Work Escape Rating API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": str(exc),
            "message": "服务器内部错误，请稍后重试"
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "message": exc.detail
        }
    )

class PlaceScoreRequest(BaseModel):
    comments: List[str]
    price_level: Optional[float] = None
    seat_comfort: Optional[float] = None

class SocketLocation(BaseModel):
    description: str
    x: float
    y: float

class PlaceResponse(BaseModel):
    id: str
    name: str
    type: str
    address: str
    latitude: float
    longitude: float
    rating: float
    price_level: int
    avg_price: int
    image_url: str
    opening_hours: str
    wifi_score: float
    socket_count: int
    noise_level: float
    office_score: float
    escape_score: float
    overall_score: float
    office_rating: str
    escape_rating: str
    recommendation: str
    socket_tips: List[str]
    socket_locations: List[SocketLocation]

def calculate_place_scores(place):
    features = feature_extractor.extract_features(place["comments"])
    scores = scorer.calculate_scores(
        wifi_score=features.wifi_score,
        socket_count=features.socket_count,
        noise_level=features.noise_level,
        price_level=place.get("price_level"),
        seat_comfort=None
    )
    return {
        "wifi_score": features.wifi_score,
        "socket_count": features.socket_count,
        "noise_level": features.noise_level,
        "office_score": scores.office_score,
        "escape_score": scores.escape_score,
        "overall_score": scores.overall_score,
        "office_rating": scores.office_rating,
        "escape_rating": scores.escape_rating,
        "recommendation": scores.recommendation,
        "socket_tips": features.socket_tips
    }

@app.get("/health")
async def health_check():
    return {
        "success": True,
        "status": "healthy",
        "service": "Work Escape Rating API",
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    return {"message": "Work Escape Rating API is running"}

@app.get("/config/map")
async def get_map_config():
    return {
        "success": True,
        "gaode_api_key": os.getenv("GAODE_API_KEY", "")
    }

@app.get("/places")
async def get_places(filter_type: Optional[str] = None, min_score: Optional[float] = None):
    try:
        places = get_all_places()
        result = []
        
        for place in places:
            place_scores = calculate_place_scores(place)
            
            if filter_type and place["type"] != filter_type:
                continue
            if min_score is not None and place_scores["overall_score"] < min_score:
                continue
                
            result.append({
                **place,
                **place_scores,
                "socket_locations": place.get("socket_locations", [])
            })
        
        return {
            "success": True,
            "data": sorted(result, key=lambda x: x["overall_score"], reverse=True)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取地点列表失败: {str(e)}")

@app.get("/places/{place_id}")
async def get_place(place_id: str):
    try:
        place = get_place_by_id(place_id)
        if not place:
            raise HTTPException(status_code=404, detail="Place not found")
        
        place_scores = calculate_place_scores(place)
        
        return {
            "success": True,
            "data": {
                **place,
                **place_scores,
                "socket_locations": place.get("socket_locations", [])
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取地点详情失败: {str(e)}")

@app.post("/analyze")
async def analyze_comments(request: PlaceScoreRequest):
    try:
        features = feature_extractor.extract_features(request.comments)
        scores = scorer.calculate_scores(
            wifi_score=features.wifi_score,
            socket_count=features.socket_count,
            noise_level=features.noise_level,
            price_level=request.price_level,
            seat_comfort=request.seat_comfort
        )
        
        return {
            "success": True,
            "data": {
                "features": {
                    "wifi_score": features.wifi_score,
                    "socket_count": features.socket_count,
                    "noise_level": features.noise_level,
                    "socket_tips": features.socket_tips,
                    "wifi_tips": features.wifi_tips,
                    "noise_tips": features.noise_tips
                },
                "scores": {
                    "office_score": scores.office_score,
                    "escape_score": scores.escape_score,
                    "overall_score": scores.overall_score,
                    "office_rating": scores.office_rating,
                    "escape_rating": scores.escape_rating,
                    "recommendation": scores.recommendation
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"评论分析失败: {str(e)}")

@app.get("/stats")
async def get_stats():
    try:
        places = get_all_places()
        total_places = len(places)
        avg_score = 0
        high_score_count = 0
        
        for place in places:
            place_scores = calculate_place_scores(place)
            avg_score += place_scores["overall_score"]
            if place_scores["overall_score"] >= 8.0:
                high_score_count += 1
        
        avg_score = avg_score / total_places if total_places > 0 else 0
        
        return {
            "success": True,
            "data": {
                "total_places": total_places,
                "average_score": round(avg_score, 2),
                "high_score_count": high_score_count
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计数据失败: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
