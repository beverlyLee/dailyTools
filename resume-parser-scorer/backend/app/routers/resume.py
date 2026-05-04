import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.database.models import Resume, Skill, WorkExperience, Education
from app.models.schemas import (
    ResumeResponse, ResumeListResponse, ResumeCreate,
    ParseResumeResponse, UploadResumeResponse
)
from app.parsers.pdf_parser import PDFParser
from app.parsers.docx_parser import DOCXParser
from app.services.nlp_service import NLPService

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

pdf_parser = PDFParser()
docx_parser = DOCXParser()
nlp_service = NLPService()


@router.post("/upload", response_model=UploadResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    上传简历文件
    
    支持PDF和Word格式文件上传，保存到服务器。
    
    - **file**: 简历文件（PDF或Word）
    """
    allowed_types = ["application/pdf", "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in [".pdf", ".doc", ".docx"]:
        raise HTTPException(status_code=400, detail="不支持的文件格式，仅支持PDF、DOC、DOCX")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    new_filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, new_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件保存失败: {str(e)}")
    
    file_type = "pdf" if file_ext == ".pdf" else "docx"
    
    return UploadResumeResponse(
        success=True,
        message="文件上传成功",
        file_path=file_path,
        file_type=file_type
    )


@router.post("/parse", response_model=ParseResumeResponse)
async def parse_resume(
    file_path: str = Query(..., description="上传的文件路径"),
    file_type: str = Query(..., description="文件类型: pdf 或 docx"),
    db: Session = Depends(get_db)
):
    """
    解析简历文件并提取结构化信息
    
    - **file_path**: 文件路径（从上传接口返回）
    - **file_type**: 文件类型
    """
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="文件不存在")
    
    try:
        if file_type == "pdf":
            text = pdf_parser.parse(file_path)
        elif file_type == "docx":
            text = docx_parser.parse(file_path)
        else:
            raise HTTPException(status_code=400, detail="不支持的文件类型")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件解析失败: {str(e)}")
    
    resume_info = nlp_service.extract_resume_info(text)
    
    resume_data = ResumeCreate(
        name=resume_info.get("name", "未知"),
        gender=resume_info.get("gender"),
        phone=resume_info.get("phone"),
        email=resume_info.get("email"),
        current_address=resume_info.get("address"),
        date_of_birth=resume_info.get("birth_date"),
        education_level=resume_info.get("education_level"),
        major=resume_info.get("major"),
        university=resume_info.get("university"),
        graduation_date=resume_info.get("graduation_date"),
        work_years=resume_info.get("work_years", 0),
        current_position=resume_info.get("current_position"),
        current_company=resume_info.get("current_company"),
        expected_salary=resume_info.get("expected_salary"),
        expected_position=resume_info.get("expected_position"),
        skills=resume_info.get("skills", []),
        work_experiences=resume_info.get("work_experiences", []),
        educations=resume_info.get("educations", [])
    )
    
    return ParseResumeResponse(
        success=True,
        message="简历解析成功",
        data=resume_data
    )


@router.post("/save", response_model=ResumeResponse)
async def save_resume(
    resume_data: ResumeCreate,
    file_path: Optional[str] = Query(None, description="原始文件路径"),
    file_type: Optional[str] = Query(None, description="文件类型"),
    db: Session = Depends(get_db)
):
    """
    保存解析后的简历到数据库
    
    - **resume_data**: 简历结构化数据
    """
    resume = Resume(
        name=resume_data.name,
        gender=resume_data.gender,
        phone=resume_data.phone,
        email=resume_data.email,
        current_address=resume_data.current_address,
        date_of_birth=resume_data.date_of_birth,
        education_level=resume_data.education_level,
        major=resume_data.major,
        university=resume_data.university,
        graduation_date=resume_data.graduation_date,
        work_years=resume_data.work_years,
        current_position=resume_data.current_position,
        current_company=resume_data.current_company,
        expected_salary=resume_data.expected_salary,
        expected_position=resume_data.expected_position,
        file_path=file_path,
        file_type=file_type
    )
    
    db.add(resume)
    db.commit()
    db.refresh(resume)
    
    for skill_data in resume_data.skills:
        skill = Skill(
            resume_id=resume.id,
            skill_name=skill_data.skill_name,
            proficiency=skill_data.proficiency,
            years=skill_data.years
        )
        db.add(skill)
    
    for exp_data in resume_data.work_experiences:
        experience = WorkExperience(
            resume_id=resume.id,
            company_name=exp_data.company_name,
            position=exp_data.position,
            start_date=exp_data.start_date,
            end_date=exp_data.end_date,
            is_current=exp_data.is_current,
            description=exp_data.description
        )
        db.add(experience)
    
    for edu_data in resume_data.educations:
        education = Education(
            resume_id=resume.id,
            university=edu_data.university,
            degree=edu_data.degree,
            major=edu_data.major,
            start_date=edu_data.start_date,
            end_date=edu_data.end_date
        )
        db.add(education)
    
    db.commit()
    db.refresh(resume)
    
    return resume


@router.post("/upload-parse-save", response_model=ResumeResponse)
async def upload_parse_save(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    一站式上传、解析、保存简历
    
    支持PDF和Word文件，自动解析后直接保存到数据库。
    """
    upload_result = await upload_resume(file, db)
    
    parse_result = await parse_resume(
        upload_result.file_path,
        upload_result.file_type,
        db
    )
    
    resume = await save_resume(
        parse_result.data,
        upload_result.file_path,
        upload_result.file_type,
        db
    )
    
    return resume


@router.get("/list", response_model=List[ResumeListResponse])
async def list_resumes(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    keyword: Optional[str] = Query(None, description="搜索关键词"),
    db: Session = Depends(get_db)
):
    """
    获取简历列表
    
    - **skip**: 跳过数量
    - **limit**: 返回数量限制
    - **keyword**: 搜索关键词（姓名、公司、职位）
    """
    query = db.query(Resume)
    
    if keyword:
        query = query.filter(
            Resume.name.contains(keyword) |
            Resume.current_company.contains(keyword) |
            Resume.current_position.contains(keyword)
        )
    
    resumes = query.order_by(Resume.created_at.desc()).offset(skip).limit(limit).all()
    
    return resumes


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: int,
    db: Session = Depends(get_db)
):
    """
    获取简历详情
    
    - **resume_id**: 简历ID
    """
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    
    return resume


@router.delete("/{resume_id}")
async def delete_resume(
    resume_id: int,
    db: Session = Depends(get_db)
):
    """
    删除简历
    
    - **resume_id**: 简历ID
    """
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    
    if resume.file_path and os.path.exists(resume.file_path):
        try:
            os.remove(resume.file_path)
        except Exception:
            pass
    
    db.delete(resume)
    db.commit()
    
    return {"success": True, "message": "简历已删除"}
