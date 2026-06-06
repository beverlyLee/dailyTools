import random
import json
import os
from typing import List
from dataclasses import asdict

from src.poi.coffee_shop_spider import CoffeeShop, _classify_brand
from src.spatial.office_district_match import PRESET_DISTRICTS, OfficeDistrict

MOCK_DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "mock_coffee_shops.json")

BRAND_WEIGHTS_TECH = {
    "luckin": 35,
    "starbucks": 20,
    "manner": 15,
    "seesaw": 8,
    "timhortons": 5,
    "costa": 3,
    "independent": 14,
}

BRAND_WEIGHTS_FINANCE = {
    "starbucks": 30,
    "luckin": 25,
    "costa": 10,
    "manner": 10,
    "seesaw": 5,
    "timhortons": 5,
    "independent": 15,
}

BRAND_WEIGHTS_OTHER = {
    "luckin": 30,
    "starbucks": 15,
    "manner": 10,
    "independent": 35,
    "seesaw": 5,
    "costa": 3,
    "timhortons": 2,
}


BRAND_WEIGHTS_GOVERNMENT = {
    "starbucks": 15,
    "luckin": 20,
    "manner": 8,
    "independent": 40,
    "seesaw": 3,
    "costa": 4,
    "timhortons": 3,
}


def _pick_brand(district_type: str) -> str:
    if district_type == "tech":
        weights = BRAND_WEIGHTS_TECH
    elif district_type == "finance":
        weights = BRAND_WEIGHTS_FINANCE
    elif district_type == "government":
        weights = BRAND_WEIGHTS_GOVERNMENT
    else:
        weights = BRAND_WEIGHTS_OTHER

    total = sum(weights.values())
    r = random.uniform(0, total)
    cumulative = 0
    for brand, weight in weights.items():
        cumulative += weight
        if r <= cumulative:
            return brand
    return "independent"


def _brand_to_name(brand: str, index: int) -> str:
    brand_names = {
        "starbucks": "星巴克",
        "luckin": "瑞幸咖啡",
        "manner": "Manner Coffee",
        "seesaw": "Seesaw Coffee",
        "costa": "Costa Coffee",
        "timhortons": "Tims天好咖啡",
        "independent": "独立咖啡馆",
    }
    base = brand_names.get(brand, "咖啡馆")
    if brand == "independent":
        suffixes = ["时光", "转角", "巷里", "慢时光", "午后", "晨雾", "暖光", "拾光", "遇见", "初心"]
        return f"{random.choice(suffixes)}咖啡店"
    return f"{base}(NO.{index})"


def _generate_hours(district_type: str, is_late: bool) -> str:
    if is_late:
        late_options = [
            "07:00-23:00",
            "08:00-22:30",
            "07:30-23:30",
            "24小时营业",
            "06:30-22:00",
            "08:00-24:00",
        ]
        return random.choice(late_options)
    else:
        normal_options = [
            "08:00-21:00",
            "09:00-20:00",
            "07:30-21:30",
            "10:00-20:00",
            "08:30-19:30",
        ]
        return random.choice(normal_options)


def generate_mock_shops_for_district(district: OfficeDistrict, seed: int = 42) -> List[CoffeeShop]:
    random.seed(seed + hash(district.id) % 10000)

    high_intensity_ids = ["beijing_houchangcun", "shenzhen_kexing", "hangzhou_binjiang"]

    if district.id in high_intensity_ids:
        shop_count = random.randint(28, 40)
        late_ratio = random.uniform(0.85, 0.95)
    elif district.district_type == "tech":
        shop_count = random.randint(18, 32)
        late_ratio = random.uniform(0.65, 0.85)
    elif district.district_type == "finance":
        shop_count = random.randint(15, 28)
        late_ratio = random.uniform(0.4, 0.65)
    elif district.district_type == "government":
        shop_count = random.randint(6, 12)
        late_ratio = random.uniform(0.08, 0.2)
    else:
        shop_count = random.randint(5, 12)
        late_ratio = random.uniform(0.1, 0.3)

    shops = []
    for i in range(shop_count):
        lng = random.uniform(district.sw_lng, district.ne_lng)
        lat = random.uniform(district.sw_lat, district.ne_lat)

        brand = _pick_brand(district.district_type)
        name = _brand_to_name(brand, i + 1)

        is_late = random.random() < late_ratio
        hours = _generate_hours(district.district_type, is_late)

        shop = CoffeeShop(
            id=f"{district.id}_{i:03d}",
            name=name,
            brand=brand,
            address=f"{district.city}市{district.name}第{i+1}分店",
            longitude=lng,
            latitude=lat,
            business_hours=hours,
            is_open_late=is_late,
        )
        shops.append(shop)

    return shops


def generate_all_mock_shops(seed: int = 42) -> List[CoffeeShop]:
    all_shops = []
    for i, district in enumerate(PRESET_DISTRICTS):
        shops = generate_mock_shops_for_district(district, seed + i * 100)
        all_shops.extend(shops)
    return all_shops


def save_mock_data(shops: List[CoffeeShop], filepath: str = None):
    if filepath is None:
        filepath = MOCK_DATA_FILE

    data = []
    for shop in shops:
        data.append(
            {
                "id": shop.id,
                "name": shop.name,
                "brand": shop.brand,
                "address": shop.address,
                "longitude": shop.longitude,
                "latitude": shop.latitude,
                "business_hours": shop.business_hours,
                "is_open_late": shop.is_open_late,
            }
        )

    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_mock_data(filepath: str = None) -> List[CoffeeShop]:
    if filepath is None:
        filepath = MOCK_DATA_FILE

    if not os.path.exists(filepath):
        shops = generate_all_mock_shops()
        save_mock_data(shops, filepath)
        return shops

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    shops = []
    for item in data:
        shops.append(
            CoffeeShop(
                id=item["id"],
                name=item["name"],
                brand=item["brand"],
                address=item["address"],
                longitude=item["longitude"],
                latitude=item["latitude"],
                business_hours=item["business_hours"],
                is_open_late=item.get("is_open_late", False),
            )
        )
    return shops
