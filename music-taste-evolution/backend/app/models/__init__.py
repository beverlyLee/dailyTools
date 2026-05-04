from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    spotify_id = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    listening_history = relationship("ListeningHistory", back_populates="user", cascade="all, delete-orphan")
    audio_features = relationship("AudioFeatures", back_populates="user", cascade="all, delete-orphan")
    monthly_analysis = relationship("MonthlyAnalysis", back_populates="user", cascade="all, delete-orphan")


class ListeningHistory(Base):
    __tablename__ = "listening_history"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    track_id = Column(String, nullable=False, index=True)
    track_name = Column(String, nullable=False)
    artist_name = Column(String, nullable=False)
    artist_id = Column(String, nullable=True)
    album_name = Column(String, nullable=True)
    album_id = Column(String, nullable=True)
    played_at = Column(DateTime, nullable=False, index=True)
    duration_ms = Column(Integer, nullable=True)
    popularity = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="listening_history")


class AudioFeatures(Base):
    __tablename__ = "audio_features"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    track_id = Column(String, unique=True, nullable=False, index=True)
    
    acousticness = Column(Float, nullable=True)
    danceability = Column(Float, nullable=True)
    energy = Column(Float, nullable=True)
    instrumentalness = Column(Float, nullable=True)
    liveness = Column(Float, nullable=True)
    loudness = Column(Float, nullable=True)
    speechiness = Column(Float, nullable=True)
    tempo = Column(Float, nullable=True)
    valence = Column(Float, nullable=True)
    key = Column(Integer, nullable=True)
    mode = Column(Integer, nullable=True)
    time_signature = Column(Integer, nullable=True)
    
    source = Column(String, default="spotify")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="audio_features")


class MonthlyAnalysis(Base):
    __tablename__ = "monthly_analysis"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    month = Column(Integer, nullable=False, index=True)
    
    total_tracks = Column(Integer, default=0)
    avg_acousticness = Column(Float, nullable=True)
    avg_danceability = Column(Float, nullable=True)
    avg_energy = Column(Float, nullable=True)
    avg_instrumentalness = Column(Float, nullable=True)
    avg_liveness = Column(Float, nullable=True)
    avg_loudness = Column(Float, nullable=True)
    avg_speechiness = Column(Float, nullable=True)
    avg_tempo = Column(Float, nullable=True)
    avg_valence = Column(Float, nullable=True)
    
    top_genres = Column(JSON, nullable=True)
    top_artists = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="monthly_analysis")
    
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )
