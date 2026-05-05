from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    APP_NAME: str = "MLOps Management Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    MLFLOW_TRACKING_URI: str = "http://localhost:5000"
    MLFLOW_EXPERIMENT_NAME: str = "default"
    
    MONITORING_INTERVAL: int = 5  # seconds
    HISTORY_RETENTION_DAYS: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache
def get_settings() -> Settings:
    return Settings()
