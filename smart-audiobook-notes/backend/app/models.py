from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class AudioBook(Base):
    __tablename__ = "audiobooks"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, unique=True, index=True)
    original_filename = Column(String)
    file_path = Column(String)
    file_size = Column(Float)
    duration = Column(Float)
    status = Column(String, default="pending")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    chunks = relationship("AudioChunk", back_populates="audiobook")
    notes = relationship("AudiobookNote", back_populates="audiobook", uselist=False)

class AudioChunk(Base):
    __tablename__ = "audio_chunks"

    id = Column(Integer, primary_key=True, index=True)
    audiobook_id = Column(Integer, ForeignKey("audiobooks.id"))
    chunk_index = Column(Integer)
    start_time = Column(Float)
    end_time = Column(Float)
    file_path = Column(String)
    transcript = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    audiobook = relationship("AudioBook", back_populates="chunks")

class AudiobookNote(Base):
    __tablename__ = "audiobook_notes"

    id = Column(Integer, primary_key=True, index=True)
    audiobook_id = Column(Integer, ForeignKey("audiobooks.id"), unique=True)
    topic = Column(String)
    summary = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    audiobook = relationship("AudioBook", back_populates="notes")
    chapters = relationship("ChapterNote", back_populates="note")
    key_points = relationship("KeyPoint", back_populates="note")
    mind_map = relationship("MindMap", back_populates="note", uselist=False)

class ChapterNote(Base):
    __tablename__ = "chapter_notes"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("audiobook_notes.id"))
    title = Column(String)
    timestamp = Column(Float)
    content = Column(Text)
    order_index = Column(Integer)

    note = relationship("AudiobookNote", back_populates="chapters")

class KeyPoint(Base):
    __tablename__ = "key_points"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("audiobook_notes.id"))
    content = Column(Text)
    timestamp = Column(Float)
    order_index = Column(Integer)

    note = relationship("AudiobookNote", back_populates="key_points")

class MindMap(Base):
    __tablename__ = "mind_maps"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("audiobook_notes.id"), unique=True)
    nodes_data = Column(Text)
    edges_data = Column(Text)

    note = relationship("AudiobookNote", back_populates="mind_map")
