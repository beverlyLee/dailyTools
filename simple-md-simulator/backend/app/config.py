import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DEBUG: bool = True
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    DATABASE_URL: str = f"sqlite:///{DATA_DIR / 'md_simulation.db'}"
    
    MAX_TRAJECTORY_FRAMES: int = 10000
    DEFAULT_TIMESTEP: float = 0.001
    DEFAULT_TEMPERATURE: float = 1.0
    DEFAULT_DENSITY: float = 0.8
    DEFAULT_LATTICE_SIZE: int = 5
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

os.makedirs(settings.DATA_DIR, exist_ok=True)
