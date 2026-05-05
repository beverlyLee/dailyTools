from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.utils.database import Base


class Essay(Base):
    __tablename__ = "essays"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False, comment="作文标题")
    content = Column(Text, nullable=False, comment="作文内容")
    grade = Column(String(50), comment="年级")
    word_count = Column(Integer, default=0, comment="字数")
    actual_word_count = Column(Integer, default=0, comment="实际字数")
    
    total_score = Column(Integer, default=0, comment="总分")
    content_score = Column(Integer, default=0, comment="内容立意分数")
    language_score = Column(Integer, default=0, comment="语言表达分数")
    structure_score = Column(Integer, default=0, comment="结构层次分数")
    
    comment = Column(Text, comment="综合评语")
    analysis_result = Column(JSON, comment="详细分析结果")
    
    student_id = Column(Integer, nullable=True, comment="学生ID")
    class_id = Column(Integer, nullable=True, comment="班级ID")
    teacher_id = Column(Integer, nullable=True, comment="教师ID")
    
    created_at = Column(DateTime, default=datetime.now, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")
    
    issues = relationship("EssayIssue", back_populates="essay", cascade="all, delete-orphan")


class EssayIssue(Base):
    __tablename__ = "essay_issues"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    essay_id = Column(Integer, ForeignKey("essays.id"), nullable=False, comment="作文ID")
    
    issue_type = Column(String(50), nullable=False, comment="问题类型：typo错别字, grammar语法, idiom成语, punctuation标点, style表达")
    severity = Column(String(20), default="warning", comment="严重程度：error, warning, info")
    
    original_text = Column(String(255), comment="原文")
    suggestion_text = Column(String(255), comment="建议修改")
    explanation = Column(Text, comment="解释说明")
    
    start_line = Column(Integer, comment="开始行")
    start_col = Column(Integer, comment="开始列")
    end_line = Column(Integer, comment="结束行")
    end_col = Column(Integer, comment="结束列")
    
    created_at = Column(DateTime, default=datetime.now, comment="创建时间")
    
    essay = relationship("Essay", back_populates="issues")


class StudentAnalysis(Base):
    __tablename__ = "student_analyses"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, nullable=False, comment="学生ID")
    class_id = Column(Integer, nullable=True, comment="班级ID")
    
    total_essays = Column(Integer, default=0, comment="提交作文数")
    avg_total_score = Column(Integer, default=0, comment="平均总分")
    avg_content_score = Column(Integer, default=0, comment="平均内容分数")
    avg_language_score = Column(Integer, default=0, comment="平均语言分数")
    avg_structure_score = Column(Integer, default=0, comment="平均结构分数")
    
    weakness_analysis = Column(JSON, comment="薄弱项分析")
    improvement_suggestion = Column(Text, comment="改进建议")
    
    created_at = Column(DateTime, default=datetime.now, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")


class ClassAnalysis(Base):
    __tablename__ = "class_analyses"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    class_id = Column(Integer, nullable=False, comment="班级ID")
    
    total_students = Column(Integer, default=0, comment="学生总数")
    total_essays = Column(Integer, default=0, comment="作文总数")
    avg_total_score = Column(Integer, default=0, comment="班级平均总分")
    
    score_distribution = Column(JSON, comment="分数分布")
    common_issues = Column(JSON, comment="常见问题")
    strength_analysis = Column(Text, comment="优势分析")
    weakness_analysis = Column(Text, comment="薄弱项分析")
    teaching_suggestion = Column(Text, comment="教学建议")
    
    created_at = Column(DateTime, default=datetime.now, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")
