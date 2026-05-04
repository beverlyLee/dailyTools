from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    APP_NAME: str = "Smart Bill Analyzer"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    
    DATABASE_URL: str = "sqlite:///./smart_bill.db"
    
    CATEGORIES: list = [
        "餐饮", "购物", "交通", "娱乐", 
        "居住", "医疗", "教育", "其他"
    ]
    
    MODEL_PATH: str = "./models"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
