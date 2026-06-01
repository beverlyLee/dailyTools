import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    GAODE_API_KEY = os.getenv("GAODE_API_KEY", "")
    JUHE_API_KEY = os.getenv("JUHE_API_KEY", "")
    VOLCENGINE_API_KEY = os.getenv("VOLCENGINE_API_KEY", "")
    VOLCENGINE_MODEL_ID = os.getenv("VOLCENGINE_MODEL_ID", "")
    
    GAODE_BASE_URL = "https://restapi.amap.com"
    JUHE_BASE_URL = "http://apis.juhe.cn"
    
    CITIES = {
        "beijing": {
            "name": "北京",
            "adcode": "110000",
            "districts": ["朝阳区", "海淀区", "东城区", "西城区", "丰台区", "通州区", "大兴区", "昌平区", "顺义区", "房山区"]
        },
        "shanghai": {
            "name": "上海",
            "adcode": "310000",
            "districts": ["浦东新区", "黄浦区", "静安区", "徐汇区", "长宁区", "普陀区", "虹口区", "杨浦区", "宝山区", "闵行区"]
        }
    }
    
    AREAS = {
        "beijing": [
            {"name": "回龙观", "district": "昌平区", "lat": 40.0799, "lng": 116.3381},
            {"name": "天通苑", "district": "昌平区", "lat": 40.0699, "lng": 116.4059},
            {"name": "西二旗", "district": "海淀区", "lat": 40.0572, "lng": 116.3063},
            {"name": "望京", "district": "朝阳区", "lat": 39.9934, "lng": 116.4802},
            {"name": "中关村", "district": "海淀区", "lat": 39.9847, "lng": 116.3046},
            {"name": "国贸", "district": "朝阳区", "lat": 39.9087, "lng": 116.4605},
            {"name": "亦庄", "district": "大兴区", "lat": 39.7817, "lng": 116.5047},
            {"name": "通州北苑", "district": "通州区", "lat": 39.9088, "lng": 116.6561},
        ]
    }
