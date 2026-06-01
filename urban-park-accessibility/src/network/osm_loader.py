import sys
import os
import math
import random
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

import requests
from shapely.geometry import shape, Polygon
from shapely.ops import transform
from database import db

class OSMLoader:
    def __init__(self):
        self.project = db.project
    
    def fetch_osm_data(self, bbox, tags=None):
        overpass_url = "https://overpass-api.de/api/interpreter"
        
        if tags is None:
            tags = ['leisure=park', 'landuse=grass', 'leisure=garden']
        
        tag_filters = ''.join([f'["{tag}"]' for tag in tags])
        
        query = f"""
        [out:json][timeout:30];
        (
          way{tag_filters}({bbox});
          relation{tag_filters}({bbox});
        );
        out body;
        >;
        out skel qt;
        """
        
        try:
            response = requests.get(overpass_url, params={'data': query}, timeout=30)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"OSM 请求失败: {e}")
            return {'elements': []}
    
    def load_parks(self, bbox):
        data = self.fetch_osm_data(bbox, tags=['leisure=park', 'landuse=grass', 'leisure=garden'])
        
        nodes = {}
        for element in data['elements']:
            if element['type'] == 'node':
                nodes[element['id']] = (element['lon'], element['lat'])
        
        count = 0
        for element in data['elements']:
            if element['type'] == 'way':
                node_ids = element['nodes']
                coords = [nodes[nid] for nid in node_ids if nid in nodes]
                
                if len(coords) >= 3:
                    poly = Polygon(coords)
                    area = self._calculate_area(poly)
                    name = element.get('tags', {}).get('name', f'公园 {count + 1}')
                    
                    if db.add_park(name, {'type': 'Polygon', 'coordinates': [coords]}, area, 'OSM'):
                        count += 1
        
        print(f"加载了 {count} 个公园")
        return count
    
    def load_residential_areas(self, bbox):
        data = self.fetch_osm_data(bbox, tags=['building=residential', 'building=apartments', 'building=house'])
        
        nodes = {}
        for element in data['elements']:
            if element['type'] == 'node':
                nodes[element['id']] = (element['lon'], element['lat'])
        
        count = 0
        for element in data['elements']:
            if element['type'] == 'way':
                node_ids = element['nodes']
                coords = [nodes[nid] for nid in node_ids if nid in nodes]
                
                if len(coords) >= 3:
                    poly = Polygon(coords)
                    centroid = poly.centroid
                    name = element.get('tags', {}).get('name', f'小区 {count + 1}')
                    
                    if db.add_residential(name, centroid.x, centroid.y, 100 + count * 20):
                        count += 1
        
        print(f"加载了 {count} 个居住区")
        return count
    
    def load_sample_data_shenzhen(self):
        shenzhen_bbox = "22.53,113.92,22.57,113.96"
        db.clear_all()
        
        parks_count = self.load_parks(shenzhen_bbox)
        residential_count = self.load_residential_areas(shenzhen_bbox)
        
        if parks_count == 0 and residential_count == 0:
            print("OSM 数据获取失败，使用演示数据")
            self._load_demo_data()
            parks_count = 8
            residential_count = 60
        
        return {
            'parks': parks_count,
            'residential': residential_count
        }
    
    def _load_demo_data(self):
        db.clear_all()
        
        center = [113.94, 22.55]
        
        for i in range(8):
            angle = (i / 8) * 2 * math.pi
            distance = 0.01 + random.random() * 0.015
            park_center = [
                center[0] + math.cos(angle) * distance,
                center[1] + math.sin(angle) * distance
            ]
            
            polygon = []
            points_count = 12
            park_size = 0.003 + random.random() * 0.003
            
            for j in range(points_count):
                a = (j / points_count) * 2 * math.pi
                r = park_size * (0.7 + random.random() * 0.6)
                polygon.append([
                    park_center[0] + math.cos(a) * r,
                    park_center[1] + math.sin(a) * r
                ])
            polygon.append(polygon[0])
            
            poly = Polygon(polygon)
            area = self._calculate_area(poly)
            
            db.add_park(
                name=f'公园 {i + 1}',
                geometry={'type': 'Polygon', 'coordinates': [polygon]},
                area=area,
                source='DEMO'
            )
        
        for i in range(60):
            angle = random.random() * 2 * math.pi
            distance = random.random() * 0.03
            point = [
                center[0] + math.cos(angle) * distance,
                center[1] + math.sin(angle) * distance
            ]
            
            db.add_residential(
                name=f'小区 {i + 1}',
                lon=point[0],
                lat=point[1],
                population=int(random.random() * 2000 + 500)
            )
        
        print("加载了 8 个演示公园和 60 个演示居住区")
    
    def _calculate_area(self, poly):
        poly_utm = transform(self.project, poly)
        return poly_utm.area

loader = OSMLoader()
