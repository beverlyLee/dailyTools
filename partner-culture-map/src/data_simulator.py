import random
from typing import List, Dict


class DataSimulator:
    
    SAMPLE_POST_TEMPLATES = {
        "饭搭子": [
            "求饭搭子！坐标{city}，周末一起去吃火锅怎么样？",
            "有没有{city}的饭搭子，最近新开了家日料店想去试试",
            "寻{city}饭搭子，川菜粤菜都可以，不挑食",
            "{city}蹲个饭搭子，想找个人一起探店",
            "求一个{city}的饭搭子，一起去吃烧烤喝啤酒"
        ],
        "健身搭子": [
            "找{city}健身搭子，健身房互相监督",
            "有没有{city}的健身搭子，一起跑步打卡",
            "{city}求健身搭子，瑜伽普拉提都可以",
            "坐标{city}，寻健身搭子一起撸铁",
            "{city}蹲个健身搭子，每天一起运动"
        ],
        "游戏搭子": [
            "求{city}游戏搭子，王者荣耀一起上分",
            "{city}有没有游戏搭子，原神一起玩",
            "坐标{city}，找游戏搭子开黑",
            "{city}蹲个游戏搭子，LOL英雄联盟",
            "寻{city}游戏搭子，吃鸡绝地求生一起组队"
        ],
        "旅游搭子": [
            "求{city}旅游搭子，周末周边游",
            "{city}有没有旅游搭子，一起去拍照打卡",
            "坐标{city}，寻旅游搭子一起自驾游",
            "{city}蹲个旅游搭子，想出去玩",
            "找{city}旅游搭子，一起去看风景"
        ],
        "看展搭子": [
            "求{city}看展搭子，美术馆一起去",
            "{city}有没有看展搭子，艺术展约起来",
            "坐标{city}，寻看展搭子",
            "{city}蹲个看展搭子，博物馆一起逛",
            "找{city}看展搭子，摄影展一起去"
        ],
        "学习搭子": [
            "求{city}学习搭子，图书馆一起自习",
            "{city}有没有学习搭子，考研互相监督",
            "坐标{city}，寻学习搭子",
            "{city}蹲个学习搭子，英语雅思一起学",
            "找{city}学习搭子，备考一起加油"
        ],
        "电影搭子": [
            "求{city}电影搭子，新片一起看",
            "{city}有没有电影搭子，电影院约起来",
            "坐标{city}，寻电影搭子",
            "{city}蹲个电影搭子，IMAX一起去",
            "找{city}电影搭子，电影节一起参加"
        ],
        "逛街搭子": [
            "求{city}逛街搭子，商场一起逛",
            "{city}有没有逛街搭子，买衣服去",
            "坐标{city}，寻逛街搭子",
            "{city}蹲个逛街搭子，探店去",
            "找{city}逛街搭子，打折季一起购物"
        ],
        "宠物搭子": [
            "求{city}宠物搭子，遛狗一起去",
            "{city}有没有宠物搭子，撸猫撸狗",
            "坐标{city}，寻宠物搭子",
            "{city}蹲个宠物搭子，猫咖一起去",
            "找{city}宠物搭子，宠物交流"
        ],
        "酒搭子": [
            "求{city}酒搭子，酒吧一起去",
            "{city}有没有酒搭子，小酌一杯",
            "坐标{city}，寻酒搭子",
            "{city}蹲个酒搭子，清吧一起坐坐",
            "找{city}酒搭子，微醺一下"
        ]
    }

    CITY_LOCATIONS = {
        "北京": ["海淀", "朝阳", "东城", "西城", "丰台"],
        "上海": ["浦东", "浦西", "徐汇", "静安", "黄浦"],
        "广州": ["天河", "越秀", "海珠", "荔湾", "番禺"],
        "深圳": ["南山", "福田", "罗湖", "宝安", "龙岗"],
        "成都": ["锦江", "青羊", "武侯", "成华", "金牛"],
        "长沙": ["芙蓉", "天心", "岳麓", "开福", "雨花"]
    }

    @classmethod
    def generate_simulated_posts(cls, city: str, partner_type: str, count: int = 50) -> List[Dict]:
        posts = []
        templates = cls.SAMPLE_POST_TEMPLATES.get(partner_type, cls.SAMPLE_POST_TEMPLATES["饭搭子"])
        locations = cls.CITY_LOCATIONS.get(city, ["市中心"])
        
        for i in range(count):
            template = random.choice(templates)
            location = random.choice(locations)
            
            is_demand = random.random() < 0.6
            
            if is_demand:
                prefix = random.choice(["求", "找", "寻", "蹲", "征"])
                if not template.startswith(prefix):
                    template = prefix + "一个" + template[template.find(city):] if city in template else prefix + "一个" + template
            
            post_text = template.replace("{city}", city)
            
            if random.random() < 0.3:
                post_text = f"坐标{city}{location}，" + post_text
            
            posts.append({
                "id": f"{city}_{partner_type}_{i}",
                "text": post_text,
                "city": city,
                "platform": random.choice(["小红书", "即刻"]),
                "likes": random.randint(10, 500),
                "comments": random.randint(5, 100),
                "timestamp": f"2024-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
            })
        
        return posts

    @classmethod
    def generate_all_simulated_data(cls) -> List[Dict]:
        all_posts = []
        cities = ["北京", "上海", "广州", "深圳", "成都", "长沙"]
        partner_types = ["饭搭子", "健身搭子", "游戏搭子", "旅游搭子", "看展搭子", 
                        "学习搭子", "电影搭子", "逛街搭子", "宠物搭子", "酒搭子"]
        
        type_city_weights = {
            "北京": {"游戏搭子": 1.8, "学习搭子": 1.5, "看展搭子": 1.3},
            "上海": {"健身搭子": 1.7, "看展搭子": 1.9, "逛街搭子": 1.6},
            "广州": {"饭搭子": 1.5, "健身搭子": 1.2},
            "深圳": {"健身搭子": 1.4, "学习搭子": 1.6},
            "成都": {"饭搭子": 2.0, "酒搭子": 1.8, "游戏搭子": 1.5},
            "长沙": {"酒搭子": 1.9, "饭搭子": 1.7, "游戏搭子": 1.4}
        }
        
        for city in cities:
            for partner_type in partner_types:
                weight = type_city_weights.get(city, {}).get(partner_type, 1.0)
                base_count = int(30 * weight)
                count = max(10, base_count + random.randint(-10, 20))
                posts = cls.generate_simulated_posts(city, partner_type, count)
                all_posts.extend(posts)
        
        return all_posts