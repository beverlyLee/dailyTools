import os
import sys
import json
import numpy as np
from typing import List, Dict, Tuple
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATA_DIR


class StudentCPI:
    def __init__(self):
        self.base_year = 2020
        self.official_cpi = self._load_official_cpi()
        self.mock_prices = self._generate_mock_price_data()
        
    def _load_official_cpi(self) -> Dict:
        return {
            2020: 102.5,
            2021: 100.9,
            2022: 102.0,
            2023: 100.2,
            2024: 100.3
        }
    
    def _generate_mock_price_data(self) -> Dict:
        return {
            2020: {'rice_avg': 10.0, 'noodle_avg': 12.0, 'sample_count': 150},
            2021: {'rice_avg': 11.5, 'noodle_avg': 13.5, 'sample_count': 180},
            2022: {'rice_avg': 13.0, 'noodle_avg': 15.0, 'sample_count': 220},
            2023: {'rice_avg': 14.5, 'noodle_avg': 16.5, 'sample_count': 250},
            2024: {'rice_avg': 16.0, 'noodle_avg': 18.0, 'sample_count': 200}
        }
    
    def calculate_rice_index(self, year: int) -> float:
        base_price = self.mock_prices[self.base_year]['rice_avg']
        current_price = self.mock_prices[year]['rice_avg']
        return (current_price / base_price) * 100
    
    def calculate_noodle_index(self, year: int) -> float:
        base_price = self.mock_prices[self.base_year]['noodle_avg']
        current_price = self.mock_prices[year]['noodle_avg']
        return (current_price / base_price) * 100
    
    def calculate_student_cpi(self, year: int) -> float:
        rice_index = self.calculate_rice_index(year)
        noodle_index = self.calculate_noodle_index(year)
        return 0.6 * rice_index + 0.4 * noodle_index
    
    def get_yearly_data(self) -> List[Dict]:
        yearly_data = []
        years = sorted(self.mock_prices.keys())
        
        for year in years:
            student_cpi = self.calculate_student_cpi(year)
            student_cpi_growth = ((student_cpi - 100) / 100) * 100 if year == self.base_year else \
                ((student_cpi - self.calculate_student_cpi(year - 1)) / self.calculate_student_cpi(year - 1)) * 100
            
            official_cpi = self.official_cpi[year]
            official_growth = official_cpi - 100
            
            yearly_data.append({
                'year': year,
                'student_cpi': round(student_cpi, 2),
                'student_cpi_growth': round(student_cpi_growth, 2),
                'official_cpi': official_cpi,
                'official_growth': round(official_growth, 2),
                'rice_index': round(self.calculate_rice_index(year), 2),
                'noodle_index': round(self.calculate_noodle_index(year), 2),
                'rice_price': self.mock_prices[year]['rice_avg'],
                'noodle_price': self.mock_prices[year]['noodle_avg'],
                'sample_count': self.mock_prices[year]['sample_count']
            })
        
        return yearly_data
    
    def get_hot_posts_by_year(self, year: int) -> List[Dict]:
        hot_posts = {
            2020: [
                {'title': '学校食堂盖饭从8块涨到10块了！！', 'content': '刚开学发现三食堂盖饭涨了2块，吃不起了...', 'likes': 234},
                {'title': '吐槽一下食堂的物价', 'content': '为什么面条也涨了1块？疫情后都涨价吗？', 'likes': 156}
            ],
            2021: [
                {'title': '一年涨一次，一次涨一块', 'content': '去年10块，今年11.5，明年是不是13？', 'likes': 456},
                {'title': '某211食堂涨价实录', 'content': '统计了一下，平均涨幅15%左右', 'likes': 321}
            ],
            2022: [
                {'title': '这食堂价格涨得比工资还快', 'content': '盖饭13了，我记得三年前才8块啊', 'likes': 567},
                {'title': '大家来晒晒学校食堂价格', 'content': '我们学校一荤两素15了，还有更贵的吗？', 'likes': 432}
            ],
            2023: [
                {'title': '食堂又双叒涨价了！！', 'content': '通知说因为原材料涨价，可我看市场菜价没涨啊', 'likes': 789},
                {'title': '毕业前吃不起食堂系列', 'content': '面条16.5一碗，这让学生怎么活', 'likes': 654}
            ],
            2024: [
                {'title': '五年涨幅60%，食堂这是抢钱啊', 'content': '2020年10块的盖饭现在16了，CPI才涨多少？', 'likes': 1023},
                {'title': '建议学校食堂改名叫米其林', 'content': '这价格对得起味道吗？越来越贵越来越难吃', 'likes': 876}
            ]
        }
        return hot_posts.get(year, [])
    
    def get_comparison_data(self) -> Dict:
        yearly_data = self.get_yearly_data()
        
        first_year = yearly_data[0]
        last_year = yearly_data[-1]
        
        student_total_growth = ((last_year['student_cpi'] - first_year['student_cpi']) / first_year['student_cpi']) * 100
        official_total_growth = ((last_year['official_cpi'] - first_year['official_cpi']) / first_year['official_cpi']) * 100
        
        return {
            'yearly_data': yearly_data,
            'summary': {
                'period': f"{first_year['year']}-{last_year['year']}",
                'student_total_growth': round(student_total_growth, 2),
                'official_total_growth': round(official_total_growth, 2),
                'growth_gap': round(student_total_growth - official_total_growth, 2)
            }
        }
    
    def load_posts_from_file(self, filename: str = 'posts_data.json') -> List[Dict]:
        filepath = os.path.join(DATA_DIR, filename)
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []


if __name__ == '__main__':
    cpi_calculator = StudentCPI()
    data = cpi_calculator.get_comparison_data()
    print(json.dumps(data, ensure_ascii=False, indent=2))
