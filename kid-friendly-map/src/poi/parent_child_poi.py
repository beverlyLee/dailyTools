import math
import random
from typing import List, Dict, Optional
from dataclasses import dataclass, field


@dataclass
class POI:
    id: str
    name: str
    type: str
    type_name: str
    lat: float
    lng: float
    address: str
    total_score: float
    score_level: str
    has_baby_room: bool
    has_changing_table: bool
    has_stroller_rental: bool
    reviews: List[str] = field(default_factory=list)
    source: str = "大众点评"


TYPE_NAMES = {
    "mall": "商场",
    "park": "公园",
    "museum": "博物馆"
}

UNSUITABLE_TYPES = ["bar", "nightclub", "casino", "adult_only"]

DISNEYLAND_CENTER = (31.1416, 121.6570)

MOCK_POIS_DATA = [
    {
        "id": "poi_001",
        "name": "上海迪士尼度假区",
        "type": "park",
        "address": "上海市浦东新区川沙镇黄赵路310号",
        "lat_offset": 0.0,
        "lng_offset": 0.0,
        "reviews": [
            "迪士尼的母婴室太棒了，独立房间有门有插座还有洗手台，非常干净宽敞。",
            "每个区域都有尿布台，有安全防护带，还提供纸巾湿巾，很贴心。",
            "可以租婴儿车，车型多样，价格合理，车辆也很新。",
            "有专门的哺乳室，私密空间，舒适座椅还有靠枕，喂奶很方便。",
            "儿童乐园设施很多，有安全防护，还有专人看管，宝宝玩得很开心。",
            "母婴室干净整洁，有空调有沙发，体验非常好，强烈推荐带娃来！"
        ],
        "source": "小红书亲子攻略"
    },
    {
        "id": "poi_002",
        "name": "迪士尼小镇",
        "type": "mall",
        "address": "上海市浦东新区迪士尼小镇",
        "lat_offset": 0.008,
        "lng_offset": -0.005,
        "reviews": [
            "小镇里有母婴室，虽然不大但很干净，有门有洗手台。",
            "商店里有尿布台，在卫生间旁边，有防护带。",
            "可以在服务中心租推车，押金不多，车挺新的。",
            "有儿童游乐区，虽然不大但设施很新，有安全防护。",
            "哺乳室比较小，但私密性还可以，有舒适座椅。"
        ],
        "source": "大众点评亲子频道"
    },
    {
        "id": "poi_003",
        "name": "奕欧来奥特莱斯",
        "type": "mall",
        "address": "上海市浦东新区申迪东路88号",
        "lat_offset": 0.015,
        "lng_offset": -0.02,
        "reviews": [
            "奥特莱斯的母婴室很赞，独立房间，有门有插座有洗手台，干净宽敞。",
            "每个卫生间都有尿布台，有防护带，还提供纸巾。",
            "服务中心可以租婴儿车，免费的，车型也很多。",
            "有专门的儿童乐园，设施很多，有专人看管。",
            "哺乳室很舒适，私密空间，有沙发有靠枕。",
            "带娃购物的好地方，亲子设施齐全，强烈推荐！"
        ],
        "source": "小红书亲子攻略"
    },
    {
        "id": "poi_004",
        "name": "上海薰衣草公园",
        "type": "park",
        "address": "上海市浦东新区申迪东路399弄188号",
        "lat_offset": 0.012,
        "lng_offset": -0.015,
        "reviews": [
            "公园入口处有母婴室，虽然简陋但能用，有门。",
            "有尿布台，在游客中心，有防护带。",
            "可以租推车，价格有点贵，但车型还可以。",
            "有儿童游乐区，设施一般，没有专人看管。",
            "没有专门的哺乳室，只能在母婴室喂奶。"
        ],
        "source": "大众点评亲子频道"
    },
    {
        "id": "poi_005",
        "name": "邻家美利亚酒店",
        "type": "mall",
        "address": "上海市浦东新区申迪西路1009号",
        "lat_offset": -0.005,
        "lng_offset": 0.008,
        "reviews": [
            "酒店的母婴室非常棒，豪华配置，有门有插座有洗手台有沙发。",
            "房间里就有尿布台，很方便，有防护带。",
            "酒店可以免费提供婴儿床，推车也可以借。",
            "有儿童乐园，设施很好，有专人看管。",
            "哺乳室很私密，环境安静舒适。",
            "带娃住这里太方便了，亲子设施一流！"
        ],
        "source": "小红书亲子攻略"
    },
    {
        "id": "poi_006",
        "name": "川沙公园",
        "type": "park",
        "address": "上海市浦东新区川沙路5111号",
        "lat_offset": 0.03,
        "lng_offset": -0.04,
        "reviews": [
            "老公园了，没有母婴室，带小婴儿不太方便。",
            "没有尿布台，换尿布只能在推车上。",
            "没有推车租赁服务，需要自己带。",
            "有一些老旧的游乐设施，没有安全防护。",
            "没有哺乳室，喂奶很不方便，不推荐带小婴儿来。"
        ],
        "source": "大众点评亲子频道"
    },
    {
        "id": "poi_007",
        "name": "上海科技馆",
        "type": "museum",
        "address": "上海市浦东新区世纪大道2000号",
        "lat_offset": 0.05,
        "lng_offset": -0.08,
        "reviews": [
            "科技馆有母婴室，在一楼，有门有洗手台，还挺干净的。",
            "有尿布台，在母婴室里，有防护带。",
            "可以租推车，在服务中心，价格合理。",
            "有儿童科学乐园，设施很多，有安全防护，有专人讲解。",
            "有专门的哺乳室，私密空间，环境安静。",
            "非常适合带娃来，寓教于乐，亲子设施也不错！"
        ],
        "source": "小红书亲子攻略"
    },
    {
        "id": "poi_008",
        "name": "世纪公园",
        "type": "park",
        "address": "上海市浦东新区锦绣路1001号",
        "lat_offset": 0.06,
        "lng_offset": -0.09,
        "reviews": [
            "公园有母婴室，在游客中心，有门但比较小。",
            "有尿布台，在母婴室里，有防护带。",
            "可以租多人自行车，但婴儿车租赁服务不太好。",
            "有儿童乐园，设施还可以，有安全防护。",
            "没有专门的哺乳室，只能在母婴室喂奶。"
        ],
        "source": "大众点评亲子频道"
    },
    {
        "id": "poi_009",
        "name": "正大广场",
        "type": "mall",
        "address": "上海市浦东新区陆家嘴西路168号",
        "lat_offset": 0.08,
        "lng_offset": -0.12,
        "reviews": [
            "正大广场的母婴室很多，每层都有，有门有插座有洗手台，很干净。",
            "每个母婴室都有尿布台，有防护带，还提供纸巾。",
            "服务中心可以租推车，免费的，车型多样。",
            "有儿童乐园，在五楼，设施很多，有专人看管。",
            "哺乳室很私密，有舒适座椅，环境不错。",
            "带娃购物吃饭的好地方，亲子设施非常完善！"
        ],
        "source": "小红书亲子攻略"
    },
    {
        "id": "poi_010",
        "name": "上海自然博物馆",
        "type": "museum",
        "address": "上海市静安区北京西路510号",
        "lat_offset": 0.12,
        "lng_offset": -0.15,
        "reviews": [
            "自然博物馆有母婴室，在一楼，有门有洗手台，干净整洁。",
            "有尿布台，在母婴室里，有防护带，提供湿巾。",
            "可以租推车，在入口处，价格合理，车很新。",
            "有儿童探索中心，设施丰富，有专人讲解，安全防护到位。",
            "有专门的哺乳室，私密空间，舒适座椅。",
            "非常适合带娃参观，寓教于乐，亲子设施齐全！"
        ],
        "source": "大众点评亲子频道"
    },
    {
        "id": "poi_011",
        "name": "恒基名人购物中心",
        "type": "mall",
        "address": "上海市黄浦区南京东路300号",
        "lat_offset": 0.10,
        "lng_offset": -0.14,
        "reviews": [
            "购物中心的母婴室比较小，但有门有洗手台，基本能用。",
            "有尿布台，在母婴室里，有防护带。",
            "没有推车租赁服务，不太方便。",
            "有小型儿童游乐区，设施一般。",
            "哺乳室和母婴室在一起，私密性一般。"
        ],
        "source": "大众点评亲子频道"
    },
    {
        "id": "poi_012",
        "name": "上海儿童博物馆",
        "type": "museum",
        "address": "上海市长宁区宋园路61号",
        "lat_offset": 0.08,
        "lng_offset": -0.20,
        "reviews": [
            "儿童博物馆本身就是为孩子设计的，母婴室很完善，有门有插座有洗手台。",
            "每层都有尿布台，有防护带，提供纸巾湿巾。",
            "可以租推车，免费的，车型适合小宝宝。",
            "全馆都是儿童游乐设施，有专人看管，安全防护到位。",
            "有专门的哺乳室，私密舒适，环境安静。",
            "带娃必去的地方，完全为亲子家庭设计！"
        ],
        "source": "小红书亲子攻略"
    },
    {
        "id": "poi_013",
        "name": "iapm环贸广场",
        "type": "mall",
        "address": "上海市徐汇区淮海中路999号",
        "lat_offset": 0.07,
        "lng_offset": -0.18,
        "reviews": [
            "环贸的母婴室很高端，独立房间，有门有插座有洗手台，干净豪华。",
            "有尿布台，有防护带，还提供免费的纸尿裤和湿巾。",
            "可以租推车，服务很好，车型多样。",
            "有儿童乐园，设施豪华，有专人看管。",
            "哺乳室很私密，有舒适沙发，环境一流。",
            "高端商场，亲子设施也是顶级的，带娃体验很好！"
        ],
        "source": "小红书亲子攻略"
    },
    {
        "id": "poi_014",
        "name": "七宝老街",
        "type": "park",
        "address": "上海市闵行区七宝镇",
        "lat_offset": 0.02,
        "lng_offset": -0.25,
        "reviews": [
            "老街没有母婴室，带小婴儿很不方便。",
            "没有尿布台，换尿布只能找个角落。",
            "没有推车租赁，而且老街都是石板路，推车很难走。",
            "没有儿童乐园，就是逛街。",
            "没有哺乳室，喂奶非常尴尬，不推荐带小宝宝来。"
        ],
        "source": "大众点评亲子频道"
    },
    {
        "id": "poi_015",
        "name": "上海欢乐谷",
        "type": "park",
        "address": "上海市松江区林湖路888号",
        "lat_offset": -0.05,
        "lng_offset": -0.30,
        "reviews": [
            "欢乐谷有母婴室，在入口附近，有门有洗手台，还可以。",
            "有尿布台，在母婴室里，有防护带。",
            "可以租推车，虽然有点贵但很有必要，园区太大了。",
            "有专门的儿童区域，蚂蚁王国，设施很多，有安全防护。",
            "有哺乳室，在母婴室旁边，私密性还可以。",
            "适合带大一点的孩子，小宝宝的话设施一般。"
        ],
        "source": "小红书亲子攻略"
    },
    {
        "id": "poi_016",
        "name": "佛罗伦萨小镇",
        "type": "mall",
        "address": "上海市浦东新区卓耀路58弄",
        "lat_offset": 0.025,
        "lng_offset": -0.035,
        "reviews": [
            "小镇的母婴室很温馨，有门有插座有洗手台，干净整洁。",
            "有尿布台，有防护带，提供纸巾。",
            "可以租推车，免费的，车型还可以。",
            "有小型儿童乐园，设施一般。",
            "有哺乳室，私密空间，有舒适座椅。",
            "带娃来逛街还不错，亲子设施基本齐全。"
        ],
        "source": "大众点评亲子频道"
    },
    {
        "id": "poi_017",
        "name": "长泰广场",
        "type": "mall",
        "address": "上海市浦东新区祖冲之路1239弄",
        "lat_offset": 0.04,
        "lng_offset": -0.06,
        "reviews": [
            "长泰广场有母婴室，在一楼，有门有洗手台，比较干净。",
            "有尿布台，有防护带。",
            "没有推车租赁服务，需要自己带。",
            "有儿童乐园，在三楼，设施还可以。",
            "哺乳室和母婴室在一起，私密性一般。"
        ],
        "source": "大众点评亲子频道"
    },
    {
        "id": "poi_018",
        "name": "张江科学城展示厅",
        "type": "museum",
        "address": "上海市浦东新区张江高科技园区",
        "lat_offset": 0.035,
        "lng_offset": -0.05,
        "reviews": [
            "展示厅比较小，没有专门的母婴室。",
            "没有尿布台，不太方便带小婴儿。",
            "没有推车租赁服务。",
            "没有儿童游乐设施，更适合大孩子和成年人。",
            "没有哺乳室，不推荐带小宝宝来。"
        ],
        "source": "大众点评亲子频道"
    },
    {
        "id": "poi_019",
        "name": "金桥国际商业广场",
        "type": "mall",
        "address": "上海市浦东新区张杨路3611号",
        "lat_offset": 0.055,
        "lng_offset": -0.07,
        "reviews": [
            "金桥国际的母婴室很多，每层都有，有门有插座有洗手台，很干净。",
            "每个母婴室都有尿布台，有防护带，提供纸巾。",
            "服务中心可以租推车，免费的，车型多样。",
            "有大型儿童乐园，设施很多，有专人看管。",
            "有专门的哺乳室，私密空间，舒适座椅。",
            "浦东亲子购物的好去处，设施非常完善！"
        ],
        "source": "小红书亲子攻略"
    },
    {
        "id": "poi_020",
        "name": "世纪汇广场",
        "type": "mall",
        "address": "上海市浦东新区世纪大道1192号",
        "lat_offset": 0.065,
        "lng_offset": -0.085,
        "reviews": [
            "世纪汇的母婴室很新，有门有插座有洗手台，干净明亮。",
            "有尿布台，有防护带，还提供湿巾。",
            "可以租推车，在服务中心，价格合理。",
            "有儿童乐园，在LG2层，设施很新，有安全防护。",
            "有哺乳室，私密性好，环境舒适。",
            "很新的商场，亲子设施不错，推荐！"
        ],
        "source": "小红书亲子攻略"
    }
]


class ParentChildPoiAggregator:
    def __init__(self):
        self.pois: List[POI] = []
        self._load_mock_data()

    def _load_mock_data(self):
        center_lat, center_lng = DISNEYLAND_CENTER
        for data in MOCK_POIS_DATA:
            lat = center_lat + data["lat_offset"]
            lng = center_lng + data["lng_offset"]

            has_baby_room = any(
                "母婴室" in review and "没有" not in review and "无" not in review
                for review in data["reviews"]
            )
            has_changing_table = any(
                "尿布台" in review and "没有" not in review and "无" not in review
                for review in data["reviews"]
            )
            has_stroller_rental = any(
                (("推车" in review or "婴儿车" in review) and "租" in review)
                and "没有" not in review and "不能" not in review
                for review in data["reviews"]
            )

            poi = POI(
                id=data["id"],
                name=data["name"],
                type=data["type"],
                type_name=TYPE_NAMES.get(data["type"], "其他"),
                lat=lat,
                lng=lng,
                address=data["address"],
                total_score=0.0,
                score_level="average",
                has_baby_room=has_baby_room,
                has_changing_table=has_changing_table,
                has_stroller_rental=has_stroller_rental,
                reviews=data["reviews"],
                source=data["source"]
            )
            self.pois.append(poi)

    def calculate_distance(
        self,
        lat1: float,
        lng1: float,
        lat2: float,
        lng2: float
    ) -> float:
        R = 6371000
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lng2 - lng1)
        a = math.sin(delta_phi / 2) ** 2 + \
            math.cos(phi1) * math.cos(phi2) * \
            math.sin(delta_lambda / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def is_suitable(self, poi_type: str) -> bool:
        return poi_type not in UNSUITABLE_TYPES

    def filter_pois(
        self,
        center_lat: float,
        center_lng: float,
        radius: float = 3000,
        poi_type: Optional[str] = None,
        min_score: Optional[float] = None
    ) -> List[POI]:
        filtered = []
        for poi in self.pois:
            if not self.is_suitable(poi.type):
                continue

            distance = self.calculate_distance(center_lat, center_lng, poi.lat, poi.lng)
            if distance > radius:
                continue

            if poi_type:
                type_list = [t.strip() for t in poi_type.split(',') if t.strip()]
                if type_list and poi.type not in type_list:
                    continue

            if min_score is not None and poi.total_score < min_score:
                continue

            filtered.append(poi)

        return filtered

    def get_poi_by_id(self, poi_id: str) -> Optional[POI]:
        for poi in self.pois:
            if poi.id == poi_id:
                return poi
        return None

    def update_poi_scores(self, scorer):
        for poi in self.pois:
            result = scorer.score_poi(poi.id, poi.reviews)
            poi.total_score = result.total_score
            poi.score_level = result.score_level

    def to_dict(self, poi: POI) -> Dict:
        return {
            "id": poi.id,
            "name": poi.name,
            "type": poi.type,
            "typeName": poi.type_name,
            "lat": poi.lat,
            "lng": poi.lng,
            "address": poi.address,
            "totalScore": poi.total_score,
            "scoreLevel": poi.score_level,
            "hasBabyRoom": poi.has_baby_room,
            "hasChangingTable": poi.has_changing_table,
            "hasStrollerRental": poi.has_stroller_rental,
            "source": poi.source
        }

    def to_detail_dict(self, poi: POI, scorer) -> Dict:
        scoring_result = scorer.score_poi(poi.id, poi.reviews)
        result = self.to_dict(poi)
        result["facilities"] = {
            key: {
                "name": facility.name,
                "available": facility.available,
                "description": facility.description,
                "score": facility.score
            }
            for key, facility in scoring_result.facilities.items()
        }
        result["reviewSnippets"] = scoring_result.review_snippets
        return result
