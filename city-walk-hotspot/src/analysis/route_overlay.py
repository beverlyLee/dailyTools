"""
路线重合度分析模块 - 计算多条路线的重叠路段，找出核心漫步道
"""

import math
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field

from src.mining.walk_route import (
    WalkRoute,
    RouteSegment,
    RoutePoint,
    haversine_distance
)


@dataclass
class SegmentKey:
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float

    def __eq__(self, other):
        if not isinstance(other, SegmentKey):
            return False
        return (
            abs(self.start_lat - other.start_lat) < 0.0001 and
            abs(self.start_lng - other.start_lng) < 0.0001 and
            abs(self.end_lat - other.end_lat) < 0.0001 and
            abs(self.end_lng - other.end_lng) < 0.0001
        ) or (
            abs(self.start_lat - other.end_lat) < 0.0001 and
            abs(self.start_lng - other.end_lng) < 0.0001 and
            abs(self.end_lat - other.start_lat) < 0.0001 and
            abs(self.end_lng - other.start_lng) < 0.0001
        )

    def __hash__(self):
        start = (round(self.start_lat, 4), round(self.start_lng, 4))
        end = (round(self.end_lat, 4), round(self.end_lng, 4))
        key = tuple(sorted([start, end]))
        return hash(key)


@dataclass
class OverlaySegment:
    segment_key: SegmentKey
    start_name: str
    end_name: str
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    mid_lat: float
    mid_lng: float
    length_km: float
    overlap_count: int
    total_hotness: float
    avg_hotness: float
    route_ids: List[str]
    total_pois: int
    commercial_intensity: float
    heat_level: str
    line_width: float

    def to_dict(self):
        return {
            "start_name": self.start_name,
            "end_name": self.end_name,
            "start": {"lat": self.start_lat, "lng": self.start_lng},
            "end": {"lat": self.end_lat, "lng": self.end_lng},
            "mid_lat": self.mid_lat,
            "mid_lng": self.mid_lng,
            "length_km": self.length_km,
            "overlap_count": self.overlap_count,
            "total_hotness": self.total_hotness,
            "avg_hotness": self.avg_hotness,
            "route_ids": self.route_ids,
            "total_pois": self.total_pois,
            "commercial_intensity": self.commercial_intensity,
            "heat_level": self.heat_level,
            "line_width": self.line_width
        }


def get_segment_key(segment: RouteSegment) -> SegmentKey:
    return SegmentKey(
        start_lat=segment.start.lat,
        start_lng=segment.start.lng,
        end_lat=segment.end.lat,
        end_lng=segment.end.lng
    )


def calculate_line_width(overlap_count: int) -> float:
    if overlap_count >= 5:
        return 10.0
    elif overlap_count >= 4:
        return 8.5
    elif overlap_count >= 3:
        return 7.0
    elif overlap_count >= 2:
        return 5.5
    else:
        return 3.0


def calculate_heat_color_level(avg_hotness: float) -> str:
    if avg_hotness > 80:
        return "extreme"
    elif avg_hotness > 50:
        return "very_high"
    elif avg_hotness > 30:
        return "high"
    elif avg_hotness > 15:
        return "medium"
    else:
        return "low"


def calculate_commercial_intensity(
    total_pois: int,
    segment_length: float,
    avg_commercial_score: float
) -> float:
    if segment_length == 0:
        return 0.0
    poi_density = total_pois / segment_length
    intensity = (poi_density * 0.4 + avg_commercial_score * 0.6) * 10
    return round(min(intensity, 100), 2)


def calculate_route_overlay(routes: List[WalkRoute]) -> List[OverlaySegment]:
    segment_map: Dict[SegmentKey, Dict] = {}

    for route in routes:
        for segment in route.segments:
            key = get_segment_key(segment)

            if key not in segment_map:
                segment_map[key] = {
                    "start_name": segment.start.name,
                    "end_name": segment.end.name,
                    "start_lat": segment.start.lat,
                    "start_lng": segment.start.lng,
                    "end_lat": segment.end.lat,
                    "end_lng": segment.end.lng,
                    "mid_lat": segment.mid_lat,
                    "mid_lng": segment.mid_lng,
                    "length_km": segment.length_km,
                    "overlap_count": 0,
                    "total_hotness": 0.0,
                    "route_ids": [],
                    "total_pois": 0,
                    "commercial_scores": []
                }

            entry = segment_map[key]
            entry["overlap_count"] += 1
            entry["total_hotness"] += route.hotness
            entry["route_ids"].append(route.route_id)
            entry["total_pois"] += len(route.pois)
            entry["commercial_scores"].append(route.commercial_score)

    overlay_segments = []
    for key, data in segment_map.items():
        avg_hotness = data["total_hotness"] / max(data["overlap_count"], 1)
        avg_commercial = sum(data["commercial_scores"]) / max(len(data["commercial_scores"]), 1)
        commercial_intensity = calculate_commercial_intensity(
            data["total_pois"],
            data["length_km"],
            avg_commercial
        )
        line_width = calculate_line_width(data["overlap_count"])
        heat_level = calculate_heat_color_level(avg_hotness)

        overlay_segments.append(OverlaySegment(
            segment_key=key,
            start_name=data["start_name"],
            end_name=data["end_name"],
            start_lat=data["start_lat"],
            start_lng=data["start_lng"],
            end_lat=data["end_lat"],
            end_lng=data["end_lng"],
            mid_lat=data["mid_lat"],
            mid_lng=data["mid_lng"],
            length_km=data["length_km"],
            overlap_count=data["overlap_count"],
            total_hotness=round(data["total_hotness"], 2),
            avg_hotness=round(avg_hotness, 2),
            route_ids=data["route_ids"],
            total_pois=data["total_pois"],
            commercial_intensity=commercial_intensity,
            heat_level=heat_level,
            line_width=line_width
        ))

    overlay_segments.sort(key=lambda x: (x.overlap_count, x.avg_hotness), reverse=True)
    return overlay_segments


def find_core_walk_paths(
    overlay_segments: List[OverlaySegment],
    min_overlap: int = 2
) -> List[OverlaySegment]:
    return [s for s in overlay_segments if s.overlap_count >= min_overlap]


def calculate_city_hotness_stats(routes: List[WalkRoute]) -> Dict:
    if not routes:
        return {"total_routes": 0, "avg_hotness": 0, "max_hotness": 0}

    hotness_values = [r.hotness for r in routes]
    return {
        "total_routes": len(routes),
        "total_hotness": round(sum(hotness_values), 2),
        "avg_hotness": round(sum(hotness_values) / len(hotness_values), 2),
        "max_hotness": round(max(hotness_values), 2),
        "min_hotness": round(min(hotness_values), 2)
    }


def calculate_commercial_analysis(routes: List[WalkRoute]) -> Dict:
    if not routes:
        return {"avg_commercial": 0, "poi_density": 0}

    commercial_scores = [r.commercial_score for r in routes]
    total_pois = sum(len(r.pois) for r in routes)
    total_length = sum(r.total_length_km for r in routes)

    return {
        "avg_commercial_score": round(sum(commercial_scores) / len(commercial_scores), 2),
        "total_pois": total_pois,
        "total_route_length_km": round(total_length, 2),
        "poi_per_km": round(total_pois / max(total_length, 0.1), 2)
    }


def get_overlap_summary(overlay_segments: List[OverlaySegment]) -> Dict:
    if not overlay_segments:
        return {}

    heat_levels = {}
    for seg in overlay_segments:
        level = seg.heat_level
        if level not in heat_levels:
            heat_levels[level] = {"count": 0, "total_hotness": 0}
        heat_levels[level]["count"] += 1
        heat_levels[level]["total_hotness"] += seg.avg_hotness

    return {
        "total_segments": len(overlay_segments),
        "heat_distribution": heat_levels,
        "max_overlap": max(s.overlap_count for s in overlay_segments),
        "max_hotness": max(s.avg_hotness for s in overlay_segments),
        "max_commercial_intensity": max(s.commercial_intensity for s in overlay_segments)
    }
