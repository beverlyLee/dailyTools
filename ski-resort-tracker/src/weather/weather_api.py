import os
import random
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import json

REAL_WEATHER_DATA = {
    "yabuli": {
        "name": "黑龙江亚布力雪场",
        "province": "黑龙江",
        "city": "哈尔滨",
        "lat": 44.6,
        "lon": 128.5,
        "altitude": 1374,
        "season_start": 11,
        "season_end": 3,
        "monthly_stats": {
            1: {"avg_temp": -18.5, "snow_days": 18, "total_snowfall": 120},
            2: {"avg_temp": -14.2, "snow_days": 15, "total_snowfall": 95},
            3: {"avg_temp": -5.8, "snow_days": 8, "total_snowfall": 45},
            4: {"avg_temp": 5.2, "snow_days": 1, "total_snowfall": 5},
            5: {"avg_temp": 13.8, "snow_days": 0, "total_snowfall": 0},
            6: {"avg_temp": 20.5, "snow_days": 0, "total_snowfall": 0},
            7: {"avg_temp": 23.2, "snow_days": 0, "total_snowfall": 0},
            8: {"avg_temp": 21.8, "snow_days": 0, "total_snowfall": 0},
            9: {"avg_temp": 14.5, "snow_days": 0, "total_snowfall": 0},
            10: {"avg_temp": 5.8, "snow_days": 2, "total_snowfall": 8},
            11: {"avg_temp": -6.2, "snow_days": 12, "total_snowfall": 65},
            12: {"avg_temp": -16.5, "snow_days": 20, "total_snowfall": 140}
        }
    },
    "wanlong": {
        "name": "万龙滑雪场",
        "province": "河北",
        "city": "张家口",
        "lat": 40.9,
        "lon": 115.5,
        "altitude": 2110,
        "season_start": 11,
        "season_end": 3,
        "monthly_stats": {
            1: {"avg_temp": -12.5, "snow_days": 15, "total_snowfall": 85},
            2: {"avg_temp": -9.2, "snow_days": 12, "total_snowfall": 70},
            3: {"avg_temp": -2.8, "snow_days": 6, "total_snowfall": 35},
            4: {"avg_temp": 8.2, "snow_days": 0, "total_snowfall": 0},
            5: {"avg_temp": 16.8, "snow_days": 0, "total_snowfall": 0},
            6: {"avg_temp": 22.5, "snow_days": 0, "total_snowfall": 0},
            7: {"avg_temp": 24.8, "snow_days": 0, "total_snowfall": 0},
            8: {"avg_temp": 23.2, "snow_days": 0, "total_snowfall": 0},
            9: {"avg_temp": 17.5, "snow_days": 0, "total_snowfall": 0},
            10: {"avg_temp": 8.8, "snow_days": 1, "total_snowfall": 3},
            11: {"avg_temp": -3.5, "snow_days": 10, "total_snowfall": 55},
            12: {"avg_temp": -10.5, "snow_days": 16, "total_snowfall": 95}
        }
    },
    "beidahu": {
        "name": "北大壶滑雪场",
        "province": "吉林",
        "city": "吉林",
        "lat": 43.2,
        "lon": 126.5,
        "altitude": 1405,
        "season_start": 11,
        "season_end": 3,
        "monthly_stats": {
            1: {"avg_temp": -16.8, "snow_days": 17, "total_snowfall": 110},
            2: {"avg_temp": -12.5, "snow_days": 14, "total_snowfall": 88},
            3: {"avg_temp": -4.5, "snow_days": 7, "total_snowfall": 42},
            4: {"avg_temp": 6.5, "snow_days": 1, "total_snowfall": 4},
            5: {"avg_temp": 14.8, "snow_days": 0, "total_snowfall": 0},
            6: {"avg_temp": 21.2, "snow_days": 0, "total_snowfall": 0},
            7: {"avg_temp": 23.8, "snow_days": 0, "total_snowfall": 0},
            8: {"avg_temp": 22.5, "snow_days": 0, "total_snowfall": 0},
            9: {"avg_temp": 15.8, "snow_days": 0, "total_snowfall": 0},
            10: {"avg_temp": 6.8, "snow_days": 2, "total_snowfall": 6},
            11: {"avg_temp": -5.2, "snow_days": 11, "total_snowfall": 60},
            12: {"avg_temp": -14.8, "snow_days": 19, "total_snowfall": 125}
        }
    },
    "xiling": {
        "name": "西岭雪山",
        "province": "四川",
        "city": "成都",
        "lat": 30.6,
        "lon": 103.2,
        "altitude": 2200,
        "season_start": 12,
        "season_end": 2,
        "monthly_stats": {
            1: {"avg_temp": -3.5, "snow_days": 12, "total_snowfall": 55},
            2: {"avg_temp": -1.2, "snow_days": 10, "total_snowfall": 45},
            3: {"avg_temp": 4.5, "snow_days": 2, "total_snowfall": 8},
            4: {"avg_temp": 10.8, "snow_days": 0, "total_snowfall": 0},
            5: {"avg_temp": 16.5, "snow_days": 0, "total_snowfall": 0},
            6: {"avg_temp": 20.2, "snow_days": 0, "total_snowfall": 0},
            7: {"avg_temp": 22.8, "snow_days": 0, "total_snowfall": 0},
            8: {"avg_temp": 22.2, "snow_days": 0, "total_snowfall": 0},
            9: {"avg_temp": 18.5, "snow_days": 0, "total_snowfall": 0},
            10: {"avg_temp": 12.8, "snow_days": 0, "total_snowfall": 0},
            11: {"avg_temp": 5.5, "snow_days": 2, "total_snowfall": 6},
            12: {"avg_temp": -1.8, "snow_days": 14, "total_snowfall": 65}
        }
    },
    "nanshan": {
        "name": "南山滑雪场",
        "province": "北京",
        "city": "北京",
        "lat": 40.2,
        "lon": 116.8,
        "altitude": 600,
        "season_start": 12,
        "season_end": 2,
        "monthly_stats": {
            1: {"avg_temp": -5.8, "snow_days": 8, "total_snowfall": 35},
            2: {"avg_temp": -3.2, "snow_days": 6, "total_snowfall": 28},
            3: {"avg_temp": 3.5, "snow_days": 1, "total_snowfall": 5},
            4: {"avg_temp": 12.8, "snow_days": 0, "total_snowfall": 0},
            5: {"avg_temp": 19.5, "snow_days": 0, "total_snowfall": 0},
            6: {"avg_temp": 24.8, "snow_days": 0, "total_snowfall": 0},
            7: {"avg_temp": 26.8, "snow_days": 0, "total_snowfall": 0},
            8: {"avg_temp": 25.5, "snow_days": 0, "total_snowfall": 0},
            9: {"avg_temp": 20.2, "snow_days": 0, "total_snowfall": 0},
            10: {"avg_temp": 12.5, "snow_days": 0, "total_snowfall": 0},
            11: {"avg_temp": 3.8, "snow_days": 2, "total_snowfall": 5},
            12: {"avg_temp": -4.2, "snow_days": 10, "total_snowfall": 45}
        }
    }
}

RESORTS_DATA = {k: {
    "name": v["name"],
    "province": v["province"],
    "city": v["city"],
    "lat": v["lat"],
    "lon": v["lon"],
    "altitude": v["altitude"],
    "season_start": v["season_start"],
    "season_end": v["season_end"]
} for k, v in REAL_WEATHER_DATA.items()}


class WeatherAPI:
    def __init__(self):
        self.api_key = os.getenv("WEATHER_API_KEY", "demo_key")
        self.base_url = "http://api.weather.com"
    
    def _get_consistent_seed(self, resort_id: str, year: int, month: int, day: int = 1) -> int:
        seed_str = f"{resort_id}_{year}_{month}_{day}"
        return hash(seed_str) % 1000000
    
    def _generate_mock_weather_data(self, resort_id: str, year: int, month: int) -> Dict:
        resort = REAL_WEATHER_DATA.get(resort_id, REAL_WEATHER_DATA["yabuli"])
        monthly_stats = resort["monthly_stats"][month]
        
        base_temp = monthly_stats["avg_temp"]
        avg_snowfall_per_day = monthly_stats["total_snowfall"] / 31
        
        days_in_month = 31 if month in [1, 3, 5, 7, 8, 10, 12] else 30 if month in [4, 6, 9, 11] else 28
        
        daily_data = []
        for day in range(1, days_in_month + 1):
            seed = self._get_consistent_seed(resort_id, year, month, day)
            rng = random.Random(seed)
            
            temp_variation = rng.uniform(-3, 3)
            temp = base_temp + temp_variation
            
            is_snow_season = (month >= resort["season_start"] or month <= resort["season_end"])
            snow_probability = self._calculate_snow_probability(temp, is_snow_season, resort["altitude"], rng)
            
            snowfall = 0
            if rng.random() < snow_probability:
                snowfall = rng.uniform(avg_snowfall_per_day * 0.5, avg_snowfall_per_day * 2)
            
            daily_data.append({
                "date": f"{year}-{month:02d}-{day:02d}",
                "temperature": round(temp, 1),
                "snowfall": round(snowfall, 1),
                "humidity": rng.randint(50, 90),
                "wind_speed": round(rng.uniform(2, 25), 1),
                "data_type": "historical"
            })
        
        return {
            "resort_id": resort_id,
            "resort_name": resort["name"],
            "year": year,
            "month": month,
            "daily_data": daily_data,
            "avg_temperature": round(sum(d["temperature"] for d in daily_data) / len(daily_data), 1),
            "total_snowfall": round(sum(d["snowfall"] for d in daily_data), 1),
            "data_source": "real_based_simulation"
        }
    
    def _get_monthly_base_temp(self, lat: float, month: int) -> float:
        temp_by_month = {
            1: -20 + (45 - lat) * 0.8,
            2: -15 + (45 - lat) * 0.8,
            3: -5 + (45 - lat) * 0.8,
            4: 5 + (45 - lat) * 0.8,
            5: 13 + (45 - lat) * 0.8,
            6: 20 + (45 - lat) * 0.8,
            7: 23 + (45 - lat) * 0.8,
            8: 21 + (45 - lat) * 0.8,
            9: 15 + (45 - lat) * 0.8,
            10: 6 + (45 - lat) * 0.8,
            11: -5 + (45 - lat) * 0.8,
            12: -15 + (45 - lat) * 0.8
        }
        return temp_by_month.get(month, 0)
    
    def _calculate_snow_probability(self, temp: float, is_snow_season: bool, altitude: float, rng=None) -> float:
        if rng is None:
            rng = random.Random()
        
        if not is_snow_season:
            return 0.05 if temp < 0 else 0.01
        
        base_prob = 0.3
        if temp < -10:
            base_prob += 0.3
        elif temp < -5:
            base_prob += 0.2
        elif temp < 0:
            base_prob += 0.1
        else:
            base_prob -= 0.2
        
        altitude_factor = min(altitude / 2000, 1.0)
        base_prob *= (0.5 + altitude_factor * 0.5)
        
        return max(0.05, min(0.9, base_prob))
    
    def get_monthly_weather(self, resort_id: str, year: int, month: int) -> Dict:
        return self._generate_mock_weather_data(resort_id, year, month)
    
    def get_weekly_forecast(self, resort_id: str, start_date: datetime = None, days: int = 7) -> Dict:
        if start_date is None:
            start_date = datetime.now()
        
        resort = REAL_WEATHER_DATA.get(resort_id, REAL_WEATHER_DATA["yabuli"])
        
        forecast = []
        for i in range(days):
            date = start_date + timedelta(days=i)
            month = date.month
            monthly_stats = resort["monthly_stats"][month]
            
            seed = self._get_consistent_seed(resort_id, date.year, month, date.day + 1000)
            rng = random.Random(seed)
            
            base_temp = monthly_stats["avg_temp"]
            temp_variation = rng.uniform(-4, 4)
            temp = base_temp + temp_variation
            
            is_snow_season = (month >= resort["season_start"] or month <= resort["season_end"])
            snow_probability = self._calculate_snow_probability(temp, is_snow_season, resort["altitude"], rng)
            
            avg_snowfall_per_day = monthly_stats["total_snowfall"] / 31
            snowfall = 0
            if rng.random() < snow_probability:
                snowfall = rng.uniform(avg_snowfall_per_day * 0.3, avg_snowfall_per_day * 1.5)
            
            forecast.append({
                "date": date.strftime("%Y-%m-%d"),
                "weekday": date.strftime("%A"),
                "temperature": round(temp, 1),
                "snowfall": round(snowfall, 1),
                "snow_probability": round(snow_probability * 100, 0),
                "humidity": rng.randint(50, 90),
                "wind_speed": round(rng.uniform(2, 20), 1),
                "weather_condition": self._get_weather_condition(temp, snowfall),
                "data_type": "forecast"
            })
        
        return {
            "resort_id": resort_id,
            "resort_name": resort["name"],
            "forecast_period": f"{days}天",
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": (start_date + timedelta(days=days-1)).strftime("%Y-%m-%d"),
            "forecast": forecast
        }
    
    def _get_weather_condition(self, temp: float, snowfall: float) -> str:
        if snowfall > 10:
            return "暴雪"
        elif snowfall > 5:
            return "中雪"
        elif snowfall > 0:
            return "小雪"
        elif temp < -10:
            return "晴朗极寒"
        elif temp < -5:
            return "晴朗寒冷"
        elif temp < 0:
            return "晴冷"
        else:
            return "多云"
    
    def get_yearly_calendar(self, resort_id: str, year: int) -> Dict:
        monthly_data = []
        for month in range(1, 13):
            weather = self.get_monthly_weather(resort_id, year, month)
            monthly_data.append({
                "month": month,
                "avg_temperature": weather["avg_temperature"],
                "total_snowfall": weather["total_snowfall"],
                "snow_days": sum(1 for d in weather["daily_data"] if d["snowfall"] > 0),
                "daily_data": weather["daily_data"]
            })
        
        return {
            "resort_id": resort_id,
            "resort_name": RESORTS_DATA[resort_id]["name"],
            "year": year,
            "monthly_data": monthly_data
        }
    
    def get_all_resorts(self) -> Dict[str, Dict]:
        return RESORTS_DATA
    
    def get_resort_info(self, resort_id: str) -> Dict:
        return RESORTS_DATA.get(resort_id, {})
