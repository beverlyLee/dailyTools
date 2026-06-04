from typing import List, Dict, Tuple
from src.models.schemas import (
    Restaurant,
    OfficeBuilding,
    RouteInfo,
    LunchWindowAnalysis,
)


class LunchTimeWindowAnalyzer:
    def __init__(self, lunch_duration_minutes: int = 60):
        self.lunch_duration = lunch_duration_minutes * 60
        self.eating_time = 30 * 60
        self.buffer_time = 5 * 60
        self.max_walk_time = self.lunch_duration - self.eating_time - self.buffer_time

    def _get_route_for_restaurant(
        self, restaurant_id: str, routes: List[RouteInfo]
    ) -> RouteInfo | None:
        for route in routes:
            if route.restaurant_id == restaurant_id:
                return route
        return None

    def _is_delivery_focused(self, restaurant: Restaurant) -> bool:
        delivery_cuisines = {"小吃快餐", "中式简餐", "日式简餐", "西式简餐", "咖啡简餐"}
        if restaurant.cuisine in delivery_cuisines:
            return restaurant.has_delivery
        return False

    def analyze(
        self,
        building: OfficeBuilding,
        restaurants: List[Restaurant],
        routes: List[RouteInfo],
    ) -> LunchWindowAnalysis:
        dine_in_friendly = []
        delivery_only = []
        out_of_range = []

        for restaurant in restaurants:
            route = self._get_route_for_restaurant(restaurant.id, routes)
            if not route:
                continue

            round_trip_time = route.duration * 2

            if round_trip_time <= self.max_walk_time:
                if self._is_delivery_focused(restaurant):
                    delivery_only.append(restaurant)
                else:
                    dine_in_friendly.append(restaurant)
            else:
                out_of_range.append(restaurant)

        return LunchWindowAnalysis(
            office_building=building,
            total_restaurants=len(restaurants),
            dine_in_friendly=dine_in_friendly,
            delivery_only=delivery_only,
            out_of_range=out_of_range,
            max_walk_time=self.max_walk_time,
            routes=routes,
        )

    def get_time_statistics(self, routes: List[RouteInfo]) -> Dict:
        if not routes:
            return {}

        durations = [r.duration for r in routes]
        distances = [r.distance for r in routes]

        return {
            "avg_walk_time_one_way": sum(durations) / len(durations),
            "min_walk_time": min(durations),
            "max_walk_time": max(durations),
            "avg_distance": sum(distances) / len(distances),
            "within_10min": sum(1 for d in durations if d <= 600),
            "within_15min": sum(1 for d in durations if d <= 900),
            "within_20min": sum(1 for d in durations if d <= 1200),
        }

    def generate_heatmap_data(
        self, restaurants: List[Restaurant], routes: List[RouteInfo]
    ) -> List[Tuple[float, float, float]]:
        heatmap_data = []
        for restaurant in restaurants:
            route = self._get_route_for_restaurant(restaurant.id, routes)
            if route:
                walk_time = route.duration
                weight = max(0.1, 1.0 - (walk_time / 1800))
                heatmap_data.append((restaurant.longitude, restaurant.latitude, weight))
        return heatmap_data
