import os
import math
import logging
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

import requests
from dotenv import load_dotenv

from src.utils.geometry_utils import (
    nearest_point_on_line_distance_meters,
    haversine_distance,
    is_shapely_available,
)
from src.models.schemas import (
    RouteRequest,
    RouteResponse,
    RouteSegment,
    SegmentData,
    ScoredSegment,
    RoadType,
)
from src.scoring.safety_algorithm import SafetyScorer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

if is_shapely_available():
    logger.info("safe_path_finder: shapely 可用，空间计算将使用 shapely 加速")
else:
    logger.info("safe_path_finder: shapely 不可用，将使用纯 Python 降级方案")


@dataclass
class GaodeStep:
    polyline: str
    instruction: str
    distance: float
    duration: float
    road_name: str


class SafePathFinder:
    def __init__(
        self,
        gaode_api_key: Optional[str] = None,
        scored_segments: Optional[List[ScoredSegment]] = None,
    ):
        self.gaode_api_key = gaode_api_key or os.getenv("GAODE_WEB_API_KEY", "")
        self.scored_segments = scored_segments or []
        self.scorer = SafetyScorer(gaode_api_key)
        self.segment_index: Dict[str, ScoredSegment] = {}
        self._build_index()

    def _build_index(self) -> None:
        for segment in self.scored_segments:
            self.segment_index[segment.segment_id] = segment

    def update_segments(self, scored_segments: List[ScoredSegment]) -> None:
        self.scored_segments = scored_segments
        self._build_index()
        logger.info(f"Updated index with {len(scored_segments)} segments")

    @staticmethod
    def _parse_polyline(polyline_str: str) -> List[Tuple[float, float]]:
        coords = []
        points = polyline_str.split(";")
        for point in points:
            if "," in point:
                lng, lat = point.split(",")
                try:
                    coords.append((float(lng), float(lat)))
                except ValueError:
                    continue
        return coords

    def _fetch_gaode_direction(
        self,
        start: Tuple[float, float],
        end: Tuple[float, float],
        strategy: int = 0,
    ) -> List[GaodeStep]:
        if not self.gaode_api_key:
            return []

        try:
            url = "https://restapi.amap.com/v3/direction/walking"
            params = {
                "key": self.gaode_api_key,
                "origin": f"{start[0]},{start[1]}",
                "destination": f"{end[0]},{end[1]}",
            }
            response = requests.get(url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()

            if data.get("status") != "1":
                logger.warning(f"Gaode API error: {data.get('info')}")
                return []

            route = data.get("route", {})
            paths = route.get("paths", [])
            if not paths:
                return []

            steps = paths[0].get("steps", [])
            parsed_steps = []

            for step in steps:
                polyline = step.get("polyline", "")
                if not polyline:
                    continue

                parsed_steps.append(
                    GaodeStep(
                        polyline=polyline,
                        instruction=step.get("instruction", ""),
                        distance=float(step.get("distance", 0)),
                        duration=float(step.get("duration", 0)),
                        road_name=step.get("road", step.get("name", "")),
                    )
                )

            return parsed_steps

        except Exception as e:
            logger.warning(f"Failed to fetch Gaode direction: {e}")
            return []

    def _find_nearby_segment(
        self,
        coord: Tuple[float, float],
        max_distance: float = 50.0,
    ) -> Optional[ScoredSegment]:
        if not self.scored_segments:
            return None

        min_dist = float("inf")
        nearest_segment = None

        for segment in self.scored_segments:
            if len(segment.coordinates) < 2:
                continue

            try:
                dist = nearest_point_on_line_distance_meters(coord, segment.coordinates)

                if dist < min_dist and dist <= max_distance:
                    min_dist = dist
                    nearest_segment = segment
            except Exception:
                continue

        return nearest_segment

    def _classify_road_type(self, coords: List[Tuple[float, float]]) -> RoadType:
        avg_spacing = 0.0
        if len(coords) > 1:
            distances = []
            for i in range(len(coords) - 1):
                distances.append(haversine_distance(coords[i], coords[i + 1]))
            if distances:
                avg_spacing = sum(distances) / len(distances)

        if avg_spacing > 20:
            return RoadType.SECONDARY
        elif avg_spacing > 10:
            return RoadType.TERTIARY
        elif avg_spacing > 5:
            return RoadType.RESIDENTIAL
        else:
            return RoadType.FOOTWAY

    def _estimate_segment_properties(
        self,
        coords: List[Tuple[float, float]],
        road_name: str,
    ) -> Tuple[bool, float, bool]:
        center_coord = (
            sum(c[0] for c in coords) / len(coords),
            sum(c[1] for c in coords) / len(coords),
        )

        nearby_segment = self._find_nearby_segment(center_coord, max_distance=100.0)

        if nearby_segment:
            has_lighting = bool(nearby_segment.lit or False)
            width = nearby_segment.width or 5.0
            surface = (nearby_segment.surface or "").lower()
            unpaved = any(
                s in surface
                for s in ["unpaved", "dirt", "gravel", "ground", "grass", "mud", "sand"]
            )
            return has_lighting, width, unpaved

        has_lighting = False
        width = 5.0
        unpaved = False

        road_type = self._classify_road_type(coords)
        major_roads = {RoadType.PRIMARY, RoadType.SECONDARY, RoadType.TERTIARY, RoadType.TRUNK}

        if road_type in major_roads:
            has_lighting = True
            width = {
                RoadType.PRIMARY: 15,
                RoadType.SECONDARY: 12,
                RoadType.TERTIARY: 8,
                RoadType.TRUNK: 20,
            }.get(road_type, 10)
        elif road_type == RoadType.PEDESTRIAN:
            has_lighting = True
            width = 5
        elif road_type == RoadType.RESIDENTIAL:
            has_lighting = True
            width = 6

        if road_name and any(
            keyword in road_name
            for keyword in ["大道", "大街", "路", "街", "公路", "大道", "环路"]
        ):
            has_lighting = True
            width = max(width, 10)

        if road_name and any(
            keyword in road_name
            for keyword in ["巷", "弄", "胡同", "小径", "便道", "小路"]
        ):
            has_lighting = False
            width = min(width, 3)

        return has_lighting, width, unpaved

    def _step_to_route_segment(
        self,
        step: GaodeStep,
        avoid_dark: bool,
        avoid_unpaved: bool,
    ) -> RouteSegment:
        coords = self._parse_polyline(step.polyline)

        if len(coords) < 2:
            return RouteSegment(
                coordinates=coords,
                safety_score=50.0,
                has_lighting=True,
                road_name=step.road_name or "未知道路",
                length=step.distance,
                instruction=step.instruction,
            )

        has_lighting, width, unpaved = self._estimate_segment_properties(
            coords, step.road_name or ""
        )

        center_coord = (
            sum(c[0] for c in coords) / len(coords),
            sum(c[1] for c in coords) / len(coords),
        )

        nearby_segment = self._find_nearby_segment(center_coord, max_distance=100.0)

        if nearby_segment:
            traffic_flow = self.scorer.fetch_night_traffic(
                nearby_segment.coordinates, nearby_segment.segment_id
            )
            road_type = nearby_segment.highway
        else:
            traffic_flow = 2.5
            road_type = self._classify_road_type(coords)

        light_score = self.scorer.calculate_light_score(has_lighting)
        width_score = self.scorer.calculate_width_score(width, road_type)
        traffic_score = self.scorer.calculate_traffic_score(traffic_flow, road_type)

        safety_score = (
            light_score * self.scorer.light_weight
            + width_score * self.scorer.width_weight
            + traffic_score * self.scorer.traffic_weight
        )

        if has_lighting:
            safety_score = min(safety_score + 5, 100.0)

        if unpaved:
            safety_score = max(safety_score - 20, 0)

        if avoid_dark and not has_lighting:
            safety_score = max(safety_score - 15, 0)

        if avoid_unpaved and unpaved:
            safety_score = max(safety_score - 10, 0)

        return RouteSegment(
            coordinates=coords,
            safety_score=round(safety_score, 1),
            has_lighting=has_lighting,
            road_name=step.road_name or "未知道路",
            length=step.distance,
            instruction=step.instruction,
        )

    def _generate_detour_route(
        self,
        start: Tuple[float, float],
        end: Tuple[float, float],
        avoid_dark: bool,
        avoid_unpaved: bool,
    ) -> List[GaodeStep]:
        steps = self._fetch_gaode_direction(start, end, strategy=0)

        if not steps:
            return []

        detour_steps = []
        center_coord = ((start[0] + end[0]) / 2, (start[1] + end[1]) / 2)

        has_dark_segment = False
        for step in steps:
            coords = self._parse_polyline(step.polyline)
            if coords:
                has_lighting, _, _ = self._estimate_segment_properties(
                    coords, step.road_name or ""
                )
                if not has_lighting:
                    has_dark_segment = True
                    break

        if has_dark_segment and (avoid_dark or avoid_unpaved):
            alternative_steps = self._fetch_gaode_direction(start, end, strategy=1)
            if alternative_steps:
                alt_dark_count = 0
                for step in alternative_steps:
                    coords = self._parse_polyline(step.polyline)
                    if coords:
                        has_lighting, _, unpaved = self._estimate_segment_properties(
                            coords, step.road_name or ""
                        )
                        if not has_lighting:
                            alt_dark_count += 1
                        if avoid_unpaved and unpaved:
                            alt_dark_count += 1

                orig_dark_count = 0
                for step in steps:
                    coords = self._parse_polyline(step.polyline)
                    if coords:
                        has_lighting, _, unpaved = self._estimate_segment_properties(
                            coords, step.road_name or ""
                        )
                        if not has_lighting:
                            orig_dark_count += 1
                        if avoid_unpaved and unpaved:
                            orig_dark_count += 1

                if alt_dark_count < orig_dark_count:
                    steps = alternative_steps
                    logger.info("Selected alternative route with fewer dark/unpaved segments")

        return steps

    def find_safe_route(self, request: RouteRequest) -> RouteResponse:
        logger.info(f"Finding route from {request.start} to {request.end}")

        steps = self._generate_detour_route(
            start=request.start,
            end=request.end,
            avoid_dark=request.avoid_dark,
            avoid_unpaved=request.avoid_unpaved,
        )

        if not steps:
            return RouteResponse(
                route=[],
                total_distance=0.0,
                total_safety_score=0.0,
                estimated_time=0.0,
                dark_segments_count=0,
                paved_segments_count=0,
            )

        route_segments = []
        total_distance = 0.0
        total_safety = 0.0
        total_duration = 0.0
        dark_count = 0
        paved_count = 0

        for step in steps:
            route_segment = self._step_to_route_segment(
                step,
                avoid_dark=request.avoid_dark,
                avoid_unpaved=request.avoid_unpaved,
            )

            route_segments.append(route_segment)
            total_distance += route_segment.length
            total_safety += route_segment.safety_score * route_segment.length
            total_duration += step.duration

            if not route_segment.has_lighting:
                dark_count += 1
            else:
                paved_count += 1

        avg_safety = total_safety / total_distance if total_distance > 0 else 0.0

        if request.prefer_safe:
            route_segments = self._optimize_route_safety(
                route_segments,
                request.avoid_dark,
                request.avoid_unpaved,
            )

            total_safety = 0.0
            dark_count = 0
            paved_count = 0
            for seg in route_segments:
                total_safety += seg.safety_score * seg.length
                if not seg.has_lighting:
                    dark_count += 1
                else:
                    paved_count += 1
            avg_safety = total_safety / total_distance if total_distance > 0 else 0.0

        logger.info(
            f"Route found: {len(route_segments)} segments, "
            f"{total_distance:.0f}m, avg safety: {avg_safety:.1f}, "
            f"dark: {dark_count}, paved: {paved_count}"
        )

        return RouteResponse(
            route=route_segments,
            total_distance=round(total_distance, 1),
            total_safety_score=round(avg_safety, 1),
            estimated_time=round(total_duration / 60, 1),
            dark_segments_count=dark_count,
            paved_segments_count=paved_count,
        )

    def _optimize_route_safety(
        self,
        route_segments: List[RouteSegment],
        avoid_dark: bool,
        avoid_unpaved: bool,
    ) -> List[RouteSegment]:
        optimized = []
        for seg in route_segments:
            new_score = seg.safety_score

            if avoid_dark and not seg.has_lighting:
                new_score = max(new_score - 10, 0)

            optimized.append(
                RouteSegment(
                    coordinates=seg.coordinates,
                    safety_score=round(new_score, 1),
                    has_lighting=seg.has_lighting,
                    road_name=seg.road_name,
                    length=seg.length,
                    instruction=seg.instruction,
                )
            )
        return optimized

    def get_segment_safety_info(self, coord: Tuple[float, float]) -> Optional[Dict]:
        segment = self._find_nearby_segment(coord, max_distance=30.0)
        if not segment:
            return None

        score = segment.safety_score
        return {
            "segment_id": segment.segment_id,
            "road_name": segment.name or "未知道路",
            "has_lighting": score.has_lighting,
            "safety_score": score.total_score,
            "light_score": score.light_score,
            "width_score": score.width_score,
            "traffic_score": score.traffic_score,
            "road_width": score.road_width,
            "traffic_flow": score.traffic_flow,
            "safety_level": self.scorer.get_safety_level(score.total_score),
            "safety_color": self.scorer.get_safety_color(score.total_score),
        }
