import json
import random
import time
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
import os


@dataclass
class DanceVideo:
    video_id: str
    platform: str
    title: str
    author: str
    poi_name: str
    latitude: float
    longitude: float
    publish_time: str
    likes: int
    comments: int
    shares: int


class DanceVideoSpider:
    def __init__(self, config: Optional[Dict] = None):
        self.config = config or {}
        self.user_agents = [
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
            "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        ]
        self.video_list: List[DanceVideo] = []

    def _generate_mock_id(self) -> str:
        return hashlib.md5(str(random.random()).encode()).hexdigest()[:16]

    def _random_time(self, days_back: int = 30) -> str:
        now = datetime.now()
        delta = timedelta(days=random.randint(0, days_back),
                          hours=random.randint(6, 22),
                          minutes=random.randint(0, 59))
        return (now - delta).strftime("%Y-%m-%d %H:%M:%S")

    def search_square_dance(self, keyword: str = "广场舞",
                            city: str = "北京",
                            max_count: int = 100,
                            use_mock: bool = True) -> List[DanceVideo]:
        if use_mock:
            return self._mock_search(keyword, city, max_count)

        return self._real_search(keyword, city, max_count)

    def _mock_search(self, keyword: str, city: str, max_count: int) -> List[DanceVideo]:
        city_centers = {
            "北京": (39.9042, 116.4074),
            "上海": (31.2304, 121.4737),
            "广州": (23.1291, 113.2644),
            "深圳": (22.5431, 114.0579),
            "成都": (30.5728, 104.0668),
        }

        center_lat, center_lng = city_centers.get(city, (39.9042, 116.4074))

        hotspots = [
            {"name": "人民广场", "offset_lat": 0.003, "offset_lng": 0.002, "density": 25},
            {"name": "文化广场", "offset_lat": 0.004, "offset_lng": 0.005, "density": 22},
            {"name": "中山公园", "offset_lat": -0.005, "offset_lng": 0.003, "density": 20},
            {"name": "朝阳公园南门", "offset_lat": 0.008, "offset_lng": -0.003, "density": 18},
            {"name": "世纪公园", "offset_lat": -0.003, "offset_lng": -0.006, "density": 15},
            {"name": "滨河公园", "offset_lat": -0.008, "offset_lng": -0.002, "density": 12},
        ]

        platforms = ["抖音", "快手"]
        title_templates = [
            "{}广场舞队精彩表演",
            "早晨的{}广场舞真热闹",
            "{}阿姨们的广场舞太整齐了",
            "夜幕下的{}广场舞",
            "{}广场舞比赛现场",
            "跟着节奏跳起来！{}广场舞",
            "全民健身{}广场舞",
        ]

        authors = [
            "快乐舞者", "夕阳红舞队", "健身达人李阿姨", "广场舞者小王",
            "阳光舞蹈团", "舞动人生", "开心每一天", "青春舞队",
        ]

        videos = []
        total_count = 0

        for hotspot in hotspots:
            count = min(hotspot["density"], max_count - total_count)
            if count <= 0:
                break

            base_lat = center_lat + hotspot["offset_lat"]
            base_lng = center_lng + hotspot["offset_lng"]

            for i in range(count):
                lat = base_lat + random.uniform(-0.003, 0.003)
                lng = base_lng + random.uniform(-0.003, 0.003)

                video = DanceVideo(
                    video_id=self._generate_mock_id(),
                    platform=random.choice(platforms),
                    title=random.choice(title_templates).format(hotspot["name"]),
                    author=random.choice(authors),
                    poi_name=hotspot["name"],
                    latitude=round(lat, 6),
                    longitude=round(lng, 6),
                    publish_time=self._random_time(),
                    likes=random.randint(10, 5000),
                    comments=random.randint(0, 300),
                    shares=random.randint(0, 100),
                )
                videos.append(video)
                total_count += 1

        self.video_list = videos
        return videos

    def _real_search(self, keyword: str, city: str, max_count: int) -> List[DanceVideo]:
        print("注意：真实爬虫需要配置短视频平台的API接口和反爬策略")
        print("当前使用 mock 数据模式")
        return self._mock_search(keyword, city, max_count)

    def filter_with_poi(self, videos: Optional[List[DanceVideo]] = None) -> List[DanceVideo]:
        target = videos if videos is not None else self.video_list
        return [v for v in target if v.poi_name and v.latitude and v.longitude]

    def save_to_file(self, filepath: str, videos: Optional[List[DanceVideo]] = None):
        target = videos if videos is not None else self.video_list
        data = [asdict(v) for v in target]
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"已保存 {len(data)} 条视频数据到 {filepath}")

    def load_from_file(self, filepath: str) -> List[DanceVideo]:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.video_list = [DanceVideo(**item) for item in data]
        return self.video_list


if __name__ == "__main__":
    spider = DanceVideoSpider()
    videos = spider.search_square_dance(city="北京", max_count=100)
    print(f"共爬取到 {len(videos)} 条广场舞视频")
    for v in videos[:5]:
        print(f"  [{v.platform}] {v.title} @ {v.poi_name} ({v.latitude}, {v.longitude})")

    spider.save_to_file("data/square_dance_videos.json")
