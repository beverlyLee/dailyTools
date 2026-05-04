import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "Batch Image Processor"
    VERSION: str = "1.0.0"
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/image_processor.db")
    
    MAX_FILE_SIZE: int = 50 * 1024 * 1024
    ALLOWED_IMAGE_TYPES: list = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"]
    
    TEMP_DIR: str = os.getenv("TEMP_DIR", "./temp")
    OUTPUT_DIR: str = os.getenv("OUTPUT_DIR", "./output")
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

os.makedirs(settings.TEMP_DIR, exist_ok=True)
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.dirname(settings.DATABASE_URL.replace("sqlite:///", "")), exist_ok=True)
