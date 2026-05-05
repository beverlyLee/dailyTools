import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "数据叙事平台"
    API_V1_STR: str = "/api/v1"
    
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.example.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "noreply@example.com")
    
    DATA_DIR: str = os.path.join(os.path.dirname(__file__), "..", "data")
    TEMPLATES_DIR: str = os.path.join(os.path.dirname(__file__), "..", "templates")
    OUTPUT_DIR: str = os.path.join(os.path.dirname(__file__), "..", "output")

settings = Settings()

def create_directories():
    os.makedirs(settings.DATA_DIR, exist_ok=True)
    os.makedirs(settings.TEMPLATES_DIR, exist_ok=True)
    os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
