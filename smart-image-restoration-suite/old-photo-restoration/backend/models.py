from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from database import Base


class HistoryItem(Base):
    __tablename__ = "history_items"

    id = Column(Integer, primary_key=True, index=True)
    source_image = Column(Text, nullable=True)
    result_image = Column(Text, nullable=False)
    model = Column(String(100), nullable=False)
    scale = Column(Integer, default=4)
    enable_inpainting = Column(Boolean, default=True)
    enable_colorization = Column(Boolean, default=False)
    mask_data = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
