import numpy as np
from typing import List, Dict
from scipy.stats import gaussian_kde
from sklearn.neighbors import KernelDensity
from math import radians, cos, sin, asin, sqrt


class KDEEstimator:
    def __init__(self, bandwidth: float = 0.01):
        self.bandwidth = bandwidth

    def haversine(self, lon1: float, lat1: float, lon2: float, lat2: float) -> float:
        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * asin(sqrt(a))
        r = 6371
        return c * r * 1000

    def compute_kde(self, points: List[Dict]) -> Dict:
        coords = np.array([[p["lng"], p["lat"]] for p in points])
        
        kde = KernelDensity(bandwidth=self.bandwidth, kernel="gaussian")
        kde.fit(coords)
        
        densities = np.exp(kde.score_samples(coords))
        
        return {
            "points": points,
            "densities": densities.tolist(),
            "mean_density": float(np.mean(densities)),
            "max_density": float(np.max(densities)),
            "min_density": float(np.min(densities))
        }

    def hexagon_binning(
        self,
        points: List[Dict],
        hex_size: float = 0.002
    ) -> List[Dict]:
        coords = np.array([[p["lng"], p["lat"]] for p in points])
        
        min_lng, min_lat = np.min(coords, axis=0)
        max_lng, max_lat = np.max(coords, axis=0)
        
        hex_width = hex_size * 2
        hex_height = hex_size * np.sqrt(3)
        
        hexagons = {}
        
        for coord, point in zip(coords, points):
            lng, lat = coord
            
            col = int((lng - min_lng) / (hex_width * 0.75))
            
            if col % 2 == 0:
                row = int((lat - min_lat) / hex_height)
            else:
                row = int((lat - min_lat - hex_height / 2) / hex_height)
            
            hex_key = (col, row)
            
            if hex_key not in hexagons:
                center_col = min_lng + col * hex_width * 0.75
                center_row = min_lat + row * hex_height + (hex_height / 2 if col % 2 else 0)
                hexagons[hex_key] = {
                    "centroid": [center_col, center_row],
                    "count": 0,
                    "points": []
                }
            
            hexagons[hex_key]["count"] += 1
            hexagons[hex_key]["points"].append(point)
        
        result = []
        for hex_key, hex_data in hexagons.items():
            result.append({
                "position": hex_data["centroid"],
                "count": hex_data["count"],
                "lng": hex_data["centroid"][0],
                "lat": hex_data["centroid"][1]
            })
        
        return sorted(result, key=lambda x: x["count"], reverse=True)

    def calculate_spatial_overlap(
        self,
        coffee_shops: List[Dict],
        office_buildings: List[Dict]
    ) -> Dict:
        coffee_coords = np.array([[p["lng"], p["lat"]] for p in coffee_shops])
        office_coords = np.array([[p["lng"], p["lat"]] for p in office_buildings])
        
        coffee_kde = gaussian_kde(coffee_coords.T, bw_method=self.bandwidth)
        office_kde = gaussian_kde(office_coords.T, bw_method=self.bandwidth)
        
        all_coords = np.vstack([coffee_coords, office_coords])
        
        coffee_densities = coffee_kde(all_coords.T)
        office_densities = office_kde(all_coords.T)
        
        overlap_score = np.sum(np.minimum(coffee_densities, office_densities)) / np.sum(np.maximum(coffee_densities, office_densities))
        
        avg_distance = 0
        for coffee in coffee_shops:
            min_dist = float("inf")
            for office in office_buildings:
                dist = self.haversine(
                    coffee["lng"], coffee["lat"],
                    office["lng"], office["lat"]
                )
                min_dist = min(min_dist, dist)
            avg_distance += min_dist
        
        avg_distance = avg_distance / len(coffee_shops) if coffee_shops else 0
        
        return {
            "overlap_score": float(overlap_score),
            "avg_coffee_to_office_distance": float(avg_distance),
            "coffee_shop_count": len(coffee_shops),
            "office_building_count": len(office_buildings)
        }

    def generate_analysis_report(
        self,
        coffee_shops: List[Dict],
        office_buildings: List[Dict]
    ) -> Dict:
        hex_data = self.hexagon_binning(office_buildings)
        overlap_stats = self.calculate_spatial_overlap(coffee_shops, office_buildings)
        
        luckin_count = sum(1 for c in coffee_shops if c.get("type") == "luckin")
        starbucks_count = sum(1 for c in coffee_shops if c.get("type") == "starbucks")
        
        return {
            "hexagon_data": hex_data[:100],
            "statistics": {
                "total_offices": len(office_buildings),
                "total_coffee_shops": len(coffee_shops),
                "luckin_count": luckin_count,
                "starbucks_count": starbucks_count
            },
            "overlap_analysis": overlap_stats
        }


if __name__ == "__main__":
    estimator = KDEEstimator()
    print("KDE Estimator initialized")
