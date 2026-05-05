import os
from pydantic_settings import BaseSettings
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    DEBUG: bool = True
    APP_NAME: str = "物理模拟与博弈论求解平台"
    VERSION: str = "1.0.0"
    
    DATABASE_URL: str = "sqlite:///./physics_game_theory.db"
    
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    
    MD_DEFAULT_UNIT_CELLS: int = 5
    MD_DEFAULT_DENSITY: float = 0.8
    MD_DEFAULT_TEMPERATURE: float = 1.0
    MD_DEFAULT_TIMESTEP: float = 0.001
    MD_DEFAULT_MASS: float = 1.0
    MD_DEFAULT_EPSILON: float = 1.0
    MD_DEFAULT_SIGMA: float = 1.0
    MD_DEFAULT_CUTOFF: float = 2.5
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
