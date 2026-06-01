import json
import os
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()


class OvertimeScraper:
    def __init__(self, use_real_data: bool = True):
        self.use_real_data = use_real_data
        self.mock_data_path = './data/overtime_data.json'
        self.real_data_path = './data/real_overtime_data.json'

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

    def get_city_overtime_data(self, city_name: str) -> Dict:
        cities = self.load_data()
        for city in cities:
            if city['name'] == city_name:
                return city
        return {}

    def parse_time_to_minutes(self, time_str: str) -> int:
        hours, minutes = map(int, time_str.split(':'))
        return hours * 60 + minutes

    def calculate_leisure_score(self, offwork_time: str, weekly_overtime_hours: float) -> float:
        offwork_minutes = self.parse_time_to_minutes(offwork_time)
        standard_offwork = 18 * 60
        time_diff = standard_offwork - offwork_minutes
        
        time_score = max(0, 50 + time_diff * 0.3)
        overtime_score = max(0, 50 - weekly_overtime_hours * 3)
        
        return round(time_score * 0.5 + overtime_score * 0.5, 2)

    def get_all_leisure_scores(self) -> Dict[str, float]:
        cities = self.load_data()
        scores = {}
        for city in cities:
            scores[city['name']] = self.calculate_leisure_score(
                city['avg_offwork_time'],
                city['weekly_overtime_hours']
            )
        return scores
