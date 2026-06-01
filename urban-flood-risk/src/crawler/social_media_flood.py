import os
import json
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()
DATA_MODE = os.getenv('DATA_MODE', 'mock')

class SocialMediaFloodCrawler:
    def __init__(self):
        self.mock_data = self._generate_mock_data()
    
    def _generate_mock_data(self) -> List[Dict[str, Any]]:
        base_points = [
            {"name": "建国门立交桥", "lat": 39.9075, "lng": 116.4215, "risk_level": "high"},
            {"name": "西直门立交桥", "lat": 39.9595, "lng": 116.3585, "risk_level": "high"},
            {"name": "国贸桥", "lat": 39.9042, "lng": 116.4716, "risk_level": "high"},
            {"name": "三元桥", "lat": 39.9962, "lng": 116.4705, "risk_level": "medium"},
            {"name": "四惠桥", "lat": 39.9080, "lng": 116.4860, "risk_level": "medium"},
            {"name": "天通苑", "lat": 40.0520, "lng": 116.4030, "risk_level": "low"},
            {"name": "望京", "lat": 39.9980, "lng": 116.4780, "risk_level": "low"},
            {"name": "中关村", "lat": 39.9895, "lng": 116.3050, "risk_level": "medium"},
            {"name": "五道口", "lat": 39.9965, "lng": 116.3185, "risk_level": "medium"},
            {"name": "积水潭", "lat": 39.9575, "lng": 116.3700, "risk_level": "high"},
            {"name": "广渠门桥", "lat": 39.8955, "lng": 116.4265, "risk_level": "high"},
            {"name": "菜户营桥", "lat": 39.8780, "lng": 116.3680, "risk_level": "medium"},
        ]
        
        reports = []
        for point in base_points:
            num_reports = random.randint(5, 50) if point["risk_level"] == "high" else \
                         random.randint(2, 20) if point["risk_level"] == "medium" else \
                         random.randint(1, 5)
            
            for _ in range(num_reports):
                date = datetime.now() - timedelta(days=random.randint(0, 365))
                reports.append({
                    "id": f"report_{random.randint(10000, 99999)}",
                    "location_name": point["name"],
                    "latitude": point["lat"] + random.uniform(-0.005, 0.005),
                    "longitude": point["lng"] + random.uniform(-0.005, 0.005),
                    "risk_level": point["risk_level"],
                    "water_depth": round(random.uniform(0.1, 1.5), 2),
                    "image_url": f"https://neeko-copilot.bytedance.net/api/text_to_image?prompt=flood%20street%20urban%20water%20logging%20heavy%20rain&image_size=portrait_4_3",
                    "description": self._generate_description(point["name"]),
                    "created_at": date.isoformat(),
                    "source": random.choice(["weibo", "wechat", "other"])
                })
        return reports
    
    def _generate_description(self, location_name: str) -> str:
        templates = [
            f"{location_name}又积水了，已经到膝盖了！",
            f"暴雨导致{location_name}严重积水，车辆无法通行",
            f"{location_name}桥下积水严重，请绕行！",
            f"路过{location_name}看到积水很深，提醒大家注意安全",
            f"{location_name}再次成为泽国，市政部门快来处理！",
            f"雨天的{location_name}，又开启看海模式",
            f"{location_name}积水超过30厘米，行人请注意",
        ]
        return random.choice(templates)
    
    def crawl_flood_reports(self, city: str = "北京") -> List[Dict[str, Any]]:
        if DATA_MODE == 'mock':
            return self.mock_data
        else:
            return self._crawl_real_data(city)
    
    def _crawl_real_data(self, city: str) -> List[Dict[str, Any]]:
        return []
    
    def get_reports_by_location(self, lat: float, lng: float, radius: float = 0.01) -> List[Dict[str, Any]]:
        results = []
        for report in self.mock_data:
            distance = self._calculate_distance(lat, lng, report["latitude"], report["longitude"])
            if distance <= radius:
                results.append(report)
        return sorted(results, key=lambda x: x["created_at"], reverse=True)
    
    @staticmethod
    def _calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        from math import radians, sin, cos, sqrt, atan2
        R = 6371.0
        lat1_rad = radians(lat1)
        lng1_rad = radians(lng1)
        lat2_rad = radians(lat2)
        lng2_rad = radians(lng2)
        
        dlat = lat2_rad - lat1_rad
        dlng = lng2_rad - lng1_rad
        
        a = sin(dlat / 2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlng / 2)**2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        
        return R * c