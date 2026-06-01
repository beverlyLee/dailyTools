import math
from typing import List, Dict, Tuple
import csv
import os


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


def load_parks_from_csv(csv_path: str) -> List[Dict]:
    parks = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            parks.append({
                'park_id': row['park_id'],
                'park_name': row['park_name'],
                'lat': float(row['lat']),
                'lon': float(row['lon']),
                'district': row.get('district', ''),
                'area_sqm': float(row.get('area_sqm', 0)),
                'has_square_dance': row.get('has_square_dance', 'True') == 'True'
            })
    return parks


def load_residential_areas_from_csv(csv_path: str) -> List[Dict]:
    residential = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            residential.append({
                'residential_id': row['residential_id'],
                'residential_name': row['residential_name'],
                'lat': float(row['lat']),
                'lon': float(row['lon']),
                'population': int(row.get('population', 0)),
                'building_count': int(row.get('building_count', 0))
            })
    return residential


def check_park_proximity(parks: List[Dict], residential_areas: List[Dict], buffer_meters: float = 250) -> List[Dict]:
    results = []
    
    for park in parks:
        nearby_residential = []
        min_distance = float('inf')
        nearest_residential = None
        total_affected_population = 0
        
        for res in residential_areas:
            distance = haversine_distance(
                park['lat'], park['lon'],
                res['lat'], res['lon']
            )
            
            if distance < min_distance:
                min_distance = distance
                nearest_residential = res
            
            if distance <= buffer_meters:
                nearby_residential.append({
                    'residential_id': res['residential_id'],
                    'residential_name': res['residential_name'],
                    'distance': distance,
                    'population': res['population']
                })
                total_affected_population += res['population']
        
        base_risk = calculate_base_risk(len(nearby_residential), min_distance, total_affected_population)
        
        park_result = {
            'park_id': park['park_id'],
            'park_name': park['park_name'],
            'lat': park['lat'],
            'lon': park['lon'],
            'district': park['district'],
            'area_sqm': park['area_sqm'],
            'has_square_dance': park['has_square_dance'],
            'nearby_residential_count': len(nearby_residential),
            'nearby_residential': nearby_residential,
            'nearest_residential_distance': min_distance,
            'nearest_residential_name': nearest_residential['residential_name'] if nearest_residential else None,
            'total_affected_population': total_affected_population,
            'base_risk_level': base_risk['level'],
            'base_risk_score': base_risk['score']
        }
        results.append(park_result)
    
    return results


def calculate_base_risk(nearby_count: int, min_distance: float, total_population: int = 0) -> Dict:
    distance_factor = max(0, 300 - min_distance) / 3 if min_distance <= 300 else 0
    
    count_factor = min(nearby_count * 10, 30)
    
    population_factor = min(total_population / 100, 20)
    
    score = min(100, distance_factor + count_factor + population_factor)
    
    if score >= 60:
        level = 'high'
    elif score >= 30:
        level = 'medium'
    else:
        level = 'low'
    
    return {'level': level, 'score': score}


def calculate_comprehensive_risk(base_score: float, complaint_count_30d: int) -> Dict:
    complaint_factor = min(complaint_count_30d * 10, 40)
    
    final_score = min(100, base_score * 0.6 + complaint_factor)
    
    if final_score >= 70 or complaint_count_30d >= 5:
        level = 'high'
    elif final_score >= 35 or complaint_count_30d >= 2:
        level = 'medium'
    else:
        level = 'low'
    
    return {'level': level, 'score': final_score}


def get_high_risk_parks(parks_with_risk: List[Dict]) -> List[Dict]:
    return [p for p in parks_with_risk if p['risk_level'] == 'high']
