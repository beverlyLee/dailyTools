from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "房价走势线性回归预测器"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    DATABASE_URL: str = "sqlite:///./house_price.db"
    
    CORS_ORIGINS: List[str] = [
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    MODEL_FILE_PATH: str = "./models/house_price_model.pkl"
    SCALER_FILE_PATH: str = "./models/scaler.pkl"
    DATA_FILE_PATH: str = "./data/house_price_data.csv"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
