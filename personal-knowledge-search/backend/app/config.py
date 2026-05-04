from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "Personal Knowledge Search"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    INDEX_DIR: Path = DATA_DIR / "whoosh_index"
    FAISS_INDEX_PATH: Path = DATA_DIR / "faiss.index"
    DOCUMENTS_DIR: Path = DATA_DIR / "documents"
    SCREENSHOTS_DIR: Path = DATA_DIR / "screenshots"
    
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    
    WHOOSH_INDEX_SIZE: int = 1000
    
    CORS_ORIGINS: list = ["http://localhost:5173", "http://127.0.0.1:5173"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

for directory in [
    settings.DATA_DIR,
    settings.INDEX_DIR,
    settings.DOCUMENTS_DIR,
    settings.SCREENSHOTS_DIR,
]:
    directory.mkdir(parents=True, exist_ok=True)
