from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from src.database import db
from config.settings import settings

app = FastAPI(
    title="白酒市场监控API",
    description="监控京东/天猫白酒价格和评论情感分析",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Product(BaseModel):
    id: int
    platform: str
    name: str
    url: Optional[str]
    sku: Optional[str]


class PriceHistory(BaseModel):
    price: float
    source_type: str
    time: str


class SentimentStats(BaseModel):
    avg_sentiment: float
    avg_taste: float
    avg_packaging: float
    avg_logistics: float
    counterfeit_count: int
    total_comments: int


class DashboardData(BaseModel):
    product: Product
    price_history: List[PriceHistory]
    sentiment_stats: SentimentStats


@app.get("/")
async def root():
    return {
        "message": "白酒市场监控API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/api/products", response_model=Dict[str, List[Product]])
async def list_products():
    products = db.get_all_products()
    return {"products": products}


@app.get("/api/products/{product_id}/price-history")
async def price_history(product_id: int, limit: int = 100, source_type: str = None):
    history = db.get_price_history(product_id, limit, source_type)
    return {"history": history}


@app.get("/api/products/{product_id}/sentiment-stats", response_model=Dict[str, SentimentStats])
async def sentiment_stats(product_id: int, limit: int = 100, source_type: str = None):
    stats = db.get_sentiment_stats(product_id, limit, source_type)
    return {"stats": stats}


@app.get("/api/products/{product_id}/dashboard-data")
async def dashboard_data(product_id: int, limit: int = 100):
    products = db.get_all_products()
    product = next((p for p in products if p["id"] == product_id), None)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    price_history = db.get_price_history(product_id, limit)
    sentiment_stats = db.get_sentiment_stats(product_id, limit)

    price_history.reverse()

    return {
        "product": product,
        "price_history": price_history,
        "sentiment_stats": sentiment_stats
    }


@app.get("/api/products/{product_id}/latest-price")
async def latest_price(product_id: int):
    price = db.get_latest_price(product_id)
    if not price:
        raise HTTPException(status_code=404, detail="Price data not found")
    return {"price": price}


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "use_mock_data": settings.USE_MOCK_DATA,
        "crawler_interval": settings.CRAWLER_INTERVAL
    }
