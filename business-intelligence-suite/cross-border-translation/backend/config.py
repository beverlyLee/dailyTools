from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache

class Settings(BaseSettings):
    APP_NAME: str = "跨境商务实时翻译机"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    DATABASE_URL: str = "sqlite+aiosqlite:///./translation.db"
    
    ASR_ENGINE: str = "whisper"
    ASR_MODEL: str = "base"
    
    TRANSLATION_ENGINE: str = "opus"
    SUPPORTED_LANGUAGES: list = ["zh", "en", "ja", "ko"]
    
    TTS_ENGINE: str = "gtts"
    
    OFFLINE_PHRASES_PATH: str = "./data/business_phrases.json"
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
