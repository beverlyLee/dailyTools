import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import Optional, List
import os

from src.nlp.partner_classifier import PartnerClassifier
from src.analysis.partner_index import PartnerIndexCalculator
from src.data_simulator import DataSimulator

app = FastAPI(
    title="搭子文化地图分析平台",
    description="分析不同城市、不同类型搭子文化的流行程度和社交差异",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/")
async def root():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {
        "name": "搭子文化地图分析平台",
        "version": "1.0.0",
        "endpoints": {
            "API文档": "/docs",
            "数据可视化": "/static/index.html",
            "分类单条文本": "/api/classify",
            "批量分类": "/api/classify/batch",
            "城市指数": "/api/city/{city}",
            "类型指数": "/api/type/{partner_type}",
            "对比数据": "/api/comparison",
            "气泡图数据": "/api/bubble-chart-data",
            "所有城市汇总": "/api/cities/summary",
            "模拟数据": "/api/simulated-data"
        }
    }


@app.get("/api/classify")
async def classify_text(text: str = Query(..., description="要分类的帖子文本")):
    if not text.strip():
        raise HTTPException(status_code=400, detail="文本不能为空")
    result = PartnerClassifier.classify_post(text)
    return {"success": True, "data": result}


@app.post("/api/classify/batch")
async def classify_batch(texts: List[str]):
    if not texts:
        raise HTTPException(status_code=400, detail="文本列表不能为空")
    results = PartnerClassifier.batch_classify(texts)
    return {"success": True, "data": results, "count": len(results)}


@app.get("/api/cities")
async def get_all_cities():
    cities = PartnerIndexCalculator.get_all_cities()
    return {"success": True, "data": cities}


@app.get("/api/partner-types")
async def get_all_partner_types():
    types = PartnerClassifier.get_all_partner_types()
    return {"success": True, "data": types}


@app.get("/api/city/{city}")
async def get_city_summary(city: str):
    valid_cities = PartnerIndexCalculator.get_all_cities()
    if city not in valid_cities:
        raise HTTPException(status_code=404, detail=f"城市 {city} 不在分析范围内。有效城市: {', '.join(valid_cities)}")
    summary = PartnerIndexCalculator.get_city_summary(city)
    return {"success": True, "data": summary}


@app.get("/api/type/{partner_type}")
async def get_type_summary(partner_type: str):
    valid_types = PartnerClassifier.get_all_partner_types()
    if partner_type not in valid_types:
        raise HTTPException(status_code=404, detail=f"类型 {partner_type} 不在分析范围内。有效类型: {', '.join(valid_types)}")
    summary = PartnerIndexCalculator.get_type_summary(partner_type)
    return {"success": True, "data": summary}


@app.get("/api/comparison")
async def get_comparison_data():
    data = PartnerIndexCalculator.get_comparison_data()
    return {"success": True, "data": data}


@app.get("/api/bubble-chart-data")
async def get_bubble_chart_data():
    data = PartnerIndexCalculator.get_bubble_chart_data()
    return {"success": True, "data": data}


@app.get("/api/cities/summary")
async def get_all_cities_summary():
    cities = PartnerIndexCalculator.get_all_cities()
    summaries = []
    for city in cities:
        summary = PartnerIndexCalculator.get_city_summary(city)
        summaries.append(summary)
    return {"success": True, "data": summaries}


@app.get("/api/simulated-data")
async def get_simulated_data(
    city: Optional[str] = Query(None, description="城市筛选"),
    partner_type: Optional[str] = Query(None, description="类型筛选"),
    limit: int = Query(100, ge=1, le=1000, description="返回数量限制")
):
    all_data = DataSimulator.generate_all_simulated_data()
    
    if city:
        all_data = [d for d in all_data if d["city"] == city]
    if partner_type:
        all_data = [d for d in all_data if partner_type in d["text"]]
    
    all_data = all_data[:limit]
    
    return {
        "success": True,
        "data": all_data,
        "count": len(all_data)
    }


@app.get("/api/verify")
async def verify_analysis():
    PartnerIndexCalculator.invalidate_cache()
    verification_result = PartnerIndexCalculator.verify_analysis()
    
    cities_data = {}
    for city in PartnerIndexCalculator.get_all_cities():
        summary = PartnerIndexCalculator.get_city_summary(city)
        cities_data[city] = summary
    
    return {
        "success": True,
        "verification": verification_result,
        "all_cities_data": cities_data
    }


if __name__ == "__main__":
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)