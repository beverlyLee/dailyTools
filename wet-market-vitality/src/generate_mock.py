import json
import os
import random

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

OLD_DISTRICTS_DATA = {
    "黄浦区": [
        {"name": "老西门菜市场", "type": "菜市场", "hours": "05:00-18:00", "price": 35, "reviews": 3820, "categories": 18},
        {"name": "宁海东路菜场", "type": "菜市场", "hours": "05:30-19:00", "price": 42, "reviews": 2950, "categories": 15},
        {"name": "巨鹿菜场", "type": "菜市场", "hours": "06:00-18:30", "price": 38, "reviews": 2100, "categories": 16},
        {"name": "永年路菜场", "type": "菜市场", "hours": "05:00-17:30", "price": 30, "reviews": 1850, "categories": 14},
        {"name": "盒马鲜生(人民广场店)", "type": "生鲜超市", "hours": "09:00-22:00", "price": 88, "reviews": 5200, "categories": 20},
    ],
    "静安区": [
        {"name": "余姚路菜市场", "type": "菜市场", "hours": "05:30-18:30", "price": 36, "reviews": 2680, "categories": 17},
        {"name": "昌化路菜场", "type": "菜市场", "hours": "05:00-17:30", "price": 32, "reviews": 1920, "categories": 13},
        {"name": "安远路菜场", "type": "菜市场", "hours": "06:00-18:00", "price": 28, "reviews": 1560, "categories": 12},
        {"name": "清美鲜食(静安店)", "type": "生鲜超市", "hours": "07:00-21:00", "price": 45, "reviews": 890, "categories": 10},
    ],
    "虹口区": [
        {"name": "虹镇老街菜场", "type": "菜市场", "hours": "04:30-18:00", "price": 28, "reviews": 3100, "categories": 16},
        {"name": "广中路菜场", "type": "菜市场", "hours": "05:00-17:30", "price": 30, "reviews": 2450, "categories": 15},
        {"name": "三角地菜场", "type": "菜市场", "hours": "04:00-18:30", "price": 33, "reviews": 4200, "categories": 19},
        {"name": "新市路菜市场", "type": "菜市场", "hours": "05:30-18:00", "price": 26, "reviews": 1780, "categories": 14},
    ],
    "杨浦区": [
        {"name": "杨浦大桥菜场", "type": "菜市场", "hours": "05:00-18:00", "price": 25, "reviews": 2700, "categories": 15},
        {"name": "平凉路菜场", "type": "菜市场", "hours": "05:30-17:30", "price": 28, "reviews": 2200, "categories": 13},
        {"name": "鞍山路菜场", "type": "菜市场", "hours": "06:00-18:00", "price": 32, "reviews": 1650, "categories": 12},
        {"name": "永辉超市(五角场店)", "type": "生鲜超市", "hours": "08:00-22:00", "price": 55, "reviews": 3200, "categories": 18},
    ],
    "普陀区": [
        {"name": "曹杨路菜市场", "type": "菜市场", "hours": "05:00-18:30", "price": 30, "reviews": 2300, "categories": 14},
        {"name": "甘泉路菜场", "type": "菜市场", "hours": "05:30-17:30", "price": 27, "reviews": 1800, "categories": 13},
        {"name": "清涧菜场", "type": "菜市场", "hours": "06:00-18:00", "price": 25, "reviews": 1200, "categories": 11},
        {"name": "盒马mini(普陀店)", "type": "生鲜超市", "hours": "08:00-22:00", "price": 68, "reviews": 1500, "categories": 12},
    ],
    "长宁区": [
        {"name": "古北菜市场", "type": "菜市场", "hours": "06:00-19:00", "price": 45, "reviews": 1900, "categories": 16},
        {"name": "宣化路菜场", "type": "菜市场", "hours": "05:30-18:00", "price": 38, "reviews": 1600, "categories": 13},
        {"name": "城市超市(虹桥店)", "type": "生鲜超市", "hours": "08:30-22:00", "price": 120, "reviews": 2800, "categories": 15},
    ],
    "徐汇区": [
        {"name": "漕河泾菜市场", "type": "菜市场", "hours": "05:30-18:30", "price": 40, "reviews": 2100, "categories": 15},
        {"name": "田林路菜场", "type": "菜市场", "hours": "06:00-18:00", "price": 35, "reviews": 1700, "categories": 13},
        {"name": "康品汇(徐汇店)", "type": "生鲜超市", "hours": "07:30-21:30", "price": 75, "reviews": 1200, "categories": 11},
        {"name": "Ole'精品超市(徐家汇店)", "type": "生鲜超市", "hours": "10:00-22:00", "price": 150, "reviews": 3500, "categories": 20},
    ],
}

NEW_DISTRICTS_DATA = {
    "浦东新区": [
        {"name": "盒马鲜生(金桥店)", "type": "生鲜超市", "hours": "09:00-22:00", "price": 95, "reviews": 4200, "categories": 20},
        {"name": "山姆会员商店(浦东店)", "type": "生鲜超市", "hours": "08:00-22:00", "price": 180, "reviews": 5800, "categories": 20},
        {"name": "张江菜市场", "type": "菜市场", "hours": "06:30-19:00", "price": 45, "reviews": 980, "categories": 10},
        {"name": "叮咚买菜(前滩站)", "type": "生鲜超市", "hours": "07:00-22:00", "price": 65, "reviews": 780, "categories": 12},
        {"name": "康桥菜市场", "type": "菜市场", "hours": "06:00-18:30", "price": 38, "reviews": 650, "categories": 9},
    ],
    "闵行区": [
        {"name": "开市客(Costco)闵行店", "type": "生鲜超市", "hours": "09:00-21:30", "price": 200, "reviews": 8500, "categories": 20},
        {"name": "七宝菜市场", "type": "菜市场", "hours": "06:00-18:30", "price": 35, "reviews": 1200, "categories": 12},
        {"name": "莘庄菜场", "type": "菜市场", "hours": "06:30-18:00", "price": 32, "reviews": 890, "categories": 10},
        {"name": "永辉超市(闵行店)", "type": "生鲜超市", "hours": "08:00-22:00", "price": 55, "reviews": 2100, "categories": 18},
    ],
    "宝山区": [
        {"name": "大场菜市场", "type": "菜市场", "hours": "06:00-18:00", "price": 30, "reviews": 720, "categories": 9},
        {"name": "共富新村菜场", "type": "菜市场", "hours": "06:30-17:30", "price": 28, "reviews": 580, "categories": 8},
        {"name": "盒马X会员店(宝山店)", "type": "生鲜超市", "hours": "09:00-22:00", "price": 120, "reviews": 3200, "categories": 19},
    ],
    "嘉定区": [
        {"name": "南翔菜市场", "type": "菜市场", "hours": "06:00-18:00", "price": 32, "reviews": 680, "categories": 10},
        {"name": "嘉定新城菜场", "type": "菜市场", "hours": "07:00-19:00", "price": 40, "reviews": 450, "categories": 8},
        {"name": "大润发(嘉定店)", "type": "生鲜超市", "hours": "08:00-22:00", "price": 60, "reviews": 1500, "categories": 16},
    ],
    "松江区": [
        {"name": "松江大学城菜市场", "type": "菜市场", "hours": "06:30-18:30", "price": 35, "reviews": 520, "categories": 9},
        {"name": "九亭菜场", "type": "菜市场", "hours": "06:00-18:00", "price": 30, "reviews": 680, "categories": 10},
        {"name": "永辉超市(松江万达店)", "type": "生鲜超市", "hours": "08:00-22:00", "price": 58, "reviews": 1800, "categories": 17},
    ],
    "青浦区": [
        {"name": "青浦镇菜市场", "type": "菜市场", "hours": "06:00-17:30", "price": 28, "reviews": 420, "categories": 9},
        {"name": "徐泾菜场", "type": "菜市场", "hours": "06:30-18:00", "price": 32, "reviews": 380, "categories": 8},
        {"name": "山姆会员商店(青浦店)", "type": "生鲜超市", "hours": "08:00-22:00", "price": 180, "reviews": 2800, "categories": 20},
    ],
    "奉贤区": [
        {"name": "南桥菜市场", "type": "菜市场", "hours": "06:00-18:00", "price": 26, "reviews": 550, "categories": 10},
        {"name": "奉城菜场", "type": "菜市场", "hours": "06:30-17:30", "price": 24, "reviews": 320, "categories": 8},
        {"name": "大润发(奉贤店)", "type": "生鲜超市", "hours": "08:00-22:00", "price": 52, "reviews": 980, "categories": 15},
    ],
}


def generate_mock_data():
    markets = []
    all_districts = {**OLD_DISTRICTS_DATA, **NEW_DISTRICTS_DATA}

    for district, market_list in all_districts.items():
        for m in market_list:
            opens_early = False
            if m["hours"]:
                try:
                    open_hour = int(m["hours"].split(":")[0])
                    opens_early = open_hour <= 6
                except:
                    pass

            categories = []
            category_names = [
                "猪肉", "牛肉", "羊肉", "鸡肉", "鸭肉", "鱼类", "虾类", "贝类",
                "蔬菜", "水果", "豆制品", "蛋类", "粮油", "调味品", "熟食",
                "卤味", "面点", "腌制品", "干货", "海鲜"
            ]
            categories = category_names[:m["categories"]]

            market = {
                "name": m["name"],
                "url": "",
                "avg_price": m["price"],
                "review_count": m["reviews"],
                "address": f"{district}某某路",
                "district": district,
                "business_hours": m["hours"],
                "opens_early": opens_early,
                "categories": categories,
                "category_count": len(categories),
                "category": m["type"],
                "city": "上海",
                "crawl_time": "2024-01-01T00:00:00"
            }
            markets.append(market)

    return markets


def save_mock_data():
    data = generate_mock_data()
    filepath = os.path.join(DATA_DIR, "mock_markets.json")
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Mock 数据已生成，共 {len(data)} 条记录")
    print(f"保存路径: {filepath}")

    old_count = sum(1 for m in data if m["district"] in OLD_DISTRICTS_DATA.keys())
    new_count = sum(1 for m in data if m["district"] in NEW_DISTRICTS_DATA.keys())
    print(f"老城区市场: {old_count} 家")
    print(f"新城区市场: {new_count} 家")

    return filepath


if __name__ == "__main__":
    save_mock_data()
