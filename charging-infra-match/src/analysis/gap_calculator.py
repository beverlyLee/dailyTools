import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from src.data.data_merger import DataMerger
from typing import List, Dict, Any

SAFE_THRESHOLD = 4.5
WARNING_THRESHOLD = 5.0


class GapCalculator:
    def __init__(self, warning_ratio: float = WARNING_THRESHOLD, use_mock: bool = True):
        self.warning_ratio = warning_ratio
        self.safe_threshold = SAFE_THRESHOLD
        self.use_mock = use_mock
        self.merger = DataMerger(use_mock=use_mock)

    def get_cities_with_gap(self) -> List[Dict[str, Any]]:
        merged_data = self.merger.get_merged_data()
        gap_cities = []

        for city in merged_data['cities']:
            if city['car_to_station_ratio'] >= self.warning_ratio:
                gap_cities.append(city)

        return sorted(gap_cities, key=lambda x: x['car_to_station_ratio'], reverse=True)

    def get_cities_safe(self) -> List[Dict[str, Any]]:
        merged_data = self.merger.get_merged_data()
        safe_cities = []

        for city in merged_data['cities']:
            if city['car_to_station_ratio'] < self.safe_threshold:
                safe_cities.append(city)

        return sorted(safe_cities, key=lambda x: x['car_to_station_ratio'])

    def get_cities_warning(self) -> List[Dict[str, Any]]:
        merged_data = self.merger.get_merged_data()
        warning_cities = []

        for city in merged_data['cities']:
            ratio = city['car_to_station_ratio']
            if self.safe_threshold <= ratio < self.warning_ratio:
                warning_cities.append(city)

        return sorted(warning_cities, key=lambda x: x['car_to_station_ratio'])

    def calculate_gap_statistics(self) -> Dict[str, Any]:
        merged_data = self.merger.get_merged_data()
        gap_cities = self.get_cities_with_gap()
        safe_cities = self.get_cities_safe()
        warning_cities = self.get_cities_warning()

        total_cities = len(merged_data['cities'])
        gap_count = len(gap_cities)
        safe_count = len(safe_cities)
        warning_count = len(warning_cities)

        total_sales = sum(city['sales'] for city in merged_data['cities'])
        gap_sales = sum(city['sales'] for city in gap_cities)
        safe_sales = sum(city['sales'] for city in safe_cities)
        warning_sales = sum(city['sales'] for city in warning_cities)

        avg_ratio = sum(city['car_to_station_ratio'] for city in merged_data['cities']) / total_cities if total_cities > 0 else 0

        return {
            'safe_threshold': self.safe_threshold,
            'warning_ratio': self.warning_ratio,
            'total_cities': total_cities,
            'gap_cities_count': gap_count,
            'warning_cities_count': warning_count,
            'safe_cities_count': safe_count,
            'gap_percentage': round((gap_count / total_cities) * 100, 2) if total_cities > 0 else 0,
            'total_sales': total_sales,
            'gap_sales': gap_sales,
            'warning_sales': warning_sales,
            'safe_sales': safe_sales,
            'gap_sales_percentage': round((gap_sales / total_sales) * 100, 2) if total_sales > 0 else 0,
            'average_ratio': round(avg_ratio, 2),
            'max_ratio': max(city['car_to_station_ratio'] for city in merged_data['cities']) if merged_data['cities'] else 0,
            'min_ratio': min(city['car_to_station_ratio'] for city in merged_data['cities']) if merged_data['cities'] else 0
        }

    def get_visualization_data(self) -> Dict[str, Any]:
        merged_data = self.merger.get_merged_data()
        statistics = self.calculate_gap_statistics()

        visualization_cities = []
        for city in merged_data['cities']:
            ratio = city['car_to_station_ratio']
            if ratio >= self.warning_ratio:
                status = 'gap'
                color = '#e74c3c'
            elif ratio >= self.safe_threshold:
                status = 'warning'
                color = '#f39c12'
            else:
                status = 'safe'
                color = '#27ae60'

            visualization_cities.append({
                **city,
                'status': status,
                'color': color
            })

        return {
            'statistics': statistics,
            'cities': visualization_cities,
            'thresholds': {
                'safe': self.safe_threshold,
                'warning': self.warning_ratio
            }
        }


if __name__ == '__main__':
    calculator = GapCalculator(warning_ratio=5.0)

    stats = calculator.calculate_gap_statistics()
    print("=== 缺口分析统计 ===")
    print(f"警戒线: {stats['warning_ratio']}:1")
    print(f"分析城市总数: {stats['total_cities']}")
    print(f"存在缺口城市: {stats['gap_cities_count']} ({stats['gap_percentage']}%)")
    print(f"安全城市: {stats['safe_cities_count']}")
    print(f"平均车桩比: {stats['average_ratio']}:1")
    print(f"最高车桩比: {stats['max_ratio']}:1")
    print()

    print("=== 存在充电缺口的城市 ===")
    for city in calculator.get_cities_with_gap():
        print(f"{city['name']}: 车桩比 {city['car_to_station_ratio']}:1 (销量: {city['sales']})")

    print()
    print("=== 充电设施充足的城市 ===")
    for city in calculator.get_cities_safe()[:5]:
        print(f"{city['name']}: 车桩比 {city['car_to_station_ratio']}:1")
