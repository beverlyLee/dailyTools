from pydantic_settings import BaseSettings
from typing import List
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    # 数据库配置
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/data/npc_dialogue.db"
    
    # CORS配置
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # LLM配置 - 火山引擎豆包模型
    LLM_PROVIDER: str = "volcengine"  # "volcengine" 或 "ollama"
    VOLCENGINE_API_KEY: str = os.getenv("VOLCENGINE_API_KEY", "")
    VOLCENGINE_ENDPOINT_ID: str = os.getenv("VOLCENGINE_ENDPOINT_ID", "doubao-seed-2-0-code-preview-260215")
    
    # Ollama配置（本地模型）
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama2"
    
    # RAG配置
    KNOWLEDGE_BASE_PATH: str = str(BASE_DIR / "data" / "knowledge")
    VECTOR_STORE_PATH: str = str(BASE_DIR / "data" / "vector_store")
    
    # 对话配置
    MAX_MEMORY_TOKENS: int = 2000
    MAX_HISTORY_LENGTH: int = 10
    
    class Config:
        env_file = str(BASE_DIR / ".env")
        extra = "ignore"

settings = Settings()
