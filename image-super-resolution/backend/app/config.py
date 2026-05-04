from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    APP_NAME: str = "Image Super Resolution API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/super_resolution.db"
    
    UPLOAD_DIR: str = "./data/uploads"
    OUTPUT_DIR: str = "./data/outputs"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024
    
    MODEL_DIR: str = "./models"
    DEFAULT_MODEL: str = "RealESRGAN_x4plus"
    
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:5173"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()


def ensure_directories():
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
    os.makedirs(settings.MODEL_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(settings.DATABASE_URL.replace("sqlite+aiosqlite:///", "")), exist_ok=True)
