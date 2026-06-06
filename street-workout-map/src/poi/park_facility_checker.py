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
        "district": "浦东新区"
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
        "district": "黄浦区"
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
        "district": "徐汇区"
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
        "district": "长宁区"
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
        "district": "普陀区"
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
        "district": "静安区"
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
        "district": "虹口区"
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
        "district": "普陀区"
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
        "district": "虹口区"
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
        "district": "普陀区"
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
        "district": "黄浦区"
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
        "district": "黄浦区"
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
        if location_name in MOCK_POI_DATA:
            poi = MOCK_POI_DATA[location_name]
            is_park = poi["type"] == "park"
            has_fitness = poi.get("has_fitness_equipment", False)
            return {
                "valid": True,
                "is_park": is_park,
                "has_fitness_equipment": has_fitness,
                "poi_info": poi
            }
        
        if latitude and longitude:
            nearest = self._find_nearest_poi(latitude, longitude)
            if nearest:
                return {
                    "valid": True,
                    "is_park": nearest["type"] == "park",
                    "has_fitness_equipment": nearest.get("has_fitness_equipment", False),
                    "poi_info": nearest,
                    "matched_by": "distance"
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
