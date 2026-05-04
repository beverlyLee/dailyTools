from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2:7b"
    
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/smart_chatbot"
    
    faiss_index_path: str = "./faiss_index"
    embedding_model: str = "nomic-embed-text"
    
    intent_threshold: float = 0.7
    
    default_agent_email: str = "agent@company.com"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache
def get_settings() -> Settings:
    return Settings()
