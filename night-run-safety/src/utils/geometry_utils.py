import math
import logging
from typing import List, Tuple, Optional

logger = logging.getLogger(__name__)

_SHAPELY_AVAILABLE = False

try:
    from shapely.geometry import LineString as _ShapelyLineString
    from shapely.geometry import Point as _ShapelyPoint
    _SHAPELY_AVAILABLE = True
    logger.info("shapely 库已加载，将使用 shapely 进行空间计算")
except ImportError:
    _ShapelyLineString = None
    _ShapelyPoint = None
    logger.info("shapely 库不可用，将使用纯 Python 降级方案进行空间计算")


def is_shapely_available() -> bool:
    return _SHAPELY_AVAILABLE


def haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    lng1, lat1 = coord1
    lng2, lat2 = coord2
    lng1_r, lat1_r = math.radians(lng1), math.radians(lat1)
    lng2_r, lat2_r = math.radians(lng2), math.radians(lat2)
    dlng = lng2_r - lng1_r
    dlat = lat2_r - lat1_r
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlng / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371000
    return c * r


def euclidean_distance_deg(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    lng1, lat1 = coord1
    lng2, lat2 = coord2
    return math.sqrt((lng2 - lng1) ** 2 + (lat2 - lat1) ** 2)


def point_to_line_distance_deg(
    point: Tuple[float, float],
    line_coords: List[Tuple[float, float]],
) -> float:
    if not line_coords:
        return float("inf")

    if len(line_coords) == 1:
        return euclidean_distance_deg(point, line_coords[0])

    min_dist = float("inf")
    px, py = point

    for i in range(len(line_coords) - 1):
        x1, y1 = line_coords[i]
        x2, y2 = line_coords[i + 1]

        dx = x2 - x1
        dy = y2 - y1

        if dx == 0 and dy == 0:
            dist = euclidean_distance_deg(point, (x1, y1))
        else:
            t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
            t = max(0.0, min(1.0, t))

            proj_x = x1 + t * dx
            proj_y = y1 + t * dy

            dist = euclidean_distance_deg(point, (proj_x, proj_y))

        if dist < min_dist:
            min_dist = dist

    return min_dist


def polyline_length_deg(coords: List[Tuple[float, float]]) -> float:
    if len(coords) < 2:
        return 0.0
    total = 0.0
    for i in range(len(coords) - 1):
        total += euclidean_distance_deg(coords[i], coords[i + 1])
    return total


def polyline_length_meters(coords: List[Tuple[float, float]]) -> float:
    if len(coords) < 2:
        return 0.0
    total = 0.0
    for i in range(len(coords) - 1):
        total += haversine_distance(coords[i], coords[i + 1])
    return total


def point_to_line_distance_meters(
    point: Tuple[float, float],
    line_coords: List[Tuple[float, float]],
) -> float:
    dist_deg = point_to_line_distance_deg(point, line_coords)
    avg_lat = point[1]
    lat_correction = math.cos(math.radians(avg_lat))
    return dist_deg * 111000 * lat_correction


def line_length_meters(coords: List[Tuple[float, float]]) -> float:
    if _SHAPELY_AVAILABLE:
        try:
            line = _ShapelyLineString(coords)
            return line.length * 111000
        except Exception:
            pass

    return polyline_length_meters(coords)


def nearest_point_on_line_distance_meters(
    point: Tuple[float, float],
    line_coords: List[Tuple[float, float]],
) -> float:
    if _SHAPELY_AVAILABLE:
        try:
            sp = _ShapelyPoint(point)
            sl = _ShapelyLineString(line_coords)
            return sp.distance(sl) * 111000
        except Exception:
            pass

    return point_to_line_distance_meters(point, line_coords)
