from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "AI Music Composer"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    DATABASE_URL: str = "sqlite:///./data/music_composer.db"
    
    BAIDU_API_KEY: Optional[str] = None
    BAIDU_SECRET_KEY: Optional[str] = None
    BAIDU_ACCESS_TOKEN: Optional[str] = None
    
    KUNLUN_API_KEY: Optional[str] = None
    
    MUSIC_GENERATION_MODEL: str = "baidu"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
