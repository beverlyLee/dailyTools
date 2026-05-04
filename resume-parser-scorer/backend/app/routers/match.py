from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.database.models import Resume, JobDescription
from app.models.schemas import MatchRequest, MatchResultResponse
from app.services.match_service import MatchService

router = APIRouter()

match_service = MatchService()


@router.post("/calculate")
async def calculate_match(
    resume_id: int = Query(..., description="简历ID"),
    job_id: int = Query(..., description="岗位ID"),
    db: Session = Depends(get_db)
):
    """
    计算单个简历与岗位的匹配度
    
    - **resume_id**: 简历ID
    - **job_id**: 岗位ID
    """
    result = match_service.calculate_match(db, resume_id, job_id)
    
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    
    return result


@router.post("/batch")
async def batch_match(
    match_request: MatchRequest,
    db: Session = Depends(get_db)
):
    """
    批量匹配简历与岗位
    
    - **match_request**: 包含简历ID列表和岗位ID
    """
    job = db.query(JobDescription).filter(
        JobDescription.id == match_request.job_description_id
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    
    results = match_service.batch_match(
        db, 
        match_request.resume_ids, 
        match_request.job_description_id
    )
    
    return {
        "success": True,
        "job_id": match_request.job_description_id,
        "total_matched": len(results),
        "results": results
    }


@router.get("/history")
async def get_match_history(
    resume_id: Optional[int] = Query(None, description="简历ID（可选）"),
    job_id: Optional[int] = Query(None, description="岗位ID（可选）"),
    limit: int = Query(50, ge=1, le=200, description="返回数量限制"),
    db: Session = Depends(get_db)
):
    """
    获取匹配历史记录
    
    - **resume_id**: 按简历筛选（可选）
    - **job_id**: 按岗位筛选（可选）
    - **limit**: 返回数量限制
    """
    history = match_service.get_match_history(
        db, 
        resume_id=resume_id, 
        job_id=job_id, 
        limit=limit
    )
    
    return {
        "success": True,
        "total": len(history),
        "history": history
    }


@router.post("/match-all")
async def match_all_resumes(
    job_id: int = Query(..., description="岗位ID"),
    db: Session = Depends(get_db)
):
    """
    将人才库中所有简历与指定岗位进行匹配
    
    - **job_id**: 岗位ID
    """
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    
    resumes = db.query(Resume).all()
    resume_ids = [r.id for r in resumes]
    
    if not resume_ids:
        return {
            "success": True,
            "job_id": job_id,
            "total_matched": 0,
            "results": [],
            "message": "人才库中没有简历"
        }
    
    results = match_service.batch_match(db, resume_ids, job_id)
    
    return {
        "success": True,
        "job_id": job_id,
        "total_resumes": len(resume_ids),
        "total_matched": len(results),
        "results": results
    }
