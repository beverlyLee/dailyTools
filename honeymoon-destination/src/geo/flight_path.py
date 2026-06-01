import math
from typing import List, Tuple, Dict

def haversine_distance(coord1: List[float], coord2: List[float]) -> float:
    R = 6371.0
    lon1, lat1 = math.radians(coord1[0]), math.radians(coord1[1])
    lon2, lat2 = math.radians(coord2[0]), math.radians(coord2[1])
    
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    
    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def calculate_arc_height(distance: float) -> float:
    base_height = 0.5
    max_height = 3.0
    normalized_dist = min(distance / 10000, 1.0)
    return base_height + normalized_dist * (max_height - base_height)

def create_flight_arc(
    from_coord: List[float],
    to_coord: List[float],
    segments: int = 50
) -> List[List[float]]:
    points = []
    distance = haversine_distance(from_coord, to_coord)
    height = calculate_arc_height(distance)
    
    for i in range(segments + 1):
        t = i / segments
        lon = from_coord[0] + (to_coord[0] - from_coord[0]) * t
        lat = from_coord[1] + (to_coord[1] - from_coord[1]) * t
        
        arc_t = t * math.pi
        elevation = height * math.sin(arc_t)
        
        points.append([lon, lat, elevation * 100000])
    
    return points

def process_routes_for_deckgl(routes: List[Dict]) -> List[Dict]:
    deckgl_routes = []
    
    for route in routes:
        distance = haversine_distance(route['fromCoord'], route['toCoord'])
        
        deckgl_routes.append({
            'from': {
                'name': route['from'],
                'coordinates': route['fromCoord']
            },
            'to': {
                'name': route['to'],
                'coordinates': route['toCoord']
            },
            'count': route['count'],
            'avgCost': route['avgCost'],
            'income': route['income'],
            'distance': round(distance, 2),
            'sourcePosition': route['fromCoord'],
            'targetPosition': route['toCoord']
        })
    
    return deckgl_routes

def get_region_color(region: str) -> List[int]:
    colors = {
        '长三角': [255, 100, 100],
        '珠三角': [100, 200, 255],
        '环渤海': [100, 255, 100],
        '中西部': [200, 150, 255],
        '其他': [200, 200, 200]
    }
    return colors.get(region, [200, 200, 200])

def get_cost_color(cost: float) -> List[int]:
    if cost < 10000:
        return [100, 255, 100]
    elif cost < 20000:
        return [255, 200, 100]
    elif cost < 35000:
        return [255, 100, 100]
    else:
        return [200, 50, 200]

def add_colors_to_routes(routes: List[Dict], province_region_map: Dict[str, str]) -> List[Dict]:
    for route in routes:
        province_name = route['from']['name'] if isinstance(route['from'], dict) else route['from']
        region = province_region_map.get(province_name, '其他')
        route['regionColor'] = get_region_color(region)
        route['costColor'] = get_cost_color(route['avgCost'])
    return routes
