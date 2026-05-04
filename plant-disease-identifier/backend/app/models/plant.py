from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base


class Plant(Base):
    __tablename__ = "plants"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # 植物名称
    plant_type = Column(String(100), nullable=False)  # 植物类型
    planting_date = Column(DateTime, nullable=False)  # 种植时间
    location = Column(String(200))  # 种植位置
    notes = Column(Text)  # 备注信息
    current_health_status = Column(String(50), default="健康")  # 当前健康状况
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    health_records = relationship("HealthRecord", back_populates="plant", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Plant {self.name}>"


class HealthRecord(Base):
    __tablename__ = "health_records"
    
    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=False)
    
    # 健康检查信息
    check_date = Column(DateTime, default=datetime.utcnow)
    health_status = Column(String(50), default="健康")
    identified_disease = Column(String(100))  # 识别出的病害
    confidence = Column(String(20))  # 识别置信度
    
    # 图片信息
    image_url = Column(Text)  # 图片URL或路径
    
    # 防治建议
    treatment_suggestion = Column(Text)  # 防治建议
    
    # 备注
    notes = Column(Text)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    plant = relationship("Plant", back_populates="health_records")
    
    def __repr__(self):
        return f"<HealthRecord plant_id={self.plant_id} date={self.check_date}>"
