import os
import json
import pandas as pd
import requests
from typing import List, Dict, Optional
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


class CityData(BaseModel):
    city_name: str
    province: str
    store_count: int
    population: float
    density_per_10k: float
    rank: int
    growth_rate: float


class IndexDownloader:
    def __init__(self):
        self.data_source_url = os.getenv("DATA_SOURCE_URL", "")
        self.gaode_api_key = os.getenv("GAODE_API_KEY", "")
        self.cache_dir = Path(os.getenv("CACHE_DIR", "data/raw"))
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def get_mock_data(self) -> pd.DataFrame:
        mock_data = [
            {"city_name": "东莞", "province": "广东省", "store_count": 4500, "population": 1053.0, "density_per_10k": 4.27, "growth_rate": 8.3, "adcode": "441900"},
            {"city_name": "上海", "province": "上海市", "store_count": 8500, "population": 2487.0, "density_per_10k": 3.42, "growth_rate": 5.2, "adcode": "310000"},
            {"city_name": "深圳", "province": "广东省", "store_count": 5800, "population": 1756.0, "density_per_10k": 3.30, "growth_rate": 7.5, "adcode": "440300"},
            {"city_name": "广州", "province": "广东省", "store_count": 6200, "population": 1881.0, "density_per_10k": 3.30, "growth_rate": 6.1, "adcode": "440100"},
            {"city_name": "杭州", "province": "浙江省", "store_count": 3200, "population": 1220.0, "density_per_10k": 2.62, "growth_rate": 7.8, "adcode": "330100"},
            {"city_name": "南京", "province": "江苏省", "store_count": 2400, "population": 942.0, "density_per_10k": 2.55, "growth_rate": 6.2, "adcode": "320100"},
            {"city_name": "拉萨", "province": "西藏自治区", "store_count": 220, "population": 86.8, "density_per_10k": 2.53, "growth_rate": 6.8, "adcode": "540100"},
            {"city_name": "厦门", "province": "福建省", "store_count": 1280, "population": 528.0, "density_per_10k": 2.42, "growth_rate": 7.0, "adcode": "350200"},
            {"city_name": "武汉", "province": "湖北省", "store_count": 2800, "population": 1365.0, "density_per_10k": 2.05, "growth_rate": 6.9, "adcode": "420100"},
            {"city_name": "长沙", "province": "湖南省", "store_count": 2000, "population": 1023.0, "density_per_10k": 1.95, "growth_rate": 7.3, "adcode": "430100"},
            {"city_name": "北京", "province": "北京市", "store_count": 4200, "population": 2189.0, "density_per_10k": 1.92, "growth_rate": 4.5, "adcode": "110000"},
            {"city_name": "成都", "province": "四川省", "store_count": 3800, "population": 2119.0, "density_per_10k": 1.79, "growth_rate": 9.2, "adcode": "510100"},
            {"city_name": "太原", "province": "山西省", "store_count": 920, "population": 539.0, "density_per_10k": 1.71, "growth_rate": 5.1, "adcode": "140100"},
            {"city_name": "西安", "province": "陕西省", "store_count": 2200, "population": 1295.0, "density_per_10k": 1.70, "growth_rate": 8.1, "adcode": "610100"},
            {"city_name": "海口", "province": "海南省", "store_count": 480, "population": 287.0, "density_per_10k": 1.67, "growth_rate": 5.3, "adcode": "460100"},
            {"city_name": "兰州", "province": "甘肃省", "store_count": 720, "population": 438.0, "density_per_10k": 1.64, "growth_rate": 4.5, "adcode": "620100"},
            {"city_name": "宁波", "province": "浙江省", "store_count": 1550, "population": 954.0, "density_per_10k": 1.62, "growth_rate": 5.6, "adcode": "330200"},
            {"city_name": "福州", "province": "福建省", "store_count": 1350, "population": 842.0, "density_per_10k": 1.60, "growth_rate": 6.5, "adcode": "350100"},
            {"city_name": "乌鲁木齐", "province": "新疆维吾尔自治区", "store_count": 650, "population": 405.0, "density_per_10k": 1.60, "growth_rate": 3.9, "adcode": "650100"},
            {"city_name": "沈阳", "province": "辽宁省", "store_count": 1450, "population": 911.0, "density_per_10k": 1.59, "growth_rate": 3.2, "adcode": "210100"},
            {"city_name": "青岛", "province": "山东省", "store_count": 1600, "population": 1025.0, "density_per_10k": 1.56, "growth_rate": 4.9, "adcode": "370200"},
            {"city_name": "西宁", "province": "青海省", "store_count": 380, "population": 247.0, "density_per_10k": 1.54, "growth_rate": 4.1, "adcode": "630100"},
            {"city_name": "呼和浩特", "province": "内蒙古自治区", "store_count": 520, "population": 349.0, "density_per_10k": 1.49, "growth_rate": 4.7, "adcode": "150100"},
            {"city_name": "合肥", "province": "安徽省", "store_count": 1400, "population": 946.0, "density_per_10k": 1.48, "growth_rate": 7.1, "adcode": "340100"},
            {"city_name": "银川", "province": "宁夏回族自治区", "store_count": 420, "population": 288.0, "density_per_10k": 1.46, "growth_rate": 4.6, "adcode": "640100"},
            {"city_name": "苏州", "province": "江苏省", "store_count": 1850, "population": 1274.0, "density_per_10k": 1.45, "growth_rate": 5.9, "adcode": "320500"},
            {"city_name": "昆明", "province": "云南省", "store_count": 1200, "population": 846.0, "density_per_10k": 1.42, "growth_rate": 5.8, "adcode": "530100"},
            {"city_name": "天津", "province": "天津市", "store_count": 1900, "population": 1373.0, "density_per_10k": 1.38, "growth_rate": 3.8, "adcode": "120000"},
            {"city_name": "南昌", "province": "江西省", "store_count": 880, "population": 643.0, "density_per_10k": 1.37, "growth_rate": 6.3, "adcode": "360100"},
            {"city_name": "郑州", "province": "河南省", "store_count": 1750, "population": 1274.0, "density_per_10k": 1.37, "growth_rate": 6.7, "adcode": "410100"},
            {"city_name": "贵阳", "province": "贵州省", "store_count": 820, "population": 610.0, "density_per_10k": 1.34, "growth_rate": 6.0, "adcode": "520100"},
            {"city_name": "济南", "province": "山东省", "store_count": 1100, "population": 933.0, "density_per_10k": 1.18, "growth_rate": 4.8, "adcode": "370100"},
            {"city_name": "长春", "province": "吉林省", "store_count": 1050, "population": 906.0, "density_per_10k": 1.16, "growth_rate": 3.5, "adcode": "220100"},
            {"city_name": "哈尔滨", "province": "黑龙江省", "store_count": 1150, "population": 988.0, "density_per_10k": 1.16, "growth_rate": 2.9, "adcode": "230100"},
            {"city_name": "南宁", "province": "广西壮族自治区", "store_count": 850, "population": 874.0, "density_per_10k": 0.97, "growth_rate": 5.7, "adcode": "450100"},
            {"city_name": "石家庄", "province": "河北省", "store_count": 980, "population": 1120.0, "density_per_10k": 0.88, "growth_rate": 4.2, "adcode": "130100"},
            {"city_name": "重庆", "province": "重庆市", "store_count": 2600, "population": 3212.0, "density_per_10k": 0.81, "growth_rate": 5.5, "adcode": "500000"},
        ]
        
        df = pd.DataFrame(mock_data)
        df = df.sort_values("density_per_10k", ascending=False).reset_index(drop=True)
        df["rank"] = df.index + 1
        return df

    def download_from_gaode(self, keywords: str = "中国") -> Dict:
        if not self.gaode_api_key:
            return {}
        
        url = "https://restapi.amap.com/v3/config/district"
        params = {
            "key": self.gaode_api_key,
            "keywords": keywords,
            "subdistrict": 2,
            "extensions": "base"
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"高德地图API请求失败: {e}")
        
        return {}

    def download_index(self, year: int = 2024) -> pd.DataFrame:
        cache_file = self.cache_dir / f"convenience_index_{year}.csv"
        
        if cache_file.exists():
            return pd.read_csv(cache_file)
        
        try:
            if self.data_source_url:
                url = f"{self.data_source_url.rstrip('/')}/convenience-index-{year}.csv"
                response = requests.get(url, timeout=30)
                if response.status_code == 200:
                    df = pd.read_csv(pd.compat.StringIO(response.text))
                    self.cache_data(df, year)
                    return df
        except Exception as e:
            print(f"下载数据失败: {e}，使用模拟数据")
        
        df = self.get_mock_data()
        self.cache_data(df, year)
        return df

    def cache_data(self, data: pd.DataFrame, year: int) -> None:
        cache_file = self.cache_dir / f"convenience_index_{year}.csv"
        data.to_csv(cache_file, index=False, encoding="utf-8-sig")

    def get_city_list(self, year: int = 2024) -> List[Dict]:
        df = self.download_index(year)
        return df.to_dict("records")

    def get_city_detail(self, city_name: str, year: int = 2024) -> Optional[Dict]:
        df = self.download_index(year)
        city_data = df[df["city_name"] == city_name]
        if not city_data.empty:
            return city_data.iloc[0].to_dict()
        return None

    def parse_csv(self, file_path: str) -> List[CityData]:
        df = pd.read_csv(file_path)
        city_data_list = []
        
        for _, row in df.iterrows():
            city_data = CityData(
                city_name=row.get("city_name", ""),
                province=row.get("province", ""),
                store_count=int(row.get("store_count", 0)),
                population=float(row.get("population", 0)),
                density_per_10k=float(row.get("density_per_10k", 0)),
                rank=int(row.get("rank", 0)),
                growth_rate=float(row.get("growth_rate", 0))
            )
            city_data_list.append(city_data)
        
        return city_data_list
