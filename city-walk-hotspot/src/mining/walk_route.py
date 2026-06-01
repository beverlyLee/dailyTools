"""
路线提取模块 - 从笔记中提取起点、终点和途经点，构建路线几何图形
"""

import math
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field


@dataclass
class RoutePoint:
    name: str
    lat: float
    lng: float
    index: int = 0


@dataclass
class RouteSegment:
    start: RoutePoint
    end: RoutePoint
    mid_lat: float
    mid_lng: float
    length_km: float
    segment_id: str


@dataclass
class WalkRoute:
    route_id: str
    note_id: str
    note_title: str
    city: str
    platform: str
    hotness: float
    commercial_score: float
    points: List[RoutePoint] = field(default_factory=list)
    segments: List[RouteSegment] = field(default_factory=list)
    pois: List[Dict] = field(default_factory=list)
    total_length_km: float = 0.0

    def to_dict(self):
        return {
            "route_id": self.route_id,
            "note_id": self.note_id,
            "note_title": self.note_title,
            "city": self.city,
            "platform": self.platform,
            "hotness": self.hotness,
            "commercial_score": self.commercial_score,
            "points": [{"name": p.name, "lat": p.lat, "lng": p.lng} for p in self.points],
            "segments": [
                {
                    "segment_id": s.segment_id,
                    "start": {"name": s.start.name, "lat": s.start.lat, "lng": s.start.lng},
                    "end": {"name": s.end.name, "lat": s.end.lat, "lng": s.end.lng},
                    "mid_lat": s.mid_lat,
                    "mid_lng": s.mid_lng,
                    "length_km": s.length_km
                }
                for s in self.segments
            ],
            "pois": self.pois,
            "total_length_km": self.total_length_km
        }


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    a = (math.sin(delta_phi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def calculate_segment_midpoint(lat1: float, lng1: float, lat2: float, lng2: float) -> Tuple[float, float]:
    mid_lat = (lat1 + lat2) / 2
    mid_lng = (lng1 + lng2) / 2
    return (mid_lat, mid_lng)


def generate_segment_id(note_id: str, start_idx: int, end_idx: int) -> str:
    return f"{note_id}_seg_{start_idx}_{end_idx}"


def extract_route_from_note(note: Dict) -> Optional[WalkRoute]:
    try:
        note_id = note.get("id", "")
        route_points_raw = note.get("route_points", [])
        if not route_points_raw:
            return None

        route_points = []
        for idx, point in enumerate(route_points_raw):
            route_points.append(RoutePoint(
                name=point.get("name", f"点{idx+1}"),
                lat=point.get("lat", 0),
                lng=point.get("lng", 0),
                index=idx
            ))

        segments = []
        total_length = 0.0
        for i in range(len(route_points) - 1):
            start = route_points[i]
            end = route_points[i + 1]
            length = haversine_distance(start.lat, start.lng, end.lat, end.lng)
            mid_lat, mid_lng = calculate_segment_midpoint(
                start.lat, start.lng, end.lat, end.lng
            )
            segment = RouteSegment(
                start=start,
                end=end,
                mid_lat=mid_lat,
                mid_lng=mid_lng,
                length_km=round(length, 3),
                segment_id=generate_segment_id(note_id, i, i + 1)
            )
            segments.append(segment)
            total_length += length

        hotness = note.get("hotness", 0)
        if hotness == 0:
            hotness = (
                note.get("likes", 0) * 1.0 +
                note.get("comments", 0) * 3.0 +
                note.get("shares", 0) * 5.0
            ) / 1000.0
            hotness = round(hotness, 2)

        route = WalkRoute(
            route_id=f"route_{note_id}",
            note_id=note_id,
            note_title=note.get("title", ""),
            city=note.get("city", ""),
            platform=note.get("platform", ""),
            hotness=hotness,
            commercial_score=note.get("commercial_score", 0.5),
            points=route_points,
            segments=segments,
            pois=note.get("poi_density", []),
            total_length_km=round(total_length, 3)
        )

        return route
    except Exception as e:
        print(f"提取路线失败: {e}")
        return None


def extract_all_routes(notes: List[Dict]) -> List[WalkRoute]:
    routes = []
    for note in notes:
        route = extract_route_from_note(note)
        if route:
            routes.append(route)
    return routes


def get_route_bounds(routes: List[WalkRoute]) -> Dict:
    if not routes:
        return {"min_lat": 0, "max_lat": 0, "min_lng": 0, "max_lng": 0}

    all_lats = []
    all_lngs = []
    for route in routes:
        for point in route.points:
            all_lats.append(point.lat)
            all_lngs.append(point.lng)

    return {
        "min_lat": min(all_lats),
        "max_lat": max(all_lats),
        "min_lng": min(all_lngs),
        "max_lng": max(all_lngs)
    }


def get_route_center(routes: List[WalkRoute]) -> Tuple[float, float]:
    bounds = get_route_bounds(routes)
    center_lat = (bounds["min_lat"] + bounds["max_lat"]) / 2
    center_lng = (bounds["min_lng"] + bounds["max_lng"]) / 2
    return (center_lat, center_lng)
