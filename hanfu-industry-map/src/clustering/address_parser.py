import json
import re
from typing import List, Dict
from collections import defaultdict

CITY_COORDINATES = {
    "杭州": {"lng": 120.1551, "lat": 30.2741},
    "菏泽": {"lng": 115.4807, "lat": 35.2394},
    "广州": {"lng": 113.2644, "lat": 23.1291},
    "深圳": {"lng": 114.0859, "lat": 22.547},
    "重庆": {"lng": 106.5516, "lat": 29.563},
    "南京": {"lng": 118.7969, "lat": 32.0603},
    "苏州": {"lng": 120.5853, "lat": 31.2989},
    "成都": {"lng": 104.0668, "lat": 30.5728},
    "长沙": {"lng": 112.9388, "lat": 28.2282},
    "福州": {"lng": 119.2965, "lat": 26.0745},
    "北京": {"lng": 116.4074, "lat": 39.9042},
    "上海": {"lng": 121.4737, "lat": 31.2304},
    "曹县": {"lng": 115.5422, "lat": 34.8435}
}

CITY_PRIORITY = [
    {"name": "曹县", "keywords": ["曹县"]},
    {"name": "杭州", "keywords": ["杭州", "杭州市"]},
    {"name": "菏泽", "keywords": ["菏泽", "菏泽市"]},
    {"name": "广州", "keywords": ["广州", "广州市"]},
    {"name": "深圳", "keywords": ["深圳", "深圳市"]},
    {"name": "重庆", "keywords": ["重庆", "重庆市"]},
    {"name": "南京", "keywords": ["南京", "南京市"]},
    {"name": "苏州", "keywords": ["苏州", "苏州市"]},
    {"name": "成都", "keywords": ["成都", "成都市"]},
    {"name": "长沙", "keywords": ["长沙", "长沙市"]},
    {"name": "福州", "keywords": ["福州", "福州市"]},
    {"name": "北京", "keywords": ["北京", "北京市"]},
    {"name": "上海", "keywords": ["上海", "上海市"]}
]


def parse_address(address: str) -> str:
    for city_info in CITY_PRIORITY:
        for keyword in city_info["keywords"]:
            if keyword in address:
                return city_info["name"]
    return "其他"


def load_merchants(file_path: str) -> List[Dict]:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"加载商家数据失败: {e}")
        return []


def cluster_merchants_by_city(merchants: List[Dict]) -> Dict[str, List[Dict]]:
    clusters = defaultdict(list)
    for merchant in merchants:
        city = parse_address(merchant["address"])
        merchant["city"] = city
        if city in CITY_COORDINATES:
            merchant["lng"] = CITY_COORDINATES[city]["lng"]
            merchant["lat"] = CITY_COORDINATES[city]["lat"]
        else:
            merchant["lng"] = 116.4074
            merchant["lat"] = 39.9042
        clusters[city].append(merchant)
    return dict(clusters)


def get_merchants_with_coordinates(merchants: List[Dict]) -> List[Dict]:
    result = []
    for merchant in merchants:
        city = parse_address(merchant["address"])
        coord = CITY_COORDINATES.get(city, {"lng": 116.4074, "lat": 39.9042})
        result.append({
            "name": merchant["name"],
            "address": merchant["address"],
            "sales": merchant["sales"],
            "city": city,
            "lng": coord["lng"],
            "lat": coord["lat"]
        })
    return result


if __name__ == "__main__":
    merchants = load_merchants("../../data/merchants.json")
    clustered = cluster_merchants_by_city(merchants)
    for city, merch_list in clustered.items():
        print(f"{city}: {len(merch_list)} 家商家, 总销售额: {sum(m['sales'] for m in merch_list)}")
