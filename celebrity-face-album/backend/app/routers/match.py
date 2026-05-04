from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db, Resume, JobDescription, MatchResult
from ..models.schemas import (
    MatchRequest, MatchResultResponse, 
    ResumeMatchDetail, ResumeResponse, SkillResponse,
    WorkExperienceResponse, EducationResponse
)
from ..services.match_service import MatchService

router = APIRouter()


@router.post("/", response_model=List[MatchResultResponse], tags=["批量匹配"])
def match_resumes(
    match_request: MatchRequest, 
    db: Session = Depends(get_db)
):
    """批量匹配简历与岗位"""
    try:
        # 验证岗位是否存在
        job = db.query(JobDescription).filter(
            JobDescription.id == match_request.job_description_id
        ).first()
        if not job:
            raise HTTPException(
                status_code=404, 
                detail=f"岗位不存在: ID = {match_request.job_description_id}"
            )
        
        # 验证简历是否存在
        for resume_id in match_request.resume_ids:
            resume = db.query(Resume).filter(Resume.id == resume_id).first()
            if not resume:
                raise HTTPException(
                    status_code=404, 
                    detail=f"简历不存在: ID = {resume_id}"
                )
        
        # 创建匹配服务
        match_service = MatchService()
        
        # 执行匹配
        results = []
        for resume_id in match_request.resume_ids:
            resume = db.query(Resume).filter(Resume.id == resume_id).first()
            
            # 计算匹配分数
            match_result = match_service.calculate_match(resume, job)
            
            # 保存到数据库
            db_match = MatchResult(
                resume_id=resume_id,
                job_description_id=match_request.job_description_id,
                total_score=match_result.get("total_score", 0.0),
                skill_score=match_result.get("skill_score", 0.0),
                experience_score=match_result.get("experience_score", 0.0),
                education_score=match_result.get("education_score", 0.0),
                other_score=match_result.get("other_score", 0.0)
            )
            db.add(db_match)
            db.commit()
            db.refresh(db_match)
            
            results.append(MatchResultResponse.model_validate(db_match))
        
        return results
        
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"匹配失败: {str(e)}")


@router.get("/job/{job_id}", response_model=List[ResumeMatchDetail], tags=["岗位匹配结果"])
def get_job_match_results(
    job_id: int, 
    db: Session = Depends(get_db),
    min_score: float = 0.0
):
    """获取指定岗位的所有匹配结果"""
    try:
        # 验证岗位是否存在
        job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail=f"岗位不存在: ID = {job_id}")
        
        # 获取匹配结果（按分数降序排列）
        match_results = db.query(MatchResult).filter(
            MatchResult.job_description_id == job_id,
            MatchResult.total_score >= min_score
        ).order_by(MatchResult.total_score.desc()).all()
        
        # 构建响应
        results = []
        for match_result in match_results:
            resume = db.query(Resume).filter(Resume.id == match_result.resume_id).first()
            
            resume_response = ResumeResponse(
                id=resume.id,
                name=resume.name,
                gender=resume.gender,
                phone=resume.phone,
                email=resume.email,
                current_address=resume.current_address,
                date_of_birth=resume.date_of_birth,
                education_level=resume.education_level,
                major=resume.major,
                university=resume.university,
                graduation_date=resume.graduation_date,
                work_years=resume.work_years,
                current_position=resume.current_position,
                current_company=resume.current_company,
                expected_salary=resume.expected_salary,
                expected_position=resume.expected_position,
                file_path=resume.file_path,
                file_type=resume.file_type,
                created_at=resume.created_at,
                updated_at=resume.updated_at,
                skills=[SkillResponse.model_validate(skill) for skill in resume.skills],
                work_experiences=[WorkExperienceResponse.model_validate(exp) for exp in resume.work_experiences],
                educations=[EducationResponse.model_validate(edu) for edu in resume.educations]
            )
            
            results.append(ResumeMatchDetail(
                resume=resume_response,
                match_result=MatchResultResponse.model_validate(match_result)
            ))
        
        return results
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取匹配结果失败: {str(e)}")


@router.get("/resume/{resume_id}", response_model=List[MatchResultResponse], tags=["简历匹配历史"])
def get_resume_match_history(
    resume_id: int, 
    db: Session = Depends(get_db)
):
    """获取指定简历的匹配历史"""
    try:
        # 验证简历是否存在
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail=f"简历不存在: ID = {resume_id}")
        
        # 获取匹配历史
        match_results = db.query(MatchResult).filter(
            MatchResult.resume_id == resume_id
        ).order_by(MatchResult.created_at.desc()).all()
        
        return [MatchResultResponse.model_validate(result) for result in match_results]
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取匹配历史失败: {str(e)}")


@router.delete("/{match_id}", tags=["删除匹配结果"])
def delete_match_result(match_id: int, db: Session = Depends(get_db)):
    """删除匹配结果"""
    match_result = db.query(MatchResult).filter(MatchResult.id == match_id).first()
    if not match_result:
        raise HTTPException(status_code=404, detail=f"匹配结果不存在: ID = {match_id}")
    
    try:
        db.delete(match_result)
        db.commit()
        return {"success": True, "message": "匹配结果删除成功"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"删除匹配结果失败: {str(e)}")
