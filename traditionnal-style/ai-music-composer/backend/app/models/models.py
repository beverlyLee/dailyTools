from sqlalchemy import create_engine, Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

from ..config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class Composition(Base):
    __tablename__ = "compositions"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    keywords = Column(String(500), nullable=False)
    
    folk_ratio = Column(Float, default=0.5)
    modern_ratio = Column(Float, default=0.5)
    
    midi_data = Column(Text, nullable=True)
    audio_url = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    is_public = Column(Integer, default=0)
    share_token = Column(String(100), unique=True, nullable=True)
    
    parent_id = Column(Integer, ForeignKey("compositions.id"), nullable=True)
    parent = relationship("Composition", remote_side=[id], backref="derivatives")


class UserPreference(Base):
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), unique=True, index=True)
    
    default_folk_ratio = Column(Float, default=0.5)
    default_modern_ratio = Column(Float, default=0.5)
    preferred_model = Column(String(50), default="baidu")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
