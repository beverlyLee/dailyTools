import re
from typing import Dict, List, Optional


class PartnerClassifier:
    
    PARTNER_TYPES = {
        "饭搭子": {
            "keywords": ["饭搭子", "吃饭", "饭局", "约饭", "美食", "餐厅", "探店", "火锅", "烧烤", "日料", "粤菜", "川菜", "下午茶", "早茶", "聚餐", "干饭", "吃什么", "一起吃", "觅食", "食堂", "外卖"],
            "weight": 1.5
        },
        "健身搭子": {
            "keywords": ["健身搭子", "健身", "健身房", "撸铁", "跑步", "马拉松", "瑜伽", "普拉提", "游泳", "打球", "羽毛球", "乒乓球", "网球", "篮球", "足球", "骑行", "徒步", "爬山", "登山", "运动", "减肥", "塑形", "锻炼"],
            "weight": 1.3
        },
        "游戏搭子": {
            "keywords": ["游戏搭子", "开黑", "打游戏", "电竞", "王者荣耀", "LOL", "英雄联盟", "吃鸡", "绝地求生", "原神", "崩坏", "DOTA", "CSGO", "永劫无间", "第五人格", "手游", "网游", "主机游戏", "Switch", "PS5", "Steam", "游戏陪玩"],
            "weight": 1.4
        },
        "旅游搭子": {
            "keywords": ["旅游搭子", "旅行", "出游", "自驾游", "攻略", "景点", "打卡", "拍照", "摄影", "景区", "民宿", "酒店", "机票", "火车票", "背包客", "穷游", "度假", "周末游", "周边游", "一日游", "citywalk", "City Walk"],
            "weight": 1.2
        },
        "看展搭子": {
            "keywords": ["看展搭子", "看展", "展览", "艺术展", "博物馆", "美术馆", "画展", "摄影展", "文化展", "科技馆", "博览馆", "展馆", "艺术", "艺术品", "当代艺术", "先锋艺术", "装置艺术", "行为艺术"],
            "weight": 1.1
        },
        "学习搭子": {
            "keywords": ["学习搭子", "自习", "图书馆", "考研", "考公", "考证", "学习", "背书", "刷题", "论文", "写作", "读书", "读书会", "英语", "雅思", "托福", "GRE", "编程", "网课", "考证"],
            "weight": 1.0
        },
        "电影搭子": {
            "keywords": ["电影搭子", "看电影", "观影", "电影", "影院", "IMAX", "首映", "电影节", "话剧", "音乐剧", "音乐会", "演唱会", "livehouse", "Livehouse", "脱口秀", "相声", "戏曲", "演出"],
            "weight": 1.0
        },
        "逛街搭子": {
            "keywords": ["逛街搭子", "逛街", "购物", "商场", "百货", "购物中心", "买衣服", "买鞋", "买包", "化妆品", "奢侈品", "打折", "促销", "淘宝", "网购", "探店"],
            "weight": 0.9
        },
        "宠物搭子": {
            "keywords": ["宠物搭子", "遛狗", "猫咪", "狗狗", "宠物", "撸猫", "撸狗", "猫咖", "狗咖", "宠物店", "宠物医院", "宠物用品", "狗粮", "猫粮"],
            "weight": 0.8
        },
        "酒搭子": {
            "keywords": ["酒搭子", "喝酒", "酒吧", "清吧", "夜店", "蹦迪", "KTV", "小酌", "微醺", "调酒", "精酿", "红酒", "白酒", "啤酒", "鸡尾酒", "威士忌"],
            "weight": 1.0
        }
    }

    CITY_KEYWORDS = {
        "北京": ["北京", "帝都", "京城", "bj", "BJ", "首都", "海淀", "朝阳", "东城", "西城", "丰台", "石景山", "通州"],
        "上海": ["上海", "魔都", "沪", "sh", "SH", "浦东", "浦西", "徐汇", "静安", "黄浦", "长宁", "虹口", "杨浦"],
        "广州": ["广州", "羊城", "花城", "gz", "GZ", "天河", "越秀", "海珠", "荔湾", "番禺", "白云", "黄埔"],
        "深圳": ["深圳", "鹏城", "sz", "SZ", "南山", "福田", "罗湖", "宝安", "龙岗", "龙华", "盐田"],
        "成都": ["成都", "蓉城", "锦城", "cd", "CD", "天府", "锦江", "青羊", "武侯", "成华", "金牛", "高新区"],
        "长沙": ["长沙", "星城", "cs", "CS", "芙蓉", "天心", "岳麓", "开福", "雨花", "星沙"]
    }

    DEMAND_PATTERNS = [
        r"求.*?搭子",
        r"找.*?搭子",
        r"寻.*?搭子",
        r"有没有.*?搭子",
        r"缺.*?搭子",
        r"需要.*?搭子",
        r"等一个.*?搭子",
        r"蹲.*?搭子",
        r"征.*?搭子",
        r"捞.*?搭子",
        r"跪求.*?搭子"
    ]

    SUPPLY_PATTERNS = [
        r"本人.*?搭子",
        r"我是.*?搭子",
        r"可以当.*?搭子",
        r"提供.*?搭子",
        r"愿做.*?搭子",
        r"来当.*?搭子"
    ]

    @classmethod
    def classify_post(cls, text: str) -> Dict:
        result = {
            "partner_types": [],
            "city": None,
            "demand_score": 0,
            "supply_score": 0,
            "primary_type": None,
            "confidence": 0.0
        }

        if not text:
            return result

        type_scores = {}
        for partner_type, config in cls.PARTNER_TYPES.items():
            score = 0
            for keyword in config["keywords"]:
                if keyword in text:
                    score += config["weight"]
            if score > 0:
                type_scores[partner_type] = score

        if type_scores:
            sorted_types = sorted(type_scores.items(), key=lambda x: x[1], reverse=True)
            result["partner_types"] = [t[0] for t in sorted_types]
            result["primary_type"] = sorted_types[0][0]
            total = sum(type_scores.values())
            result["confidence"] = min(sorted_types[0][1] / total, 1.0) if total > 0 else 0.0

        for city, keywords in cls.CITY_KEYWORDS.items():
            for keyword in keywords:
                if keyword in text:
                    result["city"] = city
                    break
            if result["city"]:
                break

        for pattern in cls.DEMAND_PATTERNS:
            if re.search(pattern, text):
                result["demand_score"] += 1

        for pattern in cls.SUPPLY_PATTERNS:
            if re.search(pattern, text):
                result["supply_score"] += 1

        return result

    @classmethod
    def batch_classify(cls, posts: List[str]) -> List[Dict]:
        return [cls.classify_post(post) for post in posts]

    @classmethod
    def get_all_partner_types(cls) -> List[str]:
        return list(cls.PARTNER_TYPES.keys())

    @classmethod
    def get_all_cities(cls) -> List[str]:
        return list(cls.CITY_KEYWORDS.keys())