import os
import math
import random
import httpx
from typing import List, Tuple, Dict
from dotenv import load_dotenv
from geopy.distance import geodesic
from src.models.schemas import Restaurant, OfficeBuilding, RouteInfo

load_dotenv()


class RoutePlanner:
    def __init__(self):
        self.api_key = os.getenv("GAODE_WEB_API_KEY", "")
        self.base_url = "https://restapi.amap.com/v3/direction/walking"
        self.walking_speed = 80.0

    def _haversine_distance(
        self, origin: Tuple[float, float], destination: Tuple[float, float]
    ) -> float:
        lat1, lon1 = origin
        lat2, lon2 = destination
        R = 6371000

        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c

    def _geodesic_distance(
        self, origin: Tuple[float, float], destination: Tuple[float, float]
    ) -> float:
        return geodesic((origin[1], origin[0]), (destination[1], destination[0])).meters

    def _generate_mock_polyline(
        self, origin: Tuple[float, float], destination: Tuple[float, float], steps: int = 8
    ) -> str:
        points = [origin]
        for i in range(1, steps):
            t = i / steps
            lng = origin[0] + (destination[0] - origin[0]) * t + random.uniform(-0.0002, 0.0002)
            lat = origin[1] + (destination[1] - origin[1]) * t + random.uniform(-0.0002, 0.0002)
            points.append((lng, lat))
        points.append(destination)
        return ";".join([f"{lng},{lat}" for lng, lat in points])

    def _generate_mock_route(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        restaurant_id: str,
        restaurant_name: str,
    ) -> RouteInfo:
        distance = self._geodesic_distance(origin, destination)
        duration = int(distance / self.walking_speed * 60)

        return RouteInfo(
            restaurant_id=restaurant_id,
            restaurant_name=restaurant_name,
            origin=origin,
            destination=destination,
            distance=round(distance, 2),
            duration=duration,
            polyline=self._generate_mock_polyline(origin, destination),
            steps=[
                {"instruction": "从起点出发，向东步行50米", "distance": 50},
                {"instruction": "右转进入人行横道", "distance": 30},
                {"instruction": "直行过马路", "distance": 80},
                {"instruction": "继续直行到达目的地", "distance": int(distance - 160)},
            ],
        )

    async def calculate_route(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        restaurant_id: str,
        restaurant_name: str,
        use_mock: bool = True,
    ) -> RouteInfo:
        if use_mock or not self.api_key or self.api_key.startswith("demo_"):
            return self._generate_mock_route(origin, destination, restaurant_id, restaurant_name)

        params = {
            "key": self.api_key,
            "origin": f"{origin[0]},{origin[1]}",
            "destination": f"{destination[0]},{destination[1]}",
            "output": "json",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(self.base_url, params=params)
                data = response.json()

                if data.get("status") == "1" and data.get("route"):
                    route = data["route"]["paths"][0]
                    return RouteInfo(
                        restaurant_id=restaurant_id,
                        restaurant_name=restaurant_name,
                        origin=origin,
                        destination=destination,
                        distance=float(route.get("distance", 0)),
                        duration=int(route.get("duration", 0)),
                        polyline=route.get("polyline", ""),
                        steps=route.get("steps", []),
                    )
                else:
                    return self._generate_mock_route(origin, destination, restaurant_id, restaurant_name)
        except Exception as e:
            print(f"Route API error: {e}")
            return self._generate_mock_route(origin, destination, restaurant_id, restaurant_name)

    async def batch_calculate_routes(
        self,
        building: OfficeBuilding,
        restaurants: List[Restaurant],
        use_mock: bool = True,
    ) -> List[RouteInfo]:
        origin = (building.longitude, building.latitude)
        routes = []

        for restaurant in restaurants:
            destination = (restaurant.longitude, restaurant.latitude)
            route = await self.calculate_route(
                origin=origin,
                destination=destination,
                restaurant_id=restaurant.id,
                restaurant_name=restaurant.name,
                use_mock=use_mock,
            )
            routes.append(route)

        return routes

    def calculate_isochrone_radius(self, max_walk_time_seconds: int) -> float:
        return (self.walking_speed / 60) * max_walk_time_seconds
