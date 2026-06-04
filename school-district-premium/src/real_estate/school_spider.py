import asyncio
import json
import re
from pathlib import Path

from playwright.async_api import async_playwright

from src.config import settings


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)


BEIJING_KEY_SCHOOLS = {
    "中关村第一小学": {
        "district": "海淀",
        "approx_center": (116.3168, 39.9822),
        "polygon": [
            (116.308, 39.978), (116.325, 39.978), (116.325, 39.987),
            (116.308, 39.987), (116.308, 39.978),
        ],
    },
    "中关村第二小学": {
        "district": "海淀",
        "approx_center": (116.3185, 39.976),
        "polygon": [
            (116.312, 39.972), (116.326, 39.972), (116.326, 39.980),
            (116.312, 39.980), (116.312, 39.972),
        ],
    },
    "中关村第三小学": {
        "district": "海淀",
        "approx_center": (116.3100, 39.9720),
        "polygon": [
            (116.304, 39.968), (116.316, 39.968), (116.316, 39.976),
            (116.304, 39.976), (116.304, 39.968),
        ],
    },
    "人大附中": {
        "district": "海淀",
        "approx_center": (116.3220, 39.9680),
        "polygon": [
            (116.317, 39.964), (116.327, 39.964), (116.327, 39.972),
            (116.317, 39.972), (116.317, 39.964),
        ],
    },
    "北大附小": {
        "district": "海淀",
        "approx_center": (116.3060, 39.9920),
        "polygon": [
            (116.301, 39.988), (116.311, 39.988), (116.311, 39.996),
            (116.301, 39.996), (116.301, 39.988),
        ],
    },
    "清华大学附属小学": {
        "district": "海淀",
        "approx_center": (116.3260, 39.9990),
        "polygon": [
            (116.321, 39.995), (116.331, 39.995), (116.331, 40.003),
            (116.321, 40.003), (116.321, 39.995),
        ],
    },
    "史家胡同小学": {
        "district": "东城",
        "approx_center": (116.4180, 39.9280),
        "polygon": [
            (116.413, 39.924), (116.423, 39.924), (116.423, 39.932),
            (116.413, 39.932), (116.413, 39.924),
        ],
    },
    "北京小学": {
        "district": "西城",
        "approx_center": (116.3540, 39.9040),
        "polygon": [
            (116.349, 39.900), (116.359, 39.900), (116.359, 39.908),
            (116.349, 39.908), (116.349, 39.900),
        ],
    },
    "景山学校": {
        "district": "东城",
        "approx_center": (116.4100, 39.9240),
        "polygon": [
            (116.406, 39.920), (116.414, 39.920), (116.414, 39.928),
            (116.406, 39.928), (116.406, 39.920),
        ],
    },
    "芳草地小学": {
        "district": "朝阳",
        "approx_center": (116.4620, 39.9210),
        "polygon": [
            (116.457, 39.917), (116.467, 39.917), (116.467, 39.925),
            (116.457, 39.925), (116.457, 39.917),
        ],
    },
}


class SchoolSpider:
    def __init__(self):
        self.cookie = settings.anjuke_cookie

    async def crawl_schools(self, city: str = "beijing") -> list[dict]:
        schools = await self._try_crawl_anjuke(city)
        if not schools:
            schools = self._fallback_data()
        for s in schools:
            s["polygon"] = [[lng, lat] for lng, lat in s["polygon"]]
        out_path = DATA_DIR / f"schools_{city}.json"
        out_path.write_text(json.dumps(schools, ensure_ascii=False, indent=2), encoding="utf-8")
        return schools

    async def _try_crawl_anjuke(self, city: str) -> list[dict]:
        results = []
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context()
                if self.cookie:
                    cookies = []
                    for pair in self.cookie.split(";"):
                        pair = pair.strip()
                        if "=" in pair:
                            k, v = pair.split("=", 1)
                            cookies.append({"name": k.strip(), "value": v.strip(), "domain": ".anjuke.com", "path": "/"})
                    if cookies:
                        await context.add_cookies(cookies)
                page = await context.new_page()
                url = f"https://{city}.anjuke.com/community/school/"
                await page.goto(url, wait_until="networkidle", timeout=30000)
                items = await page.query_selector_all(".school-list-item")
                for item in items:
                    name_el = await item.query_selector(".school-name")
                    name = await name_el.inner_text() if name_el else ""
                    district_el = await item.query_selector(".district-name")
                    district = await district_el.inner_text() if district_el else ""
                    if name.strip():
                        results.append({
                            "name": name.strip(),
                            "district": district.strip(),
                            "approx_center": [116.4, 39.9],
                            "polygon": [[116.39, 39.89], [116.41, 39.89], [116.41, 39.91], [116.39, 39.91], [116.39, 39.89]],
                        })
                await browser.close()
        except Exception:
            pass
        return results

    @staticmethod
    def _fallback_data() -> list[dict]:
        results = []
        for name, info in BEIJING_KEY_SCHOOLS.items():
            results.append({
                "name": name,
                "district": info["district"],
                "approx_center": list(info["approx_center"]),
                "polygon": list(info["polygon"]),
            })
        return results

    @staticmethod
    def load_cached(city: str = "beijing") -> list[dict]:
        p = DATA_DIR / f"schools_{city}.json"
        if p.exists():
            return json.loads(p.read_text(encoding="utf-8"))
        return SchoolSpider._fallback_data()
