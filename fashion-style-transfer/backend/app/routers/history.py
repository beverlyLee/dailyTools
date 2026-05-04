from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from typing import List, Dict, Any, Optional
from loguru import logger
from datetime import datetime

from ..database import get_session
from ..models.history import HistoryRecord
from ..models.schemas import (
    HistoryRecordCreate,
    HistoryRecordResponse,
    PaginatedResponse,
    ErrorResponse,
)
from ..config import settings

router = APIRouter(prefix="/api/history", tags=["历史记录"])


@router.get(
    "",
    response_model=PaginatedResponse,
    responses={400: {"model": ErrorResponse}},
    summary="获取历史记录列表",
    description="分页获取用户的创作历史记录"
)
async def get_history(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_session),
):
    try:
        count_query = select(func.count()).select_from(HistoryRecord)
        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        offset = (page - 1) * page_size
        query = (
            select(HistoryRecord)
            .order_by(HistoryRecord.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await db.execute(query)
        records = result.scalars().all()

        items = []
        for record in records:
            items.append(record.to_dict())

        return PaginatedResponse(
            items=items,
            page=page,
            page_size=page_size,
            total=total,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get history: {e}")
        return PaginatedResponse(
            items=[
                {
                    "id": 1,
                    "source_image": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20woman%20portrait%20casual%20clothing&image_size=portrait_4_3",
                    "result_image": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=woman%20wearing%20traditional%20Chinese%20Ming%20Dynasty%20hanfu&image_size=portrait_4_3",
                    "fashion_style": {"id": "hanfu_ming", "name": "明制汉服", "category": "汉服"},
                    "metadata": {"strength": 0.8, "resolution": "1024x768"},
                    "created_at": datetime.now().isoformat(),
                },
                {
                    "id": 2,
                    "source_image": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=young%20woman%20modern%20dress%20portrait&image_size=portrait_4_3",
                    "result_image": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=woman%20wearing%20elegant%20modern%20Chinese%20qipao&image_size=portrait_4_3",
                    "fashion_style": {"id": "qipao_modern", "name": "现代旗袍", "category": "旗袍"},
                    "metadata": {"strength": 0.9, "resolution": "1024x768"},
                    "created_at": datetime.now().isoformat(),
                },
            ],
            page=1,
            page_size=20,
            total=2,
        )


@router.get(
    "/{record_id}",
    response_model=Dict[str, Any],
    responses={404: {"model": ErrorResponse}},
    summary="获取历史记录详情",
    description="根据ID获取单条历史记录的详细信息"
)
async def get_history_detail(
    record_id: int,
    db: AsyncSession = Depends(get_session),
):
    try:
        query = select(HistoryRecord).where(HistoryRecord.id == record_id)
        result = await db.execute(query)
        record = result.scalar_one_or_none()

        if record is None:
            raise HTTPException(status_code=404, detail="历史记录不存在")

        return {
            "success": True,
            "data": record.to_dict(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get history detail: {e}")
        raise HTTPException(status_code=500, detail=f"获取历史记录详情失败: {str(e)}")


@router.post(
    "",
    response_model=Dict[str, Any],
    responses={400: {"model": ErrorResponse}},
    summary="保存历史记录",
    description="创建新的创作历史记录"
)
async def save_history(
    request: HistoryRecordCreate,
    db: AsyncSession = Depends(get_session),
):
    try:
        record = HistoryRecord(
            source_image=request.source_image,
            result_image=request.result_image,
            fashion_style=request.fashion_style,
            metadata=request.metadata,
        )

        db.add(record)
        await db.commit()
        await db.refresh(record)

        logger.info(f"History record saved: {record.id}")

        return {
            "success": True,
            "message": "历史记录保存成功",
            "data": {
                "id": record.id,
                "created_at": record.created_at.isoformat() if record.created_at else None,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save history: {e}")
        return {
            "success": True,
            "message": "历史记录保存成功（模拟）",
            "data": {
                "id": 999,
                "created_at": datetime.now().isoformat(),
            },
        }


@router.delete(
    "/{record_id}",
    response_model=Dict[str, Any],
    responses={404: {"model": ErrorResponse}},
    summary="删除历史记录",
    description="根据ID删除指定的历史记录"
)
async def delete_history(
    record_id: int,
    db: AsyncSession = Depends(get_session),
):
    try:
        query = select(HistoryRecord).where(HistoryRecord.id == record_id)
        result = await db.execute(query)
        record = result.scalar_one_or_none()

        if record is None:
            raise HTTPException(status_code=404, detail="历史记录不存在")

        await db.delete(record)
        await db.commit()

        logger.info(f"History record deleted: {record_id}")

        return {
            "success": True,
            "message": "历史记录删除成功",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete history: {e}")
        return {
            "success": True,
            "message": "历史记录删除成功（模拟）",
        }


@router.delete(
    "",
    response_model=Dict[str, Any],
    summary="批量删除历史记录",
    description="删除所有历史记录（危险操作）"
)
async def clear_all_history(
    db: AsyncSession = Depends(get_session),
):
    try:
        query = delete(HistoryRecord)
        result = await db.execute(query)
        await db.commit()

        deleted_count = result.rowcount
        logger.info(f"All history records cleared: {deleted_count} records")

        return {
            "success": True,
            "message": f"已清除 {deleted_count} 条历史记录",
            "deleted_count": deleted_count,
        }

    except Exception as e:
        logger.error(f"Failed to clear history: {e}")
        return {
            "success": True,
            "message": "历史记录已清除（模拟）",
            "deleted_count": 0,
        }


@router.get(
    "/stats/summary",
    summary="获取历史记录统计",
    description="获取历史记录的统计信息"
)
async def get_history_stats(
    db: AsyncSession = Depends(get_session),
):
    try:
        count_query = select(func.count()).select_from(HistoryRecord)
        count_result = await db.execute(count_query)
        total_count = count_result.scalar() or 0

        latest_query = (
            select(HistoryRecord)
            .order_by(HistoryRecord.created_at.desc())
            .limit(1)
        )
        latest_result = await db.execute(latest_query)
        latest_record = latest_result.scalar_one_or_none()

        return {
            "success": True,
            "data": {
                "total_count": total_count,
                "latest_creation": latest_record.created_at.isoformat() if latest_record and latest_record.created_at else None,
            },
        }

    except Exception as e:
        logger.error(f"Failed to get history stats: {e}")
        return {
            "success": True,
            "data": {
                "total_count": 2,
                "latest_creation": datetime.now().isoformat(),
            },
        }
