#!/usr/bin/env python3
"""
白酒市场监控系统 - 主启动文件
整合FastAPI后端和前端静态文件服务
"""

import os
import sys

# 添加项目根目录到Python路径
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# 导入项目模块
from src.database import db
from src.sentiment.comment_analyzer import analyze_comment
from config.settings import settings

# 创建FastAPI应用
app = FastAPI(
    title="白酒市场监控系统",
    description="监控京东/天猫白酒价格与评论情感分析",
    version="1.0.0"
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== API接口 ====================

@app.get("/")
async def root():
    """根路径 - 重定向到前端"""
    return {
        "message": "白酒市场监控系统",
        "version": "1.0.0",
        "frontend": "/index.html",
        "api_docs": "/docs"
    }

@app.get("/api/products")
async def list_products():
    """获取所有产品列表"""
    products = db.get_all_products()
    return {"products": products}

@app.get("/api/products/{product_id}/price-history")
async def price_history(product_id: int, limit: int = 100, source_type: str = None):
    """获取产品价格历史"""
    history = db.get_price_history(product_id, limit, source_type)
    return {"history": history}

@app.get("/api/products/{product_id}/sentiment-stats")
async def sentiment_stats(product_id: int, limit: int = 100, source_type: str = None):
    """获取产品情感统计"""
    stats = db.get_sentiment_stats(product_id, limit, source_type)
    return {"stats": stats}

@app.get("/api/products/{product_id}/dashboard-data")
async def dashboard_data(product_id: int, limit: int = 100):
    """获取仪表盘综合数据"""
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
    """获取最新价格"""
    price = db.get_latest_price(product_id)
    if not price:
        raise HTTPException(status_code=404, detail="Price data not found")
    return {"price": price}

@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "use_mock_data": settings.USE_MOCK_DATA,
        "crawler_interval": settings.CRAWLER_INTERVAL
    }

@app.get("/api/config")
async def get_config():
    """获取系统配置信息"""
    return {
        "use_mock_data": settings.USE_MOCK_DATA,
        "ark_configured": bool(settings.ARK_API_KEY and settings.ARK_API_KEY != "your_ark_api_key_here"),
        "crawler_jd_enabled": settings.CRAWLER_JD_ENABLED,
        "crawler_tm_enabled": settings.CRAWLER_TM_ENABLED,
        "crawler_interval": settings.CRAWLER_INTERVAL,
        "data_source_info": {
            "mock": "模拟数据（用于测试和演示）",
            "real": "真实电商平台数据",
            "ai": "AI情感分析结果",
            "rule": "规则引擎分析结果"
        }
    }

@app.post("/api/analyze-comment")
async def analyze_comment_endpoint(comment: dict):
    """分析单条评论情感"""
    result = analyze_comment(comment.get("text", ""))
    return {"result": result}

@app.get("/api/products/{product_id}/full-stats")
async def get_full_stats(product_id: int, limit: int = 100):
    """获取完整的统计数据，包含数据源信息"""
    products = db.get_all_products()
    product = next((p for p in products if p["id"] == product_id), None)
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    price_history = db.get_price_history(product_id, limit)
    sentiment_stats = db.get_sentiment_stats(product_id, limit)
    latest_price = db.get_latest_price(product_id)
    
    # 计算价格趋势
    price_trend = "stable"
    if len(price_history) >= 2:
        old_price = price_history[-1]["price"]
        new_price = price_history[0]["price"]
        if new_price < old_price * 0.95:
            price_trend = "down"
        elif new_price > old_price * 1.05:
            price_trend = "up"
    
    return {
        "product": product,
        "latest_price": latest_price,
        "price_history": price_history,
        "sentiment_stats": sentiment_stats,
        "price_trend": price_trend
    }

# ==================== 静态文件挂载 ====================

# 挂载前端目录
frontend_dir = os.path.join(PROJECT_ROOT, "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
    print(f"✅ 前端静态文件已挂载: {frontend_dir}")
else:
    print(f"⚠️  前端目录不存在: {frontend_dir}")

# ==================== 主函数 ====================

if __name__ == "__main__":
    print("=" * 50)
    print("  🍶 白酒市场监控系统启动中...")
    print("=" * 50)
    print(f"📂 项目根目录: {PROJECT_ROOT}")
    print(f"📊 前端仪表盘: http://{settings.API_HOST}:{settings.API_PORT}/index.html")
    print(f"📚 API文档: http://{settings.API_HOST}:{settings.API_PORT}/docs")
    print(f"🔧 配置: USE_MOCK_DATA={settings.USE_MOCK_DATA}")
    print("=" * 50)
    print()
    
    # 启动服务
    uvicorn.run(
        "server:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=False,
        log_level="info"
    )
