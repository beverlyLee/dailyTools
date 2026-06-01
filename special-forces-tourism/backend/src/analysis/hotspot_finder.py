from typing import List, Dict, Tuple, Optional
from collections import defaultdict
from datetime import datetime, timedelta
import random

from ..models.schemas import Route, POIPair, POI, RouteRecommendation
from ..data.mock_data import get_poi_by_id, get_pois_by_city


class HotspotFinder:
    def __init__(self):
        self.poi_pairs: List[POIPair] = []
        self.poi_visit_counts: Dict[str, int] = defaultdict(int)

    def analyze_routes(self, routes: List[Route]) -> Tuple[List[POIPair], Dict[str, int]]:
        pair_counts = defaultdict(int)
        pair_time_diffs = defaultdict(list)
        self.poi_visit_counts = defaultdict(int)

        for route in routes:
            poi_sequence = route.poi_sequence

            for poi_id in poi_sequence:
                self.poi_visit_counts[poi_id] += 1

            for i in range(len(poi_sequence) - 1):
                from_poi_id = poi_sequence[i]
                to_poi_id = poi_sequence[i + 1]

                pair_key = (from_poi_id, to_poi_id)
                pair_counts[pair_key] += 1

                if route.start_time and route.end_time and len(route.poi_sequence) > 1:
                    total_duration = route.total_duration_minutes
                    segments = len(route.poi_sequence) - 1
                    if segments > 0:
                        avg_segment_time = total_duration / segments
                        pair_time_diffs[pair_key].append(avg_segment_time)

        self.poi_pairs = []
        for (from_poi_id, to_poi_id), count in pair_counts.items():
            from_poi = get_poi_by_id(from_poi_id)
            to_poi = get_poi_by_id(to_poi_id)

            if not from_poi or not to_poi:
                continue

            time_diffs = pair_time_diffs.get((from_poi_id, to_poi_id), [])
            avg_time_diff = sum(time_diffs) / len(time_diffs) if time_diffs else 60.0

            self.poi_pairs.append(POIPair(
                from_poi_id=from_poi_id,
                to_poi_id=to_poi_id,
                from_poi_name=from_poi.name,
                to_poi_name=to_poi.name,
                from_city=from_poi.city,
                to_city=to_poi.city,
                count=count,
                avg_time_diff_minutes=round(avg_time_diff, 1)
            ))

        self.poi_pairs.sort(key=lambda x: x.count, reverse=True)
        return self.poi_pairs, dict(self.poi_visit_counts)

    def get_top_pairs(self, city: Optional[str] = None, top_n: int = 20) -> List[POIPair]:
        pairs = self.poi_pairs
        if city:
            pairs = [p for p in pairs if p.from_city == city and p.to_city == city]
        return pairs[:top_n]

    def get_top_pois(self, city: Optional[str] = None, top_n: int = 10) -> List[Dict]:
        pois = []
        for poi_id, count in self.poi_visit_counts.items():
            poi = get_poi_by_id(poi_id)
            if not poi:
                continue
            if city and poi.city != city:
                continue
            pois.append({
                "poi_id": poi_id,
                "name": poi.name,
                "city": poi.city,
                "count": count,
                "coordinates": poi.coordinates,
                "category": poi.category
            })
        pois.sort(key=lambda x: x["count"], reverse=True)
        return pois[:top_n]

    def get_arc_data(self, city: Optional[str] = None) -> List[Dict]:
        arc_data = []
        max_count = max((p.count for p in self.poi_pairs), default=1)

        for pair in self.poi_pairs:
            if city and (pair.from_city != city or pair.to_city != city):
                continue

            from_poi = get_poi_by_id(pair.from_poi_id)
            to_poi = get_poi_by_id(pair.to_poi_id)

            if not from_poi or not to_poi:
                continue

            width = 1 + (pair.count / max_count) * 8

            arc_data.append({
                "from": {
                    "coordinates": list(from_poi.coordinates),
                    "name": from_poi.name,
                    "city": from_poi.city
                },
                "to": {
                    "coordinates": list(to_poi.coordinates),
                    "name": to_poi.name,
                    "city": to_poi.city
                },
                "count": pair.count,
                "width": width,
                "avg_time_minutes": pair.avg_time_diff_minutes
            })

        return arc_data

    def generate_route_recommendations(self, city: str, num_recommendations: int = 3) -> List[RouteRecommendation]:
        city_pois = get_pois_by_city(city)
        city_pairs = [p for p in self.poi_pairs if p.from_city == city and p.to_city == city]

        if not city_pairs or len(city_pois) < 5:
            return []

        recommendations = []

        time_slots = [
            {"time": "07:00", "label": "早餐", "preferred_category": "美食"},
            {"time": "09:00", "label": "上午景点", "preferred_category": "景点"},
            {"time": "11:30", "label": "午餐", "preferred_category": "美食"},
            {"time": "14:00", "label": "下午景点", "preferred_category": "景点"},
            {"time": "17:30", "label": "晚餐", "preferred_category": "美食"},
            {"time": "20:00", "label": "夜游", "preferred_category": "景点"},
        ]

        food_pois = [poi for poi in city_pois.values() if poi.category == "美食"]
        attraction_pois = [poi for poi in city_pois.values() if poi.category == "景点"]
        all_poi_list = list(city_pois.values())

        if len(food_pois) < 3:
            food_pois = all_poi_list[:]
        if len(attraction_pois) < 3:
            attraction_pois = all_poi_list[:]

        poi_visit_counts = {}
        for pair in city_pairs:
            poi_visit_counts[pair.from_poi_id] = poi_visit_counts.get(pair.from_poi_id, 0) + pair.count
            poi_visit_counts[pair.to_poi_id] = poi_visit_counts.get(pair.to_poi_id, 0) + pair.count

        def get_poi_score(poi, preferred_category):
            base_score = poi_visit_counts.get(poi.id, 0)
            if poi.category == preferred_category:
                base_score *= 3
            elif poi.category in ["商圈", "古镇", "文艺"]:
                base_score *= 1.5
            return base_score

        sorted_food = sorted(food_pois, key=lambda x: get_poi_score(x, "美食"), reverse=True)
        sorted_attractions = sorted(attraction_pois, key=lambda x: get_poi_score(x, "景点"), reverse=True)

        def build_balanced_route():
            route = []
            used_poi_ids = set()

            for slot in time_slots:
                preferred = slot["preferred_category"]
                candidates = sorted_food if preferred == "美食" else sorted_attractions
                candidates = [p for p in candidates if p.id not in used_poi_ids]

                if not candidates:
                    backup = [p for p in all_poi_list if p.id not in used_poi_ids]
                    if backup:
                        candidates = sorted(backup, key=lambda x: get_poi_score(x, preferred), reverse=True)

                if candidates:
                    selected = candidates[0]
                    route.append(selected)
                    used_poi_ids.add(selected.id)

            return route

        route_templates = []
        for _ in range(num_recommendations + 2):
            route = build_balanced_route()
            if len(route) >= 5:
                route_templates.append(route)
            random.shuffle(sorted_food)
            random.shuffle(sorted_attractions)

        seen_combinations = set()
        unique_routes = []
        for route in route_templates:
            combo = tuple(sorted([p.id for p in route]))
            if combo not in seen_combinations:
                seen_combinations.add(combo)
                unique_routes.append(route)
            if len(unique_routes) >= num_recommendations:
                break

        for i, route_template in enumerate(unique_routes[:num_recommendations]):
            poi_details = []
            time_schedule = []

            for j, poi in enumerate(route_template[:6]):
                slot = time_slots[min(j, len(time_slots) - 1)]
                poi_details.append(poi)
                time_schedule.append(f"{slot['time']} {slot['label']} - {poi.name}")

            if len(poi_details) >= 5:
                meal_count = sum(1 for p in poi_details if p.category == "美食")
                total_hours = 30.0

                difficulty = "地狱级" if len(poi_details) >= 6 else "硬核" if len(poi_details) >= 5 else "入门"

                key_pois = [p.name for p in poi_details if p.category == "景点"][:2]
                title_parts = [city] + key_pois + [f"{len(poi_details)}景点{meal_count}顿"]
                title = "｜".join(title_parts)

                recommendation = RouteRecommendation(
                    id=f"rec_{city}_{i}",
                    city=city,
                    title=title,
                    poi_sequence=[p.id for p in poi_details],
                    poi_details=poi_details,
                    time_schedule=time_schedule,
                    total_duration_hours=total_hours,
                    difficulty=difficulty,
                    meal_count=meal_count
                )
                recommendations.append(recommendation)

        return recommendations

    def get_city_stats(self, city: str) -> Dict:
        city_pairs = [p for p in self.poi_pairs if p.from_city == city and p.to_city == city]
        city_routes_count = len(set([p.from_poi_id for p in city_pairs] + [p.to_poi_id for p in city_pairs]))

        total_pair_count = sum(p.count for p in city_pairs)

        return {
            "city": city,
            "total_pairs": len(city_pairs),
            "total_flow": total_pair_count,
            "unique_pois": city_routes_count,
            "top_pair": city_pairs[0] if city_pairs else None
        }
