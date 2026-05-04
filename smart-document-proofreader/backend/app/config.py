import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "公文写作智能校对系统"
    PROJECT_VERSION: str = "1.0.0"
    
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./data/document_proofreader.db"
    )
    
    MODEL_NAME: str = os.getenv("MODEL_NAME", "bert-base-chinese")
    USE_GPU: bool = os.getenv("USE_GPU", "false").lower() == "true"
    
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]

settings = Settings()
