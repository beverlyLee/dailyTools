import os
from typing import List
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    APP_NAME: str = "Real-Time Translator"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/translator.db"
    API_PREFIX: str = "/api/v1"
    CORS_ORIGINS: List[str] = Field(default_factory=lambda: ["http://localhost:8080", "http://localhost:5173"])
    ASR_MODEL_NAME: str = "base"
    TTS_VOICE_NAME: str = "zh-CN-XiaoxiaoNeural"
    TRANSLATION_MODEL_CACHE_DIR: str = "./models/translation"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
