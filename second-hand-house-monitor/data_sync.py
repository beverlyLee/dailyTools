import requests
import pandas as pd
import json
import time
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import sys
import os
import re
from random import randint, choice

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db.database import Database
from config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0'
]

CITY_CONFIG = {
    '北京市': {
        'city_code': 'bj',
        'lianjia_url': 'https://bj.lianjia.com',
        'districts': {
            '东城区': {'pinyin': 'dongcheng', 'lat': 39.938, 'lng': 116.415, 'base_price': 115000},
            '西城区': {'pinyin': 'xicheng', 'lat': 39.918, 'lng': 116.366, 'base_price': 128000},
            '朝阳区': {'pinyin': 'chaoyang', 'lat': 39.922, 'lng': 116.443, 'base_price': 88000},
            '海淀区': {'pinyin': 'haidian', 'lat': 39.956, 'lng': 116.310, 'base_price': 98000},
            '丰台区': {'pinyin': 'fengtai', 'lat': 39.858, 'lng': 116.287, 'base_price': 68000},
            '石景山区': {'pinyin': 'shijingshan', 'lat': 39.914, 'lng': 116.222, 'base_price': 61000},
            '通州区': {'pinyin': 'tongzhou', 'lat': 39.908, 'lng': 116.657, 'base_price': 55000},
            '顺义区': {'pinyin': 'shunyi', 'lat': 40.128, 'lng': 116.654, 'base_price': 51000}
        }
    },
    '上海市': {
        'city_code': 'sh',
        'lianjia_url': 'https://sh.lianjia.com',
        'districts': {
            '浦东新区': {'pinyin': 'pudong', 'lat': 31.230, 'lng': 121.502, 'base_price': 82000},
            '黄浦区': {'pinyin': 'huangpu', 'lat': 31.236, 'lng': 121.480, 'base_price': 135000},
            '静安区': {'pinyin': 'jingan', 'lat': 31.229, 'lng': 121.444, 'base_price': 102000},
            '徐汇区': {'pinyin': 'xuhui', 'lat': 31.192, 'lng': 121.436, 'base_price': 96000},
            '长宁区': {'pinyin': 'changning', 'lat': 31.221, 'lng': 121.421, 'base_price': 89000},
            '普陀区': {'pinyin': 'putuo', 'lat': 31.253, 'lng': 121.391, 'base_price': 65000},
            '虹口区': {'pinyin': 'hongkou', 'lat': 31.265, 'lng': 121.489, 'base_price': 73000},
            '杨浦区': {'pinyin': 'yangpu', 'lat': 31.266, 'lng': 121.524, 'base_price': 71000}
        }
    },
    '深圳市': {
        'city_code': 'sz',
        'lianjia_url': 'https://sz.lianjia.com',
        'districts': {
            '南山区': {'pinyin': 'nanshan', 'lat': 22.536, 'lng': 113.929, 'base_price': 118000},
            '福田区': {'pinyin': 'futian', 'lat': 22.543, 'lng': 114.058, 'base_price': 108000},
            '罗湖区': {'pinyin': 'luohu', 'lat': 22.554, 'lng': 114.131, 'base_price': 75000},
            '宝安区': {'pinyin': 'baoan', 'lat': 22.564, 'lng': 113.884, 'base_price': 65000},
            '龙岗区': {'pinyin': 'longgang', 'lat': 22.720, 'lng': 114.247, 'base_price': 58000},
            '龙华区': {'pinyin': 'longhua', 'lat': 22.692, 'lng': 114.053, 'base_price': 71000}
        }
    }
}

TREND_TYPES = {
    'up': {'monthly_growth': 0.008, 'volatility': 0.015, 'description': '上涨趋势'},
    'stable': {'monthly_growth': 0.002, 'volatility': 0.01, 'description': '平稳趋势'},
    'down': {'monthly_growth': -0.006, 'volatility': 0.012, 'description': '下跌趋势'}
}

class RealEstateDataSync:
    
    def __init__(self, db: Database = None):
        self.db = db or Database()
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': choice(USER_AGENTS),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        })
    
    def _get_district_coordinates(self, city_name: str, district_name: str) -> tuple:
        city_config = CITY_CONFIG.get(city_name, {})
        district_config = city_config.get('districts', {}).get(district_name, {})
        return district_config.get('lat'), district_config.get('lng')
    
    def _fetch_price_from_lianjia(self, city_name: str, district_name: str) -> Optional[int]:
        try:
            city_config = CITY_CONFIG.get(city_name, {})
            district_config = city_config.get('districts', {}).get(district_name, {})
            pinyin = district_config.get('pinyin', '')
            city_url = city_config.get('lianjia_url', config.LIANJIA_API_BASE)
            
            if not pinyin:
                return None
            
            url = f"{city_url}/ershoufang/{pinyin}/"
            
            time.sleep(randint(1, 3))
            
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            price_pattern = r'单价<span[^>]*>(\d+)', '元/平米'
            match = re.search(price_pattern, response.text)
            
            if match:
                avg_price = int(match.group(1))
                logger.info(f"成功获取 {city_name}-{district_name} 均价: {avg_price} 元/㎡")
                return avg_price
            
            return None
            
        except Exception as e:
            logger.warning(f"获取链家数据失败 {city_name}-{district_name}: {e}")
            return None
    
    def _generate_realistic_price_history(self, city_name: str, district_name: str, 
                                           months: int = 15, use_real_price: bool = False) -> List[Dict]:
        city_config = CITY_CONFIG.get(city_name, {})
        district_config = city_config.get('districts', {}).get(district_name, {})
        base_price = district_config.get('base_price', 60000)
        
        if use_real_price:
            real_price = self._fetch_price_from_lianjia(city_name, district_name)
            if real_price:
                base_price = real_price
        
        district_idx = hash(district_name) % 3
        trend_type = list(TREND_TYPES.keys())[district_idx]
        trend = TREND_TYPES[trend_type]
        
        price_history = []
        today = datetime.now()
        
        for month_offset in range(months - 1, -1, -1):
            date = today - timedelta(days=month_offset * 30)
            date_str = date.strftime('%Y-%m-%d')
            
            month_factor = 1 + (months - 1 - month_offset) * trend['monthly_growth']
            
            noise = (hash(f"{district_name}_{month_offset}") % 100 - 50) / 100 * trend['volatility']
            seasonal_factor = 1 + 0.01 * abs((date.month - 6) % 12)
            
            avg_price = int(base_price * month_factor * (1 + noise) * seasonal_factor)
            
            price_history.append({
                'date': date_str,
                'avg_price': avg_price,
                'median_price': int(avg_price * 0.98),
                'total_listings': 150 + hash(district_name) % 200 + month_offset * 5,
                'avg_area': 85 + hash(district_name) % 20,
                'trend_type': trend_type
            })
        
        return price_history
    
    def sync_from_public_api(self, city_name: str, use_mock: bool = True, 
                            use_real_price: bool = False) -> Dict:
        logger.info(f"开始同步 {city_name} 房产数据...")
        
        city_id = self.db.add_city(city_name)
        
        city_config = CITY_CONFIG.get(city_name, {})
        districts = city_config.get('districts', {})
        
        total_records = 0
        synced_districts = 0
        
        for district_name, district_info in districts.items():
            lat = district_info['lat']
            lng = district_info['lng']
            
            district_id = self.db.add_district(city_id, district_name, lat, lng)
            
            price_data = self._generate_realistic_price_history(
                city_name, district_name, use_real_price=use_real_price
            )
            
            for record in price_data:
                self.db.add_price_record(
                    district_id=district_id,
                    record_date=record['date'],
                    avg_price=record['avg_price'],
                    median_price=record.get('median_price'),
                    total_listings=record.get('total_listings', 0),
                    avg_area=record.get('avg_area', 90)
                )
                total_records += 1
            
            synced_districts += 1
            logger.info(f"  ✅ {district_name}: {len(price_data)} 条记录 ({record['trend_type']})")
        
        logger.info(f"{city_name} 数据同步完成: {synced_districts} 个区域, {total_records} 条记录")
        return {
            'city': city_name,
            'total_records': total_records,
            'districts': synced_districts,
            'status': 'success'
        }
    
    def sync_all_cities(self, use_mock: bool = True, use_real_price: bool = False) -> List[Dict]:
        results = []
        for city_name in CITY_CONFIG.keys():
            try:
                result = self.sync_from_public_api(city_name, use_mock=use_mock, use_real_price=use_real_price)
                results.append(result)
            except Exception as e:
                logger.error(f"同步 {city_name} 失败: {e}")
                results.append({'city': city_name, 'error': str(e), 'status': 'failed'})
        return results
    
    def get_heatmap_data(self, city_id: int) -> List[Dict]:
        if not self.db:
            return []
        try:
            latest_records = self.db.get_latest_records(city_id)
            heatmap_data = []
            for record in latest_records:
                heatmap_data.append({
                    'name': record['district_name'],
                    'lat': record['latitude'],
                    'lng': record['longitude'],
                    'count': record['avg_price'],
                    'value': record['avg_price']
                })
            return heatmap_data
        except Exception as e:
            logger.error(f"获取热力图数据错误: {e}")
            return []
    
    def get_city_statistics(self, city_id: int) -> Dict:
        try:
            latest_records = self.db.get_latest_records(city_id)
            if not latest_records:
                return {}
            
            prices = [r['avg_price'] for r in latest_records]
            
            return {
                'total_districts': len(latest_records),
                'avg_price': int(sum(prices) / len(prices)),
                'max_price': max(prices),
                'min_price': min(prices),
                'price_std': round(float(pd.Series(prices).std()), 2),
                'total_listings': sum(r['total_listings'] for r in latest_records)
            }
        except Exception as e:
            logger.error(f"获取城市统计数据错误: {e}")
            return {}

def main():
    print("=" * 70)
    print("🏠 二手房价格监控系统 - 数据同步工具")
    print("=" * 70)
    
    sync = RealEstateDataSync()
    
    print("\n📋 支持的城市:")
    for city_name in CITY_CONFIG.keys():
        district_count = len(CITY_CONFIG[city_name]['districts'])
        print(f"  ✅ {city_name}: {district_count} 个区域")
    
    print("\n" + "=" * 70)
    print("请选择操作:")
    print("=" * 70)
    print("1. 同步所有城市数据 (模拟数据)")
    print("2. 同步所有城市数据 (尝试获取真实链家数据)")
    print("3. 同步单个城市数据")
    print("4. 查看热力图数据示例")
    print("5. 查看统计信息")
    
    choice = input("\n请选择 (1-5, 默认1): ").strip() or '1'
    
    if choice == '1':
        print("\n🚀 开始同步所有城市...")
        results = sync.sync_all_cities(use_mock=True, use_real_price=False)
        print("\n" + "=" * 70)
        print("📊 同步结果:")
        for result in results:
            if result.get('status') == 'success':
                print(f"  ✅ {result['city']}: {result['districts']} 个区域, {result['total_records']} 条记录")
            else:
                print(f"  ❌ {result['city']}: {result.get('error', '未知错误')}")
    
    elif choice == '2':
        print("\n⚠️  注意: 真实数据获取可能会比较慢，且受反爬机制限制")
        print("🚀 开始同步所有城市 (尝试获取真实数据)...")
        results = sync.sync_all_cities(use_mock=True, use_real_price=True)
        print("\n" + "=" * 70)
        print("📊 同步结果:")
        for result in results:
            if result.get('status') == 'success':
                print(f"  ✅ {result['city']}: {result['districts']} 个区域, {result['total_records']} 条记录")
            else:
                print(f"  ❌ {result['city']}: {result.get('error', '未知错误')}")
    
    elif choice == '3':
        print("\n支持的城市:", list(CITY_CONFIG.keys()))
        city_name = input("请输入城市名: ").strip()
        if city_name in CITY_CONFIG:
            result = sync.sync_from_public_api(city_name, use_mock=True)
            print(f"\n✅ {result['city']}: {result['districts']} 个区域, {result['total_records']} 条记录")
        else:
            print(f"❌ 不支持的城市: {city_name}")
    
    elif choice == '4':
        cities = sync.db.get_cities()
        if cities:
            for city in cities[:3]:
                heatmap_data = sync.get_heatmap_data(city['id'])
                print(f"\n📍 {city['name']} 热力图数据:")
                for item in heatmap_data[:3]:
                    print(f"  {item['name']}: {item['value']} 元/㎡ ({item['lat']:.3f}, {item['lng']:.3f})")
        else:
            print("❌ 暂无城市数据，请先同步")
    
    elif choice == '5':
        cities = sync.db.get_cities()
        if cities:
            for city in cities:
                stats = sync.get_city_statistics(city['id'])
                if stats:
                    print(f"\n📈 {city['name']} 统计信息:")
                    print(f"  区域数量: {stats['total_districts']}")
                    print(f"  平均价格: {stats['avg_price']:,} 元/㎡")
                    print(f"  最高价格: {stats['max_price']:,} 元/㎡")
                    print(f"  最低价格: {stats['min_price']:,} 元/㎡")
                    print(f"  价格标准差: {stats['price_std']}")
        else:
            print("❌ 暂无城市数据，请先同步")
    
    print("\n" + "=" * 70)
    print("✅ 操作完成!")
    print("=" * 70)

if __name__ == '__main__':
    main()
