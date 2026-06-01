from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ARK_API_KEY: str = ""
    ARK_BASE_URL: str = "https://ark.cn-beijing.volces.com/api/v3"
    ARK_MODEL: str = "doubao-seed-1-8-250328"
    DATABASE_URL: str = "sqlite:///./meeting_minutes.db"
    DEBUG: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
