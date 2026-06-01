import json
import os
from shapely.geometry import shape, Point, Polygon
from shapely.ops import transform
import pyproj

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
PARK_ACCESS_DISTANCE = 1000  # 1公里

class ParkDatabase:
    def __init__(self):
        self.parks = []
        self.residential_areas = []
        self.isochrones = []
        self._ensure_data_dir()
        self._init_projection()
        self._load_data()
    
    def _ensure_data_dir(self):
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)
    
    def _init_projection(self):
        self.wgs84 = pyproj.CRS('EPSG:4326')
        self.utm = pyproj.CRS('EPSG:32650')
        self.project = pyproj.Transformer.from_crs(
            self.wgs84, self.utm, always_xy=True
        ).transform
    
    def _load_data(self):
        parks_file = os.path.join(DATA_DIR, 'parks.json')
        residential_file = os.path.join(DATA_DIR, 'residential.json')
        isochrones_file = os.path.join(DATA_DIR, 'isochrones.json')
        
        if os.path.exists(parks_file):
            with open(parks_file, 'r', encoding='utf-8') as f:
                self.parks = json.load(f)
        
        if os.path.exists(residential_file):
            with open(residential_file, 'r', encoding='utf-8') as f:
                self.residential_areas = json.load(f)
        
        if os.path.exists(isochrones_file):
            with open(isochrones_file, 'r', encoding='utf-8') as f:
                self.isochrones = json.load(f)
        
        self._validate_data()
    
    def _validate_data(self):
        valid_parks = []
        for park in self.parks:
            if self._is_valid_park(park):
                valid_parks.append(park)
        
        valid_residential = []
        for res in self.residential_areas:
            if self._is_valid_residential(res):
                valid_residential.append(res)
        
        self.parks = valid_parks
        self.residential_areas = valid_residential
    
    def _is_valid_park(self, park):
        if not park.get('geometry'):
            return False
        geom = park['geometry']
        if geom.get('type') != 'Polygon':
            return False
        if not geom.get('coordinates') or len(geom['coordinates']) == 0:
            return False
        return True
    
    def _is_valid_residential(self, res):
        if not res.get('geometry'):
            return False
        geom = res['geometry']
        if geom.get('type') != 'Point':
            return False
        if not geom.get('coordinates') or len(geom['coordinates']) < 2:
            return False
        return True
    
    def _save_data(self):
        with open(os.path.join(DATA_DIR, 'parks.json'), 'w', encoding='utf-8') as f:
            json.dump(self.parks, f, ensure_ascii=False, indent=2)
        
        with open(os.path.join(DATA_DIR, 'residential.json'), 'w', encoding='utf-8') as f:
            json.dump(self.residential_areas, f, ensure_ascii=False, indent=2)
        
        with open(os.path.join(DATA_DIR, 'isochrones.json'), 'w', encoding='utf-8') as f:
            json.dump(self.isochrones, f, ensure_ascii=False, indent=2)
    
    def add_park(self, name, geometry, area, source='OSM'):
        park_id = len(self.parks) + 1
        park = {
            'id': park_id,
            'name': name,
            'geometry': geometry,
            'area': area,
            'source': source
        }
        if self._is_valid_park(park):
            self.parks.append(park)
            self._save_data()
            return park
        return None
    
    def add_residential(self, name, lon, lat, population):
        res_id = len(self.residential_areas) + 1
        residential = {
            'id': res_id,
            'name': name,
            'geometry': {'type': 'Point', 'coordinates': [lon, lat]},
            'population': population
        }
        if self._is_valid_residential(residential):
            self.residential_areas.append(residential)
            self._save_data()
            return residential
        return None
    
    def add_isochrone(self, residential_id, travel_time, geometry, has_park_access):
        iso_id = len(self.isochrones) + 1
        isochrone = {
            'id': iso_id,
            'residential_id': residential_id,
            'travel_time': travel_time,
            'geometry': geometry,
            'has_park_access': has_park_access
        }
        self.isochrones.append(isochrone)
        self._save_data()
        return isochrone
    
    def get_parks_geojson(self):
        features = []
        for park in self.parks:
            features.append({
                'type': 'Feature',
                'properties': {
                    'id': park['id'],
                    'name': park['name'],
                    'area': park['area']
                },
                'geometry': park['geometry']
            })
        return {'type': 'FeatureCollection', 'features': features}
    
    def get_residential_geojson(self):
        features = []
        for res in self.residential_areas:
            has_access = self._check_park_access_single(res)
            features.append({
                'type': 'Feature',
                'properties': {
                    'id': res['id'],
                    'name': res['name'],
                    'population': res['population'],
                    'has_park_access': has_access
                },
                'geometry': res['geometry']
            })
        return {'type': 'FeatureCollection', 'features': features}
    
    def get_all_isochrones(self):
        result = []
        for iso in self.isochrones:
            res = next((r for r in self.residential_areas if r['id'] == iso['residential_id']), None)
            result.append({
                'id': iso['id'],
                'residential_name': res['name'] if res else 'Unknown',
                'travel_time': iso['travel_time'],
                'has_park_access': iso['has_park_access'],
                'geometry': iso['geometry']
            })
        return result
    
    def get_park_deserts(self):
        deserts = []
        for res in self.residential_areas:
            has_access = self._check_park_access_single(res)
            if not has_access:
                deserts.append({
                    'id': res['id'],
                    'name': res['name'],
                    'geometry': res['geometry']
                })
        return deserts
    
    def get_all_park_deserts(self):
        return self.get_park_deserts()
    
    def _check_park_access_single(self, residential):
        lon = residential['geometry']['coordinates'][0]
        lat = residential['geometry']['coordinates'][1]
        return self._check_park_access(lon, lat, PARK_ACCESS_DISTANCE)
    
    def _check_park_access(self, lon, lat, distance_meters):
        try:
            point = Point(lon, lat)
            point_utm = transform(self.project, point)
            
            for park in self.parks:
                try:
                    park_geom = shape(park['geometry'])
                    park_utm = transform(self.project, park_geom)
                    if point_utm.distance(park_utm) <= distance_meters:
                        return True
                except Exception:
                    continue
        except Exception:
            pass
        
        return False
    
    def calculate_coverage(self):
        total = len(self.residential_areas)
        if total == 0:
            return {
                'total_residential': 0,
                'covered_residential': 0,
                'coverage_ratio': 0,
                'coverage_percentage': 0,
                'desert_count': 0
            }
        
        covered = 0
        deserts = []
        
        for res in self.residential_areas:
            if self._check_park_access_single(res):
                covered += 1
            else:
                deserts.append(res)
        
        ratio = covered / total
        return {
            'total_residential': total,
            'covered_residential': covered,
            'coverage_ratio': ratio,
            'coverage_percentage': round(ratio * 100, 2),
            'desert_count': len(deserts)
        }
    
    def find_nearby_parks(self, lon, lat, distance_meters):
        nearby = []
        try:
            point = Point(lon, lat)
            point_utm = transform(self.project, point)
            
            for park in self.parks:
                try:
                    park_geom = shape(park['geometry'])
                    park_utm = transform(self.project, park_geom)
                    dist = point_utm.distance(park_utm)
                    if dist <= distance_meters:
                        nearby.append({
                            'id': park['id'],
                            'distance': dist,
                            'geometry': park['geometry']
                        })
                except Exception:
                    continue
        except Exception:
            pass
        
        return sorted(nearby, key=lambda x: x['distance'])
    
    def clear_all(self):
        self.parks = []
        self.residential_areas = []
        self.isochrones = []
        self._save_data()
    
    def get_data_summary(self):
        coverage = self.calculate_coverage()
        return {
            'parks_count': len(self.parks),
            'residential_count': len(self.residential_areas),
            'isochrones_count': len(self.isochrones),
            'coverage': coverage
        }

db = ParkDatabase()
