from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "常微分方程数值解可视化系统"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    DATABASE_URL: str = "sqlite:///./ode_solver.db"
    
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    MAX_STEPS: int = 10000
    DEFAULT_STEPS: int = 1000
    MAX_PARAM_SCAN_POINTS: int = 100
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
