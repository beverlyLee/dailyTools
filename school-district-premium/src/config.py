from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        extra='ignore',
        env_file='.env',
    )
    
    lianjia_cookie: str = ""
    anjuke_cookie: str = ""
    amap_api_key: str = ""
    amap_secret: str = ""
    db_path: str = "./src/data/school_district.db"
    gaode_geocode_key: str = ""
    gaode_js_api_key: str = ""


settings = Settings()
