import random
import hashlib

CAMPGROUND_DATA = [
    {
        "name": "杭州千岛湖星空露营基地",
        "location": "浙江省杭州市淳安县千岛湖镇石林景区",
        "province": "浙江",
        "city": "杭州",
        "description": "湖边草坪营地，环境优美，设施齐全，星空绝佳",
        "photos": [],
        "keywords": ["草坪", "平坦", "水源", "厕所", "停车场", "星空", "安静"],
        "source": "mock",
        "site_type": "湖畔营地",
        "_force_grade": "S",
        "_fixed_coords": {"lng": 119.017, "lat": 29.608},
        "_weather_params": {"wind_base": 1.5, "grass": 92, "rain_prob": 0.2},
        "transportation": {
            "convenience_level": 4,
            "by_car": "自驾约2小时，停车场充足",
            "by_public": "杭州西站乘大巴到淳安，再打车30分钟",
            "parking_fee": "20元/天",
        },
        "recommended_time": {
            "best_season": ["4月", "5月", "9月", "10月"],
            "avoid_season": ["7月", "8月"],
            "best_weekday": "周末",
            "booking_required": True,
        },
        "facilities": {
            "water_available": True,
            "power_available": True,
            "toilet_available": True,
            "shower_available": True,
            "kitchen_available": True,
        },
        "supply": {
            "level": 4,
            "nearby_store": "营地内有便利店",
            "distance_to_town": "5公里",
        },
        "safety": {
            "level": 5,
            "has_security": True,
            "has_first_aid": True,
            "fire_risk": "低",
        },
        "experience": {
            "tags": ["湖畔日落", "星空露营", "钓鱼", "皮划艇"],
            "special_activities": ["篝火晚会", "露天电影", "日出瑜伽"],
            "pet_friendly": True,
            "family_friendly": True,
        },
        "price_info": {
            "tent_fee": "80元/顶",
            "cabin_fee": "380元/晚",
            "entrance_fee": "无",
        },
        "reviews": [
            {"user": "露营达人小明", "date": "2024-05-12", "rating": 5, "content": "绝对是我去过最好的露营地！星空真的太美了，设施也很干净，老板人也很热情，下次还会再来！"},
            {"user": "旅行的意义", "date": "2024-04-20", "rating": 5, "content": "带孩子来的，草坪很平整，孩子玩得很开心，湖边钓鱼也很方便，就是周末人有点多，建议提前预约。"},
        ],
    },
    {
        "name": "北京金海湖国际露营地",
        "location": "北京市平谷区金海湖镇金海湖景区",
        "province": "北京",
        "city": "北京",
        "description": "湖畔营地，草地覆盖率高，排水良好",
        "photos": [],
        "keywords": ["草坪", "排水好", "湖畔", "烧烤", "亲子"],
        "source": "mock",
        "site_type": "湖畔营地",
        "_force_grade": "A",
        "_fixed_coords": {"lng": 117.327, "lat": 40.167},
        "_weather_params": {"wind_base": 2.2, "grass": 88, "rain_prob": 0.25},
        "transportation": {
            "convenience_level": 3,
            "by_car": "市区自驾约1.5小时",
            "by_public": "东直门乘852路到平谷，再打车20分钟",
            "parking_fee": "免费",
        },
        "recommended_time": {
            "best_season": ["5月", "6月", "9月", "10月"],
            "avoid_season": ["11月", "12月", "1月", "2月"],
            "best_weekday": "周末",
            "booking_required": True,
        },
        "facilities": {
            "water_available": True,
            "power_available": True,
            "toilet_available": True,
            "shower_available": True,
            "kitchen_available": False,
        },
        "supply": {
            "level": 3,
            "nearby_store": "开车10分钟有超市",
            "distance_to_town": "8公里",
        },
        "safety": {
            "level": 4,
            "has_security": True,
            "has_first_aid": True,
            "fire_risk": "中",
        },
        "experience": {
            "tags": ["湖畔露营", "烧烤", "亲子"],
            "special_activities": ["湖畔骑行", "草坪足球"],
            "pet_friendly": True,
            "family_friendly": True,
        },
        "price_info": {
            "tent_fee": "100元/顶",
            "cabin_fee": "480元/晚",
            "entrance_fee": "30元/人",
        },
        "reviews": [
            {"user": "周末出逃计划", "date": "2024-05-08", "rating": 4, "content": "营地位置很好，湖边风景很美，就是洗澡水有点凉，整体还是很推荐的！"},
            {"user": "户外小王", "date": "2024-04-15", "rating": 5, "content": "设施很新，工作人员态度也很好，下次还来！"},
        ],
    },
    {
        "name": "张家口草原天路风口营地",
        "location": "河北省张家口市张北县草原天路西段",
        "province": "河北",
        "city": "张家口",
        "description": "风口山谷位置，常年风大、暴晒，草地稀疏，雨后容易积水泥泞，蚊虫较多",
        "photos": [],
        "keywords": ["草原", "开阔", "风大", "暴晒", "积水", "泥泞", "蚊子多"],
        "source": "mock",
        "site_type": "草原营地",
        "_force_grade": "D",
        "_fixed_coords": {"lng": 114.711, "lat": 41.151},
        "_weather_params": {"wind_base": 7.5, "grass": 35, "rain_prob": 0.55},
        "transportation": {
            "convenience_level": 2,
            "by_car": "张家口市区自驾约1小时",
            "by_public": "无公共交通直达",
            "parking_fee": "免费",
        },
        "recommended_time": {
            "best_season": ["7月", "8月"],
            "avoid_season": ["10月", "11月", "12月", "1月", "2月", "3月", "4月"],
            "best_weekday": "避开大风天",
            "booking_required": False,
        },
        "facilities": {
            "water_available": False,
            "power_available": False,
            "toilet_available": False,
            "shower_available": False,
            "kitchen_available": False,
        },
        "supply": {
            "level": 1,
            "nearby_store": "最近超市在县城",
            "distance_to_town": "30公里",
        },
        "safety": {
            "level": 2,
            "has_security": False,
            "has_first_aid": False,
            "fire_risk": "高",
        },
        "experience": {
            "tags": ["草原", "开阔", "免费"],
            "special_activities": ["野外生存"],
            "pet_friendly": True,
            "family_friendly": False,
        },
        "price_info": {
            "tent_fee": "免费",
            "cabin_fee": "无",
            "entrance_fee": "无",
        },
        "reviews": [
            {"user": "风一样的男子", "date": "2024-07-15", "rating": 2, "content": "风真的太大了！帐篷差点被吹走，完全没法睡觉，晚上蚊子特别多，不推荐来。"},
            {"user": "露营踩雷指南", "date": "2024-08-05", "rating": 1, "content": "踩雷了，除了景色还行，但体验很差，设施什么都没有，要露营设备全靠自己带，厕所都没有，下次绝对不来了。"},
        ],
    },
    {
        "name": "成都三岔湖桃花岛露营",
        "location": "四川省成都市简阳市三岔湖桃花岛",
        "province": "四川",
        "city": "成都",
        "description": "湖中小岛，草坪平整，适合家庭露营",
        "photos": [],
        "keywords": ["草坪", "钓鱼", "烧烤", "平坦", "安静"],
        "source": "mock",
        "site_type": "湖岛营地",
        "_force_grade": "A",
        "_fixed_coords": {"lng": 104.316, "lat": 30.381},
        "_weather_params": {"wind_base": 2.0, "grass": 85, "rain_prob": 0.3},
        "transportation": {
            "convenience_level": 3,
            "by_car": "成都市区自驾约1.5小时，需乘船到岛",
            "by_public": "城东客运站乘车到三岔镇，再乘船",
            "parking_fee": "15元/天",
        },
        "recommended_time": {
            "best_season": ["3月", "4月", "5月", "9月", "10月", "11月"],
            "avoid_season": ["7月", "8月"],
            "best_weekday": "周末",
            "booking_required": True,
        },
        "facilities": {
            "water_available": True,
            "power_available": False,
            "toilet_available": True,
            "shower_available": False,
            "kitchen_available": False,
        },
        "supply": {
            "level": 2,
            "nearby_store": "岛上有小卖部",
            "distance_to_town": "15公里",
        },
        "safety": {
            "level": 4,
            "has_security": False,
            "has_first_aid": True,
            "fire_risk": "中",
        },
        "experience": {
            "tags": ["湖岛", "钓鱼", "烧烤", "日落"],
            "special_activities": ["乘船游湖", "路亚钓鱼"],
            "pet_friendly": True,
            "family_friendly": True,
        },
        "price_info": {
            "tent_fee": "50元/顶",
            "cabin_fee": "280元/晚",
            "entrance_fee": "船票40元/人",
        },
        "reviews": [
            {"user": "成都耍家", "date": "2024-04-10", "rating": 4, "content": "岛上环境真的不错，钓鱼很舒服，就是船票有点贵，但整体体验很好！"},
            {"user": "周末逃离城市", "date": "2024-05-22", "rating": 5, "content": "带娃体验很舒服，岛很安静，孩子玩得很开心，就是周末人有点多。"},
        ],
    },
    {
        "name": "广州从化溪头村野营地",
        "location": "广东省广州市从化区溪头村",
        "province": "广东",
        "city": "广州",
        "description": "山谷营地，有溪流，背风处较好",
        "photos": [],
        "keywords": ["山谷", "水源", "徒步", "背风", "溯溪"],
        "source": "mock",
        "site_type": "山谷营地",
        "_force_grade": "A",
        "_fixed_coords": {"lng": 113.767, "lat": 23.763},
        "_weather_params": {"wind_base": 1.8, "grass": 80, "rain_prob": 0.32},
        "transportation": {
            "convenience_level": 3,
            "by_car": "广州市区自驾约2小时",
            "by_public": "从化客运站乘乡村巴士",
            "parking_fee": "10元/天",
        },
        "recommended_time": {
            "best_season": ["10月", "11月", "12月", "1月", "2月", "3月"],
            "avoid_season": ["5月", "6月", "7月", "8月"],
            "best_weekday": "避开雨季",
            "booking_required": False,
        },
        "facilities": {
            "water_available": True,
            "power_available": False,
            "toilet_available": True,
            "shower_available": False,
            "kitchen_available": False,
        },
        "supply": {
            "level": 3,
            "nearby_store": "村里有多家农家乐",
            "distance_to_town": "3公里",
        },
        "safety": {
            "level": 3,
            "has_security": False,
            "has_first_aid": True,
            "fire_risk": "低",
        },
        "experience": {
            "tags": ["山谷", "溪流", "徒步", "溯溪"],
            "special_activities": ["溪谷徒步", "农家乐体验"],
            "pet_friendly": True,
            "family_friendly": True,
        },
        "price_info": {
            "tent_fee": "30元/顶",
            "cabin_fee": "无",
            "entrance_fee": "无",
        },
        "reviews": [
            {"user": "户外阿凯", "date": "2024-03-12", "rating": 4, "content": "溪谷很舒服，溯溪很好玩，农家乐的菜也很好吃，推荐！"},
            {"user": "徒步爱好者", "date": "2024-02-18", "rating": 4, "content": "徒步路线很舒服，空气很舒服，就是路有点难走，建议穿防滑鞋。"},
        ],
    },
]


CITY_COORDS = {
    "黑龙江哈尔滨": {"lng": 126.53, "lat": 45.80},
    "吉林长春": {"lng": 125.32, "lat": 43.90},
    "辽宁沈阳": {"lng": 123.43, "lat": 41.80},
    "内蒙古呼和浩特": {"lng": 111.75, "lat": 40.84},
    "河北石家庄": {"lng": 114.48, "lat": 38.03},
    "山西太原": {"lng": 112.55, "lat": 37.87},
    "陕西西安": {"lng": 108.95, "lat": 34.27},
    "宁夏银川": {"lng": 106.27, "lat": 38.47},
    "甘肃兰州": {"lng": 103.82, "lat": 36.06},
    "青海西宁": {"lng": 101.78, "lat": 36.62},
    "新疆乌鲁木齐": {"lng": 87.62, "lat": 43.82},
    "西藏拉萨": {"lng": 91.13, "lat": 29.65},
    "云南昆明": {"lng": 102.71, "lat": 25.04},
    "贵州贵阳": {"lng": 106.63, "lat": 26.65},
    "四川成都": {"lng": 104.07, "lat": 30.67},
    "重庆重庆": {"lng": 106.55, "lat": 29.56},
    "广西南宁": {"lng": 108.37, "lat": 22.82},
    "海南海口": {"lng": 110.33, "lat": 20.03},
    "海南三亚": {"lng": 109.50, "lat": 18.25},
    "广东广州": {"lng": 113.26, "lat": 23.13},
    "湖南长沙": {"lng": 112.94, "lat": 28.23},
    "湖北武汉": {"lng": 114.31, "lat": 30.60},
    "河南郑州": {"lng": 113.63, "lat": 34.75},
    "山东济南": {"lng": 117.01, "lat": 36.67},
    "江苏南京": {"lng": 118.79, "lat": 32.06},
    "安徽合肥": {"lng": 117.28, "lat": 31.86},
    "浙江杭州": {"lng": 120.16, "lat": 30.29},
    "福建福州": {"lng": 119.30, "lat": 26.08},
    "江西南昌": {"lng": 115.89, "lat": 28.68},
    "广西桂林": {"lng": 110.29, "lat": 25.27},
}

GRADE_CONFIG = {
    "S": {"wind": (1.0, 2.2), "grass": (88, 98), "rain": (0.15, 0.22), "trans": (4, 5), "safety": (4, 5), "supply": (4, 5)},
    "A": {"wind": (2.0, 3.5), "grass": (72, 88), "rain": (0.20, 0.32), "trans": (3, 5), "safety": (3, 5), "supply": (3, 5)},
    "B": {"wind": (3.0, 4.5), "grass": (55, 75), "rain": (0.28, 0.42), "trans": (2, 4), "safety": (2, 4), "supply": (2, 4)},
    "C": {"wind": (4.0, 6.0), "grass": (35, 60), "rain": (0.38, 0.52), "trans": (1, 3), "safety": (1, 3), "supply": (1, 3)},
    "D": {"wind": (5.5, 8.0), "grass": (15, 40), "rain": (0.48, 0.65), "trans": (1, 2), "safety": (1, 2), "supply": (1, 2)},
}

GRADE_DISTRIBUTION = {"S": 0.05, "A": 0.35, "B": 0.35, "C": 0.20, "D": 0.05}

REVIEW_TEMPLATES = {
    "S": [
        {"rating": 5, "texts": ["绝对是我去过最好的露营地！星空真的太美了，设施也很干净，老板人也很热情，下次还会再来！", "带孩子来的，草坪很平整，孩子玩得很开心，湖边钓鱼也很方便，就是周末人有点多，建议提前预约。", "环境真的不错，体验感超棒，强烈推荐给大家来体验一下！"]},
        {"rating": 5, "texts": ["这地方真的太舒服了，来了就不想走了，星空下聊天真的是太棒了！", "设施齐全，环境优美，服务周到，满分推荐！"]},
    ],
    "A": [
        {"rating": 4, "texts": ["整体体验不错，环境很好，设施也还可以，就是周末人有点多，建议提前预约。", "营地位置很好，风景很美，设施也很干净，就是价格有点小贵。", "带娃体验很好，孩子玩得很开心，就是交通有点不方便。"]},
        {"rating": 4, "texts": ["整体还可以，就是设施稍微有点小瑕疵，但不影响整体体验。", "推荐来体验一下，风景真的很美！"]},
    ],
    "B": [
        {"rating": 3, "texts": ["整体还可以，就是设施稍微有点旧，但整体体验还可以接受。", "环境一般般，没有想象中那么好，但也还可以。", "设施有点旧，但是老板人很好，整体还行。"]},
        {"rating": 3, "texts": ["中规中矩，没有什么特别的，但也不差。"]},
    ],
    "C": [
        {"rating": 2, "texts": ["设施有点失望，环境一般，不太推荐。", "整体体验不太好，设施有点旧，环境也一般。", "有点踩雷了，设施什么都没有，下次不来了。"]},
        {"rating": 2, "texts": ["不太推荐，体验感不是特别好。"]},
    ],
    "D": [
        {"rating": 1, "texts": ["踩雷了，除了景色还行，但体验很差，设施什么都没有，厕所都没有，下次绝对不来了。", "完全不推荐，体验感特别差，设施什么都没有，要露营设备全靠自己带。"]},
        {"rating": 1, "texts": ["不推荐，体验感差，设施老旧，环境也不好。"]},
    ],
}


def generate_campsites_by_grade(total=100):
    site_types = ["湖畔营地", "山顶营地", "森林营地", "草原营地", "海边营地", "溪谷营地", "田园营地"]
    feature_tags = [
        "星空露营", "日出观景", "日落美景", "云海", "森林氧吧",
        "溪流", "瀑布", "湖泊", "沙滩", "草地",
        "温泉", "篝火", "烧烤", "钓鱼", "徒步",
        "骑行", "攀岩", "滑雪", "滑翔", "摄影",
    ]
    user_names = ["露营达人", "户外小王", "周末出逃", "旅行的意义", "徒步爱好者", "露营踩雷指南", "星空观测者", "野餐达人", "亲子露营家", "背包客"]

    base_sites = CAMPGROUND_DATA.copy()
    generated = []

    exact_counts = {"S": 5, "A": 35, "B": 35, "C": 20, "D": 5}
    for grade in ["S", "A", "B", "C", "D"]:
        count = exact_counts[grade]
        actual_count = count - sum(1 for s in base_sites if s.get("_force_grade") == grade)

        for i in range(actual_count):
            city_name = random.choice(list(CITY_COORDS.keys()))
            coords = CITY_COORDS[city_name]
            base_lng = coords["lng"]
            base_lat = coords["lat"]

            offset_lng = random.uniform(-0.6, 0.6)
            offset_lat = random.uniform(-0.5, 0.5)
            lng = base_lng + offset_lng
            lat = base_lat + offset_lat

            cfg = GRADE_CONFIG[grade]
            wind_base = random.uniform(*cfg["wind"])
            grass = random.randint(*cfg["grass"])
            rain_prob = random.uniform(*cfg["rain"])
            trans_level = random.randint(*cfg["trans"])
            safety_level = random.randint(*cfg["safety"])
            supply_level = random.randint(*cfg["supply"])

            keywords = []
            if grade in ["S", "A"]:
                keywords.extend(["草坪", "避风", "风小", "干燥", "水源", "安静", "平坦"])
                if random.random() > 0.5:
                    keywords.append("排水好")
            elif grade == "B":
                keywords.extend(["草坪", "开阔"])
                if random.random() > 0.7:
                    keywords.append("风小")
            elif grade == "C":
                keywords.extend(["风大", "暴晒"])
                if random.random() > 0.5:
                    keywords.extend(["蚊子多", "潮湿"])
                if random.random() > 0.7:
                    keywords.append("草坪")
            else:
                keywords.extend(["风大", "暴晒", "积水", "泥泞", "蚊子多"])

            site_type = random.choice(site_types)
            selected_tags = random.sample(feature_tags, random.randint(3, 6))
            keywords.extend(selected_tags[:2])

            name_hash = int(hashlib.md5(f"{city_name}{grade}{i}".encode()).hexdigest(), 16) % 10000
            province = city_name.split()[0] if " " in city_name else city_name[:2]
            city = city_name.split()[-1] if " " in city_name else city_name

            reviews_data = random.choice(REVIEW_TEMPLATES[grade])
            reviews = [
                {
                    "user": f"{random.choice(user_names)}{random.randint(1, 99)}",
                    "date": f"2024-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}",
                    "rating": reviews_data["rating"],
                    "content": random.choice(reviews_data["texts"]),
                } for _ in range(2)
            ]

            site = {
                "name": f"{city}{site_type}{name_hash}",
                "location": f"{city_name}近郊{random.choice(['景区', '风景区', '度假区', '生态园区'])}",
                "province": province,
                "city": city,
                "description": f"位于{city}近郊的{site_type}，{random.choice(['风景优美', '空气清新', '环境幽静', '视野开阔'])}",
                "photos": [],
                "keywords": list(set(keywords)),
                "source": "generated",
                "site_type": site_type,
                "_force_grade": grade,
                "_fixed_coords": {"lng": round(lng, 4), "lat": round(lat, 4)},
                "_weather_params": {"wind_base": round(wind_base, 2), "grass": grass, "rain_prob": round(rain_prob, 2)},
                "transportation": {
                    "convenience_level": trans_level,
                    "by_car": f"{city}市区自驾约{random.randint(30, 180)}分钟",
                    "by_public": random.choice(["有公共交通可达", "需打车前往", "无公共交通"]),
                    "parking_fee": random.choice(["免费", "10元/天", "20元/天", "30元/天"]),
                },
                "recommended_time": {
                    "best_season": random.sample(["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"], random.randint(3, 6)),
                    "avoid_season": random.sample(["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"], random.randint(1, 3)),
                    "best_weekday": random.choice(["周末", "节假日", "避开旺季"]),
                    "booking_required": random.random() > 0.5,
                },
                "facilities": {
                    "water_available": grade in ["S", "A", "B"],
                    "power_available": grade in ["S", "A"],
                    "toilet_available": grade in ["S", "A", "B", "C"],
                    "shower_available": grade in ["S", "A"],
                    "kitchen_available": grade in ["S"],
                },
                "supply": {
                    "level": supply_level,
                    "nearby_store": random.choice(["营地内有商店", "附近有农家乐", "需自带补给", "小镇有超市"]),
                    "distance_to_town": f"{random.randint(1, 30)}公里",
                },
                "safety": {
                    "level": safety_level,
                    "has_security": safety_level >= 4,
                    "has_first_aid": safety_level >= 3,
                    "fire_risk": random.choice(["低", "中", "高"]),
                },
                "experience": {
                    "tags": selected_tags,
                    "special_activities": random.sample(["篝火晚会", "露天电影", "星空摄影", "徒步探险", "野餐烧烤", "亲子活动", "瑜伽冥想"], random.randint(1, 3)),
                    "pet_friendly": True,
                    "family_friendly": grade in ["S", "A", "B"],
                },
                "price_info": {
                    "tent_fee": random.choice(["免费", "30元/顶", "50元/顶", "80元/顶", "100元/顶"]),
                    "cabin_fee": random.choice(["无", "180元/晚", "280元/晚", "380元/晚", "580元/晚"]),
                    "entrance_fee": random.choice(["无", "20元/人", "30元/人", "50元/人"]),
                },
                "reviews": reviews,
            }
            generated.append(site)

    all_sites = base_sites + generated
    random.shuffle(all_sites)
    return all_sites


def get_all_campsites():
    return generate_campsites_by_grade(100)
