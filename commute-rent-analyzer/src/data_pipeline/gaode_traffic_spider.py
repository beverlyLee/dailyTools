import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import requests
from typing import Dict, List
from config import Config
import time


class GaodeTrafficSpider:
    def __init__(self):
        self.api_key = Config.GAODE_API_KEY
        self.base_url = Config.GAODE_BASE_URL
        
        self.area_coordinates = {
            "beijing": {
                "回龙观": {"lng": 116.338, "lat": 40.075, "x": 25, "y": 75},
                "天通苑": {"lng": 116.406, "lat": 40.070, "x": 40, "y": 78},
                "西二旗": {"lng": 116.305, "lat": 40.057, "x": 18, "y": 65},
                "望京": {"lng": 116.480, "lat": 39.993, "x": 55, "y": 50},
                "中关村": {"lng": 116.305, "lat": 39.985, "x": 20, "y": 45},
                "国贸": {"lng": 116.460, "lat": 39.909, "x": 50, "y": 25},
                "亦庄": {"lng": 116.505, "lat": 39.782, "x": 60, "y": 10},
                "通州北苑": {"lng": 116.656, "lat": 39.909, "x": 80, "y": 28},
            }
        }
        
        self.work_locations = {
            "center": {"lng": 116.407, "lat": 39.904, "name": "市中心"},
            "wangjing": {"lng": 116.480, "lat": 39.993, "name": "望京"},
            "xierqi": {"lng": 116.305, "lat": 40.057, "name": "西二旗"},
            "guomao": {"lng": 116.460, "lat": 39.909, "name": "国贸"},
            "zhongguancun": {"lng": 116.305, "lat": 39.985, "name": "中关村"},
        }

    def get_traffic_status(self, adcode: str) -> Dict:
        url = f"{self.base_url}/v3/traffic/status/city"
        params = {
            "key": self.api_key,
            "city": adcode,
            "extensions": "base"
        }
        
        try:
            response = requests.get(url, params=params, timeout=5)
            data = response.json()
            
            if data.get("status") == "1" and data.get("info") == "OK":
                traffic_info = data.get("trafficinfo", {})
                evaluation = traffic_info.get("evaluation", {})
                return {
                    "status": "success",
                    "traffic_index": float(evaluation.get("index", 2.0)),
                    "traffic_status": evaluation.get("status", "缓行"),
                    "traffic_description": evaluation.get("description", ""),
                }
        except Exception as e:
            print(f"获取交通数据失败（使用模拟数据）: {e}")
        
        return {
            "status": "mock",
            "traffic_index": 2.0 + (hash(adcode) % 10) / 10,
            "traffic_status": "缓行",
            "traffic_description": "模拟数据",
        }

    def calculate_commute_time(self, origin: Dict, destination: Dict) -> Dict:
        if self.api_key and self.api_key != 'your_gaode_api_key_here':
            try:
                url = f"{self.base_url}/v3/direction/driving"
                params = {
                    "key": self.api_key,
                    "origin": f"{origin['lng']},{origin['lat']}",
                    "destination": f"{destination['lng']},{destination['lat']}",
                    "strategy": 0
                }
                
                response = requests.get(url, params=params, timeout=5)
                data = response.json()
                
                if data.get("status") == "1" and data.get("info") == "OK":
                    route = data.get("route", {})
                    paths = route.get("paths", [])
                    if paths:
                        duration = int(paths[0].get("duration", 0))
                        distance = int(paths[0].get("distance", 0))
                        return {
                            "status": "success",
                            "duration_minutes": round(duration / 60, 1),
                            "distance_km": round(distance / 1000, 1),
                        }
            except Exception as e:
                print(f"高德API调用失败（使用模拟数据）: {e}")
        
        dest_name = destination.get("name", "市中心")
        dest_name_map = {
            "市中心": "center",
            "望京": "望京",
            "西二旗": "西二旗",
            "国贸": "国贸",
            "中关村": "中关村"
        }
        adjusted_dest = dest_name_map.get(dest_name, dest_name)
        return self._get_mock_commute_data(origin.get("name", ""), adjusted_dest)

    def _get_mock_commute_data(self, area_name: str, dest_name: str = "市中心") -> Dict:
        base_data = {
            "回龙观": {"duration": 45, "distance": 18},
            "天通苑": {"duration": 50, "distance": 20},
            "西二旗": {"duration": 25, "distance": 10},
            "望京": {"duration": 30, "distance": 12},
            "中关村": {"duration": 20, "distance": 8},
            "国贸": {"duration": 15, "distance": 5},
            "亦庄": {"duration": 40, "distance": 16},
            "通州北苑": {"duration": 55, "distance": 22},
        }
        
        work_adjustments = {
            "望京": {
                "回龙观": {"duration": 25, "distance": 10},
                "天通苑": {"duration": 30, "distance": 12},
                "西二旗": {"duration": 20, "distance": 8},
                "望京": {"duration": 10, "distance": 2},
                "中关村": {"duration": 25, "distance": 10},
                "国贸": {"duration": 20, "distance": 8},
                "亦庄": {"duration": 35, "distance": 14},
                "通州北苑": {"duration": 40, "distance": 16},
            },
            "西二旗": {
                "回龙观": {"duration": 15, "distance": 6},
                "天通苑": {"duration": 20, "distance": 8},
                "西二旗": {"duration": 10, "distance": 2},
                "望京": {"duration": 20, "distance": 8},
                "中关村": {"duration": 10, "distance": 4},
                "国贸": {"duration": 35, "distance": 14},
                "亦庄": {"duration": 50, "distance": 20},
                "通州北苑": {"duration": 55, "distance": 22},
            },
            "国贸": {
                "回龙观": {"duration": 50, "distance": 20},
                "天通苑": {"duration": 55, "distance": 22},
                "西二旗": {"duration": 40, "distance": 16},
                "望京": {"duration": 20, "distance": 8},
                "中关村": {"duration": 35, "distance": 14},
                "国贸": {"duration": 10, "distance": 2},
                "亦庄": {"duration": 30, "distance": 12},
                "通州北苑": {"duration": 35, "distance": 14},
            },
            "中关村": {
                "回龙观": {"duration": 30, "distance": 12},
                "天通苑": {"duration": 35, "distance": 14},
                "西二旗": {"duration": 10, "distance": 4},
                "望京": {"duration": 25, "distance": 10},
                "中关村": {"duration": 10, "distance": 2},
                "国贸": {"duration": 30, "distance": 12},
                "亦庄": {"duration": 45, "distance": 18},
                "通州北苑": {"duration": 50, "distance": 20},
            },
        }
        
        if dest_name in work_adjustments and area_name in work_adjustments[dest_name]:
            data = work_adjustments[dest_name][area_name]
        else:
            data = base_data.get(area_name, {"duration": 35, "distance": 14})
        
        return {
            "status": "mock",
            "duration_minutes": data["duration"],
            "distance_km": data["distance"],
        }

    def get_areas_traffic_data(self, city: str = "beijing", work_location: str = "center") -> List[Dict]:
        areas_config = Config.AREAS.get(city, [])
        results = []
        
        dest = self.work_locations.get(work_location, self.work_locations["center"]).copy()
        dest["name"] = self.work_locations.get(work_location, self.work_locations["center"]).get("name", "市中心")
        
        for area in areas_config:
            area_name = area["name"]
            coord = self.area_coordinates.get(city, {}).get(area_name, {"lng": area["lng"], "lat": area["lat"]})
            
            origin = {"name": area_name, "lng": coord["lng"], "lat": coord["lat"]}
            commute_data = self.calculate_commute_time(origin, dest)
            traffic_data = self.get_traffic_status(Config.CITIES[city]["adcode"])
            
            results.append({
                "name": area_name,
                "district": area["district"],
                "lat": coord["lat"],
                "lng": coord["lng"],
                "x": coord.get("x", 50),
                "y": coord.get("y", 50),
                "commute_minutes": commute_data.get("duration_minutes", 30),
                "distance_km": commute_data.get("distance_km", 10),
                "traffic_index": traffic_data.get("traffic_index", 2.0),
                "traffic_status": traffic_data.get("traffic_status", "缓行"),
                "data_source": "gaode_api" if commute_data.get("status") == "success" else "mock_data",
            })
            
            time.sleep(0.1)
        
        return results


if __name__ == "__main__":
    spider = GaodeTrafficSpider()
    data = spider.get_areas_traffic_data("beijing", "wangjing")
    for item in data:
        print(f"{item['name']}: 通勤 {item['commute_minutes']} 分钟 ({item['data_source']})")
