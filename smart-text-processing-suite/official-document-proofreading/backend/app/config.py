import os
from typing import List
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    PROJECT_NAME: str = "公文写作智能校对系统"
    PROJECT_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    SECRET_KEY: str = "official-document-proofreading-secret-key"
    
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL", 
        "sqlite:///./data/documents.db"
    )
    
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    USE_BERT_MODEL: bool = os.environ.get("USE_BERT_MODEL", "false").lower() == "true"
    BERT_MODEL_PATH: str = os.environ.get("BERT_MODEL_PATH", "hfl/chinese-roberta-wwm-ext")
    
    MAX_DOCUMENT_LENGTH: int = 50000
    
    DATA_DIR: str = os.environ.get("DATA_DIR", "./data")
    VERSIONS_DIR: str = os.environ.get("VERSIONS_DIR", "./data/versions")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
