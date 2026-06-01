import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import os
from dotenv import load_dotenv

load_dotenv()

try:
    import tushare as ts
    TUSHARE_AVAILABLE = True
except ImportError:
    TUSHARE_AVAILABLE = False
    ts = None


class TushareClient:
    def __init__(self):
        self.token = os.getenv('TUSHARE_TOKEN')
        self.available = TUSHARE_AVAILABLE and self.token
        
        if self.available and ts:
            ts.set_token(self.token)
            self.pro = ts.pro_api()
        else:
            self.pro = None
    
    def get_stock_basic(self, ts_code: str) -> Dict:
        if not self.available:
            return {
                'ts_code': ts_code,
                'name': '贵州茅台' if '600519' in ts_code else '示例股票',
                'industry': '白酒' if '600519' in ts_code else '行业',
                'list_date': '20010827'
            }
        
        df = self.pro.stock_basic(ts_code=ts_code, fields='ts_code,name,industry,list_date')
        if df.empty:
            return {}
        return df.iloc[0].to_dict()
    
    def get_daily_basic(self, ts_code: str, trade_date: Optional[str] = None) -> Dict:
        if trade_date is None:
            trade_date = datetime.now().strftime('%Y%m%d')
        
        if not self.available:
            return {
                'ts_code': ts_code,
                'trade_date': trade_date,
                'close': 1850.0 + random.uniform(-50, 50),
                'pe': 35.0 + random.uniform(-3, 3),
                'pb': 12.0 + random.uniform(-1, 1),
                'total_mv': 232000000 + random.randint(-10000000, 10000000)
            }
        
        df = self.pro.daily_basic(ts_code=ts_code, trade_date=trade_date, 
                                   fields='ts_code,trade_date,close,pe,pb,total_mv')
        if df.empty:
            return {}
        return df.iloc[0].to_dict()
    
    def get_moneyflow(self, ts_code: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict]:
        if end_date is None:
            end_date = datetime.now().strftime('%Y%m%d')
        if start_date is None:
            start_date = (datetime.now() - timedelta(days=30)).strftime('%Y%m%d')
        
        if not self.available:
            mock_data = []
            current = datetime.strptime(start_date, '%Y%m%d')
            end = datetime.strptime(end_date, '%Y%m%d')
            
            while current <= end:
                mock_data.append({
                    'trade_date': current.strftime('%Y%m%d'),
                    'main_net_inflow': random.randint(-500000000, 800000000),
                    'main_net_inflow_ratio': round(random.uniform(-3, 4), 2),
                    'buy_elg_amount': random.randint(500000000, 1500000000),
                    'sell_elg_amount': random.randint(500000000, 1500000000),
                    'net_mf_vol': random.randint(-1000000, 1000000)
                })
                current += timedelta(days=1)
            return mock_data
        
        df = self.pro.moneyflow(ts_code=ts_code, start_date=start_date, end_date=end_date)
        if df.empty:
            return []
        return df.to_dict('records')
    
    def get_main_net_inflow(self, ts_code: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict]:
        moneyflow_data = self.get_moneyflow(ts_code, start_date, end_date)
        result = []
        for item in moneyflow_data:
            result.append({
                'trade_date': item['trade_date'],
                'main_net_inflow': item['main_net_inflow'],
                'main_net_inflow_ratio': item['main_net_inflow_ratio'],
                'buy_elg_elg_amount': item['buy_elg_amount'],
                'sell_elg_amount': item['sell_elg_amount'],
                'net_mf_vol': item['net_mf_vol']
            })
        return sorted(result, key=lambda x: x['trade_date'])
    
    def get_tick_data(self, ts_code: str, trade_date: Optional[str] = None) -> List[Dict]:
        if trade_date is None:
            trade_date = datetime.now().strftime('%Y%m%d')
        
        if not self.available:
            mock_data = []
            base_price = 1850.0
            
            for hour in [9, 10, 11, 13, 14]:
                start_min = 30 if hour == 9 else 0
                end_min = 0 if hour == 11 else (0 if hour == 15 else 60)
                
                for minute in range(start_min, end_min):
                    time_str = f'{hour:02d}:{minute:02d}:00'
                    price = base_price + random.uniform(-10, 15)
                    mock_data.append({
                        'trade_time': time_str,
                        'close': round(price, 2),
                        'vol': random.randint(100, 500)
                    })
            return mock_data
        
        df = self.pro.stk_mins(ts_code=ts_code, freq='1min', start_date=trade_date + ' 09:30:00', end_date=trade_date + ' 15:00:00')
        if df.empty:
            return []
        return df.to_dict('records')
    
    def get_intraday_chart(self, ts_code: str, trade_date: Optional[str] = None) -> Dict:
        tick_data = self.get_tick_data(ts_code, trade_date)
        if not tick_data:
            return {'times': [], 'prices': [], 'volumes': []}
        
        times = []
        prices = []
        volumes = []
        
        for item in tick_data:
            times.append(item['trade_time'])
            prices.append(float(item['close']))
            volumes.append(float(item['vol']))
        
        return {
            'times': times,
            'prices': prices,
            'volumes': volumes
        }
    
    def get_stock_quote(self, ts_code: str) -> Dict:
        basic_info = self.get_stock_basic(ts_code)
        daily_basic = self.get_daily_basic(ts_code)
        moneyflow = self.get_moneyflow(ts_code)
        
        latest_moneyflow = moneyflow[0] if moneyflow else {}
        
        return {
            'ts_code': ts_code,
            'name': basic_info.get('name', ''),
            'industry': basic_info.get('industry', ''),
            'close': daily_basic.get('close', 0),
            'pe': daily_basic.get('pe', 0),
            'pb': daily_basic.get('pb', 0),
            'total_mv': daily_basic.get('total_mv', 0),
            'main_net_inflow': latest_moneyflow.get('main_net_inflow', 0),
            'main_net_inflow_ratio': latest_moneyflow.get('main_net_inflow_ratio', 0)
        }


if __name__ == '__main__':
    client = TushareClient()
    result = client.get_stock_quote('600519.SH')
    print(result)
