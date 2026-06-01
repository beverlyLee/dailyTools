DOG_BREEDS = ["泰迪", "金毛", "哈士奇", "比熊", "柴犬", "柯基", "萨摩耶", "拉布拉多", "贵宾", "博美"]

CITIES = [
    {"name": "北京", "region": "华北"},
    {"name": "天津", "region": "华北"},
    {"name": "石家庄", "region": "华北"},
    {"name": "哈尔滨", "region": "东北"},
    {"name": "长春", "region": "东北"},
    {"name": "沈阳", "region": "东北"},
    {"name": "上海", "region": "华东"},
    {"name": "南京", "region": "华东"},
    {"name": "杭州", "region": "华东"},
    {"name": "苏州", "region": "华东"},
    {"name": "无锡", "region": "华东"},
    {"name": "宁波", "region": "华东"},
    {"name": "成都", "region": "西南"},
    {"name": "重庆", "region": "西南"},
    {"name": "西安", "region": "西北"},
    {"name": "广州", "region": "华南"},
    {"name": "深圳", "region": "华南"},
    {"name": "武汉", "region": "华中"},
    {"name": "长沙", "region": "华中"},
    {"name": "郑州", "region": "华中"},
]

def generate_social_media_data():
    data = []
    
    northeast_cities = ["哈尔滨", "长春", "沈阳"]
    jiangzhehu_cities = ["上海", "南京", "杭州", "苏州", "无锡", "宁波"]
    chuanyu_cities = ["成都", "重庆"]
    north_cities = ["北京", "天津", "石家庄"]
    south_cities = ["广州", "深圳"]
    central_cities = ["武汉", "长沙", "郑州"]
    northwest_cities = ["西安"]
    
    for city in northeast_cities:
        for _ in range(300):
            data.append({
                "city": city,
                "content": f"我家的二哈太调皮了 #哈士奇 #宠物 #狗狗 #萌宠",
                "likes": int(100 + (hash(city) % 500)),
                "breed": "哈士奇"
            })
        for _ in range(100):
            data.append({
                "city": city,
                "content": f"金毛真的很温顺 #金毛 #宠物 #狗狗",
                "likes": int(80 + (hash(city) % 400)),
                "breed": "金毛"
            })
        for _ in range(80):
            data.append({
                "city": city,
                "content": f"萨摩耶好可爱 #萨摩耶 #宠物",
                "likes": int(60 + (hash(city) % 300)),
                "breed": "萨摩耶"
            })
    
    for city in jiangzhehu_cities:
        for _ in range(350):
            data.append({
                "city": city,
                "content": f"我家泰迪太聪明了 #泰迪 #宠物 #狗狗 #萌宠",
                "likes": int(120 + (hash(city) % 600)),
                "breed": "泰迪"
            })
        for _ in range(300):
            data.append({
                "city": city,
                "content": f"比熊真的很可爱 #比熊 #宠物 #狗狗",
                "likes": int(100 + (hash(city) % 500)),
                "breed": "比熊"
            })
        for _ in range(120):
            data.append({
                "city": city,
                "content": f"贵宾犬很优雅 #贵宾 #宠物",
                "likes": int(70 + (hash(city) % 350)),
                "breed": "贵宾"
            })
    
    for city in chuanyu_cities:
        for _ in range(280):
            data.append({
                "city": city,
                "content": f"柴犬的笑容太治愈了 #柴犬 #宠物 #狗狗 #萌宠",
                "likes": int(150 + (hash(city) % 700)),
                "breed": "柴犬"
            })
        for _ in range(180):
            data.append({
                "city": city,
                "content": f"柯基的小短腿 #柯基 #宠物 #狗狗",
                "likes": int(90 + (hash(city) % 450)),
                "breed": "柯基"
            })
        for _ in range(100):
            data.append({
                "city": city,
                "content": f"泰迪很活泼 #泰迪 #宠物",
                "likes": int(60 + (hash(city) % 300)),
                "breed": "泰迪"
            })
    
    for city in north_cities:
        for _ in range(200):
            data.append({
                "city": city,
                "content": f"金毛真的很温顺 #金毛 #宠物 #狗狗",
                "likes": int(110 + (hash(city) % 550)),
                "breed": "金毛"
            })
        for _ in range(180):
            data.append({
                "city": city,
                "content": f"哈士奇太二了 #哈士奇 #宠物 #狗狗",
                "likes": int(90 + (hash(city) % 450)),
                "breed": "哈士奇"
            })
        for _ in range(150):
            data.append({
                "city": city,
                "content": f"拉布拉多很聪明 #拉布拉多 #宠物",
                "likes": int(80 + (hash(city) % 400)),
                "breed": "拉布拉多"
            })
    
    for city in south_cities:
        for _ in range(220):
            data.append({
                "city": city,
                "content": f"泰迪很可爱 #泰迪 #宠物 #狗狗",
                "likes": int(130 + (hash(city) % 650)),
                "breed": "泰迪"
            })
        for _ in range(200):
            data.append({
                "city": city,
                "content": f"金毛很温顺 #金毛 #宠物 #狗狗",
                "likes": int(100 + (hash(city) % 500)),
                "breed": "金毛"
            })
        for _ in range(160):
            data.append({
                "city": city,
                "content": f"博美很小巧 #博美 #宠物",
                "likes": int(70 + (hash(city) % 350)),
                "breed": "博美"
            })
    
    for city in central_cities:
        for _ in range(180):
            data.append({
                "city": city,
                "content": f"哈士奇很有趣 #哈士奇 #宠物 #狗狗",
                "likes": int(90 + (hash(city) % 450)),
                "breed": "哈士奇"
            })
        for _ in range(160):
            data.append({
                "city": city,
                "content": f"金毛很忠诚 #金毛 #宠物 #狗狗",
                "likes": int(80 + (hash(city) % 400)),
                "breed": "金毛"
            })
        for _ in range(140):
            data.append({
                "city": city,
                "content": f"泰迪很活泼 #泰迪 #宠物",
                "likes": int(70 + (hash(city) % 350)),
                "breed": "泰迪"
            })
    
    for city in northwest_cities:
        for _ in range(150):
            data.append({
                "city": city,
                "content": f"萨摩耶很友善 #萨摩耶 #宠物 #狗狗",
                "likes": int(80 + (hash(city) % 400)),
                "breed": "萨摩耶"
            })
        for _ in range(120):
            data.append({
                "city": city,
                "content": f"金毛很温顺 #金毛 #宠物 #狗狗",
                "likes": int(70 + (hash(city) % 350)),
                "breed": "金毛"
            })
        for _ in range(100):
            data.append({
                "city": city,
                "content": f"哈士奇很二 #哈士奇 #宠物",
                "likes": int(60 + (hash(city) % 300)),
                "breed": "哈士奇"
            })
    
    return data

def generate_hospital_data():
    data = []
    
    for city_info in CITIES:
        city = city_info["name"]
        base_count = 1000 + (hash(city) % 500)
        
        breed_distribution = {
            "哈尔滨": {"哈士奇": 35, "金毛": 25, "萨摩耶": 20, "泰迪": 10, "其他": 10},
            "长春": {"哈士奇": 33, "金毛": 26, "萨摩耶": 22, "泰迪": 9, "其他": 10},
            "沈阳": {"哈士奇": 34, "金毛": 24, "萨摩耶": 21, "泰迪": 11, "其他": 10},
            "上海": {"泰迪": 35, "比熊": 30, "贵宾": 15, "金毛": 10, "其他": 10},
            "南京": {"泰迪": 33, "比熊": 28, "贵宾": 16, "金毛": 13, "其他": 10},
            "杭州": {"泰迪": 34, "比熊": 29, "贵宾": 15, "金毛": 12, "其他": 10},
            "苏州": {"泰迪": 36, "比熊": 31, "贵宾": 14, "金毛": 9, "其他": 10},
            "无锡": {"泰迪": 32, "比熊": 27, "贵宾": 17, "金毛": 14, "其他": 10},
            "宁波": {"泰迪": 35, "比熊": 28, "贵宾": 15, "金毛": 12, "其他": 10},
            "成都": {"柴犬": 32, "柯基": 25, "泰迪": 20, "金毛": 13, "其他": 10},
            "重庆": {"柴犬": 30, "柯基": 27, "泰迪": 22, "金毛": 11, "其他": 10},
            "北京": {"金毛": 30, "哈士奇": 25, "拉布拉多": 20, "泰迪": 15, "其他": 10},
            "天津": {"金毛": 28, "哈士奇": 26, "拉布拉多": 22, "泰迪": 14, "其他": 10},
            "石家庄": {"金毛": 29, "哈士奇": 24, "拉布拉多": 21, "泰迪": 16, "其他": 10},
            "广州": {"泰迪": 30, "金毛": 25, "博美": 20, "哈士奇": 15, "其他": 10},
            "深圳": {"泰迪": 32, "金毛": 24, "博美": 21, "哈士奇": 13, "其他": 10},
            "武汉": {"哈士奇": 28, "金毛": 26, "泰迪": 22, "柯基": 14, "其他": 10},
            "长沙": {"哈士奇": 26, "金毛": 27, "泰迪": 23, "柯基": 14, "其他": 10},
            "郑州": {"哈士奇": 27, "金毛": 25, "泰迪": 24, "柯基": 14, "其他": 10},
            "西安": {"萨摩耶": 28, "金毛": 25, "哈士奇": 22, "泰迪": 15, "其他": 10},
        }
        
        dist = breed_distribution.get(city, {"泰迪": 20, "金毛": 20, "哈士奇": 20, "其他": 40})
        
        for breed, percentage in dist.items():
            count = int(base_count * percentage / 100)
            data.append({
                "city": city,
                "breed": breed,
                "count": count,
                "year": 2024
            })
    
    return data