import json
import os
import requests
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict


@dataclass
class POI:
    id: str
    name: str
    address: str
    longitude: float
    latitude: float
    category: str
    phone: Optional[str] = None
    rating: Optional[float] = None
    price: Optional[str] = None
    pet_policy: Optional[str] = None
    pet_facility: Optional[Dict] = None
    pet_evidence: Optional[List[str]] = None


class PetPOIAggregator:
    def __init__(self, amap_api_key: str = ""):
        self.amap_api_key = amap_api_key
        self.data_dir = os.path.join(os.path.dirname(__file__), "../../data")
        os.makedirs(self.data_dir, exist_ok=True)

    def search_amap_pois(self, keyword: str, city: str = "上海", 
                         category: str = "") -> List[POI]:
        if not self.amap_api_key:
            print("未配置高德API Key，返回模拟数据")
            return self.get_mock_pois(keyword)
        
        base_url = "https://restapi.amap.com/v3/place/text"
        params = {
            "key": self.amap_api_key,
            "keywords": keyword,
            "city": city,
            "types": category,
            "output": "json",
            "offset": 20,
            "page": 1
        }
        
        try:
            response = requests.get(base_url, params=params, timeout=10)
            data = response.json()
            
            pois = []
            if data.get("status") == "1":
                for item in data.get("pois", []):
                    location = item.get("location", ",").split(",")
                    poi = POI(
                        id=item.get("id", ""),
                        name=item.get("name", ""),
                        address=item.get("address", ""),
                        longitude=float(location[0]) if location[0] else 0.0,
                        latitude=float(location[1]) if len(location) > 1 else 0.0,
                        category=item.get("type", ""),
                        phone=item.get("tel", None),
                        rating=float(item.get("rating", 0)) if item.get("rating") else None
                    )
                    pois.append(poi)
            
            return pois
        except Exception as e:
            print(f"高德API请求失败: {e}")
            return self.get_mock_pois(keyword)

    def get_mock_pois(self, keyword: str = "") -> List[POI]:
        mock_data = [
            {
                "id": "POI001",
                "name": "Paw Coffee 爪爪咖啡馆",
                "address": "上海市静安区南京西路1688号",
                "longitude": 121.4493,
                "latitude": 31.2304,
                "category": "咖啡餐饮",
                "phone": "021-12345678",
                "rating": 4.8,
                "price": "¥50/人"
            },
            {
                "id": "POI002",
                "name": "毛孩子乐园餐厅",
                "address": "上海市徐汇区淮海中路1200号",
                "longitude": 121.4550,
                "latitude": 31.2150,
                "category": "餐饮美食",
                "phone": "021-87654321",
                "rating": 4.6,
                "price": "¥120/人"
            },
            {
                "id": "POI003",
                "name": "传统美食餐厅",
                "address": "上海市黄浦区南京东路300号",
                "longitude": 121.4830,
                "latitude": 31.2360,
                "category": "中式餐饮",
                "phone": "021-55667788",
                "rating": 4.2,
                "price": "¥80/人"
            },
            {
                "id": "POI004",
                "name": "阳光购物中心",
                "address": "上海市浦东新区陆家嘴环路1000号",
                "longitude": 121.5030,
                "latitude": 31.2380,
                "category": "购物商场",
                "phone": "021-99887766",
                "rating": 4.5,
                "price": None
            },
            {
                "id": "POI005",
                "name": "露台花园餐厅",
                "address": "上海市长宁区虹桥路1450号",
                "longitude": 121.4120,
                "latitude": 31.2000,
                "category": "西餐",
                "phone": "021-33445566",
                "rating": 4.4,
                "price": "¥150/人"
            },
            {
                "id": "POI006",
                "name": "猫咪主题咖啡馆",
                "address": "上海市杨浦区大学路200号",
                "longitude": 121.5100,
                "latitude": 31.3000,
                "category": "咖啡餐饮",
                "phone": "021-11223344",
                "rating": 4.7,
                "price": "¥60/人"
            }
        ]
        
        pois = []
        for item in mock_data:
            if keyword and keyword not in item["name"] and keyword not in item["category"]:
                continue
            pois.append(POI(**item))
        
        return pois

    def attach_pet_info(self, pois: List[POI], pet_analysis: Dict) -> List[POI]:
        for poi in pois:
            if poi.name in pet_analysis:
                result = pet_analysis[poi.name]
                poi.pet_policy = result.policy.value
                poi.pet_facility = {
                    "has_water_bowl": result.facility.has_water_bowl,
                    "has_pee_pad": result.facility.has_pee_pad,
                    "has_pet_snack": result.facility.has_pet_snack,
                    "has_pet_cart": result.facility.has_pet_cart,
                    "has_pet_area": result.facility.has_pet_area
                }
                poi.pet_evidence = result.evidence
        
        return pois

    def get_pet_friendly_pois(self, city: str = "上海", 
                               keyword: str = "咖啡馆 餐厅") -> List[Dict]:
        from src.nlp.policy_detector import PolicyDetector
        from src.reviews.pet_comment_spider import PetCommentSpider
        
        spider = PetCommentSpider()
        detector = PolicyDetector()
        
        reviews = spider.get_mock_reviews()
        analysis_results = detector.aggregate_analysis(reviews)
        
        pois = self.get_mock_pois()
        pois_with_pet = self.attach_pet_info(pois, analysis_results)
        
        return [self._poi_to_dict(p) for p in pois_with_pet]

    def _poi_to_dict(self, poi: POI) -> Dict:
        return {
            "id": poi.id,
            "name": poi.name,
            "address": poi.address,
            "longitude": poi.longitude,
            "latitude": poi.latitude,
            "category": poi.category,
            "phone": poi.phone,
            "rating": poi.rating,
            "price": poi.price,
            "pet_policy": poi.pet_policy,
            "pet_facility": poi.pet_facility,
            "pet_evidence": poi.pet_evidence
        }

    def save_pois(self, pois: List[Dict], filename: str = "pet_pois.json"):
        filepath = os.path.join(self.data_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(pois, f, ensure_ascii=False, indent=2)
        print(f"POI数据已保存到 {filepath}")

    def load_pois(self, filename: str = "pet_pois.json") -> List[Dict]:
        filepath = os.path.join(self.data_dir, filename)
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        return []


if __name__ == "__main__":
    aggregator = PetPOIAggregator()
    pois = aggregator.get_pet_friendly_pois()
    print(f"获取到 {len(pois)} 个POI")
    for p in pois[:3]:
        print(f"- {p['name']}: {p['pet_policy']}")
