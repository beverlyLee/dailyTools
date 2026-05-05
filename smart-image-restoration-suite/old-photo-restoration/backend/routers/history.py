from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
import logging

from database import get_db
import schemas
from models import HistoryItem

router = APIRouter(prefix="/api/history", tags=["历史记录"])

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@router.get("/list", response_model=schemas.HistoryListResponse)
def get_history_list(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(8, ge=1, le=100, description="每页数量"),
    model: Optional[str] = Query(None, description="按模型过滤"),
    scale: Optional[int] = Query(None, description="按放大倍数过滤"),
    db: Session = Depends(get_db)
):
    """
    获取历史记录列表
    - 支持分页
    - 支持按模型和放大倍数过滤
    """
    try:
        # 构建查询
        query = db.query(HistoryItem)
        
        if model:
            query = query.filter(HistoryItem.model == model)
        if scale:
            query = query.filter(HistoryItem.scale == scale)
        
        # 获取总数
        total = query.count()
        
        # 分页查询
        items = query.order_by(HistoryItem.created_at.desc()).offset((page - 1) * size).limit(size).all()
        
        logger.info(f"获取历史记录: page={page}, size={size}, total={total}")
        
        return schemas.HistoryListResponse(
            success=True,
            items=[schemas.HistoryItemResponse.from_orm(item) for item in items],
            total=total,
            page=page,
            size=size
        )
        
    except Exception as e:
        logger.error(f"获取历史记录失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取历史记录失败: {str(e)}")


@router.get("/{item_id}", response_model=schemas.HistoryItemResponse)
def get_history_item(
    item_id: int,
    db: Session = Depends(get_db)
):
    """
    获取单条历史记录详情
    """
    try:
        item = db.query(HistoryItem).filter(HistoryItem.id == item_id).first()
        
        if not item:
            raise HTTPException(status_code=404, detail=f"历史记录不存在: ID={item_id}")
        
        logger.info(f"获取历史记录详情: ID={item_id}")
        
        return schemas.HistoryItemResponse.from_orm(item)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取历史记录详情失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取历史记录详情失败: {str(e)}")


@router.post("/save", response_model=schemas.HistoryItemResponse)
def save_history_item(
    item: schemas.HistoryItemCreate,
    db: Session = Depends(get_db)
):
    """
    保存历史记录
    """
    try:
        history_item = HistoryItem(
            source_image=item.source_image,
            result_image=item.result_image,
            model=item.model,
            scale=item.scale,
            enable_inpainting=item.enable_inpainting,
            enable_colorization=item.enable_colorization,
            mask_data=item.mask_data
        )
        
        db.add(history_item)
        db.commit()
        db.refresh(history_item)
        
        logger.info(f"保存历史记录: ID={history_item.id}")
        
        return schemas.HistoryItemResponse.from_orm(history_item)
        
    except Exception as e:
        db.rollback()
        logger.error(f"保存历史记录失败: {e}")
        raise HTTPException(status_code=500, detail=f"保存历史记录失败: {str(e)}")


@router.delete("/{item_id}")
def delete_history_item(
    item_id: int,
    db: Session = Depends(get_db)
):
    """
    删除历史记录
    """
    try:
        item = db.query(HistoryItem).filter(HistoryItem.id == item_id).first()
        
        if not item:
            raise HTTPException(status_code=404, detail=f"历史记录不存在: ID={item_id}")
        
        db.delete(item)
        db.commit()
        
        logger.info(f"删除历史记录: ID={item_id}")
        
        return {
            "success": True,
            "message": f"历史记录已删除: ID={item_id}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"删除历史记录失败: {e}")
        raise HTTPException(status_code=500, detail=f"删除历史记录失败: {str(e)}")


@router.delete("/")
def clear_all_history(
    db: Session = Depends(get_db)
):
    """
    清空所有历史记录
    """
    try:
        count = db.query(HistoryItem).count()
        
        db.query(HistoryItem).delete()
        db.commit()
        
        logger.info(f"清空所有历史记录: 共删除 {count} 条")
        
        return {
            "success": True,
            "message": f"已清空所有历史记录，共删除 {count} 条"
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"清空历史记录失败: {e}")
        raise HTTPException(status_code=500, detail=f"清空历史记录失败: {str(e)}")
