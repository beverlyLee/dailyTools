import os
import requests
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()


class WeatherParser:
    def __init__(self):
        self.api_key = os.getenv('QWEATHER_KEY')
        self.base_url = 'https://devapi.qweather.com/v7'
        self.location_cache = {
            '黄山风景区': '101221007',
            '故宫博物院': '101010100',
            '西湖风景区': '101210101',
            '九寨沟': '101271905',
            '张家界': '101251101'
        }

    def get_location_id(self, location_name):
        if location_name in self.location_cache:
            return self.location_cache[location_name]
        
        url = f'{self.base_url}/city/lookup'
        params = {
            'location': location_name,
            'key': self.api_key
        }
        try:
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            if data.get('code') == '200' and data.get('location'):
                location_id = data['location'][0]['id']
                self.location_cache[location_name] = location_id
                return location_id
        except Exception as e:
            print(f"获取城市ID失败: {e}")
        
        return self.location_cache.get('黄山风景区')

    def get_historical_weather(self, location, start_date, end_date):
        location_id = self.get_location_id(location)
        if not location_id:
            return pd.DataFrame()

        weather_data = []
        current_date = datetime.strptime(start_date, '%Y-%m-%d')
        end_dt = datetime.strptime(end_date, '%Y-%m-%d')

        while current_date <= end_dt:
            date_str = current_date.strftime('%Y%m%d')
            url = f'{self.base_url}/historical/weather'
            params = {
                'location': location_id,
                'date': date_str,
                'key': self.api_key
            }
            try:
                response = requests.get(url, params=params, timeout=10)
                data = response.json()

                if data.get('code') == '200':
                    daily = data.get('weatherDaily', {})
                    weather_data.append({
                        'date': current_date.strftime('%Y-%m-%d'),
                        'temp_max': float(daily.get('tempMax', 0)),
                        'temp_min': float(daily.get('tempMin', 0)),
                        'precipitation': float(daily.get('precip', 0)),
                        'weather_day': daily.get('textDay', ''),
                        'weather_night': daily.get('textNight', ''),
                        'wind_scale_day': daily.get('windScaleDay', ''),
                        'humidity': float(daily.get('humidity', 0))
                    })
            except Exception as e:
                print(f"获取天气数据失败: {e}")

            current_date += timedelta(days=1)

        return pd.DataFrame(weather_data)

    def get_monthly_weather_stats(self, location, year):
        monthly_data = []
        for month in range(1, 13):
            start_date = f'{year}-{month:02d}-01'
            if month == 12:
                end_date = f'{year}-12-31'
            else:
                end_date = f'{year}-{month+1:02d}-01'
                end_date = (datetime.strptime(end_date, '%Y-%m-%d') - timedelta(days=1)).strftime('%Y-%m-%d')

            df = self.get_historical_weather(location, start_date, end_date)
            if not df.empty:
                monthly_data.append({
                    'month': month,
                    'avg_temp': df['temp_max'].mean(),
                    'precipitation': df['precipitation'].sum(),
                    'rainy_days': len(df[df['precipitation'] > 0]),
                    'avg_humidity': df['humidity'].mean()
                })

        return pd.DataFrame(monthly_data)

    def get_sample_weather_data(self, location, year):
        data = []
        
        location_config = {
            '黄山风景区': {
                'base_temp': 12,
                'base_precip': {6: 300, 7: 360, 8: 420}
            },
            '故宫博物院': {
                'base_temp': 15,
                'base_precip': {6: 180, 7: 200, 8: 190}
            },
            '西湖风景区': {
                'base_temp': 18,
                'base_precip': {6: 220, 7: 280, 8: 260}
            },
            '九寨沟': {
                'base_temp': 10,
                'base_precip': {6: 200, 7: 250, 8: 230}
            },
            '张家界': {
                'base_temp': 14,
                'base_precip': {6: 240, 7: 300, 8: 280}
            }
        }
        
        config = location_config.get(location, location_config['黄山风景区'])
        
        temp_by_month = {
            1: config['base_temp'] - 2,
            2: config['base_temp'] + 2,
            3: config['base_temp'] + 8,
            4: config['base_temp'] + 14,
            5: config['base_temp'] + 18,
            6: config['base_temp'] + 22,
            7: config['base_temp'] + 25,
            8: config['base_temp'] + 24,
            9: config['base_temp'] + 19,
            10: config['base_temp'] + 14,
            11: config['base_temp'] + 8,
            12: config['base_temp']
        }
        
        for month in range(1, 13):
            avg_temp = temp_by_month[month]
            
            if month in [6, 7, 8]:
                precipitation = config['base_precip'].get(month, 300)
                rainy_days = 18 + month
            elif month in [1, 2, 12]:
                precipitation = 45 + month * 7
                rainy_days = 7 + month
            else:
                precipitation = 75 + month * 14
                rainy_days = 9 + month
            
            data.append({
                'month': month,
                'avg_temp': avg_temp,
                'precipitation': precipitation,
                'rainy_days': rainy_days,
                'avg_humidity': 60 + month * 2
            })
        
        return pd.DataFrame(data)
