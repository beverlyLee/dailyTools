from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True)
    gender = Column(String(10))
    phone = Column(String(20))
    email = Column(String(100))
    current_address = Column(String(200))
    date_of_birth = Column(Date)
    education_level = Column(String(50))
    major = Column(String(100))
    university = Column(String(100))
    graduation_date = Column(Date)
    work_years = Column(Integer, default=0)
    current_position = Column(String(100))
    current_company = Column(String(100))
    expected_salary = Column(String(50))
    expected_position = Column(String(100))
    file_path = Column(String(500))
    file_type = Column(String(10))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    skills = relationship("Skill", back_populates="resume")
    work_experiences = relationship("WorkExperience", back_populates="resume")
    educations = relationship("Education", back_populates="resume")
    match_results = relationship("MatchResult", back_populates="resume")


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"))
    skill_name = Column(String(100))
    proficiency = Column(String(50))
    years = Column(Integer, default=0)

    resume = relationship("Resume", back_populates="skills")


class WorkExperience(Base):
    __tablename__ = "work_experiences"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"))
    company_name = Column(String(200))
    position = Column(String(100))
    start_date = Column(Date)
    end_date = Column(Date)
    is_current = Column(Integer, default=0)
    description = Column(Text)

    resume = relationship("Resume", back_populates="work_experiences")


class Education(Base):
    __tablename__ = "educations"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"))
    university = Column(String(200))
    degree = Column(String(100))
    major = Column(String(100))
    start_date = Column(Date)
    end_date = Column(Date)

    resume = relationship("Resume", back_populates="educations")


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(Integer, primary_key=True, index=True)
    position_name = Column(String(100))
    department = Column(String(100))
    requirements = Column(Text)
    responsibilities = Column(Text)
    location = Column(String(200))
    salary_range = Column(String(50))
    required_skills = Column(Text)
    education_requirement = Column(String(50))
    work_years_requirement = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    match_results = relationship("MatchResult", back_populates="job_description")


class MatchResult(Base):
    __tablename__ = "match_results"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"))
    job_description_id = Column(Integer, ForeignKey("job_descriptions.id"))
    total_score = Column(Float, default=0.0)
    skill_score = Column(Float, default=0.0)
    experience_score = Column(Float, default=0.0)
    education_score = Column(Float, default=0.0)
    other_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    resume = relationship("Resume", back_populates="match_results")
    job_description = relationship("JobDescription", back_populates="match_results")
