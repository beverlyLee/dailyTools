from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=True)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(20), nullable=False, default="student")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    essays = relationship("Essay", back_populates="student", lazy="dynamic")
    class_teacher = relationship("Class", back_populates="teacher", lazy="dynamic")
    class_memberships = relationship("ClassMember", back_populates="student", lazy="dynamic")


class Class(Base):
    __tablename__ = "classes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    description = Column(Text, nullable=True)
    grade = Column(String(50), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    teacher = relationship("User", back_populates="class_teacher")
    members = relationship("ClassMember", back_populates="class_info", lazy="dynamic", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="class_info", lazy="dynamic", cascade="all, delete-orphan")


class ClassMember(Base):
    __tablename__ = "class_members"
    
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    class_info = relationship("Class", back_populates="members")
    student = relationship("User", back_populates="class_memberships")


class Assignment(Base):
    __tablename__ = "assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    requirements = Column(Text, nullable=True)
    deadline = Column(DateTime, nullable=True)
    word_count_min = Column(Integer, default=0)
    word_count_max = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    class_info = relationship("Class", back_populates="assignments")
    essays = relationship("Essay", back_populates="assignment", lazy="dynamic")


class Essay(Base):
    __tablename__ = "essays"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=True, index=True)
    
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    word_count = Column(Integer, default=0)
    
    student_name = Column(String(100), nullable=True)
    class_name = Column(String(100), nullable=True)
    grade = Column(String(50), nullable=True)
    
    is_graded = Column(Integer, default=0)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    student = relationship("User", back_populates="essays")
    assignment = relationship("Assignment", back_populates="essays")
    grading = relationship("Grading", back_populates="essay", uselist=False, cascade="all, delete-orphan")
    errors = relationship("EssayError", back_populates="essay", lazy="dynamic", cascade="all, delete-orphan")
    syntax_analysis = relationship("SyntaxAnalysis", back_populates="essay", lazy="dynamic", cascade="all, delete-orphan")


class Grading(Base):
    __tablename__ = "gradings"
    
    id = Column(Integer, primary_key=True, index=True)
    essay_id = Column(Integer, ForeignKey("essays.id"), nullable=False, unique=True, index=True)
    
    content_score = Column(Float, default=0.0)
    language_score = Column(Float, default=0.0)
    structure_score = Column(Float, default=0.0)
    total_score = Column(Float, default=0.0)
    
    content_comment = Column(Text, nullable=True)
    language_comment = Column(Text, nullable=True)
    structure_comment = Column(Text, nullable=True)
    overall_comment = Column(Text, nullable=True)
    
    suggestions = Column(Text, nullable=True)
    highlights = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    essay = relationship("Essay", back_populates="grading")


class EssayError(Base):
    __tablename__ = "essay_errors"
    
    id = Column(Integer, primary_key=True, index=True)
    essay_id = Column(Integer, ForeignKey("essays.id"), nullable=False, index=True)
    
    error_type = Column(String(50), nullable=False, index=True)
    original_text = Column(String(500), nullable=False)
    corrected_text = Column(String(500), nullable=True)
    explanation = Column(Text, nullable=True)
    
    position_start = Column(Integer, nullable=True)
    position_end = Column(Integer, nullable=True)
    line_number = Column(Integer, nullable=True)
    
    severity = Column(String(20), default="minor")
    confidence = Column(Float, default=1.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    essay = relationship("Essay", back_populates="errors")
    
    __table_args__ = (
        Index('ix_essay_errors_essay_type', 'essay_id', 'error_type'),
    )


class SyntaxAnalysis(Base):
    __tablename__ = "syntax_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    essay_id = Column(Integer, ForeignKey("essays.id"), nullable=False, index=True)
    
    word = Column(String(100), nullable=False)
    pos = Column(String(50), nullable=True)
    dep = Column(String(50), nullable=True)
    head = Column(String(100), nullable=True)
    head_idx = Column(Integer, nullable=True)
    idx = Column(Integer, nullable=True)
    
    sentence_idx = Column(Integer, nullable=True)
    explanation = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    essay = relationship("Essay", back_populates="syntax_analysis")
