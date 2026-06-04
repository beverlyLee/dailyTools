import os
from dotenv import load_dotenv

load_dotenv()

GAODE_API_KEY = os.getenv("GAODE_API_KEY", "")
GAODE_JS_API_KEY = os.getenv("GAODE_JS_API_KEY", "")
DATA_MODE = os.getenv("DATA_MODE", "demo")
USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "true").lower() == "true"
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

CITIES = {
    "北京": {
        "districts": ["朝阳区", "海淀区", "东城区", "西城区", "丰台区", "通州区"],
        "center": {"lat": 39.9042, "lng": 116.4074}
    },
    "上海": {
        "districts": ["黄浦区", "静安区", "徐汇区", "长宁区", "浦东新区", "虹口区"],
        "center": {"lat": 31.2304, "lng": 121.4737}
    },
    "成都": {
        "districts": ["锦江区", "青羊区", "金牛区", "武侯区", "成华区"],
        "center": {"lat": 30.5728, "lng": 104.0668}
    },
    "广州": {
        "districts": ["天河区", "越秀区", "海珠区", "荔湾区", "番禺区"],
        "center": {"lat": 23.1291, "lng": 113.2644}
    },
    "武汉": {
        "districts": ["洪山区", "武昌区", "江汉区", "江岸区", "汉阳区"],
        "center": {"lat": 30.5928, "lng": 114.3055}
    }
}

CLUSTER_LABELS = {
    0: "硬核推理区",
    1: "恐怖惊悚区",
    2: "欢乐机制区",
    3: "情感沉浸区",
    4: "阵营对抗区"
}

CLUSTER_COLORS = {
    0: "#e74c3c",
    1: "#8e44ad",
    2: "#f39c12",
    3: "#3498db",
    4: "#2ecc71"
}

RADAR_DIMENSIONS = ["硬核推理", "恐怖惊悚", "欢乐机制", "情感沉浸", "阵营对抗"]
