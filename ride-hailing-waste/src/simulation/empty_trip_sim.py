import random
import math
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field

_src_dir = Path(__file__).parent.parent
if str(_src_dir) not in sys.path:
    sys.path.insert(0, str(_src_dir))

from traffic.road_status_spider import RoadStatusSpider, BEIJING_KEY_AREAS


@dataclass
class VehicleTrajectory:
    vehicle_id: str
    path: List[Tuple[float, float]]
    timestamps: List[float]
    speeds: List[float]
    is_empty_segments: List[bool]
    total_distance: float
    empty_distance: float
    pickup_point: Optional[Tuple[float, float]] = None
    dropoff_point: Optional[Tuple[float, float]] = None


@dataclass
class SimulationResult:
    trajectories: List[VehicleTrajectory]
    total_vehicles: int
    total_distance: float
    total_empty_distance: float
    empty_ratio: float
    key_area_stats: Dict[str, Dict] = field(default_factory=dict)


VEHICLE_TYPE_PARAMS = {
    "gasoline": {
        "empty_before_base": 0.5,
        "empty_after_base": 0.4,
        "speed_multiplier": 1.15,
        "distance_multiplier": 1.0,
    },
    "hybrid": {
        "empty_before_base": 0.65,
        "empty_after_base": 0.55,
        "speed_multiplier": 1.0,
        "distance_multiplier": 1.05,
    },
    "electric": {
        "empty_before_base": 0.8,
        "empty_after_base": 0.7,
        "speed_multiplier": 0.85,
        "distance_multiplier": 0.9,
    },
}


TIME_MODE_PARAMS = {
    "morning_peak": {
        "density_multiplier": 1.5,
        "airport_station_empty_boost": 0.15,
        "cbd_radial_intensity": 0.5,
        "direction_bias": "to_city",
        "speed_multiplier": 0.7,
        "label": "早高峰 7:00-9:00",
    },
    "off_peak": {
        "density_multiplier": 1.0,
        "airport_station_empty_boost": 0.0,
        "cbd_radial_intensity": 0.5,
        "direction_bias": "none",
        "speed_multiplier": 1.0,
        "label": "平峰 10:00-16:00",
    },
    "evening_peak": {
        "density_multiplier": 1.8,
        "airport_station_empty_boost": 0.2,
        "cbd_radial_intensity": 1.5,
        "direction_bias": "from_city",
        "speed_multiplier": 0.6,
        "label": "晚高峰 17:00-20:00",
    },
}


class EmptyTripSimulator:
    def __init__(self, spider: Optional[RoadStatusSpider] = None,
                 vehicle_type: str = "gasoline",
                 time_mode: str = "off_peak"):
        self.spider = spider or RoadStatusSpider()
        self.vehicle_type = vehicle_type if vehicle_type in VEHICLE_TYPE_PARAMS else "gasoline"
        self.time_mode = time_mode if time_mode in TIME_MODE_PARAMS else "off_peak"
        self._params = VEHICLE_TYPE_PARAMS[self.vehicle_type]
        self._time_params = TIME_MODE_PARAMS[self.time_mode]
        self._segments_cache = None
        self._vehicle_counter = 0

    def _haversine_distance(self, p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
        R = 6371000
        lat1, lat2 = math.radians(p1[1]), math.radians(p2[1])
        dlat = math.radians(p2[1] - p1[1])
        dlng = math.radians(p2[0] - p1[0])
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    def _path_length(self, path: List[Tuple[float, float]]) -> float:
        total = 0.0
        for i in range(len(path) - 1):
            total += self._haversine_distance(path[i], path[i+1])
        return total

    def _interpolate_path(self, start: Tuple[float, float], end: Tuple[float, float],
                          num_points: int = 10, jitter: float = 0.001) -> List[Tuple[float, float]]:
        path = []
        for i in range(num_points + 1):
            t = i / num_points
            lng = start[0] + (end[0] - start[0]) * t + random.uniform(-jitter, jitter) * math.sin(t * math.pi)
            lat = start[1] + (end[1] - start[1]) * t + random.uniform(-jitter, jitter) * math.sin(t * math.pi)
            path.append((round(lng, 6), round(lat, 6)))
        return path

    def _generate_ride_path(self, start: Tuple[float, float], end: Tuple[float, float],
                            is_empty: bool = False) -> Tuple[List[Tuple[float, float]], List[float], List[float]]:
        num_points = random.randint(15, 40)
        jitter = 0.002 if is_empty else 0.0008

        mid_points = []
        num_mid_waypoints = random.randint(1, 3)
        for i in range(num_mid_waypoints):
            t = (i + 1) / (num_mid_waypoints + 1)
            mid_lng = start[0] + (end[0] - start[0]) * t + random.uniform(-0.01, 0.01)
            mid_lat = start[1] + (end[1] - start[1]) * t + random.uniform(-0.008, 0.008)
            mid_points.append((mid_lng, mid_lat))

        waypoints = [start] + mid_points + [end]
        full_path = []
        speeds = []

        for i in range(len(waypoints) - 1):
            seg_start = waypoints[i]
            seg_end = waypoints[i+1]
            seg_points = max(3, num_points // max(1, len(waypoints) - 1))
            seg_path = self._interpolate_path(seg_start, seg_end, seg_points, jitter * 0.5)

            base_speed = random.uniform(25, 55) if is_empty else random.uniform(15, 40)
            base_speed *= self._params["speed_multiplier"]
            base_speed *= self._time_params["speed_multiplier"]
            seg_speeds = []
            for p in seg_path:
                speed_variation = random.uniform(-8, 8)
                seg_speeds.append(max(5, base_speed + speed_variation))

            if i == 0:
                full_path.extend(seg_path)
                speeds.extend(seg_speeds)
            else:
                full_path.extend(seg_path[1:])
                speeds.extend(seg_speeds[1:])

        timestamps = []
        current_time = 0.0
        min_len = min(len(full_path), len(speeds))
        for i in range(min_len):
            if i == 0:
                timestamps.append(current_time)
            else:
                dist = self._haversine_distance(full_path[i-1], full_path[i])
                speed = speeds[i] / 3.6
                if speed > 0:
                    current_time += dist / speed
                timestamps.append(current_time)

        actual_len = min(len(full_path), len(speeds), len(timestamps))
        full_path = full_path[:actual_len]
        speeds = speeds[:actual_len]
        timestamps = timestamps[:actual_len]

        return full_path, speeds, timestamps

    def _detect_empty_segments(self, path: List[Tuple[float, float]], speeds: List[float]) -> List[bool]:
        is_empty = []
        avg_speed = sum(speeds) / len(speeds) if speeds else 30
        speed_threshold = avg_speed * 0.7

        for i, speed in enumerate(speeds):
            window_start = max(0, i - 3)
            window_end = min(len(speeds), i + 4)
            window_speed = sum(speeds[window_start:window_end]) / (window_end - window_start)

            if window_speed > speed_threshold:
                is_empty.append(True)
            else:
                is_empty.append(False)

        return is_empty

    def _get_area_type(self, area_name: str) -> str:
        if "airport" in area_name:
            return "airport"
        if "station" in area_name or "south" in area_name or "west" in area_name:
            return "station"
        if "cbd" in area_name:
            return "cbd"
        return "normal"

    def _generate_radial_empty_path(self, center: Tuple[float, float],
                                      radius: float, direction: float) -> List[Tuple[float, float]]:
        path = []
        num_points = random.randint(8, 20)
        for i in range(num_points):
            t = i / (num_points - 1)
            r = radius * t
            angle = direction + random.uniform(-0.15, 0.15)
            lng = center[0] + r * math.cos(angle) * 0.85
            lat = center[1] + r * math.sin(angle) * 0.85
            lng += random.uniform(-0.002, 0.002) * (1 - t)
            lat += random.uniform(-0.002, 0.002) * (1 - t)
            path.append((round(lng, 6), round(lat, 6)))
        return path

    def _generate_airport_wander_path(self, center: Tuple[float, float],
                                       radius: float) -> List[Tuple[float, float]]:
        path = []
        num_points = random.randint(15, 30)
        angle_start = random.uniform(0, 2 * math.pi)
        angle_range = random.uniform(math.pi * 0.8, math.pi * 1.5)

        for i in range(num_points):
            t = i / (num_points - 1)
            angle = angle_start + angle_range * t
            r = radius * (0.4 + 0.6 * abs(math.sin(t * math.pi)))
            lng = center[0] + r * math.cos(angle) * 0.9
            lat = center[1] + r * math.sin(angle) * 0.9
            path.append((round(lng, 6), round(lat, 6)))
        return path

    def simulate_single_vehicle(self, start_area: str, end_area: Optional[str] = None,
                                 start_point_hint: Optional[Tuple[float, float]] = None) -> VehicleTrajectory:
        self._vehicle_counter += 1
        vehicle_id = f"veh_{self._vehicle_counter:06d}"

        areas = list(BEIJING_KEY_AREAS.keys())
        if start_area not in BEIJING_KEY_AREAS:
            start_area = random.choice(areas)
        if end_area is None:
            end_area = random.choice([a for a in areas if a != start_area])

        start_info = BEIJING_KEY_AREAS[start_area]
        end_info = BEIJING_KEY_AREAS[end_area]

        start_center = start_info["center"]
        end_center = end_info["center"]

        start_type = self._get_area_type(start_area)
        end_type = self._get_area_type(end_area)

        start_radius = start_info["radius"] * 0.6
        end_radius = end_info["radius"] * 0.6

        if start_point_hint:
            start_point = start_point_hint
        else:
            start_point = (
                start_center[0] + random.uniform(-start_radius, start_radius),
                start_center[1] + random.uniform(-start_radius, start_radius),
            )
        end_point = (
            end_center[0] + random.uniform(-end_radius, end_radius),
            end_center[1] + random.uniform(-end_radius, end_radius),
        )

        empty_before_prob = self._params["empty_before_base"]
        empty_after_prob = self._params["empty_after_base"]

        time_airport_boost = self._time_params["airport_station_empty_boost"]
        if start_type in ["airport", "station"]:
            empty_before_prob = min(0.97, empty_before_prob + 0.15 + time_airport_boost)
        if end_type in ["airport", "station"]:
            empty_after_prob = min(0.95, empty_after_prob + 0.15 + time_airport_boost)

        empty_before = random.random() < empty_before_prob
        empty_after = random.random() < empty_after_prob

        full_path = []
        full_speeds = []
        full_timestamps = []
        is_empty_flags = []

        if empty_before:
            if start_type in ["airport", "station"]:
                wander_radius = start_info["radius"] * random.uniform(0.8, 1.5)
                wander_path_points = self._generate_airport_wander_path(
                    start_center, wander_radius
                )
                wander_path = wander_path_points
                wander_speed_base = random.uniform(25, 50)
                wander_speed_base *= self._params["speed_multiplier"]
                wander_speed_base *= self._time_params["speed_multiplier"]
                wander_speeds = [max(5, wander_speed_base + random.uniform(-5, 5)) for _ in wander_path]
                wander_ts = []
                current_ts = 0.0
                for i in range(len(wander_path)):
                    if i == 0:
                        wander_ts.append(current_ts)
                    else:
                        dist = self._haversine_distance(wander_path[i-1], wander_path[i])
                        speed = wander_speeds[i] / 3.6
                        if speed > 0:
                            current_ts += dist / speed
                        wander_ts.append(current_ts)

                approach_path, approach_speeds, approach_ts = self._generate_ride_path(
                    wander_path[-1],
                    start_point,
                    is_empty=True
                )
                if wander_ts:
                    last_ts = wander_ts[-1]
                    approach_ts = [t + last_ts + random.uniform(10, 60) for t in approach_ts]

                full_path.extend(wander_path)
                full_speeds.extend(wander_speeds)
                full_timestamps.extend(wander_ts)
                is_empty_flags.extend([True] * len(wander_path))

                if approach_path and len(approach_path) > 1:
                    full_path.extend(approach_path[1:])
                    full_speeds.extend(approach_speeds[1:])
                    full_timestamps.extend(approach_ts[1:])
                    is_empty_flags.extend([True] * (len(approach_path) - 1))
            else:
                wander_center = (
                    start_center[0] + random.uniform(-start_info["radius"], start_info["radius"]),
                    start_center[1] + random.uniform(-start_info["radius"], start_info["radius"]),
                )
                wander_path, wander_speeds, wander_ts = self._generate_ride_path(
                    (wander_center[0] + random.uniform(-0.01, 0.01),
                     wander_center[1] + random.uniform(-0.008, 0.008)),
                    start_point,
                    is_empty=True
                )
                full_path.extend(wander_path)
                full_speeds.extend(wander_speeds)
                full_timestamps.extend(wander_ts)
                is_empty_flags.extend([True] * len(wander_path))

        if start_type == "cbd" and end_type != "cbd":
            direction = math.atan2(end_point[1] - start_center[1], end_point[0] - start_center[0])
            radial_intensity = self._time_params["cbd_radial_intensity"]
            radial_dist = start_info["radius"] * random.uniform(0.3, 0.8) * radial_intensity
            mid_lng = start_center[0] + radial_dist * math.cos(direction)
            mid_lat = start_center[1] + radial_dist * math.sin(direction)
            ride_path, ride_speeds, ride_ts = self._generate_ride_path(
                (mid_lng, mid_lat), end_point, is_empty=False
            )
            start_to_mid = self._generate_radial_empty_path(start_center, radial_dist, direction)
            start_mid_speed_base = random.uniform(20, 45)
            start_mid_speed_base *= self._params["speed_multiplier"]
            start_mid_speed_base *= self._time_params["speed_multiplier"]
            start_to_mid_speeds = [max(5, start_mid_speed_base + random.uniform(-5, 5)) for _ in start_to_mid]
            start_to_mid_ts = []
            current_ts = 0.0
            for i in range(len(start_to_mid)):
                if i == 0:
                    start_to_mid_ts.append(current_ts)
                else:
                    dist = self._haversine_distance(start_to_mid[i-1], start_to_mid[i])
                    speed = start_to_mid_speeds[i] / 3.6
                    if speed > 0:
                        current_ts += dist / speed
                    start_to_mid_ts.append(current_ts)

            if full_timestamps:
                last_ts = full_timestamps[-1]
                start_to_mid_ts = [t + last_ts + random.uniform(20, 90) for t in start_to_mid_ts]

            if start_to_mid and len(start_to_mid) > 1:
                if full_path:
                    full_path.extend(start_to_mid[1:])
                    full_speeds.extend(start_to_mid_speeds[1:])
                    full_timestamps.extend(start_to_mid_ts[1:])
                    is_empty_flags.extend([True] * (len(start_to_mid) - 1))
                else:
                    full_path.extend(start_to_mid)
                    full_speeds.extend(start_to_mid_speeds)
                    full_timestamps.extend(start_to_mid_ts)
                    is_empty_flags.extend([True] * len(start_to_mid))

            if full_timestamps:
                last_ts = full_timestamps[-1]
                ride_ts = [t + last_ts + random.uniform(30, 120) for t in ride_ts]

            full_path.extend(ride_path[1:] if full_path else ride_path)
            full_speeds.extend(ride_speeds[1:] if full_path else ride_speeds)
            full_timestamps.extend(ride_ts[1:] if full_path else ride_ts)
            is_empty_flags.extend([False] * (len(ride_path) - (1 if full_path else 0)))
        else:
            ride_path, ride_speeds, ride_ts = self._generate_ride_path(
                start_point, end_point, is_empty=False
            )

            if full_timestamps:
                last_ts = full_timestamps[-1]
                ride_ts = [t + last_ts + random.uniform(30, 120) for t in ride_ts]

            full_path.extend(ride_path[1:] if full_path else ride_path)
            full_speeds.extend(ride_speeds[1:] if full_path else ride_speeds)
            full_timestamps.extend(ride_ts[1:] if full_path else ride_ts)
            is_empty_flags.extend([False] * (len(ride_path) - (1 if full_path else 0)))

        if empty_after:
            if end_type in ["airport", "station"]:
                wander_radius = end_info["radius"] * random.uniform(0.8, 1.8)
                wander_path_points = self._generate_airport_wander_path(
                    end_center, wander_radius
                )
                approach_path, approach_speeds, approach_ts = self._generate_ride_path(
                    end_point,
                    wander_path_points[0],
                    is_empty=True
                )
                end_wander_speed_base = random.uniform(25, 50)
                end_wander_speed_base *= self._params["speed_multiplier"]
                end_wander_speed_base *= self._time_params["speed_multiplier"]
                wander_speeds = [max(5, end_wander_speed_base + random.uniform(-5, 5)) for _ in wander_path_points]
                wander_ts = []
                current_ts = 0.0
                for i in range(len(wander_path_points)):
                    if i == 0:
                        wander_ts.append(current_ts)
                    else:
                        dist = self._haversine_distance(wander_path_points[i-1], wander_path_points[i])
                        speed = wander_speeds[i] / 3.6
                        if speed > 0:
                            current_ts += dist / speed
                        wander_ts.append(current_ts)

                if full_timestamps:
                    last_ts = full_timestamps[-1]
                    approach_ts = [t + last_ts + random.uniform(60, 300) for t in approach_ts]
                    wander_ts = [t + approach_ts[-1] + random.uniform(10, 60) for t in wander_ts]

                if approach_path and len(approach_path) > 1:
                    full_path.extend(approach_path[1:])
                    full_speeds.extend(approach_speeds[1:])
                    full_timestamps.extend(approach_ts[1:])
                    is_empty_flags.extend([True] * (len(approach_path) - 1))

                if wander_path_points and len(wander_path_points) > 1:
                    full_path.extend(wander_path_points[1:])
                    full_speeds.extend(wander_speeds[1:])
                    full_timestamps.extend(wander_ts[1:])
                    is_empty_flags.extend([True] * (len(wander_path_points) - 1))
            elif end_type == "cbd":
                direction = random.uniform(0, 2 * math.pi)
                radial_intensity = self._time_params["cbd_radial_intensity"]
                radial_dist = end_info["radius"] * random.uniform(1.0, 2.0) * radial_intensity
                radial_path = self._generate_radial_empty_path(end_center, radial_dist, direction)
                end_radial_speed_base = random.uniform(30, 55)
                end_radial_speed_base *= self._params["speed_multiplier"]
                end_radial_speed_base *= self._time_params["speed_multiplier"]
                radial_speeds = [max(5, end_radial_speed_base + random.uniform(-5, 5)) for _ in radial_path]
                radial_ts = []
                current_ts = 0.0
                for i in range(len(radial_path)):
                    if i == 0:
                        radial_ts.append(current_ts)
                    else:
                        dist = self._haversine_distance(radial_path[i-1], radial_path[i])
                        speed = radial_speeds[i] / 3.6
                        if speed > 0:
                            current_ts += dist / speed
                        radial_ts.append(current_ts)

                if full_timestamps:
                    last_ts = full_timestamps[-1]
                    radial_ts = [t + last_ts + random.uniform(60, 300) for t in radial_ts]

                if radial_path and len(radial_path) > 1:
                    full_path.extend(radial_path[1:])
                    full_speeds.extend(radial_speeds[1:])
                    full_timestamps.extend(radial_ts[1:])
                    is_empty_flags.extend([True] * (len(radial_path) - 1))
            else:
                wander2_center = (
                    end_center[0] + random.uniform(-end_info["radius"] * 1.5, end_info["radius"] * 1.5),
                    end_center[1] + random.uniform(-end_info["radius"] * 1.2, end_info["radius"] * 1.2),
                )
                wander2_path, wander2_speeds, wander2_ts = self._generate_ride_path(
                    end_point,
                    wander2_center,
                    is_empty=True
                )
                if full_timestamps:
                    last_ts = full_timestamps[-1]
                    wander2_ts = [t + last_ts + random.uniform(60, 300) for t in wander2_ts]

                full_path.extend(wander2_path[1:])
                full_speeds.extend(wander2_speeds[1:])
                full_timestamps.extend(wander2_ts[1:])
                is_empty_flags.extend([True] * (len(wander2_path) - 1))

        min_len = min(len(full_path), len(full_speeds), len(full_timestamps), len(is_empty_flags))
        full_path = full_path[:min_len]
        full_speeds = full_speeds[:min_len]
        full_timestamps = full_timestamps[:min_len]
        is_empty_flags = is_empty_flags[:min_len]

        total_dist = self._path_length(full_path)
        empty_dist = 0.0
        for i in range(len(full_path) - 1):
            if is_empty_flags[i] and is_empty_flags[i+1]:
                empty_dist += self._haversine_distance(full_path[i], full_path[i+1])

        return VehicleTrajectory(
            vehicle_id=vehicle_id,
            path=full_path,
            timestamps=full_timestamps,
            speeds=full_speeds,
            is_empty_segments=is_empty_flags,
            total_distance=total_dist,
            empty_distance=empty_dist,
            pickup_point=start_point,
            dropoff_point=end_point,
        )

    def _get_weighted_start_areas(self, focus_areas: Optional[List[str]] = None) -> List[str]:
        weighted = []
        time_density_mult = self._time_params["density_multiplier"]
        dir_bias = self._time_params["direction_bias"]

        for area_name, area_info in BEIJING_KEY_AREAS.items():
            density = area_info.get("density", 10)
            base_weight = max(1, int(density / 5))

            area_type = self._get_area_type(area_name)
            if dir_bias == "from_city":
                if area_type in ["cbd", "normal", "tech_park"]:
                    base_weight = int(base_weight * time_density_mult)
            elif dir_bias == "to_city":
                if area_type in ["airport", "station"]:
                    base_weight = int(base_weight * time_density_mult)
            else:
                base_weight = int(base_weight * time_density_mult)

            if focus_areas and area_name in focus_areas:
                base_weight *= 3
            weighted.extend([area_name] * base_weight)
        return weighted

    def _weighted_random_end_area(self, start_area: str) -> str:
        areas = list(BEIJING_KEY_AREAS.keys())
        weights = []
        dir_bias = self._time_params["direction_bias"]

        for area_name in areas:
            if area_name == start_area:
                weights.append(1)
                continue
            area_info = BEIJING_KEY_AREAS[area_name]
            density = area_info.get("density", 10)
            start_type = self._get_area_type(start_area)
            end_type = self._get_area_type(area_name)
            weight = density / 10

            if start_type == "cbd" and end_type in ["airport", "station"]:
                weight *= 1.5
            if start_type in ["airport", "station"] and end_type in ["cbd", "normal"]:
                weight *= 1.3

            if dir_bias == "from_city":
                if start_type in ["cbd", "normal", "tech_park"] and end_type in ["airport", "station"]:
                    weight *= 2.0
                if start_type in ["airport", "station"] and end_type in ["cbd", "normal"]:
                    weight *= 0.5
            elif dir_bias == "to_city":
                if start_type in ["airport", "station"] and end_type in ["cbd", "normal"]:
                    weight *= 2.0
                if start_type in ["cbd", "normal"] and end_type in ["airport", "station"]:
                    weight *= 0.5

            weights.append(weight)

        total_weight = sum(weights)
        r = random.uniform(0, total_weight)
        cumulative = 0
        for i, area_name in enumerate(areas):
            cumulative += weights[i]
            if r <= cumulative:
                return area_name
        return areas[-1]

    def simulate_batch(self, num_vehicles: int = 100, focus_areas: Optional[List[str]] = None) -> SimulationResult:
        trajectories = []
        total_dist = 0.0
        total_empty_dist = 0.0

        weighted_start_areas = self._get_weighted_start_areas(focus_areas)

        for i in range(num_vehicles):
            start_area = random.choice(weighted_start_areas)
            end_area = self._weighted_random_end_area(start_area)

            traj = self.simulate_single_vehicle(start_area, end_area)
            trajectories.append(traj)
            total_dist += traj.total_distance
            total_empty_dist += traj.empty_distance

        empty_ratio = total_empty_dist / total_dist if total_dist > 0 else 0

        key_area_stats = {}
        for area_name, area_info in BEIJING_KEY_AREAS.items():
            area_center = area_info["center"]
            area_radius = area_info["radius"] * 1.5
            area_traj_count = 0
            area_empty_dist = 0.0

            for traj in trajectories:
                has_point_in_area = False
                for lng, lat in traj.path:
                    dist = math.sqrt((lng - area_center[0])**2 + (lat - area_center[1])**2)
                    if dist < area_radius:
                        has_point_in_area = True
                        break
                if has_point_in_area:
                    area_traj_count += 1
                    area_empty_dist += traj.empty_distance

            key_area_stats[area_name] = {
                "vehicle_count": area_traj_count,
                "empty_distance": area_empty_dist,
                "density_score": area_traj_count / (area_info["radius"] ** 2) * 1e4,
            }

        return SimulationResult(
            trajectories=trajectories,
            total_vehicles=num_vehicles,
            total_distance=total_dist,
            total_empty_distance=total_empty_dist,
            empty_ratio=empty_ratio,
            key_area_stats=key_area_stats,
        )

    def _is_point_in_areas(self, lng: float, lat: float, area_names: List[str]) -> bool:
        for area_name in area_names:
            if area_name not in BEIJING_KEY_AREAS:
                continue
            area_info = BEIJING_KEY_AREAS[area_name]
            center = area_info["center"]
            radius = area_info["radius"] * 1.5
            dist = math.sqrt((lng - center[0])**2 + (lat - center[1])**2)
            if dist < radius:
                return True
        return False

    def _filter_segments_by_areas(self, segments: List[Dict], focus_areas: List[str]) -> List[Dict]:
        if not focus_areas:
            return segments
        filtered = []
        for seg in segments:
            has_point_in_area = False
            for lng, lat in seg["path"]:
                if self._is_point_in_areas(lng, lat, focus_areas):
                    has_point_in_area = True
                    break
            if has_point_in_area:
                filtered.append(seg)
        return filtered

    def get_trajectories_for_visualization(self, num_vehicles: int = 200,
                                            focus_areas: Optional[List[str]] = None,
                                            sim_result: Optional[SimulationResult] = None) -> Dict:
        if sim_result is None:
            result = self.simulate_batch(num_vehicles=num_vehicles, focus_areas=focus_areas)
        else:
            result = sim_result

        all_empty_segments = []
        all_occupied_segments = []
        density_data = []

        for traj in result.trajectories:
            empty_seg = []
            occupied_seg = []

            for i, (lng, lat) in enumerate(traj.path):
                if traj.is_empty_segments[i]:
                    if occupied_seg:
                        if len(occupied_seg) >= 2:
                            all_occupied_segments.append({
                                "vehicle_id": traj.vehicle_id,
                                "path": occupied_seg,
                            })
                        occupied_seg = []
                    empty_seg.append([lng, lat])
                else:
                    if empty_seg:
                        if len(empty_seg) >= 2:
                            all_empty_segments.append({
                                "vehicle_id": traj.vehicle_id,
                                "path": empty_seg,
                            })
                        empty_seg = []
                    occupied_seg.append([lng, lat])

            if empty_seg and len(empty_seg) >= 2:
                all_empty_segments.append({
                    "vehicle_id": traj.vehicle_id,
                    "path": empty_seg,
                })
            if occupied_seg and len(occupied_seg) >= 2:
                all_occupied_segments.append({
                    "vehicle_id": traj.vehicle_id,
                    "path": occupied_seg,
                })

        if focus_areas:
            all_empty_segments = self._filter_segments_by_areas(all_empty_segments, focus_areas)
            all_occupied_segments = self._filter_segments_by_areas(all_occupied_segments, focus_areas)

        grid_bounds = {
            "min_lng": 116.2,
            "max_lng": 116.7,
            "min_lat": 39.7,
            "max_lat": 40.15,
        }
        grid_size = 50
        lng_step = (grid_bounds["max_lng"] - grid_bounds["min_lng"]) / grid_size
        lat_step = (grid_bounds["max_lat"] - grid_bounds["min_lat"]) / grid_size

        density_grid = [[0 for _ in range(grid_size)] for _ in range(grid_size)]

        for seg in all_empty_segments:
            for lng, lat in seg["path"]:
                gi = int((lng - grid_bounds["min_lng"]) / lng_step)
                gj = int((lat - grid_bounds["min_lat"]) / lat_step)
                if 0 <= gi < grid_size and 0 <= gj < grid_size:
                    density_grid[gj][gi] += 1

        for i in range(grid_size):
            for j in range(grid_size):
                count = density_grid[i][j]
                if count > 0:
                    lng = grid_bounds["min_lng"] + j * lng_step + lng_step / 2
                    lat = grid_bounds["min_lat"] + i * lat_step + lat_step / 2
                    density_data.append({
                        "lng": lng,
                        "lat": lat,
                        "count": count,
                    })

        return {
            "empty_segments": all_empty_segments,
            "occupied_segments": all_occupied_segments,
            "density_heatmap": density_data,
            "summary": {
                "total_vehicles": result.total_vehicles,
                "total_distance_km": round(result.total_distance / 1000, 2),
                "empty_distance_km": round(result.total_empty_distance / 1000, 2),
                "empty_ratio": round(result.empty_ratio * 100, 2),
                "key_area_stats": result.key_area_stats,
                "vehicle_type": self.vehicle_type,
            }
        }


if __name__ == "__main__":
    sim = EmptyTripSimulator()
    viz_data = sim.get_trajectories_for_visualization(num_vehicles=50)
    print(f"Empty segments: {len(viz_data['empty_segments'])}")
    print(f"Occupied segments: {len(viz_data['occupied_segments'])}")
    print(f"Empty ratio: {viz_data['summary']['empty_ratio']}%")
    for area, stats in viz_data['summary']['key_area_stats'].items():
        print(f"  {area}: {stats['vehicle_count']} vehicles")
