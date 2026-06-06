import json
import os
import math

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")

MOCK_POI_DATA = {
    "世纪公园": {
        "id": "poi_001",
        "name": "世纪公园",
        "type": "park",
        "type_name": "公园",
        "address": "上海市浦东新区锦绣路1001号",
        "latitude": 31.2253,
        "longitude": 121.5564,
        "has_fitness_equipment": True,
        "fitness_tags": ["单杠", "双杠", "跑步机", "健身步道", "太空漫步机"],
        "equipment_count": 15,
        "equipment_condition": "good",
        "rating": 4.8,
        "province": "上海市",
        "city": "上海市",
        "district": "浦东新区",
        "facility_info": {
            "has_equipment": True,
            "equipment_quality": "良好",
            "age_groups": ["青年", "中年", "老年"],
            "peak_hours": ["06:00-08:00", "18:00-20:00"],
            "is_crowded": True,
            "has_shade": True,
            "ground_type": "塑胶地面",
            "night_lighting": True,
            "free_access": True
        },
        "amenities": {
            "has_shower": False,
            "has_locker": False,
            "has_change_room": False,
            "has_food": True,
            "has_equipment_shop": False,
            "has_vending_machine": True,
            "has_water_fountain": True,
            "nearby_gym": True
        }
    },
    "人民广场": {
        "id": "poi_002",
        "name": "人民广场",
        "type": "park",
        "type_name": "公园广场",
        "address": "上海市黄浦区人民大道120号",
        "latitude": 31.2304,
        "longitude": 121.4737,
        "has_fitness_equipment": True,
        "fitness_tags": ["单杠", "双杠", "健身角"],
        "equipment_count": 8,
        "equipment_condition": "excellent",
        "rating": 4.9,
        "province": "上海市",
        "city": "上海市",
        "district": "黄浦区",
        "facility_info": {
            "has_equipment": True,
            "equipment_quality": "崭新",
            "age_groups": ["青年", "中年", "老年", "少年"],
            "peak_hours": ["05:30-07:30", "15:00-17:00"],
            "is_crowded": True,
            "has_shade": False,
            "ground_type": "水泥地面",
            "night_lighting": True,
            "free_access": True
        },
        "amenities": {
            "has_shower": False,
            "has_locker": False,
            "has_change_room": False,
            "has_food": True,
            "has_equipment_shop": False,
            "has_vending_machine": True,
            "has_water_fountain": False,
            "nearby_gym": True
        }
    },
    "徐汇滨江公园": {
        "id": "poi_003",
        "name": "徐汇滨江公园",
        "type": "park",
        "type_name": "公园",
        "address": "上海市徐汇区龙腾大道",
        "latitude": 31.1802,
        "longitude": 121.4660,
        "has_fitness_equipment": True,
        "fitness_tags": ["健身步道", "拉伸器材", "公共健身区"],
        "equipment_count": 12,
        "equipment_condition": "good",
        "rating": 4.7,
        "province": "上海市",
        "city": "上海市",
        "district": "徐汇区",
        "facility_info": {
            "has_equipment": True,
            "equipment_quality": "良好",
            "age_groups": ["青年", "中年"],
            "peak_hours": ["07:00-09:00", "19:00-21:00"],
            "is_crowded": False,
            "has_shade": True,
            "ground_type": "塑胶步道",
            "night_lighting": True,
            "free_access": True
        },
        "amenities": {
            "has_shower": False,
            "has_locker": False,
            "has_change_room": False,
            "has_food": True,
            "has_equipment_shop": False,
            "has_vending_machine": True,
            "has_water_fountain": True,
            "nearby_gym": True
        }
    },
    "中山公园": {
        "id": "poi_004",
        "name": "中山公园",
        "type": "park",
        "type_name": "公园",
        "address": "上海市长宁区长宁路780号",
        "latitude": 31.2165,
        "longitude": 121.4173,
        "has_fitness_equipment": True,
        "fitness_tags": ["双杠", "单杠", "健身器材区"],
        "equipment_count": 10,
        "equipment_condition": "good",
        "rating": 4.6,
        "province": "上海市",
        "city": "上海市",
        "district": "长宁区",
        "facility_info": {
            "has_equipment": True,
            "equipment_quality": "良好",
            "age_groups": ["青年", "中年", "老年"],
            "peak_hours": ["06:30-08:00", "17:30-19:30"],
            "is_crowded": True,
            "has_shade": True,
            "ground_type": "塑胶地面",
            "night_lighting": False,
            "free_access": True
        },
        "amenities": {
            "has_shower": False,
            "has_locker": False,
            "has_change_room": False,
            "has_food": True,
            "has_equipment_shop": False,
            "has_vending_machine": False,
            "has_water_fountain": True,
            "nearby_gym": True
        }
    },
    "长风二村小区": {
        "id": "poi_005",
        "name": "长风二村小区",
        "type": "residential",
        "type_name": "住宅小区",
        "address": "上海市普陀区怒江路",
        "latitude": 31.2189,
        "longitude": 121.4056,
        "has_fitness_equipment": True,
        "fitness_tags": ["健身器材", "小区健身点"],
        "equipment_count": 5,
        "equipment_condition": "poor",
        "rating": 2.5,
        "province": "上海市",
        "city": "上海市",
        "district": "普陀区",
        "facility_info": {
            "has_equipment": True,
            "equipment_quality": "较老旧",
            "age_groups": ["中年", "老年"],
            "peak_hours": ["06:00-07:00", "18:00-20:00"],
            "is_crowded": False,
            "has_shade": True,
            "ground_type": "水泥地面",
            "night_lighting": False,
            "free_access": True
        },
        "amenities": {
            "has_shower": False,
            "has_locker": False,
            "has_change_room": False,
            "has_food": False,
            "has_equipment_shop": False,
            "has_vending_machine": False,
            "has_water_fountain": False,
            "nearby_gym": False
        }
    },
    "闸北公园": {
        "id": "poi_006",
        "name": "闸北公园",
        "type": "park",
        "type_name": "公园",
        "address": "上海市静安区共和新路1555号",
        "latitude": 31.2638,
        "longitude": 121.4690,
        "has_fitness_equipment": True,
        "fitness_tags": ["单杠", "健身器材区"],
        "equipment_count": 8,
        "equipment_condition": "good",
        "rating": 4.3,
        "province": "上海市",
        "city": "上海市",
        "district": "静安区",
        "facility_info": {
            "has_equipment": True,
            "equipment_quality": "良好",
            "age_groups": ["青年", "中年", "老年"],
            "peak_hours": ["06:00-08:00", "17:00-19:00"],
            "is_crowded": False,
            "has_shade": True,
            "ground_type": "塑胶地面",
            "night_lighting": True,
            "free_access": True
        },
        "amenities": {
            "has_shower": False,
            "has_locker": False,
            "has_change_room": False,
            "has_food": True,
            "has_equipment_shop": False,
            "has_vending_machine": False,
            "has_water_fountain": True,
            "nearby_gym": False
        }
    },
    "鲁迅公园": {
        "id": "poi_007",
        "name": "鲁迅公园",
        "type": "park",
        "type_name": "公园",
        "address": "上海市虹口区四川北路2288号",
        "latitude": 31.2639,
        "longitude": 121.4810,
        "has_fitness_equipment": True,
        "fitness_tags": ["健身步道", "单杠", "太极区", "公共健身区"],
        "equipment_count": 14,
        "equipment_condition": "excellent",
        "rating": 4.8,
        "province": "上海市",
        "city": "上海市",
        "district": "虹口区",
        "facility_info": {
            "has_equipment": True,
            "equipment_quality": "崭新",
            "age_groups": ["青年", "中年", "老年", "少年"],
            "peak_hours": ["05:30-07:30", "09:00-11:00", "18:00-20:00"],
            "is_crowded": True,
            "has_shade": True,
            "ground_type": "塑胶地面",
            "night_lighting": True,
            "free_access": True
        },
        "amenities": {
            "has_shower": False,
            "has_locker": False,
            "has_change_room": False,
            "has_food": True,
            "has_equipment_shop": False,
            "has_vending_machine": True,
            "has_water_fountain": True,
            "nearby_gym": True
        }
    },
    "曹杨新村": {
        "id": "poi_008",
        "name": "曹杨新村",
        "type": "residential",
        "type_name": "住宅小区",
        "address": "上海市普陀区曹杨路",
        "latitude": 31.2440,
        "longitude": 121.4120,
        "has_fitness_equipment": True,
        "fitness_tags": ["小区健身点", "健身器材"],
        "equipment_count": 6,
        "equipment_condition": "fair",
        "rating": 3.2,
        "province": "上海市",
        "city": "上海市",
        "district": "普陀区",
        "facility_info": {
            "has_equipment": True,
            "equipment_quality": "一般",
            "age_groups": ["中年", "老年"],
            "peak_hours": ["06:30-08:00", "19:00-20:30"],
            "is_crowded": False,
            "has_shade": True,
            "ground_type": "水泥地面",
            "night_lighting": False,
            "free_access": True
        },
        "amenities": {
            "has_shower": False,
            "has_locker": False,
            "has_change_room": False,
            "has_food": False,
            "has_equipment_shop": False,
            "has_vending_machine": False,
            "has_water_fountain": False,
            "nearby_gym": True
        }
    },
    "和平公园": {
        "id": "poi_009",
        "name": "和平公园",
        "type": "park",
        "type_name": "公园",
        "address": "上海市虹口区大连路1131号",
        "latitude": 31.2520,
        "longitude": 121.5020,
        "has_fitness_equipment": True,
        "fitness_tags": ["健身角", "单杠", "健身器材区"],
        "equipment_count": 9,
        "equipment_condition": "good",
        "rating": 4.4,
        "province": "上海市",
        "city": "上海市",
        "district": "虹口区",
        "facility_info": {
            "has_equipment": True,
            "equipment_quality": "良好",
            "age_groups": ["青年", "中年", "老年"],
            "peak_hours": ["06:00-08:00", "17:00-19:00"],
            "is_crowded": True,
            "has_shade": True,
            "ground_type": "塑胶地面",
            "night_lighting": True,
            "free_access": True
        },
        "amenities": {
            "has_shower": False,
            "has_locker": False,
            "has_change_room": False,
            "has_food": True,
            "has_equipment_shop": False,
            "has_vending_machine": False,
            "has_water_fountain": True,
            "nearby_gym": False
        }
    },
    "宜川五村": {
        "id": "poi_010",
        "name": "宜川五村",
        "type": "residential",
        "type_name": "老旧小区",
        "address": "上海市普陀区宜川路",
        "latitude": 31.2580,
        "longitude": 121.4480,
        "has_fitness_equipment": True,
        "fitness_tags": ["健身器材", "损坏"],
        "equipment_count": 4,
        "equipment_condition": "broken",
        "rating": 1.8,
        "province": "上海市",
        "city": "上海市",
        "district": "普陀区",
        "facility_info": {
            "has_equipment": True,
            "equipment_quality": "部分损坏",
            "age_groups": ["老年"],
            "peak_hours": ["07:00-09:00"],
            "is_crowded": False,
            "has_shade": False,
            "ground_type": "水泥地面",
            "night_lighting": False,
            "free_access": True
        },
        "amenities": {
            "has_shower": False,
            "has_locker": False,
            "has_change_room": False,
            "has_food": False,
            "has_equipment_shop": False,
            "has_vending_machine": False,
            "has_water_fountain": False,
            "nearby_gym": False
        }
    },
    "复兴公园": {
        "id": "poi_011",
        "name": "复兴公园",
        "type": "park",
        "type_name": "公园",
        "address": "上海市黄浦区雁荡路105号",
        "latitude": 31.2100,
        "longitude": 121.4680,
        "has_fitness_equipment": True,
        "fitness_tags": ["单杠", "健身区", "晨练区"],
        "equipment_count": 7,
        "equipment_condition": "good",
        "rating": 4.5,
        "province": "上海市",
        "city": "上海市",
        "district": "黄浦区",
        "facility_info": {
            "has_equipment": True,
            "equipment_quality": "良好",
            "age_groups": ["青年", "中年", "老年"],
            "peak_hours": ["06:00-08:00", "18:00-20:00"],
            "is_crowded": False,
            "has_shade": True,
            "ground_type": "草地旁水泥地",
            "night_lighting": False,
            "free_access": True
        },
        "amenities": {
            "has_shower": False,
            "has_locker": False,
            "has_change_room": False,
            "has_food": True,
            "has_equipment_shop": False,
            "has_vending_machine": False,
            "has_water_fountain": True,
            "nearby_gym": True
        }
    },
    "延中绿地": {
        "id": "poi_012",
        "name": "延中绿地",
        "type": "park",
        "type_name": "城市绿地",
        "address": "上海市黄浦区延安中路",
        "latitude": 31.2280,
        "longitude": 121.4650,
        "has_fitness_equipment": True,
        "fitness_tags": ["健身区", "公共健身器材"],
        "equipment_count": 6,
        "equipment_condition": "excellent",
        "rating": 4.6,
        "province": "上海市",
        "city": "上海市",
        "district": "黄浦区",
        "facility_info": {
            "has_equipment": True,
            "equipment_quality": "崭新",
            "age_groups": ["青年", "中年"],
            "peak_hours": ["12:00-13:30", "18:30-20:00"],
            "is_crowded": False,
            "has_shade": True,
            "ground_type": "塑胶地面",
            "night_lighting": True,
            "free_access": True
        },
        "amenities": {
            "has_shower": False,
            "has_locker": False,
            "has_change_room": False,
            "has_food": True,
            "has_equipment_shop": False,
            "has_vending_machine": True,
            "has_water_fountain": True,
            "nearby_gym": True
        }
    }
}


class ParkFacilityChecker:
    def __init__(self, use_mock=True, api_key=None):
        self.use_mock = use_mock
        self.api_key = api_key
        self.poi_cache = {}

    def verify_location(self, location_name, latitude=None, longitude=None):
        if self.use_mock:
            return self._mock_verify(location_name, latitude, longitude)
        else:
            return self._api_verify(location_name, latitude, longitude)

    def _mock_verify(self, location_name, latitude=None, longitude=None):
        poi = None
        matched_by = "name"
        
        if location_name in MOCK_POI_DATA:
            poi = MOCK_POI_DATA[location_name]
        elif latitude and longitude:
            poi = self._find_nearest_poi(latitude, longitude)
            matched_by = "distance"
        
        if poi:
            poi = self._enrich_poi_data(poi)
            is_park = poi["type"] == "park"
            has_fitness = poi.get("has_fitness_equipment", False)
            return {
                "valid": True,
                "is_park": is_park,
                "has_fitness_equipment": has_fitness,
                "poi_info": poi,
                "matched_by": matched_by
            }
        
        return {
            "valid": False,
            "is_park": False,
            "has_fitness_equipment": False,
            "poi_info": None,
            "reason": "未找到匹配的POI"
        }

    def _find_nearest_poi(self, latitude, longitude, max_distance_km=1.0):
        nearest = None
        min_dist = float("inf")
        
        for name, poi in MOCK_POI_DATA.items():
            dist = self._haversine_distance(
                latitude, longitude,
                poi["latitude"], poi["longitude"]
            )
            if dist < min_dist and dist <= max_distance_km:
                min_dist = dist
                nearest = poi
        
        return nearest

    def _haversine_distance(self, lat1, lon1, lat2, lon2):
        R = 6371.0
        
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c

    def _enrich_poi_data(self, poi):
        poi_id = poi.get("id", "")
        poi_name = poi.get("name", "")
        
        extra_data = {
            "famous_people": [],
            "coaches": [],
            "facility_info": poi.get("facility_info", {}),
            "amenities": poi.get("amenities", {})
        }
        
        if poi_name == "世纪公园":
            extra_data["famous_people"] = [
                {"name": "大强", "title": "街健达人", "description": "单杠世界纪录保持者，每周六上午在此训练", "avatar_color": "#e74c3c"},
                {"name": "王教练", "title": "退役运动员", "description": "前省队体操运动员，经常来此指导爱好者", "avatar_color": "#3498db"}
            ]
            extra_data["coaches"] = [
                {"name": "李教练", "specialty": "街头健身/自重训练", "experience": "5年", "price": "80元/小时", "contact": "微信预约", "rating": 4.8},
                {"name": "小张老师", "specialty": "中老年健身/康复", "experience": "8年", "price": "60元/小时", "contact": "周末全天", "rating": 4.6}
            ]
        elif poi_name == "人民广场":
            extra_data["famous_people"] = [
                {"name": "魔都跑酷团", "title": "跑酷团队", "description": "上海知名跑酷团体，每周日下午集合训练", "avatar_color": "#9b59b6"}
            ]
            extra_data["coaches"] = [
                {"name": "陈教练", "specialty": "跑酷/极限健身", "experience": "6年", "price": "100元/小时", "contact": "需提前预约", "rating": 4.9}
            ]
        elif poi_name == "鲁迅公园":
            extra_data["famous_people"] = [
                {"name": "太极张师傅", "title": "太极拳传承人", "description": "杨氏太极拳第六代传人，每天清晨带20+人练太极", "avatar_color": "#27ae60"}
            ]
            extra_data["coaches"] = [
                {"name": "张师傅", "specialty": "太极拳/八段锦", "experience": "30年", "price": "免费带练", "contact": "早6点-8点", "rating": 5.0},
                {"name": "刘阿姨", "specialty": "广场舞/健身操", "experience": "10年", "price": "免费", "contact": "晚7点-8点", "rating": 4.7}
            ]
        elif poi_name == "徐汇滨江公园":
            extra_data["famous_people"] = [
                {"name": "阿杰", "title": "滑板博主", "description": "B站10万粉滑板UP主，常在此拍视频", "avatar_color": "#f39c12"},
                {"name": "跑者小王", "title": "全马300选手", "description": "滨江跑团团长，每周三夜跑带队", "avatar_color": "#e67e22"}
            ]
            extra_data["coaches"] = [
                {"name": "王教练", "specialty": "跑步/马拉松", "experience": "7年", "price": "150元/小时", "contact": "周末上午", "rating": 4.8},
                {"name": "滑板小林", "specialty": "滑板教学", "experience": "4年", "price": "120元/小时", "contact": "下午时段", "rating": 4.5}
            ]
        elif poi_name == "长风公园":
            extra_data["famous_people"] = []
            extra_data["coaches"] = [
                {"name": "赵教练", "specialty": "户外健身/亲子运动", "experience": "6年", "price": "90元/小时", "contact": "周末全天", "rating": 4.6}
            ]
        elif poi_name == "静安公园":
            extra_data["famous_people"] = [
                {"name": "瑜伽Lisa姐", "title": "瑜伽导师", "description": "印度认证瑜伽老师，偶尔在此办户外瑜伽课", "avatar_color": "#1abc9c"}
            ]
            extra_data["coaches"] = [
                {"name": "Lisa老师", "specialty": "户外瑜伽/冥想", "experience": "12年", "price": "200元/小时", "contact": "预约制", "rating": 4.9}
            ]
        
        if not extra_data["facility_info"]:
            extra_data["facility_info"] = {
                "has_equipment": poi.get("has_fitness_equipment", False),
                "equipment_quality": "一般",
                "age_groups": ["青年", "中年", "老年"],
                "peak_hours": ["06:00-08:00", "18:00-20:00"],
                "is_crowded": False,
                "has_shade": True,
                "ground_type": "水泥地面",
                "night_lighting": False,
                "free_access": True
            }
        
        if not extra_data["amenities"]:
            extra_data["amenities"] = {
                "has_shower": False,
                "has_locker": False,
                "has_change_room": False,
                "has_food": False,
                "has_equipment_shop": False,
                "has_vending_machine": False,
                "has_water_fountain": False,
                "nearby_gym": False
            }
        
        poi["famous_people"] = extra_data["famous_people"]
        poi["coaches"] = extra_data["coaches"]
        poi["facility_info"] = extra_data["facility_info"]
        poi["amenities"] = extra_data["amenities"]
        
        return poi

    def _api_verify(self, location_name, latitude=None, longitude=None):
        print("提示：高德POI API需要配置有效的API Key")
        print("当前使用Mock数据进行验证")
        return self._mock_verify(location_name, latitude, longitude)

    def batch_verify(self, locations):
        results = []
        for loc in locations:
            name = loc.get("name", "")
            lat = loc.get("latitude")
            lon = loc.get("longitude")
            result = self.verify_location(name, lat, lon)
            results.append({
                **loc,
                "verification": result
            })
        return results

    def get_condition_label(self, condition):
        labels = {
            "excellent": "器材崭新",
            "good": "状态良好",
            "fair": "一般",
            "poor": "较老旧",
            "broken": "部分损坏"
        }
        return labels.get(condition, "未知")


def main():
    checker = ParkFacilityChecker(use_mock=True)
    
    test_locations = [
        {"name": "世纪公园", "latitude": 31.2253, "longitude": 121.5564},
        {"name": "长风二村小区", "latitude": 31.2189, "longitude": 121.4056},
        {"name": "宜川五村", "latitude": 31.2580, "longitude": 121.4480},
    ]
    
    results = checker.batch_verify(test_locations)
    for r in results:
        v = r["verification"]
        print(f"{r['name']}:")
        print(f"  是公园: {v['is_park']}")
        print(f"  有健身器材: {v['has_fitness_equipment']}")
        if v.get("poi_info"):
            print(f"  器材数量: {v['poi_info']['equipment_count']}")
            print(f"  器材状态: {checker.get_condition_label(v['poi_info']['equipment_condition'])}")
        print()


if __name__ == "__main__":
    main()
