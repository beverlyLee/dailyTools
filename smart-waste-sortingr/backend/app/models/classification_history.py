from sqlalchemy import Column, Integer, String, DateTime, Float
from sqlalchemy.sql import func

from app.database import Base


class ClassificationHistory(Base):
    __tablename__ = "classification_history"

    id = Column(Integer, primary_key=True, index=True)
    image_path = Column(String(255), nullable=True)
    predicted_item = Column(String(100), nullable=False)
    waste_category = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=False)
    disposal_guide = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
