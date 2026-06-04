from pydantic import BaseModel, Field
from typing import List, Optional, Tuple
from datetime import datetime


class OfficeBuilding(BaseModel):
    name: str
    address: str
    longitude: float
    latitude: float


class Restaurant(BaseModel):
    id: str
    name: str
    address: str
    longitude: float
    latitude: float
    avg_price: Optional[float] = None
    review_count: Optional[int] = None
    has_delivery: bool = False
    rating: Optional[float] = None
    cuisine: Optional[str] = None
    dianping_url: Optional[str] = None
    crawl_time: datetime = Field(default_factory=datetime.now)


class RouteInfo(BaseModel):
    restaurant_id: str
    restaurant_name: str
    origin: Tuple[float, float]
    destination: Tuple[float, float]
    distance: float
    duration: int
    polyline: Optional[str] = None
    steps: Optional[List[dict]] = None


class LunchWindowAnalysis(BaseModel):
    office_building: OfficeBuilding
    total_restaurants: int
    dine_in_friendly: List[Restaurant]
    delivery_only: List[Restaurant]
    out_of_range: List[Restaurant]
    max_walk_time: int = 600
    routes: List[RouteInfo]


class AnalysisResponse(BaseModel):
    status: str
    data: LunchWindowAnalysis
    message: Optional[str] = None
