from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    image_histories = relationship("ImageGenerationHistory", back_populates="user")
    music_histories = relationship("MusicGenerationHistory", back_populates="user")


class ImageGenerationHistory(Base):
    __tablename__ = "image_generation_histories"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    original_image_path = Column(String(500), nullable=False)
    style_type = Column(String(50), nullable=False)
    generated_image_path = Column(String(500), nullable=True)
    keypoints_data = Column(Text, nullable=True)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    user = relationship("User", back_populates="image_histories")


class MusicGenerationHistory(Base):
    __tablename__ = "music_generation_histories"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    prompt = Column(Text, nullable=False)
    folk_ratio = Column(Float, default=0.5)
    modernity = Column(Float, default=0.5)
    generated_audio_path = Column(String(500), nullable=True)
    midi_data = Column(Text, nullable=True)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    user = relationship("User", back_populates="music_histories")


class FinancialReport(Base):
    __tablename__ = "financial_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    company = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    quarter = Column(Integer, nullable=False)
    revenue = Column(Float, nullable=False)
    profit = Column(Float, nullable=False)
    net_income = Column(Float, nullable=False)
    total_assets = Column(Float, nullable=True)
    total_liabilities = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
