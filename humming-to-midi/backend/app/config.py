from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    cors_origins: str = "http://localhost:3000"

    class Config:
        env_file = ".env"

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()
