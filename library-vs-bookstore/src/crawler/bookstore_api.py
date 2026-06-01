import os
import requests
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()

MOCK_BOOKSTORE_DATA = [
    {"rank": 1, "title": "斗破苍穹", "author": "天蚕土豆", "sales_count": 58900, "category": "网络小说"},
    {"rank": 2, "title": "完美世界", "author": "辰东", "sales_count": 52300, "category": "网络小说"},
    {"rank": 3, "title": "三体", "author": "刘慈欣", "sales_count": 48700, "category": "科幻"},
    {"rank": 4, "title": "盗墓笔记", "author": "南派三叔", "sales_count": 45200, "category": "悬疑"},
    {"rank": 5, "title": "赘婿", "author": "愤怒的香蕉", "sales_count": 42100, "category": "网络小说"},
    {"rank": 6, "title": "活着", "author": "余华", "sales_count": 38900, "category": "文学"},
    {"rank": 7, "title": "大奉打更人", "author": "卖报小郎君", "sales_count": 36500, "category": "网络小说"},
    {"rank": 8, "title": "嫌疑人X的献身", "author": "东野圭吾", "sales_count": 34200, "category": "悬疑"},
    {"rank": 9, "title": "解忧杂货店", "author": "东野圭吾", "sales_count": 32100, "category": "文学"},
    {"rank": 10, "title": "鬼吹灯", "author": "天下霸唱", "sales_count": 29800, "category": "悬疑"},
    {"rank": 11, "title": "凡人修仙传", "author": "忘语", "sales_count": 28500, "category": "网络小说"},
    {"rank": 12, "title": "百年孤独", "author": "马尔克斯", "sales_count": 26200, "category": "文学"},
    {"rank": 13, "title": "剑来", "author": "烽火戏诸侯", "sales_count": 24800, "category": "网络小说"},
    {"rank": 14, "title": "明朝那些事儿", "author": "当年明月", "sales_count": 23500, "category": "历史"},
    {"rank": 15, "title": "平凡的世界", "author": "路遥", "sales_count": 21200, "category": "文学"},
]


class BookstoreCrawler:
    def __init__(self):
        self.api_key = os.getenv("BOOKSTORE_API_KEY", "")
        self.base_url = "https://api.jd.com"

    def get_sales_ranking(self, category: str = "all", use_mock: bool = True) -> List[Dict]:
        if use_mock or not self.api_key:
            return MOCK_BOOKSTORE_DATA

        try:
            endpoint = f"{self.base_url}/v1/book/ranking"
            params = {"category": category, "apiKey": self.api_key}
            response = requests.get(endpoint, params=params, timeout=10)
            response.raise_for_status()
            return response.json().get("data", [])
        except Exception as e:
            print(f"获取电商榜单失败: {e}")
            return MOCK_BOOKSTORE_DATA


if __name__ == "__main__":
    crawler = BookstoreCrawler()
    books = crawler.get_sales_ranking()
    for book in books[:5]:
        print(f"{book['rank']}. {book['title']} - {book['author']}")
