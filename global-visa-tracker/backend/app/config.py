from pydantic_settings import BaseSettings
from pathlib import Path
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "Global Visa Tracker"
    APP_VERSION: str = "1.0.0"
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOAD_DIR: Path = DATA_DIR / "uploads"
    
    DATABASE_URL: str = f"sqlite:///{DATA_DIR}/visa_tracker.db"
    
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    
    CACHE_TTL_HOURS: int = 24
    
    OCR_LANG: str = "ch"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
