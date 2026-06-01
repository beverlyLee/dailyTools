from typing import List, Dict, Tuple
from collections import defaultdict
from datetime import datetime

from ..models.schemas import Note, Route, POI
from ..data.mock_data import get_poi_by_id


class RouteExtractor:
    def __init__(self):
        self.routes: List[Route] = []

    def extract_routes_from_notes(self, notes: List[Note]) -> List[Route]:
        routes = []
        for note in notes:
            if len(note.visit_records) < 2:
                continue

            sorted_records = sorted(note.visit_records, key=lambda x: x.timestamp)

            poi_sequence = [record.poi_id for record in sorted_records]

            start_time = sorted_records[0].timestamp
            end_time = sorted_records[-1].timestamp
            total_duration = (end_time - start_time).total_seconds() / 60.0

            route = Route(
                id=f"route_{note.id}",
                note_id=note.id,
                city=note.city,
                poi_sequence=poi_sequence,
                start_time=start_time,
                end_time=end_time,
                total_duration_minutes=int(total_duration)
            )
            routes.append(route)

        self.routes = routes
        return routes

    def get_routes_by_city(self, city: str) -> List[Route]:
        return [route for route in self.routes if route.city == city]

    def get_route_statistics(self) -> Dict:
        if not self.routes:
            return {"total_routes": 0, "avg_pois": 0, "avg_duration_minutes": 0}

        total_pois = sum(len(route.poi_sequence) for route in self.routes)
        total_duration = sum(route.total_duration_minutes for route in self.routes)

        return {
            "total_routes": len(self.routes),
            "avg_pois": round(total_pois / len(self.routes), 1),
            "avg_duration_minutes": round(total_duration / len(self.routes), 1),
            "cities": list(set(route.city for route in self.routes))
        }

    def get_time_distribution(self) -> Dict[str, int]:
        time_slots = defaultdict(int)

        for route in self.routes:
            hour = route.start_time.hour
            if 5 <= hour < 9:
                time_slots["早上(5-9点)"] += 1
            elif 9 <= hour < 12:
                time_slots["上午(9-12点)"] += 1
            elif 12 <= hour < 14:
                time_slots["中午(12-14点)"] += 1
            elif 14 <= hour < 18:
                time_slots["下午(14-18点)"] += 1
            elif 18 <= hour < 22:
                time_slots["晚上(18-22点)"] += 1
            else:
                time_slots["深夜(22-5点)"] += 1

        return dict(time_slots)

    def extract_route_patterns(self, min_support: int = 3) -> List[Dict]:
        sequence_counts = defaultdict(int)
        sequence_routes = defaultdict(list)

        for route in self.routes:
            seq = tuple(route.poi_sequence)
            sequence_counts[seq] += 1
            sequence_routes[seq].append(route)

        frequent_patterns = []
        for seq, count in sequence_counts.items():
            if count >= min_support:
                pois = [get_poi_by_id(poi_id) for poi_id in seq]
                frequent_patterns.append({
                    "sequence": list(seq),
                    "poi_names": [poi.name if poi else "未知" for poi in pois],
                    "count": count,
                    "city": sequence_routes[seq][0].city
                })

        frequent_patterns.sort(key=lambda x: x["count"], reverse=True)
        return frequent_patterns
