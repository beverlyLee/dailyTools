import pandas as pd
import os
from typing import List, Dict, Optional
from datetime import datetime
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db.database import Database


class ExcelImporter:
    def __init__(self, db: Database = None):
        self.db = db or Database()
        
    def import_excel(self, file_path: str, city_name: str, 
                     date_column: str = 'record_date',
                     district_column: str = 'district',
                     price_column: str = 'avg_price',
                     median_column: str = 'median_price',
                     listings_column: str = 'total_listings',
                     area_column: str = 'avg_area',
                     province: str = None) -> Dict:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        df = pd.read_excel(file_path)
        
        required_columns = [date_column, district_column, price_column]
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValueError(f"Missing required columns: {missing_columns}")
        
        city_id = self.db.add_city(city_name, province)
        
        total_records = 0
        updated_records = 0
        new_records = 0
        
        for _, row in df.iterrows():
            district_name = str(row[district_column]).strip()
            record_date = self._parse_date(row[date_column])
            avg_price = float(row[price_column])
            
            median_price = float(row[median_column]) if median_column in df.columns and pd.notna(row[median_column]) else None
            total_listings = int(row[listings_column]) if listings_column in df.columns and pd.notna(row[listings_column]) else None
            avg_area = float(row[area_column]) if area_column in df.columns and pd.notna(row[area_column]) else None
            
            district = self.db.get_district_by_name(city_name, district_name)
            if not district:
                district_id = self.db.add_district(city_id, district_name)
            else:
                district_id = district['id']
            
            existing_records = self.db.get_price_records(
                district_id=district_id,
                start_date=record_date,
                end_date=record_date
            )
            
            record_id = self.db.add_price_record(
                district_id=district_id,
                record_date=record_date,
                avg_price=avg_price,
                median_price=median_price,
                total_listings=total_listings,
                avg_area=avg_area
            )
            
            if existing_records:
                updated_records += 1
            else:
                new_records += 1
            total_records += 1
        
        return {
            'total_records': total_records,
            'new_records': new_records,
            'updated_records': updated_records,
            'city': city_name,
            'file': os.path.basename(file_path)
        }
    
    def _parse_date(self, date_value) -> str:
        if isinstance(date_value, datetime):
            return date_value.strftime('%Y-%m-%d')
        elif isinstance(date_value, str):
            try:
                return pd.to_datetime(date_value).strftime('%Y-%m-%d')
            except:
                return date_value
        else:
            return str(date_value)
    
    def _generate_trend_data(self, months: int, trend_type: str, volatility: float = 0.015) -> list:
        trend_factors = []
        for month_offset in range(months):
            if trend_type == 'up':
                base_trend = 1.0 + month_offset * 0.008
            elif trend_type == 'down':
                base_trend = 1.0 - month_offset * 0.006
            else:
                base_trend = 1.0 + (month_offset % 3 - 1) * 0.003
            
            noise = (hash(f"{trend_type}_{month_offset}") % 100 - 50) / 100 * volatility
            trend_factors.append(base_trend + noise)
        
        return trend_factors

    def generate_sample_excel(self, output_path: str, city_name: str = '北京市') -> str:
        city_configs = {
            '北京市': {
                'districts': [
                    ('东城区', 39.93, 116.42, 'up'),
                    ('西城区', 39.92, 116.37, 'up'),
                    ('朝阳区', 39.92, 116.45, 'stable'),
                    ('海淀区', 39.95, 116.30, 'up'),
                    ('丰台区', 39.85, 116.28, 'stable'),
                    ('石景山区', 39.91, 116.22, 'down'),
                    ('通州区', 39.91, 116.65, 'down'),
                    ('顺义区', 40.13, 116.65, 'stable'),
                ],
                'base_prices': {
                    '东城区': 110000,
                    '西城区': 120000,
                    '朝阳区': 85000,
                    '海淀区': 95000,
                    '丰台区': 65000,
                    '石景山区': 58000,
                    '通州区': 52000,
                    '顺义区': 48000,
                }
            },
            '上海市': {
                'districts': [
                    ('浦东新区', 31.23, 121.47, 'up'),
                    ('黄浦区', 31.23, 121.47, 'up'),
                    ('静安区', 31.23, 121.45, 'stable'),
                    ('徐汇区', 31.19, 121.43, 'up'),
                    ('长宁区', 31.22, 121.42, 'stable'),
                    ('普陀区', 31.25, 121.39, 'down'),
                    ('虹口区', 31.27, 121.49, 'down'),
                    ('杨浦区', 31.26, 121.52, 'stable'),
                ],
                'base_prices': {
                    '浦东新区': 78000,
                    '黄浦区': 125000,
                    '静安区': 98000,
                    '徐汇区': 92000,
                    '长宁区': 85000,
                    '普陀区': 62000,
                    '虹口区': 70000,
                    '杨浦区': 68000,
                }
            },
            '深圳市': {
                'districts': [
                    ('南山区', 22.54, 113.94, 'up'),
                    ('福田区', 22.54, 114.06, 'up'),
                    ('罗湖区', 22.55, 114.13, 'stable'),
                    ('宝安区', 22.56, 113.88, 'down'),
                    ('龙岗区', 22.72, 114.25, 'down'),
                    ('龙华区', 22.69, 114.05, 'stable'),
                ],
                'base_prices': {
                    '南山区': 115000,
                    '福田区': 105000,
                    '罗湖区': 72000,
                    '宝安区': 62000,
                    '龙岗区': 55000,
                    '龙华区': 68000,
                }
            }
        }
        
        if city_name not in city_configs:
            city_name = '北京市'
        
        config = city_configs[city_name]
        districts = config['districts']
        base_prices = config['base_prices']
        
        months = 15
        trend_data = {}
        for district, lat, lng, trend_type in districts:
            trend_data[district] = self._generate_trend_data(months, trend_type)
        
        data = []
        for month_offset in range(months):
            date = datetime(2025, 1, 1) + pd.DateOffset(months=month_offset)
            date_str = date.strftime('%Y-%m-%d')
            
            for district, lat, lng, trend_type in districts:
                base_price = base_prices[district]
                trend_factor = trend_data[district][month_offset]
                avg_price = int(base_price * trend_factor)
                
                data.append({
                    'record_date': date_str,
                    'district': district,
                    'avg_price': avg_price,
                    'median_price': int(avg_price * 0.98),
                    'total_listings': 150 + hash(district) % 250 + month_offset * 8,
                    'avg_area': 80 + hash(district) % 25
                })
        
        df = pd.DataFrame(data)
        df.to_excel(output_path, index=False)
        
        return output_path

    def generate_multi_city_data(self, data_dir: str, cities: list = None):
        if cities is None:
            cities = ['北京市', '上海市', '深圳市']
        
        for city in cities:
            output_path = os.path.join(data_dir, f'{city}_house_prices.xlsx')
            self.generate_sample_excel(output_path, city_name=city)
            self.import_excel(output_path, city_name=city)
            print(f"Generated and imported data for {city}")
