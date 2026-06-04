from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    lianjia_cookie: str = ""
    anjuke_cookie: str = ""
    amap_api_key: str = ""
    amap_secret: str = ""
    db_path: str = "./src/data/school_district.db"

    class Config:
        env_file = ".env"


settings = Settings()
