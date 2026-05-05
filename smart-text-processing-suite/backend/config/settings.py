from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "智能文本处理与校对系统"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", 3306))
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DATABASE: str = os.getenv("MYSQL_DATABASE", "smart_text")
    
    SQLITE_PATH: str = os.getenv("SQLITE_PATH", "../data/documents.db")
    
    @property
    def MYSQL_DATABASE_URL(self) -> str:
        return (
            f"mysql+aiomysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"
        )
    
    @property
    def SQLITE_DATABASE_URL(self) -> str:
        return f"sqlite+aiosqlite:///{self.SQLITE_PATH}"


settings = Settings()
