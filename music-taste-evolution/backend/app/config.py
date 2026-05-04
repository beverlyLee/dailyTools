from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    APP_NAME: str = "Music Taste Evolution"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/music_taste.db"
    
    SPOTIFY_CLIENT_ID: Optional[str] = os.getenv("SPOTIFY_CLIENT_ID")
    SPOTIFY_CLIENT_SECRET: Optional[str] = os.getenv("SPOTIFY_CLIENT_SECRET")
    SPOTIFY_REDIRECT_URI: str = "http://localhost:8000/api/auth/callback"
    
    CACHE_DIR: str = "./cache"
    CACHE_TTL_HOURS: int = 24
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
