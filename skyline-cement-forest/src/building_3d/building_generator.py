import json
import math
import numpy as np
from dataclasses import dataclass, asdict
from typing import List, Tuple, Dict, Optional
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from property.building_crawler import BuildingData


@dataclass
class Building3D:
    id: str
    name: str
    coordinates: List[List[float]]
    height: float
    base_height: float
    build_year: int
    floors: int
    property_type: str
    color: List[int]
    centroid: List[float]


class BuildingGenerator:
    def __init__(self, base_height: float = 0.0):
        self.base_height = base_height
        self.color_map = {
            '住宅': [70, 130, 180],
            '公寓': [100, 149, 237],
            '写字楼': [105, 105, 105],
            '商业综合体': [205, 92, 92],
            '商住楼': [147, 112, 219],
        }

    def _generate_building_footprint(
        self, 
        center_lng: float, 
        center_lat: float, 
        height: float
    ) -> List[List[float]]:
        base_size = 0.00015 + min(height / 1000, 0.0001)
        aspect_ratio = np.random.uniform(0.6, 1.5)
        
        dx = base_size
        dy = base_size * aspect_ratio
        
        rotation = np.random.uniform(0, math.pi / 6)
        cos_r, sin_r = math.cos(rotation), math.sin(rotation)
        
        corners = [
            (-dx, -dy),
            (dx, -dy),
            (dx, dy),
            (-dx, dy),
        ]
        
        rotated_corners = []
        for x, y in corners:
            rx = x * cos_r - y * sin_r
            ry = x * sin_r + y * cos_r
            rotated_corners.append([center_lng + rx, center_lat + ry])
        
        return rotated_corners

    def _get_color_by_type(self, property_type: str, height: float) -> List[int]:
        base_color = self.color_map.get(property_type, [128, 128, 128])
        height_factor = min(height / 150, 1.0)
        brighten = int(height_factor * 30)
        return [
            min(255, base_color[0] + brighten),
            min(255, base_color[1] + brighten),
            min(255, base_color[2] + brighten)
        ]

    def _get_color_by_year(self, build_year: int) -> List[int]:
        if build_year >= 2015:
            return [100, 149, 237]
        elif build_year >= 2010:
            return [70, 130, 180]
        elif build_year >= 2005:
            return [95, 158, 160]
        else:
            return [128, 128, 128]

    def generate_building_3d(
        self, 
        building: BuildingData,
        use_type_color: bool = True
    ) -> Building3D:
        coordinates = self._generate_building_footprint(
            building.longitude,
            building.latitude,
            building.height
        )
        
        if use_type_color:
            color = self._get_color_by_type(building.property_type, building.height)
        else:
            color = self._get_color_by_year(building.build_year)
        
        return Building3D(
            id=building.id,
            name=building.name,
            coordinates=coordinates,
            height=building.height,
            base_height=self.base_height,
            build_year=building.build_year,
            floors=building.total_floors,
            property_type=building.property_type,
            color=color,
            centroid=[building.longitude, building.latitude]
        )

    def generate_all_buildings(
        self, 
        buildings: List[BuildingData],
        use_type_color: bool = True
    ) -> List[Building3D]:
        return [
            self.generate_building_3d(b, use_type_color)
            for b in buildings
        ]

    def to_geojson(self, buildings_3d: List[Building3D]) -> Dict:
        features = []
        for b in buildings_3d:
            feature = {
                "type": "Feature",
                "id": b.id,
                "properties": {
                    "name": b.name,
                    "height": b.height,
                    "base_height": b.base_height,
                    "build_year": b.build_year,
                    "floors": b.floors,
                    "property_type": b.property_type,
                    "color": b.color,
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [b.coordinates]
                }
            }
            features.append(feature)
        
        return {
            "type": "FeatureCollection",
            "features": features
        }

    def to_deckgl_format(self, buildings_3d: List[Building3D]) -> List[Dict]:
        result = []
        for b in buildings_3d:
            coords = b.coordinates
            result.append({
                "id": b.id,
                "name": b.name,
                "polygon": coords,
                "height": b.height,
                "baseHeight": b.base_height,
                "buildYear": b.build_year,
                "floors": b.floors,
                "type": b.property_type,
                "color": b.color,
                "centroid": b.centroid
            })
        return result

    def to_timelapse_format(self, buildings_3d: List[Building3D]) -> Dict:
        year_groups = {}
        for b in buildings_3d:
            year = b.build_year
            if year not in year_groups:
                year_groups[year] = []
            year_groups[year].append({
                "id": b.id,
                "name": b.name,
                "polygon": b.coordinates,
                "height": b.height,
                "baseHeight": b.base_height,
                "type": b.property_type,
                "color": b.color,
            })
        
        return {
            "timestamps": sorted(year_groups.keys()),
            "data": {str(year): year_groups[year] for year in sorted(year_groups.keys())}
        }

    def save_geojson(self, buildings_3d: List[Building3D], filepath: str):
        geojson_data = self.to_geojson(buildings_3d)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(geojson_data, f, ensure_ascii=False, indent=2)
        print(f"Saved GeoJSON to {filepath}")

    def save_deckgl_json(self, buildings_3d: List[Building3D], filepath: str):
        deckgl_data = self.to_deckgl_format(buildings_3d)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(deckgl_data, f, ensure_ascii=False, indent=2)
        print(f"Saved Deck.gl data to {filepath}")


BUILDING_NAME_PREFIXES = [
    '万科', '保利', '华润', '中海', '碧桂园', '恒大', '融创',
    '金地', '招商', '华侨城', '卓越', '京基', '天健', '深业',
    '振业', '长城', '宝能', '佳兆业', '龙光', '绿景'
]

BUILDING_NAME_MIDDLES = [
    '城', '花园', '府', '苑', '公馆', '中心', '广场', '湾',
    '里', '座', '大厦', '公寓', '华庭', '豪庭', '景园',
    '家园', '佳园', '名苑', '名都', '国际'
]

BUILDING_NAME_SUFFIXES = [
    '一期', '二期', '三期', 'A区', 'B区', 'C区',
    '东园', '西园', '南苑', '北苑', 'A座', 'B座', 'C座'
]


def generate_building_name(index: int) -> str:
    prefix = BUILDING_NAME_PREFIXES[index % len(BUILDING_NAME_PREFIXES)]
    middle_index = index // len(BUILDING_NAME_PREFIXES)
    middle = BUILDING_NAME_MIDDLES[middle_index % len(BUILDING_NAME_MIDDLES)]
    suffix = BUILDING_NAME_SUFFIXES[index % len(BUILDING_NAME_SUFFIXES)]
    return f"{prefix}{middle}{suffix}"


def generate_sample_buildings(count: int = 200) -> List[Building3D]:
    generator = BuildingGenerator()
    
    center_lng, center_lat = 113.93, 22.54
    building_3d_list = []
    
    for i in range(count):
        lng = center_lng + np.random.uniform(-0.08, 0.08)
        lat = center_lat + np.random.uniform(-0.06, 0.06)
        
        dist_from_center = math.sqrt((lng - center_lng) ** 2 + (lat - center_lat) ** 2)
        if dist_from_center < 0.02:
            build_year = np.random.randint(2010, 2021)
        elif dist_from_center < 0.04:
            build_year = np.random.randint(2005, 2016)
        else:
            build_year = np.random.randint(2000, 2011)
        
        if build_year >= 2015:
            floors = np.random.randint(20, 55)
        elif build_year >= 2010:
            floors = np.random.randint(15, 40)
        elif build_year >= 2005:
            floors = np.random.randint(10, 30)
        else:
            floors = np.random.randint(6, 20)
        
        height = floors * 3.0 + np.random.uniform(0, 2)
        
        types = ['住宅', '公寓', '写字楼', '商业综合体', '商住楼']
        
        mock_building = BuildingData(
            id=f"mock_{i:04d}",
            name=generate_building_name(i),
            address="",
            district="南山区",
            city="深圳",
            total_floors=floors,
            height=height,
            build_year=build_year,
            longitude=lng,
            latitude=lat,
            property_type=np.random.choice(types),
            source_url="",
            crawled_at=0
        )
        
        building_3d = generator.generate_building_3d(mock_building)
        building_3d_list.append(building_3d)
    
    return building_3d_list


if __name__ == '__main__':
    buildings = generate_sample_buildings(300)
    generator = BuildingGenerator()
    
    data_dir = os.path.join(os.path.dirname(__file__), '../../data')
    os.makedirs(data_dir, exist_ok=True)
    
    generator.save_geojson(buildings, os.path.join(data_dir, 'buildings_3d.geojson'))
    generator.save_deckgl_json(buildings, os.path.join(data_dir, 'buildings_deckgl.json'))
    
    timelapse_data = generator.to_timelapse_format(buildings)
    with open(os.path.join(data_dir, 'timelapse_data.json'), 'w', encoding='utf-8') as f:
        json.dump(timelapse_data, f, ensure_ascii=False, indent=2)
    
    print(f"Generated {len(buildings)} 3D buildings")
    print(f"Year range: {min(b.build_year for b in buildings)} - {max(b.build_year for b in buildings)}")
