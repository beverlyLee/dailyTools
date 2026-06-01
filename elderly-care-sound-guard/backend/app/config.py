import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    ARK_API_KEY: str = os.getenv("ARK_API_KEY", "")
    ARK_BASE_URL: str = os.getenv("ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
    ARK_MODEL: str = os.getenv("ARK_MODEL", "doubao-seed-1-8-250328")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    DEFAULT_CONTACTS = [
        {"name": "子女", "phone": "13800138000", "email": "child@example.com", "relation": "primary"},
        {"name": "邻居", "phone": "13900139000", "email": "", "relation": "secondary"},
        {"name": "社区医院", "phone": "120", "email": "", "relation": "emergency"}
    ]

settings = Settings()
