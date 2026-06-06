import os
import time
import json
import requests
from datetime import datetime
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional

load_dotenv()

GAODE_TRAFFIC_KEY = os.getenv("GAODE_TRAFFIC_KEY", "")
CITY_CENTER_LNG = float(os.getenv("CITY_CENTER_LNG", "116.397428"))
CITY_CENTER_LAT = float(os.getenv("CITY_CENTER_LAT", "39.90923"))
CITY_NAME = os.getenv("CITY_NAME", "北京")

BASE_URL = "https://restapi.amap.com/v3/traffic/status/circle"


class HighwayStatusSpider:
    def __init__(self, center_lng: float = CITY_CENTER_LNG, center_lat: float = CITY_CENTER_LAT):
        self.center_lng = center_lng
        self.center_lat = center_lat
        self.traffic_data: List[Dict[str, Any]] = []

    def fetch_traffic_circle(self, radius: int = 5000, level: int = 5) -> Optional[Dict[str, Any]]:
        params = {
            "key": GAODE_TRAFFIC_KEY,
            "location": f"{self.center_lng},{self.center_lat}",
            "radius": radius,
            "level": level,
            "extensions": "all"
        }
        try:
            response = requests.get(BASE_URL, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            if data.get("status") == "1":
                return data
        except Exception as e:
            print(f"Error fetching traffic data: {e}")
        return None

    def fetch_multi_radius_traffic(self, radii: List[int] = None) -> List[Dict[str, Any]]:
        if radii is None:
            radii = [5000, 10000, 20000, 30000, 50000, 70000, 100000]
        
        all_segments = []
        for radius in radii:
            print(f"Fetching traffic data for radius {radius}m...")
            data = self.fetch_traffic_circle(radius=radius)
            if data and "trafficinfo" in data:
                roads = data["trafficinfo"].get("roads", [])
                for road in roads:
                    segments = self._parse_road_segments(road, radius)
                    all_segments.extend(segments)
            time.sleep(0.5)
        
        self.traffic_data = all_segments
        return all_segments

    def _parse_road_segments(self, road: Dict[str, Any], radius: int) -> List[Dict[str, Any]]:
        segments = []
        if "polyline" not in road:
            return segments
        
        polyline_str = road["polyline"]
        coordinates = self._parse_polyline(polyline_str)
        
        if len(coordinates) < 2:
            return segments
        
        status = road.get("status", 0)
        speed = road.get("speed", 0)
        
        for i in range(len(coordinates) - 1):
            start_coord = coordinates[i]
            end_coord = coordinates[i + 1]
            
            segment = {
                "name": road.get("name", ""),
                "start_lng": start_coord[0],
                "start_lat": start_coord[1],
                "end_lng": end_coord[0],
                "end_lat": end_coord[1],
                "status": int(status),
                "speed": float(speed) if speed else 0,
                "direction": self._calculate_direction(start_coord, end_coord),
                "distance_from_center": radius,
                "is_congested": status in [2, 3, 4],
                "congestion_level": int(status)
            }
            segments.append(segment)
        
        return segments

    def _parse_polyline(self, polyline_str: str) -> List[List[float]]:
        coordinates = []
        points = polyline_str.split(";")
        for point in points:
            try:
                lng, lat = map(float, point.split(","))
                coordinates.append([lng, lat])
            except:
                continue
        return coordinates

    def _calculate_direction(self, start: List[float], end: List[float]) -> float:
        import math
        lng1, lat1 = start
        lng2, lat2 = end
        
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

    def get_congested_segments(self) -> List[Dict[str, Any]]:
        return [s for s in self.traffic_data if s["is_congested"]]

    def get_outbound_segments(self) -> List[Dict[str, Any]]:
        outbound = []
        for segment in self.traffic_data:
            if self._is_outbound(segment):
                outbound.append(segment)
        return outbound

    def _is_outbound(self, segment: Dict[str, Any]) -> bool:
        import math
        
        start_dist = math.sqrt(
            (segment["start_lng"] - self.center_lng) ** 2 +
            (segment["start_lat"] - self.center_lat) ** 2
        )
        end_dist = math.sqrt(
            (segment["end_lng"] - self.center_lng) ** 2 +
            (segment["end_lat"] - self.center_lat) ** 2
        )
        return end_dist > start_dist

    def save_data(self, filepath: str = None):
        if filepath is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filepath = f"/Users/liboyang/trae/dailyTools/weekend-escape/data/traffic_{timestamp}.json"
        
        output = {
            "center": [self.center_lng, self.center_lat],
            "city": CITY_NAME,
            "timestamp": datetime.now().isoformat(),
            "total_segments": len(self.traffic_data),
            "segments": self.traffic_data
        }
        
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print(f"Data saved to {filepath}")

    def load_data(self, filepath: str) -> List[Dict[str, Any]]:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.traffic_data = data.get("segments", [])
        return self.traffic_data


def collect_weekend_traffic() -> List[Dict[str, Any]]:
    spider = HighwayStatusSpider()
    segments = spider.fetch_multi_radius_traffic()
    congested = spider.get_congested_segments()
    outbound = spider.get_outbound_segments()
    
    print(f"Total segments: {len(segments)}")
    print(f"Congested segments: {len(congested)}")
    print(f"Outbound segments: {len(outbound)}")
    
    spider.save_data()
    return segments


if __name__ == "__main__":
    collect_weekend_traffic()
