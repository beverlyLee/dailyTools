from typing import List, Dict

MOCK_PLACES: List[Dict] = [
    {
        "id": "1",
        "name": "星巴克 (国贸店)",
        "type": "cafe",
        "address": "北京市朝阳区建国门外大街1号国贸商城",
        "latitude": 39.9087,
        "longitude": 116.4605,
        "rating": 4.5,
        "price_level": 3,
        "avg_price": 45,
        "image_url": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect fill='%238B4513' width='800' height='600'/%3E%3Ctext x='400' y='320' text-anchor='middle' fill='white' font-size='100'%3E%E2%98%95%3C/text%3E%3Ctext x='400' y='450' text-anchor='middle' fill='white' font-size='36'%3EStarbucks%3C/text%3E%3C/svg%3E",
        "comments": [
            "这里的WiFi真的很快，下载文件完全不卡！窗边的位置有插座，很方便充电。整体环境安静，适合办公。",
            "国贸这家星巴克人不算太多，二楼角落位置有插座，特别适合长时间办公。网速很稳定。",
            "咖啡味道一般，但环境真的不错。安静，人少，WiFi给力。吧台旁边有几个插座。",
            "窗边位置风景好，而且有电源插座。工作日下午人不多，很安静。办公的好地方。"
        ],
        "socket_locations": [
            {"description": "二楼靠窗位置", "x": 0.15, "y": 0.3},
            {"description": "吧台旁", "x": 0.7, "y": 0.6},
            {"description": "角落位置", "x": 0.85, "y": 0.2}
        ],
        "opening_hours": "07:00 - 22:00"
    },
    {
        "id": "2",
        "name": "西西弗书店 (万象城店)",
        "type": "bookstore",
        "address": "北京市海淀区中关村大街19号新中关购物中心",
        "latitude": 39.9847,
        "longitude": 116.3160,
        "rating": 4.8,
        "price_level": 2,
        "avg_price": 35,
        "image_url": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect fill='%234A3728' width='800' height='600'/%3E%3Ctext x='400' y='320' text-anchor='middle' fill='%23FFE4B5' font-size='120'%3E%F0%9F%93%9A%3C/text%3E%3Ctext x='400' y='450' text-anchor='middle' fill='white' font-size='36'%3E西西弗书店%3C/text%3E%3C/svg%3E",
        "comments": [
            "书店里特别安静，真的太适合看书办公了！咖啡区每个桌子下面都有插座。",
            "WiFi速度还可以，主要是环境好，非常安静，背景音乐很小声。充电的地方很多。",
            "插座秘籍：进门左手边靠窗的位置都有充电口！几乎每个座位都能找到电源。",
            "超级喜欢这里的氛围，安静舒适。点一杯咖啡可以坐一下午，办公效率很高。"
        ],
        "socket_locations": [
            {"description": "咖啡区靠窗", "x": 0.1, "y": 0.25},
            {"description": "书架旁桌子", "x": 0.45, "y": 0.5},
            {"description": "角落沙发区", "x": 0.8, "y": 0.75}
        ],
        "opening_hours": "10:00 - 22:00"
    },
    {
        "id": "3",
        "name": "Manner Coffee (三里屯店)",
        "type": "cafe",
        "address": "北京市朝阳区三里屯路19号三里屯太古里",
        "latitude": 39.9342,
        "longitude": 116.4487,
        "rating": 4.3,
        "price_level": 2,
        "avg_price": 25,
        "image_url": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect fill='%232C3E50' width='800' height='600'/%3E%3Ctext x='400' y='320' text-anchor='middle' fill='white' font-size='80'%3E%E2%98%95%3C/text%3E%3Ctext x='400' y='420' text-anchor='middle' fill='white' font-size='28'%3EManner Coffee%3C/text%3E%3C/svg%3E",
        "comments": [
            "咖啡性价比很高！WiFi速度一般般，但环境还可以。窗边有几个插座。",
            "人有点多，高峰期比较吵。不过咖啡好喝，价格便宜。有几个靠窗的位置能充电。",
            "整体还算安静，适合简单办公。插座数量不多，要早点去占位置。",
            "WiFi有时候不太稳定，但环境还可以。插座主要在墙边的位置。"
        ],
        "socket_locations": [
            {"description": "窗边吧台", "x": 0.2, "y": 0.15},
            {"description": "墙边座位", "x": 0.65, "y": 0.45}
        ],
        "opening_hours": "08:00 - 21:00"
    },
    {
        "id": "4",
        "name": "Page One (北京坊店)",
        "type": "bookstore",
        "address": "北京市西城区廊坊头条13号院北京坊",
        "latitude": 39.9012,
        "longitude": 116.3918,
        "rating": 4.9,
        "price_level": 3,
        "avg_price": 55,
        "image_url": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect fill='%231A1A2E' width='800' height='600'/%3E%3Ctext x='400' y='320' text-anchor='middle' fill='white' font-size='100'%3E%F0%9F%93%96%3C/text%3E%3Ctext x='400' y='430' text-anchor='middle' fill='white' font-size='32'%3EPage One%3C/text%3E%3C/svg%3E",
        "comments": [
            "环境超级棒！三层楼的书店，三楼咖啡区特别安静，每个座位都有插座！",
            "北京坊这家Page One真的是办公圣地！WiFi快，环境安静，插座充足。",
            "二楼靠窗的位置风景好，而且每个桌子下面都有USB充电口。强烈推荐！",
            "书店很大，人多的时候也不会觉得吵。WiFi稳定，办公的绝佳去处。",
            "插座秘籍：三楼靠窗位置全部都有插座！二楼楼梯旁也有几个充电点。"
        ],
        "socket_locations": [
            {"description": "三楼靠窗区", "x": 0.12, "y": 0.2},
            {"description": "二楼楼梯旁", "x": 0.5, "y": 0.55},
            {"description": "咖啡区桌子", "x": 0.75, "y": 0.35},
            {"description": "一楼吧台", "x": 0.88, "y": 0.8}
        ],
        "opening_hours": "10:00 - 22:00"
    },
    {
        "id": "5",
        "name": "瑞幸咖啡 (中关村店)",
        "type": "cafe",
        "address": "北京市海淀区中关村大街27号中关村大厦",
        "latitude": 39.9831,
        "longitude": 116.3147,
        "rating": 3.8,
        "price_level": 1,
        "avg_price": 15,
        "image_url": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect fill='%23005BAC' width='800' height='600'/%3E%3Ctext x='400' y='320' text-anchor='middle' fill='white' font-size='80'%3E%E9%B9%BF%3C/text%3E%3Ctext x='400' y='430' text-anchor='middle' fill='white' font-size='32'%3E%E7%91%9E%E5%B9%B8%E5%92%96%E5%95%A1%3C/text%3E%3C/svg%3E",
        "comments": [
            "价格便宜！WiFi一般，插座很少，几乎找不到。环境有点吵。",
            "咖啡性价比超高，但不适合长时间办公。插座太少了，基本没有。",
            "人很多，比较嘈杂。适合买了就走，不适合久坐。WiFi速度一般。",
            "几乎没有充电的地方，WiFi也不稳定。优点就是便宜。"
        ],
        "socket_locations": [],
        "opening_hours": "07:00 - 21:00"
    },
    {
        "id": "6",
        "name": "Costa Coffee (望京SOHO店)",
        "type": "cafe",
        "address": "北京市朝阳区望京街10号望京SOHO",
        "latitude": 39.9938,
        "longitude": 116.4800,
        "rating": 4.2,
        "price_level": 3,
        "avg_price": 40,
        "image_url": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect fill='%23922B21' width='800' height='600'/%3E%3Ctext x='400' y='300' text-anchor='middle' fill='white' font-size='56'%3ECOSTA%3C/text%3E%3Ctext x='400' y='380' text-anchor='middle' fill='white' font-size='28'%3ECOFFEE%3C/text%3E%3C/svg%3E",
        "comments": [
            "WiFi很快，办公没问题。插座主要在吧台和墙角位置，需要找一找。",
            "环境还可以，下午人有点多。插座数量不多，建议早点去。",
            "咖啡一般，但是WiFi确实挺快的。安静程度一般，勉强可以办公。",
            "窗边的位置有插座，风景也不错。整体还算安静。"
        ],
        "socket_locations": [
            {"description": "吧台位置", "x": 0.3, "y": 0.6},
            {"description": "墙角座位", "x": 0.8, "y": 0.25}
        ],
        "opening_hours": "07:30 - 21:30"
    }
]

def get_all_places() -> List[Dict]:
    return MOCK_PLACES

def get_place_by_id(place_id: str) -> Dict:
    for place in MOCK_PLACES:
        if place["id"] == place_id:
            return place
    return None

def get_places_by_type(place_type: str) -> List[Dict]:
    return [p for p in MOCK_PLACES if p["type"] == place_type]
