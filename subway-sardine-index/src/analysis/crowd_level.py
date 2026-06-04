import json
import logging
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, asdict
from enum import Enum

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("logs/crowd_level.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


class CrowdLevel(Enum):
    COMFORTABLE = ("舒适", "green", 1.0)
    NORMAL = ("普通", "yellow", 1.5)
    CROWDED = ("拥挤", "orange", 2.0)
    PACKED = ("爆满", "red", 2.5)

    def __init__(self, label: str, color: str, size_multiplier: float):
        self.label = label
        self.color = color
        self.size_multiplier = size_multiplier

    @classmethod
    def from_index(cls, index: float) -> "CrowdLevel":
        if index < 0.3:
            return cls.COMFORTABLE
        elif index < 0.55:
            return cls.NORMAL
        elif index < 0.8:
            return cls.CROWDED
        else:
            return cls.PACKED


@dataclass
class CrowdData:
    station_id: str
    station_name: str
    city: str
    longitude: float
    latitude: float
    congestion_index: float
    crowd_level: str
    crowd_color: str
    size_multiplier: float
    status: str
    speed: float
    road_count: int
    is_transfer: bool
    timestamp: str

    def to_dict(self) -> Dict:
        return asdict(self)


class CrowdLevelAnalyzer:
    def __init__(self):
        self.thresholds = {
            "comfortable": 0.3,
            "normal": 0.55,
            "crowded": 0.8,
            "packed": 1.0,
        }

    def analyze(
        self,
        traffic_data: List[Dict],
        stations_data: Optional[List[Dict]] = None,
    ) -> List[CrowdData]:
        logger.info(f"Analyzing crowd levels for {len(traffic_data)} stations...")

        station_info_map = {}
        if stations_data:
            for s in stations_data:
                station_info_map[s.get("id", "")] = s

        results = []
        for traffic in traffic_data:
            crowd_data = self._analyze_single_station(traffic, station_info_map)
            if crowd_data:
                results.append(crowd_data)

        logger.info(f"Analysis complete. {len(results)} stations processed")
        return results

    def _analyze_single_station(
        self, traffic: Dict, station_info_map: Dict[str, Dict]
    ) -> Optional[CrowdData]:
        try:
            station_id = traffic.get("station_id", "")
            congestion_index = traffic.get("congestion_index", 0.0)

            is_transfer = False
            if station_id in station_info_map:
                is_transfer = station_info_map[station_id].get("is_transfer", False)

            if is_transfer:
                congestion_index = min(1.0, congestion_index * 1.2)

            crowd_level = CrowdLevel.from_index(congestion_index)

            return CrowdData(
                station_id=station_id,
                station_name=traffic.get("station_name", ""),
                city=traffic.get("city", ""),
                longitude=traffic.get("longitude", 0),
                latitude=traffic.get("latitude", 0),
                congestion_index=round(congestion_index, 3),
                crowd_level=crowd_level.label,
                crowd_color=crowd_level.color,
                size_multiplier=crowd_level.size_multiplier,
                status=traffic.get("status", ""),
                speed=traffic.get("speed", 0),
                road_count=traffic.get("road_count", 0),
                is_transfer=is_transfer,
                timestamp=traffic.get("timestamp", ""),
            )
        except Exception as e:
            logger.error(f"Error analyzing station {traffic.get('station_name')}: {e}")
            return None

    def get_statistics(self, crowd_data: List[CrowdData]) -> Dict:
        total = len(crowd_data)
        if total == 0:
            return {}

        level_counts = {level.label: 0 for level in CrowdLevel}
        for data in crowd_data:
            level_counts[data.crowd_level] = level_counts.get(data.crowd_level, 0) + 1

        avg_index = sum(d.congestion_index for d in crowd_data) / total
        transfer_stations = [d for d in crowd_data if d.is_transfer]
        avg_transfer_index = (
            sum(d.congestion_index for d in transfer_stations) / len(transfer_stations)
            if transfer_stations
            else 0
        )

        most_crowded = max(crowd_data, key=lambda x: x.congestion_index)
        least_crowded = min(crowd_data, key=lambda x: x.congestion_index)

        return {
            "total_stations": total,
            "level_distribution": level_counts,
            "average_congestion_index": round(avg_index, 3),
            "transfer_station_count": len(transfer_stations),
            "average_transfer_index": round(avg_transfer_index, 3),
            "most_crowded": {
                "name": most_crowded.station_name,
                "index": most_crowded.congestion_index,
                "level": most_crowded.crowd_level,
            },
            "least_crowded": {
                "name": least_crowded.station_name,
                "index": least_crowded.congestion_index,
                "level": least_crowded.crowd_level,
            },
        }

    def export_to_geojson(self, crowd_data: List[CrowdData], output_path: str) -> str:
        features = []
        for data in crowd_data:
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [data.longitude, data.latitude],
                },
                "properties": {
                    "station_id": data.station_id,
                    "station_name": data.station_name,
                    "city": data.city,
                    "congestion_index": data.congestion_index,
                    "crowd_level": data.crowd_level,
                    "crowd_color": data.crowd_color,
                    "size_multiplier": data.size_multiplier,
                    "status": data.status,
                    "speed": data.speed,
                    "road_count": data.road_count,
                    "is_transfer": data.is_transfer,
                    "timestamp": data.timestamp,
                },
            }
            features.append(feature)

        geojson = {
            "type": "FeatureCollection",
            "features": features,
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(geojson, f, ensure_ascii=False, indent=2)

        logger.info(f"Exported {len(features)} features to {output_path}")
        return output_path

    def update_thresholds(
        self,
        comfortable: Optional[float] = None,
        normal: Optional[float] = None,
        crowded: Optional[float] = None,
    ) -> None:
        if comfortable is not None:
            self.thresholds["comfortable"] = comfortable
        if normal is not None:
            self.thresholds["normal"] = normal
        if crowded is not None:
            self.thresholds["crowded"] = crowded
        logger.info(f"Updated thresholds: {self.thresholds}")


def main():
    analyzer = CrowdLevelAnalyzer()

    sample_traffic = [
        {
            "station_id": "1",
            "station_name": "西二旗",
            "city": "北京",
            "longitude": 116.3056,
            "latitude": 40.0503,
            "congestion_index": 0.95,
            "status": "严重拥堵",
            "speed": 5.2,
            "road_count": 20,
            "timestamp": "2024-01-01T08:30:00",
        },
        {
            "station_id": "2",
            "station_name": "人民广场",
            "city": "上海",
            "longitude": 121.4737,
            "latitude": 31.2304,
            "congestion_index": 0.88,
            "status": "严重拥堵",
            "speed": 6.5,
            "road_count": 18,
            "timestamp": "2024-01-01T08:30:00",
        },
        {
            "station_id": "3",
            "station_name": "郊区始发站",
            "city": "北京",
            "longitude": 116.5,
            "latitude": 39.8,
            "congestion_index": 0.15,
            "status": "畅通",
            "speed": 55.0,
            "road_count": 5,
            "timestamp": "2024-01-01T08:30:00",
        },
    ]

    results = analyzer.analyze(sample_traffic)

    for r in results:
        print(
            f"{r.station_name}: {r.crowd_level} (index={r.congestion_index}, "
            f"color={r.crowd_color}, size={r.size_multiplier})"
        )

    stats = analyzer.get_statistics(results)
    print("\nStatistics:")
    print(json.dumps(stats, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
