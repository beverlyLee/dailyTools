import asyncio
import random
import os
from datetime import datetime
from typing import List, Dict, Optional
from dotenv import load_dotenv
from src.models.schemas import Restaurant, OfficeBuilding

load_dotenv()


class DianpingSpider:
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.browser_path = os.getenv("PLAYWRIGHT_BROWSER_PATH")
        self.base_url = "https://www.dianping.com"
        self.user_agents = [
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        ]
        self._mock_data = self._init_mock_data()

    def _init_mock_data(self) -> Dict[str, List[Dict]]:
        return {
            "国贸大厦": [
                {
                    "id": "dp_001",
                    "name": "和府捞面(国贸店)",
                    "address": "朝阳区建国门外大街1号国贸商城B1层",
                    "longitude": 116.4612,
                    "latitude": 39.9087,
                    "avg_price": 45,
                    "review_count": 2890,
                    "has_delivery": True,
                    "rating": 4.5,
                    "cuisine": "小吃快餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_001",
                },
                {
                    "id": "dp_002",
                    "name": "吉野家(银泰店)",
                    "address": "朝阳区建国门外大街2号银泰中心B1",
                    "longitude": 116.4598,
                    "latitude": 39.9075,
                    "avg_price": 38,
                    "review_count": 1567,
                    "has_delivery": True,
                    "rating": 4.2,
                    "cuisine": "日式简餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_002",
                },
                {
                    "id": "dp_003",
                    "name": "西贝莜面村(CBD店)",
                    "address": "朝阳区光华路soho现代城1层",
                    "longitude": 116.4635,
                    "latitude": 39.9102,
                    "avg_price": 72,
                    "review_count": 3421,
                    "has_delivery": True,
                    "rating": 4.6,
                    "cuisine": "西北菜",
                    "dianping_url": "https://www.dianping.com/shop/dp_003",
                },
                {
                    "id": "dp_004",
                    "name": "兰州牛肉面(国贸店)",
                    "address": "朝阳区建国门外大街甲6号",
                    "longitude": 116.4589,
                    "latitude": 39.9095,
                    "avg_price": 32,
                    "review_count": 892,
                    "has_delivery": False,
                    "rating": 4.0,
                    "cuisine": "小吃快餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_004",
                },
                {
                    "id": "dp_005",
                    "name": "星巴克(国贸三期店)",
                    "address": "朝阳区建国门外大街1号国贸三期1层",
                    "longitude": 116.4621,
                    "latitude": 39.9098,
                    "avg_price": 42,
                    "review_count": 5678,
                    "has_delivery": True,
                    "rating": 4.4,
                    "cuisine": "咖啡简餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_005",
                },
                {
                    "id": "dp_006",
                    "name": "真功夫(永安里店)",
                    "address": "朝阳区建国门外大街永安里东街",
                    "longitude": 116.4572,
                    "latitude": 39.9082,
                    "avg_price": 35,
                    "review_count": 1234,
                    "has_delivery": True,
                    "rating": 4.1,
                    "cuisine": "中式简餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_006",
                },
                {
                    "id": "dp_007",
                    "name": "外婆家(大悦城店)",
                    "address": "朝阳区朝阳北路101号大悦城6层",
                    "longitude": 116.4658,
                    "latitude": 39.9125,
                    "avg_price": 68,
                    "review_count": 8923,
                    "has_delivery": True,
                    "rating": 4.7,
                    "cuisine": "江浙菜",
                    "dianping_url": "https://www.dianping.com/shop/dp_007",
                },
                {
                    "id": "dp_008",
                    "name": "赛百味(国贸店)",
                    "address": "朝阳区建国门外大街1号国贸商城B2层",
                    "longitude": 116.4605,
                    "latitude": 39.9078,
                    "avg_price": 30,
                    "review_count": 678,
                    "has_delivery": True,
                    "rating": 3.9,
                    "cuisine": "西式简餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_008",
                },
                {
                    "id": "dp_009",
                    "name": "鼎泰丰(国贸店)",
                    "address": "朝阳区建国门外大街1号国贸商城南区3层",
                    "longitude": 116.4628,
                    "latitude": 39.9085,
                    "avg_price": 128,
                    "review_count": 4567,
                    "has_delivery": False,
                    "rating": 4.8,
                    "cuisine": "中式正餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_009",
                },
                {
                    "id": "dp_010",
                    "name": "和合谷(银泰店)",
                    "address": "朝阳区建国门外大街2号银泰中心B2层",
                    "longitude": 116.4592,
                    "latitude": 39.9068,
                    "avg_price": 33,
                    "review_count": 987,
                    "has_delivery": True,
                    "rating": 4.0,
                    "cuisine": "中式简餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_010",
                },
                {
                    "id": "dp_011",
                    "name": "漫咖啡(光华路店)",
                    "address": "朝阳区光华路8号和乔大厦1层",
                    "longitude": 116.4645,
                    "latitude": 39.9112,
                    "avg_price": 48,
                    "review_count": 2345,
                    "has_delivery": True,
                    "rating": 4.3,
                    "cuisine": "咖啡简餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_011",
                },
                {
                    "id": "dp_012",
                    "name": "南城香(永安里店)",
                    "address": "朝阳区建国门外大街永安里西街",
                    "longitude": 116.4565,
                    "latitude": 39.9091,
                    "avg_price": 28,
                    "review_count": 1567,
                    "has_delivery": True,
                    "rating": 4.2,
                    "cuisine": "小吃快餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_012",
                },
                {
                    "id": "dp_013",
                    "name": "王品牛排(国贸店)",
                    "address": "朝阳区建国门外大街1号国贸商城北区4层",
                    "longitude": 116.4632,
                    "latitude": 39.9105,
                    "avg_price": 388,
                    "review_count": 1234,
                    "has_delivery": False,
                    "rating": 4.9,
                    "cuisine": "西式正餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_013",
                },
                {
                    "id": "dp_014",
                    "name": "杨国福麻辣烫(光华路店)",
                    "address": "朝阳区光华路甲8号",
                    "longitude": 116.4652,
                    "latitude": 39.9095,
                    "avg_price": 32,
                    "review_count": 2134,
                    "has_delivery": True,
                    "rating": 4.1,
                    "cuisine": "小吃快餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_014",
                },
                {
                    "id": "dp_015",
                    "name": "必胜客(国贸店)",
                    "address": "朝阳区建国门外大街1号国贸商城B1层",
                    "longitude": 116.4618,
                    "latitude": 39.9072,
                    "avg_price": 65,
                    "review_count": 3456,
                    "has_delivery": True,
                    "rating": 4.0,
                    "cuisine": "西式简餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_015",
                },
                {
                    "id": "dp_016",
                    "name": "海底捞火锅(国贸店)",
                    "address": "朝阳区建国门外大街1号国贸商城北区5层",
                    "longitude": 116.4638,
                    "latitude": 39.9115,
                    "avg_price": 158,
                    "review_count": 12456,
                    "has_delivery": True,
                    "rating": 4.9,
                    "cuisine": "火锅",
                    "dianping_url": "https://www.dianping.com/shop/dp_016",
                },
                {
                    "id": "dp_017",
                    "name": "喜茶(财富中心店)",
                    "address": "朝阳区光华路7号财富中心1层",
                    "longitude": 116.4628,
                    "latitude": 39.9128,
                    "avg_price": 28,
                    "review_count": 6789,
                    "has_delivery": True,
                    "rating": 4.6,
                    "cuisine": "茶饮",
                    "dianping_url": "https://www.dianping.com/shop/dp_017",
                },
                {
                    "id": "dp_018",
                    "name": "大董(国贸店)",
                    "address": "朝阳区建国门外大街1号国贸商城南区4层",
                    "longitude": 116.4635,
                    "latitude": 39.9078,
                    "avg_price": 598,
                    "review_count": 3456,
                    "has_delivery": False,
                    "rating": 4.9,
                    "cuisine": "中式正餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_018",
                },
                {
                    "id": "dp_019",
                    "name": "麦当劳(永安里店)",
                    "address": "朝阳区建国门外大街永安里路口",
                    "longitude": 116.4558,
                    "latitude": 39.9075,
                    "avg_price": 35,
                    "review_count": 8901,
                    "has_delivery": True,
                    "rating": 4.2,
                    "cuisine": "西式简餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_019",
                },
                {
                    "id": "dp_020",
                    "name": "杏花堂(CBD店)",
                    "address": "朝阳区光华路soho2期3层",
                    "longitude": 116.4668,
                    "latitude": 39.9108,
                    "avg_price": 188,
                    "review_count": 2345,
                    "has_delivery": True,
                    "rating": 4.7,
                    "cuisine": "中式正餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_020",
                },
                {
                    "id": "dp_021",
                    "name": "瑞幸咖啡(国贸二店)",
                    "address": "朝阳区建国门外大街1号国贸写字楼2座1层",
                    "longitude": 116.4595,
                    "latitude": 39.9098,
                    "avg_price": 22,
                    "review_count": 5678,
                    "has_delivery": True,
                    "rating": 4.3,
                    "cuisine": "咖啡简餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_021",
                },
                {
                    "id": "dp_022",
                    "name": "木屋烧烤(光华路店)",
                    "address": "朝阳区光华路甲10号",
                    "longitude": 116.4672,
                    "latitude": 39.9085,
                    "avg_price": 95,
                    "review_count": 4567,
                    "has_delivery": True,
                    "rating": 4.5,
                    "cuisine": "烧烤",
                    "dianping_url": "https://www.dianping.com/shop/dp_022",
                },
                {
                    "id": "dp_023",
                    "name": "沙县小吃(永安里店)",
                    "address": "朝阳区建国门外大街永安里中街",
                    "longitude": 116.4548,
                    "latitude": 39.9098,
                    "avg_price": 25,
                    "review_count": 1234,
                    "has_delivery": True,
                    "rating": 3.8,
                    "cuisine": "小吃快餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_023",
                },
                {
                    "id": "dp_024",
                    "name": "京季荣派官府菜(银泰店)",
                    "address": "朝阳区建国门外大街2号银泰中心3层",
                    "longitude": 116.4585,
                    "latitude": 39.9055,
                    "avg_price": 888,
                    "review_count": 890,
                    "has_delivery": False,
                    "rating": 4.9,
                    "cuisine": "中式正餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_024",
                },
                {
                    "id": "dp_025",
                    "name": "肯德基(国贸店)",
                    "address": "朝阳区建国门外大街1号国贸商城B1层",
                    "longitude": 116.4602,
                    "latitude": 39.9065,
                    "avg_price": 38,
                    "review_count": 7890,
                    "has_delivery": True,
                    "rating": 4.1,
                    "cuisine": "西式简餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_025",
                },
                {
                    "id": "dp_026",
                    "name": "南京大牌档(大悦城店)",
                    "address": "朝阳区朝阳北路101号大悦城7层",
                    "longitude": 116.4682,
                    "latitude": 39.9135,
                    "avg_price": 78,
                    "review_count": 15678,
                    "has_delivery": True,
                    "rating": 4.8,
                    "cuisine": "江浙菜",
                    "dianping_url": "https://www.dianping.com/shop/dp_026",
                },
                {
                    "id": "dp_027",
                    "name": "一点点(国贸店)",
                    "address": "朝阳区建国门外大街1号国贸商城B2层",
                    "longitude": 116.4615,
                    "latitude": 39.9062,
                    "avg_price": 18,
                    "review_count": 9876,
                    "has_delivery": True,
                    "rating": 4.4,
                    "cuisine": "茶饮",
                    "dianping_url": "https://www.dianping.com/shop/dp_027",
                },
                {
                    "id": "dp_028",
                    "name": "湘鄂情(CBD店)",
                    "address": "朝阳区光华路甲8号和乔大厦2层",
                    "longitude": 116.4655,
                    "latitude": 39.9122,
                    "avg_price": 168,
                    "review_count": 2345,
                    "has_delivery": True,
                    "rating": 4.5,
                    "cuisine": "中式正餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_028",
                },
                {
                    "id": "dp_029",
                    "name": "东方饺子王(永安里店)",
                    "address": "朝阳区建国门外大街永安里东街",
                    "longitude": 116.4568,
                    "latitude": 39.9062,
                    "avg_price": 42,
                    "review_count": 3456,
                    "has_delivery": True,
                    "rating": 4.2,
                    "cuisine": "小吃快餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_029",
                },
                {
                    "id": "dp_030",
                    "name": "OPERA BOMBANA(国贸店)",
                    "address": "朝阳区建国门外大街1号国贸商城南区3层",
                    "longitude": 116.4625,
                    "latitude": 39.9075,
                    "avg_price": 688,
                    "review_count": 1234,
                    "has_delivery": False,
                    "rating": 4.9,
                    "cuisine": "西式正餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_030",
                },
                {
                    "id": "dp_031",
                    "name": "真功夫(国贸二店)",
                    "address": "朝阳区建国门外大街1号国贸写字楼1座B1层",
                    "longitude": 116.4588,
                    "latitude": 39.9102,
                    "avg_price": 33,
                    "review_count": 2345,
                    "has_delivery": True,
                    "rating": 4.0,
                    "cuisine": "中式简餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_031",
                },
                {
                    "id": "dp_032",
                    "name": "绿茶餐厅(财富中心店)",
                    "address": "朝阳区光华路7号财富中心3层",
                    "longitude": 116.4632,
                    "latitude": 39.9135,
                    "avg_price": 72,
                    "review_count": 8901,
                    "has_delivery": True,
                    "rating": 4.6,
                    "cuisine": "江浙菜",
                    "dianping_url": "https://www.dianping.com/shop/dp_032",
                },
                {
                    "id": "dp_033",
                    "name": "DQ冰淇淋(银泰店)",
                    "address": "朝阳区建国门外大街2号银泰中心B1层",
                    "longitude": 116.4598,
                    "latitude": 39.9058,
                    "avg_price": 25,
                    "review_count": 4567,
                    "has_delivery": True,
                    "rating": 4.3,
                    "cuisine": "甜品",
                    "dianping_url": "https://www.dianping.com/shop/dp_033",
                },
                {
                    "id": "dp_034",
                    "name": "四川饭店(CBD店)",
                    "address": "朝阳区光华路soho现代城4层",
                    "longitude": 116.4648,
                    "latitude": 39.9118,
                    "avg_price": 128,
                    "review_count": 3456,
                    "has_delivery": True,
                    "rating": 4.4,
                    "cuisine": "中式正餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_034",
                },
                {
                    "id": "dp_035",
                    "name": "兰州拉面(光华路店)",
                    "address": "朝阳区光华路甲6号",
                    "longitude": 116.4662,
                    "latitude": 39.9092,
                    "avg_price": 28,
                    "review_count": 1567,
                    "has_delivery": True,
                    "rating": 3.9,
                    "cuisine": "小吃快餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_035",
                },
                {
                    "id": "dp_036",
                    "name": "北京亮(柏悦店)",
                    "address": "朝阳区建国门外大街2号柏悦酒店66层",
                    "longitude": 116.4582,
                    "latitude": 39.9048,
                    "avg_price": 1288,
                    "review_count": 2345,
                    "has_delivery": False,
                    "rating": 4.9,
                    "cuisine": "西式正餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_036",
                },
                {
                    "id": "dp_037",
                    "name": "和合谷(国贸店)",
                    "address": "朝阳区建国门外大街1号国贸商城B2层",
                    "longitude": 116.4608,
                    "latitude": 39.9068,
                    "avg_price": 32,
                    "review_count": 2890,
                    "has_delivery": True,
                    "rating": 4.1,
                    "cuisine": "中式简餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_037",
                },
                {
                    "id": "dp_038",
                    "name": "望湘园(大悦城店)",
                    "address": "朝阳区朝阳北路101号大悦城5层",
                    "longitude": 116.4675,
                    "latitude": 39.9142,
                    "avg_price": 85,
                    "review_count": 6789,
                    "has_delivery": True,
                    "rating": 4.5,
                    "cuisine": "中式正餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_038",
                },
                {
                    "id": "dp_039",
                    "name": "星巴克(财富中心店)",
                    "address": "朝阳区光华路7号财富中心1层",
                    "longitude": 116.4622,
                    "latitude": 39.9118,
                    "avg_price": 40,
                    "review_count": 4567,
                    "has_delivery": True,
                    "rating": 4.4,
                    "cuisine": "咖啡简餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_039",
                },
                {
                    "id": "dp_040",
                    "name": "吉野家(永安里店)",
                    "address": "朝阳区建国门外大街永安里西街",
                    "longitude": 116.4552,
                    "latitude": 39.9085,
                    "avg_price": 36,
                    "review_count": 3456,
                    "has_delivery": True,
                    "rating": 4.0,
                    "cuisine": "日式简餐",
                    "dianping_url": "https://www.dianping.com/shop/dp_040",
                },
            ]
        }

    async def _human_like_delay(self, min_sec: float = 1.0, max_sec: float = 3.0):
        await asyncio.sleep(random.uniform(min_sec, max_sec))

    async def _random_scroll(self, page):
        scroll_height = await page.evaluate("document.body.scrollHeight")
        for i in range(random.randint(2, 4)):
            await page.evaluate(
                f"window.scrollTo(0, {random.randint(100, scroll_height - 200)})"
            )
            await asyncio.sleep(random.uniform(0.3, 0.8))
        await page.evaluate("window.scrollTo(0, 0)")

    async def search_nearby_restaurants(
        self,
        building: OfficeBuilding,
        keywords: List[str] = None,
        radius: int = 1000,
        use_mock: bool = True,
    ) -> List[Restaurant]:
        if keywords is None:
            keywords = ["快餐", "简餐", "小吃"]

        if use_mock:
            return self._get_mock_restaurants(building)

        return await self._real_crawl(building, keywords, radius)

    def _get_mock_restaurants(self, building: OfficeBuilding) -> List[Restaurant]:
        mock_list = self._mock_data.get(building.name, self._mock_data["国贸大厦"])
        restaurants = []
        total = len(mock_list)
        out_of_range_count = max(1, int(total * 0.15))

        for i, item in enumerate(mock_list):
            if i >= total - out_of_range_count:
                delta_lng = random.uniform(0.012, 0.016) * random.choice([-1, 1])
                delta_lat = random.uniform(0.012, 0.016) * random.choice([-1, 1])
            else:
                base = 0.002
                delta_lng = random.choice([-1, 1]) * random.uniform(base, 0.009)
                delta_lat = random.choice([-1, 1]) * random.uniform(base, 0.009)
            restaurants.append(
                Restaurant(
                    id=item["id"],
                    name=item["name"],
                    address=item["address"],
                    longitude=building.longitude + delta_lng,
                    latitude=building.latitude + delta_lat,
                    avg_price=item["avg_price"],
                    review_count=item["review_count"],
                    has_delivery=item["has_delivery"],
                    rating=item["rating"],
                    cuisine=item["cuisine"],
                    dianping_url=item["dianping_url"],
                    crawl_time=datetime.now(),
                )
            )
        return restaurants

    async def _real_crawl(
        self, building: OfficeBuilding, keywords: List[str], radius: int
    ) -> List[Restaurant]:
        try:
            from playwright.async_api import async_playwright

            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=self.headless,
                    executable_path=self.browser_path if self.browser_path else None,
                    args=[
                        "--disable-blink-features=AutomationControlled",
                        "--no-sandbox",
                        "--disable-dev-shm-usage",
                    ],
                )

                context = await browser.new_context(
                    user_agent=random.choice(self.user_agents),
                    viewport={"width": 1920, "height": 1080},
                    locale="zh-CN",
                )

                page = await context.new_page()
                await page.add_init_script(
                    "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
                )

                restaurants = []
                for keyword in keywords:
                    try:
                        search_url = f"{self.base_url}/search/{building.address}/{keyword}"
                        await page.goto(search_url, wait_until="domcontentloaded")
                        await self._human_like_delay(2, 4)
                        await self._random_scroll(page)

                        shop_list = await page.query_selector_all("#shop-all-list li")
                        for shop in shop_list:
                            try:
                                name_elem = await shop.query_selector(".txt .tit a")
                                name = await name_elem.inner_text() if name_elem else ""
                                url = await name_elem.get_attribute("href") if name_elem else ""

                                addr_elem = await shop.query_selector(".txt .addr")
                                address = await addr_elem.inner_text() if addr_elem else ""

                                price_elem = await shop.query_selector(".txt .mean-price b")
                                price_text = await price_elem.inner_text() if price_elem else ""
                                avg_price = float(price_text.replace("¥", "")) if price_text else None

                                review_elem = await shop.query_selector(".txt .review-num b")
                                review_text = await review_elem.inner_text() if review_elem else ""
                                review_count = int(review_text) if review_text else None

                                has_delivery = await shop.query_selector(".tag-takeout") is not None

                                rating_elem = await shop.query_selector(".txt .comment-list b")
                                rating_text = await rating_elem.inner_text() if rating_elem else ""
                                rating = float(rating_text) if rating_text else None

                                if name:
                                    restaurants.append(
                                        Restaurant(
                                            id=f"dp_{abs(hash(name))}",
                                            name=name,
                                            address=address,
                                            longitude=building.longitude
                                            + random.uniform(-0.003, 0.003),
                                            latitude=building.latitude
                                            + random.uniform(-0.003, 0.003),
                                            avg_price=avg_price,
                                            review_count=review_count,
                                            has_delivery=has_delivery,
                                            rating=rating,
                                            cuisine=keyword,
                                            dianping_url=url if url.startswith("http") else f"{self.base_url}{url}",
                                            crawl_time=datetime.now(),
                                        )
                                    )
                            except Exception as e:
                                print(f"Error parsing shop: {e}")
                                continue

                    except Exception as e:
                        print(f"Error searching keyword {keyword}: {e}")
                        continue

                await browser.close()
                return restaurants

        except ImportError:
            print("Playwright not installed, returning mock data")
            return self._get_mock_restaurants(building)
        except Exception as e:
            print(f"Crawl error: {e}")
            return self._get_mock_restaurants(building)
