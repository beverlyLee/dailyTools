from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache

class Settings(BaseSettings):
    APP_NAME: str = "增值税发票智能核验系统"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/invoice_verification"
    
    OCR_ENGINE: str = "paddleocr"
    
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024
    
    VERIFICATION_API_ENABLED: bool = True
    VERIFICATION_API_URL: str = "https://api.example.com/verify"
    
    SUPPORTED_INVOICE_TYPES: list = ["vat_invoice", "train_ticket", "flight_ticket", "receipt"]
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
