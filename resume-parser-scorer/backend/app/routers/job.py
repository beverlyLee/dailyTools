from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.database.models import JobDescription
from app.models.schemas import JobDescriptionCreate, JobDescriptionResponse

router = APIRouter()


@router.post("/", response_model=JobDescriptionResponse)
async def create_job(
    job_data: JobDescriptionCreate,
    db: Session = Depends(get_db)
):
    """
    创建岗位描述
    
    - **job_data**: 岗位信息
    """
    job = JobDescription(
        position_name=job_data.position_name,
        department=job_data.department,
        requirements=job_data.requirements,
        responsibilities=job_data.responsibilities,
        location=job_data.location,
        salary_range=job_data.salary_range,
        required_skills=job_data.required_skills,
        education_requirement=job_data.education_requirement,
        work_years_requirement=job_data.work_years_requirement
    )
    
    db.add(job)
    db.commit()
    db.refresh(job)
    
    return job


@router.get("/list", response_model=List[JobDescriptionResponse])
async def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    keyword: Optional[str] = Query(None, description="搜索关键词"),
    db: Session = Depends(get_db)
):
    """
    获取岗位列表
    
    - **skip**: 跳过数量
    - **limit**: 返回数量限制
    - **keyword**: 搜索关键词（职位名称、部门）
    """
    query = db.query(JobDescription)
    
    if keyword:
        query = query.filter(
            JobDescription.position_name.contains(keyword) |
            JobDescription.department.contains(keyword)
        )
    
    jobs = query.order_by(JobDescription.created_at.desc()).offset(skip).limit(limit).all()
    
    return jobs


@router.get("/{job_id}", response_model=JobDescriptionResponse)
async def get_job(
    job_id: int,
    db: Session = Depends(get_db)
):
    """
    获取岗位详情
    
    - **job_id**: 岗位ID
    """
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    
    return job


@router.put("/{job_id}", response_model=JobDescriptionResponse)
async def update_job(
    job_id: int,
    job_data: JobDescriptionCreate,
    db: Session = Depends(get_db)
):
    """
    更新岗位信息
    
    - **job_id**: 岗位ID
    - **job_data**: 更新的岗位信息
    """
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    
    job.position_name = job_data.position_name
    job.department = job_data.department
    job.requirements = job_data.requirements
    job.responsibilities = job_data.responsibilities
    job.location = job_data.location
    job.salary_range = job_data.salary_range
    job.required_skills = job_data.required_skills
    job.education_requirement = job_data.education_requirement
    job.work_years_requirement = job_data.work_years_requirement
    
    db.commit()
    db.refresh(job)
    
    return job


@router.delete("/{job_id}")
async def delete_job(
    job_id: int,
    db: Session = Depends(get_db)
):
    """
    删除岗位
    
    - **job_id**: 岗位ID
    """
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    
    db.delete(job)
    db.commit()
    
    return {"success": True, "message": "岗位已删除"}
