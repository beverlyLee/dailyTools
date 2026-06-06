import os
import math
import json
import requests
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from dataclasses import dataclass

load_dotenv()

GAODE_TRAFFIC_KEY = os.getenv("GAODE_TRAFFIC_KEY", "")
CITY_CENTER_LNG = float(os.getenv("CITY_CENTER_LNG", "116.397428"))
CITY_CENTER_LAT = float(os.getenv("CITY_CENTER_LAT", "39.90923"))

POI_URL = "https://restapi.amap.com/v3/place/text"
AROUND_URL = "https://restapi.amap.com/v3/place/around"

DEFAULT_SCENIC_SPOTS = [
    {"name": "八达岭长城", "lng": 116.0278, "lat": 40.3589, "level": "5A", "direction": "西北"},
    {"name": "颐和园", "lng": 116.2764, "lat": 39.9999, "level": "5A", "direction": "西北"},
    {"name": "故宫博物院", "lng": 116.3970, "lat": 39.9163, "level": "5A", "direction": "市中心"},
    {"name": "天坛公园", "lng": 116.4109, "lat": 39.8819, "level": "5A", "direction": "南"},
    {"name": "北海公园", "lng": 116.3831, "lat": 39.9389, "level": "4A", "direction": "北"},
    {"name": "香山公园", "lng": 116.1883, "lat": 39.9948, "level": "4A", "direction": "西北"},
    {"name": "慕田峪长城", "lng": 116.5664, "lat": 40.4546, "level": "5A", "direction": "东北"},
    {"name": "十三陵", "lng": 116.2778, "lat": 40.2583, "level": "5A", "direction": "西北"},
    {"name": "北京欢乐谷", "lng": 116.4892, "lat": 39.8656, "level": "4A", "direction": "东南"},
    {"name": "雍和宫", "lng": 116.4163, "lat": 39.9481, "level": "4A", "direction": "东北"},
    {"name": "圆明园", "lng": 116.3084, "lat": 40.0083, "level": "5A", "direction": "西北"},
    {"name": "南锣鼓巷", "lng": 116.4039, "lat": 39.9371, "level": "历史街区", "direction": "北"},
    {"name": "798艺术区", "lng": 116.4969, "lat": 39.9847, "level": "文化创意", "direction": "东北"},
    {"name": "鸟巢", "lng": 116.3968, "lat": 39.9936, "level": "4A", "direction": "北"},
    {"name": "古北水镇", "lng": 117.1244, "lat": 40.6512, "level": "5A", "direction": "东北"},
    {"name": "十渡风景区", "lng": 115.6057, "lat": 39.7078, "level": "4A", "direction": "西南"},
    {"name": "京东大峡谷", "lng": 117.0669, "lat": 40.2206, "level": "4A", "direction": "东北"},
    {"name": "潭柘寺", "lng": 116.0844, "lat": 39.8867, "level": "4A", "direction": "西"},
    {"name": "戒台寺", "lng": 116.0997, "lat": 39.8236, "level": "4A", "direction": "西南"},
    {"name": "云蒙山", "lng": 116.8486, "lat": 40.5967, "level": "4A", "direction": "东北"},
    {"name": "恭王府", "lng": 116.395, "lat": 39.942, "level": "5A", "direction": "北"},
    {"name": "景山公园", "lng": 116.396, "lat": 39.928, "level": "4A", "direction": "北"},
    {"name": "中山公园", "lng": 116.393, "lat": 39.913, "level": "4A", "direction": "市中心"},
    {"name": "什刹海", "lng": 116.385, "lat": 39.942, "level": "历史街区", "direction": "西北"},
    {"name": "烟袋斜街", "lng": 116.387, "lat": 39.944, "level": "历史街区", "direction": "西北"},
    {"name": "前门大街", "lng": 116.397, "lat": 39.899, "level": "历史街区", "direction": "南"},
    {"name": "大栅栏", "lng": 116.393, "lat": 39.897, "level": "历史街区", "direction": "南"},
    {"name": "王府井", "lng": 116.410, "lat": 39.915, "level": "商业街", "direction": "东"},
    {"name": "三里屯", "lng": 116.456, "lat": 39.936, "level": "商业街", "direction": "东"},
    {"name": "国贸CBD", "lng": 116.461, "lat": 39.909, "level": "商务区", "direction": "东"},
    {"name": "水立方", "lng": 116.392, "lat": 39.997, "level": "4A", "direction": "北"},
    {"name": "奥林匹克公园", "lng": 116.395, "lat": 40.003, "level": "5A", "direction": "北"},
    {"name": "北京动物园", "lng": 116.341, "lat": 39.942, "level": "4A", "direction": "西"},
    {"name": "北京海洋馆", "lng": 116.339, "lat": 39.945, "level": "4A", "direction": "西"},
    {"name": "北京植物园", "lng": 116.216, "lat": 39.995, "level": "4A", "direction": "西北"},
    {"name": "八大处公园", "lng": 116.193, "lat": 39.966, "level": "4A", "direction": "西"},
    {"name": "卢沟桥", "lng": 116.213, "lat": 39.852, "level": "4A", "direction": "西南"},
    {"name": "周口店遗址", "lng": 115.935, "lat": 39.689, "level": "4A", "direction": "西南"},
    {"name": "石花洞", "lng": 115.983, "lat": 39.736, "level": "4A", "direction": "西南"},
    {"name": "银狐洞", "lng": 115.833, "lat": 39.762, "level": "3A", "direction": "西南"},
    {"name": "百花山", "lng": 115.621, "lat": 39.806, "level": "3A", "direction": "西"},
    {"name": "灵山", "lng": 115.583, "lat": 39.962, "level": "3A", "direction": "西"},
    {"name": "妙峰山", "lng": 116.094, "lat": 40.077, "level": "3A", "direction": "西北"},
    {"name": "凤凰岭", "lng": 116.128, "lat": 40.108, "level": "4A", "direction": "西北"},
    {"name": "阳台山", "lng": 116.162, "lat": 40.071, "level": "3A", "direction": "西北"},
    {"name": "鹫峰", "lng": 116.167, "lat": 40.056, "level": "3A", "direction": "西北"},
    {"name": "百望山", "lng": 116.252, "lat": 40.031, "level": "3A", "direction": "西北"},
    {"name": "居庸关长城", "lng": 116.070, "lat": 40.291, "level": "4A", "direction": "西北"},
    {"name": "水关长城", "lng": 116.020, "lat": 40.370, "level": "4A", "direction": "西北"},
    {"name": "黄花城水长城", "lng": 116.453, "lat": 40.368, "level": "4A", "direction": "东北"},
    {"name": "响水湖", "lng": 116.387, "lat": 40.462, "level": "3A", "direction": "西北"},
    {"name": "红螺寺", "lng": 116.662, "lat": 40.389, "level": "4A", "direction": "东北"},
    {"name": "雁栖湖", "lng": 116.679, "lat": 40.367, "level": "4A", "direction": "东北"},
    {"name": "青龙峡", "lng": 116.688, "lat": 40.477, "level": "4A", "direction": "东北"},
    {"name": "幽谷神潭", "lng": 116.716, "lat": 40.571, "level": "3A", "direction": "东北"},
    {"name": "天池峡谷", "lng": 116.667, "lat": 40.534, "level": "3A", "direction": "东北"},
    {"name": "喇叭沟门", "lng": 116.565, "lat": 40.821, "level": "4A", "direction": "北"},
    {"name": "密云水库", "lng": 116.885, "lat": 40.495, "level": "自然景观", "direction": "东北"},
    {"name": "黑龙潭", "lng": 116.745, "lat": 40.589, "level": "4A", "direction": "东北"},
    {"name": "桃源仙谷", "lng": 116.804, "lat": 40.521, "level": "3A", "direction": "东北"},
    {"name": "京都第一瀑", "lng": 116.789, "lat": 40.573, "level": "3A", "direction": "东北"},
    {"name": "司马台长城", "lng": 117.158, "lat": 40.627, "level": "4A", "direction": "东北"},
    {"name": "金山岭长城", "lng": 117.196, "lat": 40.658, "level": "4A", "direction": "东北"},
    {"name": "雾灵山", "lng": 117.468, "lat": 40.578, "level": "4A", "direction": "东北"},
    {"name": "云岫谷", "lng": 117.223, "lat": 40.685, "level": "3A", "direction": "东北"},
    {"name": "白龙潭", "lng": 117.118, "lat": 40.567, "level": "3A", "direction": "东"},
    {"name": "平谷金海湖", "lng": 117.316, "lat": 40.256, "level": "4A", "direction": "东"},
    {"name": "京东石林峡", "lng": 117.287, "lat": 40.182, "level": "4A", "direction": "东"},
    {"name": "京东大溶洞", "lng": 117.272, "lat": 40.144, "level": "4A", "direction": "东"},
    {"name": "湖洞水", "lng": 117.256, "lat": 40.214, "level": "3A", "direction": "东"},
    {"name": "飞龙谷", "lng": 117.225, "lat": 40.208, "level": "3A", "direction": "东"},
    {"name": "轩辕台", "lng": 117.289, "lat": 40.236, "level": "3A", "direction": "东"},
    {"name": "老象峰", "lng": 117.188, "lat": 40.201, "level": "3A", "direction": "东"},
    {"name": "丫髻山", "lng": 117.168, "lat": 40.214, "level": "4A", "direction": "东"},
    {"name": "龙庆峡", "lng": 116.070, "lat": 40.492, "level": "4A", "direction": "西北"},
    {"name": "松山", "lng": 115.815, "lat": 40.527, "level": "4A", "direction": "西北"},
    {"name": "玉渡山", "lng": 116.050, "lat": 40.563, "level": "4A", "direction": "西北"},
    {"name": "古崖居", "lng": 115.921, "lat": 40.512, "level": "3A", "direction": "西北"},
    {"name": "百里山水画廊", "lng": 116.437, "lat": 40.683, "level": "4A", "direction": "北"},
    {"name": "四季花海", "lng": 116.568, "lat": 40.716, "level": "3A", "direction": "北"},
    {"name": "珍珠泉", "lng": 116.573, "lat": 40.531, "level": "3A", "direction": "北"},
    {"name": "八达岭野生动物园", "lng": 116.011, "lat": 40.344, "level": "3A", "direction": "西北"},
    {"name": "野鸭湖", "lng": 115.853, "lat": 40.489, "level": "4A", "direction": "西北"},
    {"name": "康西草原", "lng": 115.917, "lat": 40.389, "level": "3A", "direction": "西北"},
    {"name": "石京龙滑雪场", "lng": 116.043, "lat": 40.525, "level": "滑雪场", "direction": "西北"},
    {"name": "军都山滑雪场", "lng": 116.267, "lat": 40.336, "level": "滑雪场", "direction": "西北"},
    {"name": "南山滑雪场", "lng": 116.795, "lat": 40.309, "level": "滑雪场", "direction": "东北"},
    {"name": "怀北滑雪场", "lng": 116.661, "lat": 40.455, "level": "滑雪场", "direction": "东北"},
    {"name": "北京环球度假区", "lng": 116.661, "lat": 39.854, "level": "5A", "direction": "东南"},
    {"name": "大兴野生动物园", "lng": 116.351, "lat": 39.554, "level": "4A", "direction": "南"},
    {"name": "北京野生动物园", "lng": 116.542, "lat": 39.518, "level": "4A", "direction": "南"},
    {"name": "世界公园", "lng": 116.286, "lat": 39.811, "level": "4A", "direction": "西南"},
    {"name": "北宫国家森林公园", "lng": 116.197, "lat": 39.827, "level": "4A", "direction": "西南"},
    {"name": "戒台寺郊野公园", "lng": 116.102, "lat": 39.832, "level": "森林公园", "direction": "西南"},
    {"name": "南海子公园", "lng": 116.478, "lat": 39.771, "level": "森林公园", "direction": "南"},
    {"name": "奥森公园", "lng": 116.392, "lat": 40.021, "level": "5A", "direction": "北"},
    {"name": "朝阳公园", "lng": 116.483, "lat": 39.937, "level": "4A", "direction": "东"},
    {"name": "海淀公园", "lng": 116.308, "lat": 39.990, "level": "城市公园", "direction": "西北"},
    {"name": "陶然亭公园", "lng": 116.378, "lat": 39.878, "level": "4A", "direction": "南"},
    {"name": "玉渊潭公园", "lng": 116.318, "lat": 39.915, "level": "4A", "direction": "西"},
    {"name": "紫竹院公园", "lng": 116.327, "lat": 39.944, "level": "4A", "direction": "西"},
    {"name": "颐和园西堤", "lng": 116.268, "lat": 39.991, "level": "景区", "direction": "西北"},
    {"name": "通州大运河森林公园", "lng": 116.755, "lat": 39.907, "level": "4A", "direction": "东"},
    {"name": "昌平温榆河公园", "lng": 116.478, "lat": 40.112, "level": "森林公园", "direction": "东北"},
    {"name": "园博园", "lng": 116.216, "lat": 39.876, "level": "4A", "direction": "西南"},
]


@dataclass
class ScenicSpot:
    name: str
    lng: float
    lat: float
    level: str
    direction: str
    popularity: int = 0
    distance_km: float = 0


class POIAssociator:
    def __init__(self, center_lng: float = CITY_CENTER_LNG, center_lat: float = CITY_CENTER_LAT):
        self.center_lng = center_lng
        self.center_lat = center_lat
        self.scenic_spots: List[Dict[str, Any]] = []
        self._load_default_spots()

    def _load_default_spots(self):
        for spot in DEFAULT_SCENIC_SPOTS:
            spot["distance_km"] = self._calculate_distance_km(
                self.center_lng, self.center_lat,
                spot["lng"], spot["lat"]
            )
            self.scenic_spots.append(spot)

    def _calculate_distance_km(self, lng1: float, lat1: float, lng2: float, lat2: float) -> float:
        R = 6371.0
        
        lng1_rad = math.radians(lng1)
        lat1_rad = math.radians(lat1)
        lng2_rad = math.radians(lng2)
        lat2_rad = math.radians(lat2)
        
        d_lng = lng2_rad - lng1_rad
        d_lat = lat2_rad - lat1_rad
        
        a = math.sin(d_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(d_lng / 2) ** 2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c

    def _calculate_bearing(self, lng1: float, lat1: float, lng2: float, lat2: float) -> float:
        lng1_rad = math.radians(lng1)
        lat1_rad = math.radians(lat1)
        lng2_rad = math.radians(lng2)
        lat2_rad = math.radians(lat2)
        
        d_lng = lng2_rad - lng1_rad
        
        y = math.sin(d_lng) * math.cos(lat2_rad)
        x = math.cos(lat1_rad) * math.sin(lat2_rad) - math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(d_lng)
        
        bearing = math.degrees(math.atan2(y, x))
        bearing = (bearing + 360) % 360
        
        return bearing

    def fetch_scenic_pois(self, radius: int = 50000) -> List[Dict[str, Any]]:
        if not GAODE_TRAFFIC_KEY:
            print("Warning: No Gaode API key not found, using default data")
            return self.scenic_spots

        params = {
            "key": GAODE_TRAFFIC_KEY,
            "keywords": "风景名胜",
            "location": f"{self.center_lng},{self.center_lat}",
            "radius": radius,
            "offset": 50,
            "page": 1,
            "extensions": "base"
        }

        try:
            response = requests.get(AROUND_URL, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if data.get("status") == "1":
                pois = data.get("pois", [])
                for poi in pois:
                    location = poi.get("location", "")
                    if location:
                        lng, lat = map(float, location.split(","))
                        name = poi.get("name", "")
                        level = poi.get("type", "")
                        
                        spot = {
                            "name": name,
                            "lng": lng,
                            "lat": lat,
                            "level": level,
                            "direction": self._get_direction_name(
                                self._calculate_bearing(self.center_lng, self.center_lat, lng, lat)
                            ),
                            "distance_km": self._calculate_distance_km(
                                self.center_lng, self.center_lat, lng, lat)
                        }
                        self.scenic_spots.append(spot)

        except Exception as e:
            print(f"Error fetching POIs: {e}")

        return self.scenic_spots

    def _get_direction_name(self, angle: float) -> str:
        directions = {
            0: "北",
            22.5: "北偏东",
            45: "东北",
            67.5: "东偏北",
            90: "东",
            112.5: "东偏南",
            135: "东南",
            157.5: "南偏东",
            180: "南",
            202.5: "南偏西",
            225: "西南",
            247.5: "西偏南",
            270: "西",
            292.5: "西偏北",
            315: "西北",
            337.5: "北偏西"
        }
        
        min_diff = 360
        closest_direction = "北"
        
        for dir_angle, dir_name in directions.items():
            diff = abs(angle - dir_angle)
            if diff > 180:
                diff = 360 - diff
            if diff < min_diff:
                min_diff = diff
                closest_direction = dir_name
        
        return closest_direction

    def associate_directions_with_pois(self, direction_clusters: List[Dict[str, Any]],
                                 max_distance_km: float = 120) -> List[Dict[str, Any]]:
        results = []

        for cluster in direction_clusters:
            cluster_angle = cluster["direction_angle"]
            cluster_direction = cluster["direction_name"]
            flow_volume = cluster["flow_volume"]

            matching_spots = []
            for spot in self.scenic_spots:
                spot_angle = self._calculate_bearing(
                    self.center_lng, self.center_lat,
                    spot["lng"], spot["lat"]
                )

                angle_diff = abs(spot_angle - cluster_angle)
                if angle_diff > 180:
                    angle_diff = 360 - angle_diff

                if angle_diff < 60 and spot["distance_km"] <= max_distance_km:
                    popularity_score = self._calculate_popularity(
                        flow_volume, spot["distance_km"], angle_diff)
                    
                    matching_spots.append({
                        **spot,
                        "angle_diff": angle_diff,
                        "popularity": popularity_score,
                        "relevance": 100 - (angle_diff / 60 * 50) - (spot["distance_km"] / max_distance_km * 50)
                    })

            matching_spots.sort(key=lambda x: x["popularity"], reverse=True)

            results.append({
                "direction": cluster_direction,
                "direction_angle": cluster_angle,
                "flow_volume": flow_volume,
                "flow_percentage": cluster.get("flow_percentage", 0),
                "avg_congestion": cluster.get("avg_congestion", 0),
                "scenic_spots": matching_spots[:5],
                "top_destination": matching_spots[0] if matching_spots else None
            })

        return results

    def _calculate_popularity(self, flow_volume: int, distance: float, angle_diff: float) -> float:
        flow_score = min(flow_volume / 100, 1.0) * 40
        
        if distance < 10:
            distance_score = 0.1
        elif distance <= 30:
            distance_score = 0.3 + (distance - 10) / 20 * 0.5
        elif distance <= 80:
            distance_score = 0.8 + (distance - 30) / 50 * 0.2
        elif distance <= 120:
            distance_score = 1.0 - (distance - 80) / 40 * 0.4
        else:
            distance_score = 0.6
        distance_score = distance_score * 30
        
        angle_score = max(0, 1 - angle_diff / 60) * 30
        
        return flow_score + distance_score + angle_score

    def get_radial_lines_with_destinations(self, associations: List[Dict[str, Any]],
                                           max_radius_km: float = 100) -> List[Dict[str, Any]]:
        radial_lines = []

        for assoc in associations:
            top_spot = assoc.get("top_destination")
            
            if top_spot:
                end_lng = top_spot["lng"]
                end_lat = top_spot["lat"]
            else:
                angle = math.radians(assoc["direction_angle"])
                end_lng = self.center_lng + (max_radius_km / 111.32) * math.cos(angle)
                end_lat = self.center_lat + (max_radius_km / 111.32) * math.sin(angle)

            line_width = self._calculate_line_width(assoc["flow_volume"])

            radial_lines.append({
                "direction": assoc["direction"],
                "direction_angle": assoc["direction_angle"],
                "start": [self.center_lng, self.center_lat],
                "end": [end_lng, end_lat],
                "flow_volume": assoc["flow_volume"],
                "flow_percentage": assoc["flow_percentage"],
                "line_width": line_width,
                "avg_congestion": assoc["avg_congestion"],
                "color": self._get_congestion_color(assoc["avg_congestion"]),
                "destination": top_spot.get("name") if top_spot else None,
                "destination_level": top_spot.get("level") if top_spot else None,
                "all_spots": [spot["name"] for spot in assoc.get("scenic_spots", [])]
            })

        return radial_lines

    def _calculate_line_width(self, flow_volume: int) -> int:
        max_volume = max([s.get("flow_volume", 1) for s in self.scenic_spots])
        normalized = flow_volume / max_volume if max_volume > 0 else 1
        return max(2, int(normalized * 10))

    def _get_congestion_color(self, congestion_level: float) -> str:
        if congestion_level <= 1:
            return "#00FF00"
        elif congestion_level <= 2:
            return "#FFFF00"
        elif congestion_level <= 3:
            return "#FFA500"
        else:
            return "#FF0000"

    def save_associations(self, associations: List[Dict[str, Any]], filepath: str = None):
        if filepath is None:
            import datetime
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filepath = f"/Users/liboyang/trae/dailyTools/weekend-escape/data/poi_associations_{timestamp}.json"
        
        output = {
            "center": [self.center_lng, self.center_lat],
            "timestamp": datetime.datetime.now().isoformat(),
            "associations": associations
        }
        
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print(f"POI associations saved to {filepath}")


def associate_pois_with_directions(direction_clusters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    associator = POIAssociator()
    associator.fetch_scenic_pois()
    associations = associator.associate_directions_with_pois(direction_clusters)
    
    print(f"\n=== POI Associations ===")
    for assoc in associations:
        print(f"\n{assoc['direction']}方向 (车流量: {assoc['flow_volume']}):")
        for spot in assoc["scenic_spots"][:3]:
            print(f"  - {spot['name']} ({spot['level']}, {spot['distance_km']:.1f}km)")
    
    associator.save_associations(associations)
    return associations


if __name__ == "__main__":
    sample_clusters = [
        {"direction_angle": 315, "direction_name": "西北", "flow_volume": 150, "flow_percentage": 35, "avg_congestion": 3},
        {"direction_angle": 45, "direction_name": "东北", "flow_volume": 120, "flow_percentage": 28, "avg_congestion": 2},
        {"direction_angle": 180, "direction_name": "南", "flow_volume": 80, "flow_percentage": 19, "avg_congestion": 4},
        {"direction_angle": 90, "direction_name": "东", "flow_volume": 50, "flow_percentage": 12, "avg_congestion": 2},
    ]
    associate_pois_with_directions(sample_clusters)
