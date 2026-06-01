from collections import defaultdict

def calculate_city_breed_rank(posts, top_n=3):
    city_breed_counts = defaultdict(lambda: defaultdict(int))
    
    for post in posts:
        city = post.get("city")
        breed = post.get("breed")
        if city and breed:
            city_breed_counts[city][breed] += 1
    
    result = {}
    for city, breed_counts in city_breed_counts.items():
        sorted_breeds = sorted(breed_counts.items(), key=lambda x: x[1], reverse=True)
        result[city] = [{"breed": b, "count": c} for b, c in sorted_breeds[:top_n]]
    
    return result

def calculate_region_breed_rank(cities, posts, top_n=3):
    region_cities = defaultdict(list)
    for city_info in cities:
        region_cities[city_info["region"]].append(city_info["name"])
    
    region_breed_counts = defaultdict(lambda: defaultdict(int))
    
    for post in posts:
        city = post.get("city")
        breed = post.get("breed")
        if city and breed:
            for region, region_city_list in region_cities.items():
                if city in region_city_list:
                    region_breed_counts[region][breed] += 1
                    break
    
    result = {}
    for region, breed_counts in region_breed_counts.items():
        sorted_breeds = sorted(breed_counts.items(), key=lambda x: x[1], reverse=True)
        result[region] = [{"breed": b, "count": c} for b, c in sorted_breeds[:top_n]]
    
    return result

def build_chord_data(cities, posts):
    all_breeds = set()
    for post in posts:
        breed = post.get("breed")
        if breed:
            all_breeds.add(breed)
    
    breed_list = sorted(list(all_breeds))
    city_list = sorted([c["name"] for c in cities])
    
    breed_index = {b: i for i, b in enumerate(breed_list)}
    city_index = {c: i + len(breed_list) for i, c in enumerate(city_list)}
    
    matrix_size = len(breed_list) + len(city_list)
    matrix = [[0] * matrix_size for _ in range(matrix_size)]
    
    city_breed_counts = defaultdict(lambda: defaultdict(int))
    for post in posts:
        city = post.get("city")
        breed = post.get("breed")
        if city and breed:
            city_breed_counts[city][breed] += 1
    
    for city, breed_counts in city_breed_counts.items():
        for breed, count in breed_counts.items():
            if breed in breed_index and city in city_index:
                b_idx = breed_index[breed]
                c_idx = city_index[city]
                matrix[b_idx][c_idx] = count
                matrix[c_idx][b_idx] = count
    
    nodes = [{"name": b, "type": "breed"} for b in breed_list] + \
            [{"name": c, "type": "city"} for c in city_list]
    
    return {
        "matrix": matrix,
        "nodes": nodes,
        "breed_list": breed_list,
        "city_list": city_list
    }

def get_owner_profile(city, breed_rank):
    profiles = {
        "哈士奇": {
            "age_range": "20-30岁",
            "gender": "男性偏多",
            "occupation": "互联网从业者、自由职业者",
            "lifestyle": "喜欢户外运动、社交活跃",
            "personality": "开朗幽默、热爱生活"
        },
        "泰迪": {
            "age_range": "25-40岁",
            "gender": "女性偏多",
            "occupation": "白领、教师、医护人员",
            "lifestyle": "注重生活品质、喜欢美容时尚",
            "personality": "细致体贴、富有爱心"
        },
        "金毛": {
            "age_range": "30-50岁",
            "gender": "男女均衡",
            "occupation": "企业高管、专业人士",
            "lifestyle": "注重家庭、喜欢户外活动",
            "personality": "稳重可靠、责任心强"
        },
        "比熊": {
            "age_range": "25-35岁",
            "gender": "女性为主",
            "occupation": "白领、设计师",
            "lifestyle": "精致生活、喜欢购物旅游",
            "personality": "温柔善良、追求完美"
        },
        "柴犬": {
            "age_range": "25-35岁",
            "gender": "男女均衡",
            "occupation": "创意工作者、科技从业者",
            "lifestyle": "喜欢潮流文化、爱拍照分享",
            "personality": "乐观向上、富有幽默感"
        },
        "柯基": {
            "age_range": "22-32岁",
            "gender": "女性偏多",
            "occupation": "新媒体从业者、学生",
            "lifestyle": "宅文化爱好者、喜欢追剧",
            "personality": "活泼可爱、充满活力"
        },
        "萨摩耶": {
            "age_range": "25-40岁",
            "gender": "女性偏多",
            "occupation": "教师、公务员",
            "lifestyle": "注重健康、喜欢宠物社交",
            "personality": "阳光开朗、乐于助人"
        },
        "拉布拉多": {
            "age_range": "30-55岁",
            "gender": "男性偏多",
            "occupation": "企业家、工程师",
            "lifestyle": "家庭导向、喜欢运动",
            "personality": "正直诚恳、值得信赖"
        },
        "贵宾": {
            "age_range": "35-50岁",
            "gender": "女性为主",
            "occupation": "企业家夫人、资深白领",
            "lifestyle": "高端社交、注重品牌",
            "personality": "优雅大方、品味独特"
        },
        "博美": {
            "age_range": "20-30岁",
            "gender": "女性为主",
            "occupation": "学生、初入职场",
            "lifestyle": "萌宠文化爱好者、喜欢分享",
            "personality": "天真活泼、充满热情"
        },
    }
    
    top_breed = breed_rank[0]["breed"] if breed_rank else "泰迪"
    return profiles.get(top_breed, profiles["泰迪"])