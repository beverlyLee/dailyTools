import math
from typing import List, Dict, Tuple
from dataclasses import dataclass

from src.poi.coffee_shop_spider import CoffeeShop


@dataclass
class OvertimeIndexResult:
    overtime_index: float
    density_score: float
    late_night_ratio: float
    total_shops: int
    late_night_shops: int
    area_km2: float
    brand_distribution: Dict[str, int]
    late_night_brand_distribution: Dict[str, int]


def calculate_shop_density(
    shops: List[CoffeeShop],
    sw_lng: float,
    sw_lat: float,
    ne_lng: float,
    ne_lat: float,
) -> Tuple[float, float]:
    if not shops:
        return 0.0, 0.0

    lat_diff_km = (ne_lat - sw_lat) * 111.0
    avg_lat = (sw_lat + ne_lat) / 2
    lng_diff_km = (ne_lng - sw_lng) * 111.0 * math.cos(math.radians(avg_lat))
    area_km2 = lat_diff_km * lng_diff_km

    if area_km2 <= 0:
        return 0.0, 0.0

    density = len(shops) / area_km2
    return density, area_km2


def calculate_late_night_ratio(shops: List[CoffeeShop]) -> Tuple[float, int]:
    if not shops:
        return 0.0, 0
    late_count = sum(1 for shop in shops if shop.is_open_late)
    ratio = late_count / len(shops)
    return ratio, late_count


def normalize_density(density: float, max_density: float = 10.0) -> float:
    if max_density <= 0:
        return 0.0
    normalized = min(density / max_density, 1.0)
    return normalized


def calculate_brand_distribution(shops: List[CoffeeShop]) -> Dict[str, int]:
    dist: Dict[str, int] = {}
    for shop in shops:
        brand = shop.brand
        dist[brand] = dist.get(brand, 0) + 1
    return dist


def calculate_overtime_index(
    shops: List[CoffeeShop],
    sw_lng: float,
    sw_lat: float,
    ne_lng: float,
    ne_lat: float,
    density_weight: float = 0.5,
    late_night_weight: float = 0.5,
    max_density: float = 10.0,
) -> OvertimeIndexResult:
    density, area_km2 = calculate_shop_density(shops, sw_lng, sw_lat, ne_lng, ne_lat)
    density_score = normalize_density(density, max_density)

    late_night_ratio, late_night_count = calculate_late_night_ratio(shops)

    overtime_index = density_score * density_weight + late_night_ratio * late_night_weight
    overtime_index = round(overtime_index * 100, 2)

    brand_dist = calculate_brand_distribution(shops)
    late_shops = [s for s in shops if s.is_open_late]
    late_brand_dist = calculate_brand_distribution(late_shops)

    return OvertimeIndexResult(
        overtime_index=overtime_index,
        density_score=round(density_score * 100, 2),
        late_night_ratio=round(late_night_ratio * 100, 2),
        total_shops=len(shops),
        late_night_shops=late_night_count,
        area_km2=round(area_km2, 2),
        brand_distribution=brand_dist,
        late_night_brand_distribution=late_brand_dist,
    )
