import asyncio
import json
import os
import re
from datetime import datetime
from playwright.async_api import async_playwright

BASE_URL = "https://www.dianping.com"
SEARCH_KEYWORDS = ["菜市场", "生鲜超市"]
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")


class MarketSpider:
    def __init__(self, city="上海", headless=True):
        self.city = city
        self.headless = headless
        self.browser = None
        self.page = None
        self.results = []

    async def start(self):
        async with async_playwright() as p:
            self.browser = await p.chromium.launch(headless=self.headless)
            self.page = await self.browser.new_page()
            await self.page.set_viewport_size({"width": 1280, "height": 800})

            for keyword in SEARCH_KEYWORDS:
                await self._search_and_parse(keyword)

            await self.browser.close()
            return self.results

    async def _search_and_parse(self, keyword):
        search_url = f"{BASE_URL}/search/{keyword}"
        await self.page.goto(search_url, wait_until="domcontentloaded")
        await self.page.wait_for_timeout(2000)

        shop_items = await self.page.query_selector_all("#shop-all-list li")
        for item in shop_items[:20]:
            try:
                market = await self._parse_shop_item(item)
                if market:
                    market["category"] = keyword
                    market["city"] = self.city
                    market["crawl_time"] = datetime.now().isoformat()
                    self.results.append(market)
            except Exception as e:
                print(f"解析店铺失败: {e}")

    async def _parse_shop_item(self, item):
        name_elem = await item.query_selector(".txt .tit a")
        if not name_elem:
            return None

        name = await name_elem.get_attribute("title") or await name_elem.inner_text()
        shop_url = await name_elem.get_attribute("href") or ""

        price_elem = await item.query_selector(".mean-price b")
        avg_price = 0
        if price_elem:
            price_text = await price_elem.inner_text()
            price_match = re.search(r"\d+", price_text)
            if price_match:
                avg_price = int(price_match.group())

        review_elem = await item.query_selector(".review-num b")
        review_count = 0
        if review_elem:
            review_text = await review_elem.inner_text()
            review_match = re.search(r"\d+", review_text.replace(",", ""))
            if review_match:
                review_count = int(review_match.group())

        addr_elem = await item.query_selector(".addr")
        address = ""
        district = ""
        if addr_elem:
            address = await addr_elem.inner_text()
            district_match = re.match(r"^([\u4e00-\u9fa5]+区)", address)
            if district_match:
                district = district_match.group(1)

        business_hours, opens_early = await self._get_business_hours(shop_url)

        categories = await self._get_categories(shop_url)

        return {
            "name": name.strip(),
            "url": shop_url,
            "avg_price": avg_price,
            "review_count": review_count,
            "address": address.strip(),
            "district": district,
            "business_hours": business_hours,
            "opens_early": opens_early,
            "categories": categories,
            "category_count": len(categories),
        }

    async def _get_business_hours(self, shop_url):
        try:
            detail_page = await self.browser.new_page()
            await detail_page.goto(BASE_URL + shop_url if shop_url.startswith("/") else shop_url,
                                   wait_until="domcontentloaded", timeout=10000)
            await detail_page.wait_for_timeout(1500)

            hours_elem = await detail_page.query_selector(".info .info-indent p")
            business_hours = ""
            if hours_elem:
                business_hours = await hours_elem.inner_text()

            await detail_page.close()

            opens_early = self._check_opens_early(business_hours)
            return business_hours, opens_early
        except Exception as e:
            print(f"获取营业时间失败: {e}")
            return "", False

    def _check_opens_early(self, hours_text):
        if not hours_text:
            return False
        time_pattern = r"(\d{1,2}):(\d{2})"
        matches = re.findall(time_pattern, hours_text)
        if matches:
            hour = int(matches[0][0])
            return hour <= 6
        return False

    async def _get_categories(self, shop_url):
        try:
            detail_page = await self.browser.new_page()
            await detail_page.goto(BASE_URL + shop_url if shop_url.startswith("/") else shop_url,
                                   wait_until="domcontentloaded", timeout=10000)
            await detail_page.wait_for_timeout(1500)

            category_elems = await detail_page.query_selector_all(".recommend .recommend-name a")
            categories = []
            for elem in category_elems[:10]:
                text = await elem.inner_text()
                if text.strip():
                    categories.append(text.strip())

            await detail_page.close()
            return categories
        except Exception as e:
            print(f"获取品类失败: {e}")
            return []

    def save_results(self, filename=None):
        if not filename:
            filename = f"{self.city}_markets.json"
        filepath = os.path.join(DATA_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(self.results, f, ensure_ascii=False, indent=2)
        print(f"数据已保存至: {filepath}")
        return filepath


async def main():
    spider = MarketSpider(city="上海", headless=False)
    results = await spider.start()
    print(f"共抓取 {len(results)} 家菜市场/生鲜超市")
    spider.save_results()


if __name__ == "__main__":
    asyncio.run(main())
