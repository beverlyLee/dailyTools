from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "招聘市场年龄歧视分析系统"
    
    DATA_FILE_PATH: str = "data/recruitment_data_500.csv"
    
    VOLCENGINE_API_KEY: Optional[str] = None
    VOLCENGINE_MODEL_NAME: str = "doubao-seed-1-8-251228"
    VOLCENGINE_API_ENDPOINT: str = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
    
    CORS_ORIGINS: list = ["http://localhost:8501", "http://127.0.0.1:8501"]
    
    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
