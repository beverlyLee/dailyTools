import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from typing import List, Dict, Optional
from dotenv import load_dotenv

from src.crawler.social_media_flood import SocialMediaFloodCrawler
from src.model.flood_risk_score import FloodRiskModel

load_dotenv()

GAODE_API_KEY = os.getenv('GAODE_API_KEY', '')
GAODE_JS_API_KEY = os.getenv('GAODE_JS_API_KEY', '')

app = FastAPI(title="城市内涝风险评估系统")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

crawler = SocialMediaFloodCrawler()
risk_model = FloodRiskModel()

reports = crawler.crawl_flood_reports()
risk_model.load_historical_data(reports)
risk_zones = risk_model.generate_risk_zones()

@app.get("/api/risk_zones")
async def get_risk_zones(
    risk_level: Optional[str] = Query(None, description="风险等级过滤: high/medium/low")
):
    zones = risk_zones
    if risk_level:
        zones = [z for z in zones if z["risk_level"] == risk_level]
    return zones

@app.get("/api/heatmap")
async def get_heatmap_data():
    return risk_model.get_heatmap_data()

@app.get("/api/reports")
async def get_reports(
    lat: Optional[float] = Query(None, description="纬度"),
    lng: Optional[float] = Query(None, description="经度"),
    radius: Optional[float] = Query(0.01, description="搜索半径(km)")
):
    if lat and lng:
        return crawler.get_reports_by_location(lat, lng, radius)
    return reports[:50]

@app.get("/api/risk_zone/{zone_id}")
async def get_risk_zone(zone_id: str):
    zone = risk_model.get_risk_zone_by_id(zone_id)
    if not zone:
        return {"error": "风险区域不存在"}
    return zone

@app.get("/api/high_risk_zones")
async def get_high_risk_zones():
    return risk_model.get_high_risk_zones()

@app.get("/api/config")
async def get_config():
    return {
        "gaodeApiKey": GAODE_JS_API_KEY
    }

@app.get("/", response_class=HTMLResponse)
async def root():
    with open(os.path.join(BASE_DIR, "index.html"), 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('%GAODE_API_KEY%', GAODE_JS_API_KEY)
    return content

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)