from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./smart_platform.db"
    
    OPENAI_API_KEY: Optional[str] = None
    
    BAIDU_API_KEY: Optional[str] = None
    BAIDU_SECRET_KEY: Optional[str] = None
    
    KUNLUN_API_KEY: Optional[str] = None
    
    CONTROLNET_MODEL_PATH: Optional[str] = None
    CONTROLNET_API_URL: Optional[str] = None
    
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
