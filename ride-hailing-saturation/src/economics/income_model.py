import pandas as pd
import numpy as np
from typing import Dict, Tuple, List
from dataclasses import dataclass


@dataclass
class SaturationLevel:
    GREEN = "绿色充足"
    YELLOW = "黄色饱和"
    RED = "红色过剩"


@dataclass
class CitySaturation:
    city: str
    month: str
    saturation_level: str
    saturation_index: float
    hourly_income: float
    suggestion: str


class IncomeModel:
    def __init__(self):
        self.base_order_per_hour = 2.5
        self.base_avg_order_value = 35
        self.base_cost_per_hour = 20
        
        self.saturation_thresholds = {
            'green': 0.7,
            'yellow': 1.0,
            'red': 1.3
        }
        
        self.city_base_capacity = {
            '北京': 90000,
            '上海': 85000,
            '广州': 70000,
            '深圳': 75000,
            '杭州': 55000,
            '成都': 60000,
            '武汉': 50000,
            '西安': 45000
        }

    def calculate_saturation_index(self, driver_count: int, base_capacity: int) -> float:
        return driver_count / base_capacity

    def calculate_hourly_income(self, saturation_index: float, online_hours: float = 8) -> float:
        effective_orders = self.base_order_per_hour / max(saturation_index, 0.5)
        revenue = effective_orders * self.base_avg_order_value
        cost = self.base_cost_per_hour * (online_hours / 8)
        return revenue - cost

    def get_saturation_level(self, saturation_index: float) -> str:
        if saturation_index < self.saturation_thresholds['green']:
            return SaturationLevel.GREEN
        elif saturation_index < self.saturation_thresholds['yellow']:
            return SaturationLevel.YELLOW
        else:
            return SaturationLevel.RED

    def generate_suggestion(self, city: str, saturation_index: float, monthly_trend: List[float]) -> str:
        level = self.get_saturation_level(saturation_index)
        trend_up = all(x < y for x, y in zip(monthly_trend, monthly_trend[1:]))
        
        if level == SaturationLevel.RED:
            if trend_up and len(monthly_trend) >= 3:
                return f"{city}网约车运力已连续{len(monthly_trend)}个月处于红色过剩区，此时入行需谨慎。建议考虑其他城市或等待市场调整。"
            return f"{city}网约车运力处于红色过剩区，司机收入明显下降，建议谨慎入行或考虑转型。"
        elif level == SaturationLevel.YELLOW:
            return f"{city}网约车运力接近饱和，竞争激烈，建议全职司机慎重考虑，兼职可尝试。"
        else:
            return f"{city}网约车运力充足，市场需求旺盛，是入行的好时机。"

    def analyze_city(self, city: str, monthly_driver_data: List[Dict]) -> List[CitySaturation]:
        results = []
        base_capacity = self.city_base_capacity.get(city, 50000)
        
        monthly_saturation = []
        
        for data in monthly_driver_data:
            driver_count = data['driver_count']
            month = data['month']
            online_hours = data.get('avg_online_hours', 8)
            
            saturation_index = self.calculate_saturation_index(driver_count, base_capacity)
            hourly_income = self.calculate_hourly_income(saturation_index, online_hours)
            saturation_level = self.get_saturation_level(saturation_index)
            
            monthly_saturation.append(saturation_index)
            
            suggestion = self.generate_suggestion(city, saturation_index, monthly_saturation)
            
            results.append(CitySaturation(
                city=city,
                month=month,
                saturation_level=saturation_level,
                saturation_index=round(saturation_index, 2),
                hourly_income=round(hourly_income, 2),
                suggestion=suggestion
            ))
        
        return results

    def get_income_vs_hours_curve(self, city: str) -> Dict:
        base_capacity = self.city_base_capacity.get(city, 50000)
        
        hours_range = list(range(4, 15))
        saturation_scenarios = [0.6, 0.9, 1.2, 1.5]
        scenario_labels = ['运力充足', '接近饱和', '轻度过剩', '严重过剩']
        
        curve_data = []
        for i, saturation in enumerate(saturation_scenarios):
            for hours in hours_range:
                income = self.calculate_hourly_income(saturation, hours)
                curve_data.append({
                    'scenario': scenario_labels[i],
                    'saturation_index': saturation,
                    'online_hours': hours,
                    'hourly_income': income,
                    'daily_income': income * hours
                })
        
        return {
            'city': city,
            'curve_data': curve_data,
            'hours_range': hours_range,
            'scenarios': scenario_labels
        }


income_model = IncomeModel()


def analyze_city_saturation(city: str, monthly_data: List[Dict]) -> Dict:
    results = income_model.analyze_city(city, monthly_data)
    curve = income_model.get_income_vs_hours_curve(city)
    
    latest = results[-1]
    
    return {
        'city': city,
        'monthly_analysis': [r.__dict__ for r in results],
        'latest_saturation': latest.saturation_level,
        'latest_index': latest.saturation_index,
        'latest_hourly_income': latest.hourly_income,
        'suggestion': latest.suggestion,
        'income_curve': curve
    }
