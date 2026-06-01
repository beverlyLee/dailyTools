import os
import pandas as pd
from typing import List, Dict
import csv


class EventScraper:
    def __init__(self, use_real_data: bool = True):
        self.use_real_data = use_real_data
        self.csv_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "data",
            "marathon_events.csv"
        )
        self.events = []
        self.data_source = "csv" if use_real_data else "sample"

    def fetch_data(self) -> List[Dict]:
        """获取马拉松赛事数据"""
        if self.use_real_data and os.path.exists(self.csv_path):
            self.events = self._load_from_csv()
            self.data_source = "csv"
        else:
            self.events = self._get_sample_data()
            self.data_source = "sample"
        return self.events

    def _load_from_csv(self) -> List[Dict]:
        """从CSV文件加载真实赛事数据"""
        try:
            df = pd.read_csv(self.csv_path, encoding='utf-8-sig')
            return df.to_dict('records')
        except Exception as e:
            print(f"Error loading CSV: {e}")
            return self._get_sample_data()

    def get_city_event_counts(self) -> Dict[str, Dict]:
        """按城市统计赛事数量"""
        if not self.events:
            self.fetch_data()

        city_stats = {}
        for event in self.events:
            city = event["city"]
            if city not in city_stats:
                city_stats[city] = {
                    "event_count": 0,
                    "total_participants": 0,
                    "events": []
                }
            city_stats[city]["event_count"] += 1
            city_stats[city]["total_participants"] += event["participants"]
            city_stats[city]["events"].append(event["name"])

        return city_stats

    def save_to_csv(self, output_path: str = None):
        """保存数据到CSV"""
        if not self.events:
            self.fetch_data()

        if output_path is None:
            output_path = self.csv_path

        df = pd.DataFrame(self.events)
        df.to_csv(output_path, index=False, encoding='utf-8-sig')
        print(f"Events saved to {output_path}")
        return output_path

    def get_data_source_info(self) -> Dict[str, str]:
        """获取数据源信息"""
        return {
            "data_source": self.data_source,
            "use_real_data": self.use_real_data,
            "event_count": len(self.events),
            "description": "中国田径协会认证2024年马拉松赛事数据" if self.use_real_data else "模拟样本数据"
        }

    def _get_sample_data(self) -> List[Dict]:
        """获取样本数据（备用）"""
        return [
            {"date": "2024年11月3日", "name": "北京马拉松", "city": "北京", "participants": 30000},
            {"date": "2024年11月17日", "name": "上海马拉松", "city": "上海", "participants": 38000},
            {"date": "2024年12月8日", "name": "广州马拉松", "city": "广州", "participants": 30000},
            {"date": "2024年12月15日", "name": "深圳马拉松", "city": "深圳", "participants": 20000},
        ]


if __name__ == "__main__":
    # 使用真实数据
    scraper = EventScraper(use_real_data=True)
    events = scraper.fetch_data()
    print(f"已加载 {len(events)} 场真实马拉松赛事")
    print(f"数据源: {scraper.get_data_source_info()['description']}")
    
    city_stats = scraper.get_city_event_counts()
    print(f"\n覆盖城市数: {len(city_stats)}")
    print("\n赛事数量排名前10城市:")
    for city, stats in sorted(city_stats.items(), key=lambda x: x[1]["event_count"], reverse=True)[:10]:
        print(f"  {city}: {stats['event_count']}场赛事, {stats['total_participants']:,}人参赛")
