import json
import math

from src.grid.density_calculator import load_density, calculate_density, save_density
from src.poi.convenience_crawler import load_pois
from src.config import DATA_DIR, get_data_path, ensure_data_dir

SHANGHAI_CENTER_LNG = 121.4737
SHANGHAI_CENTER_LAT = 31.2304

PARK_ZONES = [
    {"name": "世纪公园周边", "lng": 121.54, "lat": 31.225, "radius": 0.025},
    {"name": "人民广场周边", "lng": 121.473, "lat": 31.230, "radius": 0.015},
    {"name": "复兴公园周边", "lng": 121.463, "lat": 31.214, "radius": 0.015},
    {"name": "中山公园周边", "lng": 121.421, "lat": 31.220, "radius": 0.018},
    {"name": "长风公园周边", "lng": 121.405, "lat": 31.235, "radius": 0.015},
    {"name": "上海植物园周边", "lng": 121.445, "lat": 31.175, "radius": 0.015},
]

RESIDENTIAL_ZONES = [
    {"name": "顾村大型居住区", "lng": 121.37, "lat": 31.35, "radius": 0.04, "type": "成熟居住区"},
    {"name": "江桥大型居住区", "lng": 121.33, "lat": 31.26, "radius": 0.04, "type": "成熟居住区"},
    {"name": "泗泾大型居住区", "lng": 121.29, "lat": 31.10, "radius": 0.04, "type": "新兴居住区"},
    {"name": "南翔大型居住区", "lng": 121.31, "lat": 31.29, "radius": 0.035, "type": "成熟居住区"},
    {"name": "周浦大型居住区", "lng": 121.57, "lat": 31.11, "radius": 0.035, "type": "新兴居住区"},
    {"name": "曹路大型居住区", "lng": 121.65, "lat": 31.28, "radius": 0.035, "type": "新兴居住区"},
    {"name": "金桥居住区", "lng": 121.59, "lat": 31.26, "radius": 0.03, "type": "成熟居住区"},
    {"name": "三林居住区", "lng": 121.51, "lat": 31.15, "radius": 0.03, "type": "成熟居住区"},
    {"name": "浦江居住区", "lng": 121.50, "lat": 31.05, "radius": 0.03, "type": "新兴居住区"},
    {"name": "徐泾居住区", "lng": 121.30, "lat": 31.18, "radius": 0.03, "type": "新兴居住区"},
]

COMMERCIAL_ZONES = [
    {"name": "南京西路商圈", "lng": 121.45, "lat": 31.23, "radius": 0.015},
    {"name": "淮海路商圈", "lng": 121.468, "lat": 31.218, "radius": 0.012},
    {"name": "徐家汇商圈", "lng": 121.438, "lat": 31.195, "radius": 0.015},
    {"name": "陆家嘴商圈", "lng": 121.515, "lat": 31.238, "radius": 0.015},
    {"name": "五角场商圈", "lng": 121.51, "lat": 31.298, "radius": 0.015},
]

INDUSTRIAL_ZONES = [
    {"name": "张江高科技园区", "lng": 121.60, "lat": 31.20, "radius": 0.035, "type": "产业园区"},
    {"name": "金桥出口加工区", "lng": 121.62, "lat": 31.26, "radius": 0.03, "type": "工业区边缘"},
    {"name": "外高桥保税区", "lng": 121.59, "lat": 31.35, "radius": 0.035, "type": "工业区边缘"},
    {"name": "松江工业区", "lng": 121.23, "lat": 31.00, "radius": 0.035, "type": "工业区边缘"},
    {"name": "嘉定工业区", "lng": 121.25, "lat": 31.40, "radius": 0.03, "type": "工业区边缘"},
    {"name": "漕河泾开发区", "lng": 121.42, "lat": 31.17, "radius": 0.02, "type": "产业园区"},
]

UNIVERSITY_ZONES = [
    {"name": "松江大学城", "lng": 121.22, "lat": 31.04, "radius": 0.025},
    {"name": "杨浦大学城", "lng": 121.52, "lat": 31.31, "radius": 0.02},
    {"name": "闵行大学城", "lng": 121.43, "lat": 31.03, "radius": 0.02},
]

TRANSPORT_HUBS = [
    {"name": "虹桥枢纽", "lng": 121.32, "lat": 31.19, "radius": 0.02},
    {"name": "浦东机场", "lng": 121.80, "lat": 31.15, "radius": 0.03},
    {"name": "上海火车站", "lng": 121.45, "lat": 31.25, "radius": 0.012},
    {"name": "上海南站", "lng": 121.43, "lat": 31.15, "radius": 0.012},
]


def _haversine(lng1: float, lat1: float, lng2: float, lat2: float) -> float:
    R = 6371000.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _estimate_population_density(dist_to_center: float, surrounding_density: float) -> str:
    if dist_to_center < 5000:
        return "高密度"
    elif dist_to_center < 10000:
        return "中高密度"
    elif dist_to_center < 15000:
        return "中密度"
    else:
        if surrounding_density > 2:
            return "中密度"
        elif surrounding_density > 0.5:
            return "中低密度"
        else:
            return "低密度"


def _classify_blind_spot(
    lng: float,
    lat: float,
    dist_to_center: float,
    surrounding_density: float,
    nearest_store_dist: float,
) -> dict:
    for zone in PARK_ZONES:
        d = math.sqrt((lng - zone["lng"]) ** 2 + (lat - zone["lat"]) ** 2)
        if d < zone["radius"]:
            return {
                "type": "公园周边",
                "sub_type": zone["name"],
                "category": "休闲区域",
                "priority": "低",
            }

    for zone in UNIVERSITY_ZONES:
        d = math.sqrt((lng - zone["lng"]) ** 2 + (lat - zone["lat"]) ** 2)
        if d < zone["radius"]:
            return {
                "type": "高教园区",
                "sub_type": zone["name"],
                "category": "教育区域",
                "priority": "高",
            }

    for zone in TRANSPORT_HUBS:
        d = math.sqrt((lng - zone["lng"]) ** 2 + (lat - zone["lat"]) ** 2)
        if d < zone["radius"]:
            return {
                "type": "交通枢纽",
                "sub_type": zone["name"],
                "category": "流动人群",
                "priority": "高",
            }

    for zone in INDUSTRIAL_ZONES:
        d = math.sqrt((lng - zone["lng"]) ** 2 + (lat - zone["lat"]) ** 2)
        if d < zone["radius"]:
            return {
                "type": zone["type"],
                "sub_type": zone["name"],
                "category": "产业区域",
                "priority": "中",
            }

    for zone in COMMERCIAL_ZONES:
        d = math.sqrt((lng - zone["lng"]) ** 2 + (lat - zone["lat"]) ** 2)
        if d < zone["radius"]:
            if surrounding_density < 1:
                return {
                    "type": "商业空白区",
                    "sub_type": zone["name"],
                    "category": "商业区域",
                    "priority": "极高",
                }

    for zone in RESIDENTIAL_ZONES:
        d = math.sqrt((lng - zone["lng"]) ** 2 + (lat - zone["lat"]) ** 2)
        if d < zone["radius"]:
            return {
                "type": zone["type"],
                "sub_type": zone["name"],
                "category": "居住区域",
                "priority": "高" if zone["type"] == "新兴居住区" else "中",
            }

    if dist_to_center > 20000:
        return {
            "type": "远郊",
            "sub_type": "城市外围",
            "category": "郊区",
            "priority": "低",
        }
    elif dist_to_center > 12000:
        return {
            "type": "近郊",
            "sub_type": "近郊发展区",
            "category": "近郊",
            "priority": "中",
        }

    if surrounding_density > 5:
        return {
            "type": "成熟居民区",
            "sub_type": "高密度社区",
            "category": "居住区域",
            "priority": "高",
        }
    elif surrounding_density > 2:
        return {
            "type": "发展中区域",
            "sub_type": "混合功能区",
            "category": "混合区域",
            "priority": "中",
        }
    elif surrounding_density > 0.5:
        return {
            "type": "新兴发展区",
            "sub_type": "潜力区域",
            "category": "发展中",
            "priority": "中高",
        }

    if dist_to_center < 8000 and nearest_store_dist > 1500:
        return {
            "type": "核心空白区",
            "sub_type": "内环稀缺",
            "category": "核心区域",
            "priority": "极高",
        }

    return {
        "type": "其他区域",
        "sub_type": "待开发",
        "category": "未分类",
        "priority": "低",
    }


def _get_surrounding_density(grid: dict, all_grids: list[dict], radius: int = 2) -> float:
    ci = grid.get("index", 0)
    cols = int(math.sqrt(len(all_grids)))
    row = ci // cols
    col = ci % cols

    total = 0
    count = 0
    for g in all_grids:
        gi = g.get("index", 0)
        grow = gi // cols
        gcol = gi % cols
        if abs(grow - row) <= radius and abs(gcol - col) <= radius:
            total += g["count"]
            count += 1
    return total / count if count > 0 else 0


def find_blind_spots(
    grids: list[dict] | None = None,
    pois: list[dict] | None = None,
    min_distance_meters: float = 800.0,
) -> list[dict]:
    if grids is None:
        grids = load_density()
    if not grids:
        return []
    if pois is None:
        pois = load_pois()

    poi_coords = [(p["lng"], p["lat"]) for p in pois] if pois else []

    zero_grids = [g for g in grids if g["count"] == 0]

    blind_spots = []
    for g in zero_grids:
        clng = g["center_lng"]
        clat = g["center_lat"]

        min_dist = float("inf")
        for plng, plat in poi_coords:
            d = _haversine(clng, clat, plng, plat)
            if d < min_dist:
                min_dist = d

        if min_dist >= min_distance_meters:
            dist_to_center = _haversine(clng, clat, SHANGHAI_CENTER_LNG, SHANGHAI_CENTER_LAT)
            surrounding_density = _get_surrounding_density(g, grids)
            classification = _classify_blind_spot(clng, clat, dist_to_center, surrounding_density, min_dist)
            pop_density = _estimate_population_density(dist_to_center, surrounding_density)

            blind_spots.append({
                **g,
                "nearest_store_distance_m": round(min_dist, 1),
                "blind_spot_type": classification["type"],
                "blind_spot_sub_type": classification["sub_type"],
                "blind_spot_category": classification["category"],
                "blind_spot_priority": classification["priority"],
                "distance_to_center_m": round(dist_to_center, 1),
                "surrounding_density": round(surrounding_density, 2),
                "estimated_pop_density": pop_density,
            })

    return blind_spots


def find_low_density_areas(
    grids: list[dict] | None = None,
    threshold: int = 1,
) -> list[dict]:
    if grids is None:
        grids = load_density()
    if not grids:
        return []

    low_areas = []
    for g in grids:
        if 0 < g["count"] <= threshold:
            low_areas.append({
                **g,
                "area_type": "便利店稀缺区",
            })
    return low_areas


def analyze_coverage(
    grids: list[dict] | None = None,
    pois: list[dict] | None = None,
) -> dict:
    if grids is None:
        grids = load_density()
    if not grids:
        return {"total_grids": 0, "covered_grids": 0, "blind_grids": 0, "coverage_rate": 0.0}

    total = len(grids)
    covered = sum(1 for g in grids if g["count"] > 0)
    blind = total - covered

    blind_spots = find_blind_spots(grids, pois)
    low_areas = find_low_density_areas(grids)

    brand_counts: dict[str, int] = {}
    for g in grids:
        for brand, cnt in g.get("brands", {}).items():
            brand_counts[brand] = brand_counts.get(brand, 0) + cnt

    total_stores = sum(g["count"] for g in grids)
    max_count = max((g["count"] for g in grids), default=0)
    avg_count = total_stores / total if total > 0 else 0

    blind_spot_types: dict[str, int] = {}
    for spot in blind_spots:
        t = spot.get("blind_spot_type", "其他区域")
        blind_spot_types[t] = blind_spot_types.get(t, 0) + 1

    return {
        "total_grids": total,
        "covered_grids": covered,
        "blind_grids": blind,
        "coverage_rate": round(covered / total * 100, 2) if total > 0 else 0.0,
        "total_stores": total_stores,
        "max_density": max_count,
        "avg_density": round(avg_count, 2),
        "blind_spot_count": len(blind_spots),
        "low_density_count": len(low_areas),
        "brand_distribution": brand_counts,
        "blind_spot_types": blind_spot_types,
    }


def save_analysis(blind_spots: list[dict], analysis: dict):
    ensure_data_dir()
    with open(get_data_path("blind_spots.json"), "w", encoding="utf-8") as f:
        json.dump(blind_spots, f, ensure_ascii=False, indent=2)
    with open(get_data_path("analysis_summary.json"), "w", encoding="utf-8") as f:
        json.dump(analysis, f, ensure_ascii=False, indent=2)
    print(f"Analysis complete: {len(blind_spots)} blind spots found")


def load_blind_spots() -> list[dict]:
    path = get_data_path("blind_spots.json")
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_analysis() -> dict:
    path = get_data_path("analysis_summary.json")
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
