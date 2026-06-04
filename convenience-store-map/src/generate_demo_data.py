import json
import math
import random
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config import DATA_DIR, ensure_data_dir, get_data_path, set_data_source

SHANGHAI_CENTER_LNG = 121.4737
SHANGHAI_CENTER_LAT = 31.2304

BRANDS = ["罗森", "全家", "7-Eleven", "快客", "可的", "好德", "良友", "其他便利店"]
BRAND_WEIGHTS = [0.25, 0.22, 0.18, 0.10, 0.08, 0.07, 0.05, 0.05]

HOT_ZONES = [
    {"lng": 121.4737, "lat": 31.2304, "radius": 0.03, "intensity": 0.9},
    {"lng": 121.4437, "lat": 31.2184, "radius": 0.025, "intensity": 0.85},
    {"lng": 121.5017, "lat": 31.2394, "radius": 0.028, "intensity": 0.8},
    {"lng": 121.4557, "lat": 31.2504, "radius": 0.02, "intensity": 0.75},
    {"lng": 121.4887, "lat": 31.2154, "radius": 0.022, "intensity": 0.7},
    {"lng": 121.4257, "lat": 31.2054, "radius": 0.015, "intensity": 0.5},
    {"lng": 121.5107, "lat": 31.2554, "radius": 0.018, "intensity": 0.55},
    {"lng": 121.4687, "lat": 31.2604, "radius": 0.02, "intensity": 0.6},
]

COLD_ZONES = [
    {"lng": 121.38, "lat": 31.18, "radius": 0.03},
    {"lng": 121.55, "lat": 31.28, "radius": 0.025},
    {"lng": 121.35, "lat": 31.25, "radius": 0.02},
    {"lng": 121.52, "lat": 31.15, "radius": 0.03},
]


def _in_cold_zone(lng, lat):
    for zone in COLD_ZONES:
        dist = math.sqrt((lng - zone["lng"]) ** 2 + (lat - zone["lat"]) ** 2)
        if dist < zone["radius"]:
            return True
    return False


def _get_zone_intensity(lng, lat):
    max_intensity = 0.05
    for zone in HOT_ZONES:
        dist = math.sqrt((lng - zone["lng"]) ** 2 + (lat - zone["lat"]) ** 2)
        if dist < zone["radius"]:
            proximity = 1 - dist / zone["radius"]
            intensity = zone["intensity"] * proximity
            max_intensity = max(max_intensity, intensity)
    return max_intensity


def generate_pois(count: int = 3000) -> list[dict]:
    pois = []
    for i in range(count):
        lng = SHANGHAI_CENTER_LNG + random.uniform(-0.12, 0.12)
        lat = SHANGHAI_CENTER_LAT + random.uniform(-0.08, 0.08)

        if _in_cold_zone(lng, lat):
            if random.random() > 0.05:
                continue

        brand = random.choices(BRANDS, weights=BRAND_WEIGHTS, k=1)[0]
        pois.append({
            "name": f"{brand}({random.randint(1, 999)}号店)",
            "brand": brand,
            "lng": round(lng, 6),
            "lat": round(lat, 6),
            "address": f"上海市XX区XX路{random.randint(1, 999)}号",
            "adcode": "310100",
        })
    return pois


def main():
    print("Generating demo convenience store POI data...")
    ensure_data_dir()
    pois = generate_pois(3000)
    with open(get_data_path("convenience_pois.json"), "w", encoding="utf-8") as f:
        json.dump(pois, f, ensure_ascii=False, indent=2)
    print(f"Generated {len(pois)} POIs")

    from src.grid.density_calculator import calculate_density, save_density
    from src.analysis.blind_spot import find_blind_spots, analyze_coverage, save_analysis

    bounds = {
        "sw_lng": SHANGHAI_CENTER_LNG - 0.12,
        "sw_lat": SHANGHAI_CENTER_LAT - 0.08,
        "ne_lng": SHANGHAI_CENTER_LNG + 0.12,
        "ne_lat": SHANGHAI_CENTER_LAT + 0.08,
    }

    grids = calculate_density(pois, bounds, 500.0)
    save_density(grids)

    blind = find_blind_spots(grids, pois)
    analysis = analyze_coverage(grids, pois)
    save_analysis(blind, analysis)

    print(f"Density: {len(grids)} grids")
    print(f"Blind spots: {len(blind)}")
    print(f"Coverage rate: {analysis.get('coverage_rate', 0)}%")

    set_data_source("demo", {
        "pois_count": len(pois),
        "grids_count": len(grids),
        "blind_spots_count": len(blind),
    })

    print("Demo data generation complete!")


if __name__ == "__main__":
    main()
