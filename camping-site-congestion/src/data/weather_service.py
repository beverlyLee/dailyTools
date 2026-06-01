import os
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from dotenv import load_dotenv
import logging
from functools import lru_cache
import time
import socket
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class APILogger:
    def __init__(self, log_file: str = "api_calls.log"):
        self.log_file = log_file
        self.call_count = 0
        self.success_count = 0
        self.error_count = 0
        self.total_response_time = 0
        
    def log_call(self, endpoint: str, params: dict, status_code: int, 
                 response_time: float, success: bool, error_msg: str = ""):
        self.call_count += 1
        self.total_response_time += response_time
        
        if success:
            self.success_count += 1
        else:
            self.error_count += 1
            
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "endpoint": endpoint,
            "params": {k: v for k, v in params.items() if k != "key"},
            "status_code": status_code,
            "response_time_ms": round(response_time * 1000, 2),
            "success": success,
            "error_msg": error_msg
        }
        
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
        
        if success:
            logger.info(f"API调用成功: {endpoint} - {round(response_time * 1000, 2)}ms")
        else:
            logger.error(f"API调用失败: {endpoint} - {error_msg}")
    
    def get_stats(self):
        avg_time = self.total_response_time / self.call_count * 1000 if self.call_count > 0 else 0
        return {
            "total_calls": self.call_count,
            "success_calls": self.success_count,
            "failed_calls": self.error_count,
            "success_rate": round(self.success_count / self.call_count * 100, 2) if self.call_count > 0 else 0,
            "avg_response_time_ms": round(avg_time, 2)
        }


class RetryStrategy:
    def __init__(self, max_retries: int = 3, initial_delay: float = 1.0, 
                 backoff_factor: float = 2.0, jitter: bool = True):
        self.max_retries = max_retries
        self.initial_delay = initial_delay
        self.backoff_factor = backoff_factor
        self.jitter = jitter
        
    def execute(self, func, *args, **kwargs):
        delay = self.initial_delay
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                return func(*args, **kwargs)
            except requests.exceptions.RequestException as e:
                last_error = e
                if attempt < self.max_retries - 1:
                    sleep_time = delay
                    if self.jitter:
                        sleep_time += np.random.uniform(0, delay * 0.3)
                    logger.warning(f"请求失败，第{attempt + 1}次重试，等待{sleep_time:.2f}秒: {e}")
                    time.sleep(sleep_time)
                    delay *= self.backoff_factor
                else:
                    logger.error(f"达到最大重试次数({self.max_retries})，放弃: {e}")
                    raise last_error


class ConnectionPool:
    def __init__(self, pool_connections: int = 10, pool_maxsize: int = 10):
        self.session = requests.Session()
        adapter = requests.adapters.HTTPAdapter(
            pool_connections=pool_connections,
            pool_maxsize=pool_maxsize,
            max_retries=0
        )
        self.session.mount('http://', adapter)
        self.session.mount('https://', adapter)
        logger.info(f"连接池初始化完成: connections={pool_connections}, maxsize={pool_maxsize}")
    
    def get_session(self):
        return self.session
    
    def close(self):
        self.session.close()


class NetworkDiagnostics:
    @staticmethod
    def check_dns(hostname: str = "devapi.qweather.com", timeout: int = 5) -> dict:
        try:
            start_time = time.time()
            socket.gethostbyname(hostname)
            dns_time = (time.time() - start_time) * 1000
            return {
                "check": "DNS解析",
                "status": "success",
                "response_time_ms": round(dns_time, 2),
                "message": f"DNS解析成功: {hostname}"
            }
        except Exception as e:
            return {
                "check": "DNS解析",
                "status": "failed",
                "response_time_ms": 0,
                "message": f"DNS解析失败: {str(e)}"
            }
    
    @staticmethod
    def check_tcp_connect(hostname: str = "devapi.qweather.com", port: int = 443, timeout: int = 5) -> dict:
        try:
            start_time = time.time()
            sock = socket.create_connection((hostname, port), timeout=timeout)
            sock.close()
            tcp_time = (time.time() - start_time) * 1000
            return {
                "check": "TCP连接",
                "status": "success",
                "response_time_ms": round(tcp_time, 2),
                "message": f"TCP连接成功: {hostname}:{port}"
            }
        except Exception as e:
            return {
                "check": "TCP连接",
                "status": "failed",
                "response_time_ms": 0,
                "message": f"TCP连接失败: {str(e)}"
            }
    
    @staticmethod
    def check_http_get(url: str = "https://devapi.qweather.com", timeout: int = 10) -> dict:
        try:
            start_time = time.time()
            response = requests.get(url, timeout=timeout)
            http_time = (time.time() - start_time) * 1000
            return {
                "check": "HTTP请求",
                "status": "success",
                "status_code": response.status_code,
                "response_time_ms": round(http_time, 2),
                "message": f"HTTP请求成功: {url}"
            }
        except Exception as e:
            return {
                "check": "HTTP请求",
                "status": "failed",
                "response_time_ms": 0,
                "message": f"HTTP请求失败: {str(e)}"
            }
    
    @staticmethod
    def check_api_key(api_key: str, base_url: str = "https://devapi.qweather.com") -> dict:
        if not api_key:
            return {
                "check": "API密钥",
                "status": "failed",
                "message": "API密钥为空"
            }
        try:
            params = {"location": "101010100", "key": api_key}
            start_time = time.time()
            response = requests.get(f"{base_url}/v7/weather/now", params=params, timeout=10)
            api_time = (time.time() - start_time) * 1000
            data = response.json()
            
            if data.get("code") == "200":
                return {
                    "check": "API密钥验证",
                    "status": "success",
                    "response_time_ms": round(api_time, 2),
                    "message": "API密钥有效"
                }
            else:
                return {
                    "check": "API密钥验证",
                    "status": "failed",
                    "response_time_ms": round(api_time, 2),
                    "message": f"API返回错误码: {data.get('code')}"
                }
        except Exception as e:
            return {
                "check": "API密钥验证",
                "status": "failed",
                "response_time_ms": 0,
                "message": f"API验证异常: {str(e)}"
            }
    
    @classmethod
    def run_full_diagnosis(cls, api_key: str = None) -> dict:
        logger.info("开始网络连通性诊断...")
        
        checks = [
            cls.check_dns(),
            cls.check_tcp_connect(),
            cls.check_http_get()
        ]
        
        if api_key:
            checks.append(cls.check_api_key(api_key))
        
        overall_status = all(c["status"] == "success" for c in checks)
        total_time = sum(c.get("response_time_ms", 0) for c in checks)
        
        result = {
            "timestamp": datetime.now().isoformat(),
            "overall_status": "success" if overall_status else "failed",
            "total_response_time_ms": round(total_time, 2),
            "checks": checks,
            "summary": {
                "total_checks": len(checks),
                "passed_checks": sum(1 for c in checks if c["status"] == "success"),
                "failed_checks": sum(1 for c in checks if c["status"] == "failed")
            }
        }
        
        logger.info(f"诊断完成，状态: {result['overall_status']}")
        return result


class WeatherService:
    def __init__(self, enable_logging: bool = True, enable_caching: bool = True, 
                 enable_connection_pool: bool = True):
        self.api_key = os.getenv("QWEATHER_KEY") or os.getenv("HEWEATHER_API_KEY", "")
        self.base_url = "https://devapi.qweather.com/v7"
        self.use_mock = not bool(self.api_key)
        
        self.enable_logging = enable_logging
        self.enable_caching = enable_caching
        self.enable_connection_pool = enable_connection_pool
        
        self.api_logger = APILogger() if enable_logging else None
        self.retry_strategy = RetryStrategy(max_retries=3)
        self.connection_pool = ConnectionPool() if enable_connection_pool else None
        
        self.last_update = None
        self.cache_hits = 0
        self.cache_misses = 0
        
        self.site_locations = {
            "武功山": {"lat": 27.46, "lon": 114.12, "province": "江西", "id": "101240310"},
            "莫干山": {"lat": 30.59, "lon": 119.88, "province": "浙江", "id": "101210111"},
            "千岛湖": {"lat": 29.62, "lon": 119.04, "province": "浙江", "id": "101210106"},
            "安吉小杭坑": {"lat": 30.53, "lon": 119.42, "province": "浙江", "id": "101210210"},
            "黄山风景区": {"lat": 30.13, "lon": 118.16, "province": "安徽", "id": "101221001"},
            "张家界": {"lat": 29.12, "lon": 110.48, "province": "湖南", "id": "101251101"},
            "桂林阳朔": {"lat": 24.78, "lon": 110.49, "province": "广西", "id": "101300502"},
            "三亚亚龙湾": {"lat": 18.22, "lon": 109.65, "province": "海南", "id": "101310201"},
            "长白山": {"lat": 42.02, "lon": 128.07, "province": "吉林", "id": "101060901"},
            "天目湖": {"lat": 31.23, "lon": 119.45, "province": "江苏", "id": "101190408"}
        }
        
        if self.use_mock:
            logger.warning("未配置天气API密钥，使用模拟数据模式")
        else:
            logger.info("天气API密钥已配置，将使用真实数据模式")
    
    def calculate_weather_score(self, temp: float, precipitation: float, wind_speed: float, 
                                 humidity: float, weather_type: str = "晴") -> float:
        temp_score = max(0, 100 - abs(temp - 22) * 5)
        rain_score = max(0, 100 - precipitation * 20)
        wind_score = max(0, 100 - wind_speed * 8)
        humidity_score = max(0, 100 - abs(humidity - 60) * 1.5)
        
        weather_bonus_map = {
            "晴": 15, "多云": 10, "少云": 8, "阴": 5,
            "小雨": -10, "小到中雨": -15, "中雨": -25, "中到大雨": -30,
            "大雨": -40, "暴雨": -60, "大暴雨": -70, "特大暴雨": -80,
            "雷阵雨": -30, "雷阵雨伴有冰雹": -45,
            "小雪": -15, "小到中雪": -20, "中雪": -30, "中到大雪": -35,
            "大雪": -50, "暴雪": -65,
            "雾": -25, "霾": -40, "沙尘暴": -70,
            "雨夹雪": -20, "阵雨": -15
        }
        bonus = weather_bonus_map.get(weather_type, 0)
        
        weights = {"temp": 0.35, "rain": 0.30, "wind": 0.20, "humidity": 0.15}
        
        total_score = (
            temp_score * weights["temp"] +
            rain_score * weights["rain"] +
            wind_score * weights["wind"] +
            humidity_score * weights["humidity"] +
            bonus
        )
        
        return max(0, min(100, total_score))

    def _get_mock_weather_data(self, site_name: str, date: datetime) -> dict:
        loc = self.site_locations.get(site_name, {})
        month = date.month
        
        base_temp = {
            1: -5, 2: 0, 3: 8, 4: 16, 5: 22, 6: 26,
            7: 29, 8: 28, 9: 23, 10: 17, 11: 8, 12: -2
        }
        
        lat_factor = (40 - loc.get("lat", 30)) / 10 * 5
        temp = base_temp.get(month, 20) + lat_factor + np.random.normal(0, 2)
        
        season = self._get_season(month)
        if season == "spring":
            precipitation = np.random.uniform(0, 15)
        elif season == "summer":
            precipitation = np.random.uniform(5, 40)
        elif season == "autumn":
            precipitation = np.random.uniform(0, 10)
        else:
            precipitation = np.random.uniform(0, 5) if month in [11, 12, 1] else np.random.uniform(0, 3)
        
        wind_speed = np.random.uniform(1, 7)
        humidity = np.random.uniform(45, 90)
        
        if precipitation < 0.1:
            weather_type = np.random.choice(["晴", "多云", "阴"], p=[0.55, 0.35, 0.10])
        elif precipitation < 5:
            weather_type = np.random.choice(["小雨", "阵雨"], p=[0.7, 0.3])
        elif precipitation < 15:
            weather_type = "中雨"
        elif precipitation < 30:
            weather_type = "大雨"
        else:
            weather_type = np.random.choice(["暴雨", "雷阵雨"])
        
        if season == "winter" and temp < 1:
            weather_type = np.random.choice(["小雪", "中雪", "晴"], p=[0.3, 0.2, 0.5])
        
        score = self.calculate_weather_score(temp, precipitation, wind_speed, humidity, weather_type)
        
        return {
            "site_name": site_name,
            "date": date,
            "temperature": round(temp, 1),
            "precipitation": round(precipitation, 1),
            "wind_speed": round(wind_speed, 1),
            "humidity": round(humidity, 0),
            "weather_type": weather_type,
            "weather_score": round(score, 1),
            "data_source": "MOCK_DATA",
            "update_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    def _make_api_request(self, endpoint: str, params: dict) -> dict:
        start_time = time.time()
        session = self.connection_pool.get_session() if self.connection_pool else requests
        
        try:
            def request_func():
                response = session.get(f"{self.base_url}/{endpoint}", params=params, timeout=10)
                response.raise_for_status()
                return response.json()
            
            data = self.retry_strategy.execute(request_func)
            response_time = time.time() - start_time
            
            if self.api_logger:
                self.api_logger.log_call(endpoint, params, 200, response_time, True)
            
            return data
            
        except requests.exceptions.RequestException as e:
            response_time = time.time() - start_time
            status_code = e.response.status_code if hasattr(e, 'response') and e.response else 0
            
            if self.api_logger:
                self.api_logger.log_call(endpoint, params, status_code, response_time, False, str(e))
            
            raise

    @lru_cache(maxsize=1000)
    def get_real_time_weather_cached(self, location_id: str):
        params = {"location": location_id, "key": self.api_key}
        data = self._make_api_request("weather/now", params)
        self.cache_misses += 1
        return data

    def get_real_time_weather(self, site_name: str) -> dict:
        if self.use_mock:
            return self._get_mock_weather_data(site_name, datetime.now())
        
        try:
            loc = self.site_locations.get(site_name, {})
            location_id = loc.get("id", "101010100")
            
            if self.enable_caching:
                data = self.get_real_time_weather_cached(location_id)
                self.cache_hits += 1
            else:
                params = {"location": location_id, "key": self.api_key}
                data = self._make_api_request("weather/now", params)
            
            if data.get("code") == "200":
                now = data.get("now", {})
                temp = float(now.get("temp", 20))
                wind_speed = float(now.get("windSpeed", 3))
                humidity = float(now.get("humidity", 60))
                weather_type = now.get("text", "晴")
                precipitation = float(now.get("precip", 0))
                
                score = self.calculate_weather_score(temp, precipitation, wind_speed, humidity, weather_type)
                
                self.last_update = datetime.now()
                
                return {
                    "site_name": site_name,
                    "date": datetime.now(),
                    "temperature": round(temp, 1),
                    "precipitation": round(precipitation, 1),
                    "wind_speed": round(wind_speed, 1),
                    "humidity": round(humidity, 0),
                    "weather_type": weather_type,
                    "weather_score": round(score, 1),
                    "data_source": "QWEATHER_API_REAL",
                    "update_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
        except Exception as e:
            logger.error(f"实时天气获取失败，降级使用模拟数据: {e}")
        
        return self._get_mock_weather_data(site_name, datetime.now())

    def get_7days_forecast(self, site_name: str, force_refresh: bool = False) -> pd.DataFrame:
        if self.use_mock:
            forecasts = []
            base_date = datetime.now()
            for i in range(7):
                forecast_date = base_date + timedelta(days=i)
                weather_data = self._get_mock_weather_data(site_name, forecast_date)
                forecasts.append(weather_data)
            return pd.DataFrame(forecasts)
        
        try:
            loc = self.site_locations.get(site_name, {})
            location_id = loc.get("id", "101010100")
            
            params = {"location": location_id, "key": self.api_key}
            data = self._make_api_request("weather/7d", params)
            
            if data.get("code") == "200":
                forecasts = []
                daily_data = data.get("daily", [])
                
                for i, day in enumerate(daily_data[:7]):
                    forecast_date = datetime.now() + timedelta(days=i)
                    temp_max = float(day.get("tempMax", 25))
                    temp_min = float(day.get("tempMin", 15))
                    temp_avg = (temp_max + temp_min) / 2
                    precipitation = float(day.get("precip", 0))
                    wind_speed = float(day.get("windSpeedDay", 3))
                    humidity = float(day.get("humidity", 60))
                    weather_type = day.get("textDay", "晴")
                    
                    score = self.calculate_weather_score(temp_avg, precipitation, wind_speed, humidity, weather_type)
                    
                    forecasts.append({
                        "site_name": site_name,
                        "date": forecast_date,
                        "temperature": round(temp_avg, 1),
                        "temp_max": temp_max,
                        "temp_min": temp_min,
                        "precipitation": round(precipitation, 1),
                        "wind_speed": round(wind_speed, 1),
                        "humidity": round(humidity, 0),
                        "weather_type": weather_type,
                        "weather_score": round(score, 1),
                        "data_source": "QWEATHER_API_FORECAST",
                        "update_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    })
                
                self.last_update = datetime.now()
                logger.info(f"成功获取 {site_name} 7天天气预报")
                return pd.DataFrame(forecasts)
                
        except Exception as e:
            logger.error(f"天气预报获取失败，降级使用模拟数据: {e}")
        
        logger.info(f"降级使用模拟数据: {site_name}")
        forecasts = []
        base_date = datetime.now()
        for i in range(7):
            forecast_date = base_date + timedelta(days=i)
            weather_data = self._get_mock_weather_data(site_name, forecast_date)
            forecasts.append(weather_data)
        return pd.DataFrame(forecasts)

    def get_historical_weather(self, site_name: str, days: int = 30) -> pd.DataFrame:
        if self.use_mock:
            history = []
            base_date = datetime.now() - timedelta(days=days)
            for i in range(days):
                hist_date = base_date + timedelta(days=i)
                weather_data = self._get_mock_weather_data(site_name, hist_date)
                history.append(weather_data)
            return pd.DataFrame(history)
        
        try:
            loc = self.site_locations.get(site_name, {})
            location_id = loc.get("id", "101010100")
            
            history = []
            base_date = datetime.now() - timedelta(days=days)
            
            for i in range(min(days, 7)):
                hist_date = base_date + timedelta(days=i)
                try:
                    params = {
                        "location": location_id,
                        "date": hist_date.strftime("%Y%m%d"),
                        "key": self.api_key
                    }
                    data = self._make_api_request("historical/weather", params)
                    
                    if data.get("code") == "200":
                        daily = data.get("weatherDaily", [])
                        if daily:
                            day_data = daily[0]
                            temp_avg = float(day_data.get("tempAvg", 20))
                            precipitation = float(day_data.get("precip", 0))
                            weather_type = day_data.get("text", "晴")
                            wind_speed = float(day_data.get("windSpeedAvg", 3))
                            humidity = float(day_data.get("humidityAvg", 60))
                            
                            score = self.calculate_weather_score(temp_avg, precipitation, wind_speed, humidity, weather_type)
                            
                            history.append({
                                "site_name": site_name,
                                "date": hist_date,
                                "temperature": round(temp_avg, 1),
                                "precipitation": round(precipitation, 1),
                                "wind_speed": round(wind_speed, 1),
                                "humidity": round(humidity, 0),
                                "weather_type": weather_type,
                                "weather_score": round(score, 1),
                                "data_source": "QWEATHER_API_HISTORICAL",
                                "update_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                            })
                            continue
                except Exception as e:
                    logger.debug(f"获取历史天气失败，使用模拟: {e}")
                
                weather_data = self._get_mock_weather_data(site_name, hist_date)
                history.append(weather_data)
            
            for i in range(7, days):
                hist_date = base_date + timedelta(days=i)
                weather_data = self._get_mock_weather_data(site_name, hist_date)
                history.append(weather_data)
            
            return pd.DataFrame(history)
            
        except Exception as e:
            logger.error(f"历史天气获取失败: {e}")
            history = []
            base_date = datetime.now() - timedelta(days=days)
            for i in range(days):
                hist_date = base_date + timedelta(days=i)
                weather_data = self._get_mock_weather_data(site_name, hist_date)
                history.append(weather_data)
            return pd.DataFrame(history)

    def get_weather_for_date(self, site_name: str, target_date: datetime) -> dict:
        days_diff = (target_date.date() - datetime.now().date()).days
        
        if 0 <= days_diff < 7:
            forecast_df = self.get_7days_forecast(site_name)
            if not forecast_df.empty:
                day_data = forecast_df[forecast_df["date"].dt.date == target_date.date()]
                if not day_data.empty:
                    return day_data.iloc[0].to_dict()
        
        return self._get_mock_weather_data(site_name, target_date)

    def _get_season(self, month: int) -> str:
        if month in [3, 4, 5]:
            return "spring"
        elif month in [6, 7, 8]:
            return "summer"
        elif month in [9, 10, 11]:
            return "autumn"
        else:
            return "winter"

    def get_site_weather_summary(self, site_name: str, year: int) -> pd.DataFrame:
        monthly_data = []
        
        for month in range(1, 13):
            mid_date = datetime(year, month, 15)
            weather = self._get_mock_weather_data(site_name, mid_date)
            monthly_data.append({
                "month": month,
                "site_name": site_name,
                "avg_temperature": weather["temperature"],
                "avg_weather_score": weather["weather_score"],
                "weather_type": weather["weather_type"]
            })
        
        return pd.DataFrame(monthly_data)

    def get_api_stats(self) -> dict:
        stats = {
            "api_configured": not self.use_mock,
            "logging_enabled": self.enable_logging,
            "caching_enabled": self.enable_caching,
            "connection_pool_enabled": self.enable_connection_pool,
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "cache_hit_rate": round(self.cache_hits / (self.cache_hits + self.cache_misses) * 100, 2) 
                             if (self.cache_hits + self.cache_misses) > 0 else 0
        }
        
        if self.api_logger:
            stats.update(self.api_logger.get_stats())
        
        if self.last_update:
            stats["last_update"] = self.last_update.strftime("%Y-%m-%d %H:%M:%S")
        
        return stats

    def run_diagnostics(self) -> dict:
        return NetworkDiagnostics.run_full_diagnosis(self.api_key if not self.use_mock else None)

    def batch_get_forecast(self, sites: list, max_workers: int = 5) -> dict:
        results = {}
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_site = {executor.submit(self.get_7days_forecast, site): site for site in sites}
            for future in as_completed(future_to_site):
                site = future_to_site[future]
                try:
                    results[site] = future.result()
                    logger.info(f"批量获取完成: {site}")
                except Exception as e:
                    logger.error(f"批量获取失败 {site}: {e}")
        
        return results
