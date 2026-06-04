import os
import json
import time
import logging
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

import requests
from dotenv import load_dotenv

from src.utils.geometry_utils import (
    line_length_meters,
    is_shapely_available,
)
from src.models.schemas import SegmentData, RoadType, MapBounds

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

if is_shapely_available():
    logger.info("osm_crawler: shapely 可用，空间计算将使用 shapely 加速")
else:
    logger.info("osm_crawler: shapely 不可用，将使用纯 Python 降级方案")


@dataclass
class OSMNode:
    id: int
    lat: float
    lon: float
    tags: Dict


@dataclass
class OSMWay:
    id: int
    nodes: List[int]
    tags: Dict


class OSMCrawler:
    def __init__(self, overpass_url: Optional[str] = None):
        self.overpass_url = overpass_url or os.getenv(
            "OSM_OVERPASS_URL", "https://overpass-api.de/api/interpreter"
        )
        self.city_bounds = self._parse_bounds(os.getenv("CITY_BOUNDS", "121.40,31.15,121.55,31.25"))
        self.nodes: Dict[int, OSMNode] = {}
        self.ways: List[OSMWay] = []
        self.segments: List[SegmentData] = []

    @staticmethod
    def _parse_bounds(bounds_str: str) -> MapBounds:
        parts = [float(x.strip()) for x in bounds_str.split(",")]
        return MapBounds(
            min_lng=parts[0],
            min_lat=parts[1],
            max_lng=parts[2],
            max_lat=parts[3],
        )

    def _build_overpass_query(self, bounds: MapBounds) -> str:
        return f"""
        [out:json][timeout:180];
        (
          way["highway"~"^(path|footway|pedestrian|cycleway|residential|tertiary|secondary|primary|trunk)$"]
            ({bounds.min_lat},{bounds.min_lng},{bounds.max_lat},{bounds.max_lng});
          relation["highway"~"^(path|footway|pedestrian|cycleway|residential|tertiary|secondary|primary|trunk)$"]
            ({bounds.min_lat},{bounds.min_lng},{bounds.max_lat},{bounds.max_lng});
        );
        out body;
        >;
        out skel qt;
        """

    def fetch_osm_data(self, bounds: Optional[MapBounds] = None) -> Dict:
        bounds = bounds or self.city_bounds
        query = self._build_overpass_query(bounds)
        logger.info(f"Fetching OSM data for bounds: {bounds}")

        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    self.overpass_url,
                    data=query,
                    timeout=180,
                )
                response.raise_for_status()
                data = response.json()
                logger.info(f"Fetched {len(data.get('elements', []))} elements")
                return data
            except Exception as e:
                logger.warning(f"Attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(5 * (attempt + 1))
                else:
                    raise

    def parse_osm_data(self, osm_data: Dict) -> None:
        elements = osm_data.get("elements", [])
        self.nodes = {}
        self.ways = []

        for element in elements:
            if element["type"] == "node":
                self.nodes[element["id"]] = OSMNode(
                    id=element["id"],
                    lat=element["lat"],
                    lon=element["lon"],
                    tags=element.get("tags", {}),
                )
            elif element["type"] == "way":
                self.ways.append(
                    OSMWay(
                        id=element["id"],
                        nodes=element["nodes"],
                        tags=element.get("tags", {}),
                    )
                )

        logger.info(f"Parsed {len(self.nodes)} nodes and {len(self.ways)} ways")

    @staticmethod
    def _parse_lit(tags: Dict) -> Optional[bool]:
        lit_value = tags.get("lit", "").lower()
        if lit_value in ["yes", "true", "1"]:
            return True
        elif lit_value in ["no", "false", "0"]:
            return False
        elif lit_value in ["limited", "automatic", "sunset-sunrise"]:
            return True
        return None

    @staticmethod
    def _parse_width(tags: Dict) -> Optional[float]:
        width_str = tags.get("width", "")
        if width_str:
            try:
                return float(width_str.replace("m", "").strip())
            except ValueError:
                pass

        lanes = tags.get("lanes")
        if lanes:
            try:
                return int(lanes) * 3.5
            except ValueError:
                pass

        highway = tags.get("highway", "")
        width_map = {
            "trunk": 20,
            "primary": 15,
            "secondary": 12,
            "tertiary": 8,
            "residential": 6,
            "pedestrian": 5,
            "footway": 3,
            "cycleway": 2.5,
            "path": 2,
        }
        return width_map.get(highway)

    @staticmethod
    def _parse_road_type(highway_value: str) -> Optional[RoadType]:
        try:
            return RoadType(highway_value)
        except ValueError:
            return None

    @staticmethod
    def _estimate_lighting(tags: Dict, road_type: RoadType) -> bool:
        major_roads = {RoadType.PRIMARY, RoadType.SECONDARY, RoadType.TERTIARY, RoadType.TRUNK}
        if road_type in major_roads:
            return True

        if tags.get("highway") == "pedestrian":
            return True

        if tags.get("sidewalk") in ["both", "left", "right"]:
            return True

        return False

    def _way_to_segment(self, way: OSMWay) -> Optional[SegmentData]:
        highway_value = way.tags.get("highway", "")
        road_type = self._parse_road_type(highway_value)
        if not road_type:
            return None

        if len(way.nodes) < 2:
            return None

        coords = []
        for node_id in way.nodes:
            node = self.nodes.get(node_id)
            if node:
                coords.append((node.lon, node.lat))

        if len(coords) < 2:
            return None

        length_meters = line_length_meters(coords)

        lit = self._parse_lit(way.tags)
        if lit is None:
            lit = self._estimate_lighting(way.tags, road_type)

        width = self._parse_width(way.tags)

        return SegmentData(
            segment_id=f"way_{way.id}",
            coordinates=coords,
            highway=road_type,
            lit=lit,
            width=width,
            surface=way.tags.get("surface"),
            length=length_meters,
            name=way.tags.get("name"),
        )

    def build_segments(self) -> List[SegmentData]:
        self.segments = []
        for way in self.ways:
            segment = self._way_to_segment(way)
            if segment:
                self.segments.append(segment)

        logger.info(f"Built {len(self.segments)} segments")
        return self.segments

    def build_lighting_matrix(self, grid_size: float = 0.001) -> Tuple[list, Dict]:
        bounds = self.city_bounds

        try:
            import numpy as np
            lng_range = np.arange(bounds.min_lng, bounds.max_lng, grid_size)
            lat_range = np.arange(bounds.min_lat, bounds.max_lat, grid_size)
            matrix = np.zeros((len(lat_range), len(lng_range)), dtype=bool)
            use_numpy = True
        except ImportError:
            lng_steps = int((bounds.max_lng - bounds.min_lng) / grid_size) + 1
            lat_steps = int((bounds.max_lat - bounds.min_lat) / grid_size) + 1
            matrix = [[False] * lng_steps for _ in range(lat_steps)]
            use_numpy = False

        metadata = {
            "grid_size": grid_size,
            "min_lng": bounds.min_lng,
            "max_lng": bounds.max_lng,
            "min_lat": bounds.min_lat,
            "max_lat": bounds.max_lat,
        }

        for segment in self.segments:
            if segment.lit:
                for coord in segment.coordinates:
                    lng_idx = int((coord[0] - bounds.min_lng) / grid_size)
                    lat_idx = int((coord[1] - bounds.min_lat) / grid_size)
                    if use_numpy:
                        if 0 <= lng_idx < len(lng_range) and 0 <= lat_idx < len(lat_range):
                            matrix[lat_idx, lng_idx] = True
                            for di in range(-1, 2):
                                for dj in range(-1, 2):
                                    ni, nj = lat_idx + di, lng_idx + dj
                                    if 0 <= ni < len(lat_range) and 0 <= nj < len(lng_range):
                                        matrix[ni, nj] = True
                    else:
                        if 0 <= lng_idx < lng_steps and 0 <= lat_idx < lat_steps:
                            matrix[lat_idx][lng_idx] = True
                            for di in range(-1, 2):
                                for dj in range(-1, 2):
                                    ni, nj = lat_idx + di, lng_idx + dj
                                    if 0 <= ni < lat_steps and 0 <= nj < lng_steps:
                                        matrix[ni][nj] = True

        if use_numpy:
            logger.info(f"Built lighting matrix: {matrix.shape}, lit cells: {matrix.sum()}")
            metadata["lng_steps"] = len(lng_range)
            metadata["lat_steps"] = len(lat_range)
        else:
            lit_count = sum(sum(row) for row in matrix)
            logger.info(f"Built lighting matrix: ({lat_steps},{lng_steps}), lit cells: {lit_count}")
            metadata["lng_steps"] = lng_steps
            metadata["lat_steps"] = lat_steps

        return matrix, metadata

    def save_data(self, output_dir: str = "data") -> None:
        os.makedirs(output_dir, exist_ok=True)

        segments_data = [s.model_dump() for s in self.segments]
        with open(os.path.join(output_dir, "segments.json"), "w", encoding="utf-8") as f:
            json.dump(segments_data, f, ensure_ascii=False, indent=2, default=str)

        matrix, metadata = self.build_lighting_matrix()

        try:
            import numpy as np
            if not isinstance(matrix, np.ndarray):
                matrix = np.array(matrix)
            np.save(os.path.join(output_dir, "lighting_matrix.npy"), matrix)
        except ImportError:
            with open(os.path.join(output_dir, "lighting_matrix.json"), "w") as f:
                json.dump([[bool(cell) for cell in row] for row in matrix], f)

        with open(os.path.join(output_dir, "lighting_metadata.json"), "w") as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"Data saved to {output_dir}")

    def load_data(self, data_dir: str = "data") -> List[SegmentData]:
        segments_path = os.path.join(data_dir, "segments.json")
        if not os.path.exists(segments_path):
            raise FileNotFoundError(f"Segments file not found: {segments_path}")

        with open(segments_path, "r", encoding="utf-8") as f:
            segments_data = json.load(f)

        self.segments = [SegmentData(**s) for s in segments_data]
        logger.info(f"Loaded {len(self.segments)} segments from {data_dir}")
        return self.segments

    def crawl_and_process(self, bounds: Optional[MapBounds] = None) -> List[SegmentData]:
        osm_data = self.fetch_osm_data(bounds)
        self.parse_osm_data(osm_data)
        segments = self.build_segments()
        self.save_data()
        return segments
