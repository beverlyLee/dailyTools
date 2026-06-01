import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional


class DriverOnlineData:
    def __init__(self):
        self.cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安']
        self.monthly_data = self._generate_monthly_data()
        self.hourly_data = self._generate_hourly_data()

    def _generate_monthly_data(self) -> pd.DataFrame:
        base_drivers = {
            '北京': 80000,
            '上海': 75000,
            '广州': 60000,
            '深圳': 65000,
            '杭州': 45000,
            '成都': 50000,
            '武汉': 40000,
            '西安': 35000
        }
        
        data = []
        months = ['2024-03', '2024-04', '2024-05']
        
        for city in self.cities:
            base = base_drivers[city]
            for i, month in enumerate(months):
                growth = 1 + i * 0.15
                driver_count = int(base * growth)
                data.append({
                    'city': city,
                    'month': month,
                    'driver_count': driver_count,
                    'avg_online_hours': 8.5 + np.random.uniform(-1, 2)
                })
        
        return pd.DataFrame(data)

    def _generate_hourly_data(self) -> pd.DataFrame:
        data = []
        hours = list(range(24))
        
        for city in self.cities[:4]:
            base_drivers = self.monthly_data[self.monthly_data['city'] == city]['driver_count'].mean()
            
            for hour in hours:
                hour_factor = self._get_hour_factor(hour)
                online_drivers = int(base_drivers * 0.3 * hour_factor)
                
                data.append({
                    'city': city,
                    'hour': hour,
                    'online_drivers': online_drivers,
                    'hour_factor': hour_factor
                })
        
        return pd.DataFrame(data)

    def _get_hour_factor(self, hour: int) -> float:
        if 7 <= hour <= 9:
            return 1.5
        elif 17 <= hour <= 19:
            return 1.8
        elif 0 <= hour <= 5:
            return 0.3
        else:
            return 1.0

    def get_city_monthly_data(self, city: str) -> pd.DataFrame:
        return self.monthly_data[self.monthly_data['city'] == city].copy()

    def get_all_cities_latest(self) -> pd.DataFrame:
        latest = self.monthly_data.groupby('city').last().reset_index()
        return latest

    def get_hourly_distribution(self, city: str) -> pd.DataFrame:
        return self.hourly_data[self.hourly_data['city'] == city].copy()

    def calculate_growth_rate(self, city: str) -> float:
        city_data = self.get_city_monthly_data(city)
        if len(city_data) < 2:
            return 0.0
        first = city_data.iloc[0]['driver_count']
        last = city_data.iloc[-1]['driver_count']
        return (last - first) / first * 100


driver_data = DriverOnlineData()


def get_driver_online_stats(city: Optional[str] = None) -> Dict:
    if city:
        data = driver_data.get_city_monthly_data(city)
        hourly = driver_data.get_hourly_distribution(city)
        growth_rate = driver_data.calculate_growth_rate(city)
        
        return {
            'city': city,
            'monthly_data': data.to_dict('records'),
            'hourly_data': hourly.to_dict('records'),
            'growth_rate': round(growth_rate, 2),
            'latest_count': int(data.iloc[-1]['driver_count'])
        }
    else:
        all_data = driver_data.get_all_cities_latest()
        return {
            'cities': all_data.to_dict('records')
        }
