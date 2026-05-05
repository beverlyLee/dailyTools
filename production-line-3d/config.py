"""
产线 3D 监控服务配置文件
"""

import os

class Config:
    WEBSOCKET_HOST = os.getenv('PL3D_WS_HOST', 'localhost')
    WEBSOCKET_PORT = int(os.getenv('PL3D_WS_PORT', 8765))
    
    DJANGO_API_BASE_URL = os.getenv('DJANGO_API_URL', 'http://localhost:8000/api')
    
    UNITY_ASSET_PATH = os.getenv('UNITY_ASSETS', './Unity/Assets')
    MODEL_PATH = os.getenv('MODEL_PATH', './models')
    
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    
    PLC_UPDATE_INTERVAL = float(os.getenv('PLC_UPDATE_INTERVAL', 1.0))
    
    STATUS_COLORS = {
        'running': '#4CAF50',
        'stopped': '#9E9E9E',
        'fault': '#F44336',
        'maintenance': '#FF9800'
    }
    
    COMPONENT_STATUS_COLORS = {
        'normal': '#4CAF50',
        'warning': '#FF9800',
        'fault': '#F44336'
    }
