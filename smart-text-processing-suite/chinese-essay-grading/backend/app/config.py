import os
from typing import List
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    PROJECT_NAME: str = "中文作文智能批改系统"
    PROJECT_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    SECRET_KEY: str = "chinese-essay-grading-secret-key"
    
    MYSQL_USER: str = os.environ.get("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.environ.get("MYSQL_PASSWORD", "")
    MYSQL_HOST: str = os.environ.get("MYSQL_HOST", "localhost")
    MYSQL_PORT: int = int(os.environ.get("MYSQL_PORT", 3306))
    MYSQL_DB: str = os.environ.get("MYSQL_DB", "chinese_essay_grading")
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return (
            f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"
            f"?charset=utf8mb4"
        )
    
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    NLP_ENGINE: str = os.environ.get("NLP_ENGINE", "ltp")
    LTP_MODEL_PATH: str = os.environ.get("LTP_MODEL_PATH", "./models/ltp")
    
    MAX_ESSAY_LENGTH: int = 10000
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
