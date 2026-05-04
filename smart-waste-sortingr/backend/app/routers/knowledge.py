from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
import logging

from app.services import KnowledgeService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/knowledge",
    tags=["knowledge"]
)

knowledge_service = KnowledgeService()


@router.get("/categories")
async def get_all_categories():
    categories = knowledge_service.get_all_categories()
    return JSONResponse(content={
        "success": True,
        "data": categories
    })


@router.get("/categories/{category_name}")
async def get_category_detail(category_name: str):
    category_info = knowledge_service.get_category_info(category_name)
    
    if not category_info:
        raise HTTPException(
            status_code=404,
            detail=f"Category '{category_name}' not found"
        )
    
    return JSONResponse(content={
        "success": True,
        "data": {
            "name": category_name,
            **category_info
        }
    })


@router.get("/items/{item_name}")
async def get_item_detail(item_name: str):
    item_info = knowledge_service.get_item_info(item_name)
    
    if not item_info:
        raise HTTPException(
            status_code=404,
            detail=f"Item '{item_name}' not found in knowledge base"
        )
    
    category = item_info.get("category")
    disposal_guide = None
    
    if category:
        disposal_guide = knowledge_service.get_disposal_guide(item_name, category)
    
    return JSONResponse(content={
        "success": True,
        "data": {
            "item_name": item_name,
            "item_info": item_info,
            "disposal_guide": disposal_guide
        }
    })


@router.get("/search")
async def search_knowledge(
    keyword: str = Query(..., min_length=1, description="Search keyword")
):
    keyword_lower = keyword.lower()
    
    categories = knowledge_service.get_all_categories()
    matched_categories = []
    matched_items = []
    
    for cat in categories:
        if keyword_lower in cat["name"].lower() or \
           keyword_lower in cat.get("description", "").lower():
            matched_categories.append(cat)
    
    kb = knowledge_service._knowledge_base
    if kb and "items" in kb:
        for item_name, item_info in kb["items"].items():
            if keyword_lower in item_name.lower():
                matched_items.append({
                    "name": item_name,
                    **item_info
                })
    
    return JSONResponse(content={
        "success": True,
        "data": {
            "keyword": keyword,
            "matched_categories": matched_categories,
            "matched_items": matched_items
        }
    })
