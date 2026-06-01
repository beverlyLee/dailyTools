import os
from dotenv import load_dotenv


load_dotenv()


class Config:
    
    GAODE_API_KEY = os.getenv('GAODE_API_KEY', os.getenv('AMAP_AK', ''))
    AMAP_VERSION = os.getenv('AMAP_VERSION', '2.0')
    
    DATA_SYNC_INTERVAL_HOURS = int(os.getenv('DATA_SYNC_INTERVAL_HOURS', '24'))
    
    LIANJIA_API_BASE = os.getenv('LIANJIA_API_BASE', 'https://bj.lianjia.com')
    ANJUKE_API_BASE = os.getenv('ANJUKE_API_BASE', 'https://beijing.anjuke.com')
    
    DASH_DEBUG = os.getenv('DASH_DEBUG', 'True').lower() == 'true'
    DASH_PORT = int(os.getenv('DASH_PORT', '8050'))
    DASH_HOST = os.getenv('DASH_HOST', '127.0.0.1')
    
    ENABLE_HEATMAP = os.getenv('ENABLE_HEATMAP', 'True').lower() == 'true'
    HEATMAP_RADIUS = int(os.getenv('HEATMAP_RADIUS', '50'))
    HEATMAP_OPACITY = float(os.getenv('HEATMAP_OPACITY', '0.8'))
    
    @classmethod
    def is_amap_configured(cls):
        return bool(cls.GAODE_API_KEY)
    
    @classmethod
    def get_amap_js_url(cls):
        return f"https://webapi.amap.com/maps?v={cls.AMAP_VERSION}&key={cls.GAODE_API_KEY}&plugin=AMap.Heatmap"


config = Config()
