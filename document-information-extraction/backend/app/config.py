import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/dbname")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    OCR_MODEL_PATH: str = os.getenv("OCR_MODEL_PATH", "")
    TAX_VERIFICATION_API: str = os.getenv("TAX_VERIFICATION_API", "mock")
    COMPANY_NAME: str = os.getenv("COMPANY_NAME", "默认报销单位")

settings = Settings()
