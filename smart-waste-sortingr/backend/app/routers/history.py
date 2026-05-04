from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import logging

from app.database import get_db
from app.models import ClassificationHistory

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/history",
    tags=["history"]
)


class ClassificationHistoryResponse(BaseModel):
    id: int
    predicted_item: str
    waste_category: str
    confidence: float
    disposal_guide: Optional[str]
    created_at: Optional[datetime]
    
    class Config:
        from_attributes = True


@router.get("/")
async def get_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ClassificationHistory)
    
    if category:
        query = query.filter(ClassificationHistory.waste_category == category)
    
    total = query.count()
    
    records = query.order_by(
        ClassificationHistory.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    response = {
        "success": True,
        "data": {
            "total": total,
            "skip": skip,
            "limit": limit,
            "records": [
                {
                    "id": r.id,
                    "predicted_item": r.predicted_item,
                    "waste_category": r.waste_category,
                    "confidence": round(r.confidence * 100, 2),
                    "disposal_guide": r.disposal_guide,
                    "created_at": r.created_at.isoformat() if r.created_at else None
                }
                for r in records
            ]
        }
    }
    
    return JSONResponse(content=response)


@router.get("/{history_id}")
async def get_history_detail(
    history_id: int,
    db: Session = Depends(get_db)
):
    record = db.query(ClassificationHistory).filter(
        ClassificationHistory.id == history_id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="History record not found")
    
    response = {
        "success": True,
        "data": {
            "id": record.id,
            "predicted_item": record.predicted_item,
            "waste_category": record.waste_category,
            "confidence": round(record.confidence * 100, 2),
            "disposal_guide": record.disposal_guide,
            "created_at": record.created_at.isoformat() if record.created_at else None
        }
    }
    
    return JSONResponse(content=response)


@router.delete("/{history_id}")
async def delete_history(
    history_id: int,
    db: Session = Depends(get_db)
):
    record = db.query(ClassificationHistory).filter(
        ClassificationHistory.id == history_id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="History record not found")
    
    try:
        db.delete(record)
        db.commit()
        
        return JSONResponse(content={
            "success": True,
            "message": "History record deleted successfully"
        })
    except Exception as e:
        logger.error(f"Failed to delete history: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete history record")


@router.get("/stats/categories")
async def get_category_stats(
    db: Session = Depends(get_db)
):
    from sqlalchemy import func
    
    stats = db.query(
        ClassificationHistory.waste_category,
        func.count(ClassificationHistory.id).label("count")
    ).group_by(
        ClassificationHistory.waste_category
    ).all()
    
    result = {}
    for category, count in stats:
        result[category] = count
    
    return JSONResponse(content={
        "success": True,
        "data": {
            "category_counts": result
        }
    })
