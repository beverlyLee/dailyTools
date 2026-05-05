from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base
import enum


class DocumentType(enum.Enum):
    GENERAL = "general"
    OFFICIAL = "official"
    REPORT = "report"
    NOTICE = "notice"
    DECISION = "decision"
    LETTER = "letter"


class DocumentStatus(enum.Enum):
    DRAFT = "draft"
    REVIEWING = "reviewing"
    APPROVED = "approved"
    PUBLISHED = "published"


class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    
    title = Column(String(500), nullable=False, index=True)
    current_content = Column(Text, nullable=False)
    
    document_type = Column(String(50), default=DocumentType.GENERAL.value)
    status = Column(String(50), default=DocumentStatus.DRAFT.value)
    
    red_head_type = Column(String(100), nullable=True)
    document_number = Column(String(200), nullable=True)
    
    current_version = Column(Integer, default=1)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    versions = relationship(
        "DocumentVersion", 
        back_populates="document", 
        lazy="dynamic",
        cascade="all, delete-orphan",
        order_by="DocumentVersion.version_number.desc()"
    )
    
    corrections = relationship(
        "ProofreadCorrection",
        back_populates="document",
        lazy="dynamic",
        cascade="all, delete-orphan"
    )


class DocumentVersion(Base):
    __tablename__ = "document_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    
    version_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    
    change_description = Column(Text, nullable=True)
    created_by = Column(String(100), nullable=True)
    
    word_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document = relationship("Document", back_populates="versions")
    
    __table_args__ = (
        Index('ix_document_versions_doc_version', 'document_id', 'version_number', unique=True),
    )


class ProofreadCorrection(Base):
    __tablename__ = "proofread_corrections"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=True)
    
    correction_type = Column(String(100), nullable=False, index=True)
    
    original_text = Column(Text, nullable=False)
    suggested_text = Column(Text, nullable=True)
    
    position_start = Column(Integer, nullable=True)
    position_end = Column(Integer, nullable=True)
    line_number = Column(Integer, nullable=True)
    
    explanation = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    
    severity = Column(String(20), default="minor")
    confidence = Column(Integer, default=80)
    
    is_applied = Column(Integer, default=0)
    is_ignored = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document = relationship("Document", back_populates="corrections")


class FormatIssue(Base):
    __tablename__ = "format_issues"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    
    issue_type = Column(String(100), nullable=False)
    issue_level = Column(String(20), default="warning")
    
    description = Column(Text, nullable=False)
    suggestion = Column(Text, nullable=True)
    
    position_reference = Column(Text, nullable=True)
    line_number = Column(Integer, nullable=True)
    
    is_fixed = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class PolishSuggestion(Base):
    __tablename__ = "polish_suggestions"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    
    category = Column(String(100), nullable=False)
    
    original_phrase = Column(Text, nullable=False)
    suggested_phrase = Column(Text, nullable=False)
    
    position_start = Column(Integer, nullable=True)
    position_end = Column(Integer, nullable=True)
    
    explanation = Column(Text, nullable=True)
    
    is_applied = Column(Integer, default=0)
    is_ignored = Column(Integer, default=0)
    
    confidence = Column(Integer, default=70)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class RedHeadConfig(Base):
    __tablename__ = "red_head_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    config_name = Column(String(200), nullable=False, unique=True)
    
    organization_name = Column(String(500), nullable=False)
    document_type = Column(String(100), nullable=True)
    
    title_font_size = Column(Integer, default=22)
    title_font_family = Column(String(100), default="小标宋体")
    title_alignment = Column(String(20), default="center")
    
    text_font_size = Column(Integer, default=16)
    text_font_family = Column(String(100), default="仿宋_GB2312")
    line_spacing = Column(Integer, default=28)
    
    paragraph_indent = Column(Integer, default=2)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
