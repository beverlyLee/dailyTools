import os
import time
import json
import random
import requests
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

GAODE_TRAFFIC_KEY = os.getenv("GAODE_TRAFFIC_KEY", "")
GAODE_WEB_API_KEY = os.getenv("GAODE_WEB_API_KEY", GAODE_TRAFFIC_KEY)

BEIJING_ROADS = [
    {"name": "长安街", "adcode": "110000", "level": 1},
    {"name": "建国门外大街", "adcode": "110000", "level": 2},
    {"name": "复兴门外大街", "adcode": "110000", "level": 2},
    {"name": "东三环", "adcode": "110000", "level": 2},
    {"name": "西三环", "adcode": "110000", "level": 2},
    {"name": "北三环", "adcode": "110000", "level": 2},
    {"name": "南三环", "adcode": "110000", "level": 2},
    {"name": "东二环", "adcode": "110000", "level": 2},
    {"name": "西二环", "adcode": "110000", "level": 2},
    {"name": "京藏高速", "adcode": "110000", "level": 1},
    {"name": "京港澳高速", "adcode": "110000", "level": 1},
    {"name": "机场高速", "adcode": "110000", "level": 1},
]

BEIJING_KEY_AREAS = {
    "capital_airport": {"center": [116.6056, 40.0801], "radius": 0.05, "density": 50},
    "daxing_airport": {"center": [116.4107, 39.5207], "radius": 0.04, "density": 30},
    "beijing_station": {"center": [116.4273, 39.9084], "radius": 0.02, "density": 40},
    "beijing_south": {"center": [116.3783, 39.8653], "radius": 0.025, "density": 45},
    "beijing_west": {"center": [116.3219, 39.8948], "radius": 0.02, "density": 35},
    "wangjing": {"center": [116.4707, 39.9986], "radius": 0.03, "density": 25},
    "cbd": {"center": [116.4606, 39.9145], "radius": 0.025, "density": 35},
    "zhongguancun": {"center": [116.3108, 39.9847], "radius": 0.03, "density": 20},
}


@dataclass
class RoadSegment:
    id: str
    name: str
    polyline: List[Tuple[float, float]]
    speed: float
    status: int
    length: float


class RoadStatusSpider:
    def __init__(self, adcode: str = "110000"):
        self.adcode = adcode
        self.api_key = GAODE_TRAFFIC_KEY
        self.base_url = "https://restapi.amap.com/v3/traffic/status/road"
        self._cached_segments: Optional[List[RoadSegment]] = None
        self._cache_time: float = 0
        self._cache_ttl = 60

    def fetch_road_traffic(self, road_name: str) -> Dict:
        params = {
            "key": self.api_key,
            "adcode": self.adcode,
            "name": road_name,
            "level": 5,
            "extensions": "all",
        }
        try:
            resp = requests.get(self.base_url, params=params, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "1":
                    return data
        except Exception as e:
            print(f"Fetch traffic error for {road_name}: {e}")
        return {}

    def _parse_polyline(self, polyline_str: str) -> List[Tuple[float, float]]:
        points = []
        if not polyline_str:
            return points
        for pair in polyline_str.split(";"):
            if "," in pair:
                lng, lat = pair.split(",")
                try:
                    points.append((float(lng), float(lat)))
                except ValueError:
                    continue
        return points

    def get_all_road_segments(self, use_cache: bool = True) -> List[RoadSegment]:
        now = time.time()
        if use_cache and self._cached_segments and (now - self._cache_time) < self._cache_ttl:
            return self._cached_segments

        segments = []
        for road_info in BEIJING_ROADS:
            data = self.fetch_road_traffic(road_info["name"])
            if not data:
                continue
            traffic_info = data.get("trafficinfo", {})
            roads = traffic_info.get("roads", [])
            for idx, road in enumerate(roads):
                polyline = self._parse_polyline(road.get("polyline", ""))
                if len(polyline) < 2:
                    continue
                speed = float(road.get("speed", 0)) if road.get("speed") else 0
                status = int(road.get("status", 0)) if road.get("status") else 0
                length = float(road.get("length", 0)) if road.get("length") else 0
                segments.append(RoadSegment(
                    id=f"{road_info['name']}_{idx}",
                    name=road.get("name", road_info["name"]),
                    polyline=polyline,
                    speed=speed,
                    status=status,
                    length=length,
                ))

        if not segments:
            segments = self._generate_mock_segments()

        self._cached_segments = segments
        self._cache_time = now
        return segments

    def _generate_mock_segments(self) -> List[RoadSegment]:
        segments = []
        centers = {
            "cbd": [116.4606, 39.9145],
            "wangjing": [116.4707, 39.9986],
            "zhongguancun": [116.3108, 39.9847],
            "sanlitun": [116.4551, 39.9370],
            "xidan": [116.3712, 39.9123],
        }

        road_names = [
            "建国路", "朝阳路", "阜成路", "中关村大街", "望京街",
            "东三环中路", "西三环北路", "北四环东路", "南二环", "长安街",
            "平安大街", "两广路", "学院路", "知春路", "望京西路",
        ]

        seg_idx = 0
        for area_name, center in centers.items():
            for i in range(8):
                angle = (i * 45) * 3.14159 / 180
                length = 0.02 + random.random() * 0.03
                start_lng = center[0] - length * 0.5 * random.uniform(0.5, 1.5)
                start_lat = center[1] - length * 0.3 * random.uniform(0.5, 1.5)
                end_lng = start_lng + length * 0.8 * (0.5 + random.random())
                end_lat = start_lat + length * 0.4 * (0.5 + random.random())

                mid_points = []
                num_mid = random.randint(1, 3)
                for j in range(num_mid):
                    t = (j + 1) / (num_mid + 1)
                    mid_lng = start_lng + (end_lng - start_lng) * t + random.uniform(-0.002, 0.002)
                    mid_lat = start_lat + (end_lat - start_lat) * t + random.uniform(-0.002, 0.002)
                    mid_points.append((mid_lng, mid_lat))

                polyline = [(start_lng, start_lat)] + mid_points + [(end_lng, end_lat)]

                base_speed = random.uniform(20, 60)
                if area_name in ["cbd", "zhongguancun", "xidan"]:
                    base_speed *= 0.5

                segments.append(RoadSegment(
                    id=f"mock_{area_name}_{seg_idx}",
                    name=f"{random.choice(road_names)}{i+1}",
                    polyline=polyline,
                    speed=base_speed,
                    status=random.randint(0, 3),
                    length=random.uniform(500, 2000),
                ))
                seg_idx += 1

        return segments

    def get_area_traffic_summary(self, center_lng: float, center_lat: float, radius: float = 0.05) -> Dict:
        segments = self.get_all_road_segments()
        nearby = []
        for seg in segments:
            for lng, lat in seg.polyline:
                dist = ((lng - center_lng) ** 2 + (lat - center_lat) ** 2) ** 0.5
                if dist < radius:
                    nearby.append(seg)
                    break

        if not nearby:
            return {"avg_speed": 30, "count": 0, "segments": []}

        avg_speed = sum(s.speed for s in nearby) / len(nearby)
        return {
            "avg_speed": avg_speed,
            "count": len(nearby),
            "segments": [
                {"id": s.id, "name": s.name, "speed": s.speed, "status": s.status}
                for s in nearby
            ],
        }


if __name__ == "__main__":
    spider = RoadStatusSpider()
    segs = spider.get_all_road_segments(use_cache=False)
    print(f"Got {len(segs)} road segments")
    for s in segs[:5]:
        print(f"  {s.name}: speed={s.speed}km/h, points={len(s.polyline)}")
