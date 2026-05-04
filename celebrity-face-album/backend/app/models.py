from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, LargeBinary
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Celebrity(Base):
    __tablename__ = "celebrities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    face_encoding = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    face_detections = relationship("FaceDetection", back_populates="celebrity")
    photos = relationship(
        "Photo",
        secondary="photo_celebrity",
        back_populates="celebrities"
    )


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    content_type = Column(String(100), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    face_detections = relationship("FaceDetection", back_populates="photo", cascade="all, delete-orphan")
    celebrities = relationship(
        "Celebrity",
        secondary="photo_celebrity",
        back_populates="photos"
    )


class FaceDetection(Base):
    __tablename__ = "face_detections"

    id = Column(Integer, primary_key=True, index=True)
    photo_id = Column(Integer, ForeignKey("photos.id", ondelete="CASCADE"), nullable=False)
    celebrity_id = Column(Integer, ForeignKey("celebrities.id"), nullable=True)
    face_encoding = Column(LargeBinary, nullable=False)
    location_x = Column(Integer, nullable=False)
    location_y = Column(Integer, nullable=False)
    location_width = Column(Integer, nullable=False)
    location_height = Column(Integer, nullable=False)
    similarity = Column(Float, nullable=True)
    celebrity_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    photo = relationship("Photo", back_populates="face_detections")
    celebrity = relationship("Celebrity", back_populates="face_detections")


class PhotoCelebrity(Base):
    __tablename__ = "photo_celebrity"

    id = Column(Integer, primary_key=True, index=True)
    photo_id = Column(Integer, ForeignKey("photos.id", ondelete="CASCADE"), nullable=False)
    celebrity_id = Column(Integer, ForeignKey("celebrities.id", ondelete="CASCADE"), nullable=False)
    similarity = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
