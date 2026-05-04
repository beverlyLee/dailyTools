from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List, Dict
from sqlalchemy.ext.asyncio import AsyncSession

from ..services.search_service import search_service

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/")
async def search_notes(
    query: str = Query(..., description="搜索查询"),
    fields: Optional[str] = Query(default=None, description="要搜索的字段，用逗号分隔：title,content,tags"),
    limit: int = Query(default=50, ge=1, le=200, description="最大返回结果数")
):
    """
    全文搜索笔记
    :param query: 搜索关键词
    :param fields: 要搜索的字段，如 "title,content"，默认搜索所有字段
    :param limit: 返回结果数量限制
    """
    try:
        # 解析字段参数
        search_fields = None
        if fields:
            search_fields = [f.strip() for f in fields.split(',') if f.strip()]
        
        results = await search_service.search(query, search_fields, limit)
        
        return {
            "success": True,
            "data": {
                "query": query,
                "fields": search_fields or ["title", "content", "tags"],
                "count": len(results),
                "results": results
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/index/note")
async def index_single_note(
    path: str,
    content: Optional[str] = None
):
    """
    为单个笔记建立或更新索引
    :param path: 笔记文件路径
    :param content: 可选的内容，如果不提供则从文件读取
    """
    try:
        result = await search_service.index_note(path, content)
        
        return {
            "success": True,
            "data": result
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/index/all")
async def index_all_notes():
    """为所有笔记建立索引"""
    try:
        result = await search_service.index_all_notes()
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/index/note")
async def remove_note_from_index(path: str):
    """
    从索引中删除笔记
    :param path: 笔记文件路径
    """
    try:
        result = await search_service.delete_from_index(path)
        
        return {
            "success": True,
            "data": {
                "path": path,
                "removed": result
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_index_stats():
    """获取索引统计信息"""
    try:
        stats = search_service.get_index_stats()
        
        return {
            "success": True,
            "data": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggest")
async def get_search_suggestions(
    query: str = Query(..., description="部分搜索查询"),
    limit: int = Query(default=10, ge=1, le=50)
):
    """
    获取搜索建议（基于标题匹配）
    :param query: 部分搜索词
    :param limit: 建议数量
    """
    try:
        # 先搜索标题字段
        results = await search_service.search(query, search_fields=["title"], limit=limit)
        
        # 提取标题和路径作为建议
        suggestions = []
        for result in results:
            suggestions.append({
                "title": result["title"],
                "path": result["path"],
                "type": "note"
            })
        
        return {
            "success": True,
            "data": {
                "query": query,
                "suggestions": suggestions
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
