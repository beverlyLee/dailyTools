from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from .models import init_db
from .nl2sql_service import NL2SQLService
from .chart_recommender import ChartRecommender

app = FastAPI(title="智能财报图表生成器", description="自然语言转SQL并生成图表")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

nl2sql_service: Optional[NL2SQLService] = None

class QueryRequest(BaseModel):
    query: str

class ChartConfigRequest(BaseModel):
    chart_type: str
    data: List[Dict[str, Any]]
    columns: List[str]
    analysis: Dict[str, Any]

@app.on_event("startup")
async def startup_event():
    global nl2sql_service
    init_db()
    nl2sql_service = NL2SQLService()

@app.on_event("shutdown")
async def shutdown_event():
    global nl2sql_service
    if nl2sql_service:
        nl2sql_service.close()

@app.get("/")
async def root():
    return {"message": "智能财报图表生成器 API", "version": "1.0"}

@app.post("/api/query")
async def process_query(request: QueryRequest):
    global nl2sql_service
    if not nl2sql_service:
        raise HTTPException(status_code=500, detail="服务未初始化")
    
    result = nl2sql_service.process_query(request.query)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    chart_result = ChartRecommender.recommend_chart(
        result["data"], 
        result["columns"],
        request.query
    )
    
    return {
        "success": True,
        "sql": result["sql"],
        "columns": result["columns"],
        "data": result["data"],
        "chart_recommendation": chart_result
    }

@app.post("/api/recommend-chart")
async def recommend_chart(data: List[Dict[str, Any]], columns: List[str], query: str = ""):
    result = ChartRecommender.recommend_chart(data, columns, query)
    return result

@app.post("/api/generate-chart-config")
async def generate_chart_config(request: ChartConfigRequest):
    config = ChartRecommender.generate_chart_config(
        request.chart_type,
        request.data,
        request.columns,
        request.analysis
    )
    return config

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
