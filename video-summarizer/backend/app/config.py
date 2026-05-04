import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_NAME: str = "Video Summarizer API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./video_summarizer.db")
    
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    OUTPUT_DIR: str = os.getenv("OUTPUT_DIR", "./outputs")
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", "5368709120"))  # 5GB
    
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "base")
    
    FFMPEG_PATH: str = os.getenv("FFMPEG_PATH", "ffmpeg")
    FFPROBE_PATH: str = os.getenv("FFPROBE_PATH", "ffprobe")
    
    KEYFRAME_THRESHOLD: float = float(os.getenv("KEYFRAME_THRESHOLD", "0.3"))
    MAX_KEYFRAMES: int = int(os.getenv("MAX_KEYFRAMES", "50"))
    
    TEXTRANK_TOP_N: int = int(os.getenv("TEXTRANK_TOP_N", "10"))
    
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

settings = Settings()
