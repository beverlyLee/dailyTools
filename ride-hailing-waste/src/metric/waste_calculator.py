import math
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field

_src_dir = Path(__file__).parent.parent
if str(_src_dir) not in sys.path:
    sys.path.insert(0, str(_src_dir))

from simulation.empty_trip_sim import VehicleTrajectory, SimulationResult


FUEL_CONSUMPTION = {
    "gasoline": 8.5,
    "hybrid": 5.2,
    "electric": 15.0,
}

CARBON_FACTOR = {
    "gasoline": 2.31,
    "hybrid": 2.31,
    "electric": 0.5,
}

AVG_FUEL_PRICE = {
    "gasoline": 7.8,
    "hybrid": 7.8,
    "electric": 1.2,
}


@dataclass
class WasteMetrics:
    total_distance_km: float
    empty_distance_km: float
    occupied_distance_km: float
    empty_ratio: float
    carbon_emission_total: float
    carbon_emission_empty: float
    carbon_emission_occupied: float
    fuel_cost_total: float
    fuel_cost_empty: float
    fuel_cost_occupied: float
    vehicle_count: int
    vehicle_type: str
    area_breakdown: Dict[str, Dict] = field(default_factory=dict)


class WasteCalculator:
    def __init__(self, vehicle_type: str = "gasoline"):
        self.vehicle_type = vehicle_type
        self.fuel_consumption = FUEL_CONSUMPTION.get(vehicle_type, 8.5)
        self.carbon_factor = CARBON_FACTOR.get(vehicle_type, 2.31)
        self.fuel_price = AVG_FUEL_PRICE.get(vehicle_type, 7.8)

    def calculate_from_trajectories(self, trajectories: List[VehicleTrajectory]) -> WasteMetrics:
        total_dist = 0.0
        empty_dist = 0.0

        for traj in trajectories:
            total_dist += traj.total_distance
            empty_dist += traj.empty_distance

        total_dist_km = total_dist / 1000
        empty_dist_km = empty_dist / 1000
        occupied_dist_km = total_dist_km - empty_dist_km

        empty_ratio = empty_dist_km / total_dist_km if total_dist_km > 0 else 0

        carbon_total = self._calc_carbon(total_dist_km)
        carbon_empty = self._calc_carbon(empty_dist_km)
        carbon_occupied = self._calc_carbon(occupied_dist_km)

        cost_total = self._calc_fuel_cost(total_dist_km)
        cost_empty = self._calc_fuel_cost(empty_dist_km)
        cost_occupied = self._calc_fuel_cost(occupied_dist_km)

        return WasteMetrics(
            total_distance_km=round(total_dist_km, 2),
            empty_distance_km=round(empty_dist_km, 2),
            occupied_distance_km=round(occupied_dist_km, 2),
            empty_ratio=round(empty_ratio * 100, 2),
            carbon_emission_total=round(carbon_total, 2),
            carbon_emission_empty=round(carbon_empty, 2),
            carbon_emission_occupied=round(carbon_occupied, 2),
            fuel_cost_total=round(cost_total, 2),
            fuel_cost_empty=round(cost_empty, 2),
            fuel_cost_occupied=round(cost_occupied, 2),
            vehicle_count=len(trajectories),
            vehicle_type=self.vehicle_type,
        )

    def calculate_from_simulation(self, sim_result: SimulationResult) -> WasteMetrics:
        return self.calculate_from_trajectories(sim_result.trajectories)

    def _calc_carbon(self, distance_km: float) -> float:
        if self.vehicle_type == "electric":
            kwh = (distance_km / 100) * self.fuel_consumption
            return kwh * self.carbon_factor
        else:
            fuel_liters = (distance_km / 100) * self.fuel_consumption
            return fuel_liters * self.carbon_factor

    def _calc_fuel_cost(self, distance_km: float) -> float:
        if self.vehicle_type == "electric":
            kwh = (distance_km / 100) * self.fuel_consumption
            return kwh * self.fuel_price
        else:
            fuel_liters = (distance_km / 100) * self.fuel_consumption
            return fuel_liters * self.fuel_price

    def calculate_area_breakdown(self, trajectories: List[VehicleTrajectory],
                                  areas: Dict[str, Dict]) -> Dict[str, Dict]:
        area_stats = {}

        for area_name, area_info in areas.items():
            area_center = area_info["center"]
            area_radius = area_info.get("radius", 0.05) * 1.5

            area_empty_dist = 0.0
            area_total_dist = 0.0
            area_vehicle_count = 0

            for traj in trajectories:
                has_point_in_area = False
                traj_empty_in_area = 0.0
                traj_total_in_area = 0.0

                for i in range(len(traj.path)):
                    lng, lat = traj.path[i]
                    dist = math.sqrt((lng - area_center[0])**2 + (lat - area_center[1])**2)
                    if dist < area_radius:
                        has_point_in_area = True
                        if i > 0:
                            prev_lng, prev_lat = traj.path[i-1]
                            prev_dist = math.sqrt((prev_lng - area_center[0])**2 + (prev_lat - area_center[1])**2)
                            if prev_dist < area_radius:
                                seg_dist = self._haversine(traj.path[i-1], traj.path[i])
                                traj_total_in_area += seg_dist
                                if traj.is_empty_segments[i]:
                                    traj_empty_in_area += seg_dist

                if has_point_in_area:
                    area_vehicle_count += 1
                    area_empty_dist += traj_empty_in_area
                    area_total_dist += traj_total_in_area

            area_empty_km = area_empty_dist / 1000
            area_total_km = area_total_dist / 1000
            area_ratio = (area_empty_km / area_total_km * 100) if area_total_km > 0 else 0
            area_carbon = self._calc_carbon(area_empty_km)
            area_cost = self._calc_fuel_cost(area_empty_km)

            area_stats[area_name] = {
                "vehicle_count": area_vehicle_count,
                "total_distance_km": round(area_total_km, 2),
                "empty_distance_km": round(area_empty_km, 2),
                "empty_ratio": round(area_ratio, 2),
                "wasted_carbon_kg": round(area_carbon, 2),
                "wasted_cost_yuan": round(area_cost, 2),
                "density_score": round(area_vehicle_count / (area_info.get("radius", 0.05) ** 2) * 1e4, 2),
            }

        return area_stats

    def _haversine(self, p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
        R = 6371000
        lat1, lat2 = math.radians(p1[1]), math.radians(p2[1])
        dlat = math.radians(p2[1] - p1[1])
        dlng = math.radians(p2[0] - p1[0])
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    def get_comparison_metrics(self, sim_result: SimulationResult) -> Dict:
        metrics_gas = WasteCalculator("gasoline").calculate_from_simulation(sim_result)
        metrics_hybrid = WasteCalculator("hybrid").calculate_from_simulation(sim_result)
        metrics_ev = WasteCalculator("electric").calculate_from_simulation(sim_result)

        return {
            "gasoline": {
                "empty_carbon_kg": metrics_gas.carbon_emission_empty,
                "empty_cost_yuan": metrics_gas.fuel_cost_empty,
                "empty_ratio": metrics_gas.empty_ratio,
            },
            "hybrid": {
                "empty_carbon_kg": metrics_hybrid.carbon_emission_empty,
                "empty_cost_yuan": metrics_hybrid.fuel_cost_empty,
                "empty_ratio": metrics_hybrid.empty_ratio,
            },
            "electric": {
                "empty_carbon_kg": metrics_ev.carbon_emission_empty,
                "empty_cost_yuan": metrics_ev.fuel_cost_empty,
                "empty_ratio": metrics_ev.empty_ratio,
            },
            "savings_gas_to_ev": {
                "carbon_saved_kg": round(metrics_gas.carbon_emission_empty - metrics_ev.carbon_emission_empty, 2),
                "cost_saved_yuan": round(metrics_gas.fuel_cost_empty - metrics_ev.fuel_cost_empty, 2),
            },
            "savings_gas_to_hybrid": {
                "carbon_saved_kg": round(metrics_gas.carbon_emission_empty - metrics_hybrid.carbon_emission_empty, 2),
                "cost_saved_yuan": round(metrics_gas.fuel_cost_empty - metrics_hybrid.fuel_cost_empty, 2),
            },
        }

    def to_dict(self, metrics: WasteMetrics) -> Dict:
        return {
            "vehicle_count": metrics.vehicle_count,
            "vehicle_type": metrics.vehicle_type,
            "total_distance_km": metrics.total_distance_km,
            "empty_distance_km": metrics.empty_distance_km,
            "occupied_distance_km": metrics.occupied_distance_km,
            "empty_ratio_percent": metrics.empty_ratio,
            "carbon_emission": {
                "total_kg": metrics.carbon_emission_total,
                "empty_kg": metrics.carbon_emission_empty,
                "occupied_kg": metrics.carbon_emission_occupied,
            },
            "fuel_cost": {
                "total_yuan": metrics.fuel_cost_total,
                "empty_yuan": metrics.fuel_cost_empty,
                "occupied_yuan": metrics.fuel_cost_occupied,
            },
            "area_breakdown": metrics.area_breakdown,
        }


if __name__ == "__main__":
    from ..simulation.empty_trip_sim import EmptyTripSimulator

    sim = EmptyTripSimulator()
    result = sim.simulate_batch(num_vehicles=100)

    calc = WasteCalculator("gasoline")
    metrics = calc.calculate_from_simulation(result)

    print(f"Vehicle type: {metrics.vehicle_type}")
    print(f"Total distance: {metrics.total_distance_km} km")
    print(f"Empty distance: {metrics.empty_distance_km} km")
    print(f"Empty ratio: {metrics.empty_ratio}%")
    print(f"Carbon (empty): {metrics.carbon_emission_empty} kg")
    print(f"Cost (empty): ¥{metrics.fuel_cost_empty}")

    comparison = calc.get_comparison_metrics(result)
    print("\nComparison:")
    for vtype, data in comparison.items():
        if vtype.startswith("savings"):
            print(f"  {vtype}:")
            print(f"    Carbon saved: {data['carbon_saved_kg']} kg")
            print(f"    Cost saved: ¥{data['cost_saved_yuan']}")
