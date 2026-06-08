import sys
sys.path.insert(0, 'src')
from simulation.empty_trip_sim import EmptyTripSimulator, TIME_MODE_PARAMS
from traffic.road_status_spider import BEIJING_KEY_AREAS
import math
import random

random.seed(42)

print('=== 1. TIME_MODE_PARAMS 完整配置 ===')
for mode, params in TIME_MODE_PARAMS.items():
    print(f'{mode}:')
    for k, v in params.items():
        print(f'  {k}: {v}')

print('\n=== 2. 三种模式模拟对比 (200辆车, 燃油车, 固定种子) ===')
results = {}
for mode in ['off_peak', 'morning_peak', 'evening_peak']:
    random.seed(42)
    sim = EmptyTripSimulator(vehicle_type='gasoline', time_mode=mode)
    result = sim.simulate_batch(num_vehicles=200)
    total_dist = sum(t.total_distance for t in result.trajectories)
    empty_dist = sum(t.empty_distance for t in result.trajectories)
    empty_ratio = empty_dist / total_dist * 100 if total_dist > 0 else 0
    results[mode] = {
        'total_dist': total_dist,
        'empty_dist': empty_dist,
        'empty_ratio': empty_ratio,
        'result': result
    }
    print(f'\n--- {mode} ---')
    print(f'  总里程: {total_dist/1000:.1f} km')
    print(f'  空驶里程: {empty_dist/1000:.1f} km')
    print(f'  空驶率: {empty_ratio:.1f}%')

print('\n=== 3. 密度差异验证 (相对平峰) ===')
off_peak_total = results['off_peak']['total_dist']
for mode in ['morning_peak', 'evening_peak']:
    ratio = results[mode]['total_dist'] / off_peak_total
    print(f'  {mode}: 总里程是平峰的 {ratio:.2f} 倍 (预期密度倍率: {TIME_MODE_PARAMS[mode]["density_multiplier"]})')

print('\n=== 4. 起始区域分布 (方向偏置验证) ===')
for mode in ['off_peak', 'morning_peak', 'evening_peak']:
    result = results[mode]['result']
    start_area_counts = {}
    cbd_start_count = 0
    airport_station_start_count = 0
    
    for traj in result.trajectories:
        start_point = traj.path[0]
        matched_area = None
        for area_name, area_info in BEIJING_KEY_AREAS.items():
            center = area_info['center']
            radius = area_info['radius'] * 1.5
            dist = math.sqrt((start_point[0] - center[0])**2 + (start_point[1] - center[1])**2)
            if dist < radius:
                matched_area = area_name
                break
        if matched_area:
            start_area_counts[matched_area] = start_area_counts.get(matched_area, 0) + 1
            if 'cbd' == matched_area:
                cbd_start_count += 1
            if 'airport' in matched_area or 'station' in matched_area or 'south' in matched_area or 'west' in matched_area:
                airport_station_start_count += 1
    
    print(f'\n--- {mode} ---')
    print(f'  CBD出发: {cbd_start_count} 辆')
    print(f'  机场/车站出发: {airport_station_start_count} 辆')
    print(f'  Top5 起始区域: {sorted(start_area_counts.items(), key=lambda x: -x[1])[:5]}')

print('\n=== 5. CBD放射效果验证 (从CBD出发的空驶距离) ===')
for mode in ['off_peak', 'morning_peak', 'evening_peak']:
    result = results[mode]['result']
    cbd_center = BEIJING_KEY_AREAS['cbd']['center']
    cbd_radius = BEIJING_KEY_AREAS['cbd']['radius']
    
    cbd_traj_count = 0
    cbd_empty_dist = 0
    max_radial_dist = 0
    
    for traj in result.trajectories:
        start = traj.path[0]
        dist_from_cbd = math.sqrt((start[0] - cbd_center[0])**2 + (start[1] - cbd_center[1])**2)
        if dist_from_cbd < cbd_radius * 2:
            cbd_traj_count += 1
            cbd_empty_dist += traj.empty_distance
            
            for lng, lat in traj.path:
                d = math.sqrt((lng - cbd_center[0])**2 + (lat - cbd_center[1])**2)
                if d > max_radial_dist:
                    max_radial_dist = d
    
    print(f'\n--- {mode} ---')
    print(f'  从CBD附近出发的轨迹数: {cbd_traj_count}')
    print(f'  平均每车空驶距离: {cbd_empty_dist/max(1,cbd_traj_count)/1000:.2f} km')
    print(f'  最大放射距离: {max_radial_dist*111:.1f} km (约{max_radial_dist/cbd_radius:.1f}倍CBD半径)')

print('\n=== 6. 速度因子验证 ===')
for mode in ['off_peak', 'morning_peak', 'evening_peak']:
    result = results[mode]['result']
    all_speeds = []
    for traj in result.trajectories:
        all_speeds.extend(traj.speeds)
    avg_speed = sum(all_speeds) / len(all_speeds) if all_speeds else 0
    print(f'  {mode}: 平均速度 {avg_speed:.1f} km/h (配置速度倍率: {TIME_MODE_PARAMS[mode]["speed_multiplier"]})')

print('\n=== 7. 综合评估 ===')
density_order = (
    results['evening_peak']['total_dist'] > results['morning_peak']['total_dist'] > results['off_peak']['total_dist']
)
print(f'  密度顺序 (晚高峰 > 早高峰 > 平峰): {"✓ 符合预期" if density_order else "✗ 不符合预期"}')

cbd_radial_evening_gt_morning = (
    results['evening_peak']['empty_ratio'] > results['morning_peak']['empty_ratio']
)
print(f'  空驶率 晚高峰 > 早高峰: {"✓ 符合预期" if cbd_radial_evening_gt_morning else "✗ 不符合预期"}')

speed_order = True
speeds = {}
for mode in ['off_peak', 'morning_peak', 'evening_peak']:
    result = results[mode]['result']
    all_speeds = []
    for traj in result.trajectories:
        all_speeds.extend(traj.speeds)
    speeds[mode] = sum(all_speeds) / len(all_speeds) if all_speeds else 0

speed_order = speeds['off_peak'] > speeds['morning_peak'] > speeds['evening_peak']
print(f'  速度顺序 (平峰 > 早高峰 > 晚高峰): {"✓ 符合预期" if speed_order else "✗ 不符合预期"}')
