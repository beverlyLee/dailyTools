import sys
sys.path.insert(0, 'src')
from simulation.empty_trip_sim import EmptyTripSimulator
import math

print("=== 速度因子验证 ===")
results = {}
for mode in ["off_peak", "morning_peak", "evening_peak"]:
    sim = EmptyTripSimulator(vehicle_type="gasoline", time_mode=mode)
    result = sim.simulate_batch(num_vehicles=50)
    
    total_dist = sum(t.total_distance for t in result.trajectories)
    
    total_time_h = 0.0
    for t in result.trajectories:
        if t.speeds:
            avg_speed = sum(t.speeds) / len(t.speeds)
            if avg_speed > 0:
                total_time_h += (t.total_distance / 1000) / avg_speed
    
    avg_speed_kmh = (total_dist / 1000) / total_time_h if total_time_h > 0 else 0
    
    results[mode] = {
        "avg_speed_kmh": round(avg_speed_kmh, 1),
        "total_dist_km": round(total_dist/1000, 1),
        "empty_ratio": round(sum(t.empty_distance for t in result.trajectories) / total_dist * 100, 1)
    }
    label = sim._time_params["label"]
    print(f"[{label}]")
    print(f"  平均速度: {results[mode]['avg_speed_kmh']} km/h")
    print(f"  总里程: {results[mode]['total_dist_km']} km")
    print(f"  空驶率: {results[mode]['empty_ratio']}%")
    print()

print("=== 速度比值 ===")
morning_ratio = round(results['morning_peak']['avg_speed_kmh'] / results['off_peak']['avg_speed_kmh'], 2)
evening_ratio = round(results['evening_peak']['avg_speed_kmh'] / results['off_peak']['avg_speed_kmh'], 2)
print(f"早高峰/平峰: {morning_ratio} (预期≈0.7) {'✓ 符合' if 0.65 <= morning_ratio <= 0.75 else '✗ 不符合'}")
print(f"晚高峰/平峰: {evening_ratio} (预期≈0.6) {'✓ 符合' if 0.55 <= evening_ratio <= 0.65 else '✗ 不符合'}")

print("\n=== 总里程比值 ===")
morning_dist_ratio = round(results['morning_peak']['total_dist_km'] / results['off_peak']['total_dist_km'], 2)
evening_dist_ratio = round(results['evening_peak']['total_dist_km'] / results['off_peak']['total_dist_km'], 2)
print(f"早高峰/平峰: {morning_dist_ratio}")
print(f"晚高峰/平峰: {evening_dist_ratio}")
print(f"早高峰里程 < 平峰里程: {'✓ 是' if results['morning_peak']['total_dist_km'] < results['off_peak']['total_dist_km'] else '✗ 否'}")
print(f"晚高峰里程 < 平峰里程: {'✓ 是' if results['evening_peak']['total_dist_km'] < results['off_peak']['total_dist_km'] else '✗ 否'}")
print(f"晚高峰里程 < 早高峰里程: {'✓ 是' if results['evening_peak']['total_dist_km'] < results['morning_peak']['total_dist_km'] else '✗ 否'}")

print("\n=== 速度因子配置（代码定义） ===")
for mode in ["off_peak", "morning_peak", "evening_peak"]:
    from simulation.empty_trip_sim import TIME_MODE_PARAMS
    p = TIME_MODE_PARAMS[mode]
    print(f"{mode}: speed_multiplier={p['speed_multiplier']}, density_multiplier={p['density_multiplier']}")
