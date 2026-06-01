import pandas as pd
import numpy as np
from typing import List, Dict, Optional
from datetime import datetime
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db.database import Database


class TrendCalculator:
    def __init__(self, db: Database = None):
        self.db = db or Database()
    
    def calculate_district_trends(self, district_id: int) -> Dict:
        records = self.db.get_price_records(district_id=district_id)
        if not records:
            return {}
        
        df = pd.DataFrame(records)
        df['record_date'] = pd.to_datetime(df['record_date'])
        df = df.sort_values('record_date')
        
        df['mom_change'] = df['avg_price'].pct_change(1) * 100
        df['yoy_change'] = df['avg_price'].pct_change(12) * 100
        
        latest = df.iloc[-1]
        district_name = records[0]['district_name']
        city_name = records[0]['city_name']
        
        return {
            'district_id': district_id,
            'district_name': district_name,
            'city_name': city_name,
            'latest_date': latest['record_date'].strftime('%Y-%m-%d'),
            'latest_price': latest['avg_price'],
            'mom_change': round(latest['mom_change'], 2) if pd.notna(latest['mom_change']) else None,
            'yoy_change': round(latest['yoy_change'], 2) if pd.notna(latest['yoy_change']) else None,
            'mom_trend': 'up' if pd.notna(latest['mom_change']) and latest['mom_change'] > 0 else 'down' if pd.notna(latest['mom_change']) and latest['mom_change'] < 0 else 'stable',
            'yoy_trend': 'up' if pd.notna(latest['yoy_change']) and latest['yoy_change'] > 0 else 'down' if pd.notna(latest['yoy_change']) and latest['yoy_change'] < 0 else 'stable',
        }
    
    def calculate_city_trends(self, city_id: int = None) -> List[Dict]:
        districts = self.db.get_districts(city_id=city_id)
        trends = []
        
        for district in districts:
            trend = self.calculate_district_trends(district['id'])
            if trend:
                trend['latitude'] = district.get('latitude')
                trend['longitude'] = district.get('longitude')
                trends.append(trend)
        
        return sorted(trends, key=lambda x: x['latest_price'], reverse=True)
    
    def get_price_history(self, district_id: int = None, city_id: int = None) -> pd.DataFrame:
        records = self.db.get_price_records(district_id=district_id, city_id=city_id)
        if not records:
            return pd.DataFrame()
        
        df = pd.DataFrame(records)
        df['record_date'] = pd.to_datetime(df['record_date'])
        df = df.sort_values('record_date')
        
        return df
    
    def calculate_city_average(self, city_id: int) -> Dict:
        records = self.db.get_latest_records(city_id=city_id)
        if not records:
            return {}
        
        avg_price = np.mean([r['avg_price'] for r in records])
        total_listings = sum([r['total_listings'] or 0 for r in records])
        
        df_all = self.get_price_history(city_id=city_id)
        if len(df_all) >= 2:
            df_monthly = df_all.groupby('record_date')['avg_price'].mean().reset_index()
            df_monthly = df_monthly.sort_values('record_date')
            mom_change = df_monthly['avg_price'].pct_change(1).iloc[-1] * 100
            yoy_change = df_monthly['avg_price'].pct_change(12).iloc[-1] * 100 if len(df_monthly) >= 13 else None
        else:
            mom_change = None
            yoy_change = None
        
        return {
            'city_name': records[0]['city_name'],
            'avg_price': round(avg_price, 2),
            'total_listings': total_listings,
            'district_count': len(records),
            'mom_change': round(mom_change, 2) if mom_change is not None and pd.notna(mom_change) else None,
            'yoy_change': round(yoy_change, 2) if yoy_change is not None and pd.notna(yoy_change) else None
        }
    
    def get_hot_districts(self, city_id: int = None, top_n: int = 5, by: str = 'mom') -> List[Dict]:
        trends = self.calculate_city_trends(city_id=city_id)
        if not trends:
            return []
        
        if by == 'mom':
            trends = [t for t in trends if t['mom_change'] is not None]
            trends.sort(key=lambda x: x['mom_change'], reverse=True)
        elif by == 'yoy':
            trends = [t for t in trends if t['yoy_change'] is not None]
            trends.sort(key=lambda x: x['yoy_change'], reverse=True)
        
        return trends[:top_n]
    
    def get_cold_districts(self, city_id: int = None, top_n: int = 5, by: str = 'mom') -> List[Dict]:
        trends = self.calculate_city_trends(city_id=city_id)
        if not trends:
            return []
        
        if by == 'mom':
            trends = [t for t in trends if t['mom_change'] is not None]
            trends.sort(key=lambda x: x['mom_change'])
        elif by == 'yoy':
            trends = [t for t in trends if t['yoy_change'] is not None]
            trends.sort(key=lambda x: x['yoy_change'])
        
        return trends[:top_n]
    
    def calculate_price_level_score(self, district_avg_price: float, city_avg_price: float) -> tuple:
        if city_avg_price == 0:
            return 0, []
        
        price_ratio = district_avg_price / city_avg_price
        reasons = []
        score = 0
        
        if price_ratio < 0.7:
            score += 20
            reasons.append("价格显著低于城市平均，价值洼地")
        elif price_ratio < 0.85:
            score += 10
            reasons.append("价格略低于城市平均，性价比高")
        elif price_ratio > 1.3:
            score -= 20
            reasons.append("价格显著高于城市平均，估值偏高")
        elif price_ratio > 1.15:
            score -= 10
            reasons.append("价格略高于城市平均，溢价较高")
        
        return score, reasons

    def calculate_volatility_score(self, price_history: pd.DataFrame) -> tuple:
        if len(price_history) < 6:
            return 0, []
        
        prices = price_history['avg_price'].values
        returns = pd.Series(prices).pct_change().dropna()
        volatility = returns.std() * 100
        reasons = []
        score = 0
        
        if volatility < 1.0:
            score += 5
            reasons.append("价格波动小，走势稳定")
        elif volatility < 2.0:
            score += 2
            reasons.append("价格波动适中")
        elif volatility > 4.0:
            score -= 8
            reasons.append("价格波动剧烈，风险较高")
        
        return score, reasons

    def calculate_momentum_score(self, mom_change: float) -> tuple:
        if mom_change is None:
            return 0, []
        
        score = 0
        reasons = []
        
        if mom_change < -2.0:
            score += 18
            reasons.append(f"环比大幅下跌{mom_change:.1f}%，买方市场，议价空间大")
        elif mom_change < -1.0:
            score += 12
            reasons.append(f"环比明显下跌{mom_change:.1f}%，价格回调中")
        elif mom_change < 0:
            score += 6
            reasons.append(f"环比微跌{mom_change:.1f}%，市场趋稳")
        elif mom_change < 1.0:
            score += 0
            reasons.append(f"环比微涨{mom_change:.1f}%，平稳运行")
        elif mom_change < 2.0:
            score -= 8
            reasons.append(f"环比明显上涨{mom_change:.1f}%，市场较热")
        else:
            score -= 15
            reasons.append(f"环比大幅上涨{mom_change:.1f}%，卖方市场")
        
        return score, reasons

    def calculate_yoy_score(self, yoy_change: float) -> tuple:
        if yoy_change is None:
            return 0, []
        
        score = 0
        reasons = []
        
        if yoy_change < -8.0:
            score += 12
            reasons.append(f"同比大幅下跌{yoy_change:.1f}%，处于价值区间")
        elif yoy_change < -3.0:
            score += 8
            reasons.append(f"同比明显下跌{yoy_change:.1f}%，价格相对合理")
        elif yoy_change < 0:
            score += 4
            reasons.append(f"同比微跌{yoy_change:.1f}%，价格企稳")
        elif yoy_change < 3.0:
            score += 0
            reasons.append(f"同比微涨{yoy_change:.1f}%，温和上涨")
        elif yoy_change < 8.0:
            score -= 6
            reasons.append(f"同比明显上涨{yoy_change:.1f}%，涨幅较大")
        else:
            score -= 10
            reasons.append(f"同比大幅上涨{yoy_change:.1f}%，累计涨幅过高")
        
        return score, reasons

    def generate_buy_recommendation(self, district_id: int) -> Dict:
        trend = self.calculate_district_trends(district_id)
        if not trend:
            return {'recommendation': '数据不足', 'score': 0}
        
        base_score = 50
        total_score = base_score
        all_reasons = []
        
        mom_score, mom_reasons = self.calculate_momentum_score(trend.get('mom_change'))
        total_score += mom_score
        all_reasons.extend(mom_reasons)
        
        yoy_score, yoy_reasons = self.calculate_yoy_score(trend.get('yoy_change'))
        total_score += yoy_score
        all_reasons.extend(yoy_reasons)
        
        districts = self.db.get_districts()
        district_info = next((d for d in districts if d['name'] == trend['district_name']), None)
        city_avg = self.calculate_city_average(district_info['city_id'] if district_info else None)
        if city_avg:
            price_score, price_reasons = self.calculate_price_level_score(
                trend['latest_price'],
                city_avg.get('avg_price', 0)
            )
            total_score += price_score
            all_reasons.extend(price_reasons)
        
        price_history = self.get_price_history(district_id=district_id)
        if not price_history.empty:
            vol_score, vol_reasons = self.calculate_volatility_score(price_history)
            total_score += vol_score
            all_reasons.extend(vol_reasons)
        
        total_score = max(0, min(100, total_score))
        
        if total_score >= 75:
            recommendation = '强烈推荐买入'
        elif total_score >= 60:
            recommendation = '推荐买入'
        elif total_score >= 45:
            recommendation = '观望为主，择机入手'
        elif total_score >= 30:
            recommendation = '谨慎买入'
        else:
            recommendation = '不建议买入'
        
        return {
            'district_name': trend['district_name'],
            'city_name': trend['city_name'],
            'latest_price': trend['latest_price'],
            'recommendation': recommendation,
            'score': total_score,
            'reasons': all_reasons
        }
