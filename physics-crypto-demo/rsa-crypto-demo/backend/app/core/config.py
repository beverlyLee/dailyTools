from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "RSA 密码学算法演示器"
    VERSION: str = "1.0.0"
    
    CORS_ORIGINS: List[str] = ["http://localhost:3002", "http://localhost:5173", "*"]
    
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./data/rsa_demo.db"
    )
    
    DEFAULT_KEY_SIZE: int = 1024
    DEFAULT_E: int = 65537
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
