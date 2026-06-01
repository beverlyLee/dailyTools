import pandas as pd
import numpy as np
from typing import Dict, Tuple, Optional
import re


class StateGridParser:
    COLUMN_MAPPINGS = {
        'date': ['日期', 'date', '日期时间', '时间'],
        'time': ['时间', 'time', '小时'],
        'kwh': ['电量(kWh)', 'kwh', '电量', '用电量', '能耗', '电能'],
        'peak': ['尖峰电量', '峰', '峰值', 'peak'],
        'valley': ['谷电量', '谷', '谷值', 'valley'],
        'normal': ['平段电量', '平', '平值', 'normal']
    }

    TOU_PRICING = {
        'beijing': {
            'peak': {'price': 1.05, 'hours': list(range(10, 14)) + list(range(19, 23))},
            'normal': {'price': 0.75, 'hours': list(range(7, 10)) + list(range(14, 19))},
            'valley': {'price': 0.30, 'hours': list(range(0, 7)) + list(range(23, 24))}
        },
        'shanghai': {
            'peak': {'price': 0.98, 'hours': list(range(8, 11)) + list(range(18, 22))},
            'normal': {'price': 0.70, 'hours': list(range(6, 8)) + list(range(11, 18)) + list(range(22, 23))},
            'valley': {'price': 0.28, 'hours': list(range(23, 24)) + list(range(0, 6))}
        },
        'guangdong': {
            'peak': {'price': 1.10, 'hours': list(range(9, 12)) + list(range(19, 23))},
            'normal': {'price': 0.78, 'hours': list(range(7, 9)) + list(range(12, 19))},
            'valley': {'price': 0.28, 'hours': list(range(0, 7)) + list(range(23, 24))}
        },
        'default': {
            'peak': {'price': 0.95, 'hours': list(range(8, 11)) + list(range(18, 22))},
            'normal': {'price': 0.68, 'hours': list(range(6, 8)) + list(range(11, 18)) + list(range(22, 23))},
            'valley': {'price': 0.28, 'hours': list(range(23, 24)) + list(range(0, 6))}
        }
    }

    def __init__(self, region: str = 'default'):
        self.region = region if region in self.TOU_PRICING else 'default'
        self.df = None
        self.daily_profile = None

    def detect_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        detected = {}
        for std_col, variants in self.COLUMN_MAPPINGS.items():
            for variant in variants:
                for col in df.columns:
                    if variant.lower() in str(col).lower():
                        detected[std_col] = col
                        break
                if std_col in detected:
                    break
        return detected

    def parse_csv(self, file_path: str) -> Tuple[pd.DataFrame, Dict]:
        try:
            df = pd.read_csv(file_path, encoding='utf-8')
        except UnicodeDecodeError:
            df = pd.read_csv(file_path, encoding='gbk')

        col_mapping = self.detect_columns(df)

        if 'date' in col_mapping:
            df['datetime'] = pd.to_datetime(df[col_mapping['date']], errors='coerce')
        else:
            df['datetime'] = pd.date_range(start='2024-01-01', periods=len(df), freq='H')

        if 'time' in col_mapping:
            df['hour'] = df[col_mapping['time']].apply(self._extract_hour)
        else:
            df['hour'] = df['datetime'].dt.hour

        if 'kwh' in col_mapping:
            df['kwh'] = pd.to_numeric(df[col_mapping['kwh']], errors='coerce')
        elif all(k in col_mapping for k in ['peak', 'valley', 'normal']):
            df['kwh'] = df[col_mapping['peak']] + df[col_mapping['valley']] + df[col_mapping['normal']]
        else:
            raise ValueError("无法识别电量列，请确保CSV包含用电量数据")

        df['kwh'] = df['kwh'].fillna(df['kwh'].mean())

        self.df = df
        self._generate_daily_profile()

        return df, col_mapping

    def _extract_hour(self, time_val) -> int:
        if isinstance(time_val, (int, float)):
            return int(time_val) % 24
        time_str = str(time_val)
        match = re.search(r'(\d{1,2})', time_str)
        if match:
            return int(match.group(1)) % 24
        return 0

    def _generate_daily_profile(self):
        hourly_avg = self.df.groupby('hour')['kwh'].mean()
        self.daily_profile = pd.Series([hourly_avg.get(h, 0) for h in range(24)], index=range(24))

    def get_tou_period(self, hour: int) -> str:
        pricing = self.TOU_PRICING[self.region]
        for period, info in pricing.items():
            if hour in info['hours']:
                return period
        return 'normal'

    def calculate_cost(self, use_tou: bool = False) -> Dict:
        if self.daily_profile is None:
            raise ValueError("请先解析CSV文件")

        pricing = self.TOU_PRICING[self.region]
        flat_rate = pricing['normal']['price']

        daily_usage = self.daily_profile.sum()
        monthly_usage = daily_usage * 30

        if use_tou:
            monthly_cost = 0
            breakdown = {'peak': 0, 'normal': 0, 'valley': 0}
            for hour in range(24):
                period = self.get_tou_period(hour)
                hour_cost = self.daily_profile[hour] * 30 * pricing[period]['price']
                monthly_cost += hour_cost
                breakdown[period] += self.daily_profile[hour] * 30
        else:
            monthly_cost = monthly_usage * flat_rate
            breakdown = {'peak': 0, 'normal': monthly_usage, 'valley': 0}

        tier = self._get_price_tier(monthly_usage)

        return {
            'daily_usage': round(daily_usage, 2),
            'monthly_usage': round(monthly_usage, 2),
            'monthly_cost': round(monthly_cost, 2),
            'tier': tier,
            'breakdown': {k: round(v, 2) for k, v in breakdown.items()}
        }

    def _get_price_tier(self, monthly_usage: float) -> str:
        if monthly_usage < 200:
            return '一档 (200度以内)'
        elif monthly_usage < 400:
            return '二档 (200-400度)'
        else:
            return '三档 (400度以上)'

    def calculate_savings(self) -> Dict:
        no_tou = self.calculate_cost(use_tou=False)
        with_tou = self.calculate_cost(use_tou=True)
        savings = no_tou['monthly_cost'] - with_tou['monthly_cost']
        savings_pct = (savings / no_tou['monthly_cost'] * 100) if no_tou['monthly_cost'] > 0 else 0

        return {
            'current_cost': round(no_tou['monthly_cost'], 2),
            'optimized_cost': round(with_tou['monthly_cost'], 2),
            'monthly_savings': round(savings, 2),
            'savings_percentage': round(savings_pct, 1),
            'yearly_savings': round(savings * 12, 2)
        }

    def get_daily_profile(self) -> pd.Series:
        return self.daily_profile

    def get_tou_hours(self) -> Dict[str, list]:
        pricing = self.TOU_PRICING[self.region]
        return {period: info['hours'] for period, info in pricing.items()}
