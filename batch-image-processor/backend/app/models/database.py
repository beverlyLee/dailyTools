from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/image_processor.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class RenameRule(Base):
    __tablename__ = "rename_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    
    use_sequence = Column(Boolean, default=True)
    sequence_start = Column(Integer, default=1)
    sequence_padding = Column(Integer, default=4)
    sequence_prefix = Column(String, default="")
    sequence_suffix = Column(String, default="")
    
    use_date = Column(Boolean, default=False)
    date_format = Column(String, default="%Y%m%d")
    date_source = Column(String, default="file_modified")
    
    use_exif = Column(Boolean, default=False)
    exif_fields = Column(String, nullable=True)
    
    use_custom_text = Column(Boolean, default=False)
    custom_text = Column(String, default="")
    custom_text_position = Column(String, default="prefix")
    
    separator = Column(String, default="_")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ProcessingHistory(Base):
    __tablename__ = "processing_history"
    
    id = Column(Integer, primary_key=True, index=True)
    original_filename = Column(String)
    new_filename = Column(String)
    original_path = Column(String)
    output_path = Column(String)
    
    resize_width = Column(Integer, nullable=True)
    resize_height = Column(Integer, nullable=True)
    resize_keep_aspect = Column(Boolean, default=True)
    
    crop_x = Column(Integer, nullable=True)
    crop_y = Column(Integer, nullable=True)
    crop_width = Column(Integer, nullable=True)
    crop_height = Column(Integer, nullable=True)
    
    rotation_angle = Column(Float, default=0.0)
    
    output_format = Column(String, default="original")
    output_quality = Column(Integer, default=90)
    
    watermark_type = Column(String, nullable=True)
    watermark_text = Column(String, nullable=True)
    watermark_image_path = Column(String, nullable=True)
    watermark_position = Column(String, default="bottom_right")
    watermark_opacity = Column(Float, default=0.5)
    watermark_size = Column(Integer, default=32)
    
    rule_id = Column(Integer, nullable=True)
    
    processed_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="success")
    error_message = Column(String, nullable=True)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
