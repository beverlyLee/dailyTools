from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db, JobDescription
from ..models.schemas import JobDescriptionCreate, JobDescriptionResponse

router = APIRouter()


@router.post("/", response_model=JobDescriptionResponse, tags=["创建岗位"])
def create_job_description(
    job_data: JobDescriptionCreate, 
    db: Session = Depends(get_db)
):
    """创建岗位描述"""
    try:
        db_job = JobDescription(**job_data.model_dump())
        db.add(db_job)
        db.commit()
        db.refresh(db_job)
        return JobDescriptionResponse.model_validate(db_job)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"创建岗位失败: {str(e)}")


@router.get("/list", response_model=List[JobDescriptionResponse], tags=["岗位列表"])
def get_job_list(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """获取岗位列表"""
    jobs = db.query(JobDescription).offset(skip).limit(limit).all()
    return [JobDescriptionResponse.model_validate(job) for job in jobs]


@router.get("/{job_id}", response_model=JobDescriptionResponse, tags=["岗位详情"])
def get_job_detail(job_id: int, db: Session = Depends(get_db)):
    """获取岗位详情"""
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"岗位不存在: ID = {job_id}")
    return JobDescriptionResponse.model_validate(job)


@router.put("/{job_id}", response_model=JobDescriptionResponse, tags=["更新岗位"])
def update_job_description(
    job_id: int, 
    job_data: JobDescriptionCreate, 
    db: Session = Depends(get_db)
):
    """更新岗位描述"""
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"岗位不存在: ID = {job_id}")
    
    try:
        for key, value in job_data.model_dump().items():
            setattr(job, key, value)
        db.commit()
        db.refresh(job)
        return JobDescriptionResponse.model_validate(job)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"更新岗位失败: {str(e)}")


@router.delete("/{job_id}", tags=["删除岗位"])
def delete_job_description(job_id: int, db: Session = Depends(get_db)):
    """删除岗位描述"""
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"岗位不存在: ID = {job_id}")
    
    try:
        db.delete(job)
        db.commit()
        return {"success": True, "message": "岗位删除成功"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"删除岗位失败: {str(e)}")
