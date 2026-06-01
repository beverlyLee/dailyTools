from typing import List, Dict
from src.data_pipeline import SleepDataLoader, OvertimeScraper


class FlatnessScorer:
    def __init__(self, use_real_data: bool = True):
        self.sleep_loader = SleepDataLoader(use_real_data)
        self.overtime_scraper = OvertimeScraper(use_real_data)

    def set_data_source(self, use_real_data: bool):
        self.sleep_loader.set_data_source(use_real_data)
        self.overtime_scraper.set_data_source(use_real_data)

    def get_data_source_info(self) -> Dict:
        sleep_info = self.sleep_loader.get_data_source_info()
        overtime_info = self.overtime_scraper.get_data_source_info()
        return {
            'sleep_data': sleep_info,
            'overtime_data': overtime_info
        }

    def calculate_flatness_index(self, city_name: str) -> Dict:
        sleep_data = self.sleep_loader.get_city_sleep_data(city_name)
        overtime_data = self.overtime_scraper.get_city_overtime_data(city_name)

        if not sleep_data or not overtime_data:
            return {}

        sleep_score = self.sleep_loader.calculate_sleep_score(sleep_data['avg_sleep_hours'])
        leisure_score = self.overtime_scraper.calculate_leisure_score(
            overtime_data['avg_offwork_time'],
            overtime_data['weekly_overtime_hours']
        )

        flatness_index = sleep_score * 0.5 + leisure_score * 0.5

        return {
            'city': city_name,
            'avg_sleep_hours': sleep_data['avg_sleep_hours'],
            'avg_bedtime': sleep_data['avg_bedtime'],
            'avg_offwork_time': overtime_data['avg_offwork_time'],
            'weekly_overtime_hours': overtime_data['weekly_overtime_hours'],
            'sleep_score': round(sleep_score, 2),
            'leisure_score': round(leisure_score, 2),
            'flatness_index': round(flatness_index, 2),
            'data_source': sleep_data.get('source', '未标注')
        }

    def get_all_cities_ranking(self) -> List[Dict]:
        sleep_cities = self.sleep_loader.load_data()
        rankings = []

        for city in sleep_cities:
            result = self.calculate_flatness_index(city['name'])
            if result:
                rankings.append(result)

        rankings.sort(key=lambda x: x['flatness_index'], reverse=True)

        for i, city in enumerate(rankings):
            city['rank'] = i + 1

        return rankings

    def get_radar_chart_data(self, cities: List[str]) -> Dict:
        indicators = [
            {'name': '睡眠时长', 'max': 100},
            {'name': '休闲时间', 'max': 100},
            {'name': '下班早晚', 'max': 100},
            {'name': '加班强度', 'max': 100},
            {'name': '生活节奏', 'max': 100}
        ]

        series_data = []
        for city_name in cities:
            city_data = self.calculate_flatness_index(city_name)
            if city_data:
                overtime_data = self.overtime_scraper.get_city_overtime_data(city_name)
                overtime_heat = overtime_data.get('overtime_heat_score', 50)
                offwork_score = 100 - (overtime_heat * 0.8)
                overtime_intensity = 100 - overtime_heat
                life_pace = (city_data['sleep_score'] + city_data['leisure_score']) / 2

                series_data.append({
                    'name': city_name,
                    'value': [
                        city_data['sleep_score'],
                        city_data['leisure_score'],
                        round(offwork_score, 2),
                        round(overtime_intensity, 2),
                        round(life_pace, 2)
                    ]
                })

        return {
            'indicators': indicators,
            'series': series_data
        }
