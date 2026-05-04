from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "Markdown Knowledge Base"
    APP_VERSION: str = "1.0.0"
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent
    NOTES_DIR: Path = BASE_DIR / "notes"
    DATABASE_URL: str = f"sqlite+aiosqlite:///{BASE_DIR / 'knowledge.db'}"
    INDEX_DIR: Path = BASE_DIR / "search_index"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# 确保必要的目录存在
settings.NOTES_DIR.mkdir(parents=True, exist_ok=True)
settings.INDEX_DIR.mkdir(parents=True, exist_ok=True)
