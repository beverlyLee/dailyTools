import asyncio
import re
import json
import logging
from datetime import datetime
from dataclasses import dataclass, field, asdict

from playwright.async_api import async_playwright, Page, BrowserContext

from src.config.spider_config import (
    get_random_ua,
    get_random_proxy,
    get_random_delay,
    DOUYIN_SEARCH_URL,
    SCROLL_PAUSE_TIME,
    MAX_SCROLL_PAGES,
)

logger = logging.getLogger(__name__)


@dataclass
class DouyinNoteItem:
    keyword: str
    platform: str = "douyin"
    note_id: str = ""
    title: str = ""
    publish_time: str = ""
    likes: int = 0
    comments: int = 0
    author: str = ""
    url: str = ""
    crawl_time: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self):
        return asdict(self)


class DouyinSpider:
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.results: list[DouyinNoteItem] = []

    async def _create_context(self, playwright) -> BrowserContext:
        browser = await playwright.chromium.launch(headless=self.headless)
        ua = get_random_ua()
        proxy = get_random_proxy()
        context_kwargs: dict = {
            "user_agent": ua,
            "viewport": {"width": 1280, "height": 720},
        }
        if proxy:
            context_kwargs["proxy"] = {"server": proxy}
        context = await browser.new_context(**context_kwargs)
        return context, browser

    async def _scroll_to_load(self, page: Page):
        for i in range(MAX_SCROLL_PAGES):
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            delay = get_random_delay()
            await asyncio.sleep(SCROLL_PAUSE_TIME + delay)
            logger.info(f"Scrolled page {i + 1}/{MAX_SCROLL_PAGES}")

    def _parse_datetime(self, text: str) -> str:
        text = text.strip()
        today = datetime.now()

        if not text:
            return today.strftime("%Y-%m-%d")

        patterns = [
            r"(\d{4})-(\d{1,2})-(\d{1,2})",
            r"(\d{4})/(\d{1,2})/(\d{1,2})",
            r"(\d{1,2})-(\d{1,2})",
            r"(\d{1,2})/(\d{1,2})",
        ]

        for pat in patterns:
            m = re.search(pat, text)
            if m:
                groups = m.groups()
                if len(groups) == 3:
                    try:
                        return f"{int(groups[0]):04d}-{int(groups[1]):02d}-{int(groups[2]):02d}"
                    except ValueError:
                        pass
                elif len(groups) == 2:
                    try:
                        return f"{today.year}-{int(groups[0]):02d}-{int(groups[1]):02d}"
                    except ValueError:
                        pass

        if "分钟" in text or "小时" in text or "刚刚" in text:
            return today.strftime("%Y-%m-%d")
        if "昨天" in text:
            return (today.replace(day=today.day - 1)).strftime("%Y-%m-%d")
        if "天前" in text:
            m = re.search(r"(\d+)\s*天前", text)
            if m:
                days = int(m.group(1))
                from datetime import timedelta
                return (today - timedelta(days=days)).strftime("%Y-%m-%d")

        return today.strftime("%Y-%m-%d")

    @staticmethod
    def _parse_count(text: str) -> int:
        text = text.strip()
        if not text:
            return 0
        multipliers = {
            "万": 10000, "w": 10000, "W": 10000,
            "千": 1000, "k": 1000, "K": 1000,
        }
        for suffix, mult in multipliers.items():
            if suffix in text:
                try:
                    return int(float(text.replace(suffix, "").strip()) * mult)
                except ValueError:
                    return 0
        try:
            return int(text)
        except ValueError:
            return 0

    async def _extract_notes(self, page: Page, keyword: str) -> list[DouyinNoteItem]:
        notes = []
        selectors = [
            "div[data-e2e='search-result-item']",
            "li.search-result-item",
            ".search-result-list > *",
            "div[data-e2e='user-post']",
            "a[href*='/video/']",
        ]

        note_elements = []
        for sel in selectors:
            note_elements = await page.query_selector_all(sel)
            if note_elements:
                logger.info(f"Found {len(note_elements)} elements with selector: {sel}")
                break

        if not note_elements:
            note_elements = await page.query_selector_all("a[href*='/video/']")

        for idx, elem in enumerate(note_elements[:100]):
            try:
                note = DouyinNoteItem(keyword=keyword)

                link_elem = await elem.query_selector("a[href*='/video/']")
                if not link_elem:
                    link_elem = elem if await elem.evaluate("el => el.tagName === 'A'") else None

                if link_elem:
                    href = await link_elem.get_attribute("href") or ""
                    note.url = href if href.startswith("http") else f"https://www.douyin.com{href}"
                    vid_match = re.search(r"/video/([A-Za-z0-9_-]+)", href)
                    if vid_match:
                        note.note_id = vid_match.group(1)
                    else:
                        note.note_id = f"dy_{keyword}_{idx}"

                title_selectors = [
                    "h1[data-e2e='video-desc']",
                    ".video-desc",
                    ".title",
                    "[data-e2e='search-result-title']",
                    "span[class*='desc']",
                    "p[class*='desc']",
                ]
                for sel in title_selectors:
                    title_elem = await elem.query_selector(sel)
                    if title_elem:
                        title_text = (await title_elem.inner_text()).strip()
                        if title_text:
                            note.title = title_text
                            break

                author_selectors = [
                    "span[data-e2e='search-result-author']",
                    ".author-uniqueId",
                    ".user-name",
                    ".nickname",
                    "span[class*='author']",
                    "[data-e2e='user-nickname']",
                ]
                for sel in author_selectors:
                    author_elem = await elem.query_selector(sel)
                    if author_elem:
                        author_text = (await author_elem.inner_text()).strip()
                        if author_text:
                            note.author = author_text
                            break

                like_selectors = [
                    "[data-e2e='like-count']",
                    "[data-e2e='search-result-like'] span",
                    ".like-count",
                    "span[class*='like']",
                ]
                for sel in like_selectors:
                    like_elem = await elem.query_selector(sel)
                    if like_elem:
                        like_text = (await like_elem.inner_text()).strip()
                        if like_text:
                            note.likes = self._parse_count(like_text)
                            break

                comment_selectors = [
                    "[data-e2e='comment-count']",
                    "[data-e2e='search-result-comment'] span",
                    ".comment-count",
                    "span[class*='comment']",
                ]
                for sel in comment_selectors:
                    comment_elem = await elem.query_selector(sel)
                    if comment_elem:
                        comment_text = (await comment_elem.inner_text()).strip()
                        if comment_text:
                            note.comments = self._parse_count(comment_text)
                            break

                time_selectors = [
                    "[data-e2e='search-result-time']",
                    ".publish-time",
                    ".video-time",
                    "span[class*='time']",
                    "div[class*='time']",
                ]
                for sel in time_selectors:
                    time_elem = await elem.query_selector(sel)
                    if time_elem:
                        time_text = (await time_elem.inner_text()).strip()
                        if time_text:
                            note.publish_time = self._parse_datetime(time_text)
                            break

                if not note.publish_time:
                    note.publish_time = datetime.now().strftime("%Y-%m-%d")

                notes.append(note)
            except Exception as e:
                logger.warning(f"Failed to extract Douyin note {idx}: {e}")
                continue

        return notes

    async def search(self, keyword: str) -> list[DouyinNoteItem]:
        logger.info(f"Searching Douyin for: {keyword}")
        self.results = []

        async with async_playwright() as p:
            context, browser = await self._create_context(p)
            try:
                page = await context.new_page()
                search_url = f"{DOUYIN_SEARCH_URL}{keyword}"
                await page.goto(search_url, wait_until="networkidle", timeout=60000)
                await asyncio.sleep(5)

                await self._scroll_to_load(page)
                notes = await self._extract_notes(page, keyword)
                self.results.extend(notes)
                logger.info(f"Found {len(notes)} Douyin notes for keyword: {keyword}")
            except Exception as e:
                logger.error(f"Douyin search failed for {keyword}: {e}")
            finally:
                await browser.close()

        return self.results

    async def search_multiple(self, keywords: list[str]) -> list[DouyinNoteItem]:
        all_notes = []
        for kw in keywords:
            notes = await self.search(kw)
            all_notes.extend(notes)
            delay = get_random_delay() * 3
            logger.info(f"Waiting {delay:.1f}s before next keyword...")
            await asyncio.sleep(delay)
        return all_notes


def generate_douyin_demo_data(keyword: str, days: int = 90) -> list[dict]:
    import numpy as np
    from datetime import timedelta

    np.random.seed(hash(f"douyin_{keyword}") % 2**31)
    base_date = datetime(2025, 10, 1)

    peak_day = np.random.randint(10, 15)
    growth_rate = np.random.uniform(0.35, 0.65)
    max_notes_per_day = np.random.randint(50, 120)
    decay_rate = np.random.uniform(0.04, 0.08)

    douyin_titles = [
        f"{keyword}也太出片了吧",
        f"打卡{keyword}绝美瞬间",
        f"{keyword}一镜到底",
        f"第一次去{keyword}就爱上",
        f"带你沉浸式体验{keyword}",
        f"{keyword}原相机直出",
        f"谁还没去过{keyword}",
        f"{keyword}氛围感拉满",
        f"被{keyword}惊艳到了",
        f"{keyword}值得N刷",
    ]

    data = []
    note_counter = 0

    for day in range(days):
        current_date = base_date + timedelta(days=day)

        logistic_val = max_notes_per_day / (1 + np.exp(-growth_rate * (day - peak_day)))
        if day > peak_day:
            logistic_val *= np.exp(-decay_rate * (day - peak_day))

        noise = np.random.normal(0, max_notes_per_day * 0.12)
        note_count = max(0, int(logistic_val + noise))

        for _ in range(note_count):
            avg_likes = int(np.random.lognormal(4, 1.8) * (logistic_val / max(max_notes_per_day, 1)))
            avg_comments = int(avg_likes * np.random.uniform(0.08, 0.2))
            title_idx = np.random.randint(0, len(douyin_titles))

            data.append({
                "keyword": keyword,
                "platform": "douyin",
                "note_id": f"dy_demo_{keyword}_{note_counter}",
                "title": douyin_titles[title_idx],
                "publish_time": current_date.strftime("%Y-%m-%d"),
                "likes": avg_likes,
                "comments": avg_comments,
                "author": f"dy_user_{np.random.randint(10000, 99999)}",
                "url": f"https://www.douyin.com/video/dy_demo_{note_counter}",
                "crawl_time": datetime.now().isoformat(),
            })
            note_counter += 1

    return data
