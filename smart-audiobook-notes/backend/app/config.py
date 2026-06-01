import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings:
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")
    OUTPUT_DIR: str = str(BASE_DIR / "outputs")
    CHUNKS_DIR: str = str(BASE_DIR / "chunks")
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'smart_audiobook.db'}"
    
settings = Settings()
