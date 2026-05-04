import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "RSA Cryptography Demo"
    API_V1_STR: str = "/api/v1"
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    
    DATABASE_URL: str = f"sqlite:///{DATA_DIR}/rsa_crypto.db"
    
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:5173"]
    
    RSA_DEFAULT_KEY_SIZE: int = 2048
    RSA_DEFAULT_E: int = 65537
    
    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
