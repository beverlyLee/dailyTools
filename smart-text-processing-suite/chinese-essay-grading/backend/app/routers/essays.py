from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
import math

from ..database import get_db
from ..models import Essay, Grading, EssayError, SyntaxAnalysis
from ..config import settings

router = APIRouter()


class EssaySubmitRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="作文标题")
    content: str = Field(..., min_length=1, description="作文内容")
    student_name: Optional[str] = Field(None, max_length=100, description="学生姓名")
    class_name: Optional[str] = Field(None, max_length=100, description="班级")
    grade: Optional[str] = Field(None, max_length=50, description="年级")


class EssayUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = None
    student_name: Optional[str] = None
    class_name: Optional[str] = None
    grade: Optional[str] = None


class EssayResponse(BaseModel):
    id: int
    title: str
    content: str
    word_count: int
    student_name: Optional[str]
    class_name: Optional[str]
    grade: Optional[str]
    is_graded: bool
    submitted_at: str
    updated_at: str
    grading: Optional[Dict[str, Any]] = None


class EssayListResponse(BaseModel):
    items: List[EssayResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


def essay_to_response(essay: Essay, include_grading: bool = True) -> EssayResponse:
    grading_data = None
    if include_grading and essay.grading:
        grading_data = {
            "id": essay.grading.id,
            "total_score": essay.grading.total_score,
            "content_score": essay.grading.content_score,
            "language_score": essay.grading.language_score,
            "structure_score": essay.grading.structure_score,
            "overall_comment": essay.grading.overall_comment
        }
    
    return EssayResponse(
        id=essay.id,
        title=essay.title,
        content=essay.content,
        word_count=essay.word_count,
        student_name=essay.student_name,
        class_name=essay.class_name,
        grade=essay.grade,
        is_graded=bool(essay.is_graded),
        submitted_at=essay.submitted_at.isoformat() if essay.submitted_at else "",
        updated_at=essay.updated_at.isoformat() if essay.updated_at else "",
        grading=grading_data
    )


@router.post("/submit", response_model=Dict[str, Any])
def submit_essay(
    request: EssaySubmitRequest,
    db: Session = Depends(get_db)
):
    if len(request.content) > settings.MAX_ESSAY_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"作文内容过长，最大长度为 {settings.MAX_ESSAY_LENGTH} 字符"
        )
    
    essay = Essay(
        title=request.title,
        content=request.content,
        word_count=len(request.content),
        student_name=request.student_name,
        class_name=request.class_name,
        grade=request.grade,
        is_graded=0,
        submitted_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(essay)
    db.commit()
    db.refresh(essay)
    
    return {
        "success": True,
        "data": {
            "essay_id": essay.id,
            "title": essay.title,
            "word_count": essay.word_count,
            "submitted_at": essay.submitted_at.isoformat()
        }
    }


@router.get("/", response_model=EssayListResponse)
def get_essays(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    student_name: Optional[str] = Query(None, description="学生姓名筛选"),
    class_name: Optional[str] = Query(None, description="班级筛选"),
    grade: Optional[str] = Query(None, description="年级筛选"),
    is_graded: Optional[bool] = Query(None, description="是否已批改"),
    db: Session = Depends(get_db)
):
    query = db.query(Essay)
    
    if student_name:
        query = query.filter(Essay.student_name.like(f"%{student_name}%"))
    if class_name:
        query = query.filter(Essay.class_name.like(f"%{class_name}%"))
    if grade:
        query = query.filter(Essay.grade.like(f"%{grade}%"))
    if is_graded is not None:
        query = query.filter(Essay.is_graded == (1 if is_graded else 0))
    
    total = query.count()
    
    essays = query.order_by(Essay.submitted_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()
    
    items = [essay_to_response(essay) for essay in essays]
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    return EssayListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{essay_id}", response_model=EssayResponse)
def get_essay_by_id(
    essay_id: int,
    db: Session = Depends(get_db)
):
    essay = db.query(Essay).filter(Essay.id == essay_id).first()
    
    if not essay:
        raise HTTPException(status_code=404, detail="作文不存在")
    
    return essay_to_response(essay, include_grading=True)


@router.put("/{essay_id}", response_model=Dict[str, Any])
def update_essay(
    essay_id: int,
    request: EssayUpdateRequest,
    db: Session = Depends(get_db)
):
    essay = db.query(Essay).filter(Essay.id == essay_id).first()
    
    if not essay:
        raise HTTPException(status_code=404, detail="作文不存在")
    
    update_data = request.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        if value is not None:
            setattr(essay, key, value)
    
    if 'content' in update_data:
        essay.word_count = len(update_data['content'])
    
    essay.updated_at = datetime.utcnow()
    db.commit()
    
    return {
        "success": True,
        "data": {
            "essay_id": essay.id,
            "updated_at": essay.updated_at.isoformat()
        }
    }


@router.delete("/{essay_id}", response_model=Dict[str, Any])
def delete_essay(
    essay_id: int,
    db: Session = Depends(get_db)
):
    essay = db.query(Essay).filter(Essay.id == essay_id).first()
    
    if not essay:
        raise HTTPException(status_code=404, detail="作文不存在")
    
    db.delete(essay)
    db.commit()
    
    return {
        "success": True,
        "data": {
            "message": "作文已删除",
            "essay_id": essay_id
        }
    }
