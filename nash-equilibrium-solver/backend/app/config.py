from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "Nash Equilibrium Solver"
    APP_VERSION: str = "1.0.0"
    DATABASE_URL: str = "sqlite:///./game_theory.db"
    DEBUG: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
