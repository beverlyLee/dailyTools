from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "Personal Legal Assistant"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    TEMPLATES_DIR: Path = BASE_DIR / "templates"
    DB_PATH: Path = DATA_DIR / "legal_assistant.db"
    
    DATABASE_URL: str = f"sqlite:///{DATA_DIR / 'legal_assistant.db'}"
    
    CORS_ORIGINS: list = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"]
    
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    
    FAISS_INDEX_PATH: Path = DATA_DIR / "cases.index"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

for directory in [
    settings.DATA_DIR,
    settings.TEMPLATES_DIR,
]:
    directory.mkdir(parents=True, exist_ok=True)
