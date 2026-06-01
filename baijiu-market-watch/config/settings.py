import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    ARK_API_KEY = os.getenv("ARK_API_KEY", "")
    ARK_MODEL_ENDPOINT = os.getenv("ARK_MODEL_ENDPOINT", "https://ark.cn-beijing.volces.com/api/v3/chat/completions")
    ARK_MODEL = os.getenv("ARK_MODEL", "ep-20241201123456-abcde")
    
    USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "true").lower() == "true"
    CRAWLER_INTERVAL = int(os.getenv("CRAWLER_INTERVAL", 3600))
    CRAWLER_JD_ENABLED = os.getenv("CRAWLER_JD_ENABLED", "true").lower() == "true"
    CRAWLER_TM_ENABLED = os.getenv("CRAWLER_TM_ENABLED", "true").lower() == "true"
    
    # 生成历史价格记录的天数
    HISTORY_PRICE_DAYS = int(os.getenv("HISTORY_PRICE_DAYS", 30))
    
    DATABASE_PATH = os.getenv("DATABASE_PATH", "./data/baijiu.db")
    
    API_HOST = os.getenv("API_HOST", "0.0.0.0")
    API_PORT = int(os.getenv("API_PORT", 8000))

settings = Settings()
