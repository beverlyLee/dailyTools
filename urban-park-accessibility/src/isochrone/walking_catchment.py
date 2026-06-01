import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

import math
from shapely.geometry import Point, Polygon
from shapely.ops import transform
import pyproj
from database import db

class WalkingCatchment:
    def __init__(self):
        self.walking_speed = 5.0
        self.wgs84 = pyproj.CRS('EPSG:4326')
        self.utm = pyproj.CRS('EPSG:32650')
        self.project = pyproj.Transformer.from_crs(self.wgs84, self.utm, always_xy=True).transform
    
    def calculate_isochrone(self, lon, lat, travel_time_minutes=10):
        distance_km = (self.walking_speed * travel_time_minutes / 60)
        distance_meters = distance_km * 1000
        
        nearby_parks = db.find_nearby_parks(lon, lat, distance_meters)
        
        has_park_access = len(nearby_parks) > 0
        
        buffer_geom = self._create_buffer_geometry(lon, lat, distance_meters)
        
        db.add_isochrone(
            residential_id=0,
            travel_time=travel_time_minutes,
            geometry=buffer_geom,
            has_park_access=has_park_access
        )
        
        return {
            'has_park_access': has_park_access,
            'nearby_parks_count': len(nearby_parks),
            'nearby_parks': nearby_parks
        }
    
    def _create_buffer_geometry(self, lon, lat, distance_meters):
        earth_radius = 6371008
        points = 64
        coords = []
        
        for i in range(points):
            angle = (i / points) * 2 * math.pi
            lat_radians = lat * math.pi / 180
            lon_radians = lon * math.pi / 180
            
            new_lat = math.asin(
                math.sin(lat_radians) * math.cos(distance_meters / earth_radius) +
                math.cos(lat_radians) * math.sin(distance_meters / earth_radius) * math.cos(angle)
            )
            
            new_lon = lon_radians + math.atan2(
                math.sin(angle) * math.sin(distance_meters / earth_radius) * math.cos(lat_radians),
                math.cos(distance_meters / earth_radius) - math.sin(lat_radians) * math.sin(new_lat)
            )
            
            coords.append([
                new_lon * 180 / math.pi,
                new_lat * 180 / math.pi
            ])
        
        coords.append(coords[0])
        
        return {
            'type': 'Polygon',
            'coordinates': [coords]
        }
    
    def calculate_coverage_ratio(self):
        return db.calculate_coverage()
    
    def get_all_park_deserts(self):
        return db.get_park_deserts()
    
    def get_all_isochrones(self):
        return db.get_all_isochrones()
    
    def get_parks_geojson(self):
        return db.get_parks_geojson()
    
    def get_residential_geojson(self):
        return db.get_residential_geojson()

wc = WalkingCatchment()
