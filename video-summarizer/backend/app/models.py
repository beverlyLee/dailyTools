from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Video(Base):
    __tablename__ = "videos"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), index=True)
    original_filename = Column(String(255))
    file_path = Column(String(500))
    file_size = Column(Integer)
    duration = Column(Float)
    width = Column(Integer)
    height = Column(Integer)
    fps = Column(Float)
    
    status = Column(String(50), default="pending")
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    transcript = relationship("Transcript", back_populates="video", uselist=False)
    keyframes = relationship("Keyframe", back_populates="video")
    summary = relationship("Summary", back_populates="video", uselist=False)


class Transcript(Base):
    __tablename__ = "transcripts"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), unique=True, index=True)
    full_text = Column(Text)
    language = Column(String(10), default="zh")
    processed_at = Column(DateTime, default=datetime.utcnow)
    
    video = relationship("Video", back_populates="transcript")
    segments = relationship("TranscriptSegment", back_populates="transcript")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"
    
    id = Column(Integer, primary_key=True, index=True)
    transcript_id = Column(Integer, ForeignKey("transcripts.id"), index=True)
    start_time = Column(Float)
    end_time = Column(Float)
    text = Column(Text)
    confidence = Column(Float, default=1.0)
    
    transcript = relationship("Transcript", back_populates="segments")


class Keyframe(Base):
    __tablename__ = "keyframes"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), index=True)
    timestamp = Column(Float)
    frame_path = Column(String(500))
    frame_number = Column(Integer)
    similarity_score = Column(Float, default=0.0)
    description = Column(Text, nullable=True)
    
    video = relationship("Video", back_populates="keyframes")


class Summary(Base):
    __tablename__ = "summaries"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), unique=True, index=True)
    summary_text = Column(Text)
    key_points = Column(Text)
    processed_at = Column(DateTime, default=datetime.utcnow)
    
    video = relationship("Video", back_populates="summary")
