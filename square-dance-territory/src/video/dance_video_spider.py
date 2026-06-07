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
            {"name": "人民广场", "offset_lat": 0.003, "offset_lng": 0.0025, "density": 30, "spread": 0.001},
            {"name": "世纪公园", "offset_lat": 0.005, "offset_lng": 0.0035, "density": 26, "spread": 0.001},
            {"name": "文化广场", "offset_lat": 0.004, "offset_lng": 0.0055, "density": 22, "spread": 0.001},
            {"name": "中山公园", "offset_lat": -0.006, "offset_lng": 0.004, "density": 18, "spread": 0.0015},
            {"name": "朝阳公园南门", "offset_lat": 0.009, "offset_lng": -0.004, "density": 15, "spread": 0.0015},
            {"name": "滨河公园", "offset_lat": -0.009, "offset_lng": -0.003, "density": 12, "spread": 0.0015},
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
                spread = hotspot.get("spread", 0.003)
                lat = base_lat + random.uniform(-spread, spread)
                lng = base_lng + random.uniform(-spread, spread)

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
        platform = self.config.get("platform", "douyin")

        if platform == "douyin":
            return self._search_douyin(keyword, city, max_count)
        elif platform == "kuaishou":
            return self._search_kuaishou(keyword, city, max_count)
        else:
            print(f"未知平台: {platform}，使用 mock 数据")
            return self._mock_search(keyword, city, max_count)

    def _search_douyin(self, keyword: str, city: str, max_count: int) -> List[DanceVideo]:
        cookie = self.config.get("douyin_cookie", "")
        if not cookie:
            print("抖音 Cookie 未配置，使用 mock 数据")
            return self._mock_search(keyword, city, max_count)

        try:
            import requests

            headers = {
                "User-Agent": random.choice(self.user_agents),
                "Cookie": cookie,
                "Referer": "https://www.douyin.com/",
            }

            params = {
                "keyword": keyword,
                "count": min(max_count, 50),
                "offset": 0,
            }

            videos = []
            seen_ids = set()

            for page in range(3):
                if len(videos) >= max_count:
                    break

                params["offset"] = page * 50
                try:
                    resp = requests.get(
                        "https://www.douyin.com/aweme/v1/web/search/item/",
                        headers=headers,
                        params=params,
                        timeout=10
                    )
                    if resp.status_code != 200:
                        break

                    data = resp.json()
                    for item in data.get("data", []):
                        aweme = item.get("aweme_info", {})
                        aweme_id = aweme.get("aweme_id", "")

                        if aweme_id in seen_ids:
                            continue
                        seen_ids.add(aweme_id)

                        poi_info = aweme.get("poi_info", {})
                        if not poi_info:
                            continue

                        video = DanceVideo(
                            video_id=aweme_id,
                            platform="抖音",
                            title=aweme.get("desc", "")[:50],
                            author=aweme.get("author", {}).get("nickname", ""),
                            poi_name=poi_info.get("poi_name", ""),
                            latitude=float(poi_info.get("lat", 0)) if poi_info.get("lat") else 0.0,
                            longitude=float(poi_info.get("lng", 0)) if poi_info.get("lng") else 0.0,
                            publish_time=time.strftime("%Y-%m-%d %H:%M:%S",
                                                       time.localtime(aweme.get("create_time", 0))),
                            likes=int(aweme.get("statistics", {}).get("digg_count", 0)),
                            comments=int(aweme.get("statistics", {}).get("comment_count", 0)),
                            shares=int(aweme.get("statistics", {}).get("share_count", 0)),
                        )

                        if video.latitude and video.longitude:
                            videos.append(video)

                    time.sleep(random.uniform(1, 2))

                except Exception as e:
                    print(f"抖音搜索第 {page+1} 页失败: {e}")
                    break

            if videos:
                self.video_list = videos
                return videos[:max_count]
            else:
                print("抖音搜索无结果，使用 mock 数据")
                return self._mock_search(keyword, city, max_count)

        except ImportError:
            print("requests 库未安装，使用 mock 数据")
            return self._mock_search(keyword, city, max_count)
        except Exception as e:
            print(f"抖音搜索失败: {e}，使用 mock 数据")
            return self._mock_search(keyword, city, max_count)

    def _search_kuaishou(self, keyword: str, city: str, max_count: int) -> List[DanceVideo]:
        cookie = self.config.get("kuaishou_cookie", "")
        if not cookie:
            print("快手 Cookie 未配置，使用 mock 数据")
            return self._mock_search(keyword, city, max_count)

        try:
            import requests

            headers = {
                "User-Agent": random.choice(self.user_agents),
                "Cookie": cookie,
                "Referer": "https://www.kuaishou.com/",
            }

            videos = []
            seen_ids = set()

            payload = {
                "keyword": keyword,
                "page": 1,
                "pageSize": min(max_count, 50),
            }

            try:
                resp = requests.post(
                    "https://www.kuaishou.com/rest/n/search/photoSearch",
                    headers=headers,
                    json=payload,
                    timeout=10
                )
                if resp.status_code == 200:
                    data = resp.json()
                    for item in data.get("data", {}).get("list", []):
                        photo_id = item.get("photoId", "")
                        if photo_id in seen_ids:
                            continue
                        seen_ids.add(photo_id)

                        poi_name = item.get("poiName", "")
                        if not poi_name:
                            continue

                        video = DanceVideo(
                            video_id=photo_id,
                            platform="快手",
                            title=item.get("caption", "")[:50],
                            author=item.get("userName", ""),
                            poi_name=poi_name,
                            latitude=float(item.get("latitude", 0)) if item.get("latitude") else 0.0,
                            longitude=float(item.get("longitude", 0)) if item.get("longitude") else 0.0,
                            publish_time=time.strftime("%Y-%m-%d %H:%M:%S",
                                                       time.localtime(item.get("timestamp", 0) / 1000)),
                            likes=int(item.get("likeCount", 0)),
                            comments=int(item.get("commentCount", 0)),
                            shares=int(item.get("shareCount", 0)),
                        )

                        if video.latitude and video.longitude:
                            videos.append(video)

            except Exception as e:
                print(f"快手搜索失败: {e}")

            if videos:
                self.video_list = videos
                return videos[:max_count]
            else:
                print("快手搜索无结果，使用 mock 数据")
                return self._mock_search(keyword, city, max_count)

        except ImportError:
            print("requests 库未安装，使用 mock 数据")
            return self._mock_search(keyword, city, max_count)
        except Exception as e:
            print(f"快手搜索失败: {e}，使用 mock 数据")
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
