from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "植物病害识别系统"
    
    # 数据库配置
    DATABASE_URL: str = "sqlite:///./plant_disease.db"
    
    # 模型配置
    MODEL_PATH: str = "./models/plant_disease_model.pt"
    MODEL_FORMAT: str = "pt"  # pt 或 onnx
    
    # 图片处理配置
    IMAGE_SIZE: int = 224
    NORMALIZE_MEAN: list = [0.485, 0.456, 0.406]
    NORMALIZE_STD: list = [0.229, 0.224, 0.225]
    
    # 病害类别配置
    DISEASE_CLASSES: list = [
        "健康",
        "番茄早疫病",
        "番茄晚疫病",
        "番茄叶霉病",
        "番茄灰霉病",
        "黄瓜霜霉病",
        "黄瓜白粉病",
        "黄瓜炭疽病",
        "苹果腐烂病",
        "苹果炭疽病",
        "苹果轮纹病",
        "葡萄白粉病",
        "葡萄霜霉病",
        "葡萄炭疽病"
    ]
    
    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
