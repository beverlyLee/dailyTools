import sys
sys.path.insert(0, '.')
from simulation.empty_trip_sim import EmptyTripSimulator
from metric.waste_calculator import WasteCalculator
from traffic.road_status_spider import BEIJING_KEY_AREAS
import math

results = {}
pass_count = 0
total_count = 0

def test(name, condition, detail=""):
    global pass_count, total_count
    total_count += 1
    status = "✅" if condition else "❌"
    if condition:
        pass_count += 1
    print(f"{status} {name}: {detail}")
    return condition

print("=" * 60)
print("功能验证测试报告")
print("=" * 60)

# 1. 速度因子验证
print("\n--- 1. 速度因子验证 ---")
speed_results = {}
for mode in ["off_peak", "morning_peak", "evening_peak"]:
    sim = EmptyTripSimulator(vehicle_type="gasoline", time_mode=mode)
    result = sim.simulate_batch(num_vehicles=100)
    total_dist = sum(t.total_distance for t in result.trajectories)
    total_time = 0
    for t in result.trajectories:
        if t.speeds:
            avg_spd = sum(t.speeds) / len(t.speeds)
            if avg_spd > 0:
                total_time += t.total_distance / (avg_spd / 3.6)
    avg_speed = total_dist / total_time / 1000 * 3600 if total_time > 0 else 0
    speed_results[mode] = avg_speed

test("平峰速度 > 35 km/h", speed_results["off_peak"] > 35, f"{speed_results['off_peak']:.1f} km/h")
test("早高峰速度 ≈ 平峰 × 0.7", abs(speed_results["morning_peak"] / speed_results["off_peak"] - 0.7) < 0.08, 
     f"比值: {speed_results['morning_peak']/speed_results['off_peak']:.2f}")
test("晚高峰速度 ≈ 平峰 × 0.6", abs(speed_results["evening_peak"] / speed_results["off_peak"] - 0.6) < 0.08,
     f"比值: {speed_results['evening_peak']/speed_results['off_peak']:.2f}")

# 2. 车型碳排放验证
print("\n--- 2. 车型碳排放验证 ---")
carbon_results = {}
for vtype in ["gasoline", "hybrid", "electric"]:
    sim = EmptyTripSimulator(vehicle_type=vtype, time_mode="off_peak")
    result = sim.simulate_batch(num_vehicles=100)
    calc = WasteCalculator(vehicle_type=vtype)
    metrics = calc.calculate_from_trajectories(result.trajectories)
    carbon_results[vtype] = metrics.carbon_emission_total

test("碳排放排序：燃油 > 混动 > 电动", 
     carbon_results["gasoline"] > carbon_results["hybrid"] > carbon_results["electric"],
     f"燃油: {carbon_results['gasoline']:.1f}, 混动: {carbon_results['hybrid']:.1f}, 电动: {carbon_results['electric']:.1f}")

# 3. 轨迹数组长度一致性
print("\n--- 3. 轨迹数组长度一致性 ---")
sim = EmptyTripSimulator(vehicle_type="gasoline", time_mode="off_peak")
result = sim.simulate_batch(num_vehicles=100)
all_consistent = all(len(t.path) == len(t.speeds) for t in result.trajectories)
test("所有轨迹 path 与 speeds 长度一致", all_consistent, 
     f"100条轨迹全部一致" if all_consistent else "存在不一致")

# 4. focus_areas 过滤验证
print("\n--- 4. focus_areas 过滤验证 ---")
sim_cbd = EmptyTripSimulator(vehicle_type="gasoline", time_mode="off_peak")
result_cbd = sim_cbd.simulate_batch(num_vehicles=100, focus_areas=["cbd"])
sim_all = EmptyTripSimulator(vehicle_type="gasoline", time_mode="off_peak")
result_all = sim_all.simulate_batch(num_vehicles=100)

cbd_empty_ratio = result_cbd.empty_ratio
all_empty_ratio = result_all.empty_ratio
test("筛选CBD后空驶率有变化", cbd_empty_ratio != all_empty_ratio, 
     f"全量空驶率: {all_empty_ratio:.2%}, 仅CBD空驶率: {cbd_empty_ratio:.2%}")

# 5. 晚高峰CBD放射效果验证
print("\n--- 5. 晚高峰CBD放射效果验证 ---")
cbd_empty_dist = {}
for mode in ["off_peak", "evening_peak"]:
    sim = EmptyTripSimulator(vehicle_type="gasoline", time_mode=mode)
    result = sim.simulate_batch(num_vehicles=200)
    
    cbd_center = BEIJING_KEY_AREAS["cbd"]["center"]
    cbd_radius = BEIJING_KEY_AREAS["cbd"]["radius"] * 2
    total_empty_from_cbd = 0
    count_from_cbd = 0
    
    for t in result.trajectories:
        start = t.path[0]
        dist = math.sqrt((start[0] - cbd_center[0])**2 + (start[1] - cbd_center[1])**2)
        if dist < cbd_radius:
            total_empty_from_cbd += t.empty_distance
            count_from_cbd += 1
    
    cbd_empty_dist[mode] = {
        "count": count_from_cbd,
        "avg_empty": total_empty_from_cbd / count_from_cbd / 1000 if count_from_cbd > 0 else 0
    }

test("晚高峰CBD出发空驶距离 > 平峰", 
     cbd_empty_dist["evening_peak"]["avg_empty"] > cbd_empty_dist["off_peak"]["avg_empty"],
     f"平峰: {cbd_empty_dist['off_peak']['avg_empty']:.1f} km, 晚高峰: {cbd_empty_dist['evening_peak']['avg_empty']:.1f} km")

# 6. 机场高密度验证
print("\n--- 6. 机场/车站高密度验证 ---")
airport_traffic = {}
for mode in ["off_peak", "morning_peak"]:
    sim = EmptyTripSimulator(vehicle_type="gasoline", time_mode=mode)
    result = sim.simulate_batch(num_vehicles=200)
    
    airport_count = 0
    airport_center = BEIJING_KEY_AREAS["capital_airport"]["center"]
    airport_radius = BEIJING_KEY_AREAS["capital_airport"]["radius"] * 1.5
    
    for t in result.trajectories:
        for lng, lat in t.path[:3]:
            dist = math.sqrt((lng - airport_center[0])**2 + (lat - airport_center[1])**2)
            if dist < airport_radius:
                airport_count += 1
                break
    
    airport_traffic[mode] = airport_count

test("早高峰机场车辆数 > 平峰", 
     airport_traffic["morning_peak"] > airport_traffic["off_peak"],
     f"平峰: {airport_traffic['off_peak']}辆, 早高峰: {airport_traffic['morning_peak']}辆")

# 7. 无报错验证（启动无ImportError、运行无IndexError）
print("\n--- 7. 无报错验证 ---")
try:
    sim = EmptyTripSimulator(vehicle_type="gasoline", time_mode="evening_peak")
    result = sim.simulate_batch(num_vehicles=200)
    calc = WasteCalculator(vehicle_type="gasoline")
    metrics = calc.calculate_from_trajectories(result.trajectories)
    test("完整流程无异常", True, "200辆车模拟+计算全部成功")
except Exception as e:
    test("完整流程无异常", False, str(e))

print("\n" + "=" * 60)
print(f"测试结果: {pass_count}/{total_count} 通过")
print("=" * 60)
