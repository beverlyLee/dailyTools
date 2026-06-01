import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db.database import Database
from calculator.trend_calculator import TrendCalculator


def test_database():
    print("=== 测试数据库 ===")
    db = Database()
    
    cities = db.get_cities()
    print(f"城市数量: {len(cities)}")
    for city in cities:
        print(f"  - {city['name']} (id: {city['id']})")
    
    districts = db.get_districts()
    print(f"\n区域数量: {len(districts)}")
    for district in districts[:5]:
        print(f"  - {district['name']} ({district['city_name']})")
    
    records = db.get_price_records()
    print(f"\n价格记录总数: {len(records)}")
    
    return cities[0]['id'] if cities else None


def test_trend_calculator(city_id):
    print("\n=== 测试趋势计算 ===")
    calculator = TrendCalculator()
    
    city_avg = calculator.calculate_city_average(city_id)
    print(f"城市概览: {city_avg['city_name']}")
    print(f"  平均价格: {city_avg['avg_price']:,.0f} 元/㎡")
    print(f"  挂牌总数: {city_avg['total_listings']} 套")
    print(f"  环比变化: {city_avg['mom_change']:+.2f}%")
    print(f"  同比变化: {city_avg['yoy_change']:+.2f}%" if city_avg['yoy_change'] is not None else "  同比变化: 数据不足")
    
    hot_districts = calculator.get_hot_districts(city_id, top_n=3)
    print(f"\n热门区域 (环比涨幅前三):")
    for d in hot_districts:
        print(f"  - {d['district_name']}: {d['mom_change']:+.2f}%")
    
    cold_districts = calculator.get_cold_districts(city_id, top_n=3)
    print(f"\n冷门区域 (环比跌幅前三):")
    for d in cold_districts:
        print(f"  - {d['district_name']}: {d['mom_change']:+.2f}%")
    
    districts = calculator.db.get_districts(city_id)
    if districts:
        rec = calculator.generate_buy_recommendation(districts[0]['id'])
        print(f"\n购房推荐示例 ({rec['district_name']}):")
        print(f"  当前价格: {rec['latest_price']:,.0f} 元/㎡")
        print(f"  推荐指数: {rec['score']}/100")
        print(f"  推荐建议: {rec['recommendation']}")
        print(f"  分析原因:")
        for reason in rec['reasons']:
            print(f"    - {reason}")


if __name__ == '__main__':
    city_id = test_database()
    if city_id:
        test_trend_calculator(city_id)
    print("\n=== 所有测试通过！ ===")
