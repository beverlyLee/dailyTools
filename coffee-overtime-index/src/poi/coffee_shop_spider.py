import os
import math
import requests
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

GAODE_POI_KEY = os.getenv("GAODE_POI_KEY", "")
GAODE_WEB_API_KEY = os.getenv("GAODE_WEB_API_KEY", "")
POI_AROUND_URL = "https://restapi.amap.com/v3/place/around"
POI_TEXT_URL = "https://restapi.amap.com/v3/place/text"
COFFEE_CATEGORY = "050900"

BRAND_CHAINS = {
    "starbucks": ["星巴克", "Starbucks", "STARBUCKS"],
    "luckin": ["瑞幸", "luckin", "LUCKIN", "瑞幸咖啡"],
    "manner": ["Manner", "MANNER", "manner"],
    "costa": ["Costa", "COSTA", "costa"],
    "seesaw": ["Seesaw", "SEESAW", "seesaw"],
    "timhortons": ["Tims", "TIMS", "Tim Hortons", "天好咖啡"],
}


@dataclass
class CoffeeShop:
    id: str
    name: str
    brand: str
    address: str
    longitude: float
    latitude: float
    business_hours: str
    is_open_late: bool = False


def _classify_brand(name: str) -> str:
    name_lower = name.lower()
    for brand_key, keywords in BRAND_CHAINS.items():
        for kw in keywords:
            if kw.lower() in name_lower:
                return brand_key
    return "independent"


def _parse_business_hours(hours_str: str) -> Tuple[bool, str]:
    if not hours_str or hours_str in ["暂无", "暂无信息", ""]:
        return False, ""
    try:
        normalized = hours_str.replace("：", ":").replace(" ", "")
        if "24" in normalized and ("小时" in normalized or "h" in normalized.lower()):
            return True, hours_str
        if "22:00" in normalized or "22:30" in normalized:
            return True, hours_str
        if "23:" in normalized:
            return True, hours_str
        if "00:" in normalized or "24:" in normalized:
            return True, hours_str
        parts = normalized.split("-")
        if len(parts) >= 2:
            close_part = parts[-1]
            close_time = close_part.split(":")
            if len(close_time) >= 2:
                hour = int(close_time[0])
                if hour >= 22 or hour < 6:
                    return True, hours_str
    except Exception:
        pass
    return False, hours_str


def fetch_coffee_shops_around(
    center_lng: float,
    center_lat: float,
    radius: int = 3000,
    page_size: int = 25,
    max_pages: int = 10,
) -> List[CoffeeShop]:
    if not GAODE_POI_KEY:
        return []

    shops = []
    seen_ids = set()

    for page in range(1, max_pages + 1):
        params = {
            "key": GAODE_POI_KEY,
            "location": f"{center_lng},{center_lat}",
            "types": COFFEE_CATEGORY,
            "radius": radius,
            "offset": page_size,
            "page": page,
            "extensions": "all",
        }
        try:
            resp = requests.get(POI_AROUND_URL, params=params, timeout=10)
            data = resp.json()
            if data.get("status") != "1":
                break
            pois = data.get("pois", [])
            if not pois:
                break
            for poi in pois:
                poi_id = poi.get("id", "")
                if poi_id in seen_ids:
                    continue
                seen_ids.add(poi_id)

                name = poi.get("name", "")
                brand = _classify_brand(name)

                location = poi.get("location", "")
                lng, lat = 0.0, 0.0
                if location:
                    parts = location.split(",")
                    if len(parts) == 2:
                        lng, lat = float(parts[0]), float(parts[1])

                biz_hours_raw = ""
                if "biz_ext" in poi and isinstance(poi["biz_ext"], dict):
                    biz_hours_raw = poi["biz_ext"].get("open_time", "")
                if not biz_hours_raw and "biz_hours" in poi:
                    biz_hours_raw = poi["biz_hours"]

                is_late, clean_hours = _parse_business_hours(biz_hours_raw)

                shops.append(
                    CoffeeShop(
                        id=poi_id,
                        name=name,
                        brand=brand,
                        address=poi.get("address", ""),
                        longitude=lng,
                        latitude=lat,
                        business_hours=clean_hours,
                        is_open_late=is_late,
                    )
                )
            if len(pois) < page_size:
                break
        except Exception as e:
            print(f"Error fetching POI page {page}: {e}")
            break

    return shops


def grid_search_coffee_shops(
    sw_lng: float,
    sw_lat: float,
    ne_lng: float,
    ne_lat: float,
    grid_step_km: float = 2.0,
    radius: int = 2000,
) -> List[CoffeeShop]:
    if not GAODE_POI_KEY:
        return []

    all_shops = []
    seen_ids = set()

    lat_step = grid_step_km / 111.0
    lng_step = grid_step_km / (111.0 * math.cos(math.radians((sw_lat + ne_lat) / 2)))

    lat = sw_lat
    while lat <= ne_lat:
        lng = sw_lng
        while lng <= ne_lng:
            shops = fetch_coffee_shops_around(lng, lat, radius=radius, max_pages=5)
            for shop in shops:
                if shop.id not in seen_ids:
                    seen_ids.add(shop.id)
                    all_shops.append(shop)
            lng += lng_step
        lat += lat_step

    return all_shops
