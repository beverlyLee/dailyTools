import asyncio
import json
import re
from pathlib import Path

from playwright.async_api import async_playwright

from src.config import settings


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)


class HouseSpider:
    def __init__(self):
        self.base_url = "https://bj.lianjia.com/chengjiao/"
        self.cookie = settings.lianjia_cookie

    async def _create_browser(self, playwright):
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context()
        if self.cookie:
            cookies = []
            for pair in self.cookie.split(";"):
                pair = pair.strip()
                if "=" in pair:
                    k, v = pair.split("=", 1)
                    cookies.append({"name": k.strip(), "value": v.strip(), "domain": ".lianjia.com", "path": "/"})
            if cookies:
                await context.add_cookies(cookies)
        page = await context.new_page()
        return browser, page

    async def crawl_district(self, district: str, max_pages: int = 5) -> list[dict]:
        results = []
        async with async_playwright() as p:
            browser, page = await self._create_browser(p)
            try:
                for pg in range(1, max_pages + 1):
                    url = f"{self.base_url}{district}/pg{pg}/"
                    await page.goto(url, wait_until="networkidle", timeout=30000)
                    items = await page.query_selector_all(".listContent li")
                    if not items:
                        break
                    for item in items:
                        record = await self._parse_item(item)
                        if record:
                            results.append(record)
                    await asyncio.sleep(2 + (pg % 3))
            finally:
                await browser.close()
        out_path = DATA_DIR / f"houses_{district}.json"
        out_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
        return results

    async def _parse_item(self, item) -> dict | None:
        try:
            title_el = await item.query_selector(".title a")
            if not title_el:
                return None
            title = await title_el.inner_text()
            href = await title_el.get_attribute("href")

            info_el = await item.query_selector(".address .houseInfo")
            house_info = await info_el.inner_text() if info_el else ""

            pos_el = await item.query_selector(".flood .positionInfo")
            position = await pos_el.inner_text() if pos_el else ""

            deal_el = await item.query_selector(".address .dealDate")
            deal_date = await deal_el.inner_text() if deal_el else ""

            price_el = await item.query_selector(".price .totalPrice span")
            total_price = await price_el.inner_text() if price_el else "0"

            unit_el = await item.query_selector(".unitPrice span")
            unit_price = await unit_el.inner_text() if unit_el else "0"

            area, built_year, layout = self._parse_house_info(house_info)

            return {
                "title": title.strip(),
                "href": href or "",
                "community": position.strip(),
                "deal_date": deal_date.strip(),
                "total_price_wan": float(re.sub(r"[^\d.]", "", total_price)),
                "unit_price": float(re.sub(r"[^\d.]", "", unit_price)) if unit_price else 0,
                "area_sqm": area,
                "built_year": built_year,
                "layout": layout,
            }
        except Exception:
            return None

    @staticmethod
    def _parse_house_info(info: str) -> tuple[float | None, int | None, str]:
        area = None
        built_year = None
        layout = ""
        parts = [p.strip() for p in info.split("|")]
        for part in parts:
            m_area = re.search(r"([\d.]+)平米", part)
            if m_area:
                area = float(m_area.group(1))
            m_year = re.search(r"(\d{4})年建", part)
            if m_year:
                built_year = int(m_year.group(1))
            if "室" in part:
                layout = part
        return area, built_year, layout

    @staticmethod
    def load_cached(district: str) -> list[dict]:
        p = DATA_DIR / f"houses_{district}.json"
        if p.exists():
            return json.loads(p.read_text(encoding="utf-8"))
        return []
