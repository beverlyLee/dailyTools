import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db.database import Database
from importer.excel_importer import ExcelImporter


def init_sample_data():
    print("=" * 60)
    print("正在初始化二手房价格监控系统数据...")
    print("=" * 60)
    
    db_path = os.path.join(os.path.dirname(__file__), 'data', 'house_prices.db')
    if os.path.exists(db_path):
        print(f"删除旧数据库: {db_path}")
        os.remove(db_path)
    
    db = Database()
    importer = ExcelImporter(db)
    
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    print("\n" + "=" * 60)
    print("生成多城市测试数据: 北京市、上海市、深圳市")
    print("=" * 60)
    
    cities = ['北京市', '上海市', '深圳市']
    
    for city in cities:
        print(f"\n生成 {city} 数据...")
        excel_path = os.path.join(data_dir, f'{city}_house_prices.xlsx')
        importer.generate_sample_excel(excel_path, city_name=city)
        
        print(f"导入 {city} 数据到数据库...")
        result = importer.import_excel(excel_path, city_name=city)
        print(f"  - 总计 {result['total_records']} 条记录")
        print(f"  - 新增 {result['new_records']} 条记录")
    
    print("\n" + "=" * 60)
    print("数据统计:")
    print("=" * 60)
    
    cities_in_db = db.get_cities()
    print(f"城市数量: {len(cities_in_db)}")
    
    total_records = 0
    for city in cities_in_db:
        districts = db.get_districts(city['id'])
        records = db.get_price_records(city_id=city['id'])
        total_records += len(records)
        print(f"  - {city['name']}: {len(districts)} 个区域, {len(records)} 条价格记录")
    
    print(f"\n价格记录总数: {total_records}")
    
    print("\n" + "=" * 60)
    print("验证推荐算法得分分布...")
    print("=" * 60)
    
    from calculator.trend_calculator import TrendCalculator
    calculator = TrendCalculator(db)
    
    score_distribution = {
        '强烈推荐买入 (≥75分)': 0,
        '推荐买入 (60-74分)': 0,
        '观望为主 (45-59分)': 0,
        '谨慎买入 (30-44分)': 0,
        '不建议买入 (<30分)': 0
    }
    
    for city in cities_in_db:
        districts = db.get_districts(city['id'])
        for district in districts:
            rec = calculator.generate_buy_recommendation(district['id'])
            score = rec.get('score', 0)
            
            if score >= 75:
                score_distribution['强烈推荐买入 (≥75分)'] += 1
            elif score >= 60:
                score_distribution['推荐买入 (60-74分)'] += 1
            elif score >= 45:
                score_distribution['观望为主 (45-59分)'] += 1
            elif score >= 30:
                score_distribution['谨慎买入 (30-44分)'] += 1
            else:
                score_distribution['不建议买入 (<30分)'] += 1
    
    for category, count in score_distribution.items():
        if count > 0:
            print(f"  {category}: {count} 个区域")
    
    print("\n" + "=" * 60)
    print("数据初始化成功！")
    print("运行 `python app.py` 启动仪表盘")
    print("=" * 60)


if __name__ == '__main__':
    init_sample_data()
