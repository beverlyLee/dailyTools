CAMPGROUND_DATA = [
    {
        "name": "杭州千岛湖露营基地",
        "location": "浙江省杭州市淳安县千岛湖镇",
        "province": "浙江",
        "city": "杭州",
        "description": "湖边草坪营地，环境优美，设施齐全",
        "photos": [],
        "keywords": ["草坪", "平坦", "水源", "厕所", "停车场"],
        "source": "mock",
        "site_type": "湖畔营地",
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
    },
    {
        "name": "北京金海湖露营地",
        "location": "北京市平谷区金海湖镇",
        "province": "北京",
        "city": "北京",
        "description": "湖畔营地，草地覆盖率高，排水良好",
        "photos": [],
        "keywords": ["草坪", "排水好", "湖畔", "烧烤"],
        "source": "mock",
        "site_type": "湖畔营地",
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
    },
    {
        "name": "张家口草原天路风口营地",
        "location": "河北省张家口市张北县",
        "province": "河北",
        "city": "张家口",
        "description": "风口山谷位置，常年风大、暴晒，草地稀疏，雨后容易积水泥泞，蚊虫较多",
        "photos": [],
        "keywords": ["草原", "开阔", "风大", "暴晒", "积水", "泥泞", "蚊子多"],
        "source": "mock",
        "site_type": "草原营地",
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
    },
    {
        "name": "成都三岔湖露营地",
        "location": "四川省成都市简阳市三岔湖",
        "province": "四川",
        "city": "成都",
        "description": "湖中小岛，草坪平整，适合家庭露营",
        "photos": [],
        "keywords": ["草坪", "钓鱼", "烧烤", "平坦"],
        "source": "mock",
        "site_type": "湖岛营地",
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
    },
    {
        "name": "广州从化溪头村露营",
        "location": "广东省广州市从化区溪头村",
        "province": "广东",
        "city": "广州",
        "description": "山谷营地，有溪流，背风处较好",
        "photos": [],
        "keywords": ["山谷", "水源", "徒步", "背风"],
        "source": "mock",
        "site_type": "山谷营地",
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
    },
]


def generate_additional_campsites(count=95):
    import random
    import hashlib

    provinces = [
        ("黑龙江", "哈尔滨", 126.53, 45.8),
        ("吉林", "长春", 125.32, 43.9),
        ("辽宁", "沈阳", 123.43, 41.8),
        ("内蒙古", "呼和浩特", 111.75, 40.84),
        ("河北", "石家庄", 114.48, 38.03),
        ("山西", "太原", 112.55, 37.87),
        ("陕西", "西安", 108.95, 34.27),
        ("宁夏", "银川", 106.27, 38.47),
        ("甘肃", "兰州", 103.82, 36.06),
        ("青海", "西宁", 101.78, 36.62),
        ("新疆", "乌鲁木齐", 87.62, 43.82),
        ("西藏", "拉萨", 91.13, 29.65),
        ("云南", "昆明", 102.71, 25.04),
        ("贵州", "贵阳", 106.63, 26.65),
        ("四川", "成都", 104.07, 30.67),
        ("重庆", "重庆", 106.55, 29.56),
        ("广西", "南宁", 108.37, 22.82),
        ("海南", "海口", 110.33, 20.03),
        ("广东", "广州", 113.26, 23.13),
        ("湖南", "长沙", 112.94, 28.23),
        ("湖北", "武汉", 114.31, 30.60),
        ("河南", "郑州", 113.63, 34.75),
        ("山东", "济南", 117.01, 36.67),
        ("江苏", "南京", 118.79, 32.06),
        ("安徽", "合肥", 117.28, 31.86),
        ("浙江", "杭州", 120.16, 30.29),
        ("福建", "福州", 119.30, 26.08),
        ("江西", "南昌", 115.89, 28.68),
    ]

    site_types = ["湖畔营地", "山顶营地", "森林营地", "草原营地", "海边营地", "溪谷营地", "田园营地", "沙漠营地"]
    feature_tags = [
        "星空露营", "日出观景", "日落美景", "云海", "森林氧吧",
        "溪流", "瀑布", "湖泊", "沙滩", "草地",
        "温泉", "篝火", "烧烤", "钓鱼", "徒步",
        "骑行", "攀岩", "滑雪", "滑翔", "摄影",
    ]

    additional_sites = []

    for i in range(count):
        province_data = random.choice(provinces)
        province, city, base_lng, base_lat = province_data

        offset_lng = random.uniform(-2, 2)
        offset_lat = random.uniform(-1.5, 1.5)
        lng = base_lng + offset_lng
        lat = base_lat + offset_lat

        wind_base = random.uniform(1.2, 6.5)
        grass = random.randint(25, 95)
        rain_prob = random.uniform(0.15, 0.6)

        name_hash = int(hashlib.md5(f"{province}{city}{i}".encode()).hexdigest(), 16) % 10000

        site_type = random.choice(site_types)

        trans_level = random.randint(1, 5)
        has_water = random.random() > 0.35
        has_power = random.random() > 0.55
        safety_level = random.randint(1, 5)
        supply_level = random.randint(1, 5)

        keywords = []
        if grass > 70:
            keywords.append("草坪")
        if wind_base < 3:
            keywords.append("避风")
            keywords.append("风小")
        if rain_prob < 0.3:
            keywords.append("干燥")
        if has_water:
            keywords.append("水源")
        if has_power:
            keywords.append("电源")
        if "湖" in site_type or "海" in site_type:
            keywords.append("钓鱼")
        if safety_level >= 4:
            keywords.append("安全")
        if trans_level >= 4:
            keywords.append("交通便利")

        selected_tags = random.sample(feature_tags, random.randint(3, 6))
        keywords.extend(selected_tags[:2])

        site = {
            "name": f"{province}{city}{site_type}营地{name_hash}",
            "location": f"{province}省{city}市近郊",
            "province": province,
            "city": city,
            "description": f"位于{city}近郊的{site_type}，{random.choice(['风景优美', '空气清新', '环境幽静', '视野开阔'])}",
            "photos": [],
            "keywords": list(set(keywords)),
            "source": "generated",
            "site_type": site_type,
            "_generated_coords": {"lng": round(lng, 4), "lat": round(lat, 4)},
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
                "water_available": has_water,
                "power_available": has_power,
                "toilet_available": random.random() > 0.4,
                "shower_available": random.random() > 0.6,
                "kitchen_available": random.random() > 0.7,
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
                "pet_friendly": random.random() > 0.3,
                "family_friendly": wind_base < 4 and safety_level >= 3,
            },
            "price_info": {
                "tent_fee": random.choice(["免费", "30元/顶", "50元/顶", "80元/顶", "100元/顶"]),
                "cabin_fee": random.choice(["无", "180元/晚", "280元/晚", "380元/晚", "580元/晚"]),
                "entrance_fee": random.choice(["无", "20元/人", "30元/人", "50元/人"]),
            },
        }
        additional_sites.append(site)

    return additional_sites


def get_all_campsites():
    generated = generate_additional_campsites(95)
    return CAMPGROUND_DATA + generated
