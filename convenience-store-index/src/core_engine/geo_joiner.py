import json
import os
import requests
from typing import Dict, List
from pathlib import Path
import pandas as pd
from dotenv import load_dotenv

load_dotenv()


class GeoJoiner:
    def __init__(self):
        self.geojson_path = Path(os.getenv("GEOJSON_PATH", "data/geojson/china-provinces.json"))
        self.gaode_api_key = os.getenv("GAODE_API_KEY", "")
        self.geojson_path.parent.mkdir(parents=True, exist_ok=True)

    def get_province_mapping(self) -> Dict[str, str]:
        return {
            "北京市": "北京", "天津市": "天津", "上海市": "上海", "重庆市": "重庆",
            "河北省": "河北", "山西省": "山西", "辽宁省": "辽宁", "吉林省": "吉林",
            "黑龙江省": "黑龙江", "江苏省": "江苏", "浙江省": "浙江", "安徽省": "安徽",
            "福建省": "福建", "江西省": "江西", "山东省": "山东", "河南省": "河南",
            "湖北省": "湖北", "湖南省": "湖南", "广东省": "广东", "海南省": "海南",
            "四川省": "四川", "贵州省": "贵州", "云南省": "云南", "陕西省": "陕西",
            "甘肃省": "甘肃", "青海省": "青海", "台湾省": "台湾", "内蒙古自治区": "内蒙古",
            "广西壮族自治区": "广西", "西藏自治区": "西藏", "宁夏回族自治区": "宁夏",
            "新疆维吾尔自治区": "新疆", "香港特别行政区": "香港", "澳门特别行政区": "澳门",
        }

    def fetch_gaode_district(self, keywords: str = "中国", subdistrict: int = 1) -> Dict:
        if not self.gaode_api_key:
            return {}
        
        url = "https://restapi.amap.com/v3/config/district"
        params = {
            "key": self.gaode_api_key,
            "keywords": keywords,
            "subdistrict": subdistrict,
            "extensions": "base"
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"高德地图API请求失败: {e}")
        
        return {}

    def generate_china_provinces_geojson(self) -> Dict:
        province_centers = {
            "黑龙江": [126.53, 45.80], "吉林": [125.32, 43.90], "辽宁": [122.60, 41.29],
            "内蒙古": [111.67, 40.81], "北京": [116.40, 39.90], "天津": [117.20, 39.13],
            "河北": [114.51, 38.04], "山西": [112.55, 37.87], "陕西": [108.95, 34.27],
            "宁夏": [106.27, 37.47], "甘肃": [103.83, 36.06], "青海": [101.78, 36.62],
            "新疆": [87.62, 43.83], "西藏": [91.11, 29.97], "四川": [104.07, 30.67],
            "重庆": [106.55, 29.56], "贵州": [106.63, 26.65], "云南": [102.72, 25.04],
            "广西": [108.37, 22.82], "广东": [113.27, 23.13], "海南": [110.35, 20.02],
            "香港": [114.17, 22.32], "澳门": [113.55, 22.19], "湖南": [112.94, 28.23],
            "湖北": [114.31, 30.59], "河南": [113.66, 34.76], "安徽": [117.28, 31.86],
            "江苏": [118.78, 32.04], "浙江": [120.15, 30.28], "福建": [119.31, 26.07],
            "台湾": [121.51, 25.04], "江西": [115.90, 28.68], "山东": [117.01, 36.67],
        }

        features = []
        province_mapping = self.get_province_mapping()
        
        for province_name, coords in province_centers.items():
            feature = {
                "type": "Feature",
                "properties": {
                    "name": province_name,
                    "full_name": next((k for k, v in province_mapping.items() if v == province_name), province_name),
                    "center": coords
                },
                "geometry": self._generate_polygon(coords[0], coords[1], 2.5)
            }
            features.append(feature)
        
        geojson = {
            "type": "FeatureCollection",
            "features": features
        }
        
        return geojson

    def _generate_polygon(self, center_lon: float, center_lat: float, size: float) -> Dict:
        import math
        coordinates = []
        points = 16
        
        for i in range(points):
            angle = (i / points) * 2 * math.pi
            radius = size * (0.85 + 0.3 * math.sin(3 * angle) * math.cos(2 * angle))
            lon = center_lon + radius * math.cos(angle)
            lat = center_lat + radius * math.sin(angle)
            coordinates.append([lon, lat])
        
        coordinates.append(coordinates[0])
        
        return {
            "type": "Polygon",
            "coordinates": [coordinates]
        }

    def load_geojson(self) -> Dict:
        if self.geojson_path.exists():
            with open(self.geojson_path, "r", encoding="utf-8") as f:
                return json.load(f)
        
        geojson = self.generate_china_provinces_geojson()
        self.save_geojson(geojson)
        return geojson

    def save_geojson(self, geojson: Dict) -> None:
        with open(self.geojson_path, "w", encoding="utf-8") as f:
            json.dump(geojson, f, ensure_ascii=False, indent=2)

    def aggregate_by_province(self, city_data: pd.DataFrame) -> pd.DataFrame:
        province_mapping = self.get_province_mapping()
        
        city_data["province_short"] = city_data["province"].map(
            lambda x: province_mapping.get(x, x.replace("省", "").replace("市", ""))
        )
        
        province_agg = city_data.groupby("province_short").agg({
            "store_count": "sum",
            "population": "sum",
            "density_per_10k": "mean",
            "growth_rate": "mean"
        }).reset_index()
        
        province_agg["city_count"] = city_data.groupby("province_short").size().values
        
        return province_agg

    def calculate_color_scale(self, data: pd.DataFrame) -> Dict[str, float]:
        densities = data["density_per_10k"].tolist()
        densities_sorted = sorted(densities)
        
        return {
            "min": min(densities),
            "q1": densities_sorted[int(len(densities_sorted) * 0.25)],
            "median": densities_sorted[int(len(densities_sorted) * 0.5)],
            "q3": densities_sorted[int(len(densities_sorted) * 0.75)],
            "max": max(densities)
        }

    def join_data(self, geojson: Dict, city_data: pd.DataFrame) -> Dict:
        province_agg = self.aggregate_by_province(city_data)
        province_dict = province_agg.set_index("province_short").to_dict("index")
        
        color_scale = self.calculate_color_scale(province_agg)
        
        for feature in geojson["features"]:
            province_name = feature["properties"]["name"]
            if province_name in province_dict:
                data = province_dict[province_name]
                feature["properties"].update({
                    "store_count": int(data["store_count"]),
                    "population": round(data["population"], 2),
                    "density_per_10k": round(data["density_per_10k"], 2),
                    "growth_rate": round(data["growth_rate"], 2),
                    "city_count": int(data["city_count"]),
                    "has_data": True
                })
            else:
                feature["properties"].update({
                    "store_count": 0,
                    "population": 0,
                    "density_per_10k": 0,
                    "growth_rate": 0,
                    "city_count": 0,
                    "has_data": False
                })
        
        return {
            "geojson": geojson,
            "color_scale": color_scale
        }

    def get_joined_data(self, city_data: pd.DataFrame) -> Dict:
        geojson = self.load_geojson()
        return self.join_data(geojson, city_data)
