import os
import json
import time
import random
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict


@dataclass
class BookstoreReview:
    bookstore_id: str
    bookstore_name: str
    address: str
    review_id: str
    user_name: str
    content: str
    rating: float
    review_time: str


@dataclass
class BookstoreInfo:
    bookstore_id: str
    name: str
    address: str
    avg_rating: float
    review_count: int
    category: str = ""
    reviews: List[BookstoreReview] = None

    def __post_init__(self):
        if self.reviews is None:
            self.reviews = []


SOLITUDE_KEYWORDS = [
    "一个人", "独自", "单独", "发呆", "安静", "独处", "放空",
    "消磨时间", "发呆一下午", "安静地", "静静的", "沉浸",
    "自己", "一人", "孤身", "独来独往", "清净", "静谧"
]

FAMILY_KEYWORDS = [
    "带孩子", "带娃", "亲子", "小朋友", "孩子", "宝宝",
    "儿童", "绘本", "陪孩子", "陪娃", "一家三口", "全家"
]

STUDENT_KEYWORDS = [
    "写作业", "复习", "备考", "考研", "学生", "自习",
    "学习", "看书", "读书", "写论文", "做作业", "功课"
]

INTERNET_FAMOUS_KEYWORDS = [
    "拍照", "打卡", "网红", "出片", "ins风", "文艺",
    "装修", "设计感", "颜值", "适合拍照", "咖啡店", "下午茶"
]


class BookstoreReviewSpider:
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.base_url = "https://www.dianping.com"
        self._browser = None
        self._page = None

    async def _init_browser(self):
        try:
            from playwright.async_api import async_playwright
            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch(
                headless=self.headless
            )
            self._page = await self._browser.new_page()
            await self._page.set_viewport_size({"width": 1280, "height": 800})
        except ImportError:
            print("Warning: Playwright not installed. Using mock data mode.")

    async def _close_browser(self):
        if self._browser:
            await self._browser.close()
            await self._playwright.stop()

    def _random_delay(self, min_sec: float = 1.0, max_sec: float = 3.0):
        time.sleep(random.uniform(min_sec, max_sec))

    async def search_bookstores(self, city: str, keyword: str = "书店") -> List[Dict]:
        if self._browser is None:
            print("Playwright not available, returning mock data")
            return self._generate_mock_bookstores(city)

        search_url = f"{self.base_url}/search/{city}/{keyword}"
        await self._page.goto(search_url)
        await self._page.wait_for_selector(".shop-list", timeout=10000)

        bookstores = []
        shop_items = await self._page.query_selector_all(".shop-list .shop")
        for item in shop_items[:10]:
            name_el = await item.query_selector(".shopname")
            addr_el = await item.query_selector(".addr")
            rating_el = await item.query_selector(".star_score")
            review_el = await item.query_selector(".review-num b")

            name = await name_el.inner_text() if name_el else ""
            address = await addr_el.inner_text() if addr_el else ""
            rating = float(await rating_el.get_attribute("title").split("星")[0]) if rating_el else 0.0
            review_count = int(await review_el.inner_text()) if review_el else 0

            bookstores.append({
                "name": name,
                "address": address,
                "rating": rating,
                "review_count": review_count
            })

        return bookstores

    async def crawl_reviews(self, bookstore_id: str, max_reviews: int = 50) -> List[BookstoreReview]:
        if self._browser is None:
            return self._generate_mock_reviews(bookstore_id, max_reviews)

        reviews = []
        page_num = 1

        while len(reviews) < max_reviews:
            review_url = f"{self.base_url}/shop/{bookstore_id}/review_all/p{page_num}"
            await self._page.goto(review_url)
            self._random_delay(2, 4)

            try:
                await self._page.wait_for_selector(".review-list", timeout=8000)
            except Exception:
                break

            review_items = await self._page.query_selector_all(".review-list .review-item")
            if not review_items:
                break

            for item in review_items:
                if len(reviews) >= max_reviews:
                    break

                user_el = await item.query_selector(".user-name")
                content_el = await item.query_selector(".review-words")
                rating_el = await item.query_selector(".star_score")
                time_el = await item.query_selector(".time")

                user_name = await user_el.inner_text() if user_el else ""
                content = await content_el.inner_text() if content_el else ""
                rating_str = await rating_el.get_attribute("title") if rating_el else "0星"
                rating = float(rating_str.replace("星", "").strip()) if rating_str else 0.0
                review_time = await time_el.inner_text() if time_el else ""

                review = BookstoreReview(
                    bookstore_id=bookstore_id,
                    bookstore_name="",
                    address="",
                    review_id=f"{bookstore_id}_{len(reviews)}",
                    user_name=user_name,
                    content=content.strip(),
                    rating=rating,
                    review_time=review_time
                )
                reviews.append(review)

            page_num += 1
            if page_num > 10:
                break

        return reviews

    def _generate_mock_bookstores(self, city: str) -> List[Dict]:
        mock_data = [
            {"name": "西西弗书店(万象城店)", "address": f"{city}市万象城购物中心B1层",
             "rating": 4.5, "review_count": 3200},
            {"name": "钟书阁(星光大道店)", "address": f"{city}市星光大道步行街",
             "rating": 4.8, "review_count": 5600},
            {"name": "言几又(来福士店)", "address": f"{city}市来福士广场3楼",
             "rating": 4.2, "review_count": 2100},
            {"name": "方所(太古里店)", "address": f"{city}市太古里负一楼",
             "rating": 4.7, "review_count": 8900},
            {"name": "先锋书店(大学城店)", "address": f"{city}市大学城文教区",
             "rating": 4.6, "review_count": 1500},
            {"name": "三联韬奋书店(高校店)", "address": f"{city}市大学路12号",
             "rating": 4.9, "review_count": 3400},
            {"name": "PAGE ONE(三里屯店)", "address": f"{city}市三里屯太古里",
             "rating": 4.4, "review_count": 4200},
            {"name": "猫的天空之城(平江路店)", "address": f"{city}市平江路历史街区",
             "rating": 4.3, "review_count": 2800},
            {"name": "大众书局(新街口店)", "address": f"{city}市新街口商圈",
             "rating": 4.1, "review_count": 1900},
            {"name": "十点书店(SM广场店)", "address": f"{city}市SM城市广场",
             "rating": 4.0, "review_count": 1200},
        ]
        return mock_data

    def _generate_mock_reviews(self, bookstore_id: str, count: int = 50) -> List[BookstoreReview]:
        mock_templates = {
            "deep_reading": [
                "一个人在这里安静地待了一下午，看看书发发呆，很享受这种独处的时光。环境很安静，适合深度阅读。",
                "独自来的，很喜欢这里的氛围，安静得能听见翻书的声音。可以沉浸在书里一整天。",
                "周末自己一个人过来，找个角落坐着看书，时间过得特别快。清净的好去处。",
                "最喜欢一个人来这里放空，书架之间慢慢逛，能淘到不少好书。静谧的空间让人放松。",
                "独自看书的好去处，人不多很安静，适合独处。点一杯咖啡可以坐一下午。",
            ],
            "family": [
                "带孩子过来的，亲子阅读区很不错，小朋友很喜欢。绘本种类也很多。",
                "周末全家一起来的，孩子在儿童区看书，大人在旁边也能看看自己的书。",
                "带娃打卡，里面有专门的儿童绘本区，小朋友玩得很开心。适合亲子活动。",
                "陪孩子来的，儿童书籍很丰富，还有阅读角。一家三口消磨了一上午。",
                "带宝宝过来读绘本，环境不错，孩子很喜欢。亲子阅读的好地方。",
            ],
            "student": [
                "学生党常来写作业，环境安静，适合学习。复习备考的好去处。",
                "在这里上自习，看书学习效率很高。写论文写作业都很合适。",
                "考研党表示很喜欢这里，安静有学习氛围。做功课复习都不错。",
                "放假就来这里看书学习，做做作业，比在家效率高多了。学生的福音。",
                "大学附近的书店，经常来自习。学习氛围很好，适合看书写作业。",
            ],
            "internet_famous": [
                "网红书店打卡，装修很有设计感，拍照特别出片。适合拍照发朋友圈。",
                "ins风满满的书店，颜值很高，适合拍照。文艺青年必打卡之地。",
                "慕名而来，环境很漂亮，很适合拍照下午茶。网红店名不虚传。",
                "装修很有特色，设计感十足，拍照很好看。咖啡店和书店的结合很棒。",
                "文艺青年聚集地，拍照很出片。适合和朋友一起来打卡拍照。",
            ],
            "mixed": [
                "环境还可以，书的种类比较多。有时候带孩子来看看绘本，自己也能翻翻书。",
                "挺不错的书店，学习的人不少，也有来拍照的。整体氛围还行。",
                "周末人有点多，有学生在看书学习，也有带孩子的。书的种类丰富。",
                "路过进来逛逛，书挺多的，适合随便看看。有时间可以多待一会儿。",
                "整体感觉不错，可以安静看书，也适合随便逛逛。选择很多样。",
            ]
        }

        bookstore_types = ["deep_reading", "family", "student", "internet_famous", "mixed"]
        bookstore_type = bookstore_types[hash(bookstore_id) % len(bookstore_types)]

        reviews = []
        templates = mock_templates[bookstore_type] + mock_templates["mixed"]

        for i in range(count):
            template = random.choice(templates)
            extra_phrases = [
                "书的种类很丰富。",
                "服务态度不错。",
                "环境很舒适。",
                "值得推荐。",
                "下次还会来。",
                "性价比还可以。",
                "位置很好找。",
                "交通便利。"
            ]
            content = template + " " + random.choice(extra_phrases)

            review = BookstoreReview(
                bookstore_id=bookstore_id,
                bookstore_name="",
                address="",
                review_id=f"{bookstore_id}_rev_{i}",
                user_name=f"用户_{random.randint(1000, 9999)}",
                content=content,
                rating=round(random.uniform(3.5, 5.0), 1),
                review_time=f"2024-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
            )
            reviews.append(review)

        return reviews

    async def crawl_bookstore_full(self, bookstore_id: str, bookstore_name: str,
                                    address: str, max_reviews: int = 50) -> BookstoreInfo:
        reviews = await self.crawl_reviews(bookstore_id, max_reviews)

        avg_rating = sum(r.rating for r in reviews) / len(reviews) if reviews else 0.0

        info = BookstoreInfo(
            bookstore_id=bookstore_id,
            name=bookstore_name,
            address=address,
            avg_rating=round(avg_rating, 2),
            review_count=len(reviews),
            reviews=reviews
        )
        return info

    def save_to_json(self, data: List[BookstoreInfo], filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        result = []
        for bookstore in data:
            bd = asdict(bookstore)
            bd["reviews"] = [asdict(r) for r in bookstore.reviews]
            result.append(bd)

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

    def load_from_json(self, filepath: str) -> List[BookstoreInfo]:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        result = []
        for bd in data:
            reviews = [BookstoreReview(**r) for r in bd.pop("reviews", [])]
            info = BookstoreInfo(**bd)
            info.reviews = reviews
            result.append(info)

        return result
