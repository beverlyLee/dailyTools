"""
中国城市空气质量数据源模块
基于公开历史数据统计特征生成模拟数据
"""
import os
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dotenv import load_dotenv

load_dotenv()


class AQIDataSource:
    """空气质量数据源"""

    def __init__(self):
        self.city_profiles = self._load_city_profiles()

    def _load_city_profiles(self) -> Dict:
        """加载城市空气质量特征档案"""
        return {
            "北京": {
                "base_aqi": 85,
                "seasonal_amplitude": 0.45,
                "winter_peak": 1.6,
                "summer_low": 0.6,
                "pm25_ratio": 0.65,
                "pm10_ratio": 0.95,
                "winter_temp_base": -2,
                "summer_temp_base": 28,
                "wind_profile": {"winter": 2.5, "summer": 2.0, "polluted": 1.2},
                "heavy_pollution_freq": 0.15,
                "pollution_duration": 3
            },
            "上海": {
                "base_aqi": 60,
                "seasonal_amplitude": 0.35,
                "winter_peak": 1.4,
                "summer_low": 0.7,
                "pm25_ratio": 0.55,
                "pm10_ratio": 0.85,
                "winter_temp_base": 5,
                "summer_temp_base": 30,
                "wind_profile": {"winter": 3.0, "summer": 2.5, "polluted": 1.5},
                "heavy_pollution_freq": 0.08,
                "pollution_duration": 2
            },
            "广州": {
                "base_aqi": 50,
                "seasonal_amplitude": 0.25,
                "winter_peak": 1.3,
                "summer_low": 0.8,
                "pm25_ratio": 0.50,
                "pm10_ratio": 0.80,
                "winter_temp_base": 15,
                "summer_temp_base": 32,
                "wind_profile": {"winter": 2.5, "summer": 2.0, "polluted": 1.8},
                "heavy_pollution_freq": 0.04,
                "pollution_duration": 2
            },
            "深圳": {
                "base_aqi": 40,
                "seasonal_amplitude": 0.20,
                "winter_peak": 1.25,
                "summer_low": 0.85,
                "pm25_ratio": 0.48,
                "pm10_ratio": 0.75,
                "winter_temp_base": 18,
                "summer_temp_base": 31,
                "wind_profile": {"winter": 3.0, "summer": 2.8, "polluted": 2.0},
                "heavy_pollution_freq": 0.02,
                "pollution_duration": 1
            },
            "石家庄": {
                "base_aqi": 115,
                "seasonal_amplitude": 0.55,
                "winter_peak": 2.0,
                "summer_low": 0.5,
                "pm25_ratio": 0.72,
                "pm10_ratio": 1.10,
                "winter_temp_base": -3,
                "summer_temp_base": 27,
                "wind_profile": {"winter": 1.8, "summer": 1.5, "polluted": 0.8},
                "heavy_pollution_freq": 0.25,
                "pollution_duration": 5
            },
            "海口": {
                "base_aqi": 32,
                "seasonal_amplitude": 0.15,
                "winter_peak": 1.15,
                "summer_low": 0.90,
                "pm25_ratio": 0.38,
                "pm10_ratio": 0.60,
                "winter_temp_base": 20,
                "summer_temp_base": 32,
                "wind_profile": {"winter": 3.5, "summer": 3.2, "polluted": 2.5},
                "heavy_pollution_freq": 0.005,
                "pollution_duration": 1
            },
            "天津": {
                "base_aqi": 80,
                "seasonal_amplitude": 0.42,
                "winter_peak": 1.55,
                "summer_low": 0.62,
                "pm25_ratio": 0.62,
                "pm10_ratio": 0.98,
                "winter_temp_base": -1,
                "summer_temp_base": 27,
                "wind_profile": {"winter": 2.8, "summer": 2.2, "polluted": 1.3},
                "heavy_pollution_freq": 0.12,
                "pollution_duration": 3
            },
            "重庆": {
                "base_aqi": 65,
                "seasonal_amplitude": 0.30,
                "winter_peak": 1.35,
                "summer_low": 0.75,
                "pm25_ratio": 0.58,
                "pm10_ratio": 0.88,
                "winter_temp_base": 8,
                "summer_temp_base": 29,
                "wind_profile": {"winter": 1.5, "summer": 1.2, "polluted": 0.9},
                "heavy_pollution_freq": 0.10,
                "pollution_duration": 3
            },
            "成都": {
                "base_aqi": 72,
                "seasonal_amplitude": 0.38,
                "winter_peak": 1.45,
                "summer_low": 0.68,
                "pm25_ratio": 0.60,
                "pm10_ratio": 0.90,
                "winter_temp_base": 6,
                "summer_temp_base": 26,
                "wind_profile": {"winter": 1.2, "summer": 1.0, "polluted": 0.7},
                "heavy_pollution_freq": 0.14,
                "pollution_duration": 4
            },
            "西安": {
                "base_aqi": 90,
                "seasonal_amplitude": 0.48,
                "winter_peak": 1.7,
                "summer_low": 0.58,
                "pm25_ratio": 0.68,
                "pm10_ratio": 1.05,
                "winter_temp_base": 0,
                "summer_temp_base": 27,
                "wind_profile": {"winter": 2.0, "summer": 1.8, "polluted": 1.0},
                "heavy_pollution_freq": 0.18,
                "pollution_duration": 4
            },
            "武汉": {
                "base_aqi": 68,
                "seasonal_amplitude": 0.35,
                "winter_peak": 1.4,
                "summer_low": 0.7,
                "pm25_ratio": 0.56,
                "pm10_ratio": 0.86,
                "winter_temp_base": 5,
                "summer_temp_base": 30,
                "wind_profile": {"winter": 2.2, "summer": 2.0, "polluted": 1.2},
                "heavy_pollution_freq": 0.10,
                "pollution_duration": 3
            },
            "杭州": {
                "base_aqi": 58,
                "seasonal_amplitude": 0.32,
                "winter_peak": 1.35,
                "summer_low": 0.72,
                "pm25_ratio": 0.52,
                "pm10_ratio": 0.82,
                "winter_temp_base": 6,
                "summer_temp_base": 29,
                "wind_profile": {"winter": 2.5, "summer": 2.2, "polluted": 1.4},
                "heavy_pollution_freq": 0.07,
                "pollution_duration": 2
            },
            "南京": {
                "base_aqi": 62,
                "seasonal_amplitude": 0.34,
                "winter_peak": 1.38,
                "summer_low": 0.70,
                "pm25_ratio": 0.54,
                "pm10_ratio": 0.84,
                "winter_temp_base": 5,
                "summer_temp_base": 29,
                "wind_profile": {"winter": 2.4, "summer": 2.1, "polluted": 1.3},
                "heavy_pollution_freq": 0.08,
                "pollution_duration": 2
            },
            "苏州": {
                "base_aqi": 55,
                "seasonal_amplitude": 0.30,
                "winter_peak": 1.30,
                "summer_low": 0.75,
                "pm25_ratio": 0.50,
                "pm10_ratio": 0.80,
                "winter_temp_base": 6,
                "summer_temp_base": 29,
                "wind_profile": {"winter": 2.6, "summer": 2.3, "polluted": 1.5},
                "heavy_pollution_freq": 0.06,
                "pollution_duration": 2
            },
            "郑州": {
                "base_aqi": 95,
                "seasonal_amplitude": 0.50,
                "winter_peak": 1.75,
                "summer_low": 0.55,
                "pm25_ratio": 0.66,
                "pm10_ratio": 1.02,
                "winter_temp_base": 2,
                "summer_temp_base": 27,
                "wind_profile": {"winter": 2.2, "summer": 1.9, "polluted": 1.0},
                "heavy_pollution_freq": 0.20,
                "pollution_duration": 4
            },
            "济南": {
                "base_aqi": 88,
                "seasonal_amplitude": 0.46,
                "winter_peak": 1.65,
                "summer_low": 0.58,
                "pm25_ratio": 0.64,
                "pm10_ratio": 0.99,
                "winter_temp_base": 2,
                "summer_temp_base": 27,
                "wind_profile": {"winter": 2.4, "summer": 2.1, "polluted": 1.1},
                "heavy_pollution_freq": 0.16,
                "pollution_duration": 3
            },
            "沈阳": {
                "base_aqi": 75,
                "seasonal_amplitude": 0.40,
                "winter_peak": 1.50,
                "summer_low": 0.65,
                "pm25_ratio": 0.58,
                "pm10_ratio": 0.92,
                "winter_temp_base": -10,
                "summer_temp_base": 25,
                "wind_profile": {"winter": 3.0, "summer": 2.6, "polluted": 1.4},
                "heavy_pollution_freq": 0.12,
                "pollution_duration": 3
            },
            "哈尔滨": {
                "base_aqi": 68,
                "seasonal_amplitude": 0.38,
                "winter_peak": 1.45,
                "summer_low": 0.68,
                "pm25_ratio": 0.55,
                "pm10_ratio": 0.88,
                "winter_temp_base": -18,
                "summer_temp_base": 23,
                "wind_profile": {"winter": 3.2, "summer": 2.8, "polluted": 1.5},
                "heavy_pollution_freq": 0.10,
                "pollution_duration": 3
            },
            "长春": {
                "base_aqi": 65,
                "seasonal_amplitude": 0.36,
                "winter_peak": 1.42,
                "summer_low": 0.70,
                "pm25_ratio": 0.54,
                "pm10_ratio": 0.86,
                "winter_temp_base": -14,
                "summer_temp_base": 24,
                "wind_profile": {"winter": 3.1, "summer": 2.7, "polluted": 1.45},
                "heavy_pollution_freq": 0.09,
                "pollution_duration": 3
            },
            "太原": {
                "base_aqi": 85,
                "seasonal_amplitude": 0.44,
                "winter_peak": 1.60,
                "summer_low": 0.60,
                "pm25_ratio": 0.63,
                "pm10_ratio": 0.98,
                "winter_temp_base": -5,
                "summer_temp_base": 24,
                "wind_profile": {"winter": 2.0, "summer": 1.7, "polluted": 0.9},
                "heavy_pollution_freq": 0.15,
                "pollution_duration": 4
            },
            "合肥": {
                "base_aqi": 64,
                "seasonal_amplitude": 0.33,
                "winter_peak": 1.36,
                "summer_low": 0.73,
                "pm25_ratio": 0.53,
                "pm10_ratio": 0.83,
                "winter_temp_base": 5,
                "summer_temp_base": 29,
                "wind_profile": {"winter": 2.3, "summer": 2.0, "polluted": 1.25},
                "heavy_pollution_freq": 0.09,
                "pollution_duration": 2
            },
            "长沙": {
                "base_aqi": 56,
                "seasonal_amplitude": 0.28,
                "winter_peak": 1.28,
                "summer_low": 0.78,
                "pm25_ratio": 0.50,
                "pm10_ratio": 0.79,
                "winter_temp_base": 6,
                "summer_temp_base": 29,
                "wind_profile": {"winter": 2.1, "summer": 1.8, "polluted": 1.3},
                "heavy_pollution_freq": 0.06,
                "pollution_duration": 2
            },
            "南宁": {
                "base_aqi": 45,
                "seasonal_amplitude": 0.22,
                "winter_peak": 1.20,
                "summer_low": 0.85,
                "pm25_ratio": 0.45,
                "pm10_ratio": 0.72,
                "winter_temp_base": 14,
                "summer_temp_base": 30,
                "wind_profile": {"winter": 2.8, "summer": 2.5, "polluted": 1.8},
                "heavy_pollution_freq": 0.03,
                "pollution_duration": 1
            },
            "昆明": {
                "base_aqi": 38,
                "seasonal_amplitude": 0.18,
                "winter_peak": 1.12,
                "summer_low": 0.92,
                "pm25_ratio": 0.42,
                "pm10_ratio": 0.68,
                "winter_temp_base": 10,
                "summer_temp_base": 20,
                "wind_profile": {"winter": 2.5, "summer": 2.2, "polluted": 1.6},
                "heavy_pollution_freq": 0.01,
                "pollution_duration": 1
            }
        }

    def get_real_time_aqi(self, city_name: str) -> Optional[Dict]:
        """获取指定城市的实时AQI数据（模拟）"""
        profile = self.city_profiles.get(city_name, self.city_profiles["北京"])
        today = datetime.now()

        base_aqi = profile["base_aqi"]
        month = today.month

        if month in [11, 12, 1, 2]:
            seasonal_factor = profile["winter_peak"]
        elif month in [6, 7, 8]:
            seasonal_factor = profile["summer_low"]
        else:
            seasonal_factor = 1.0

        daily_noise = np.random.normal(0, 0.15)
        aqi = int(base_aqi * seasonal_factor * (1 + daily_noise))
        aqi = max(10, min(500, aqi))

        pm25 = int(aqi * profile["pm25_ratio"] + np.random.normal(0, 8))
        pm10 = int(aqi * profile["pm10_ratio"] + np.random.normal(0, 12))
        so2 = int(np.random.uniform(5, 35))
        no2 = int(np.random.uniform(18, 65))
        co = round(np.random.uniform(0.4, 2.8), 1)
        o3 = int(np.random.uniform(35, 140))

        if aqi <= 50:
            level = "优"
        elif aqi <= 100:
            level = "良"
        elif aqi <= 150:
            level = "轻度污染"
        elif aqi <= 200:
            level = "中度污染"
        elif aqi <= 300:
            level = "重度污染"
        else:
            level = "严重污染"

        if month in [11, 12, 1, 2]:
            temp_base = profile["winter_temp_base"]
            wind_speed = profile["wind_profile"]["winter"]
        else:
            temp_base = profile["summer_temp_base"]
            wind_speed = profile["wind_profile"]["summer"]

        temperature = temp_base + np.random.normal(0, 5)
        humidity = int(np.random.uniform(40, 85))

        return {
            "city": city_name,
            "aqi": aqi,
            "level": level,
            "primary_pollutant": "PM2.5" if pm25/75 > pm10/150 else "PM10",
            "pm25": max(0, pm25),
            "pm10": max(0, pm10),
            "so2": so2,
            "no2": no2,
            "co": co,
            "o3": o3,
            "temperature": round(temperature, 1),
            "humidity": humidity,
            "wind_speed": round(wind_speed + np.random.normal(0, 0.5), 1),
            "wind_direction": np.random.choice(["北风", "南风", "东风", "西风", "东北风", "东南风", "西北风", "西南风"]),
            "weather": np.random.choice(["晴", "多云", "阴", "小雨", "雾", "霾"],
                                       p=[0.3, 0.25, 0.15, 0.1, 0.1, 0.1]),
            "update_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    def get_historical_data(
        self,
        city_name: str,
        start_date: datetime,
        end_date: datetime
    ) -> pd.DataFrame:
        """获取指定城市的历史AQI数据（基于真实统计特征模拟）"""
        date_range = pd.date_range(start=start_date, end=end_date, freq='D')
        profile = self.city_profiles.get(city_name, self.city_profiles["北京"])

        base_aqi = profile["base_aqi"]
        data = []

        start_datetime = datetime.combine(start_date, datetime.min.time()) if isinstance(start_date, type(datetime.now().date())) else start_date
        np.random.seed(hash(city_name) % 10000 + int(start_datetime.timestamp()) % 10000)

        pollution_episodes = []
        day_idx = 0
        while day_idx < len(date_range):
            if np.random.random() < profile["heavy_pollution_freq"] / profile["pollution_duration"]:
                duration = min(profile["pollution_duration"], len(date_range) - day_idx)
                pollution_episodes.extend(range(day_idx, day_idx + duration))
                day_idx += duration
            else:
                day_idx += 1

        for i, date in enumerate(date_range):
            month = date.month
            day_of_year = date.timetuple().tm_yday

            if month in [11, 12, 1, 2, 3]:
                seasonal_factor = profile["winter_peak"] * (
                    1 + 0.2 * np.sin(day_of_year * 0.02)
                )
                temp_base = profile["winter_temp_base"]
                wind_base = profile["wind_profile"]["winter"]
            elif month in [6, 7, 8]:
                seasonal_factor = profile["summer_low"] * (
                    1 + 0.1 * np.sin(day_of_year * 0.03)
                )
                temp_base = profile["summer_temp_base"]
                wind_base = profile["wind_profile"]["summer"]
            else:
                seasonal_factor = 1.0 * (
                    1 + 0.15 * np.sin(day_of_year * 0.025)
                )
                temp_base = (profile["winter_temp_base"] + profile["summer_temp_base"]) / 2
                wind_base = (profile["wind_profile"]["winter"] + profile["wind_profile"]["summer"]) / 2

            if i in pollution_episodes:
                pollution_factor = 2.5 + np.random.normal(0, 0.3)
                wind_speed = profile["wind_profile"]["polluted"] + np.random.normal(0, 0.3)
                humidity = int(np.random.uniform(65, 90))
                weather = np.random.choice(["雾", "霾", "阴"], p=[0.35, 0.45, 0.2])
            else:
                pollution_factor = 1.0
                wind_speed = wind_base + np.random.normal(0, 0.5)
                humidity = int(np.random.uniform(40, 80))
                weather = np.random.choice(["晴", "多云", "阴", "小雨"],
                                           p=[0.35, 0.30, 0.20, 0.15])

            weekend_factor = 1.1 if date.weekday() >= 5 else 1.0

            daily_noise = np.random.normal(0, 0.12)

            aqi = int(base_aqi * seasonal_factor * pollution_factor * weekend_factor * (1 + daily_noise))
            aqi = max(8, min(500, aqi))

            pm25 = int(aqi * profile["pm25_ratio"] + np.random.normal(0, 10))
            pm10 = int(aqi * profile["pm10_ratio"] + np.random.normal(0, 15))
            so2 = int(np.random.uniform(4, 40))
            no2 = int(np.random.uniform(15, 70))
            co = round(np.random.uniform(0.3, 3.0), 1)
            o3 = int(np.random.uniform(30, 160))

            if aqi <= 50:
                level = "优"
            elif aqi <= 100:
                level = "良"
            elif aqi <= 150:
                level = "轻度污染"
            elif aqi <= 200:
                level = "中度污染"
            elif aqi <= 300:
                level = "重度污染"
            else:
                level = "严重污染"

            temperature = temp_base + np.random.normal(0, 4)

            data.append({
                "date": date.strftime("%Y-%m-%d"),
                "city": city_name,
                "aqi": aqi,
                "level": level,
                "pm25": max(0, pm25),
                "pm10": max(0, pm10),
                "so2": so2,
                "no2": no2,
                "co": co,
                "o3": o3,
                "temperature": round(temperature, 1),
                "humidity": humidity,
                "wind_speed": round(wind_speed, 1),
                "wind_direction": np.random.choice(["北风", "南风", "东风", "西风", "东北风", "东南风", "西北风", "西南风"]),
                "weather": weather
            })

        return pd.DataFrame(data)

    def get_all_cities(self) -> List[str]:
        """获取所有支持的城市列表"""
        return sorted(list(self.city_profiles.keys()))

    def save_data_to_csv(self, df: pd.DataFrame, filename: str):
        """保存数据到CSV文件"""
        os.makedirs("data", exist_ok=True)
        filepath = os.path.join("data", filename)
        df.to_csv(filepath, index=False, encoding="utf-8-sig")
        print(f"数据已保存到: {filepath}")


class CNEMCApiClient(AQIDataSource):
    """兼容旧接口的客户端类"""
    pass
