import os
import math
import json
import requests
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from dataclasses import dataclass

load_dotenv()

GAODE_TRAFFIC_KEY = os.getenv("GAODE_TRAFFIC_KEY", "")
CITY_CENTER_LNG = float(os.getenv("CITY_CENTER_LNG", "116.397428"))
CITY_CENTER_LAT = float(os.getenv("CITY_CENTER_LAT", "39.90923"))

POI_URL = "https://restapi.amap.com/v3/place/text"
AROUND_URL = "https://restapi.amap.com/v3/place/around"

DEFAULT_SCENIC_SPOTS = [
    {"name": "八达岭长城", "lng": 116.0278, "lat": 40.3589, "level": "5A", "direction": "西北"},
    {"name": "颐和园", "lng": 116.2764, "lat": 39.9999, "level": "5A", "direction": "西北"},
    {"name": "故宫博物院", "lng": 116.3970, "lat": 39.9163, "level": "5A", "direction": "市中心"},
    {"name": "天坛公园", "lng": 116.4109, "lat": 39.8819, "level": "5A", "direction": "南"},
    {"name": "北海公园", "lng": 116.3831, "lat": 39.9389, "level": "4A", "direction": "北"},
    {"name": "香山公园", "lng": 116.1883, "lat": 39.9948, "level": "4A", "direction": "西北"},
    {"name": "慕田峪长城", "lng": 116.5664, "lat": 40.4546, "level": "5A", "direction": "东北"},
    {"name": "十三陵", "lng": 116.2778, "lat": 40.2583, "level": "5A", "direction": "西北"},
    {"name": "北京欢乐谷", "lng": 116.4892, "lat": 39.8656, "level": "4A", "direction": "东南"},
    {"name": "雍和宫", "lng": 116.4163, "lat": 39.9481, "level": "4A", "direction": "东北"},
    {"name": "圆明园", "lng": 116.3084, "lat": 40.0083, "level": "5A", "direction": "西北"},
    {"name": "南锣鼓巷", "lng": 116.4039, "lat": 39.9371, "level": "历史街区", "direction": "北"},
    {"name": "798艺术区", "lng": 116.4969, "lat": 39.9847, "level": "文化创意", "direction": "东北"},
    {"name": "鸟巢", "lng": 116.3968, "lat": 39.9936, "level": "4A", "direction": "北"},
    {"name": "古北水镇", "lng": 117.1244, "lat": 40.6512, "level": "5A", "direction": "东北"},
    {"name": "十渡风景区", "lng": 115.6057, "lat": 39.7078, "level": "4A", "direction": "西南"},
    {"name": "京东大峡谷", "lng": 117.0669, "lat": 40.2206, "level": "4A", "direction": "东北"},
    {"name": "潭柘寺", "lng": 116.0844, "lat": 39.8867, "level": "4A", "direction": "西"},
    {"name": "戒台寺", "lng": 116.0997, "lat": 39.8236, "level": "4A", "direction": "西南"},
    {"name": "云蒙山", "lng": 116.8486, "lat": 40.5967, "level": "4A", "direction": "东北"},
]


@dataclass
class ScenicSpot:
    name: str
    lng: float
    lat: float
    level: str
    direction: str
    popularity: int = 0
    distance_km: float = 0


class POIAssociator:
    def __init__(self, center_lng: float = CITY_CENTER_LNG, center_lat: float = CITY_CENTER_LAT):
        self.center_lng = center_lng
        self.center_lat = center_lat
        self.scenic_spots: List[Dict[str, Any]] = []
        self._load_default_spots()

    def _load_default_spots(self):
        for spot in DEFAULT_SCENIC_SPOTS:
            spot["distance_km"] = self._calculate_distance_km(
                self.center_lng, self.center_lat,
                spot["lng"], spot["lat"]
            )
            self.scenic_spots.append(spot)

    def _calculate_distance_km(self, lng1: float, lat1: float, lng2: float, lat2: float) -> float:
        R = 6371.0
        
        lng1_rad = math.radians(lng1)
        lat1_rad = math.radians(lat1)
        lng2_rad = math.radians(lng2)
        lat2_rad = math.radians(lat2)
        
        d_lng = lng2_rad - lng1_rad
        d_lat = lat2_rad - lat1_rad
        
        a = math.sin(d_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(d_lng / 2) ** 2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c

    def _calculate_bearing(self, lng1: float, lat1: float, lng2: float, lat2: float) -> float:
        lng1_rad = math.radians(lng1)
        lat1_rad = math.radians(lat1)
        lng2_rad = math.radians(lng2)
        lat2_rad = math.radians(lat2)
        
        d_lng = lng2_rad - lng1_rad
        
        y = math.sin(d_lng) * math.cos(lat2_rad)
        x = math.cos(lat1_rad) * math.sin(lat2_rad) - math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(d_lng)
        
        bearing = math.degrees(math.atan2(y, x))
        bearing = (bearing + 360) % 360
        
        return bearing

    def fetch_scenic_pois(self, radius: int = 50000) -> List[Dict[str, Any]]:
        if not GAODE_TRAFFIC_KEY:
            print("Warning: No Gaode API key not found, using default data")
            return self.scenic_spots

        params = {
            "key": GAODE_TRAFFIC_KEY,
            "keywords": "风景名胜",
            "location": f"{self.center_lng},{self.center_lat}",
            "radius": radius,
            "offset": 50,
            "page": 1,
            "extensions": "base"
        }

        try:
            response = requests.get(AROUND_URL, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if data.get("status") == "1":
                pois = data.get("pois", [])
                for poi in pois:
                    location = poi.get("location", "")
                    if location:
                        lng, lat = map(float, location.split(","))
                        name = poi.get("name", "")
                        level = poi.get("type", "")
                        
                        spot = {
                            "name": name,
                            "lng": lng,
                            "lat": lat,
                            "level": level,
                            "direction": self._get_direction_name(
                                self._calculate_bearing(self.center_lng, self.center_lat, lng, lat)
                            ),
                            "distance_km": self._calculate_distance_km(
                                self.center_lng, self.center_lat, lng, lat)
                        }
                        self.scenic_spots.append(spot)

        except Exception as e:
            print(f"Error fetching POIs: {e}")

        return self.scenic_spots

    def _get_direction_name(self, angle: float) -> str:
        directions = {
            0: "北",
            45: "东北",
            90: "东",
            135: "东南",
            180: "南",
            225: "西南",
            270: "西",
            315: "西北"
        }
        
        min_diff = 360
        closest_direction = "北"
        
        for dir_angle, dir_name in directions.items():
            diff = abs(angle - dir_angle)
            if diff > 180:
                diff = 360 - diff
            if diff < min_diff:
                min_diff = diff
                closest_direction = dir_name
        
        return closest_direction

    def associate_directions_with_pois(self, direction_clusters: List[Dict[str, Any]],
                                 max_distance_km: float = 80) -> List[Dict[str, Any]]:
        results = []

        for cluster in direction_clusters:
            cluster_angle = cluster["direction_angle"]
            cluster_direction = cluster["direction_name"]
            flow_volume = cluster["flow_volume"]

            matching_spots = []
            for spot in self.scenic_spots:
                spot_angle = self._calculate_bearing(
                    self.center_lng, self.center_lat,
                    spot["lng"], spot["lat"]
                )

                angle_diff = abs(spot_angle - cluster_angle)
                if angle_diff > 180:
                    angle_diff = 360 - angle_diff

                if angle_diff < 60 and spot["distance_km"] <= max_distance_km:
                    popularity_score = self._calculate_popularity(
                        flow_volume, spot["distance_km"], angle_diff)
                    
                    matching_spots.append({
                        **spot,
                        "angle_diff": angle_diff,
                        "popularity": popularity_score,
                        "relevance": 100 - (angle_diff / 60 * 50) - (spot["distance_km"] / max_distance_km * 50)
                    })

            matching_spots.sort(key=lambda x: x["popularity"], reverse=True)

            results.append({
                "direction": cluster_direction,
                "direction_angle": cluster_angle,
                "flow_volume": flow_volume,
                "flow_percentage": cluster.get("flow_percentage", 0),
                "avg_congestion": cluster.get("avg_congestion", 0),
                "scenic_spots": matching_spots[:5],
                "top_destination": matching_spots[0] if matching_spots else None
            })

        return results

    def _calculate_popularity(self, flow_volume: int, distance: float, angle_diff: float) -> float:
        flow_score = min(flow_volume / 100, 1.0) * 40
        distance_score = max(0, 1 - distance / 80) * 30
        angle_score = max(0, 1 - angle_diff / 60) * 30
        return flow_score + distance_score + angle_score

    def get_radial_lines_with_destinations(self, associations: List[Dict[str, Any]],
                                           max_radius_km: float = 60) -> List[Dict[str, Any]]:
        radial_lines = []

        for assoc in associations:
            top_spot = assoc.get("top_destination")
            
            if top_spot:
                end_lng = top_spot["lng"]
                end_lat = top_spot["lat"]
            else:
                angle = math.radians(assoc["direction_angle"])
                end_lng = self.center_lng + (max_radius_km / 111.32) * math.cos(angle)
                end_lat = self.center_lat + (max_radius_km / 111.32) * math.sin(angle)

            line_width = self._calculate_line_width(assoc["flow_volume"])

            radial_lines.append({
                "direction": assoc["direction"],
                "direction_angle": assoc["direction_angle"],
                "start": [self.center_lng, self.center_lat],
                "end": [end_lng, end_lat],
                "flow_volume": assoc["flow_volume"],
                "flow_percentage": assoc["flow_percentage"],
                "line_width": line_width,
                "avg_congestion": assoc["avg_congestion"],
                "color": self._get_congestion_color(assoc["avg_congestion"]),
                "destination": top_spot.get("name") if top_spot else None,
                "destination_level": top_spot.get("level") if top_spot else None,
                "all_spots": [spot["name"] for spot in assoc.get("scenic_spots", [])]
            })

        return radial_lines

    def _calculate_line_width(self, flow_volume: int) -> int:
        max_volume = max([s.get("flow_volume", 1) for s in self.scenic_spots])
        normalized = flow_volume / max_volume if max_volume > 0 else 1
        return max(2, int(normalized * 10))

    def _get_congestion_color(self, congestion_level: float) -> str:
        if congestion_level <= 1:
            return "#00FF00"
        elif congestion_level <= 2:
            return "#FFFF00"
        elif congestion_level <= 3:
            return "#FFA500"
        else:
            return "#FF0000"

    def save_associations(self, associations: List[Dict[str, Any]], filepath: str = None):
        if filepath is None:
            import datetime
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filepath = f"/Users/liboyang/trae/dailyTools/weekend-escape/data/poi_associations_{timestamp}.json"
        
        output = {
            "center": [self.center_lng, self.center_lat],
            "timestamp": datetime.datetime.now().isoformat(),
            "associations": associations
        }
        
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print(f"POI associations saved to {filepath}")


def associate_pois_with_directions(direction_clusters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    associator = POIAssociator()
    associator.fetch_scenic_pois()
    associations = associator.associate_directions_with_pois(direction_clusters)
    
    print(f"\n=== POI Associations ===")
    for assoc in associations:
        print(f"\n{assoc['direction']}方向 (车流量: {assoc['flow_volume']}):")
        for spot in assoc["scenic_spots"][:3]:
            print(f"  - {spot['name']} ({spot['level']}, {spot['distance_km']:.1f}km)")
    
    associator.save_associations(associations)
    return associations


if __name__ == "__main__":
    sample_clusters = [
        {"direction_angle": 315, "direction_name": "西北", "flow_volume": 150, "flow_percentage": 35, "avg_congestion": 3},
        {"direction_angle": 45, "direction_name": "东北", "flow_volume": 120, "flow_percentage": 28, "avg_congestion": 2},
        {"direction_angle": 180, "direction_name": "南", "flow_volume": 80, "flow_percentage": 19, "avg_congestion": 4},
        {"direction_angle": 90, "direction_name": "东", "flow_volume": 50, "flow_percentage": 12, "avg_congestion": 2},
    ]
    associate_pois_with_directions(sample_clusters)
