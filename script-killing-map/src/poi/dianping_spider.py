import os
import json
import time
import random
from typing import List, Dict
from dotenv import load_dotenv
import requests

load_dotenv()

class DianpingSpider:
    def __init__(self):
        self.appkey = os.getenv("DIANPING_APPKEY")
        self.amap_key = os.getenv("GAODE_API_KEY") or os.getenv("AMAP_API_KEY")
        self.base_url = "https://api.dianping.com/v1"
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        })

    def search_script_killing_shops(self, city: str = "武汉", keyword: str = "剧本杀") -> List[Dict]:
        shops = self._generate_mock_data(city)
        return shops

    def _generate_mock_data(self, city: str) -> List[Dict]:
        wuhan_shops = [
            {
                "id": "1",
                "name": "迷雾剧本杀推理社(光谷店)",
                "address": "洪山区光谷步行街西班牙风情街D栋5单元802室",
                "latitude": 30.508,
                "longitude": 114.385,
                "rating": 4.8,
                "review_count": 328,
                "tags": ["情感本", "硬核本", "恐怖本"],
                "price_per_person": 88
            },
            {
                "id": "2",
                "name": "剧满楼沉浸式剧本杀",
                "address": "洪山区光谷世界城广场1栋1503室",
                "latitude": 30.510,
                "longitude": 114.382,
                "rating": 4.7,
                "review_count": 256,
                "tags": ["情感本", "机制本"],
                "price_per_person": 108
            },
            {
                "id": "3",
                "name": "天黑请闭眼剧本杀俱乐部",
                "address": "洪山区鲁巷广场购物中心旁尖东智能花园1栋2单元601",
                "latitude": 30.512,
                "longitude": 114.379,
                "rating": 4.6,
                "review_count": 198,
                "tags": ["硬核本", "阵营本"],
                "price_per_person": 78
            },
            {
                "id": "4",
                "name": "秘境剧本杀体验馆",
                "address": "洪山区光谷SBI创业街10栋A座1201",
                "latitude": 30.515,
                "longitude": 114.388,
                "rating": 4.5,
                "review_count": 156,
                "tags": ["情感本", "欢乐本"],
                "price_per_person": 98
            },
            {
                "id": "5",
                "name": "剧本杀研究院",
                "address": "洪山区珞喻路726号鲁巷广场购物中心B1层",
                "latitude": 30.509,
                "longitude": 114.375,
                "rating": 4.9,
                "review_count": 412,
                "tags": ["硬核本", "情感本", "恐怖本"],
                "price_per_person": 128
            },
            {
                "id": "6",
                "name": "戏精学院剧本杀",
                "address": "洪山区光谷天地F1区1楼",
                "latitude": 30.485,
                "longitude": 114.395,
                "rating": 4.4,
                "review_count": 134,
                "tags": ["欢乐本", "机制本"],
                "price_per_person": 68
            },
            {
                "id": "7",
                "name": "推理大师剧本杀",
                "address": "武昌区中南路7号中商广场写字楼B座2205",
                "latitude": 30.545,
                "longitude": 114.335,
                "rating": 4.7,
                "review_count": 287,
                "tags": ["硬核本", "阵营本"],
                "price_per_person": 98
            },
            {
                "id": "8",
                "name": "梦境剧本杀体验馆",
                "address": "洪山区民族大道158号光谷时间广场1栋16层",
                "latitude": 30.495,
                "longitude": 114.368,
                "rating": 4.6,
                "review_count": 178,
                "tags": ["情感本", "恐怖本"],
                "price_per_person": 85
            },
            {
                "id": "9",
                "name": "百变大侦探剧本杀",
                "address": "洪山区关山大道光谷软件园A1栋101",
                "latitude": 30.488,
                "longitude": 114.398,
                "rating": 4.5,
                "review_count": 145,
                "tags": ["硬核本", "欢乐本"],
                "price_per_person": 75
            },
            {
                "id": "10",
                "name": "桌游俱乐部剧本杀",
                "address": "洪山区珞狮路147号未来城C座1802",
                "latitude": 30.528,
                "longitude": 114.355,
                "rating": 4.3,
                "review_count": 98,
                "tags": ["机制本", "阵营本"],
                "price_per_person": 58
            },
            {
                "id": "11",
                "name": "沉浸式剧场剧本杀",
                "address": "洪山区光谷步行街意大利风情街5号楼3层",
                "latitude": 30.507,
                "longitude": 114.380,
                "rating": 4.8,
                "review_count": 367,
                "tags": ["情感本", "硬核本", "机制本"],
                "price_per_person": 138
            },
            {
                "id": "12",
                "name": "暗夜侦探社",
                "address": "洪山区关山大道218号保利花园K1栋2单元1101",
                "latitude": 30.492,
                "longitude": 114.402,
                "rating": 4.6,
                "review_count": 203,
                "tags": ["恐怖本", "硬核本"],
                "price_per_person": 95
            }
        ]
        return wuhan_shops

    def get_university_towns(self, city: str = "武汉") -> List[Dict]:
        university_towns = [
            {
                "name": "光谷大学城",
                "address": "武汉市洪山区光谷广场周边",
                "latitude": 30.510,
                "longitude": 114.378,
                "radius": 3000,
                "description": "华中科技大学、中国地质大学、武汉工程大学等高校聚集区"
            },
            {
                "name": "武昌大学城",
                "address": "武汉市武昌区珞珈山周边",
                "latitude": 30.538,
                "longitude": 114.365,
                "radius": 3000,
                "description": "武汉大学、武汉理工大学、华中师范大学等高校聚集区"
            }
        ]
        return university_towns

    def get_cbd_areas(self, city: str = "武汉") -> List[Dict]:
        cbd_areas = [
            {
                "name": "武汉CBD",
                "address": "武汉市江汉区中央商务区",
                "latitude": 30.600,
                "longitude": 114.268,
                "radius": 2000,
                "description": "武汉中央商务区（汉口）"
            },
            {
                "name": "光谷CBD",
                "address": "武汉市洪山区光谷广场商圈",
                "latitude": 30.510,
                "longitude": 114.380,
                "radius": 2500,
                "description": "光谷广场核心商务区，覆盖光谷步行街、世界城、光谷天地等商圈"
            }
        ]
        return cbd_areas

    def geocode_address(self, address: str, city: str = "武汉") -> Dict:
        if not self.amap_key:
            return {"latitude": 30.510, "longitude": 114.378}
        
        url = "https://restapi.amap.com/v3/geocode/geo"
        params = {
            "key": self.amap_key,
            "address": address,
            "city": city
        }
        try:
            response = self.session.get(url, params=params, timeout=10)
            data = response.json()
            if data.get("status") == "1" and data.get("geocodes"):
                location = data["geocodes"][0]["location"].split(",")
                return {
                    "longitude": float(location[0]),
                    "latitude": float(location[1])
                }
        except Exception as e:
            print(f"Geocoding error: {e}")
        return {"latitude": 30.510, "longitude": 114.378}

    def save_to_json(self, data: List[Dict], filename: str = "script_killing_shops.json"):
        data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
        os.makedirs(data_dir, exist_ok=True)
        filepath = os.path.join(data_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Data saved to {filepath}")

    def load_from_json(self, filename: str = "script_killing_shops.json") -> List[Dict]:
        data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
        filepath = os.path.join(data_dir, filename)
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        return []

if __name__ == "__main__":
    spider = DianpingSpider()
    shops = spider.search_script_killing_shops("武汉")
    print(f"Found {len(shops)} script killing shops")
    spider.save_to_json(shops)
    
    university_towns = spider.get_university_towns("武汉")
    spider.save_to_json(university_towns, "university_towns.json")
    
    cbd_areas = spider.get_cbd_areas("武汉")
    spider.save_to_json(cbd_areas, "cbd_areas.json")
