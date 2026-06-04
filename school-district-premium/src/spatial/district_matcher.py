import json
from pathlib import Path

import numpy as np

try:
    from shapely.geometry import Point, Polygon
    from shapely.ops import nearest_points

    HAS_SHAPELY = True
except ImportError:
    HAS_SHAPELY = False


DATA_DIR = Path(__file__).resolve().parent.parent / "data"


class DistrictMatcher:
    def __init__(self, schools: list[dict] | None = None):
        self.schools = schools or []
        self._polygons: list[tuple[str, object]] = []

    def load_schools(self, schools: list[dict]):
        self.schools = schools
        self._build_polygons()

    def _build_polygons(self):
        self._polygons = []
        for school in self.schools:
            name = school["name"]
            coords = school.get("polygon", [])
            if len(coords) < 3:
                continue
            if HAS_SHAPELY:
                try:
                    poly = Polygon([(c[0], c[1]) for c in coords])
                    if poly.is_valid:
                        self._polygons.append((name, poly))
                    else:
                        self._polygons.append((name, poly.buffer(0)))
                except Exception:
                    pass
            else:
                self._polygons.append((name, coords))

    def match_point(self, lng: float, lat: float) -> str:
        if HAS_SHAPELY and self._polygons:
            pt = Point(lng, lat)
            for name, poly in self._polygons:
                if isinstance(poly, Polygon) and poly.contains(pt):
                    return name
            min_dist = float("inf")
            nearest = ""
            for name, poly in self._polygons:
                if isinstance(poly, Polygon):
                    dist = pt.distance(poly)
                    if dist < min_dist:
                        min_dist = dist
                        nearest = name
            return nearest
        return self._match_simple(lng, lat)

    def _match_simple(self, lng: float, lat: float) -> str:
        min_dist = float("inf")
        nearest = ""
        for school in self.schools:
            coords = school.get("polygon", [])
            if not coords:
                continue
            center_lng = sum(c[0] for c in coords) / len(coords)
            center_lat = sum(c[1] for c in coords) / len(coords)
            dist = (lng - center_lng) ** 2 + (lat - center_lat) ** 2
            if dist < min_dist:
                min_dist = dist
                nearest = school["name"]
        return nearest

    def match_all(self, houses: list[dict]) -> list[dict]:
        results = []
        for house in houses:
            lng = house.get("lng", 116.4)
            lat = house.get("lat", 39.9)
            school_name = self.match_point(lng, lat)
            results.append({
                "house_index": len(results),
                "community": house.get("community", ""),
                "school_name": school_name,
                "lng": lng,
                "lat": lat,
            })
        return results

    def geocode_community(self, community_name: str) -> tuple[float, float]:
        return 116.4, 39.9

    def enrich_houses_with_coords(self, houses: list[dict]) -> list[dict]:
        rng = np.random.RandomState(42)
        center_lng, center_lat = 116.3168, 39.9822
        for i, house in enumerate(houses):
            if "lng" not in house or "lat" not in house:
                house["lng"] = round(center_lng + rng.uniform(-0.05, 0.05), 6)
                house["lat"] = round(center_lat + rng.uniform(-0.04, 0.04), 6)
        return houses

    @staticmethod
    def compute_district_premium_stats(premium_results: list[dict], schools: list[dict]) -> list[dict]:
        district_premiums: dict[str, list[float]] = {}
        district_prices: dict[str, list[float]] = {}
        for r in premium_results:
            sn = r.get("school_name", "")
            if not sn:
                continue
            district_premiums.setdefault(sn, []).append(r["premium_pct"])
            district_prices.setdefault(sn, []).append(r["unit_price"])

        stats = []
        for school in schools:
            name = school["name"]
            prems = district_premiums.get(name, [])
            prices = district_prices.get(name, [])
            avg_premium = float(np.mean(prems)) if prems else 0.0
            avg_price = float(np.mean(prices)) if prices else 0.0
            stats.append({
                "school_name": name,
                "district": school.get("district", ""),
                "polygon": school.get("polygon", []),
                "center": school.get("approx_center", [116.4, 39.9]),
                "avg_premium_pct": round(avg_premium, 2),
                "avg_unit_price": round(avg_price, 0),
                "sample_count": len(prems),
            })

        out_path = DATA_DIR / "district_stats.json"
        out_path.write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")
        return stats
