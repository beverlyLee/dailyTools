import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    APP_NAME: str = "国风服饰虚拟换装应用"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = Field(default=False, env="DEBUG")

    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent

    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./database/fashion_style.db",
        env="DATABASE_URL"
    )

    UPLOAD_DIR: Path = Field(default=Path("./data/uploads"), env="UPLOAD_DIR")
    OUTPUT_DIR: Path = Field(default=Path("./data/outputs"), env="OUTPUT_DIR")
    MODELS_DIR: Path = Field(default=Path("./models"), env="MODELS_DIR")
    LOGS_DIR: Path = Field(default=Path("./logs"), env="LOGS_DIR")

    MAX_UPLOAD_SIZE: int = Field(default=10 * 1024 * 1024, env="MAX_UPLOAD_SIZE")
    ALLOWED_EXTENSIONS: List[str] = Field(
        default=["jpg", "jpeg", "png", "webp"],
        env="ALLOWED_EXTENSIONS"
    )

    API_HOST: str = Field(default="0.0.0.0", env="API_HOST")
    API_PORT: int = Field(default=8000, env="API_PORT")

    CONTROLNET_MODEL: str = Field(
        default="lllyasviel/sd-controlnet-openpose",
        env="CONTROLNET_MODEL"
    )
    BASE_MODEL: str = Field(
        default="runwayml/stable-diffusion-v1-5",
        env="BASE_MODEL"
    )
    DEVICE: str = Field(default="cuda", env="DEVICE")

    OLLAMA_URL: str = Field(default="http://localhost:11434", env="OLLAMA_URL")
    OLLAMA_MODEL: Optional[str] = Field(default=None, env="OLLAMA_MODEL")

    HF_TOKEN: Optional[str] = Field(default=None, env="HF_TOKEN")
    MODELSCOPE_TOKEN: Optional[str] = Field(default=None, env="MODELSCOPE_TOKEN")

    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FILE: Optional[str] = Field(default=None, env="LOG_FILE")

    CORS_ORIGINS: List[str] = Field(
        default=["*"],
        env="CORS_ORIGINS"
    )
    CORS_CREDENTIALS: bool = Field(default=True, env="CORS_CREDENTIALS")
    CORS_METHODS: List[str] = Field(
        default=["*"],
        env="CORS_METHODS"
    )
    CORS_HEADERS: List[str] = Field(
        default=["*"],
        env="CORS_HEADERS"
    )

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._create_directories()

    def _create_directories(self):
        directories = [
            self.UPLOAD_DIR,
            self.OUTPUT_DIR,
            self.MODELS_DIR,
            self.LOGS_DIR,
            self.BASE_DIR / "database",
        ]
        for directory in directories:
            if isinstance(directory, str):
                directory = Path(directory)
            directory.mkdir(parents=True, exist_ok=True)

    def get_absolute_path(self, relative_path: str) -> Path:
        return self.BASE_DIR / relative_path

    def get_upload_path(self, filename: str) -> Path:
        return self.UPLOAD_DIR / filename

    def get_output_path(self, filename: str) -> Path:
        return self.OUTPUT_DIR / filename

    def get_model_path(self, model_name: str) -> Path:
        return self.MODELS_DIR / model_name


settings = Settings()
