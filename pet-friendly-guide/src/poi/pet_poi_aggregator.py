import json
import os
import random
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
    is_pet_friendly: Optional[bool] = None
    location_restriction: Optional[str] = None
    location_text: Optional[str] = None
    attitude: Optional[str] = None
    attitude_text: Optional[str] = None
    pet_facility: Optional[Dict] = None
    pet_service: Optional[Dict] = None
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
        mock_data = self._generate_100_pois()
        
        pois = []
        for item in mock_data:
            if keyword and keyword not in item["name"] and keyword not in item["category"]:
                continue
            pois.append(POI(**item))
        
        return pois

    def _generate_100_pois(self) -> List[Dict]:
        districts = [
            "黄浦区", "徐汇区", "长宁区", "静安区", "普陀区",
            "虹口区", "杨浦区", "闵行区", "宝山区", "嘉定区",
            "浦东新区", "松江区", "青浦区", "奉贤区", "金山区"
        ]
        
        streets = [
            "南京西路", "淮海中路", "南京东路", "陆家嘴环路", "虹桥路",
            "四川北路", "西藏中路", "河南中路", "福州路", "汉口路",
            "九江路", "北京西路", "常德路", "陕西北路", "茂名南路",
            "复兴中路", "衡山路", "华山路", "延安西路", "愚园路"
        ]
        
        shop_names = [
            "Paw Coffee 爪爪咖啡馆", "毛孩子乐园餐厅", "传统美食餐厅", "阳光购物中心",
            "露台花园餐厅", "猫咪主题咖啡馆", "萌宠咖啡屋", "汪汪西餐厅",
            "喵喵火锅", "爱宠日料", "宠物乐园商场", "爪爪烧烤",
            "萌爪宠物用品店", "宠爱购物中心", "毛茸茸咖啡馆", "汪汪公园",
            "喵星人餐厅", "宠物生活馆", "萌宠天地", "爱宠咖啡店",
            "爪爪西餐厅", "喵喵咖啡馆", "宠物友好餐厅", "毛孩子乐园",
            "宠爱餐厅", "萌宠烧烤", "汪汪咖啡店", "猫咪乐园",
            "宠物购物中心", "爱宠餐厅", "爪爪火锅", "毛茸茸西餐厅",
            "萌爪日料", "宠爱咖啡店", "汪汪公园餐厅", "喵星人咖啡店",
            "宠物友好商场", "毛孩子咖啡馆", "爪爪购物中心", "萌宠餐厅",
            "爱宠烧烤", "猫咪咖啡屋", "宠物乐园餐厅", "汪汪购物中心",
            "喵喵餐厅", "毛茸茸咖啡店", "萌爪火锅", "宠爱日料",
            "毛孩子烧烤", "宠物友好咖啡店", "爪爪餐厅", "萌宠购物中心",
            "爱宠咖啡店", "猫咪西餐厅", "汪汪火锅", "宠物公园",
            "喵喵购物中心", "毛茸茸餐厅", "萌爪咖啡店", "宠爱烧烤",
            "毛孩子日料", "宠物友好公园", "爪爪咖啡店", "萌宠火锅",
            "爱宠购物中心", "猫咪餐厅", "汪汪日料", "宠物咖啡店",
            "喵喵烧烤", "毛茸茸购物中心", "萌爪餐厅", "宠爱火锅",
            "毛孩子咖啡店", "宠物友好烧烤", "爪爪日料", "萌宠咖啡店",
            "爱宠火锅", "汪汪餐厅", "猫咪购物中心", "宠物友好日料",
            "喵喵咖啡店", "毛茸茸火锅", "萌爪购物中心", "宠爱咖啡店",
            "狗狗咖啡馆", "猫咪餐厅", "萌宠咖啡", "爱宠乐园",
            "毛孩子烧烤店", "爪爪火锅城", "毛茸茸西餐厅", "宠爱咖啡馆"
        ]
        
        categories = [
            ("咖啡餐饮", "¥30-80/人"),
            ("咖啡餐饮", "¥50-100/人"),
            ("餐饮美食", "¥100-300/人"),
            ("餐饮美食", "¥60-200/人"),
            ("餐饮美食", "¥80-150/人"),
            ("餐饮美食", "¥150-400/人"),
            ("餐饮美食", "¥70-150/人"),
            ("购物商场", None),
            ("购物商场", None),
            ("休闲娱乐", "¥100-200/人"),
            ("休闲娱乐", None),
            ("生活服务", None),
            ("生活服务", None)
        ]
        
        pois = []
        base_lon, base_lat = 121.4737, 31.2304
        
        for i in range(100):
            category, price_range = random.choice(categories)
            
            district = random.choice(districts)
            street = random.choice(streets)
            street_num = random.randint(1, 2000)
            
            name = shop_names[i % len(shop_names)]
            if i >= len(shop_names):
                name = f"{name}(分店{i - len(shop_names) + 1})"
            
            lon = base_lon + random.uniform(-0.15, 0.15)
            lat = base_lat + random.uniform(-0.12, 0.12)
            
            rating = round(random.uniform(3.5, 5.0), 1)
            price = price_range if price_range else None
            
            poi = {
                "id": f"POI{i+1:03d}",
                "name": name,
                "address": f"上海市{district}{street}{street_num}号",
                "longitude": round(lon, 4),
                "latitude": round(lat, 4),
                "category": category,
                "phone": f"021-{random.randint(10000000, 99999999)}",
                "rating": rating,
                "price": price
            }
            
            pois.append(poi)
        
        return pois

    def attach_pet_info(self, pois: List[POI], pet_analysis: Dict) -> List[POI]:
        default_facility = {
            "has_water_bowl": False,
            "has_pee_pad": False,
            "has_pet_snack": False,
            "has_pet_cart": False,
            "has_pet_area": False
        }
        
        default_service = {
            "has_pet_sitting": False,
            "has_pet_grooming": False,
            "has_pet_toys": False
        }
        
        for poi in pois:
            if poi.name in pet_analysis:
                result = pet_analysis[poi.name]
                poi.is_pet_friendly = result.is_pet_friendly
                poi.location_restriction = result.location_restriction.value
                poi.location_text = self._get_location_text(result.location_restriction.value)
                poi.attitude = result.attitude
                poi.attitude_text = self._get_attitude_text(result.attitude)
                poi.pet_facility = {
                    "has_water_bowl": result.facility.has_water_bowl,
                    "has_pee_pad": result.facility.has_pee_pad,
                    "has_pet_snack": result.facility.has_pet_snack,
                    "has_pet_cart": result.facility.has_pet_cart,
                    "has_pet_area": result.facility.has_pet_area
                }
                poi.pet_service = {
                    "has_pet_sitting": result.service.has_pet_sitting,
                    "has_pet_grooming": result.service.has_pet_grooming,
                    "has_pet_toys": result.service.has_pet_toys
                }
                poi.pet_evidence = result.evidence
            else:
                poi.is_pet_friendly = False
                poi.location_restriction = "unknown"
                poi.location_text = "暂无宠物友好信息"
                poi.attitude = "unknown"
                poi.attitude_text = "店员态度未知"
                poi.pet_facility = default_facility.copy()
                poi.pet_service = default_service.copy()
                poi.pet_evidence = []
        
        return pois

    def _get_location_text(self, location: str) -> str:
        mapping = {
            "indoor": "室内允许",
            "outdoor": "仅限户外",
            "both": "室内外均可",
            "unknown": "位置限制未知"
        }
        return mapping.get(location, "未知")

    def _get_attitude_text(self, attitude: str) -> str:
        mapping = {
            "excellent": "店员态度非常好",
            "good": "店员态度不错",
            "poor": "店员态度较差",
            "unknown": "店员态度未知"
        }
        return mapping.get(attitude, "未知")

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
            "is_pet_friendly": poi.is_pet_friendly,
            "location_restriction": poi.location_restriction,
            "location_text": poi.location_text,
            "attitude": poi.attitude,
            "attitude_text": poi.attitude_text,
            "pet_facility": poi.pet_facility,
            "pet_service": poi.pet_service,
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
    for p in pois[:5]:
        print(f"- {p['name']}: friendly={p['is_pet_friendly']}, location={p['location_restriction']}")
