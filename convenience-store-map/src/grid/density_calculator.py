import json
import math

from src.poi.convenience_crawler import load_pois, generate_grid
from src.config import DATA_DIR, get_data_path, ensure_data_dir


def calculate_density(
    pois: list[dict] | None = None,
    bounds: dict | None = None,
    grid_step: float = 500.0,
) -> list[dict]:
    if pois is None:
        pois = load_pois()
    if not pois:
        return []

    if bounds is None:
        lngs = [p["lng"] for p in pois]
        lats = [p["lat"] for p in pois]
        padding = 0.005
        bounds = {
            "sw_lng": min(lngs) - padding,
            "sw_lat": min(lats) - padding,
            "ne_lng": max(lngs) + padding,
            "ne_lat": max(lats) + padding,
        }

    grids = generate_grid(bounds, grid_step)

    lng_step = grids[0]["ne_lng"] - grids[0]["sw_lng"] if grids else 0.005
    lat_step = grids[0]["ne_lat"] - grids[0]["sw_lat"] if grids else 0.005

    grid_map: dict[tuple[int, int], dict] = {}
    for idx, g in enumerate(grids):
        key = (idx,)
        grid_map[idx] = {
            "index": idx,
            "sw_lng": g["sw_lng"],
            "sw_lat": g["sw_lat"],
            "ne_lng": g["ne_lng"],
            "ne_lat": g["ne_lat"],
            "center_lng": g["center_lng"],
            "center_lat": g["center_lat"],
            "count": 0,
            "brands": {},
            "pois": [],
        }

    for poi in pois:
        col = int((poi["lng"] - bounds["sw_lng"]) / lng_step)
        row = int((poi["lat"] - bounds["sw_lat"]) / lat_step)
        cols = math.ceil((bounds["ne_lng"] - bounds["sw_lng"]) / lng_step)
        idx = row * cols + col
        if idx in grid_map:
            grid_map[idx]["count"] += 1
            brand = poi.get("brand", "其他便利店")
            grid_map[idx]["brands"][brand] = grid_map[idx]["brands"].get(brand, 0) + 1
            grid_map[idx]["pois"].append(poi["name"])

    results = []
    for g in grid_map.values():
        results.append({
            "index": g["index"],
            "sw_lng": g["sw_lng"],
            "sw_lat": g["sw_lat"],
            "ne_lng": g["ne_lng"],
            "ne_lat": g["ne_lat"],
            "center_lng": g["center_lng"],
            "center_lat": g["center_lat"],
            "count": g["count"],
            "brands": g["brands"],
        })

    return results


def density_to_geojson(grids: list[dict]) -> dict:
    features = []
    for g in grids:
        sw = [g["sw_lng"], g["sw_lat"]]
        se = [g["ne_lng"], g["sw_lat"]]
        ne = [g["ne_lng"], g["ne_lat"]]
        nw = [g["sw_lng"], g["ne_lat"]]

        feature = {
            "type": "Feature",
            "properties": {
                "count": g["count"],
                "brands": g.get("brands", {}),
                "center_lng": g["center_lng"],
                "center_lat": g["center_lat"],
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[sw, se, ne, nw, sw]],
            },
        }
        features.append(feature)

    return {
        "type": "FeatureCollection",
        "features": features,
    }


def save_density(grids: list[dict]):
    ensure_data_dir()
    geojson = density_to_geojson(grids)
    with open(get_data_path("density_grid.json"), "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    with open(get_data_path("density_summary.json"), "w", encoding="utf-8") as f:
        summary = [
            {k: v for k, v in g.items() if k != "pois"} for g in grids
        ]
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"Saved density data: {len(grids)} grid cells")


def load_density() -> list[dict]:
    path = get_data_path("density_summary.json")
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_density_geojson() -> dict:
    path = get_data_path("density_grid.json")
    if not path.exists():
        return {"type": "FeatureCollection", "features": []}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
