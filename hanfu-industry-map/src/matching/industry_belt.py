from typing import List, Dict

INDUSTRY_BELTS = {
    "杭州汉服产业带": {
        "cities": ["杭州"],
        "level": "core",
        "description": "全国最大的汉服设计、品牌运营中心",
        "features": ["高端设计", "品牌集聚", "电商运营"]
    },
    "曹县汉服产业带": {
        "cities": ["曹县", "菏泽"],
        "level": "core",
        "description": "全国最大的汉服生产制造基地",
        "features": ["生产制造", "成本优势", "供应链完整"]
    },
    "广州汉服产业带": {
        "cities": ["广州", "深圳"],
        "level": "important",
        "description": "华南地区汉服商贸中心",
        "features": ["面辅料市场", "外贸出口"]
    },
    "成渝汉服产业带": {
        "cities": ["成都", "重庆"],
        "level": "emerging",
        "description": "西南地区汉服文化中心",
        "features": ["文化体验", "线下活动"]
    },
    "长三角汉服产业带": {
        "cities": ["南京", "苏州", "上海"],
        "level": "emerging",
        "description": "华东地区汉服消费市场",
        "features": ["消费市场", "文化活动"]
    }
}


def match_industry_belt(city: str) -> Dict:
    for belt_name, belt_info in INDUSTRY_BELTS.items():
        if city in belt_info["cities"]:
            return {
                "belt_name": belt_name,
                "level": belt_info["level"],
                "description": belt_info["description"],
                "features": belt_info["features"]
            }
    return {
        "belt_name": "其他区域",
        "level": "general",
        "description": "非主要汉服产业带",
        "features": []
    }


def get_all_industry_belts() -> Dict:
    return INDUSTRY_BELTS


def get_merchants_with_belt_info(merchants: List[Dict]) -> List[Dict]:
    for merchant in merchants:
        city = merchant.get("city", "")
        belt_info = match_industry_belt(city)
        merchant["industry_belt"] = belt_info["belt_name"]
        merchant["belt_level"] = belt_info["level"]
        merchant["belt_description"] = belt_info["description"]
    return merchants


def get_top_merchants_by_city(merchants: List[Dict], city: str, top_n: int = 5) -> List[Dict]:
    city_merchants = [m for m in merchants if m.get("city") == city]
    city_merchants.sort(key=lambda x: x.get("sales", 0), reverse=True)
    return city_merchants[:top_n]
