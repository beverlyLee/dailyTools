from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import aiofiles
from datetime import datetime
from ..database import get_db, Resume, Skill, WorkExperience, Education
from ..models.schemas import (
    ResumeCreate, ResumeResponse, ResumeListResponse, 
    SkillCreate, WorkExperienceCreate, EducationCreate,
    ParseResumeResponse, UploadResumeResponse
)
from ..parsers.pdf_parser import PDFParser
from ..parsers.docx_parser import DOCXParser
from ..services.nlp_service import NLPService

router = APIRouter()

# 上传文件目录
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=UploadResumeResponse, tags=["简历上传"])
async def upload_resume(file: UploadFile = File(...)):
    """上传简历文件"""
    try:
        # 验证文件类型
        allowed_types = ["application/pdf", "application/msword", 
                         "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail=f"不支持的文件类型: {file.content_type}，仅支持PDF和Word文档"
            )
        
        # 生成文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
        new_filename = f"resume_{timestamp}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, new_filename)
        
        # 保存文件
        async with aiofiles.open(file_path, 'wb') as buffer:
            content = await file.read()
            await buffer.write(content)
        
        # 确定文件类型
        file_type = "pdf" if file.content_type == "application/pdf" else "docx"
        
        return UploadResumeResponse(
            success=True,
            message="文件上传成功",
            file_path=file_path,
            file_type=file_type
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")


@router.post("/parse", response_model=ParseResumeResponse, tags=["简历解析"])
async def parse_resume(
    file_path: str, 
    file_type: str, 
    db: Session = Depends(get_db)
):
    """解析简历文件"""
    try:
        # 验证文件是否存在
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"文件不存在: {file_path}")
        
        # 选择解析器
        if file_type.lower() == "pdf":
            parser = PDFParser()
        elif file_type.lower() in ["docx", "doc"]:
            parser = DOCXParser()
        else:
            raise HTTPException(status_code=400, detail=f"不支持的文件类型: {file_type}")
        
        # 解析文件
        raw_text = parser.parse(file_path)
        
        # 使用NLP服务提取结构化信息
        nlp_service = NLPService()
        structured_data = nlp_service.extract_resume_info(raw_text)
        
        # 创建简历记录
        resume_data = ResumeCreate(
            name=structured_data.get("name", "未知"),
            gender=structured_data.get("gender"),
            phone=structured_data.get("phone"),
            email=structured_data.get("email"),
            current_address=structured_data.get("address"),
            date_of_birth=structured_data.get("birth_date"),
            education_level=structured_data.get("education_level"),
            major=structured_data.get("major"),
            university=structured_data.get("university"),
            graduation_date=structured_data.get("graduation_date"),
            work_years=structured_data.get("work_years", 0),
            current_position=structured_data.get("current_position"),
            current_company=structured_data.get("current_company"),
            expected_salary=structured_data.get("expected_salary"),
            expected_position=structured_data.get("expected_position"),
            skills=[SkillCreate(**skill) for skill in structured_data.get("skills", [])],
            work_experiences=[WorkExperienceCreate(**exp) for exp in structured_data.get("work_experiences", [])],
            educations=[EducationCreate(**edu) for edu in structured_data.get("educations", [])]
        )
        
        # 保存到数据库
        db_resume = Resume(
            **resume_data.model_dump(exclude={"skills", "work_experiences", "educations"}),
            file_path=file_path,
            file_type=file_type
        )
        db.add(db_resume)
        db.commit()
        db.refresh(db_resume)
        
        # 保存技能
        for skill_data in resume_data.skills:
            db_skill = Skill(**skill_data.model_dump(), resume_id=db_resume.id)
            db.add(db_skill)
        
        # 保存工作经历
        for exp_data in resume_data.work_experiences:
            db_exp = WorkExperience(**exp_data.model_dump(), resume_id=db_resume.id)
            db.add(db_exp)
        
        # 保存教育经历
        for edu_data in resume_data.educations:
            db_edu = Education(**edu_data.model_dump(), resume_id=db_resume.id)
            db.add(db_edu)
        
        db.commit()
        db.refresh(db_resume)
        
        # 构建响应
        resume_response = ResumeResponse(
            id=db_resume.id,
            name=db_resume.name,
            gender=db_resume.gender,
            phone=db_resume.phone,
            email=db_resume.email,
            current_address=db_resume.current_address,
            date_of_birth=db_resume.date_of_birth,
            education_level=db_resume.education_level,
            major=db_resume.major,
            university=db_resume.university,
            graduation_date=db_resume.graduation_date,
            work_years=db_resume.work_years,
            current_position=db_resume.current_position,
            current_company=db_resume.current_company,
            expected_salary=db_resume.expected_salary,
            expected_position=db_resume.expected_position,
            file_path=db_resume.file_path,
            file_type=db_resume.file_type,
            created_at=db_resume.created_at,
            updated_at=db_resume.updated_at,
            skills=[SkillResponse.model_validate(skill) for skill in db_resume.skills],
            work_experiences=[WorkExperienceResponse.model_validate(exp) for exp in db_resume.work_experiences],
            educations=[EducationResponse.model_validate(edu) for edu in db_resume.educations]
        )
        
        return ParseResumeResponse(
            success=True,
            message="简历解析成功",
            data=resume_response
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"简历解析失败: {str(e)}")


@router.get("/list", response_model=List[ResumeListResponse], tags=["简历列表"])
def get_resume_list(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """获取简历列表"""
    resumes = db.query(Resume).offset(skip).limit(limit).all()
    return [ResumeListResponse.model_validate(resume) for resume in resumes]


@router.get("/{resume_id}", response_model=ResumeResponse, tags=["简历详情"])
def get_resume_detail(resume_id: int, db: Session = Depends(get_db)):
    """获取简历详情"""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail=f"简历不存在: ID = {resume_id}")
    return ResumeResponse.model_validate(resume)


@router.delete("/{resume_id}", tags=["删除简历"])
def delete_resume(resume_id: int, db: Session = Depends(get_db)):
    """删除简历"""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail=f"简历不存在: ID = {resume_id}")
    
    # 删除关联数据
    db.query(Skill).filter(Skill.resume_id == resume_id).delete()
    db.query(WorkExperience).filter(WorkExperience.resume_id == resume_id).delete()
    db.query(Education).filter(Education.resume_id == resume_id).delete()
    
    # 删除文件
    if resume.file_path and os.path.exists(resume.file_path):
        os.remove(resume.file_path)
    
    db.delete(resume)
    db.commit()
    
    return {"success": True, "message": "简历删除成功"}
