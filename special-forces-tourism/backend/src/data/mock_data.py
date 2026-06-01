from datetime import datetime, timedelta
from typing import List, Dict
import random
import json
import os

from ..models.schemas import POI, Note, VisitRecord


POIS: Dict[str, POI] = {}

NANJING_POIS = {
    "nj_001": POI(id="nj_001", name="夫子庙", city="南京", coordinates=(118.7816, 32.0216), category="景点", rating=4.8),
    "nj_002": POI(id="nj_002", name="鸡鸣寺", city="南京", coordinates=(118.7898, 32.0689), category="景点", rating=4.7),
    "nj_003": POI(id="nj_003", name="中山陵", city="南京", coordinates=(118.8617, 32.0603), category="景点", rating=4.9),
    "nj_004": POI(id="nj_004", name="老门东", city="南京", coordinates=(118.7806, 32.0128), category="美食", rating=4.6),
    "nj_005": POI(id="nj_005", name="新街口", city="南京", coordinates=(118.7886, 32.0486), category="商圈", rating=4.5),
    "nj_006": POI(id="nj_006", name="总统府", city="南京", coordinates=(118.7953, 32.0478), category="景点", rating=4.7),
    "nj_007": POI(id="nj_007", name="南京博物院", city="南京", coordinates=(118.8250, 32.0450), category="博物馆", rating=4.9),
    "nj_008": POI(id="nj_008", name="玄武湖", city="南京", coordinates=(118.7969, 32.0781), category="景点", rating=4.6),
    "nj_009": POI(id="nj_009", name="明孝陵", city="南京", coordinates=(118.8478, 32.0603), category="景点", rating=4.7),
    "nj_010": POI(id="nj_010", name="先锋书店", city="南京", coordinates=(118.7667, 32.0611), category="书店", rating=4.8),
    "nj_011": POI(id="nj_011", name="明瓦廊小吃街", city="南京", coordinates=(118.7795, 32.0456), category="美食", rating=4.5),
    "nj_012": POI(id="nj_012", name="南京大牌档", city="南京", coordinates=(118.7856, 32.0523), category="美食", rating=4.6),
    "nj_013": POI(id="nj_013", name="秦淮河", city="南京", coordinates=(118.7789, 32.0214), category="景点", rating=4.7),
    "nj_014": POI(id="nj_014", name="南京长江大桥", city="南京", coordinates=(118.7431, 32.1189), category="景点", rating=4.5),
    "nj_015": POI(id="nj_015", name="红山森林动物园", city="南京", coordinates=(118.7989, 32.1083), category="景点", rating=4.8),
}

CHONGQING_POIS = {
    "cq_001": POI(id="cq_001", name="洪崖洞", city="重庆", coordinates=(106.5830, 29.5644), category="景点", rating=4.8),
    "cq_002": POI(id="cq_002", name="解放碑", city="重庆", coordinates=(106.5781, 29.5630), category="商圈", rating=4.7),
    "cq_003": POI(id="cq_003", name="李子坝轻轨", city="重庆", coordinates=(106.5272, 29.5583), category="景点", rating=4.9),
    "cq_004": POI(id="cq_004", name="磁器口古镇", city="重庆", coordinates=(106.4167, 29.5500), category="古镇", rating=4.6),
    "cq_005": POI(id="cq_005", name="长江索道", city="重庆", coordinates=(106.5811, 29.5617), category="交通", rating=4.7),
    "cq_006": POI(id="cq_006", name="南山一棵树", city="重庆", coordinates=(106.5903, 29.5567), category="景点", rating=4.8),
    "cq_007": POI(id="cq_007", name="朝天门", city="重庆", coordinates=(106.5842, 29.5633), category="景点", rating=4.7),
    "cq_008": POI(id="cq_008", name="观音桥", city="重庆", coordinates=(106.5583, 29.5758), category="商圈", rating=4.5),
    "cq_009": POI(id="cq_009", name="八一好吃街", city="重庆", coordinates=(106.5772, 29.5617), category="美食", rating=4.7),
    "cq_010": POI(id="cq_010", name="鹅岭二厂", city="重庆", coordinates=(106.5403, 29.5486), category="文艺", rating=4.6),
    "cq_011": POI(id="cq_011", name="涂鸦一条街", city="重庆", coordinates=(106.5139, 29.5097), category="景点", rating=4.4),
    "cq_012": POI(id="cq_012", name="重庆火锅", city="重庆", coordinates=(106.5750, 29.5600), category="美食", rating=4.9),
    "cq_013": POI(id="cq_013", name="十八梯", city="重庆", coordinates=(106.5764, 29.5583), category="景点", rating=4.5),
    "cq_014": POI(id="cq_014", name="白象居", city="重庆", coordinates=(106.5867, 29.5600), category="景点", rating=4.6),
    "cq_015": POI(id="cq_015", name="江北嘴", city="重庆", coordinates=(106.5856, 29.5781), category="商圈", rating=4.5),
}

CHANGSHA_POIS = {
    "cs_001": POI(id="cs_001", name="五一广场", city="长沙", coordinates=(112.9686, 28.1956), category="商圈", rating=4.7),
    "cs_002": POI(id="cs_002", name="橘子洲", city="长沙", coordinates=(112.9661, 28.1878), category="景点", rating=4.8),
    "cs_003": POI(id="cs_003", name="岳麓山", city="长沙", coordinates=(112.9356, 28.1836), category="景点", rating=4.8),
    "cs_004": POI(id="cs_004", name="太平街", city="长沙", coordinates=(112.9686, 28.1950), category="美食", rating=4.6),
    "cs_005": POI(id="cs_005", name="坡子街", city="长沙", coordinates=(112.9694, 28.1931), category="美食", rating=4.7),
    "cs_006": POI(id="cs_006", name="IFS国金中心", city="长沙", coordinates=(112.9703, 28.1950), category="商圈", rating=4.8),
    "cs_007": POI(id="cs_007", name="湖南大学", city="长沙", coordinates=(112.9411, 28.1836), category="校园", rating=4.7),
    "cs_008": POI(id="cs_008", name="茶颜悦色", city="长沙", coordinates=(112.9680, 28.1942), category="美食", rating=4.9),
    "cs_009": POI(id="cs_009", name="臭豆腐", city="长沙", coordinates=(112.9692, 28.1936), category="美食", rating=4.6),
    "cs_010": POI(id="cs_010", name="爱晚亭", city="长沙", coordinates=(112.9306, 28.1803), category="景点", rating=4.7),
    "cs_011": POI(id="cs_011", name="岳麓书院", city="长沙", coordinates=(112.9356, 28.1836), category="景点", rating=4.8),
    "cs_012": POI(id="cs_012", name="超级文和友", city="长沙", coordinates=(112.9728, 28.1956), category="美食", rating=4.8),
    "cs_013": POI(id="cs_013", name="黄兴路步行街", city="长沙", coordinates=(112.9694, 28.1964), category="商圈", rating=4.6),
    "cs_014": POI(id="cs_014", name="省博物馆", city="长沙", coordinates=(112.9383, 28.2033), category="博物馆", rating=4.9),
    "cs_015": POI(id="cs_015", name="开福寺", city="长沙", coordinates=(112.9528, 28.2064), category="景点", rating=4.5),
}

POIS.update(NANJING_POIS)
POIS.update(CHONGQING_POIS)
POIS.update(CHANGSHA_POIS)


def generate_mock_notes() -> List[Note]:
    notes = []
    base_date = datetime(2024, 10, 1, 6, 0, 0)

    nanjing_routes = [
        {
            "title": "南京24小时特种兵｜8个景点6顿饭",
            "sequence": ["nj_015", "nj_008", "nj_006", "nj_012", "nj_005", "nj_011", "nj_001", "nj_013", "nj_004"],
            "tags": ["特种兵旅游", "南京", "一日游"],
        },
        {
            "title": "南京一日暴走攻略｜大学生必看",
            "sequence": ["nj_002", "nj_010", "nj_011", "nj_012", "nj_006", "nj_001", "nj_013", "nj_004"],
            "tags": ["特种兵旅游", "南京", "穷游"],
        },
        {
            "title": "南京美食特种兵｜从早吃到晚",
            "sequence": ["nj_011", "nj_012", "nj_004", "nj_001", "nj_013", "nj_005", "nj_006"],
            "tags": ["特种兵旅游", "南京", "美食"],
        },
        {
            "title": "周末南京特种兵｜30小时6顿",
            "sequence": ["nj_007", "nj_003", "nj_009", "nj_012", "nj_005", "nj_011", "nj_001", "nj_004"],
            "tags": ["特种兵旅游", "南京", "周末"],
        },
        {
            "title": "南京citywalk｜特种兵路线",
            "sequence": ["nj_002", "nj_006", "nj_005", "nj_011", "nj_012", "nj_001", "nj_013", "nj_004"],
            "tags": ["特种兵旅游", "南京", "citywalk"],
        },
        {
            "title": "南京秋日特种兵打卡",
            "sequence": ["nj_003", "nj_009", "nj_007", "nj_012", "nj_011", "nj_004", "nj_001", "nj_013"],
            "tags": ["特种兵旅游", "南京", "秋天"],
        },
        {
            "title": "南京穷游特种兵｜学生党",
            "sequence": ["nj_008", "nj_002", "nj_010", "nj_011", "nj_012", "nj_004", "nj_001"],
            "tags": ["特种兵旅游", "南京", "穷游", "学生党"],
        },
        {
            "title": "南京夜游特种兵｜夜猫子路线",
            "sequence": ["nj_005", "nj_011", "nj_012", "nj_001", "nj_013", "nj_004", "nj_014"],
            "tags": ["特种兵旅游", "南京", "夜游"],
        },
        {
            "title": "南京文化特种兵｜博物馆之旅",
            "sequence": ["nj_007", "nj_003", "nj_009", "nj_006", "nj_008", "nj_002"],
            "tags": ["特种兵旅游", "南京", "文化"],
        },
        {
            "title": "南京美食打卡｜6顿不重样",
            "sequence": ["nj_011", "nj_012", "nj_004", "nj_005", "nj_006", "nj_001", "nj_013"],
            "tags": ["特种兵旅游", "南京", "美食打卡"],
        },
    ]

    chongqing_routes = [
        {
            "title": "重庆24小时特种兵｜山城暴走",
            "sequence": ["cq_002", "cq_009", "cq_005", "cq_013", "cq_001", "cq_007", "cq_006", "cq_014"],
            "tags": ["特种兵旅游", "重庆", "一日游"],
        },
        {
            "title": "重庆30小时特种兵｜8D魔幻城",
            "sequence": ["cq_003", "cq_010", "cq_005", "cq_002", "cq_009", "cq_012", "cq_001", "cq_007"],
            "tags": ["特种兵旅游", "重庆", "魔幻"],
        },
        {
            "title": "重庆美食特种兵｜火锅吃到爽",
            "sequence": ["cq_009", "cq_012", "cq_002", "cq_013", "cq_001", "cq_007", "cq_005"],
            "tags": ["特种兵旅游", "重庆", "火锅", "美食"],
        },
        {
            "title": "重庆周末特种兵｜洪崖洞打卡",
            "sequence": ["cq_004", "cq_003", "cq_010", "cq_012", "cq_009", "cq_002", "cq_001", "cq_007"],
            "tags": ["特种兵旅游", "重庆", "周末"],
        },
        {
            "title": "重庆夜景特种兵｜越夜越美丽",
            "sequence": ["cq_002", "cq_009", "cq_012", "cq_001", "cq_007", "cq_006", "cq_015"],
            "tags": ["特种兵旅游", "重庆", "夜景"],
        },
        {
            "title": "重庆穿越特种兵｜李子坝到洪崖洞",
            "sequence": ["cq_003", "cq_010", "cq_011", "cq_005", "cq_002", "cq_009", "cq_001"],
            "tags": ["特种兵旅游", "重庆", "穿越"],
        },
        {
            "title": "重庆citywalk｜迷路是常态",
            "sequence": ["cq_002", "cq_013", "cq_001", "cq_007", "cq_014", "cq_005", "cq_003"],
            "tags": ["特种兵旅游", "重庆", "citywalk"],
        },
        {
            "title": "重庆穷游特种兵｜学生党攻略",
            "sequence": ["cq_004", "cq_003", "cq_010", "cq_009", "cq_002", "cq_001", "cq_007"],
            "tags": ["特种兵旅游", "重庆", "穷游"],
        },
        {
            "title": "重庆火锅特种兵｜一天三顿",
            "sequence": ["cq_009", "cq_012", "cq_008", "cq_012", "cq_002", "cq_001"],
            "tags": ["特种兵旅游", "重庆", "火锅"],
        },
        {
            "title": "重庆文艺特种兵｜鹅岭二厂",
            "sequence": ["cq_010", "cq_011", "cq_003", "cq_005", "cq_002", "cq_009", "cq_001"],
            "tags": ["特种兵旅游", "重庆", "文艺"],
        },
    ]

    changsha_routes = [
        {
            "title": "长沙24小时特种兵｜吃喝玩乐",
            "sequence": ["cs_001", "cs_004", "cs_005", "cs_009", "cs_008", "cs_006", "cs_012", "cs_002"],
            "tags": ["特种兵旅游", "长沙", "一日游"],
        },
        {
            "title": "长沙30小时特种兵｜茶颜自由",
            "sequence": ["cs_003", "cs_010", "cs_011", "cs_008", "cs_004", "cs_009", "cs_012", "cs_001"],
            "tags": ["特种兵旅游", "长沙", "茶颜悦色"],
        },
        {
            "title": "长沙美食特种兵｜从早吃到晚",
            "sequence": ["cs_004", "cs_005", "cs_009", "cs_008", "cs_012", "cs_013", "cs_001"],
            "tags": ["特种兵旅游", "长沙", "美食"],
        },
        {
            "title": "长沙周末特种兵｜橘子洲打卡",
            "sequence": ["cs_002", "cs_003", "cs_007", "cs_010", "cs_011", "cs_008", "cs_004", "cs_012"],
            "tags": ["特种兵旅游", "长沙", "周末"],
        },
        {
            "title": "长沙citywalk｜太平街到坡子街",
            "sequence": ["cs_004", "cs_005", "cs_009", "cs_008", "cs_001", "cs_013", "cs_012"],
            "tags": ["特种兵旅游", "长沙", "citywalk"],
        },
        {
            "title": "长沙文化特种兵｜岳麓山+省博",
            "sequence": ["cs_014", "cs_003", "cs_011", "cs_010", "cs_007", "cs_008", "cs_001"],
            "tags": ["特种兵旅游", "长沙", "文化"],
        },
        {
            "title": "长沙穷游特种兵｜学生党攻略",
            "sequence": ["cs_004", "cs_005", "cs_009", "cs_008", "cs_002", "cs_001", "cs_013"],
            "tags": ["特种兵旅游", "长沙", "穷游"],
        },
        {
            "title": "长沙夜游特种兵｜文和友打卡",
            "sequence": ["cs_001", "cs_012", "cs_005", "cs_009", "cs_004", "cs_013", "cs_006"],
            "tags": ["特种兵旅游", "长沙", "夜游"],
        },
        {
            "title": "长沙美食特种兵｜臭豆腐+茶颜",
            "sequence": ["cs_009", "cs_008", "cs_004", "cs_005", "cs_012", "cs_001"],
            "tags": ["特种兵旅游", "长沙", "美食"],
        },
        {
            "title": "长沙文艺特种兵｜IFS打卡",
            "sequence": ["cs_006", "cs_001", "cs_013", "cs_012", "cs_005", "cs_004", "cs_008", "cs_002"],
            "tags": ["特种兵旅游", "长沙", "文艺"],
        },
    ]

    all_routes = []
    for route in nanjing_routes:
        route["city"] = "南京"
        all_routes.append(route)
    for route in chongqing_routes:
        route["city"] = "重庆"
        all_routes.append(route)
    for route in changsha_routes:
        route["city"] = "长沙"
        all_routes.append(route)

    for i, route_config in enumerate(all_routes):
        start_hour = random.choice([6, 7, 8])
        start_time = base_date.replace(hour=start_hour, minute=0)
        visit_records = []
        current_time = start_time

        for poi_id in route_config["sequence"]:
            duration = random.randint(30, 120)
            visit_records.append(VisitRecord(
                poi_id=poi_id,
                timestamp=current_time,
                duration_minutes=duration,
                notes=f"打卡{POIS[poi_id].name}"
            ))
            current_time += timedelta(minutes=duration + random.randint(10, 30))

        note = Note(
            id=f"note_{i:04d}",
            author_id=f"user_{random.randint(1000, 9999)}",
            title=route_config["title"],
            content=f"特种兵旅游路线分享：{route_config['title']}，共计{len(route_config['sequence'])}个景点，紧凑行程！",
            city=route_config["city"],
            tags=route_config["tags"],
            visit_records=visit_records,
            created_at=base_date
        )
        notes.append(note)

    base_notes = notes.copy()
    for i in range(5):
        variant_notes = []
        for base_note in base_notes:
            variant_seq = base_note.visit_records.copy()
            random.shuffle(variant_seq)
            variant_seq = variant_seq[:random.randint(5, 8)]
            variant_seq.sort(key=lambda x: x.timestamp)
            variant_note = Note(
                id=f"note_var_{i:04d}_{base_note.id}",
                author_id=f"user_{random.randint(10000, 99999)}",
                title=base_note.title + " - 变体",
                content=base_note.content,
                city=base_note.city,
                tags=base_note.tags,
                visit_records=variant_seq,
                created_at=base_date + timedelta(days=i)
            )
            variant_notes.append(variant_note)
        notes.extend(variant_notes)

    return notes


def get_poi_by_id(poi_id: str) -> POI:
    return POIS.get(poi_id)


def get_all_pois() -> Dict[str, POI]:
    return POIS


def get_pois_by_city(city: str) -> Dict[str, POI]:
    return {k: v for k, v in POIS.items() if v.city == city}
