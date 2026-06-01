import os
import requests
import json
from typing import List, Dict, Optional
from math import radians, cos, sin, asin, sqrt
from dotenv import load_dotenv

load_dotenv()

GAODE_API_KEY = os.getenv("GAODE_API_KEY")
POI_SEARCH_URL = "https://restapi.amap.com/v3/place/text"
POI_AROUND_URL = "https://restapi.amap.com/v3/place/around"


class AmapPOICollector:
    def __init__(self, api_key: str = GAODE_API_KEY):
        self.api_key = api_key

    def haversine(self, lon1: float, lat1: float, lon2: float, lat2: float) -> float:
        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * asin(sqrt(a))
        r = 6371
        return c * r * 1000

    def search_poi(
        self,
        keywords: str,
        city: str = "上海",
        types: Optional[str] = None,
        offset: int = 50,
        max_pages: int = 10
    ) -> List[Dict]:
        all_pois = []
        for page in range(1, max_pages + 1):
            params = {
                "key": self.api_key,
                "keywords": keywords,
                "city": city,
                "citylimit": "true",
                "offset": offset,
                "page": page,
                "output": "json",
                "extensions": "all"
            }
            if types:
                params["types"] = types
            
            try:
                response = requests.get(POI_SEARCH_URL, params=params, timeout=10)
                data = response.json()
                
                if data.get("status") != "1":
                    print(f"API Error: {data.get('info')}")
                    break
                
                pois = data.get("pois", [])
                if not pois:
                    break
                
                all_pois.extend(pois)
                
                if len(pois) < offset:
                    break
                    
            except Exception as e:
                print(f"Request Error: {e}")
                break
        
        return all_pois

    def collect_office_buildings(self, city: str = "上海") -> List[Dict]:
        pois = self.search_poi(
            keywords="甲级写字楼",
            city=city,
            types="141202"
        )
        
        result = []
        for poi in pois:
            location = poi.get("location", "").split(",")
            if len(location) == 2:
                result.append({
                    "name": poi.get("name"),
                    "address": poi.get("address"),
                    "lng": float(location[0]),
                    "lat": float(location[1]),
                    "type": "office"
                })
        
        return result

    def collect_coffee_shops(self, city: str = "上海") -> List[Dict]:
        luckin_pois = self.search_poi(
            keywords="瑞幸咖啡",
            city=city,
            types="050900"
        )
        
        starbucks_pois = self.search_poi(
            keywords="星巴克",
            city=city,
            types="050900"
        )
        
        result = []
        for poi in luckin_pois + starbucks_pois:
            location = poi.get("location", "").split(",")
            if len(location) == 2:
                result.append({
                    "name": poi.get("name"),
                    "address": poi.get("address"),
                    "lng": float(location[0]),
                    "lat": float(location[1]),
                    "type": "luckin" if "瑞幸" in poi.get("name", "") else "starbucks"
                })
        
        return result

    def find_nearest_office(
        self,
        coffee_shop: Dict,
        office_buildings: List[Dict]
    ) -> Dict:
        min_distance = float("inf")
        nearest_office = None
        
        for office in office_buildings:
            distance = self.haversine(
                coffee_shop["lng"], coffee_shop["lat"],
                office["lng"], office["lat"]
            )
            if distance < min_distance:
                min_distance = distance
                nearest_office = office
        
        return {
            "coffee_shop": coffee_shop,
            "nearest_office": nearest_office,
            "distance": min_distance
        }


if __name__ == "__main__":
    collector = AmapPOICollector()
    offices = collector.collect_office_buildings("上海")
    coffees = collector.collect_coffee_shops("上海")
    print(f"Collected {len(offices)} office buildings")
    print(f"Collected {len(coffees)} coffee shops")
