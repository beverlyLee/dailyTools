from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.poi.amap_poi import AmapPOICollector
from src.analysis.kde_estimator import KDEEstimator

app = FastAPI(title="咖啡店铺地理分析API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MOCK_DATA = {
    "office_buildings": [
        {"name": "上海环球金融中心", "address": "浦东新区世纪大道100号", "lng": 121.5038, "lat": 31.2358, "type": "office"},
        {"name": "金茂大厦", "address": "浦东新区世纪大道88号", "lng": 121.5030, "lat": 31.2365, "type": "office"},
        {"name": "上海中心大厦", "address": "浦东新区银城中路501号", "lng": 121.5015, "lat": 31.2355, "type": "office"},
        {"name": "国金中心", "address": "浦东新区世纪大道8号", "lng": 121.4995, "lat": 31.2370, "type": "office"},
        {"name": "东亚银行金融大厦", "address": "浦东新区花园石桥路66号", "lng": 121.5010, "lat": 31.2380, "type": "office"},
        {"name": "恒生银行大厦", "address": "浦东新区陆家嘴环路1000号", "lng": 121.5025, "lat": 31.2390, "type": "office"},
        {"name": "花旗集团大厦", "address": "浦东新区花园石桥路33号", "lng": 121.5000, "lat": 31.2395, "type": "office"},
        {"name": "震旦国际大楼", "address": "浦东新区富城路99号", "lng": 121.5045, "lat": 31.2375, "type": "office"},
        {"name": "太平金融大厦", "address": "浦东新区银城中路488号", "lng": 121.5008, "lat": 31.2345, "type": "office"},
        {"name": "上海国金中心二期", "address": "浦东新区世纪大道8号", "lng": 121.4988, "lat": 31.2362, "type": "office"},
        {"name": "中银大厦", "address": "浦东新区银城中路200号", "lng": 121.4992, "lat": 31.2340, "type": "office"},
        {"name": "交银金融大厦", "address": "浦东新区银城中路188号", "lng": 121.4985, "lat": 31.2335, "type": "office"},
        {"name": "汇丰大厦", "address": "浦东新区银城东路101号", "lng": 121.5020, "lat": 31.2350, "type": "office"},
        {"name": "上海银行大厦", "address": "浦东新区银城中路168号", "lng": 121.4978, "lat": 31.2348, "type": "office"},
        {"name": "渣打银行大厦", "address": "浦东新区世纪大道201号", "lng": 121.5040, "lat": 31.2342, "type": "office"},
    ],
    "coffee_shops": [
        {"name": "瑞幸咖啡(环球金融中心店)", "address": "浦东新区世纪大道100号B1层", "lng": 121.5040, "lat": 31.2355, "type": "luckin"},
        {"name": "星巴克(金茂大厦店)", "address": "浦东新区世纪大道88号1层", "lng": 121.5028, "lat": 31.2368, "type": "starbucks"},
        {"name": "瑞幸咖啡(上海中心店)", "address": "浦东新区银城中路501号B1", "lng": 121.5012, "lat": 31.2352, "type": "luckin"},
        {"name": "星巴克(国金中心店)", "address": "浦东新区世纪大道8号L2层", "lng": 121.4993, "lat": 31.2372, "type": "starbucks"},
        {"name": "瑞幸咖啡(东亚银行店)", "address": "浦东新区花园石桥路66号1层", "lng": 121.5012, "lat": 31.2382, "type": "luckin"},
        {"name": "星巴克(恒生银行大厦店)", "address": "浦东新区陆家嘴环路1000号1层", "lng": 121.5027, "lat": 31.2392, "type": "starbucks"},
        {"name": "瑞幸咖啡(花旗大厦店)", "address": "浦东新区花园石桥路33号B1", "lng": 121.5002, "lat": 31.2398, "type": "luckin"},
        {"name": "星巴克(震旦国际店)", "address": "浦东新区富城路99号1层", "lng": 121.5048, "lat": 31.2372, "type": "starbucks"},
        {"name": "瑞幸咖啡(太平金融店)", "address": "浦东新区银城中路488号B1", "lng": 121.5010, "lat": 31.2342, "type": "luckin"},
        {"name": "星巴克(中银大厦店)", "address": "浦东新区银城中路200号1层", "lng": 121.4990, "lat": 31.2338, "type": "starbucks"},
        {"name": "瑞幸咖啡(交银大厦店)", "address": "浦东新区银城中路188号B1", "lng": 121.4983, "lat": 31.2332, "type": "luckin"},
        {"name": "星巴克(汇丰大厦店)", "address": "浦东新区银城东路101号1层", "lng": 121.5022, "lat": 31.2348, "type": "starbucks"},
    ]
}


class CityRequest(BaseModel):
    city: str = "上海"


@app.get("/")
async def root():
    return {"message": "咖啡店铺地理分析API", "version": "1.0"}


@app.get("/api/poi/offices")
async def get_office_buildings(city: str = "上海", use_mock: bool = True):
    try:
        if use_mock:
            return {"data": MOCK_DATA["office_buildings"], "source": "mock"}
        
        collector = AmapPOICollector()
        offices = collector.collect_office_buildings(city)
        return {"data": offices, "source": "amap"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/poi/coffee-shops")
async def get_coffee_shops(city: str = "上海", use_mock: bool = True):
    try:
        if use_mock:
            return {"data": MOCK_DATA["coffee_shops"], "source": "mock"}
        
        collector = AmapPOICollector()
        coffees = collector.collect_coffee_shops(city)
        return {"data": coffees, "source": "amap"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analysis/hexagon")
async def get_hexagon_data(city: str = "上海", use_mock: bool = True):
    try:
        if use_mock:
            offices = MOCK_DATA["office_buildings"]
        else:
            collector = AmapPOICollector()
            offices = collector.collect_office_buildings(city)
        
        return {"data": offices}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analysis/overlap")
async def get_overlap_analysis(city: str = "上海", use_mock: bool = True):
    try:
        if use_mock:
            offices = MOCK_DATA["office_buildings"]
            coffees = MOCK_DATA["coffee_shops"]
        else:
            collector = AmapPOICollector()
            offices = collector.collect_office_buildings(city)
            coffees = collector.collect_coffee_shops(city)
        
        estimator = KDEEstimator()
        result = estimator.generate_analysis_report(coffees, offices)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/coffee/nearest-office")
async def get_nearest_office(coffee_lng: float, coffee_lat: float, city: str = "上海", use_mock: bool = True):
    try:
        if use_mock:
            offices = MOCK_DATA["office_buildings"]
        else:
            collector = AmapPOICollector()
            offices = collector.collect_office_buildings(city)
        
        collector = AmapPOICollector()
        coffee_shop = {"lng": coffee_lng, "lat": coffee_lat}
        result = collector.find_nearest_office(coffee_shop, offices)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
