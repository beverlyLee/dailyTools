import sys
sys.path.insert(0, 'src')
from simulation.empty_trip_sim import EmptyTripSimulator, TIME_MODE_PARAMS
from traffic.road_status_spider import BEIJING_KEY_AREAS
import math
import random

random.seed(42)

print('=== 深入验证：只看以CBD为起点的轨迹 ===')
print('(模拟 500 辆车，统计从CBD出发的轨迹的空驶特征)\n')

cbd_area_info = BEIJING_KEY_AREAS['cbd']
cbd_center = cbd_area_info['center']
cbd_radius = cbd_area_info['radius']

for mode in ['off_peak', 'morning_peak', 'evening_peak']:
    random.seed(42)
    sim = EmptyTripSimulator(vehicle_type='gasoline', time_mode=mode)
    
    cbd_start_trajectories = []
    for i in range(500):
        result = sim.simulate_single_vehicle(start_area='cbd')
        start = result.path[0]
        dist_from_cbd = math.sqrt((start[0] - cbd_center[0])**2 + (start[1] - cbd_center[1])**2)
        if dist_from_cbd < cbd_radius * 1.5:
            cbd_start_trajectories.append(result)
    
    total_empty = sum(t.empty_distance for t in cbd_start_trajectories)
    total_dist = sum(t.total_distance for t in cbd_start_trajectories)
    avg_empty_per_veh = total_empty / len(cbd_start_trajectories) / 1000
    empty_ratio = total_empty / total_dist * 100 if total_dist > 0 else 0
    
    avg_max_dist = 0
    for t in cbd_start_trajectories:
        max_d = 0
        for lng, lat in t.path:
            d = math.sqrt((lng - cbd_center[0])**2 + (lat - cbd_center[1])**2)
            if d > max_d:
                max_d = d
        avg_max_dist += max_d
    avg_max_dist /= len(cbd_start_trajectories)
    
    print(f'--- {mode} ---')
    print(f'  CBD出发轨迹数: {len(cbd_start_trajectories)}')
    print(f'  平均每车空驶距离: {avg_empty_per_veh:.2f} km')
    print(f'  空驶率: {empty_ratio:.1f}%')
    print(f'  平均最远距离(从CBD): {avg_max_dist*111:.1f} km')
    print(f'  放射强度配置: cbd_radial_intensity = {TIME_MODE_PARAMS[mode]["cbd_radial_intensity"]}')
    print()

print('\n=== 速度因子未生效的验证 ===')
print('查看 _generate_ride_path 中是否使用了时间模式的 speed_multiplier')
print('代码中只有 self._params["speed_multiplier"] (车辆类型的), 没有 self._time_params["speed_multiplier"]')
print('=> 速度因子配置了但未使用')
