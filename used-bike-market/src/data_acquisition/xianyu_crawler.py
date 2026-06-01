import random
import json
from typing import List, Dict

class XianyuCrawler:
    def __init__(self):
        self.keywords = ["捷安特", "美利达", "小牛", "雅迪", "爱玛", "电动自行车", "山地车", "公路车"]
        self.mock_locations = self._init_mock_locations()
    
    def _init_mock_locations(self) -> List[Dict]:
        locations = [
            {"name": "北京回龙观", "lat": 40.075, "lng": 116.336, "count": 45, "type": "all"},
            {"name": "北京天通苑", "lat": 40.070, "lng": 116.405, "count": 30, "type": "all"},
            {"name": "北京望京", "lat": 39.993, "lng": 116.480, "count": 25, "type": "all"},
            {"name": "北京西二旗", "lat": 40.050, "lng": 116.305, "count": 28, "type": "all"},
            {"name": "深圳南山区", "lat": 22.536, "lng": 113.950, "count": 52, "type": "ebike"},
            {"name": "深圳福田区", "lat": 22.543, "lng": 114.058, "count": 38, "type": "ebike"},
            {"name": "深圳宝安区", "lat": 22.558, "lng": 113.883, "count": 41, "type": "ebike"},
            {"name": "上海浦东新区", "lat": 31.230, "lng": 121.504, "count": 35, "type": "all"},
            {"name": "杭州余杭区", "lat": 30.430, "lng": 120.000, "count": 28, "type": "all"},
            {"name": "广州天河区", "lat": 23.129, "lng": 113.344, "count": 33, "type": "ebike"},
        ]
        return locations
    
    def search_items(self, keyword: str = None, category: str = None) -> List[Dict]:
        items = []
        locations = self.mock_locations
        
        if category == "电动自行车":
            locations = [loc for loc in locations if loc["type"] == "ebike" or loc["type"] == "all"]
        elif category == "自行车":
            locations = [loc for loc in locations if loc["type"] == "all"]
        
        for loc in locations:
            base_count = loc["count"]
            if keyword and ("小牛" in keyword or "雅迪" in keyword or "爱玛" in keyword):
                if loc["type"] == "ebike":
                    base_count = int(base_count * 1.5)
            elif keyword and ("捷安特" in keyword or "美利达" in keyword):
                if loc["type"] == "all":
                    base_count = int(base_count * 1.3)
            
            for i in range(base_count):
                lat = loc["lat"] + random.uniform(-0.02, 0.02)
                lng = loc["lng"] + random.uniform(-0.02, 0.02)
                
                if keyword:
                    item_keyword = keyword
                else:
                    item_keyword = random.choice(self.keywords)
                
                if "小牛" in item_keyword or "雅迪" in item_keyword or "爱玛" in item_keyword or "电动" in item_keyword:
                    price = random.randint(1500, 5000)
                    item_type = "电动自行车"
                else:
                    price = random.randint(500, 3000)
                    item_type = "自行车"
                
                item = {
                    "id": f"{loc['name']}_{i}",
                    "title": f"{item_keyword} 二手{random.choice(['9成新', '8成新', '几乎全新'])}",
                    "price": price,
                    "location": loc["name"],
                    "lat": round(lat, 6),
                    "lng": round(lng, 6),
                    "type": item_type,
                    "keyword": item_keyword
                }
                items.append(item)
        
        random.shuffle(items)
        return items
    
    def get_all_items(self) -> List[Dict]:
        return self.search_items()
    
    def save_to_json(self, items: List[Dict], filename: str = "data/bike_data.json"):
        import os
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(items, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    crawler = XianyuCrawler()
    items = crawler.get_all_items()
    print(f"采集到 {len(items)} 条数据")
    crawler.save_to_json(items)
