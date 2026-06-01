from typing import Dict, List, Optional
from dataclasses import dataclass
import random


@dataclass
class Anchor:
    id: str
    name: str
    platform: str
    hometown: str
    followers: int
    category: str = "美食"
    

@dataclass
class Product:
    id: str
    name: str
    origin: str
    origin_city: str
    category: str


class RegionMapper:
    def __init__(self):
        self.province_to_dialect = {
            "黑龙江": "东北话", "吉林": "东北话", "辽宁": "东北话", "内蒙古": "东北话",
            "山西": "晋语", "陕西北部": "晋语",
            "河南": "河南话", "河北": "河北话", "北京": "北京话", "天津": "天津话",
            "山东": "山东话",
            "上海": "吴语", "浙江": "吴语", "江苏": "吴语", "安徽南部": "吴语",
            "安徽": "安徽话", "安徽北部": "中原官话",
            "江西": "赣语",
            "湖南": "湖南话", "湖北": "湖北话",
            "四川": "四川话", "重庆": "四川话", "贵州": "西南官话", "云南": "西南官话", "广西北部": "西南官话",
            "广东": "广东话", "香港": "广东话", "澳门": "广东话", "广西": "粤语",
            "福建": "闽南语", "台湾": "闽南语", "海南": "闽南语",
            "新疆": "西北话", "甘肃": "西北话", "宁夏": "西北话", "青海": "西北话",
            "西藏": "藏语"
        }
        
        self.dialect_region = {
            "东北话": {"center": "黑龙江", "lng": 126.5, "lat": 45.8, "x": 750, "y": 80},
            "晋语": {"center": "山西", "lng": 112.5, "lat": 37.9, "x": 500, "y": 180},
            "河南话": {"center": "河南", "lng": 113.7, "lat": 34.8, "x": 550, "y": 300},
            "河北话": {"center": "河北", "lng": 114.5, "lat": 38.0, "x": 580, "y": 220},
            "北京话": {"center": "北京", "lng": 116.4, "lat": 39.9, "x": 600, "y": 160},
            "天津话": {"center": "天津", "lng": 117.2, "lat": 39.1, "x": 620, "y": 170},
            "山东话": {"center": "山东", "lng": 117.0, "lat": 36.7, "x": 650, "y": 240},
            "吴语": {"center": "上海", "lng": 121.5, "lat": 31.2, "x": 720, "y": 320},
            "安徽话": {"center": "安徽", "lng": 117.2, "lat": 31.8, "x": 660, "y": 360},
            "赣语": {"center": "江西", "lng": 115.9, "lat": 28.7, "x": 620, "y": 420},
            "湖南话": {"center": "湖南", "lng": 112.9, "lat": 28.2, "x": 520, "y": 440},
            "湖北话": {"center": "湖北", "lng": 114.3, "lat": 30.6, "x": 540, "y": 400},
            "四川话": {"center": "四川", "lng": 104.1, "lat": 30.7, "x": 300, "y": 350},
            "西南官话": {"center": "贵州", "lng": 106.7, "lat": 26.6, "x": 340, "y": 440},
            "广东话": {"center": "广东", "lng": 113.3, "lat": 23.1, "x": 600, "y": 520},
            "粤语": {"center": "广西", "lng": 108.3, "lat": 22.8, "x": 520, "y": 500},
            "闽南语": {"center": "福建", "lng": 118.1, "lat": 26.1, "x": 680, "y": 460},
            "西北话": {"center": "甘肃", "lng": 103.8, "lat": 36.1, "x": 350, "y": 220},
            "藏语": {"center": "西藏", "lng": 91.1, "lat": 29.6, "x": 180, "y": 380},
            "中原官话": {"center": "安徽北部", "lng": 116.0, "lat": 33.5, "x": 590, "y": 320}
        }
        
        self.city_coords = {
            "哈尔滨": {"province": "黑龙江", "lng": 126.5, "lat": 45.8, "x": 760, "y": 70},
            "长春": {"province": "吉林", "lng": 125.3, "lat": 43.9, "x": 740, "y": 110},
            "沈阳": {"province": "辽宁", "lng": 123.4, "lat": 41.8, "x": 720, "y": 150},
            "大连": {"province": "辽宁", "lng": 121.6, "lat": 38.9, "x": 700, "y": 190},
            "大庆": {"province": "黑龙江", "lng": 125.0, "lat": 46.6, "x": 770, "y": 60},
            "齐齐哈尔": {"province": "黑龙江", "lng": 124.0, "lat": 47.3, "x": 780, "y": 50},
            "延边": {"province": "吉林", "lng": 129.5, "lat": 42.9, "x": 790, "y": 120},
            "丹东": {"province": "辽宁", "lng": 124.4, "lat": 40.1, "x": 730, "y": 170},
            "成都": {"province": "四川", "lng": 104.1, "lat": 30.7, "x": 280, "y": 360},
            "重庆": {"province": "重庆", "lng": 106.6, "lat": 29.6, "x": 320, "y": 380},
            "贵阳": {"province": "贵州", "lng": 106.7, "lat": 26.6, "x": 340, "y": 440},
            "昆明": {"province": "云南", "lng": 102.7, "lat": 25.0, "x": 290, "y": 480},
            "绵阳": {"province": "四川", "lng": 104.7, "lat": 31.5, "x": 290, "y": 340},
            "攀枝花": {"province": "四川", "lng": 101.7, "lat": 26.6, "x": 260, "y": 440},
            "遵义": {"province": "贵州", "lng": 106.9, "lat": 27.7, "x": 330, "y": 420},
            "丽江": {"province": "云南", "lng": 100.2, "lat": 26.9, "x": 250, "y": 430},
            "广州": {"province": "广东", "lng": 113.3, "lat": 23.1, "x": 600, "y": 520},
            "深圳": {"province": "广东", "lng": 114.1, "lat": 22.5, "x": 620, "y": 530},
            "佛山": {"province": "广东", "lng": 113.1, "lat": 23.0, "x": 590, "y": 510},
            "南宁": {"province": "广西", "lng": 108.3, "lat": 22.8, "x": 520, "y": 500},
            "柳州": {"province": "广西", "lng": 109.4, "lat": 24.3, "x": 530, "y": 480},
            "汕头": {"province": "广东", "lng": 116.7, "lat": 23.4, "x": 650, "y": 510},
            "海口": {"province": "海南", "lng": 110.3, "lat": 20.0, "x": 560, "y": 560},
            "三亚": {"province": "海南", "lng": 109.5, "lat": 18.3, "x": 550, "y": 580},
            "西安": {"province": "陕西", "lng": 108.9, "lat": 34.3, "x": 380, "y": 280},
            "太原": {"province": "山西", "lng": 112.5, "lat": 37.9, "x": 440, "y": 200},
            "大同": {"province": "山西", "lng": 113.3, "lat": 40.1, "x": 460, "y": 180},
            "郑州": {"province": "河南", "lng": 113.7, "lat": 34.8, "x": 550, "y": 300},
            "洛阳": {"province": "河南", "lng": 112.4, "lat": 34.7, "x": 530, "y": 310},
            "开封": {"province": "河南", "lng": 114.3, "lat": 34.8, "x": 560, "y": 305},
            "石家庄": {"province": "河北", "lng": 114.5, "lat": 38.0, "x": 580, "y": 220},
            "北京": {"province": "北京", "lng": 116.4, "lat": 39.9, "x": 600, "y": 160},
            "天津": {"province": "天津", "lng": 117.2, "lat": 39.1, "x": 620, "y": 170},
            "上海": {"province": "上海", "lng": 121.5, "lat": 31.2, "x": 720, "y": 320},
            "杭州": {"province": "浙江", "lng": 120.2, "lat": 30.3, "x": 700, "y": 340},
            "南京": {"province": "江苏", "lng": 118.8, "lat": 32.1, "x": 680, "y": 280},
            "苏州": {"province": "江苏", "lng": 120.6, "lat": 31.3, "x": 710, "y": 310},
            "宁波": {"province": "浙江", "lng": 121.6, "lat": 29.9, "x": 730, "y": 350},
            "温州": {"province": "浙江", "lng": 120.7, "lat": 28.0, "x": 725, "y": 390},
            "济南": {"province": "山东", "lng": 117.0, "lat": 36.7, "x": 650, "y": 240},
            "青岛": {"province": "山东", "lng": 120.4, "lat": 36.1, "x": 690, "y": 250},
            "烟台": {"province": "山东", "lng": 121.4, "lat": 37.5, "x": 700, "y": 230},
            "德州": {"province": "山东", "lng": 116.3, "lat": 37.4, "x": 640, "y": 230},
            "长沙": {"province": "湖南", "lng": 112.9, "lat": 28.2, "x": 520, "y": 440},
            "武汉": {"province": "湖北", "lng": 114.3, "lat": 30.6, "x": 540, "y": 400},
            "襄阳": {"province": "湖北", "lng": 112.1, "lat": 32.0, "x": 510, "y": 380},
            "合肥": {"province": "安徽", "lng": 117.2, "lat": 31.8, "x": 660, "y": 360},
            "芜湖": {"province": "安徽", "lng": 118.4, "lat": 31.3, "x": 675, "y": 355},
            "淮南": {"province": "安徽", "lng": 116.8, "lat": 32.6, "x": 655, "y": 340},
            "南昌": {"province": "江西", "lng": 115.9, "lat": 28.7, "x": 620, "y": 420},
            "赣州": {"province": "江西", "lng": 114.9, "lat": 25.8, "x": 605, "y": 470},
            "福州": {"province": "福建", "lng": 119.3, "lat": 26.1, "x": 700, "y": 460},
            "厦门": {"province": "福建", "lng": 118.1, "lat": 24.5, "x": 680, "y": 490},
            "泉州": {"province": "福建", "lng": 118.6, "lat": 24.9, "x": 690, "y": 480},
            "兰州": {"province": "甘肃", "lng": 103.8, "lat": 36.1, "x": 350, "y": 220},
            "天水": {"province": "甘肃", "lng": 105.7, "lat": 34.6, "x": 370, "y": 250},
            "乌鲁木齐": {"province": "新疆", "lng": 87.6, "lat": 43.8, "x": 150, "y": 120},
            "拉萨": {"province": "西藏", "lng": 91.1, "lat": 29.6, "x": 180, "y": 380},
            "西宁": {"province": "青海", "lng": 101.8, "lat": 36.6, "x": 320, "y": 210},
            "银川": {"province": "宁夏", "lng": 106.3, "lat": 38.5, "x": 380, "y": 190},
            "呼和浩特": {"province": "内蒙古", "lng": 111.7, "lat": 40.8, "x": 480, "y": 140},
            "南宁": {"province": "广西", "lng": 108.3, "lat": 22.8, "x": 520, "y": 500},
            "桂林": {"province": "广西", "lng": 110.3, "lat": 25.3, "x": 540, "y": 470},
            "贵阳": {"province": "贵州", "lng": 106.6, "lat": 26.6, "x": 340, "y": 440},
            "六盘水": {"province": "贵州", "lng": 104.8, "lat": 26.6, "x": 310, "y": 440},
            "昆明": {"province": "云南", "lng": 102.7, "lat": 25.0, "x": 290, "y": 480},
            "大理": {"province": "云南", "lng": 100.2, "lat": 25.6, "x": 260, "y": 470},
            "丽江": {"province": "云南", "lng": 100.2, "lat": 26.9, "x": 250, "y": 450}
        }
        
        self.province_capital = {
            "黑龙江": "哈尔滨", "吉林": "长春", "辽宁": "沈阳",
            "四川": "成都", "重庆": "重庆", "贵州": "贵阳", "云南": "昆明",
            "广东": "广州", "广西": "南宁", "海南": "海口",
            "陕西": "西安", "山西": "太原",
            "河南": "郑州", "河北": "石家庄",
            "北京": "北京", "天津": "天津",
            "上海": "上海", "浙江": "杭州", "江苏": "南京",
            "山东": "济南",
            "湖南": "长沙", "湖北": "武汉",
            "安徽": "合肥", "江西": "南昌",
            "福建": "福州",
            "甘肃": "兰州", "新疆": "乌鲁木齐", "西藏": "拉萨",
            "青海": "西宁", "宁夏": "银川", "内蒙古": "呼和浩特"
        }

    def get_dialect_by_province(self, province: str) -> str:
        dialect_map = {
            "黑龙江": "东北话", "吉林": "东北话", "辽宁": "东北话", "内蒙古": "东北话",
            "山西": "晋语", "陕西北部": "晋语",
            "河南": "河南话", "河北": "河北话", "北京": "北京话", "天津": "天津话",
            "山东": "山东话",
            "上海": "吴语", "浙江": "吴语", "江苏": "吴语", "安徽南部": "吴语",
            "安徽": "安徽话",
            "江西": "赣语",
            "湖南": "湖南话", "湖北": "湖北话",
            "四川": "四川话", "重庆": "四川话", "贵州": "西南官话", "云南": "西南官话", "广西北部": "西南官话",
            "广东": "广东话", "香港": "广东话", "澳门": "广东话", "广西": "粤语",
            "福建": "闽南语", "台湾": "闽南语", "海南": "闽南语",
            "新疆": "西北话", "甘肃": "西北话", "宁夏": "西北话", "青海": "西北话",
            "西藏": "藏语",
            "陕西": "西北话"
        }
        
        return dialect_map.get(province, "普通话")

    def get_dialect_coords(self, dialect: str) -> Dict:
        return self.dialect_region.get(dialect, {"lng": 116.4, "lat": 39.9, "x": 500, "y": 300})

    def get_city_coords(self, city: str, add_random_offset: bool = True, offset_scale: float = 1.0) -> Dict:
        coords = None
        
        if city in self.city_coords:
            coords = self.city_coords[city].copy()
        else:
            province = city if city in self.province_capital else None
            if province:
                capital = self.province_capital.get(province, "北京")
                coords = self.city_coords.get(capital, {"lng": 116.4, "lat": 39.9, "x": 500, "y": 300}).copy()
            else:
                coords = {"lng": 116.4, "lat": 39.9, "x": 500, "y": 300}
        
        if add_random_offset and coords:
            import random
            coords["lng"] += (random.random() - 0.5) * 0.4 * offset_scale
            coords["lat"] += (random.random() - 0.5) * 0.3 * offset_scale
            coords["x"] += int((random.random() - 0.5) * 20 * offset_scale)
            coords["y"] += int((random.random() - 0.5) * 15 * offset_scale)
        
        return coords

    def get_province_coords(self, province: str) -> Dict:
        capital = self.province_capital.get(province, "北京")
        return self.get_city_coords(capital, add_random_offset=False)

    def map_anchor_to_dialect(self, anchor: Anchor) -> Dict:
        dialect = self.get_dialect_by_province(anchor.hometown)
        dialect_info = self.get_dialect_coords(dialect)
        hometown_coords = self.get_province_coords(anchor.hometown)
        return {
            "anchor_id": anchor.id,
            "anchor_name": anchor.name,
            "platform": anchor.platform,
            "hometown": anchor.hometown,
            "category": anchor.category,
            "dialect": dialect,
            "dialect_lng": dialect_info["lng"],
            "dialect_lat": dialect_info["lat"],
            "dialect_x": dialect_info["x"],
            "dialect_y": dialect_info["y"],
            "hometown_lng": hometown_coords["lng"],
            "hometown_lat": hometown_coords["lat"],
            "hometown_x": hometown_coords["x"],
            "hometown_y": hometown_coords["y"]
        }

    def get_product_origin_coords(self, product: Product, unique_index: int = 0) -> Dict:
        coords = self.get_city_coords(product.origin_city, add_random_offset=True, offset_scale=1.0)
        angle = (unique_index * 37) % 360
        import math
        radius = 0.02 + (unique_index % 5) * 0.01
        coords["lng"] += math.cos(math.radians(angle)) * radius
        coords["lat"] += math.sin(math.radians(angle)) * radius
        coords["x"] += int(math.cos(math.radians(angle)) * 10)
        coords["y"] += int(math.sin(math.radians(angle)) * 8)
        return coords

    def create_flow_data(self, anchor: Anchor, product: Product, sales_volume: int, unique_index: int = 0) -> Dict:
        source_data = self.map_anchor_to_dialect(anchor)
        target_coords = self.get_product_origin_coords(product, unique_index)
        
        return {
            "source": {
                "name": source_data["dialect"],
                "lng": source_data["dialect_lng"],
                "lat": source_data["dialect_lat"],
                "x": source_data["dialect_x"],
                "y": source_data["dialect_y"],
                "province": anchor.hometown
            },
            "target": {
                "name": product.origin_city,
                "province": product.origin,
                "lng": target_coords["lng"],
                "lat": target_coords["lat"],
                "x": target_coords["x"],
                "y": target_coords["y"]
            },
            "value": sales_volume,
            "anchor_name": anchor.name,
            "anchor_category": anchor.category,
            "product_name": product.name,
            "product_category": product.category,
            "platform": anchor.platform,
            "anchor_id": anchor.id,
            "product_id": product.id
        }


mapper = RegionMapper()
