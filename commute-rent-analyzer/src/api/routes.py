from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core_engine.score_calculator import ScoreCalculator
from ai_service.ai_advisor import AIAssistant
from config import Config


app = FastAPI(title="通勤租房分析器 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SearchResponse(BaseModel):
    city: str
    budget: float
    areas: List[dict]
    recommended_areas: List[dict]


class AIRequest(BaseModel):
    city: str
    budget: float
    preferences: Optional[str] = ""


class AIResponse(BaseModel):
    recommendation: str


calculator = ScoreCalculator()
ai_assistant = AIAssistant()


@app.get("/")
async def root():
    return {"message": "通勤租房分析器 API", "version": "1.0.0"}


@app.get("/search", response_model=SearchResponse)
async def search(
    city: str = Query(default="beijing", description="城市代码，如 beijing, shanghai"),
    budget: float = Query(default=5000, description="月租金预算，单位元"),
    work_location: str = Query(default="center", description="工作地点，如 center, wangjing, xierqi, guomao, zhongguancun")
):
    if city not in Config.CITIES:
        raise HTTPException(status_code=400, detail=f"不支持的城市: {city}")
    
    if budget <= 0:
        raise HTTPException(status_code=400, detail="预算必须大于0")
    
    areas_with_scores = calculator.get_areas_with_scores(city, budget, work_location)
    recommended_areas = calculator.filter_recommended_areas(areas_with_scores, budget)
    
    return SearchResponse(
        city=city,
        budget=budget,
        areas=areas_with_scores,
        recommended_areas=recommended_areas
    )


@app.get("/cities")
async def get_cities():
    return {
        "cities": [
            {
                "code": code,
                "name": data["name"],
                "districts": data["districts"]
            }
            for code, data in Config.CITIES.items()
        ]
    }


@app.post("/ai/advise", response_model=AIResponse)
async def ai_advise(request: AIRequest):
    areas_with_scores = calculator.get_areas_with_scores(request.city, request.budget)
    recommendation = ai_assistant.generate_recommendation(
        city=request.city,
        budget=request.budget,
        preferences=request.preferences,
        areas_data=areas_with_scores
    )
    
    return AIResponse(recommendation=recommendation)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
