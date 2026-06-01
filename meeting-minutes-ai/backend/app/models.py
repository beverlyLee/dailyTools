from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    transcription = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    topic = Column(String(500), nullable=True)
    decisions = Column(JSON, default=list)
    action_items = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    audio_files = relationship("AudioFile", back_populates="meeting", cascade="all, delete-orphan")


class AudioFile(Base):
    __tablename__ = "audio_files"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"))
    filename = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    duration = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    meeting = relationship("Meeting", back_populates="audio_files")
