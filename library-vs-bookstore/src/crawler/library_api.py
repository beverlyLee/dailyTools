import os
import requests
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()

MOCK_LIBRARY_DATA = [
    {"rank": 1, "title": "平凡的世界", "author": "路遥", "borrow_count": 12580, "category": "文学"},
    {"rank": 2, "title": "活着", "author": "余华", "borrow_count": 11230, "category": "文学"},
    {"rank": 3, "title": "三体", "author": "刘慈欣", "borrow_count": 9870, "category": "科幻"},
    {"rank": 4, "title": "红楼梦", "author": "曹雪芹", "borrow_count": 8950, "category": "古典文学"},
    {"rank": 5, "title": "百年孤独", "author": "马尔克斯", "borrow_count": 7620, "category": "文学"},
    {"rank": 6, "title": "围城", "author": "钱钟书", "borrow_count": 7120, "category": "文学"},
    {"rank": 7, "title": "万历十五年", "author": "黄仁宇", "borrow_count": 6890, "category": "历史"},
    {"rank": 8, "title": "追风筝的人", "author": "胡赛尼", "borrow_count": 6540, "category": "文学"},
    {"rank": 9, "title": "人类简史", "author": "赫拉利", "borrow_count": 6230, "category": "历史"},
    {"rank": 10, "title": "白鹿原", "author": "陈忠实", "borrow_count": 5980, "category": "文学"},
    {"rank": 11, "title": "小王子", "author": "圣埃克苏佩里", "borrow_count": 5750, "category": "童话"},
    {"rank": 12, "title": "明朝那些事儿", "author": "当年明月", "borrow_count": 5520, "category": "历史"},
    {"rank": 13, "title": "飘", "author": "米切尔", "borrow_count": 5340, "category": "文学"},
    {"rank": 14, "title": "嫌疑人X的献身", "author": "东野圭吾", "borrow_count": 5120, "category": "悬疑"},
    {"rank": 15, "title": "老人与海", "author": "海明威", "borrow_count": 4980, "category": "文学"},
]


class LibraryCrawler:
    def __init__(self):
        self.api_key = os.getenv("LIBRARY_API_KEY", "")
        self.base_url = "https://api.nlc.cn"

    def get_borrow_ranking(self, year: int = 2024, use_mock: bool = True) -> List[Dict]:
        if use_mock or not self.api_key:
            return MOCK_LIBRARY_DATA

        try:
            endpoint = f"{self.base_url}/v1/ranking/borrow"
            params = {"year": year, "apiKey": self.api_key}
            response = requests.get(endpoint, params=params, timeout=10)
            response.raise_for_status()
            return response.json().get("data", [])
        except Exception as e:
            print(f"获取图书馆榜单失败: {e}")
            return MOCK_LIBRARY_DATA


if __name__ == "__main__":
    crawler = LibraryCrawler()
    books = crawler.get_borrow_ranking()
    for book in books[:5]:
        print(f"{book['rank']}. {book['title']} - {book['author']}")
