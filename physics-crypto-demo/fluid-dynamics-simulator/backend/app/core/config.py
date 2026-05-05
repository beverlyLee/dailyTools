from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "Fluid Dynamics Simulator - LBM D2Q9"
    VERSION: str = "1.0.0"
    
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "*"]
    
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./data/cfd_simulations.db"
    )
    
    TAICHI_ARCH: str = os.getenv("TAICHI_ARCH", "cpu")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
