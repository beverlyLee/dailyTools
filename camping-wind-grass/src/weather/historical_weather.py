import asyncio
import json
import os
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import aiohttp
from fake_useragent import UserAgent
from dotenv import load_dotenv

load_dotenv()


class HistoricalWeather:
    def __init__(self):
        self.ua = UserAgent()
        self.api_key = os.getenv("WEATHER_API_KEY", "")
        self.cache_file = "/Users/liboyang/trae/dailyTools/camping-wind-grass/data/weather_cache.json"
        self.cache = self._load_cache()

    def _load_cache(self) -> Dict:
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except:
                return {}
        return {}

    def _save_cache(self):
        os.makedirs(os.path.dirname(self.cache_file), exist_ok=True)
        with open(self.cache_file, "w", encoding="utf-8") as f:
            json.dump(self.cache, f, ensure_ascii=False, indent=2)

    def _get_cache_key(self, lng: float, lat: float) -> str:
        return f"{round(lng, 2)}_{round(lat, 2)}"

    async def get_historical_weather(
        self, lng: float, lat: float, days: int = 365
    ) -> Optional[Dict]:
        cache_key = self._get_cache_key(lng, lat)
        if cache_key in self.cache:
            return self.cache[cache_key]

        if not self.api_key:
            result = self._mock_weather_data(lng, lat, days)
        else:
            result = await self._fetch_real_weather(lng, lat, days)

        if result:
            self.cache[cache_key] = result
            self._save_cache()

        return result

    async def _fetch_real_weather(
        self, lng: float, lat: float, days: int
    ) -> Optional[Dict]:
        result = self._mock_weather_data(lng, lat, days)
        return result

    def _mock_weather_data(self, lng: float, lat: float, days: int) -> Dict:
        import hashlib
        hash_val = int(hashlib.md5(f"{lng}_{lat}".encode()).hexdigest(), 16)

        random.seed(hash_val)

        wind_speeds = []
        rain_days = 0
        temp_avg = 0

        site_types = {
            "千岛湖": {"wind_base": 2.0, "rain_prob": 0.3, "grass": 85, "lng": 119.017, "lat": 29.608},
            "金海湖": {"wind_base": 2.5, "rain_prob": 0.25, "grass": 80, "lng": 117.327, "lat": 40.167},
            "张北": {"wind_base": 7.5, "rain_prob": 0.55, "grass": 35, "lng": 114.711, "lat": 41.151},
            "三岔湖": {"wind_base": 1.8, "rain_prob": 0.35, "grass": 88, "lng": 104.316, "lat": 30.381},
            "溪头村": {"wind_base": 1.5, "rain_prob": 0.4, "grass": 90, "lng": 113.767, "lat": 23.763},
        }

        wind_base = 3.0
        rain_prob = 0.3
        grass_coverage = 75

        for key in site_types:
            site_info = site_types[key]
            site_lng = site_info.get("lng", 0)
            site_lat = site_info.get("lat", 0)
            if site_lng > 0 and site_lat > 0:
                distance = ((lng - site_lng) ** 2 + (lat - site_lat) ** 2) ** 0.5
                if distance < 1.0:
                    wind_base = site_info["wind_base"]
                    rain_prob = site_info["rain_prob"]
                    grass_coverage = site_info["grass"]
                    break

        for _ in range(days):
            wind_speed = wind_base + random.uniform(-1, 2) + random.gauss(0, 0.5)
            wind_speed = max(0, wind_speed)
            wind_speeds.append(wind_speed)

            if random.random() < rain_prob:
                rain_days += 1

            temp_avg += 15 + random.uniform(-10, 15)

        avg_wind_speed = sum(wind_speeds) / len(wind_speeds)
        max_wind_speed = max(wind_speeds)
        wind_level = self._get_wind_level(avg_wind_speed)
        rain_probability = rain_days / days * 100
        avg_temp = temp_avg / days

        wind_distribution = self._calculate_wind_distribution(wind_speeds)
        monthly_data = self._generate_monthly_data(wind_base, rain_prob)

        return {
            "avg_wind_speed": round(avg_wind_speed, 2),
            "max_wind_speed": round(max_wind_speed, 2),
            "wind_level": wind_level,
            "wind_level_desc": self._wind_level_description(wind_level),
            "rain_days": rain_days,
            "rain_probability": round(rain_probability, 1),
            "avg_temperature": round(avg_temp, 1),
            "grass_coverage": grass_coverage,
            "drainage_score": self._calculate_drainage_score(rain_probability, wind_base),
            "wind_distribution": wind_distribution,
            "monthly_data": monthly_data,
            "data_source": "mock",
        }

    def _get_wind_level(self, speed: float) -> int:
        if speed < 0.3:
            return 0
        elif speed < 1.6:
            return 1
        elif speed < 3.4:
            return 2
        elif speed < 5.5:
            return 3
        elif speed < 8.0:
            return 4
        elif speed < 10.8:
            return 5
        elif speed < 13.9:
            return 6
        else:
            return 7

    def _wind_level_description(self, level: int) -> str:
        descriptions = {
            0: "无风",
            1: "软风",
            2: "轻风",
            3: "微风",
            4: "和风",
            5: "清劲风",
            6: "强风",
            7: "疾风",
        }
        return descriptions.get(level, "未知")

    def _calculate_wind_distribution(self, wind_speeds: List[float]) -> Dict[str, int]:
        distribution = {f"{i}级": 0 for i in range(8)}
        for speed in wind_speeds:
            level = self._get_wind_level(speed)
            distribution[f"{level}级"] += 1
        total = len(wind_speeds)
        return {k: round(v / total * 100, 1) for k, v in distribution.items()}

    def _generate_monthly_data(self, wind_base: float, rain_prob: float) -> List[Dict]:
        months = []
        for i in range(12):
            seasonal_wind = wind_base + (0.5 if i in [3, 4, 10, 11] else 0)
            seasonal_rain = rain_prob * (1.5 if i in [5, 6, 7] else 0.8)

            months.append({
                "month": i + 1,
                "avg_wind": round(seasonal_wind, 2),
                "rain_days": int(seasonal_rain * 30),
                "avg_temp": round(10 + 15 * ((i - 6) / 6) ** 2, 1),
            })
        return months

    def _calculate_drainage_score(self, rain_prob: float, wind_speed: float) -> int:
        score = 50
        if rain_prob < 20:
            score += 25
        elif rain_prob < 30:
            score += 15
        elif rain_prob < 40:
            score += 5

        if wind_speed > 3:
            score += 15
        elif wind_speed > 2:
            score += 10

        return min(100, score)


async def main():
    weather = HistoricalWeather()
    data = await weather.get_historical_weather(119.017, 29.608)
    print(json.dumps(data, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
