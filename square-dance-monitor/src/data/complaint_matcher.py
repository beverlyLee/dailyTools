import csv
from typing import List, Dict
from datetime import datetime, timedelta, timezone
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'geo'))
from buffer_check import haversine_distance, calculate_comprehensive_risk


def parse_datetime(dt_str: str) -> datetime:
    dt_str = dt_str.replace('Z', '+00:00')
    dt = datetime.fromisoformat(dt_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def get_now_utc() -> datetime:
    return datetime.now(timezone.utc)


def load_complaints_from_csv(csv_path: str) -> List[Dict]:
    complaints = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            complaints.append({
                'complaint_id': row['complaint_id'],
                'title': row['title'],
                'content': row['content'],
                'lat': float(row['lat']),
                'lon': float(row['lon']),
                'datetime': row['datetime'],
                'complaint_type': row.get('complaint_type', '噪音投诉'),
                'status': row.get('status', '待处理')
            })
    return complaints


def match_complaints_to_parks(parks: List[Dict], complaints: List[Dict], max_distance_meters: float = 500) -> List[Dict]:
    results = []
    
    for park in parks:
        park_complaints = []
        complaint_count_30d = 0
        complaint_count_7d = 0
        
        now = get_now_utc()
        
        for complaint in complaints:
            distance = haversine_distance(
                park['lat'], park['lon'],
                complaint['lat'], complaint['lon']
            )
            
            if distance <= max_distance_meters:
                complaint_datetime = parse_datetime(complaint['datetime'])
                
                days_ago = (now - complaint_datetime).days
                
                if days_ago <= 30:
                    complaint_count_30d += 1
                if days_ago <= 7:
                    complaint_count_7d += 1
                
                park_complaints.append({
                    'complaint_id': complaint['complaint_id'],
                    'title': complaint['title'],
                    'content': complaint['content'],
                    'distance': distance,
                    'datetime': complaint['datetime'],
                    'days_ago': days_ago,
                    'complaint_type': complaint['complaint_type'],
                    'status': complaint['status']
                })
        
        park_complaints.sort(key=lambda x: x['distance'])
        
        base_score = park.get('base_risk_score', 0)
        comprehensive_risk = calculate_comprehensive_risk(base_score, complaint_count_30d)
        
        result = {
            'park_id': park['park_id'],
            'park_name': park['park_name'],
            'lat': park['lat'],
            'lon': park['lon'],
            'district': park.get('district', ''),
            'area_sqm': park.get('area_sqm', 0),
            'has_square_dance': park.get('has_square_dance', False),
            'complaint_count': len(park_complaints),
            'complaint_count_30d': complaint_count_30d,
            'complaint_count_7d': complaint_count_7d,
            'complaints': park_complaints,
            'nearest_residential_distance': park.get('nearest_residential_distance', 0),
            'nearest_residential_name': park.get('nearest_residential_name', ''),
            'base_risk_level': park.get('base_risk_level', 'low'),
            'base_risk_score': base_score,
            'risk_level': comprehensive_risk['level'],
            'risk_score': comprehensive_risk['score']
        }
        results.append(result)
    
    return results


def get_parks_with_complaints(parks_with_complaints: List[Dict], min_complaints: int = 1) -> List[Dict]:
    return [p for p in parks_with_complaints if p['complaint_count'] >= min_complaints]


def get_complaint_summary(parks_with_complaints: List[Dict]) -> Dict:
    total_complaints = sum(p['complaint_count'] for p in parks_with_complaints)
    high_risk_parks = [p for p in parks_with_complaints if p['risk_level'] == 'high']
    high_risk_complaints = sum(p['complaint_count_30d'] for p in high_risk_parks)
    
    return {
        'total_parks': len(parks_with_complaints),
        'total_complaints': total_complaints,
        'high_risk_parks_count': len(high_risk_parks),
        'high_risk_complaints_count': high_risk_complaints,
        'avg_complaints_per_park': round(total_complaints / len(parks_with_complaints), 2) if parks_with_complaints else 0
    }


def filter_complaints_by_date(complaints: List[Dict], days: int = 30) -> List[Dict]:
    now = get_now_utc()
    cutoff = now - timedelta(days=days)
    return [c for c in complaints if parse_datetime(c['datetime']) >= cutoff]
