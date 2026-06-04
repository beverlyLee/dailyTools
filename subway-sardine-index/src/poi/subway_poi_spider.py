import os
import time
import json
import logging
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict

import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("logs/poi_spider.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

GAODE_KEY = os.getenv("GAODE_TRAFFIC_KEY", "")
POI_SEARCH_URL = "https://restapi.amap.com/v3/place/text"
POI_AROUND_URL = "https://restapi.amap.com/v3/place/around"

CITY_CODES = {
    "北京": "110000",
    "上海": "310000",
    "广州": "440100",
    "深圳": "440300",
    "成都": "510100",
    "杭州": "330100",
    "武汉": "420100",
    "西安": "610100",
    "重庆": "500000",
    "南京": "320100",
}


@dataclass
class SubwayStation:
    id: str
    name: str
    city: str
    address: str
    longitude: float
    latitude: float
    entrances: List[str]
    lines: List[str]
    is_transfer: bool = False

    def to_dict(self) -> Dict:
        return asdict(self)


class SubwayPOISpider:
    def __init__(self, key: Optional[str] = None):
        self.key = key or GAODE_KEY
        self.demo_mode = not self.key
        if self.demo_mode:
            logger.warning("GAODE_TRAFFIC_KEY is not set. Running in DEMO mode with sample data.")
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "SubwaySardineIndex/1.0"})

    def _request(self, url: str, params: Dict, max_retries: int = 3) -> Dict:
        for attempt in range(max_retries):
            try:
                params["key"] = self.key
                response = self.session.get(url, params=params, timeout=10)
                response.raise_for_status()
                data = response.json()
                if data.get("status") == "1":
                    return data
                logger.warning(f"API returned error: {data.get('info')}")
            except Exception as e:
                logger.warning(f"Request failed (attempt {attempt + 1}): {e}")
            time.sleep(1 * (attempt + 1))
        raise RuntimeError(f"Failed to fetch data after {max_retries} retries")

    def search_subway_stations(
        self, city: str, keyword: str = "地铁站", output_dir: str = "data"
    ) -> List[SubwayStation]:
        logger.info(f"Searching subway stations in {city}...")

        if self.demo_mode:
            logger.info(f"Demo mode: Loading sample data for {city}")
            return self._load_sample_data(city, output_dir)

        city_code = CITY_CODES.get(city, city)

        all_stations = []
        page = 1
        page_size = 25

        while True:
            params = {
                "keywords": keyword,
                "types": "150500",
                "city": city_code,
                "citylimit": "true",
                "offset": page_size,
                "page": page,
                "extensions": "all",
            }

            data = self._request(POI_SEARCH_URL, params)
            pois = data.get("pois", [])

            if not pois:
                break

            for poi in pois:
                station = self._parse_poi(poi, city)
                if station:
                    all_stations.append(station)

            logger.info(f"Fetched page {page}, {len(pois)} stations")

            if len(pois) < page_size:
                break

            page += 1
            time.sleep(0.5)

        logger.info(f"Total stations found in {city}: {len(all_stations)}")

        os.makedirs(output_dir, exist_ok=True)
        output_file = os.path.join(output_dir, f"{city}_subway_stations.json")
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump([s.to_dict() for s in all_stations], f, ensure_ascii=False, indent=2)
        logger.info(f"Saved stations to {output_file}")

        return all_stations

    def _load_sample_data(self, city: str, output_dir: str) -> List[SubwayStation]:
        sample_file = os.path.join(output_dir, f"{city}_subway_stations_sample.json")

        if os.path.exists(sample_file):
            with open(sample_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            stations = [SubwayStation(**item) for item in data]

            os.makedirs(output_dir, exist_ok=True)
            output_file = os.path.join(output_dir, f"{city}_subway_stations.json")
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump([s.to_dict() for s in stations], f, ensure_ascii=False, indent=2)
            logger.info(f"Loaded {len(stations)} sample stations for {city}")
            return stations
        else:
            logger.warning(f"No sample data found for {city}, generating mock data")
            return self._generate_mock_stations(city, output_dir)

    def _generate_mock_stations(self, city: str, output_dir: str) -> List[SubwayStation]:
        center_coords = {
            "北京": (116.4074, 39.9042),
            "上海": (121.4737, 31.2304),
            "广州": (113.2644, 23.1291),
            "深圳": (114.0579, 22.5431),
            "成都": (104.0668, 30.5728),
            "杭州": (120.1551, 30.2741),
            "武汉": (114.3055, 30.5928),
            "西安": (108.9398, 34.3416),
            "重庆": (106.9123, 29.4316),
            "南京": (118.7969, 32.0603),
        }

        center_lng, center_lat = center_coords.get(city, (116.4074, 39.9042))

        mock_names = [
            ("中心站", True), ("商贸城", True), ("科技园", False),
            ("大学路", False), ("体育中心", True), ("公园", False),
            ("火车站", True), ("机场", False), ("新区", False),
            ("老城", False), ("金融街", True), ("软件园", False),
        ]

        stations = []
        for i, (name, is_transfer) in enumerate(mock_names):
            lng_offset = (i - 5) * 0.05
            lat_offset = (i % 4 - 2) * 0.03
            stations.append(
                SubwayStation(
                    id=f"MOCK{i:04d}",
                    name=name,
                    city=city,
                    address=f"{city}{name}",
                    longitude=center_lng + lng_offset,
                    latitude=center_lat + lat_offset,
                    entrances=["A口", "B口"],
                    lines=[f"{i+1}号线"],
                    is_transfer=is_transfer,
                )
            )

        os.makedirs(output_dir, exist_ok=True)
        output_file = os.path.join(output_dir, f"{city}_subway_stations.json")
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump([s.to_dict() for s in stations], f, ensure_ascii=False, indent=2)
        logger.info(f"Generated {len(stations)} mock stations for {city}")
        return stations

    def _parse_poi(self, poi: Dict, city: str) -> Optional[SubwayStation]:
        try:
            location = poi.get("location", "")
            if not location:
                return None

            lng, lat = map(float, location.split(","))
            name = poi.get("name", "").replace("地铁站", "").strip()

            entrances = []
            lines = []

            if "出入口" in name:
                parts = name.split("(")
                if len(parts) > 1:
                    entrance = parts[-1].rstrip(")")
                    entrances.append(entrance)
                    name = parts[0].strip()

            poi_type = poi.get("type", "")
            if "地铁" in poi_type:
                for line in ["1号线", "2号线", "3号线", "4号线", "5号线", "6号线", "7号线", "8号线", "9号线", "10号线"]:
                    if line in poi_type:
                        lines.append(line)

            address = poi.get("address", "")
            is_transfer = "换乘" in name or len(lines) > 1

            return SubwayStation(
                id=poi.get("id", ""),
                name=name,
                city=city,
                address=address,
                longitude=lng,
                latitude=lat,
                entrances=entrances,
                lines=lines,
                is_transfer=is_transfer,
            )
        except Exception as e:
            logger.warning(f"Failed to parse POI: {e}")
            return None

    def bulk_search_cities(self, cities: List[str]) -> Dict[str, List[SubwayStation]]:
        results = {}
        for city in cities:
            try:
                stations = self.search_subway_stations(city)
                results[city] = stations
            except Exception as e:
                logger.error(f"Failed to search {city}: {e}")
        return results

    def load_from_file(self, filepath: str) -> List[SubwayStation]:
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")

        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        return [SubwayStation(**item) for item in data]


def main():
    load_dotenv()

    spider = SubwayPOISpider()

    cities = ["北京", "上海", "广州", "深圳"]

    try:
        spider.bulk_search_cities(cities)
        logger.info("All cities processed successfully")
    except Exception as e:
        logger.error(f"Error: {e}")


if __name__ == "__main__":
    main()
