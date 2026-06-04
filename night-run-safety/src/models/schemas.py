from pydantic import BaseModel, Field
from typing import List, Optional, Tuple
from enum import Enum


class RoadType(str, Enum):
    FOOTWAY = "footway"
    PATH = "path"
    PEDESTRIAN = "pedestrian"
    RESIDENTIAL = "residential"
    TERTIARY = "tertiary"
    SECONDARY = "secondary"
    PRIMARY = "primary"
    TRUNK = "trunk"
    CYCLEWAY = "cycleway"


class SegmentData(BaseModel):
    segment_id: str
    coordinates: List[Tuple[float, float]]
    highway: RoadType
    lit: Optional[bool] = None
    width: Optional[float] = None
    surface: Optional[str] = None
    length: float = 0.0
    name: Optional[str] = None


class SafetyScore(BaseModel):
    segment_id: str
    total_score: float = Field(ge=0, le=100)
    light_score: float = Field(ge=0, le=100)
    width_score: float = Field(ge=0, le=100)
    traffic_score: float = Field(ge=0, le=100)
    has_lighting: bool
    road_width: float
    traffic_flow: float


class ScoredSegment(SegmentData):
    safety_score: SafetyScore


class RouteRequest(BaseModel):
    start: Tuple[float, float]
    end: Tuple[float, float]
    prefer_safe: bool = True
    avoid_dark: bool = True
    avoid_unpaved: bool = True


class RouteSegment(BaseModel):
    coordinates: List[Tuple[float, float]]
    safety_score: float
    has_lighting: bool
    road_name: Optional[str]
    length: float
    instruction: Optional[str] = None


class RouteResponse(BaseModel):
    route: List[RouteSegment]
    total_distance: float
    total_safety_score: float
    estimated_time: float
    dark_segments_count: int
    paved_segments_count: int


class TrafficData(BaseModel):
    segment_id: str
    congestion_index: float
    timestamp: str
    flow_level: int


class MapBounds(BaseModel):
    min_lng: float
    min_lat: float
    max_lng: float
    max_lat: float
