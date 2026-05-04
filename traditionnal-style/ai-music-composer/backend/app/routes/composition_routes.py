from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from ..models.models import get_db, Composition

router = APIRouter(prefix="/api/compositions", tags=["compositions"])


class CompositionCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    keywords: str
    folk_ratio: float = 0.5
    modern_ratio: float = 0.5
    midi_data: Optional[str] = None
    parent_id: Optional[int] = None


class CompositionUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    midi_data: Optional[str] = None
    folk_ratio: Optional[float] = None
    modern_ratio: Optional[float] = None


class CompositionResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    keywords: str
    folk_ratio: float
    modern_ratio: float
    midi_data: Optional[str]
    audio_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    is_public: int
    share_token: Optional[str]
    parent_id: Optional[int]
    
    class Config:
        from_attributes = True


@router.post("/", response_model=CompositionResponse)
def create_composition(
    request: CompositionCreateRequest,
    db: Session = Depends(get_db)
):
    composition = Composition(
        title=request.title,
        description=request.description,
        keywords=request.keywords,
        folk_ratio=request.folk_ratio,
        modern_ratio=request.modern_ratio,
        midi_data=request.midi_data,
        parent_id=request.parent_id
    )
    
    db.add(composition)
    db.commit()
    db.refresh(composition)
    
    return composition


@router.get("/", response_model=List[CompositionResponse])
def list_compositions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    is_public: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Composition)
    
    if is_public is not None:
        query = query.filter(Composition.is_public == 1 if is_public else 0)
    
    compositions = query.order_by(
        Composition.updated_at.desc()
    ).offset(skip).limit(limit).all()
    
    return compositions


@router.get("/{composition_id}", response_model=CompositionResponse)
def get_composition(
    composition_id: int,
    db: Session = Depends(get_db)
):
    composition = db.query(Composition).filter(
        Composition.id == composition_id
    ).first()
    
    if not composition:
        raise HTTPException(status_code=404, detail="作品不存在")
    
    return composition


@router.put("/{composition_id}", response_model=CompositionResponse)
def update_composition(
    composition_id: int,
    request: CompositionUpdateRequest,
    db: Session = Depends(get_db)
):
    composition = db.query(Composition).filter(
        Composition.id == composition_id
    ).first()
    
    if not composition:
        raise HTTPException(status_code=404, detail="作品不存在")
    
    update_data = request.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(composition, key, value)
    
    db.commit()
    db.refresh(composition)
    
    return composition


@router.delete("/{composition_id}")
def delete_composition(
    composition_id: int,
    db: Session = Depends(get_db)
):
    composition = db.query(Composition).filter(
        Composition.id == composition_id
    ).first()
    
    if not composition:
        raise HTTPException(status_code=404, detail="作品不存在")
    
    db.delete(composition)
    db.commit()
    
    return {"status": "success", "message": "作品已删除"}


@router.post("/{composition_id}/share")
def share_composition(
    composition_id: int,
    db: Session = Depends(get_db)
):
    composition = db.query(Composition).filter(
        Composition.id == composition_id
    ).first()
    
    if not composition:
        raise HTTPException(status_code=404, detail="作品不存在")
    
    if not composition.share_token:
        composition.share_token = str(uuid.uuid4())[:8]
    
    composition.is_public = 1
    db.commit()
    
    return {
        "status": "success",
        "share_token": composition.share_token,
        "share_url": f"/share/{composition.share_token}"
    }


@router.post("/{composition_id}/unshare")
def unshare_composition(
    composition_id: int,
    db: Session = Depends(get_db)
):
    composition = db.query(Composition).filter(
        Composition.id == composition_id
    ).first()
    
    if not composition:
        raise HTTPException(status_code=404, detail="作品不存在")
    
    composition.is_public = 0
    db.commit()
    
    return {"status": "success", "message": "已取消分享"}


@router.post("/{composition_id}/fork", response_model=CompositionResponse)
def fork_composition(
    composition_id: int,
    new_title: Optional[str] = None,
    db: Session = Depends(get_db)
):
    original = db.query(Composition).filter(
        Composition.id == composition_id
    ).first()
    
    if not original:
        raise HTTPException(status_code=404, detail="原作不存在")
    
    fork = Composition(
        title=new_title or f"{original.title} (副本)",
        description=original.description,
        keywords=original.keywords,
        folk_ratio=original.folk_ratio,
        modern_ratio=original.modern_ratio,
        midi_data=original.midi_data,
        parent_id=original.id
    )
    
    db.add(fork)
    db.commit()
    db.refresh(fork)
    
    return fork


@router.get("/share/{share_token}", response_model=CompositionResponse)
def get_shared_composition(
    share_token: str,
    db: Session = Depends(get_db)
):
    composition = db.query(Composition).filter(
        Composition.share_token == share_token,
        Composition.is_public == 1
    ).first()
    
    if not composition:
        raise HTTPException(status_code=404, detail="分享链接无效或已过期")
    
    return composition
