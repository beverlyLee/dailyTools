import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv
import pandas as pd

load_dotenv()

class MaoyanAPI:
    def __init__(self):
        self.api_key = os.getenv('MAOYAN_API_KEY')
        self.base_url = 'https://api.maoyan.com'
    
    def get_now_playing_movies(self):
        mock_data = [
            {
                'id': 1,
                'name': '流浪地球3',
                'box_office': 458000,
                'release_date': '2025-01-28',
                'poster': 'https://example.com/poster1.jpg'
            },
            {
                'id': 2,
                'name': '满江红2',
                'box_office': 325000,
                'release_date': '2025-01-25',
                'poster': 'https://example.com/poster2.jpg'
            },
            {
                'id': 3,
                'name': '封神第三部',
                'box_office': 289000,
                'release_date': '2025-01-20',
                'poster': 'https://example.com/poster3.jpg'
            },
            {
                'id': 4,
                'name': '唐人街探案4',
                'box_office': 215000,
                'release_date': '2025-01-22',
                'poster': 'https://example.com/poster4.jpg'
            },
            {
                'id': 5,
                'name': '热辣滚烫2',
                'box_office': 198000,
                'release_date': '2025-01-30',
                'poster': 'https://example.com/poster5.jpg'
            },
            {
                'id': 6,
                'name': '哪吒之魔童闹海',
                'box_office': 520000,
                'release_date': '2025-02-01',
                'poster': 'https://example.com/poster6.jpg'
            },
            {
                'id': 7,
                'name': '飞驰人生3',
                'box_office': 156000,
                'release_date': '2025-02-05',
                'poster': 'https://example.com/poster7.jpg'
            },
            {
                'id': 8,
                'name': '熊出没·重返未来',
                'box_office': 142000,
                'release_date': '2025-02-01',
                'poster': 'https://example.com/poster8.jpg'
            }
        ]
        return mock_data
    
    def get_box_office_trend(self, movie_id, days=30):
        base_box_office = {
            1: 15000,
            2: 12000,
            3: 10000,
            4: 8000,
            5: 7500,
            6: 18000,
            7: 6000,
            8: 5500
        }.get(movie_id, 5000)
        
        trend_data = []
        start_date = datetime.now() - timedelta(days=days)
        
        for i in range(days):
            current_date = start_date + timedelta(days=i)
            decay_factor = 1 - (i / days) * 0.6
            weekend_boost = 1.3 if current_date.weekday() >= 5 else 1.0
            daily_box = base_box_office * decay_factor * weekend_boost
            daily_box += daily_box * 0.15 * (0.5 - __import__('random').random())
            
            trend_data.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'box_office': max(0, int(daily_box))
            })
        
        return trend_data
    
    def get_movie_detail(self, movie_id):
        movies = self.get_now_playing_movies()
        for movie in movies:
            if movie['id'] == movie_id:
                return movie
        return None
