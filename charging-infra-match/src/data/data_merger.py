import json
import os
from typing import List, Dict, Any


class DataMerger:
    def __init__(self, data_dir: str = None, use_mock: bool = True):
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
        self.data_dir = data_dir
        self.use_mock = use_mock
        self.ev_sales_file = os.path.join(data_dir, 'ev_sales_data.json')
        self.charging_file = os.path.join(data_dir, 'charging_stations_data.json')
        self.real_ev_sales_file = os.path.join(data_dir, 'real_ev_sales_data.json')
        self.real_charging_file = os.path.join(data_dir, 'real_charging_stations_data.json')

    def load_ev_sales_data(self) -> Dict[str, Any]:
        file_path = self.ev_sales_file if self.use_mock else self.real_ev_sales_file
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return self._generate_default_ev_data()

    def load_charging_data(self) -> Dict[str, Any]:
        file_path = self.charging_file if self.use_mock else self.real_charging_file
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return self._generate_default_charging_data()

    def _generate_default_ev_data(self) -> Dict[str, Any]:
        return {
            "description": "默认模拟数据",
            "year": 2024,
            "cities": []
        }

    def _generate_default_charging_data(self) -> Dict[str, Any]:
        return {
            "description": "默认模拟数据",
            "year": 2024,
            "cities": []
        }

    def merge_data(self) -> List[Dict[str, Any]]:
        ev_data = self.load_ev_sales_data()
        charging_data = self.load_charging_data()

        ev_cities = {city['name']: city for city in ev_data['cities']}
        charging_cities = {city['name']: city for city in charging_data['cities']}

        merged_data = []
        all_cities = set(ev_cities.keys()) | set(charging_cities.keys())

        for city_name in all_cities:
            ev_city = ev_cities.get(city_name, {})
            charging_city = charging_cities.get(city_name, {})

            sales = ev_city.get('sales', 0)
            stations = charging_city.get('stations', 0)
            public_stations = charging_city.get('public_stations', 0)

            if stations > 0:
                car_to_station_ratio = round(sales / stations, 2)
            else:
                car_to_station_ratio = float('inf')

            merged_city = {
                'name': city_name,
                'sales': sales,
                'stations': stations,
                'public_stations': public_stations,
                'car_to_station_ratio': car_to_station_ratio,
                'lng': ev_city.get('lng', 0),
                'lat': ev_city.get('lat', 0)
            }
            merged_data.append(merged_city)

        return sorted(merged_data, key=lambda x: x['sales'], reverse=True)

    def get_merged_data(self) -> Dict[str, Any]:
        merged_cities = self.merge_data()
        return {
            'description': '车桩比合并分析数据',
            'year': 2024,
            'total_cities': len(merged_cities),
            'cities': merged_cities
        }


if __name__ == '__main__':
    merger = DataMerger()
    result = merger.get_merged_data()
    print(f"共合并 {result['total_cities']} 个城市数据")
    for city in result['cities'][:5]:
        print(f"{city['name']}: 销量={city['sales']}, 充电桩={city['stations']}, 车桩比={city['car_to_station_ratio']}:1")
