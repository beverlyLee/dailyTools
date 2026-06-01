from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
from dotenv import load_dotenv
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

from src.asr.dialect_classifier import classifier
from src.geo.region_mapper import mapper, Anchor, Product
from data.mock_data import (
    get_mock_anchors, 
    get_mock_products, 
    get_mock_subtitles, 
    get_mock_sales_data
)
from data.real_data import (
    get_real_anchors,
    get_real_products,
    get_real_subtitles,
    get_real_sales_data
)

app = FastAPI(title="直播方言分析系统")

app.mount("/static", StaticFiles(directory="static"), name="static")


class ClassifyRequest(BaseModel):
    text: str


class ClassifyResponse(BaseModel):
    dialect: str
    confidence: float


DATA_MODE = os.getenv("DATA_MODE", "mock")


def get_data_sources(mode: str = None):
    current_mode = mode or DATA_MODE
    if current_mode == "real":
        return get_real_anchors, get_real_products, get_real_subtitles, get_real_sales_data
    return get_mock_anchors, get_mock_products, get_mock_subtitles, get_mock_sales_data


@app.get("/")
async def root():
    return FileResponse("static/index.html")


@app.get("/api/config")
async def get_config():
    return {
        "gaode_api_key": os.getenv("GAODE_API_KEY", ""),
        "data_mode": DATA_MODE
    }


@app.get("/api/anchors")
async def get_anchors(
    platform: Optional[str] = Query(None, description="按平台筛选: douyin / kuaishou"),
    mode: Optional[str] = Query(None, description="数据模式: mock / real")
):
    get_anchors_fn, _, _, _ = get_data_sources(mode)
    anchors = get_anchors_fn()
    
    if platform:
        platform_map = {"douyin": "抖音", "kuaishou": "快手"}
        platform_name = platform_map.get(platform, platform)
        anchors = [a for a in anchors if a.platform == platform_name]
    
    return [mapper.map_anchor_to_dialect(anchor) for anchor in anchors]


@app.get("/api/products")
async def get_products(mode: Optional[str] = Query(None)):
    _, get_products_fn, _, _ = get_data_sources(mode)
    products = get_products_fn()
    results = []
    for p in products:
        coords = mapper.get_product_origin_coords(p)
        results.append({
            "id": p.id,
            "name": p.name,
            "origin": p.origin,
            "category": p.category,
            "coords": coords
        })
    return results


@app.get("/api/flow-data")
async def get_flow_data(
    platform: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None, description="排序: sales / none"),
    mode: Optional[str] = Query(None)
):
    get_anchors_fn, get_products_fn, _, get_sales_fn = get_data_sources(mode)
    
    anchors = {a.id: a for a in get_anchors_fn()}
    products = {p.id: p for p in get_products_fn()}
    sales_data = get_sales_fn()
    
    flows = []
    for idx, sale in enumerate(sales_data):
        anchor = anchors.get(sale["anchor_id"])
        product = products.get(sale["product_id"])
        if anchor and product:
            if platform:
                platform_map = {"douyin": "抖音", "kuaishou": "快手"}
                platform_name = platform_map.get(platform, platform)
                if anchor.platform != platform_name:
                    continue
            
            flow = mapper.create_flow_data(anchor, product, sale["sales_volume"], idx)
            flow["anchor_id"] = anchor.id
            flow["product_id"] = product.id
            flows.append(flow)
    
    if sort_by == "sales":
        flows.sort(key=lambda x: x["value"], reverse=True)
    
    return flows


@app.get("/api/subtitles")
async def get_subtitles(mode: Optional[str] = Query(None)):
    get_anchors_fn, _, get_subtitles_fn, _ = get_data_sources(mode)
    anchors = {a.id: a for a in get_anchors_fn()}
    subtitles = get_subtitles_fn()
    
    results = []
    for sub in subtitles:
        dialect, confidence = classifier.classify_text(sub["text"])
        anchor = anchors.get(sub["anchor_id"])
        results.append({
            "anchor_id": sub["anchor_id"],
            "anchor_name": anchor.name if anchor else "未知",
            "text": sub["text"],
            "dialect": dialect,
            "confidence": round(confidence, 2),
            "platform": anchor.platform if anchor else "未知"
        })
    return results


@app.post("/api/classify", response_model=ClassifyResponse)
async def classify_dialect(request: ClassifyRequest):
    dialect, confidence = classifier.classify_text(request.text)
    return ClassifyResponse(dialect=dialect, confidence=round(confidence, 2))


@app.get("/api/dialect-stats")
async def get_dialect_stats(
    platform: Optional[str] = Query(None),
    mode: Optional[str] = Query(None)
):
    platform_map = {"douyin": "抖音", "kuaishou": "快手"}
    get_anchors_fn, _, get_subtitles_fn, get_sales_fn = get_data_sources(mode)
    anchors = {a.id: a for a in get_anchors_fn()}
    subtitles = get_subtitles_fn()
    
    platform_name = platform_map.get(platform, platform) if platform else None
    if platform:
        subtitles = [s for s in subtitles if anchors.get(s["anchor_id"]) and anchors[s["anchor_id"]].platform == platform_name]
    
    dialect_counts = {}
    for sub in subtitles:
        dialect, _ = classifier.classify_text(sub["text"])
        dialect_counts[dialect] = dialect_counts.get(dialect, 0) + 1
    
    total_sales = 0
    sales_data = get_sales_fn()
    for sale in sales_data:
        anchor = anchors.get(sale["anchor_id"])
        if anchor and (not platform or anchor.platform == platform_name):
            total_sales += sale["sales_volume"]
    
    return {
        "total_anchors": len(subtitles),
        "total_sales": total_sales,
        "dialect_distribution": dialect_counts
    }


@app.get("/api/anchor-detail/{anchor_id}")
async def get_anchor_detail(
    anchor_id: str,
    mode: Optional[str] = Query(None)
):
    get_anchors_fn, get_products_fn, get_subtitles_fn, get_sales_fn = get_data_sources(mode)
    
    anchors = {a.id: a for a in get_anchors_fn()}
    anchor = anchors.get(anchor_id)
    
    if not anchor:
        raise HTTPException(status_code=404, detail="主播未找到")
    
    sales_data = get_sales_fn()
    products = {p.id: p for p in get_products_fn()}
    subtitles = {s["anchor_id"]: s["text"] for s in get_subtitles_fn()}
    
    anchor_sales = [s for s in sales_data if s["anchor_id"] == anchor_id]
    products_sold = []
    total_sales = 0
    
    for sale in anchor_sales:
        product = products.get(sale["product_id"])
        if product:
            products_sold.append({
                "product_id": product.id,
                "product_name": product.name,
                "origin": product.origin,
                "sales_volume": sale["sales_volume"]
            })
            total_sales += sale["sales_volume"]
    
    dialect, confidence = classifier.classify_text(subtitles.get(anchor_id, ""))
    
    anchor_data = mapper.map_anchor_to_dialect(anchor)
    
    return {
        **anchor_data,
        "followers": anchor.followers,
        "dialect": dialect,
        "dialect_confidence": confidence,
        "total_sales": total_sales,
        "products_count": len(products_sold),
        "products": products_sold,
        "subtitle_sample": subtitles.get(anchor_id, "")
    }


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host=host, port=port)
