import json
import os
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from property.building_crawler import BuildingData
from building_3d.building_generator import Building3D, BuildingGenerator


@dataclass
class TimelineStats:
    total_buildings: int
    total_height: float
    avg_height: float
    max_height: float
    year_building_count: Dict[int, int]


class TimelineController:
    def __init__(self, buildings: Optional[List[Building3D]] = None):
        self.buildings = buildings or []
        self._year_groups: Dict[int, List[Building3D]] = {}
        self._sorted_years: List[int] = []
        if self.buildings:
            self._group_by_year()

    def _group_by_year(self):
        self._year_groups = {}
        for building in self.buildings:
            year = building.build_year
            if year not in self._year_groups:
                self._year_groups[year] = []
            self._year_groups[year].append(building)
        self._sorted_years = sorted(self._year_groups.keys())

    def set_buildings(self, buildings: List[Building3D]):
        self.buildings = buildings
        self._group_by_year()

    def get_years_range(self) -> Tuple[int, int]:
        if not self._sorted_years:
            return (2000, 2020)
        return (self._sorted_years[0], self._sorted_years[-1])

    def get_all_years(self) -> List[int]:
        return self._sorted_years.copy()

    def get_buildings_by_year(self, year: int) -> List[Building3D]:
        return self._year_groups.get(year, [])

    def get_buildings_up_to_year(self, year: int) -> List[Building3D]:
        result = []
        for y in self._sorted_years:
            if y <= year:
                result.extend(self._year_groups[y])
        return result

    def get_buildings_between_years(self, start_year: int, end_year: int) -> List[Building3D]:
        result = []
        for y in self._sorted_years:
            if start_year <= y <= end_year:
                result.extend(self._year_groups[y])
        return result

    def get_cumulative_buildings(self) -> Dict[int, List[Building3D]]:
        cumulative = {}
        current = []
        for year in self._sorted_years:
            current.extend(self._year_groups[year])
            cumulative[year] = current.copy()
        return cumulative

    def get_stats(self) -> TimelineStats:
        if not self.buildings:
            return TimelineStats(0, 0, 0, 0, {})
        
        total_height = sum(b.height for b in self.buildings)
        max_height = max(b.height for b in self.buildings)
        year_counts = {year: len(buildings) for year, buildings in self._year_groups.items()}
        
        return TimelineStats(
            total_buildings=len(self.buildings),
            total_height=total_height,
            avg_height=total_height / len(self.buildings),
            max_height=max_height,
            year_building_count=year_counts
        )

    def get_stats_up_to_year(self, year: int) -> TimelineStats:
        buildings_up_to = self.get_buildings_up_to_year(year)
        if not buildings_up_to:
            return TimelineStats(0, 0, 0, 0, {})
        
        total_height = sum(b.height for b in buildings_up_to)
        max_height = max(b.height for b in buildings_up_to)
        year_counts = {
            y: len(self._year_groups[y]) 
            for y in self._sorted_years if y <= year
        }
        
        return TimelineStats(
            total_buildings=len(buildings_up_to),
            total_height=total_height,
            avg_height=total_height / len(buildings_up_to),
            max_height=max_height,
            year_building_count=year_counts
        )

    def get_animation_frames(
        self, 
        start_year: Optional[int] = None,
        end_year: Optional[int] = None,
        step: int = 1
    ) -> List[Dict[str, Any]]:
        if start_year is None:
            start_year = self._sorted_years[0] if self._sorted_years else 2000
        if end_year is None:
            end_year = self._sorted_years[-1] if self._sorted_years else 2020
        
        frames = []
        for year in range(start_year, end_year + 1, step):
            buildings = self.get_buildings_up_to_year(year)
            stats = self.get_stats_up_to_year(year)
            frames.append({
                "year": year,
                "building_count": stats.total_buildings,
                "total_height": stats.total_height,
                "avg_height": stats.avg_height,
                "max_height": stats.max_height,
                "buildings": [
                    {
                        "id": b.id,
                        "name": b.name,
                        "polygon": b.coordinates,
                        "height": b.height,
                        "baseHeight": b.base_height,
                        "buildYear": b.build_year,
                        "color": b.color,
                        "type": b.property_type
                    }
                    for b in buildings
                ]
            })
        return frames

    def to_deckgl_timeline(
        self,
        start_year: Optional[int] = None,
        end_year: Optional[int] = None
    ) -> Dict[str, Any]:
        if start_year is None:
            start_year = self._sorted_years[0] if self._sorted_years else 2000
        if end_year is None:
            end_year = self._sorted_years[-1] if self._sorted_years else 2020
        
        all_buildings = []
        for b in self.buildings:
            if start_year <= b.build_year <= end_year:
                all_buildings.append({
                    "id": b.id,
                    "name": b.name,
                    "polygon": b.coordinates,
                    "height": b.height,
                    "baseHeight": b.base_height,
                    "buildYear": b.build_year,
                    "color": b.color,
                    "type": b.property_type,
                    "centroid": b.centroid
                })
        
        return {
            "startYear": start_year,
            "endYear": end_year,
            "years": [y for y in self._sorted_years if start_year <= y <= end_year],
            "buildings": all_buildings,
            "stats": self.get_stats().__dict__
        }

    def export_to_json(self, filepath: str, format_type: str = 'timeline'):
        if format_type == 'timeline':
            data = {
                "years": self._sorted_years,
                "yearGroups": {
                    str(year): [
                        {
                            "id": b.id,
                            "name": b.name,
                            "polygon": b.coordinates,
                            "height": b.height,
                            "buildYear": b.build_year,
                            "color": b.color
                        }
                        for b in buildings
                    ]
                    for year, buildings in self._year_groups.items()
                },
                "stats": self.get_stats().__dict__
            }
        elif format_type == 'deckgl':
            data = self.to_deckgl_timeline()
        elif format_type == 'frames':
            data = self.get_animation_frames()
        else:
            raise ValueError(f"Unknown format type: {format_type}")
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Exported timeline data to {filepath}")


def create_timeline_from_building_data(
    building_data_list: List[BuildingData],
    use_type_color: bool = True
) -> TimelineController:
    generator = BuildingGenerator()
    buildings_3d = generator.generate_all_buildings(building_data_list, use_type_color)
    return TimelineController(buildings_3d)


def load_timeline_from_json(filepath: str) -> TimelineController:
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    buildings = []
    for year_str, year_buildings in data.get('yearGroups', {}).items():
        year = int(year_str)
        for b_data in year_buildings:
            building = Building3D(
                id=b_data['id'],
                name=b_data.get('name', ''),
                coordinates=b_data['polygon'],
                height=b_data['height'],
                base_height=b_data.get('baseHeight', 0),
                build_year=year,
                floors=b_data.get('floors', int(b_data['height'] / 3)),
                property_type=b_data.get('type', '住宅'),
                color=b_data.get('color', [128, 128, 128]),
                centroid=b_data.get('centroid', [0, 0])
            )
            buildings.append(building)
    
    return TimelineController(buildings)


if __name__ == '__main__':
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../3d'))
    from building_generator import generate_sample_buildings
    
    buildings = generate_sample_buildings(300)
    timeline = TimelineController(buildings)
    
    print(f"Year range: {timeline.get_years_range()}")
    print(f"Total buildings: {timeline.get_stats().total_buildings}")
    
    data_dir = os.path.join(os.path.dirname(__file__), '../../data')
    os.makedirs(data_dir, exist_ok=True)
    
    timeline.export_to_json(
        os.path.join(data_dir, 'timeline_data.json'),
        format_type='timeline'
    )
    
    timeline.export_to_json(
        os.path.join(data_dir, 'deckgl_timeline.json'),
        format_type='deckgl'
    )
    
    frames = timeline.get_animation_frames(2000, 2020)
    print(f"Generated {len(frames)} animation frames")
