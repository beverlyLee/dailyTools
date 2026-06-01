import json
import os
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()


class SleepDataLoader:
    def __init__(self, use_real_data: bool = True):
        self.use_real_data = use_real_data
        self.mock_data_path = './data/sleep_data.json'
        self.real_data_path = './data/real_sleep_data.json'

    def set_data_source(self, use_real_data: bool):
        self.use_real_data = use_real_data

    def get_data_source_info(self) -> Dict:
        data_path = self.real_data_path if self.use_real_data else self.mock_data_path
        try:
            with open(data_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return {
                    'type': '真实公开数据' if self.use_real_data else '模拟演示数据',
                    'source': data.get('source', '内部模拟数据'),
                    'references': data.get('references', []),
                    'last_updated': data.get('data_last_updated', '未知'),
                    'key_findings': data.get('key_findings', [])
                }
        except:
            return {
                'type': '真实公开数据' if self.use_real_data else '模拟演示数据',
                'source': '数据加载失败',
                'references': [],
                'last_updated': '未知'
            }

    def load_data(self) -> List[Dict]:
        data_path = self.real_data_path if self.use_real_data else self.mock_data_path
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('cities', [])

    def get_city_sleep_data(self, city_name: str) -> Dict:
        cities = self.load_data()
        for city in cities:
            if city['name'] == city_name:
                return city
        return {}

    def calculate_sleep_score(self, sleep_hours: float) -> float:
        if sleep_hours >= 8:
            return 100
        elif sleep_hours >= 7:
            return 80 + (sleep_hours - 7) * 20
        elif sleep_hours >= 6:
            return 60 + (sleep_hours - 6) * 20
        else:
            return max(0, sleep_hours * 10)

    def get_all_sleep_scores(self) -> Dict[str, float]:
        cities = self.load_data()
        scores = {}
        for city in cities:
            scores[city['name']] = self.calculate_sleep_score(city['avg_sleep_hours'])
        return scores
