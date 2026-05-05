from functools import lru_cache
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # 应用配置
    app_name: str = Field(default="企业知识库与问答助手", env="APP_NAME")
    debug: bool = Field(default=True, env="DEBUG")
    version: str = Field(default="1.0.0", env="VERSION")
    
    # 服务器配置
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    
    # 向量数据库配置
    chroma_db_path: str = Field(default="./data/vector_store", env="CHROMA_DB_PATH")
    chroma_collection_name: str = Field(default="enterprise_knowledge", env="CHROMA_COLLECTION_NAME")
    
    # 嵌入模型配置
    embedding_model_name: str = Field(default="all-MiniLM-L6-v2", env="EMBEDDING_MODEL_NAME")
    embedding_model_device: str = Field(default="cpu", env="EMBEDDING_MODEL_DEVICE")
    
    # LLM配置
    llm_type: str = Field(default="local", env="LLM_TYPE")
    local_llm_path: Optional[str] = Field(default=None, env="LOCAL_LLM_PATH")
    local_llm_temperature: float = Field(default=0.7, env="LOCAL_LLM_TEMPERATURE")
    local_llm_max_tokens: int = Field(default=1024, env="LOCAL_LLM_MAX_TOKENS")
    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    openai_model_name: str = Field(default="gpt-3.5-turbo", env="OPENAI_MODEL_NAME")
    
    # 文档处理配置
    chunk_size: int = Field(default=1000, env="CHUNK_SIZE")
    chunk_overlap: int = Field(default=200, env="CHUNK_OVERLAP")
    
    # CORS配置
    cors_origins: str = Field(default="http://localhost:3000,http://localhost:3001", env="CORS_ORIGINS")
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
