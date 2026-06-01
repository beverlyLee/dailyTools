#!/usr/bin/env python3
"""
开发者发际线焦虑分析器 - FastAPI主服务
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional

from src.crawler import V2EXSpider
from src.nlp import TechEntityRecognizer
from src.analytics import HairlineAnalyzer
from src.ai import RoastGenerator

app = FastAPI(
    title="开发者发际线焦虑分析器",
    description="分析V2EX/掘金社区帖子，关联技术栈与发际线提及频率",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

v2ex_spider = V2EXSpider()
recognizer = TechEntityRecognizer()
analyzer = HairlineAnalyzer()
roast_gen = RoastGenerator()


class StatsResponse(BaseModel):
    stats: Dict[str, Dict]
    ranking: List[Dict]
    summary: Dict


class RoastResponse(BaseModel):
    language: str
    risk_score: float
    dissuasion: str


class FetchResponse(BaseModel):
    posts_analyzed: int
    stats: Dict[str, Dict]
    ranking: List[Dict]
    summary: Dict


@app.get("/")
async def root():
    """根路径 - 欢迎信息"""
    return {
        "message": "开发者发际线焦虑分析器 API",
        "version": "1.0.0",
        "endpoints": {
            "/api/health": "健康检查",
            "/api/stats": "获取发际线统计数据",
            "/api/fetch": "抓取并分析最新帖子",
            "/api/roast/{language}": "获取指定语言的AI劝退文案"
        }
    }


@app.get("/api/health")
async def health_check():
    """健康检查接口"""
    return {
        "status": "ok",
        "service": "hairline-analyzer"
    }


@app.get("/api/stats", response_model=StatsResponse)
async def get_hairline_stats():
    """
    获取发际线统计数据
    
    返回模拟的统计数据和排名
    """
    stats = analyzer.generate_mock_data()
    ranking = analyzer.get_ranking(stats)
    summary = analyzer.get_summary(stats)
    
    return {
        "stats": stats,
        "ranking": ranking,
        "summary": summary
    }


@app.get("/api/fetch", response_model=FetchResponse)
async def fetch_and_analyze(keywords: Optional[str] = None, limit: int = 20):
    """
    抓取并分析最新帖子
    
    Args:
        keywords: 搜索关键词，逗号分隔
        limit: 每个关键词最多返回的帖子数
    """
    keyword_list = keywords.split(',') if keywords else None
    
    v2ex_posts = v2ex_spider.search_posts(keywords=keyword_list, limit=limit)
    
    all_posts = v2ex_posts
    analyzed_posts = recognizer.analyze_posts(all_posts)
    
    stats = analyzer.calculate_hairline_risk(analyzed_posts)
    
    if not stats:
        stats = analyzer.generate_mock_data()
    
    ranking = analyzer.get_ranking(stats)
    summary = analyzer.get_summary(stats)
    
    return {
        "posts_analyzed": len(analyzed_posts),
        "stats": stats,
        "ranking": ranking,
        "summary": summary
    }


@app.get("/api/roast/{language}", response_model=RoastResponse)
async def get_roast(language: str):
    """
    获取指定编程语言的AI劝退文案
    
    Args:
        language: 编程语言名称 (如: Java, Python, PHP, Go, JavaScript)
    """
    stats = analyzer.generate_mock_data()
    
    if language not in stats:
        raise HTTPException(
            status_code=404,
            detail=f"不支持的编程语言: {language}，请选择: {', '.join(stats.keys())}"
        )
    
    risk_score = stats[language]['risk_score']
    dissuasion = roast_gen.generate_dissuasion(language, risk_score)
    
    return {
        "language": language,
        "risk_score": risk_score,
        "dissuasion": dissuasion
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
