import json
import random
import datetime
import math

with open('data/trip_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

metro_stations = [s for s in data['stations'] if s['type'] == 'metro']
office_stations = [s for s in data['stations'] if s['type'] == 'office']

trips = []
trip_id = 1

random.seed(42)

def generate_time(base_hour, base_minute=0):
    hour = base_hour + random.randint(0, 1)
    minute = random.randint(0, 59)
    return f"{hour:02d}:{minute:02d}:{random.randint(0,59):02d}"

def calculate_distance(start, end):
    lng1, lat1 = start['lng'], start['lat']
    lng2, lat2 = end['lng'], end['lat']
    dx = (lng2 - lng1) * 111000 * math.cos(math.radians((lat1 + lat2) / 2))
    dy = (lat2 - lat1) * 111000
    return math.sqrt(dx * dx + dy * dy)

morning_metro_office_weights = {
    ('metro_001', 'office_001'): 30,
    ('metro_001', 'office_002'): 25,
    ('metro_001', 'office_009'): 20,
    ('metro_001', 'office_005'): 15,
    ('metro_002', 'office_007'): 28,
    ('metro_002', 'office_008'): 22,
    ('metro_003', 'office_006'): 20,
    ('metro_003', 'office_019'): 18,
    ('metro_003', 'office_020'): 15,
    ('metro_004', 'office_003'): 25,
    ('metro_004', 'office_004'): 22,
    ('metro_004', 'office_002'): 18,
    ('metro_005', 'office_003'): 15,
    ('metro_005', 'office_010'): 20,
    ('metro_005', 'office_011'): 15,
    ('metro_006', 'office_011'): 18,
    ('metro_006', 'office_012'): 15,
    ('metro_006', 'office_016'): 12,
    ('metro_007', 'office_013'): 15,
    ('metro_007', 'office_015'): 12,
    ('metro_008', 'office_018'): 12,
    ('metro_008', 'office_019'): 10,
}

evening_office_metro_weights = {
    ('office_001', 'metro_001'): 30,
    ('office_002', 'metro_001'): 25,
    ('office_002', 'metro_004'): 15,
    ('office_003', 'metro_004'): 25,
    ('office_003', 'metro_005'): 15,
    ('office_004', 'metro_004'): 22,
    ('office_005', 'metro_001'): 15,
    ('office_005', 'metro_003'): 10,
    ('office_006', 'metro_003'): 20,
    ('office_006', 'metro_004'): 10,
    ('office_007', 'metro_002'): 28,
    ('office_008', 'metro_002'): 22,
    ('office_009', 'metro_001'): 20,
    ('office_010', 'metro_005'): 20,
    ('office_010', 'metro_006'): 12,
    ('office_011', 'metro_005'): 15,
    ('office_011', 'metro_006'): 15,
    ('office_012', 'metro_006'): 15,
    ('office_013', 'metro_007'): 15,
    ('office_015', 'metro_007'): 12,
    ('office_016', 'metro_006'): 12,
    ('office_018', 'metro_008'): 12,
    ('office_019', 'metro_008'): 10,
    ('office_019', 'metro_003'): 10,
    ('office_020', 'metro_003'): 15,
}

morning_pairs = list(morning_metro_office_weights.keys())
morning_weights = list(morning_metro_office_weights.values())
morning_total_weight = sum(morning_weights)

for i in range(250):
    r = random.randint(1, morning_total_weight)
    cumulative = 0
    selected_pair = morning_pairs[0]
    for j, w in enumerate(morning_weights):
        cumulative += w
        if r <= cumulative:
            selected_pair = morning_pairs[j]
            break
    
    start_station = next(s for s in metro_stations if s['id'] == selected_pair[0])
    end_station = next(s for s in office_stations if s['id'] == selected_pair[1])
    
    distance = calculate_distance(start_station, end_station)
    duration = int(distance / 4 + random.randint(-60, 60))
    duration = max(180, min(duration, 1800))
    
    trips.append({
        'id': f'trip_{trip_id:04d}',
        'start_time': generate_time(8),
        'end_time': generate_time(8),
        'start_station_id': start_station['id'],
        'end_station_id': end_station['id'],
        'distance': round(distance, 2),
        'duration': duration,
        'bike_id': f'bike_{random.randint(1000, 9999)}'
    })
    trip_id += 1

evening_pairs = list(evening_office_metro_weights.keys())
evening_weights = list(evening_office_metro_weights.values())
evening_total_weight = sum(evening_weights)

for i in range(250):
    r = random.randint(1, evening_total_weight)
    cumulative = 0
    selected_pair = evening_pairs[0]
    for j, w in enumerate(evening_weights):
        cumulative += w
        if r <= cumulative:
            selected_pair = evening_pairs[j]
            break
    
    start_station = next(s for s in office_stations if s['id'] == selected_pair[0])
    end_station = next(s for s in metro_stations if s['id'] == selected_pair[1])
    
    distance = calculate_distance(start_station, end_station)
    duration = int(distance / 4 + random.randint(-60, 60))
    duration = max(180, min(duration, 1800))
    
    trips.append({
        'id': f'trip_{trip_id:04d}',
        'start_time': generate_time(18),
        'end_time': generate_time(18),
        'start_station_id': start_station['id'],
        'end_station_id': end_station['id'],
        'distance': round(distance, 2),
        'duration': duration,
        'bike_id': f'bike_{random.randint(1000, 9999)}'
    })
    trip_id += 1

data['trips'] = trips

with open('data/trip_data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"生成了 {len(trips)} 条骑行数据")
print(f"早高峰 (8:00-10:00): {sum(1 for t in trips if t['start_time'][:2] in ['08', '09'])} 条")
print(f"晚高峰 (18:00-20:00): {sum(1 for t in trips if t['start_time'][:2] in ['18', '19'])} 条")
