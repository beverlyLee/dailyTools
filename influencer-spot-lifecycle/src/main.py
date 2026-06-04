import asyncio
import json
import logging
import math
import re
from pathlib import Path
from typing import Optional, Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.social.xiaohongshu_spider import XiaohongshuSpider, generate_demo_data
from src.social.douyin_spider import DouyinSpider, generate_douyin_demo_data
from src.time_series.popularity_timeline import (
    build_timeline,
    build_multi_keyword_timeline,
    compute_rolling_metrics,
    compute_popularity_score,
)
from src.modeling.lifecycle_predictor import LifecyclePredictor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Influencer Spot Lifecycle Tracker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

predictor = LifecyclePredictor()

_cached_data: dict[str, list[dict]] = {}
_cached_timelines: dict[str, dict] = {}
_cached_results: dict[str, dict] = {}


def is_valid_keyword(keyword: str) -> tuple[bool, str]:
    if not keyword or not keyword.strip():
        return False, "关键词不能为空"

    kw = keyword.strip()

    if len(kw) < 2:
        return False, "关键词长度至少需要2个字符"

    if len(kw) > 50:
        return False, "关键词长度不能超过50个字符"

    valid_pattern = re.compile(
        r"^[\u4e00-\u9fa5a-zA-Z0-9\s\-_·.()（）【】《》\"\"''，,。！!？?]*$"
    )
    if not valid_pattern.match(kw):
        return False, "关键词包含无效字符，请输入有效的中文、英文或数字"

    chinese_chars = len(re.findall(r"[\u4e00-\u9fa5]", kw))
    ascii_chars = len(re.findall(r"[a-zA-Z0-9]", kw))
    if chinese_chars == 0 and ascii_chars < 2:
        return False, "关键词无效，请输入有意义的地点名称"

    if kw.isdigit() and len(kw) < 4:
        return False, "纯数字关键词过短，请输入地点名称"

    return True, "valid"


class CrawlRequest(BaseModel):
    keyword: str
    use_demo: bool = True
    days: int = 90
    platform: str = "xiaohongshu"


class CompareRequest(BaseModel):
    keywords: list[str]
    use_demo: bool = True
    days: int = 90
    platform: str = "xiaohongshu"


def _sanitize_for_json(obj: Any) -> Any:
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return 0.0
        return round(obj, 8)
    elif isinstance(obj, dict):
        return {k: _sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_sanitize_for_json(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(_sanitize_for_json(item) for item in obj)
    return obj


def _get_demo_data(keyword: str, days: int, platform: str) -> list[dict]:
    if platform == "douyin":
        return generate_douyin_demo_data(keyword, days=days)
    return generate_demo_data(keyword, days=days)


def _process_keyword(keyword: str, notes: list[dict]) -> dict:
    timeline = build_timeline(notes)
    timeline = compute_rolling_metrics(timeline)
    timeline = compute_popularity_score(timeline)

    result = predictor.fit(timeline, keyword)

    timeline_json = timeline.to_dict(orient="list")
    for key in timeline_json:
        vals = timeline_json[key]
        timeline_json[key] = [
            v.isoformat() if hasattr(v, "isoformat") else v
            for v in vals
        ]

    timeline_json = _sanitize_for_json(timeline_json)

    result_dict = None
    if result:
        result_dict = {
            "keyword": result.keyword,
            "L": result.L,
            "k": result.k,
            "x0": result.x0,
            "peak_day": result.peak_day,
            "growth_rate_at_peak": result.growth_rate_at_peak,
            "decay_rate": result.decay_rate,
            "r_squared": result.r_squared,
            "total_observations": result.total_observations,
            "fitted_values": result.fitted_values,
            "phases": [
                {"name": p.name, "start_day": p.start_day, "end_day": p.end_day, "description": p.description}
                for p in result.phases
            ],
        }
        result_dict = _sanitize_for_json(result_dict)

    return {
        "timeline": timeline_json,
        "lifecycle": result_dict,
    }


@app.get("/")
async def root():
    return {"message": "Influencer Spot Lifecycle Tracker API", "version": "1.0.0"}


@app.post("/api/crawl")
async def crawl_keyword(request: CrawlRequest):
    keyword = request.keyword
    platform = request.platform.lower()

    valid, reason = is_valid_keyword(keyword)
    if not valid:
        raise HTTPException(status_code=400, detail=f"无效关键词: {reason}")

    cache_key = f"{platform}:{keyword}"

    if cache_key in _cached_data and request.use_demo:
        notes = _cached_data[cache_key]
    elif request.use_demo:
        notes = _get_demo_data(keyword, days=request.days, platform=platform)
        _cached_data[cache_key] = notes
    else:
        if platform == "douyin":
            spider = DouyinSpider(headless=True)
        else:
            spider = XiaohongshuSpider(headless=True)

        notes_raw = await spider.search(keyword)
        notes = [n.to_dict() if hasattr(n, "to_dict") else n for n in notes_raw]
        _cached_data[cache_key] = notes

    if not notes:
        raise HTTPException(status_code=404, detail=f"未找到关于 '{keyword}' 的相关数据")

    processed = _process_keyword(keyword, notes)
    _cached_timelines[keyword] = processed["timeline"]
    _cached_results[keyword] = processed["lifecycle"]

    safe_keyword = keyword.replace("/", "_").replace("\\", "_")
    data_file = DATA_DIR / f"{safe_keyword}.json"
    with open(data_file, "w", encoding="utf-8") as f:
        json.dump({"notes": notes, "processed": processed}, f, ensure_ascii=False, default=str)

    return _sanitize_for_json({
        "keyword": keyword,
        "platform": platform,
        "notes_count": len(notes),
        "timeline": processed["timeline"],
        "lifecycle": processed["lifecycle"],
    })


@app.post("/api/compare")
async def compare_keywords(request: CompareRequest):
    platform = request.platform.lower()
    results = {}
    errors = {}

    valid_keywords = []
    for keyword in request.keywords:
        valid, reason = is_valid_keyword(keyword)
        if not valid:
            errors[keyword] = reason
        else:
            valid_keywords.append(keyword)

    if not valid_keywords:
        raise HTTPException(status_code=400, detail=f"所有关键词均无效: {errors}")

    for keyword in valid_keywords:
        cache_key = f"{platform}:{keyword}"
        if cache_key not in _cached_data:
            if request.use_demo:
                notes = _get_demo_data(keyword, days=request.days, platform=platform)
            else:
                if platform == "douyin":
                    spider = DouyinSpider(headless=True)
                else:
                    spider = XiaohongshuSpider(headless=True)
                notes_raw = await spider.search(keyword)
                notes = [n.to_dict() if hasattr(n, "to_dict") else n for n in notes_raw]
            _cached_data[cache_key] = notes
        else:
            notes = _cached_data[cache_key]

        if not notes:
            errors[keyword] = "未找到相关数据"
            continue

        processed = _process_keyword(keyword, notes)
        _cached_timelines[keyword] = processed["timeline"]
        _cached_results[keyword] = processed["lifecycle"]
        results[keyword] = processed

    comparison = predictor.compare_keywords()

    return _sanitize_for_json({
        "keywords": valid_keywords,
        "platform": platform,
        "results": results,
        "comparison": comparison,
        "errors": errors,
    })


@app.get("/api/timeline/{keyword}")
async def get_timeline(keyword: str):
    if keyword in _cached_timelines:
        return _sanitize_for_json({"keyword": keyword, "timeline": _cached_timelines[keyword]})

    for cache_key, notes in _cached_data.items():
        if cache_key.endswith(f":{keyword}"):
            processed = _process_keyword(keyword, notes)
            _cached_timelines[keyword] = processed["timeline"]
            return _sanitize_for_json({"keyword": keyword, "timeline": processed["timeline"]})

    raise HTTPException(status_code=404, detail=f"No data found for keyword: {keyword}")


@app.get("/api/lifecycle/{keyword}")
async def get_lifecycle(keyword: str):
    if keyword in _cached_results:
        return _sanitize_for_json({"keyword": keyword, "lifecycle": _cached_results[keyword]})

    raise HTTPException(status_code=404, detail=f"No lifecycle data for keyword: {keyword}")


@app.get("/api/predict/{keyword}")
async def predict_future(keyword: str, days: int = Query(default=30, ge=1, le=180)):
    found = False
    for cache_key, notes in _cached_data.items():
        if cache_key.endswith(f":{keyword}"):
            if keyword not in predictor.results:
                _process_keyword(keyword, notes)
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail=f"No data found for keyword: {keyword}")

    future = predictor.predict_future(keyword, future_days=days)
    if future is None:
        raise HTTPException(status_code=500, detail="Prediction failed")

    return _sanitize_for_json({
        "keyword": keyword,
        "future_days": days,
        "predicted_values": future,
    })


@app.get("/api/keywords")
async def list_keywords():
    keywords = []
    for cache_key in _cached_data.keys():
        if ":" in cache_key:
            _, kw = cache_key.split(":", 1)
            if kw not in keywords:
                keywords.append(kw)
    return {
        "keywords": keywords,
        "count": len(keywords),
    }


@app.delete("/api/cache/{keyword}")
async def clear_cache(keyword: str):
    keys_to_remove = [k for k in _cached_data.keys() if k.endswith(f":{keyword}")]
    for k in keys_to_remove:
        _cached_data.pop(k, None)
    _cached_timelines.pop(keyword, None)
    _cached_results.pop(keyword, None)
    predictor.results.pop(keyword, None)
    return {"message": f"Cache cleared for: {keyword}"}
