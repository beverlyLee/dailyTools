import random
import math
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field

from ..traffic.road_status_spider import RoadStatusSpider, BEIJING_KEY_AREAS


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


class EmptyTripSimulator:
    def __init__(self, spider: Optional[RoadStatusSpider] = None):
        self.spider = spider or RoadStatusSpider()
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
            seg_points = max(3, num_points // len(waypoints))
            seg_path = self._interpolate_path(seg_start, seg_end, seg_points, jitter * 0.5)

            base_speed = random.uniform(25, 55) if is_empty else random.uniform(15, 40)
            for p in seg_path:
                speed_variation = random.uniform(-8, 8)
                speeds.append(max(5, base_speed + speed_variation))

            if i == 0:
                full_path.extend(seg_path)
            else:
                full_path.extend(seg_path[1:])

        timestamps = []
        current_time = 0.0
        for i in range(len(full_path)):
            if i == 0:
                timestamps.append(current_time)
            else:
                dist = self._haversine_distance(full_path[i-1], full_path[i])
                speed = speeds[i] / 3.6
                if speed > 0:
                    current_time += dist / speed
                timestamps.append(current_time)

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

    def simulate_single_vehicle(self, start_area: str, end_area: Optional[str] = None) -> VehicleTrajectory:
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

        start_radius = start_info["radius"] * 0.6
        end_radius = end_info["radius"] * 0.6

        start_point = (
            start_center[0] + random.uniform(-start_radius, start_radius),
            start_center[1] + random.uniform(-start_radius, start_radius),
        )
        end_point = (
            end_center[0] + random.uniform(-end_radius, end_radius),
            end_center[1] + random.uniform(-end_radius, end_radius),
        )

        empty_before = random.random() < 0.7
        empty_after = random.random() < 0.6

        full_path = []
        full_speeds = []
        full_timestamps = []
        is_empty_flags = []

        if empty_before:
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

    def simulate_batch(self, num_vehicles: int = 100, focus_areas: Optional[List[str]] = None) -> SimulationResult:
        trajectories = []
        total_dist = 0.0
        total_empty_dist = 0.0

        areas = list(BEIJING_KEY_AREAS.keys())
        if focus_areas:
            weighted_areas = focus_areas * 3 + [a for a in areas if a not in focus_areas]
        else:
            weighted_areas = areas

        for i in range(num_vehicles):
            start_area = random.choice(weighted_areas)
            end_area = random.choice(areas)

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

    def get_trajectories_for_visualization(self, num_vehicles: int = 200) -> Dict:
        result = self.simulate_batch(num_vehicles=num_vehicles)

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
