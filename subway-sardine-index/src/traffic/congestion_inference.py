import os
import time
import json
import logging
import math
from typing import List, Dict, Optional, Tuple
from datetime import datetime, time as dt_time
from dataclasses import dataclass, asdict

import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("logs/congestion.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

API_KEYS = [
    os.getenv("GAODE_TRAFFIC_KEY", ""),
    os.getenv("GAODE_GEOCODE_KEY", ""),
    os.getenv("GAODE_JS_API_KEY", ""),
]
API_KEYS = [k for k in API_KEYS if k]

TRAFFIC_STATUS_URL = "https://restapi.amap.com/v3/traffic/status/circle"

RETRYABLE_ERRORS = [
    "USERKEY_PLAT_NOMATCH",
    "INSUFFICIENT_PRIVILEGES",
    "INVALID_USER_KEY",
    "USER_DAILY_QUERY_OVER_LIMIT",
    "SERVICE_NOT_AVAILABLE",
]

MORNING_PEAK_START = dt_time(8, 0)
MORNING_PEAK_END = dt_time(9, 0)
SEARCH_RADIUS = 1000


@dataclass
class TrafficStatus:
    station_id: str
    station_name: str
    city: str
    timestamp: str
    longitude: float
    latitude: float
    congestion_index: float
    road_count: int
    speed: float
    status: str

    def to_dict(self) -> Dict:
        return asdict(self)


class APIFallbackError(Exception):
    def __init__(self, message="All API keys failed, switching to demo mode"):
        self.message = message
        super().__init__(self.message)


class CongestionInferenceEngine:
    def __init__(self, key: Optional[str] = None):
        self.api_keys = [key] if key else API_KEYS
        self.current_key_index = 0
        self.demo_mode = not self.api_keys
        self.demo_reason = "No API keys configured"
        self.api_error_details = []

        if self.demo_mode:
            logger.warning(
                "No API keys found. Running in DEMO mode with simulated data."
            )

        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "SubwaySardineIndex/1.0"})

    def _try_next_key(self) -> bool:
        if self.current_key_index < len(self.api_keys) - 1:
            self.current_key_index += 1
            logger.info(
                f"Switching to next API key (index: {self.current_key_index})"
            )
            return True
        return False

    def _request(self, url: str, params: Dict, max_retries: int = 2) -> Dict:
        for retry in range(max_retries):
            while self.current_key_index < len(self.api_keys):
                try:
                    params["key"] = self.api_keys[self.current_key_index]
                    response = self.session.get(url, params=params, timeout=10)
                    response.raise_for_status()
                    data = response.json()

                    if data.get("status") == "1":
                        return data

                    error_info = data.get("info", "Unknown error")
                    error_code = data.get("infocode", "N/A")

                    if any(err in error_info for err in RETRYABLE_ERRORS) or int(
                        error_code
                    ) >= 10000:
                        error_detail = (
                            f"Key {self.current_key_index}: {error_info} (code: {error_code})"
                        )
                        logger.warning(f"API error: {error_detail}")
                        self.api_error_details.append(error_detail)

                        if not self._try_next_key():
                            raise APIFallbackError()
                        continue

                    logger.warning(f"API returned error: {error_info}")
                    time.sleep(1 * (retry + 1))

                except APIFallbackError:
                    raise
                except requests.exceptions.Timeout:
                    logger.warning("Request timeout")
                    time.sleep(1 * (retry + 1))
                except requests.exceptions.RequestException as e:
                    logger.warning(f"Request failed: {e}")
                    time.sleep(1 * (retry + 1))
                except Exception as e:
                    logger.warning(f"Unexpected error: {e}")
                    time.sleep(1 * (retry + 1))

            if not self._try_next_key():
                break

        raise APIFallbackError()

    @staticmethod
    def is_morning_peak(now: Optional[datetime] = None) -> bool:
        now = now or datetime.now()
        current_time = now.time()
        return MORNING_PEAK_START <= current_time <= MORNING_PEAK_END

    def get_congestion_for_station(
        self,
        station_id: str,
        station_name: str,
        city: str,
        longitude: float,
        latitude: float,
        radius: int = SEARCH_RADIUS,
    ) -> Optional[TrafficStatus]:
        try:
            if self.demo_mode:
                simulated = self.simulate_morning_peak(
                    [
                        {
                            "id": station_id,
                            "name": station_name,
                            "city": city,
                            "longitude": longitude,
                            "latitude": latitude,
                        }
                    ]
                )
                return simulated[0] if simulated else None

            params = {
                "location": f"{longitude},{latitude}",
                "radius": radius,
                "level": 5,
                "extensions": "all",
            }

            data = self._request(TRAFFIC_STATUS_URL, params)
            traffic_info = data.get("trafficinfo", {})

            congestion_index = self._calculate_congestion_index(traffic_info)
            avg_speed = self._extract_avg_speed(traffic_info)
            road_count = self._count_roads(traffic_info)
            status = self._get_overall_status(traffic_info)

            return TrafficStatus(
                station_id=station_id,
                station_name=station_name,
                city=city,
                timestamp=datetime.now().isoformat(),
                longitude=longitude,
                latitude=latitude,
                congestion_index=congestion_index,
                road_count=road_count,
                speed=avg_speed,
                status=status,
            )
        except APIFallbackError:
            logger.warning(
                f"API failed for {station_name}. Falling back to simulation."
            )
            self.demo_mode = True
            self.demo_reason = "; ".join(self.api_error_details)
            simulated = self.simulate_morning_peak(
                [
                    {
                        "id": station_id,
                        "name": station_name,
                        "city": city,
                        "longitude": longitude,
                        "latitude": latitude,
                    }
                ]
            )
            return simulated[0] if simulated else None
        except Exception as e:
            logger.error(f"Error fetching congestion for {station_name}: {e}")
            return None

    def _calculate_congestion_index(self, traffic_info: Dict) -> float:
        roads = traffic_info.get("roads", [])
        if not roads:
            return 0.0

        status_weights = {
            "畅通": 0.0,
            "缓行": 0.5,
            "拥堵": 0.85,
            "严重拥堵": 1.0,
        }

        weighted_sum = 0.0
        total_length = 0.0

        for road in roads:
            status = road.get("status", "未知")
            length = float(road.get("length", 0))
            weight = status_weights.get(status, 0.3)
            weighted_sum += weight * length
            total_length += length

        if total_length == 0:
            return 0.0

        base_index = weighted_sum / total_length
        time_multiplier = self._get_time_multiplier()
        peak_amplifier = 1.0 + (0.3 if self.is_morning_peak() else 0)

        congestion_index = min(1.0, base_index * time_multiplier * peak_amplifier)

        return round(congestion_index, 3)

    def _get_time_multiplier(self) -> float:
        now = datetime.now()
        current_hour = now.hour + now.minute / 60.0

        if 7.5 <= current_hour <= 9.5:
            peak_center = 8.5
            distance = abs(current_hour - peak_center)
            return 1.0 + (0.5 - distance) * 0.4
        elif 17.0 <= current_hour <= 19.5:
            peak_center = 18.25
            distance = abs(current_hour - peak_center)
            return 1.0 + (0.75 - distance) * 0.3
        else:
            return max(0.3, 1.0 - abs(current_hour - 8.5) * 0.1)

    def _extract_avg_speed(self, traffic_info: Dict) -> float:
        roads = traffic_info.get("roads", [])
        if not roads:
            return 60.0

        status_speed_map = {
            "畅通": 50.0,
            "缓行": 25.0,
            "拥堵": 10.0,
            "严重拥堵": 5.0,
        }

        total_speed = 0.0
        count = 0

        for road in roads:
            status = road.get("status", "未知")
            speed = status_speed_map.get(status, 30.0)
            total_speed += speed
            count += 1

        return round(total_speed / max(count, 1), 1)

    def _count_roads(self, traffic_info: Dict) -> int:
        roads = traffic_info.get("roads", [])
        return len(roads)

    def _get_overall_status(self, traffic_info: Dict) -> str:
        evaluation = traffic_info.get("evaluation", {})
        status = evaluation.get("status", "未知")

        status_map = {
            "0": "畅通",
            "1": "畅通",
            "2": "缓行",
            "3": "拥堵",
            "4": "严重拥堵",
        }
        return status_map.get(str(status), status)

    def bulk_get_congestion(
        self, stations: List[Dict], output_dir: str = "data", batch_size: int = 10
    ) -> List[TrafficStatus]:
        logger.info(f"Starting congestion inference for {len(stations)} stations...")

        if self.demo_mode:
            logger.info("Demo mode: Using simulation for all stations")
            return self.simulate_morning_peak(stations)

        if not self.is_morning_peak():
            logger.warning("Current time is not in morning peak (8:00-9:00)")
            logger.info("Results will be adjusted with time multiplier")

        all_results = []

        try:
            for i in range(0, len(stations), batch_size):
                batch = stations[i : i + batch_size]
                logger.info(
                    f"Processing batch {i // batch_size + 1}, stations {i}-{i + len(batch)}"
                )

                for station in batch:
                    result = self.get_congestion_for_station(
                        station_id=station.get("id", ""),
                        station_name=station.get("name", ""),
                        city=station.get("city", ""),
                        longitude=station.get("longitude", 0),
                        latitude=station.get("latitude", 0),
                    )
                    if result:
                        all_results.append(result)
                    time.sleep(0.1)

                time.sleep(0.5)

        except APIFallbackError:
            logger.warning("API failed. Falling back to demo mode for all stations.")
            self.demo_mode = True
            self.demo_reason = "; ".join(self.api_error_details)
            return self.simulate_morning_peak(stations)

        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = os.path.join(output_dir, f"congestion_data_{timestamp}.json")

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump([r.to_dict() for r in all_results], f, ensure_ascii=False, indent=2)
        logger.info(f"Saved congestion data to {output_file}")

        return all_results

    def simulate_morning_peak(
        self, stations: List[Dict], peak_hour: int = 8
    ) -> List[TrafficStatus]:
        logger.info(f"Simulating morning peak at {peak_hour}:00...")

        simulated_results = []
        for station in stations:
            base_index = self._simulate_base_congestion(station)

            is_transfer = station.get("is_transfer", False)
            is_central = self._is_central_station(station.get("name", ""))
            is_suburban = self._is_suburban_terminal(station.get("name", ""))

            if is_suburban:
                peak_multiplier = 1.0
            elif is_central and is_transfer:
                peak_multiplier = 1.8
            elif is_central:
                peak_multiplier = 1.6
            elif is_transfer:
                peak_multiplier = 1.4
            else:
                peak_multiplier = 1.2

            congestion_index = min(1.0, base_index * peak_multiplier)

            status = TrafficStatus(
                station_id=station.get("id", ""),
                station_name=station.get("name", ""),
                city=station.get("city", ""),
                timestamp=datetime.now().isoformat(),
                longitude=station.get("longitude", 0),
                latitude=station.get("latitude", 0),
                congestion_index=round(congestion_index, 3),
                road_count=self._simulate_road_count(station),
                speed=round(60.0 * (1 - congestion_index), 1),
                status=self._index_to_status(congestion_index),
            )
            simulated_results.append(status)

        return simulated_results

    def _simulate_base_congestion(self, station: Dict) -> float:
        name = station.get("name", "")
        is_transfer = station.get("is_transfer", False)

        base_random = hash(name) % 100 / 100.0

        if self._is_suburban_terminal(name):
            return 0.05 + base_random * 0.2
        elif self._is_suburban_hub(name):
            return 0.3 + base_random * 0.25
        elif is_transfer and self._is_central_station(name):
            return 0.75 + base_random * 0.25
        elif is_transfer:
            return 0.55 + base_random * 0.3
        elif self._is_central_station(name):
            return 0.5 + base_random * 0.35
        else:
            return 0.2 + base_random * 0.35

    def _is_central_station(self, name: str) -> bool:
        central_keywords = [
            "西二旗",
            "人民广场",
            "国贸",
            "陆家嘴",
            "徐家汇",
            "静安寺",
            "中关村",
            "望京",
            "三元桥",
            "东直门",
            "西直门",
            "复兴门",
            "南京西路",
            "淮海中路",
            "体育西路",
            "珠江新城",
            "福田",
            "车公庙",
            "高新园",
            "深大",
            "五道口",
            "知春路",
            "宋家庄",
            "世纪大道",
            "中山公园",
            "陕西南路",
            "常熟路",
            "衡山路",
            "西单",
            "东单",
            "虹桥火车站",
            "上海火车站",
        ]
        return any(kw in name for kw in central_keywords)

    def _is_suburban_terminal(self, name: str) -> bool:
        suburban_terminals = [
            "俸伯",
            "南邵",
            "美兰湖",
            "嘉定北",
            "滴水湖",
            "松江新城",
            "亦庄火车站",
            "苹果园",
            "朱辛庄",
            "安河桥北",
            "西苑",
            "巴沟",
            "劲松",
            "四惠东",
            "土桥",
            "临河里",
        ]
        return any(kw in name for kw in suburban_terminals)

    def _is_suburban_hub(self, name: str) -> bool:
        suburban_hubs = [
            "天通苑北",
            "回龙观",
            "霍营",
            "立水桥",
            "北苑",
            "莘庄",
            "共富新村",
            "彭浦新村",
            "通河新村",
        ]
        return any(kw in name for kw in suburban_hubs)

    def _simulate_road_count(self, station: Dict) -> int:
        name = station.get("name", "")
        if self._is_central_station(name):
            return 15 + (hash(name) % 10)
        elif station.get("is_transfer", False):
            return 10 + (hash(name) % 8)
        else:
            return 3 + (hash(name) % 7)

    def _index_to_status(self, index: float) -> str:
        if index >= 0.85:
            return "严重拥堵"
        elif index >= 0.6:
            return "拥堵"
        elif index >= 0.3:
            return "缓行"
        else:
            return "畅通"


def main():
    load_dotenv()

    from src.poi.subway_poi_spider import SubwayPOISpider

    engine = CongestionInferenceEngine()

    spider = SubwayPOISpider()
    stations = spider.load_from_file("data/北京_subway_stations.json")
    station_dicts = [s.to_dict() for s in stations]

    if engine.is_morning_peak():
        results = engine.bulk_get_congestion(station_dicts)
    else:
        logger.info("Using simulation mode for morning peak")
        results = engine.simulate_morning_peak(station_dicts)

    logger.info(f"Processed {len(results)} stations")

    for r in results[:5]:
        logger.info(f"{r.station_name}: {r.congestion_index} ({r.status})")


if __name__ == "__main__":
    main()
