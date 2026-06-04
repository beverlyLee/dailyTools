import os
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime

import requests
from dotenv import load_dotenv

from src.models.schemas import (
    SegmentData,
    SafetyScore,
    ScoredSegment,
    TrafficData,
    RoadType,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()


class SafetyScorer:
    def __init__(self, gaode_api_key: Optional[str] = None):
        self.gaode_api_key = gaode_api_key or os.getenv("GAODE_WEB_API_KEY", "")
        self.traffic_cache: Dict[str, TrafficData] = {}
        self.light_weight = 0.4
        self.width_weight = 0.3
        self.traffic_weight = 0.3
        self.max_width = 20.0

    def calculate_light_score(self, lit: Optional[bool]) -> float:
        if lit is None:
            return 50.0
        return 100.0 if lit else 0.0

    def calculate_width_score(self, width: Optional[float], road_type: RoadType) -> float:
        if width is None:
            road_type_scores = {
                RoadType.TRUNK: 90,
                RoadType.PRIMARY: 85,
                RoadType.SECONDARY: 80,
                RoadType.TERTIARY: 70,
                RoadType.RESIDENTIAL: 55,
                RoadType.PEDESTRIAN: 75,
                RoadType.FOOTWAY: 50,
                RoadType.CYCLEWAY: 45,
                RoadType.PATH: 35,
            }
            return float(road_type_scores.get(road_type, 40.0))

        normalized_width = min(width / self.max_width, 1.0)
        return 20.0 + normalized_width * 80.0

    def fetch_night_traffic(self, coordinates: List[Tuple[float, float]], segment_id: str) -> float:
        if segment_id in self.traffic_cache:
            return self.traffic_cache[segment_id].flow_level

        if not self.gaode_api_key:
            return 3.0

        center_lng = sum(c[0] for c in coordinates) / len(coordinates)
        center_lat = sum(c[1] for c in coordinates) / len(coordinates)

        try:
            url = "https://restapi.amap.com/v3/traffic/status/circle"
            params = {
                "key": self.gaode_api_key,
                "location": f"{center_lng},{center_lat}",
                "radius": 500,
                "level": 5,
            }
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            traffic_info = data.get("trafficinfo", {})
            evaluation = traffic_info.get("evaluation", {})
            expedite = float(evaluation.get("expedite", 0))
            congested = float(evaluation.get("congested", 0))
            blocked = float(evaluation.get("blocked", 0))
            unknown = float(evaluation.get("unknown", 0))

            total = expedite + congested + blocked + unknown
            if total > 0:
                flow_level = (expedite * 4 + congested * 2 + blocked * 0.5) / total
            else:
                flow_level = 2.0

            self.traffic_cache[segment_id] = TrafficData(
                segment_id=segment_id,
                congestion_index=(congested + blocked) / total if total > 0 else 0,
                timestamp=datetime.now().isoformat(),
                flow_level=flow_level,
            )

            return flow_level

        except Exception as e:
            logger.warning(f"Failed to fetch traffic for {segment_id}: {e}")
            return 2.5

    def calculate_traffic_score(self, traffic_flow: float, road_type: RoadType) -> float:
        normalized_flow = min(traffic_flow / 4.0, 1.0)

        if road_type in [RoadType.FOOTWAY, RoadType.PATH, RoadType.PEDESTRIAN]:
            base_score = 70.0
            bonus = normalized_flow * 30.0
        else:
            base_score = 40.0
            bonus = normalized_flow * 40.0

        return min(base_score + bonus, 100.0)

    def calculate_safety_score(
        self,
        segment: SegmentData,
        use_traffic_api: bool = True,
    ) -> SafetyScore:
        light_score = self.calculate_light_score(segment.lit)
        width_score = self.calculate_width_score(segment.width, segment.highway)

        if use_traffic_api:
            traffic_flow = self.fetch_night_traffic(segment.coordinates, segment.segment_id)
        else:
            traffic_flow = 2.5

        traffic_score = self.calculate_traffic_score(traffic_flow, segment.highway)

        total_score = (
            light_score * self.light_weight
            + width_score * self.width_weight
            + traffic_score * self.traffic_weight
        )

        if segment.lit:
            total_score = min(total_score + 5, 100.0)

        surface = (segment.surface or "").lower()
        unpaved_surfaces = ["unpaved", "dirt", "gravel", "ground", "grass", "mud", "sand"]
        if any(s in surface for s in unpaved_surfaces):
            total_score = max(total_score - 20, 0)

        if segment.highway in [RoadType.FOOTWAY, RoadType.PATH]:
            if not segment.lit:
                total_score = max(total_score - 10, 0)

        return SafetyScore(
            segment_id=segment.segment_id,
            total_score=round(total_score, 1),
            light_score=round(light_score, 1),
            width_score=round(width_score, 1),
            traffic_score=round(traffic_score, 1),
            has_lighting=bool(segment.lit or False),
            road_width=segment.width or 0.0,
            traffic_flow=traffic_flow,
        )

    def score_segments(
        self,
        segments: List[SegmentData],
        use_traffic_api: bool = True,
    ) -> List[ScoredSegment]:
        scored_segments = []
        total = len(segments)

        for i, segment in enumerate(segments):
            if i % 50 == 0:
                logger.info(f"Scoring segment {i + 1}/{total}")

            score = self.calculate_safety_score(segment, use_traffic_api)

            scored_segments.append(
                ScoredSegment(
                    **segment.model_dump(),
                    safety_score=score,
                )
            )

        logger.info(f"Scored {len(scored_segments)} segments")
        return scored_segments

    def get_safety_color(self, score: float) -> str:
        if score >= 80:
            return "#22c55e"
        elif score >= 60:
            return "#84cc16"
        elif score >= 40:
            return "#eab308"
        elif score >= 20:
            return "#f97316"
        else:
            return "#ef4444"

    def get_safety_level(self, score: float) -> str:
        if score >= 80:
            return "非常安全"
        elif score >= 60:
            return "安全"
        elif score >= 40:
            return "一般"
        elif score >= 20:
            return "较危险"
        else:
            return "危险"

    def is_dark_area(self, segment: SegmentData) -> bool:
        return not (segment.lit or False)

    def is_unpaved(self, segment: SegmentData) -> bool:
        surface = (segment.surface or "").lower()
        unpaved_surfaces = ["unpaved", "dirt", "gravel", "ground", "grass", "mud", "sand"]
        return any(s in surface for s in unpaved_surfaces)

    def calculate_route_penalty(
        self,
        segment: SegmentData,
        avoid_dark: bool = True,
        avoid_unpaved: bool = True,
    ) -> float:
        score = self.calculate_safety_score(segment, use_traffic_api=False)
        base_penalty = 100.0 - score.total_score

        if avoid_dark and self.is_dark_area(segment):
            base_penalty += 30.0

        if avoid_unpaved and self.is_unpaved(segment):
            base_penalty += 20.0

        if segment.highway in [RoadType.FOOTWAY, RoadType.PATH]:
            base_penalty += 10.0

        if segment.highway in [RoadType.PRIMARY, RoadType.SECONDARY]:
            base_penalty -= 15.0

        return max(base_penalty, 0.0)
