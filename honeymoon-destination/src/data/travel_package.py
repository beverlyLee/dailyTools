import json
import random
from dataclasses import dataclass
from typing import List, Dict

PROVINCES = {
    '北京': {'coord': [116.4074, 39.9042], 'income': 81518, 'weight': 1.2},
    '上海': {'coord': [121.4737, 31.2304], 'income': 84034, 'weight': 1.3},
    '广东': {'coord': [113.2644, 23.1291], 'income': 56905, 'weight': 1.5},
    '江苏': {'coord': [118.7969, 32.0603], 'income': 51056, 'weight': 1.4},
    '浙江': {'coord': [120.1551, 30.2741], 'income': 62551, 'weight': 1.3},
    '山东': {'coord': [117.1200, 36.6512], 'income': 39131, 'weight': 1.2},
    '四川': {'coord': [104.0668, 30.5728], 'income': 30670, 'weight': 1.0},
    '湖北': {'coord': [114.3055, 30.5931], 'income': 36706, 'weight': 0.9},
    '河南': {'coord': [113.6254, 34.7466], 'income': 26811, 'weight': 0.8},
    '福建': {'coord': [119.2965, 26.0745], 'income': 43118, 'weight': 0.9},
    '湖南': {'coord': [112.9388, 28.2282], 'income': 31993, 'weight': 0.8},
    '辽宁': {'coord': [123.4328, 41.8045], 'income': 35112, 'weight': 0.7},
    '天津': {'coord': [117.2009, 39.0842], 'income': 47449, 'weight': 0.6},
    '重庆': {'coord': [106.5516, 29.5630], 'income': 33803, 'weight': 0.7},
    '陕西': {'coord': [108.9402, 34.3416], 'income': 28568, 'weight': 0.6},
    '安徽': {'coord': [117.2830, 31.8612], 'income': 30022, 'weight': 0.7},
    '河北': {'coord': [114.5149, 38.0423], 'income': 29383, 'weight': 0.6},
    '江西': {'coord': [115.8922, 28.6765], 'income': 28673, 'weight': 0.5},
    '广西': {'coord': [108.3275, 22.8155], 'income': 26727, 'weight': 0.5},
    '云南': {'coord': [102.7123, 25.0406], 'income': 26937, 'weight': 0.5},
    '山西': {'coord': [112.5627, 37.8706], 'income': 27426, 'weight': 0.4},
    '贵州': {'coord': [106.6302, 26.6477], 'income': 23109, 'weight': 0.4},
    '黑龙江': {'coord': [126.6629, 45.7423], 'income': 27159, 'weight': 0.4},
    '吉林': {'coord': [125.3245, 43.8868], 'income': 26857, 'weight': 0.3},
    '甘肃': {'coord': [103.8236, 36.0581], 'income': 22066, 'weight': 0.3},
    '内蒙古': {'coord': [111.7519, 40.8415], 'income': 34108, 'weight': 0.3},
    '新疆': {'coord': [87.6177, 43.7928], 'income': 26075, 'weight': 0.2},
    '海南': {'coord': [110.3312, 20.0319], 'income': 30075, 'weight': 0.2},
    '宁夏': {'coord': [106.2782, 38.4664], 'income': 27748, 'weight': 0.1},
    '青海': {'coord': [101.7802, 36.6171], 'income': 24757, 'weight': 0.1},
    '西藏': {'coord': [91.1322, 29.6604], 'income': 24950, 'weight': 0.1},
}

DESTINATIONS = {
    '马尔代夫': {'coord': [73.5009, 4.1755], 'cost': 35000, 'tier': 'luxury'},
    '三亚': {'coord': [109.5119, 18.2528], 'cost': 12000, 'tier': 'domestic'},
    '普吉岛': {'coord': [98.3923, 7.9519], 'cost': 15000, 'tier': 'mid'},
    '巴厘岛': {'coord': [115.1889, -8.3405], 'cost': 18000, 'tier': 'mid'},
    '日本-东京': {'coord': [139.6917, 35.6895], 'cost': 22000, 'tier': 'high'},
    '日本-冲绳': {'coord': [127.6811, 26.2124], 'cost': 18000, 'tier': 'high'},
    '泰国-曼谷': {'coord': [100.5018, 13.7563], 'cost': 12000, 'tier': 'mid'},
    '新加坡': {'coord': [103.8198, 1.3521], 'cost': 20000, 'tier': 'high'},
    '马来西亚-沙巴': {'coord': [116.0753, 5.9748], 'cost': 14000, 'tier': 'mid'},
    '希腊-圣托里尼': {'coord': [25.4615, 36.3932], 'cost': 45000, 'tier': 'luxury'},
    '法国-巴黎': {'coord': [2.3522, 48.8566], 'cost': 40000, 'tier': 'luxury'},
    '意大利-威尼斯': {'coord': [12.3155, 45.4408], 'cost': 38000, 'tier': 'luxury'},
    '瑞士': {'coord': [8.5417, 47.3769], 'cost': 50000, 'tier': 'luxury'},
    '斐济': {'coord': [178.0650, -17.7134], 'cost': 42000, 'tier': 'luxury'},
    '塞舌尔': {'coord': [55.4920, -4.6796], 'cost': 48000, 'tier': 'luxury'},
    '毛里求斯': {'coord': [57.5522, -20.3484], 'cost': 38000, 'tier': 'luxury'},
    '韩国-济州岛': {'coord': [126.5312, 33.3617], 'cost': 12000, 'tier': 'mid'},
    '越南-芽庄': {'coord': [109.1967, 12.2388], 'cost': 10000, 'tier': 'budget'},
    '柬埔寨-暹粒': {'coord': [103.8552, 13.3623], 'cost': 9000, 'tier': 'budget'},
    '云南-丽江': {'coord': [100.2289, 26.8721], 'cost': 8000, 'tier': 'domestic'},
}

REGION_PREFERENCES = {
    '长三角': ['上海', '江苏', '浙江', '安徽'],
    '珠三角': ['广东', '福建'],
    '环渤海': ['北京', '天津', '山东', '河北', '辽宁'],
    '中西部': ['四川', '湖北', '河南', '湖南', '重庆', '陕西', '山西', '江西'],
}

DESTINATION_PREFERENCES = {
    '长三角': {'日本-东京': 2.0, '日本-冲绳': 1.8, '马尔代夫': 1.5, '韩国-济州岛': 1.2, '巴厘岛': 1.0},
    '珠三角': {'普吉岛': 2.0, '泰国-曼谷': 1.8, '马来西亚-沙巴': 1.8, '新加坡': 1.5, '越南-芽庄': 1.5, '柬埔寨-暹粒': 1.2},
    '环渤海': {'日本-东京': 1.5, '韩国-济州岛': 1.5, '马尔代夫': 1.2, '三亚': 1.5},
    '中西部': {'三亚': 2.0, '云南-丽江': 1.8, '普吉岛': 1.2, '泰国-曼谷': 1.0},
}

@dataclass
class TravelPackage:
    origin_province: str
    origin_coord: List[float]
    destination: str
    dest_coord: List[float]
    cost: float
    income: float
    count: int

def get_region(province: str) -> str:
    for region, provinces in REGION_PREFERENCES.items():
        if province in provinces:
            return region
    return '中西部'

def generate_packages(num_samples: int = 2000) -> List[TravelPackage]:
    packages = []
    
    for _ in range(num_samples):
        province = random.choices(
            list(PROVINCES.keys()),
            weights=[p['weight'] for p in PROVINCES.values()],
            k=1
        )[0]
        
        region = get_region(province)
        prefs = DESTINATION_PREFERENCES.get(region, {})
        
        dest_weights = []
        for dest in DESTINATIONS.keys():
            base_weight = prefs.get(dest, 0.5)
            income_factor = PROVINCES[province]['income'] / 30000
            dest_tier = DESTINATIONS[dest]['tier']
            
            if dest_tier == 'luxury':
                base_weight *= (income_factor * 0.8)
            elif dest_tier == 'high':
                base_weight *= (income_factor * 0.6)
            
            dest_weights.append(max(0.1, base_weight))
        
        destination = random.choices(
            list(DESTINATIONS.keys()),
            weights=dest_weights,
            k=1
        )[0]
        
        base_cost = DESTINATIONS[destination]['cost']
        income_factor = PROVINCES[province]['income'] / 35000
        actual_cost = base_cost * (0.8 + random.random() * 0.4) * income_factor
        
        packages.append(TravelPackage(
            origin_province=province,
            origin_coord=PROVINCES[province]['coord'],
            destination=destination,
            dest_coord=DESTINATIONS[destination]['coord'],
            cost=round(actual_cost, 2),
            income=PROVINCES[province]['income'],
            count=1
        ))
    
    return packages

def aggregate_by_route(packages: List[TravelPackage]) -> List[Dict]:
    routes = {}
    for pkg in packages:
        key = (pkg.origin_province, pkg.destination)
        if key not in routes:
            routes[key] = {
                'from': pkg.origin_province,
                'fromCoord': pkg.origin_coord,
                'to': pkg.destination,
                'toCoord': pkg.dest_coord,
                'count': 0,
                'avgCost': 0,
                'income': pkg.income,
                'totalCost': 0
            }
        routes[key]['count'] += 1
        routes[key]['totalCost'] += pkg.cost
    
    for key in routes:
        routes[key]['avgCost'] = round(routes[key]['totalCost'] / routes[key]['count'], 2)
        del routes[key]['totalCost']
    
    return list(routes.values())

def get_province_data() -> Dict:
    return PROVINCES

def get_destination_data() -> Dict:
    return DESTINATIONS
