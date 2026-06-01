import os
import pandas as pd
from typing import Dict, List


class GDPLoader:
    def __init__(self, use_real_data: bool = True):
        self.use_real_data = use_real_data
        self.csv_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "data",
            "city_gdp.csv"
        )
        self.gdp_data = {}
        self.data_source = "csv" if use_real_data else "sample"

    def load_gdp_data(self) -> Dict[str, Dict]:
        """加载城市GDP数据"""
        if self.use_real_data and os.path.exists(self.csv_path):
            self.gdp_data = self._load_from_csv()
            self.data_source = "csv"
        else:
            self.gdp_data = self._get_sample_data()
            self.data_source = "sample"
        return self.gdp_data

    def _load_from_csv(self) -> Dict[str, Dict]:
        """从CSV文件加载真实GDP数据"""
        try:
            df = pd.read_csv(self.csv_path, encoding='utf-8-sig')
            gdp_data = {}
            for _, row in df.iterrows():
                gdp_data[row['city']] = {
                    'gdp': float(row['gdp']),
                    'population': float(row['population']),
                    'gdp_per_capita': float(row.get('gdp_per_capita', 0))
                }
            return gdp_data
        except Exception as e:
            print(f"Error loading GDP CSV: {e}")
            return self._get_sample_data()

    def get_city_gdp(self, city: str) -> Dict:
        """获取指定城市的GDP数据"""
        if not self.gdp_data:
            self.load_gdp_data()
        return self.gdp_data.get(city, {})

    def get_top_cities_by_gdp(self, top_n: int = 10) -> List[Dict]:
        """获取GDP排名前N的城市"""
        if not self.gdp_data:
            self.load_gdp_data()

        sorted_cities = sorted(
            self.gdp_data.items(),
            key=lambda x: x[1]['gdp'],
            reverse=True
        )[:top_n]

        return [{"city": city, **stats} for city, stats in sorted_cities]

    def save_to_csv(self, output_path: str = None):
        """保存GDP数据到CSV"""
        if not self.gdp_data:
            self.load_gdp_data()

        if output_path is None:
            output_path = self.csv_path

        data = []
        for city, stats in self.gdp_data.items():
            data.append({
                'city': city,
                'gdp': stats['gdp'],
                'population': stats['population'],
                'gdp_per_capita': stats['gdp_per_capita']
            })

        df = pd.DataFrame(data)
        df.to_csv(output_path, index=False, encoding='utf-8-sig')
        print(f"GDP data saved to {output_path}")
        return output_path

    def get_data_source_info(self) -> Dict[str, str]:
        """获取数据源信息"""
        return {
            "data_source": self.data_source,
            "use_real_data": self.use_real_data,
            "city_count": len(self.gdp_data),
            "description": "2024年各地统计局公报GDP数据" if self.use_real_data else "模拟样本数据"
        }

    def _get_sample_data(self) -> Dict[str, Dict]:
        """获取样本数据（备用）"""
        return {
            "北京": {"gdp": 49843.1, "population": 2186, "gdp_per_capita": 227987},
            "上海": {"gdp": 53926.71, "population": 2487, "gdp_per_capita": 216834},
            "广州": {"gdp": 31032.5, "population": 1881, "gdp_per_capita": 164979},
            "深圳": {"gdp": 36801.87, "population": 1768, "gdp_per_capita": 208155},
            "杭州": {"gdp": 21860.00, "population": 1237, "gdp_per_capita": 176718},
            "成都": {"gdp": 23511.30, "population": 2119, "gdp_per_capita": 110955},
            "武汉": {"gdp": 21106.23, "population": 1365, "gdp_per_capita": 154624},
            "南京": {"gdp": 18866.44, "population": 942, "gdp_per_capita": 200281},
        }


if __name__ == "__main__":
    # 使用真实数据
    loader = GDPLoader(use_real_data=True)
    gdp_data = loader.load_gdp_data()
    print(f"已加载 {len(gdp_data)} 个城市的真实GDP数据")
    print(f"数据源: {loader.get_data_source_info()['description']}")

    print("\nGDP排名前10城市:")
    top_cities = loader.get_top_cities_by_gdp(10)
    for city in top_cities:
        print(f"  {city['city']}: GDP {city['gdp']:,.1f}亿元, 人口 {city['population']}万, 人均GDP {city['gdp_per_capita']:,.0f}元")
