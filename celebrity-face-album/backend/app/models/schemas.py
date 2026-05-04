from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime


class SkillBase(BaseModel):
    skill_name: str = Field(..., title="技能名称", max_length=100)
    proficiency: Optional[str] = Field(None, title="熟练程度", max_length=50)
    years: Optional[int] = Field(0, title="使用年限", ge=0)


class SkillCreate(SkillBase):
    pass


class SkillResponse(SkillBase):
    id: int
    resume_id: int

    class Config:
        from_attributes = True


class WorkExperienceBase(BaseModel):
    company_name: str = Field(..., title="公司名称", max_length=200)
    position: str = Field(..., title="职位", max_length=100)
    start_date: Optional[date] = Field(None, title="开始日期")
    end_date: Optional[date] = Field(None, title="结束日期")
    is_current: Optional[int] = Field(0, title="是否在职", ge=0, le=1)
    description: Optional[str] = Field(None, title="工作描述")


class WorkExperienceCreate(WorkExperienceBase):
    pass


class WorkExperienceResponse(WorkExperienceBase):
    id: int
    resume_id: int

    class Config:
        from_attributes = True


class EducationBase(BaseModel):
    university: str = Field(..., title="学校名称", max_length=200)
    degree: str = Field(..., title="学位", max_length=100)
    major: str = Field(..., title="专业", max_length=100)
    start_date: Optional[date] = Field(None, title="开始日期")
    end_date: Optional[date] = Field(None, title="结束日期")


class EducationCreate(EducationBase):
    pass


class EducationResponse(EducationBase):
    id: int
    resume_id: int

    class Config:
        from_attributes = True


class ResumeBase(BaseModel):
    name: str = Field(..., title="姓名", max_length=100)
    gender: Optional[str] = Field(None, title="性别", max_length=10)
    phone: Optional[str] = Field(None, title="电话", max_length=20)
    email: Optional[str] = Field(None, title="邮箱", max_length=100)
    current_address: Optional[str] = Field(None, title="现居地址", max_length=200)
    date_of_birth: Optional[date] = Field(None, title="出生日期")
    education_level: Optional[str] = Field(None, title="最高学历", max_length=50)
    major: Optional[str] = Field(None, title="专业", max_length=100)
    university: Optional[str] = Field(None, title="毕业院校", max_length=100)
    graduation_date: Optional[date] = Field(None, title="毕业日期")
    work_years: Optional[int] = Field(0, title="工作年限", ge=0)
    current_position: Optional[str] = Field(None, title="当前职位", max_length=100)
    current_company: Optional[str] = Field(None, title="当前公司", max_length=100)
    expected_salary: Optional[str] = Field(None, title="期望薪资", max_length=50)
    expected_position: Optional[str] = Field(None, title="期望职位", max_length=100)


class ResumeCreate(ResumeBase):
    skills: Optional[List[SkillCreate]] = Field([], title="技能列表")
    work_experiences: Optional[List[WorkExperienceCreate]] = Field([], title="工作经历列表")
    educations: Optional[List[EducationCreate]] = Field([], title="教育经历列表")


class ResumeResponse(ResumeBase):
    id: int
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    skills: List[SkillResponse] = []
    work_experiences: List[WorkExperienceResponse] = []
    educations: List[EducationResponse] = []

    class Config:
        from_attributes = True


class ResumeListResponse(BaseModel):
    id: int
    name: str
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    education_level: Optional[str] = None
    work_years: Optional[int] = 0
    current_position: Optional[str] = None
    current_company: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class JobDescriptionBase(BaseModel):
    position_name: str = Field(..., title="职位名称", max_length=100)
    department: Optional[str] = Field(None, title="所属部门", max_length=100)
    requirements: Optional[str] = Field(None, title="任职要求")
    responsibilities: Optional[str] = Field(None, title="岗位职责")
    location: Optional[str] = Field(None, title="工作地点", max_length=200)
    salary_range: Optional[str] = Field(None, title="薪资范围", max_length=50)
    required_skills: Optional[str] = Field(None, title="所需技能")
    education_requirement: Optional[str] = Field(None, title="学历要求", max_length=50)
    work_years_requirement: Optional[str] = Field(None, title="工作年限要求", max_length=50)


class JobDescriptionCreate(JobDescriptionBase):
    pass


class JobDescriptionResponse(JobDescriptionBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MatchResultBase(BaseModel):
    total_score: float = Field(..., title="总匹配分数", ge=0, le=100)
    skill_score: float = Field(0.0, title="技能匹配分数", ge=0, le=100)
    experience_score: float = Field(0.0, title="经验匹配分数", ge=0, le=100)
    education_score: float = Field(0.0, title="学历匹配分数", ge=0, le=100)
    other_score: float = Field(0.0, title="其他匹配分数", ge=0, le=100)


class MatchResultResponse(MatchResultBase):
    id: int
    resume_id: int
    job_description_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ResumeMatchDetail(BaseModel):
    resume: ResumeResponse
    match_result: MatchResultResponse


class MatchRequest(BaseModel):
    resume_ids: List[int] = Field(..., title="简历ID列表")
    job_description_id: int = Field(..., title="岗位描述ID")


class ParseResumeResponse(BaseModel):
    success: bool
    message: str
    data: Optional[ResumeResponse] = None


class UploadResumeResponse(BaseModel):
    success: bool
    message: str
    file_path: Optional[str] = None
    file_type: Optional[str] = None
