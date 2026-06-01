from pydantic import BaseModel
from typing import List, Optional, Tuple
from datetime import datetime


class POI(BaseModel):
    id: str
    name: str
    city: str
    coordinates: Tuple[float, float]
    category: str
    rating: float = 0.0


class VisitRecord(BaseModel):
    poi_id: str
    timestamp: datetime
    duration_minutes: int = 60
    notes: Optional[str] = None


class Note(BaseModel):
    id: str
    author_id: str
    title: str
    content: str
    city: str
    tags: List[str] = []
    visit_records: List[VisitRecord] = []
    created_at: datetime


class Route(BaseModel):
    id: str
    note_id: str
    city: str
    poi_sequence: List[str]
    start_time: datetime
    end_time: datetime
    total_duration_minutes: int


class POIPair(BaseModel):
    from_poi_id: str
    to_poi_id: str
    from_poi_name: str
    to_poi_name: str
    from_city: str
    to_city: str
    count: int
    avg_time_diff_minutes: float


class RouteRecommendation(BaseModel):
    id: str
    city: str
    title: str
    poi_sequence: List[str]
    poi_details: List[POI]
    time_schedule: List[str]
    total_duration_hours: float
    difficulty: str
    meal_count: int
