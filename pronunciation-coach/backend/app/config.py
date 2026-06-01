from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    volcengine_api_key: str = ""
    volcengine_endpoint: str = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
    volcengine_model: str = ""
    api_timeout: int = 60

    class Config:
        env_file = ".env"

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()
