import os
import requests
from typing import List, Dict, Tuple
from dotenv import load_dotenv
from itertools import permutations
from math import radians, sin, cos, sqrt, atan2

load_dotenv()

class RouteOptimizer:
    def __init__(self):
        self.gaode_api_key = os.getenv('GAODE_API_KEY', '')
        self.base_url = 'https://restapi.amap.com/v3'
        
        self.config = {
            'max_daily_duration': 600,
            'max_daily_walk_distance': 10000,
            'rest_interval': 90,
            'rest_duration': 15,
            'breakfast_start': 420,
            'breakfast_duration': 45,
            'lunch_start': 720,
            'lunch_duration': 60,
            'dinner_start': 1080,
            'dinner_duration': 60,
            'day_start': 480,
            'day_end': 1260,
            'walk_speed': 80,
        }

    def _calculate_distance_fallback(self, poi1: Dict, poi2: Dict) -> int:
        R = 6371
        
        lat1, lng1 = radians(poi1['lat']), radians(poi1['lng'])
        lat2, lng2 = radians(poi2['lat']), radians(poi2['lng'])
        
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        distance = R * c * 1000
        return int(distance)

    def get_distance_matrix(self, pois: List[Dict]) -> List[List[int]]:
        n = len(pois)
        matrix = [[0] * n for _ in range(n)]
        
        if self.gaode_api_key and self.gaode_api_key != 'your_gaode_api_key_here':
            try:
                locations = '|'.join([f"{p['lng']},{p['lat']}" for p in pois])
                url = f"{self.base_url}/distance"
                params = {
                    'key': self.gaode_api_key,
                    'origins': locations,
                    'destinations': locations,
                    'type': 1
                }
                
                response = requests.get(url, params=params, timeout=10)
                data = response.json()
                
                if data.get('status') == '1' and 'results' in data:
                    results = data['results']
                    for i in range(n):
                        for j in range(n):
                            idx = i * n + j
                            if idx < len(results):
                                matrix[i][j] = int(results[idx].get('distance', 0))
                    return matrix
            except Exception as e:
                print(f"高德地图API调用失败，使用 fallback 方法: {e}")
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    matrix[i][j] = self._calculate_distance_fallback(pois[i], pois[j])
        
        return matrix

    def optimize_route_order(self, pois: List[Dict], distance_matrix: List[List[int]]) -> List[int]:
        n = len(pois)
        if n <= 1:
            return [0]
        
        best_route = None
        best_distance = float('inf')
        
        for perm in permutations(range(1, n)):
            route = [0] + list(perm)
            total_distance = 0
            
            for i in range(n - 1):
                total_distance += distance_matrix[route[i]][route[i + 1]]
            
            if total_distance < best_distance:
                best_distance = total_distance
                best_route = route
        
        return best_route

    def calculate_walk_time(self, distance: int) -> int:
        return int(distance / self.config['walk_speed'])

    def get_transport_type(self, distance: int) -> str:
        if distance < 500:
            return '步行'
        elif distance < 2000:
            return '骑行'
        else:
            return '地铁/公交'

    def calculate_transport_time(self, distance: int) -> int:
        transport_type = self.get_transport_type(distance)
        if transport_type == '步行':
            return int(distance / 80)
        elif transport_type == '骑行':
            return int(distance / 200)
        else:
            return int(distance / 300) + 10

    def group_pois_by_day(self, pois: List[Dict], distance_matrix: List[List[int]], best_route: List[int], days: int) -> List[Dict]:
        daily_plans = []
        remaining_indices = best_route.copy()
        
        for day_num in range(days):
            if not remaining_indices:
                break
            
            day_schedule = []
            day_pois = []
            day_distance = 0
            day_duration = 0
            
            current_time = self.config['day_start']
            
            day_schedule.append({
                'type': 'breakfast',
                'name': '早餐',
                'icon': '🌅',
                'start_time': current_time,
                'end_time': current_time + self.config['breakfast_duration'],
                'duration': self.config['breakfast_duration'],
                'distance': 0
            })
            day_duration += self.config['breakfast_duration']
            current_time += self.config['breakfast_duration']
            
            last_orig_idx = None
            time_since_last_rest = 0
            had_lunch = False
            had_dinner = False
            
            while remaining_indices:
                next_orig_idx = remaining_indices[0]
                poi = pois[next_orig_idx]
                
                transport_distance = 0
                transport_time = 0
                if last_orig_idx is not None:
                    transport_distance = distance_matrix[last_orig_idx][next_orig_idx]
                    transport_time = self.calculate_transport_time(transport_distance)
                
                projected_end = current_time + transport_time + poi['duration']
                
                if not had_lunch and projected_end >= self.config['lunch_start']:
                    lunch_start = max(current_time + transport_time, self.config['lunch_start'])
                    day_schedule.append({
                        'type': 'lunch',
                        'name': '午餐',
                        'icon': '🍱',
                        'start_time': lunch_start,
                        'end_time': lunch_start + self.config['lunch_duration'],
                        'duration': self.config['lunch_duration'],
                        'distance': 0
                    })
                    day_duration += self.config['lunch_duration']
                    current_time = lunch_start + self.config['lunch_duration']
                    had_lunch = True
                    time_since_last_rest = 0
                
                if not had_dinner and projected_end >= self.config['dinner_start']:
                    dinner_start = max(current_time + transport_time, self.config['dinner_start'])
                    day_schedule.append({
                        'type': 'dinner',
                        'name': '晚餐',
                        'icon': '🍽️',
                        'start_time': dinner_start,
                        'end_time': dinner_start + self.config['dinner_duration'],
                        'duration': self.config['dinner_duration'],
                        'distance': 0
                    })
                    day_duration += self.config['dinner_duration']
                    current_time = dinner_start + self.config['dinner_duration']
                    had_dinner = True
                    time_since_last_rest = 0
                
                if time_since_last_rest >= self.config['rest_interval'] and day_pois:
                    day_schedule.append({
                        'type': 'rest',
                        'name': '休息',
                        'icon': '☕',
                        'start_time': current_time,
                        'end_time': current_time + self.config['rest_duration'],
                        'duration': self.config['rest_duration'],
                        'distance': 0
                    })
                    day_duration += self.config['rest_duration']
                    current_time += self.config['rest_duration']
                    time_since_last_rest = 0
                
                if transport_time > 0:
                    transport_type = self.get_transport_type(transport_distance)
                    day_schedule.append({
                        'type': 'transport',
                        'name': f'{transport_type}前往',
                        'icon': '🚶' if transport_type == '步行' else '🚲' if transport_type == '骑行' else '🚇',
                        'start_time': current_time,
                        'end_time': current_time + transport_time,
                        'duration': transport_time,
                        'distance': transport_distance,
                        'transport_type': transport_type
                    })
                    day_duration += transport_time
                    day_distance += transport_distance
                    current_time += transport_time
                
                poi_start_time = current_time
                poi_end_time = poi_start_time + poi['duration']
                
                if poi_end_time > self.config['day_end']:
                    if not day_pois:
                        remaining_indices.pop(0)
                        continue
                    break
                
                poi_with_meta = poi.copy()
                poi_with_meta['original_idx'] = next_orig_idx
                poi_with_meta['arrival_time'] = poi_start_time
                poi_with_meta['departure_time'] = poi_end_time
                
                day_schedule.append({
                    'type': 'poi',
                    'name': poi['name'],
                    'icon': '📍',
                    'start_time': poi_start_time,
                    'end_time': poi_end_time,
                    'duration': poi['duration'],
                    'distance': 0,
                    'category': poi.get('category', '景点'),
                    'poi_data': poi_with_meta
                })
                
                day_pois.append(poi_with_meta)
                day_duration += poi['duration']
                current_time = poi_end_time
                time_since_last_rest += poi['duration']
                last_orig_idx = next_orig_idx
                
                remaining_indices.pop(0)
            
            if day_schedule:
                day_schedule.append({
                    'type': 'return',
                    'name': '返回酒店',
                    'icon': '🏨',
                    'start_time': current_time,
                    'end_time': current_time + 20,
                    'duration': 20,
                    'distance': 0
                })
                day_duration += 20
            
            if day_pois:
                daily_plans.append({
                    'day': day_num + 1,
                    'pois': day_pois,
                    'schedule': day_schedule,
                    'total_duration': day_duration,
                    'total_distance': int(day_distance),
                    'had_lunch': had_lunch,
                    'had_dinner': had_dinner
                })
        
        while len(daily_plans) < days:
            daily_plans.append({
                'day': len(daily_plans) + 1,
                'pois': [],
                'schedule': [],
                'total_duration': 0,
                'total_distance': 0,
                'had_lunch': False,
                'had_dinner': False
            })
        
        return daily_plans

    def optimize_route(self, pois: List[Dict], days: int = 3) -> Dict:
        if not pois:
            return {'days': []}
        
        distance_matrix = self.get_distance_matrix(pois)
        best_route = self.optimize_route_order(pois, distance_matrix)
        
        ordered_pois = [pois[i] for i in best_route]
        
        daily_plans = self.group_pois_by_day(pois, distance_matrix, best_route, days)
        
        total_distance = sum(day['total_distance'] for day in daily_plans)
        total_duration = sum(day['total_duration'] for day in daily_plans)
        
        return {
            'days': daily_plans,
            'total_distance': int(total_distance),
            'total_duration': total_duration,
            'route_order': best_route,
            'all_pois': ordered_pois,
            'config': self.config
        }
