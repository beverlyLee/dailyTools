import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import requests
from typing import Dict, List
from config import Config


class JuheRentSpider:
    def __init__(self):
        self.api_key = Config.JUHE_API_KEY
        self.base_url = Config.JUHE_BASE_URL

    def get_rent_data(self, city: str = "beijing") -> List[Dict]:
        mock_rent_data = {
            "beijing": [
                {"name": "回龙观", "district": "昌平区", "rent_median": 4200, "rent_per_sqm": 85, "area_range": "45-65㎡"},
                {"name": "天通苑", "district": "昌平区", "rent_median": 3800, "rent_per_sqm": 78, "area_range": "45-70㎡"},
                {"name": "西二旗", "district": "海淀区", "rent_median": 5800, "rent_per_sqm": 110, "area_range": "40-55㎡"},
                {"name": "望京", "district": "朝阳区", "rent_median": 6500, "rent_per_sqm": 120, "area_range": "45-60㎡"},
                {"name": "中关村", "district": "海淀区", "rent_median": 7200, "rent_per_sqm": 135, "area_range": "40-55㎡"},
                {"name": "国贸", "district": "朝阳区", "rent_median": 8500, "rent_per_sqm": 150, "area_range": "40-50㎡"},
                {"name": "亦庄", "district": "大兴区", "rent_median": 4000, "rent_per_sqm": 80, "area_range": "50-70㎡"},
                {"name": "通州北苑", "district": "通州区", "rent_median": 3500, "rent_per_sqm": 72, "area_range": "50-75㎡"}
            ]
        }
        
        return mock_rent_data.get(city, [])

    def fetch_real_rent_data(self, city_name: str) -> Dict:
        url = f"{self.base_url}/fhouse/rent"
        params = {
            "key": self.api_key,
            "city": city_name
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            if data.get("error_code") == 0:
                return {
                    "status": "success",
                    "data": data.get("result", {})
                }
        except Exception as e:
            print(f"获取租金数据失败: {e}")
        
        return {
            "status": "error",
            "message": "数据获取失败"
        }

    def get_combined_rent_data(self, city: str = "beijing") -> List[Dict]:
        areas = self.get_rent_data(city)
        return areas


if __name__ == "__main__":
    spider = JuheRentSpider()
    data = spider.get_rent_data("beijing")
    for item in data:
        print(f"{item['name']}: 租金中位数 {item['rent_median']} 元/月")
