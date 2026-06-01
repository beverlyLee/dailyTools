from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.data.top_scorer_loader import TopScorerLoader
from src.analysis.university_flow import UniversityFlowAnalyzer

app = FastAPI(title="高考状元流向分析系统 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

loader = TopScorerLoader()
data = loader.load_data()
analyzer = UniversityFlowAnalyzer(data)


@app.get("/")
async def root():
    return {
        "message": "高考状元流向分析系统 API",
        "version": "1.0.0",
        "endpoints": {
            "/api/statistics": "总体统计信息",
            "/api/provinces": "所有省份列表",
            "/api/schools": "所有大学列表",
            "/api/years": "所有年份列表",
            "/api/top-universities": "录取状元最多的大学",
            "/api/province-outflow": "各省状元流向清华北大人数",
            "/api/flow-data": "流向数据(用于地图可视化)",
            "/api/concentration": "生源集中度分析",
            "/api/major-trend": "专业选择趋势",
            "/api/province-ranking": "省份排名",
            "/api/province/{province}": "某省状元详情",
            "/api/year/{year}": "某年状元详情",
        }
    }


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


@app.get("/api/statistics")
async def get_statistics():
    return loader.get_statistics()


@app.get("/api/provinces")
async def get_provinces():
    return {"provinces": loader.get_provinces()}


@app.get("/api/schools")
async def get_schools():
    return {"schools": loader.get_schools()}


@app.get("/api/years")
async def get_years():
    return {"years": loader.get_years()}


@app.get("/api/top-universities")
async def get_top_universities(n: int = 10):
    return {"top_universities": analyzer.get_top_universities(n)}


@app.get("/api/province-outflow")
async def get_province_outflow():
    return {"outflow": analyzer.get_province_outflow()}


@app.get("/api/flow-data")
async def get_flow_data():
    return {"flows": analyzer.get_flow_data()}


@app.get("/api/concentration")
async def get_concentration(top_k: int = 3):
    return analyzer.get_concentration_ratio(top_k)


@app.get("/api/major-trend")
async def get_major_trend():
    trend = analyzer.get_major_trend()
    trend_dict = {int(year): row.to_dict() for year, row in trend.iterrows()}
    return {"trend": trend_dict}


@app.get("/api/province-ranking")
async def get_province_ranking():
    return {"ranking": analyzer.get_province_ranking()}


@app.get("/api/major-stats")
async def get_major_stats():
    return {"major_stats": analyzer.get_major_category_stats()}


@app.get("/api/province/{province}")
async def get_province_data(province: str):
    df = loader.filter_by_province(province)
    if df.empty:
        raise HTTPException(status_code=404, detail=f"未找到省份 {province} 的数据")
    return {
        "province": province,
        "count": len(df),
        "data": df.to_dict("records")
    }


@app.get("/api/year/{year}")
async def get_year_data(year: int):
    df = loader.filter_by_year(year)
    if df.empty:
        raise HTTPException(status_code=404, detail=f"未找到年份 {year} 的数据")
    return {
        "year": year,
        "count": len(df),
        "data": df.to_dict("records")
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
