from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from .config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    current_content = Column(Text, nullable=False)
    document_type = Column(String(50), default="general")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    versions = relationship("DocumentVersion", back_populates="document")
    corrections = relationship("Correction", back_populates="document")

class DocumentVersion(Base):
    __tablename__ = "document_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    version_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    change_description = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document = relationship("Document", back_populates="versions")

class Correction(Base):
    __tablename__ = "corrections"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=True)
    original_text = Column(Text, nullable=False)
    suggested_text = Column(Text, nullable=False)
    correction_type = Column(String(50), nullable=False)
    category = Column(String(50), nullable=False)
    explanation = Column(Text, nullable=True)
    start_position = Column(Integer, nullable=True)
    end_position = Column(Integer, nullable=True)
    is_applied = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document = relationship("Document", back_populates="corrections")

def init_db():
    Base.metadata.create_all(bind=engine)
