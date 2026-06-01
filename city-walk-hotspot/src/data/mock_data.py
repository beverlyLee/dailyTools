"""
模拟数据模块 - 提供小红书 City Walk 话题的模拟笔记数据
包含上海武康路-安福路和北京什刹海胡同两个热门区域
"""

import random

MOCK_NOTES = [
    {
        "id": "note_001",
        "title": "上海武康路安福路半日City Walk",
        "platform": "小红书",
        "author": "魔都漫步者",
        "city": "上海",
        "likes": 25800,
        "comments": 1230,
        "shares": 890,
        "route_points": [
            {"name": "武康大楼", "lat": 31.2125, "lng": 121.4365},
            {"name": "武康路沿街老洋房", "lat": 31.2140, "lng": 121.4380},
            {"name": "武康庭", "lat": 31.2155, "lng": 121.4395},
            {"name": "安福路话剧中心", "lat": 31.2165, "lng": 121.4410},
            {"name": "安福路文艺小店区", "lat": 31.2175, "lng": 121.4430}
        ],
        "tags": ["City Walk", "上海", "武康路", "安福路"],
        "commercial_score": 0.85,
        "poi_density": [
            {"name": "%Arabica咖啡店", "lat": 31.2130, "lng": 121.4370, "type": "coffee"},
            {"name": "武康大楼冰淇淋店", "lat": 31.2128, "lng": 121.4368, "type": "dessert"},
            {"name": "多抓鱼循环商店", "lat": 31.2158, "lng": 121.4398, "type": "shop"},
            {"name": "Alimentari意式餐厅", "lat": 31.2160, "lng": 121.4405, "type": "restaurant"},
            {"name": "BM服装店", "lat": 31.2170, "lng": 121.4420, "type": "clothing"},
            {"name": "话剧艺术中心咖啡馆", "lat": 31.2168, "lng": 121.4412, "type": "coffee"}
        ]
    },
    {
        "id": "note_002",
        "title": "上海CityWalk|武康路安福路文艺路线",
        "platform": "小红书",
        "author": "城市漫游指南",
        "city": "上海",
        "likes": 32100,
        "comments": 2150,
        "shares": 1560,
        "route_points": [
            {"name": "武康大楼", "lat": 31.2125, "lng": 121.4365},
            {"name": "宋庆龄故居", "lat": 31.2135, "lng": 121.4375},
            {"name": "武康庭", "lat": 31.2155, "lng": 121.4395},
            {"name": "安福路", "lat": 31.2165, "lng": 121.4410},
            {"name": "巨鹿路小店区", "lat": 31.2180, "lng": 121.4445}
        ],
        "tags": ["City Walk", "上海", "文艺", "拍照"],
        "commercial_score": 0.82,
        "poi_density": [
            {"name": "武康大楼网红冰淇淋", "lat": 31.2127, "lng": 121.4367, "type": "dessert"},
            {"name": "老麦咖啡馆", "lat": 31.2142, "lng": 121.4382, "type": "coffee"},
            {"name": "武康庭餐厅", "lat": 31.2156, "lng": 121.4396, "type": "restaurant"},
            {"name": "RAC Bar", "lat": 31.2162, "lng": 121.4408, "type": "restaurant"},
            {"name": "BM潮牌店", "lat": 31.2169, "lng": 121.4418, "type": "clothing"},
            {"name": "多抓鱼书店", "lat": 31.2159, "lng": 121.4397, "type": "bookstore"}
        ]
    },
    {
        "id": "note_003",
        "title": "北京胡同CityWalk|什刹海烟袋斜街",
        "platform": "小红书",
        "author": "京城老炮儿",
        "city": "北京",
        "likes": 18900,
        "comments": 980,
        "shares": 670,
        "route_points": [
            {"name": "什刹海地铁站", "lat": 39.9415, "lng": 116.3820},
            {"name": "烟袋斜街", "lat": 39.9400, "lng": 116.3835},
            {"name": "银锭桥", "lat": 39.9390, "lng": 116.3850},
            {"name": "南锣鼓巷", "lat": 39.9370, "lng": 116.4030},
            {"name": "后海酒吧街", "lat": 39.9405, "lng": 116.3860}
        ],
        "tags": ["City Walk", "北京", "胡同", "什刹海"],
        "commercial_score": 0.75,
        "poi_density": [
            {"name": "烟袋斜街文创店", "lat": 39.9402, "lng": 116.3838, "type": "shop"},
            {"name": "姚记炒肝", "lat": 39.9395, "lng": 116.3842, "type": "restaurant"},
            {"name": "什刹海冰糖葫芦", "lat": 39.9408, "lng": 116.3828, "type": "snack"},
            {"name": "后海酒吧", "lat": 39.9407, "lng": 116.3862, "type": "bar"},
            {"name": "南锣鼓巷小吃", "lat": 39.9372, "lng": 116.4032, "type": "snack"}
        ]
    },
    {
        "id": "note_004",
        "title": "北京CityWalk|什刹海到南锣鼓巷胡同串子",
        "platform": "小红书",
        "author": "胡同探险家",
        "city": "北京",
        "likes": 22400,
        "comments": 1560,
        "shares": 890,
        "route_points": [
            {"name": "鼓楼", "lat": 39.9425, "lng": 116.3965},
            {"name": "烟袋斜街", "lat": 39.9400, "lng": 116.3835},
            {"name": "银锭桥", "lat": 39.9390, "lng": 116.3850},
            {"name": "什刹海前海", "lat": 39.9385, "lng": 116.3865},
            {"name": "南锣鼓巷", "lat": 39.9370, "lng": 116.4030}
        ],
        "tags": ["City Walk", "北京", "胡同", "历史", "拍照"],
        "commercial_score": 0.78,
        "poi_density": [
            {"name": "鼓楼文创", "lat": 39.9427, "lng": 116.3967, "type": "shop"},
            {"name": "姚记炒肝店", "lat": 39.9395, "lng": 116.3842, "type": "restaurant"},
            {"name": "烟袋斜街老字号", "lat": 39.9401, "lng": 116.3836, "type": "shop"},
            {"name": "后海酒吧", "lat": 39.9406, "lng": 116.3861, "type": "bar"},
            {"name": "南锣鼓巷小吃", "lat": 39.9371, "lng": 116.4031, "type": "snack"},
            {"name": "文宇奶酪店", "lat": 39.9380, "lng": 116.4010, "type": "dessert"}
        ]
    },
    {
        "id": "note_005",
        "title": "上海CityWalk|武康路湖南路文艺打卡",
        "platform": "抖音",
        "author": "魔都探店菌",
        "city": "上海",
        "likes": 45600,
        "comments": 3200,
        "shares": 2800,
        "route_points": [
            {"name": "武康大楼", "lat": 31.2125, "lng": 121.4365},
            {"name": "武康路210号", "lat": 31.2145, "lng": 121.4385},
            {"name": "湖南路", "lat": 31.2160, "lng": 121.4400},
            {"name": "安福路", "lat": 31.2165, "lng": 121.4410},
            {"name": "永康路", "lat": 31.2190, "lng": 121.4460}
        ],
        "tags": ["City Walk", "上海", "武康路", "网红打卡"],
        "commercial_score": 0.88,
        "poi_density": [
            {"name": "%Arabica", "lat": 31.2130, "lng": 121.4370, "type": "coffee"},
            {"name": "武康大楼甜品", "lat": 31.2127, "lng": 121.4367, "type": "dessert"},
            {"name": "老麦咖啡馆", "lat": 31.2143, "lng": 121.4383, "type": "coffee"},
            {"name": "多抓鱼", "lat": 31.2159, "lng": 121.4398, "type": "bookstore"},
            {"name": "Alimentari", "lat": 31.2161, "lng": 121.4406, "type": "restaurant"},
            {"name": "BM服装", "lat": 31.2168, "lng": 121.4418, "type": "clothing"},
            {"name": "永康路酒吧街", "lat": 31.2188, "lng": 121.4458, "type": "bar"}
        ]
    },
    {
        "id": "note_006",
        "title": "北京CityWalk|什刹海胡同里的烟火气",
        "platform": "快手",
        "author": "北京土著",
        "city": "北京",
        "likes": 15600,
        "comments": 890,
        "shares": 450,
        "route_points": [
            {"name": "北海北门", "lat": 39.9400, "lng": 116.3885},
            {"name": "什刹海", "lat": 39.9395, "lng": 116.3860},
            {"name": "烟袋斜街", "lat": 39.9400, "lng": 116.3835},
            {"name": "鸦儿胡同", "lat": 39.9410, "lng": 116.3825},
            {"name": "鼓楼", "lat": 39.9425, "lng": 116.3965}
        ],
        "tags": ["City Walk", "北京", "什刹海", "胡同", "烟火气"],
        "commercial_score": 0.72,
        "poi_density": [
            {"name": "烟袋斜街文创", "lat": 39.9402, "lng": 116.3837, "type": "shop"},
            {"name": "鼓楼小吃", "lat": 39.9426, "lng": 116.3966, "type": "snack"},
            {"name": "姚记炒肝", "lat": 39.9395, "lng": 116.3843, "type": "restaurant"},
            {"name": "后海咖啡", "lat": 39.9405, "lng": 116.3858, "type": "coffee"}
        ]
    },
    {
        "id": "note_007",
        "title": "上海武康路半日CityWalk全攻略",
        "platform": "小红书",
        "author": "城市漫步爱好者",
        "city": "上海",
        "likes": 28900,
        "comments": 1890,
        "shares": 1200,
        "route_points": [
            {"name": "武康大楼", "lat": 31.2125, "lng": 121.4365},
            {"name": "武康庭", "lat": 31.2155, "lng": 121.4395},
            {"name": "安福路", "lat": 31.2165, "lng": 121.4410},
            {"name": "乌鲁木齐中路", "lat": 31.2172, "lng": 121.4425},
            {"name": "永康路", "lat": 31.2190, "lng": 121.4460}
        ],
        "tags": ["City Walk", "上海", "武康路", "安福路", "攻略"],
        "commercial_score": 0.86,
        "poi_density": [
            {"name": "%Arabica", "lat": 31.2130, "lng": 121.4370, "type": "coffee"},
            {"name": "武康冰淇淋", "lat": 31.2127, "lng": 121.4367, "type": "dessert"},
            {"name": "老麦咖啡", "lat": 31.2142, "lng": 121.4382, "type": "coffee"},
            {"name": "多抓鱼书店", "lat": 31.2159, "lng": 121.4397, "type": "bookstore"},
            {"name": "RAC Bar", "lat": 31.2162, "lng": 121.4408, "type": "restaurant"},
            {"name": "BM潮牌", "lat": 31.2169, "lng": 121.4418, "type": "clothing"},
            {"name": "永康路酒吧", "lat": 31.2188, "lng": 121.4458, "type": "bar"}
        ]
    },
    {
        "id": "note_008",
        "title": "北京胡同漫步|从什刹海到南锣鼓巷",
        "platform": "抖音",
        "author": "北京旅行家",
        "city": "北京",
        "likes": 28600,
        "comments": 1890,
        "shares": 1200,
        "route_points": [
            {"name": "鼓楼", "lat": 39.9425, "lng": 116.3965},
            {"name": "烟袋斜街", "lat": 39.9400, "lng": 116.3835},
            {"name": "银锭桥", "lat": 39.9390, "lng": 116.3850},
            {"name": "后海", "lat": 39.9405, "lng": 116.3860},
            {"name": "南锣鼓巷", "lat": 39.9370, "lng": 116.4030}
        ],
        "tags": ["City Walk", "北京", "胡同", "什刹海", "南锣鼓巷"],
        "commercial_score": 0.80,
        "poi_density": [
            {"name": "鼓楼文创店", "lat": 39.9427, "lng": 116.3967, "type": "shop"},
            {"name": "姚记炒肝", "lat": 39.9395, "lng": 116.3842, "type": "restaurant"},
            {"name": "烟袋斜街老字号", "lat": 39.9401, "lng": 116.3836, "type": "shop"},
            {"name": "后海酒吧街", "lat": 39.9406, "lng": 116.3861, "type": "bar"},
            {"name": "南锣鼓巷小吃", "lat": 39.9371, "lng": 116.4031, "type": "snack"},
            {"name": "文宇奶酪", "lat": 39.9380, "lng": 116.4010, "type": "dessert"}
        ]
    },
    {
        "id": "note_009",
        "title": "上海CityWalk|衡复历史文化区漫游",
        "platform": "小红书",
        "author": "魔都文艺青年",
        "city": "上海",
        "likes": 19800,
        "comments": 1200,
        "shares": 780,
        "route_points": [
            {"name": "衡山路地铁站", "lat": 31.2100, "lng": 121.4380},
            {"name": "武康路", "lat": 31.2125, "lng": 121.4365},
            {"name": "安福路", "lat": 31.2165, "lng": 121.4410},
            {"name": "华山路", "lat": 31.2200, "lng": 121.4420},
            {"name": "复兴西路", "lat": 31.2170, "lng": 121.4370}
        ],
        "tags": ["City Walk", "上海", "衡复", "历史建筑"],
        "commercial_score": 0.70,
        "poi_density": [
            {"name": "衡山小馆", "lat": 31.2102, "lng": 121.4382, "type": "restaurant"},
            {"name": "武康大楼咖啡", "lat": 31.2128, "lng": 121.4368, "type": "coffee"},
            {"name": "安福路餐厅", "lat": 31.2166, "lng": 121.4412, "type": "restaurant"},
            {"name": "华山绿地周边", "lat": 31.2202, "lng": 121.4422, "type": "park"}
        ]
    },
    {
        "id": "note_010",
        "title": "北京什刹海CityWalk|感受老北京烟火气",
        "platform": "快手",
        "author": "京城漫游者",
        "city": "北京",
        "likes": 12300,
        "comments": 560,
        "shares": 340,
        "route_points": [
            {"name": "北海公园", "lat": 39.9255, "lng": 116.3890},
            {"name": "什刹海前海", "lat": 39.9385, "lng": 116.3865},
            {"name": "烟袋斜街", "lat": 39.9400, "lng": 116.3835},
            {"name": "鸦儿胡同", "lat": 39.9410, "lng": 116.3825},
            {"name": "鼓楼", "lat": 39.9425, "lng": 116.3965}
        ],
        "tags": ["City Walk", "北京", "什刹海", "烟火气"],
        "commercial_score": 0.68,
        "poi_density": [
            {"name": "北海文创", "lat": 39.9257, "lng": 116.3892, "type": "shop"},
            {"name": "姚记炒肝", "lat": 39.9395, "lng": 116.3842, "type": "restaurant"},
            {"name": "烟袋斜街", "lat": 39.9402, "lng": 116.3837, "type": "shop"},
            {"name": "鼓楼小吃", "lat": 39.9426, "lng": 116.3966, "type": "snack"}
        ]
    }
]

POI_TYPE_COLORS = {
    "coffee": "#8B4513",
    "dessert": "#FF69B4",
    "restaurant": "#FF4500",
    "shop": "#4169E1",
    "clothing": "#9370DB",
    "bookstore": "#228B22",
    "bar": "#DC143C",
    "snack": "#FFA500",
    "park": "#32CD32"
}

POI_TYPE_NAMES = {
    "coffee": "咖啡馆",
    "dessert": "甜品店",
    "restaurant": "餐厅",
    "shop": "商店",
    "clothing": "服装店",
    "bookstore": "书店",
    "bar": "酒吧",
    "snack": "小吃",
    "park": "公园"
}

def get_all_notes():
    return MOCK_NOTES

def get_notes_by_city(city):
    return [n for n in MOCK_NOTES if n["city"] == city]

def get_notes_by_platform(platform):
    return [n for n in MOCK_NOTES if n["platform"] == platform]

def calculate_note_hotness(note):
    likes = note.get("likes", 0)
    comments = note.get("comments", 0)
    shares = note.get("shares", 0)
    weight_likes = 1.0
    weight_comments = 3.0
    weight_shares = 5.0
    hotness = (likes * weight_likes + comments * weight_comments + shares * weight_shares) / 1000.0
    return round(hotness, 2)

def get_poi_type_color(poi_type):
    return POI_TYPE_COLORS.get(poi_type, "#808080")

def get_poi_type_name(poi_type):
    return POI_TYPE_NAMES.get(poi_type, poi_type)
