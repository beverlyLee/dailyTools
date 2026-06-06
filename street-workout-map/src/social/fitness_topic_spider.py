import json
import os
import re
import random
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")

SEARCH_KEYWORDS = ["街头健身", "公园锻炼", "户外健身", "小区健身器材", "街健"]

MOCK_POSTS = [
    {
        "id": "xhs_001",
        "title": "世纪公园晨练打卡",
        "content": "每天早上六点半，世纪公园的单杠区总是挤满了健身达人！今天终于解锁了引体向上10个！💪",
        "location_name": "世纪公园",
        "latitude": 31.2253,
        "longitude": 121.5564,
        "images": [
            "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=fitness%20man%20doing%20pull%20ups%20in%20park%20morning%20sunlight&image_size=square_hd",
            "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=outdoor%20gym%20equipment%20in%20chinese%20park&image_size=square_hd"
        ],
        "likes": 1256,
        "author": "健身小王",
        "publish_time": "2026-05-28T06:30:00"
    },
    {
        "id": "xhs_002",
        "title": "人民广场街健圣地",
        "content": "人民广场的健身角真的是卧虎藏龙，大爷们的单杠大回环看呆了！",
        "location_name": "人民广场",
        "latitude": 31.2304,
        "longitude": 121.4737,
        "images": [
            "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=elderly%20man%20doing%20gymnastics%20on%20horizontal%20bar%20public%20square&image_size=square_hd"
        ],
        "likes": 3420,
        "author": "街健爱好者",
        "publish_time": "2026-05-25T15:20:00"
    },
    {
        "id": "xhs_003",
        "title": "徐汇滨江跑步+器械",
        "content": "徐汇滨江的健身步道太棒了，跑完步还能用公共器械拉伸一下～",
        "location_name": "徐汇滨江公园",
        "latitude": 31.1802,
        "longitude": 121.4660,
        "images": [
            "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=riverside%20fitness%20trail%20shanghai%20morning%20joggers&image_size=square_hd",
            "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=outdoor%20fitness%20equipment%20riverside%20park&image_size=square_hd"
        ],
        "likes": 890,
        "author": "跑步的鱼",
        "publish_time": "2026-06-01T07:15:00"
    },
    {
        "id": "xhs_004",
        "title": "中山公园双杠区",
        "content": "中山公园的双杠区每天都有训练，很多街健大神在这里练俄式挺身。",
        "location_name": "中山公园",
        "latitude": 31.2165,
        "longitude": 121.4173,
        "images": [
            "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=man%20doing%20planche%20on%20parallel%20bars%20park&image_size=square_hd"
        ],
        "likes": 2100,
        "author": "街健阿凯",
        "publish_time": "2026-05-20T16:45:00"
    },
    {
        "id": "xhs_005",
        "title": "老旧小区的健身器材",
        "content": "我们小区的健身器材都快锈了，没人维护，好羡慕那些新小区啊…",
        "location_name": "长风二村小区",
        "latitude": 31.2189,
        "longitude": 121.4056,
        "images": [
            "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=old%20rusty%20outdoor%20fitness%20equipment%20old%20residential%20area&image_size=square_hd"
        ],
        "likes": 156,
        "author": "健身吐槽君",
        "publish_time": "2026-05-15T18:30:00"
    },
    {
        "id": "xhs_006",
        "title": "世纪公园晨跑打卡",
        "content": "世纪公园3公里跑步路线，沿途有好几个健身器材点，跑完可以练练上肢。",
        "location_name": "世纪公园",
        "latitude": 31.2253,
        "longitude": 121.5564,
        "images": [
            "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=morning%20jogging%20path%20park%20china&image_size=square_hd"
        ],
        "likes": 678,
        "author": "晨跑达人",
        "publish_time": "2026-06-02T06:00:00"
    },
    {
        "id": "xhs_007",
        "title": "闸北公园的单杠",
        "content": "闸北公园的单杠高度正合适，今天练了背，感觉泵感十足！",
        "location_name": "闸北公园",
        "latitude": 31.2638,
        "longitude": 121.4690,
        "images": [
            "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=outdoor%20pull%20up%20bar%20chinese%20park%20muscular%20man&image_size=square_hd"
        ],
        "likes": 543,
        "author": "背部训练日",
        "publish_time": "2026-05-22T17:00:00"
    },
    {
        "id": "xhs_008",
        "title": "鲁迅公园晨练",
        "content": "鲁迅公园的晨练氛围太好了，有打太极的，有练单杠的，还有跑步的！",
        "location_name": "鲁迅公园",
        "latitude": 31.2639,
        "longitude": 121.4810,
        "images": [
            "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=morning%20exercise%20park%20china%20tai%20chi%20fitness&image_size=square_hd"
        ],
        "likes": 1890,
        "author": "健康生活家",
        "publish_time": "2026-05-30T07:30:00"
    },
    {
        "id": "xhs_009",
        "title": "小区健身点打卡",
        "content": "下班回家先在小区健身点练20分钟，虽然器械不多但方便。",
        "location_name": "曹杨新村",
        "latitude": 31.2440,
        "longitude": 121.4120,
        "images": [
            "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=small%20community%20fitness%20area%20residential%20china&image_size=square_hd"
        ],
        "likes": 234,
        "author": "上班族健身",
        "publish_time": "2026-06-03T19:15:00"
    },
    {
        "id": "xhs_010",
        "title": "世纪公园街头健身聚会",
        "content": "周末世纪公园的街健聚会太热闹了，各路大神都来了，学到很多！",
        "location_name": "世纪公园",
        "latitude": 31.2253,
        "longitude": 121.5564,
        "images": [
            "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=group%20of%20street%20workout%20athletes%20gathering%20park&image_size=square_hd",
            "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=outdoor%20calisthenics%20competition%20park%20china&image_size=square_hd"
        ],
        "likes": 4560,
        "author": "街头健身联盟",
        "publish_time": "2026-05-27T14:00:00"
    },
    {
        "id": "xhs_011",
        "title": "和平公园的健身角",
        "content": "和平公园的健身角器械挺全的，就是人有点多，高峰期要等位置。",
        "location_name": "和平公园",
        "latitude": 31.2520,
        "longitude": 121.5020,
        "images": [
            "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=crowded%20outdoor%20gym%20park%20china%20afternoon&image_size=square_hd"
        ],
        "likes": 789,
        "author": "健身打卡",
        "publish_time": "2026-05-18T16:30:00"
    },
    {
        "id": "xhs_012",
        "title": "老小区健身器材损坏",
        "content": "我们小区的健身器材坏了好几个都没人修，太空漫步机都晃悠了，安全隐患啊。",
        "location_name": "宜川五村",
        "latitude": 31.2580,
        "longitude": 121.4480,
        "images": [
            "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=broken%20old%20outdoor%20fitness%20equipment%20neglected&image_size=square_hd"
        ],
        "likes": 89,
        "author": "社区观察员",
        "publish_time": "2026-05-10T10:00:00"
    },
    {
        "id": "xhs_013",
        "title": "复兴公园晨练",
        "content": "复兴公园的法式风格配上晨练的人们，别有一番风味。单杠区有几个大佬。",
        "location_name": "复兴公园",
        "latitude": 31.2100,
        "longitude": 121.4680,
        "images": [
            "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=french%20style%20park%20shanghai%20morning%20exercise&image_size=square_hd"
        ],
        "likes": 1234,
        "author": "城市漫步",
        "publish_time": "2026-06-04T07:00:00"
    },
    {
        "id": "xhs_014",
        "title": "延中绿地健身区",
        "content": "市中心的延中绿地居然有这么棒的健身区，上班族午休可以来练练！",
        "location_name": "延中绿地",
        "latitude": 31.2280,
        "longitude": 121.4650,
        "images": [
            "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20urban%20green%20space%20fitness%20area%20office%20workers&image_size=square_hd"
        ],
        "likes": 567,
        "author": "午休健身党",
        "publish_time": "2026-05-29T12:30:00"
    },
    {
        "id": "xhs_015",
        "title": "公园锻炼的大爷们",
        "content": "人民广场的健身大爷真的太强了，80岁还能做引体向上，我一个年轻人自愧不如！",
        "location_name": "人民广场",
        "latitude": 31.2304,
        "longitude": 121.4737,
        "images": [
            "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=strong%20elderly%20chinese%20man%20pull%20up%20park%20impressive&image_size=square_hd"
        ],
        "likes": 5670,
        "author": "青年健身记",
        "publish_time": "2026-06-01T09:00:00"
    }
]


class FitnessTopicSpider:
    def __init__(self, city="上海", use_mock=True):
        self.city = city
        self.use_mock = use_mock
        self.posts = []

    def crawl(self):
        if self.use_mock:
            self.posts = self._load_mock_data()
        else:
            self.posts = self._real_crawl()
        return self.posts

    def _load_mock_data(self):
        mock_file = os.path.join(DATA_DIR, "mock_fitness_posts.json")
        if os.path.exists(mock_file):
            with open(mock_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return MOCK_POSTS

    def _real_crawl(self):
        print("提示：实际爬虫需要配置小红书API或使用Playwright模拟登录")
        print("当前使用内置Mock数据进行演示")
        return MOCK_POSTS

    def extract_locations(self):
        locations = []
        for post in self.posts:
            if post.get("latitude") and post.get("longitude"):
                location = {
                    "name": post.get("location_name", ""),
                    "latitude": post["latitude"],
                    "longitude": post["longitude"],
                    "post_id": post["id"],
                    "post_title": post.get("title", ""),
                    "post_content": post.get("content", ""),
                    "images": post.get("images", []),
                    "likes": post.get("likes", 0),
                    "author": post.get("author", ""),
                    "publish_time": post.get("publish_time", ""),
                    "source": "xiaohongshu"
                }
                locations.append(location)
        return locations

    def save_results(self, filename="fitness_posts.json"):
        filepath = os.path.join(DATA_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(self.posts, f, ensure_ascii=False, indent=2)
        print(f"健身话题数据已保存至: {filepath}")
        return filepath


def main():
    spider = FitnessTopicSpider(city="上海", use_mock=True)
    posts = spider.crawl()
    print(f"共抓取 {len(posts)} 条健身话题帖子")
    
    locations = spider.extract_locations()
    print(f"共提取 {len(locations)} 个带位置信息的帖子")
    
    for loc in locations[:5]:
        print(f"  - {loc['name']}: ({loc['latitude']}, {loc['longitude']})")
    
    spider.save_results()


if __name__ == "__main__":
    main()
