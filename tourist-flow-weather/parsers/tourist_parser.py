import re
import pandas as pd
import PyPDF2
from io import BytesIO


class TouristParser:
    def __init__(self):
        self.patterns = [
            r'接待游客[：:]\s*([\d,.]+)\s*万人次',
            r'接待游客[：:]\s*([\d,.]+)\s*人次',
            r'游客接待量[：:]\s*([\d,.]+)\s*万人次',
            r'游客接待量[：:]\s*([\d,.]+)\s*人次',
            r'共接待游客\s*([\d,.]+)\s*万人次',
            r'共接待游客\s*([\d,.]+)\s*人次',
            r'接待国内外游客\s*([\d,.]+)\s*万人次',
            r'接待国内外游客\s*([\d,.]+)\s*人次',
        ]

    def extract_tourist_data_from_pdf(self, pdf_path, location_name, year):
        tourist_data = []
        
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            
            for page in reader.pages:
                text = page.extract_text()
                
                for pattern in self.patterns:
                    matches = re.finditer(pattern, text)
                    for match in matches:
                        number_str = match.group(1)
                        number = float(number_str.replace(',', ''))
                        
                        if '万人次' in match.group(0):
                            number *= 10000
                        
                        month_match = re.search(r'(\d{1,2})月', text)
                        month = int(month_match.group(1)) if month_match else None
                        
                        tourist_data.append({
                            'location': location_name,
                            'year': year,
                            'month': month,
                            'tourist_count': int(number),
                            'source': pdf_path
                        })
        
        return pd.DataFrame(tourist_data)

    def extract_from_text(self, text, location_name, year):
        tourist_data = []
        
        for pattern in self.patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                number_str = match.group(1)
                number = float(number_str.replace(',', ''))
                
                if '万人次' in match.group(0):
                    number *= 10000
                
                month_match = re.search(r'(\d{1,2})月', text)
                month = int(month_match.group(1)) if month_match else None
                
                tourist_data.append({
                    'location': location_name,
                    'year': year,
                    'month': month,
                    'tourist_count': int(number),
                    'source': 'text'
                })
        
        return pd.DataFrame(tourist_data)

    def load_sample_data(self, location='黄山风景区'):
        data = []
        
        location_config = {
            '黄山风景区': {
                'base_temp': 12,
                'base_tourists': 200000,
                'season_factor': {1: 0.7, 2: 0.8, 3: 1.2, 4: 1.5, 5: 1.4, 6: 0.4, 7: 0.35, 8: 0.45, 9: 1.6, 10: 1.8, 11: 1.2, 12: 0.9}
            },
            '故宫博物院': {
                'base_temp': 15,
                'base_tourists': 500000,
                'season_factor': {1: 0.6, 2: 0.7, 3: 1.0, 4: 1.3, 5: 1.5, 6: 1.2, 7: 1.4, 8: 1.3, 9: 1.6, 10: 1.8, 11: 1.0, 12: 0.8}
            },
            '西湖风景区': {
                'base_temp': 18,
                'base_tourists': 400000,
                'season_factor': {1: 0.5, 2: 0.6, 3: 1.1, 4: 1.4, 5: 1.6, 6: 0.8, 7: 0.7, 8: 0.9, 9: 1.5, 10: 1.7, 11: 1.2, 12: 0.7}
            },
            '九寨沟': {
                'base_temp': 10,
                'base_tourists': 150000,
                'season_factor': {1: 0.4, 2: 0.5, 3: 0.8, 4: 1.2, 5: 1.5, 6: 1.0, 7: 1.3, 8: 1.4, 9: 1.6, 10: 1.2, 11: 0.7, 12: 0.5}
            },
            '张家界': {
                'base_temp': 14,
                'base_tourists': 180000,
                'season_factor': {1: 0.5, 2: 0.6, 3: 1.0, 4: 1.3, 5: 1.5, 6: 0.9, 7: 1.1, 8: 1.2, 9: 1.4, 10: 1.6, 11: 1.0, 12: 0.7}
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
            if month in [6, 7, 8]:
                precipitation = 280 + (month - 6) * 50
                rainy_days = 18 + month
            elif month in [1, 2, 12]:
                precipitation = 45 + month * 7
                rainy_days = 7 + month
            else:
                precipitation = 75 + month * 14
                rainy_days = 9 + month
            
            tourists = int(config['base_tourists'] * config['season_factor'][month])
            
            data.append({
                'location': location,
                'year': 2024,
                'month': month,
                'tourist_count': tourists,
                'precipitation': precipitation,
                'avg_temp': temp_by_month[month],
                'rainy_days': rainy_days
            })
        
        return pd.DataFrame(data)
