import asyncio
import re
import json
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict

from playwright.async_api import async_playwright, Page, BrowserContext

from src.config.spider_config import (
    get_random_ua,
    get_random_proxy,
    get_random_delay,
    XIAOHONGSHU_SEARCH_URL,
    SCROLL_PAUSE_TIME,
    MAX_SCROLL_PAGES,
)

logger = logging.getLogger(__name__)


@dataclass
class NoteItem:
    keyword: str
    platform: str
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


class XiaohongshuSpider:
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.results: list[NoteItem] = []

    async def _create_context(self, playwright) -> BrowserContext:
        browser = await playwright.chromium.launch(headless=self.headless)
        ua = get_random_ua()
        proxy = get_random_proxy()
        context_kwargs: dict = {"user_agent": ua}
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
            r"(\d{4})[-年/](\d{1,2})[-月/](\d{1,2})[日号]?",
            r"(\d{2})[-年/](\d{1,2})[-月/](\d{1,2})[日号]?",
            r"(\d{1,2})[-月/](\d{1,2})[日号]?",
        ]

        for pat in patterns:
            m = re.search(pat, text)
            if m:
                groups = m.groups()
                if len(groups) == 3:
                    try:
                        year = int(groups[0])
                        if year < 100:
                            year += 2000
                        return f"{year:04d}-{int(groups[1]):02d}-{int(groups[2]):02d}"
                    except ValueError:
                        pass
                elif len(groups) == 2:
                    try:
                        return f"{today.year}-{int(groups[0]):02d}-{int(groups[1]):02d}"
                    except ValueError:
                        pass

        if "分钟" in text or "秒" in text or "刚刚" in text or "今天" in text:
            return today.strftime("%Y-%m-%d")
        if "昨天" in text:
            return (today - timedelta(days=1)).strftime("%Y-%m-%d")
        if "前天" in text:
            return (today - timedelta(days=2)).strftime("%Y-%m-%d")
        if "天前" in text:
            m = re.search(r"(\d+)\s*天前", text)
            if m:
                days = int(m.group(1))
                return (today - timedelta(days=days)).strftime("%Y-%m-%d")

        return today.strftime("%Y-%m-%d")

    @staticmethod
    def _parse_count(text: str) -> int:
        text = text.strip()
        if not text:
            return 0
        multipliers = {"万": 10000, "w": 10000, "W": 10000, "k": 1000, "K": 1000, "千": 1000}
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

    async def _extract_notes(self, page: Page, keyword: str) -> list[NoteItem]:
        notes = []
        note_elements = await page.query_selector_all(
            "section.note-item, div.note-item, [class*='note-item'], [class*='feeds-container'] > *"
        )

        if not note_elements:
            note_elements = await page.query_selector_all("a[href*='/explore/'], a[href*='/discovery/item/']")

        for idx, elem in enumerate(note_elements[:200]):
            try:
                note = NoteItem(keyword=keyword, platform="xiaohongshu")

                link_elem = await elem.query_selector("a[href*='/explore/'], a[href*='/discovery/item/']")
                if not link_elem:
                    link_elem = elem if await elem.evaluate("el => el.tagName === 'A'") else None

                if link_elem:
                    href = await link_elem.get_attribute("href") or ""
                    note.url = href if href.startswith("http") else f"https://www.xiaohongshu.com{href}"
                    note_id_match = re.search(r"/(?:explore|discovery/item)/([a-f0-9A-Z]+)", href)
                    if note_id_match:
                        note.note_id = note_id_match.group(1)
                    else:
                        note.note_id = f"xhs_{keyword}_{idx}"

                title_selectors = [
                    ".title",
                    ".note-title",
                    "[class*='title']",
                    "h3",
                    ".content span",
                    "[data-v-] span",
                ]
                for sel in title_selectors:
                    title_elem = await elem.query_selector(sel)
                    if title_elem:
                        title_text = (await title_elem.inner_text()).strip()
                        if title_text and len(title_text) > 0:
                            note.title = title_text
                            break

                author_selectors = [
                    ".author .name",
                    ".author-wrapper",
                    ".author-name",
                    ".nickname",
                    "[class*='author'] span",
                    ".user-name",
                    ".name",
                ]
                for sel in author_selectors:
                    author_elem = await elem.query_selector(sel)
                    if author_elem:
                        author_text = (await author_elem.inner_text()).strip()
                        if author_text and len(author_text) > 0 and author_text != note.title:
                            note.author = author_text
                            break

                like_selectors = [
                    ".like-wrapper span",
                    "[class*='like'] span",
                    ".count-wrapper [class*='like']",
                    ".heart-wrapper span",
                    ".interact-item:nth-child(1) span",
                    "[data-v-] [class*='like']",
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
                    ".comment-wrapper span",
                    "[class*='comment'] span",
                    ".count-wrapper [class*='comment']",
                    ".chat-wrapper span",
                    ".interact-item:nth-child(2) span",
                    "[data-v-] [class*='comment']",
                    "span[class*='comment']",
                    ".comments-count",
                ]
                for sel in comment_selectors:
                    comment_elem = await elem.query_selector(sel)
                    if comment_elem:
                        comment_text = (await comment_elem.inner_text()).strip()
                        if comment_text:
                            note.comments = self._parse_count(comment_text)
                            break

                time_selectors = [
                    ".date",
                    ".publish-date",
                    ".publish-time",
                    ".time",
                    "[class*='time']",
                    "[class*='date']",
                    ".create-time",
                    "span[class*='time']",
                ]
                for sel in time_selectors:
                    time_elem = await elem.query_selector(sel)
                    if time_elem:
                        time_text = (await time_elem.inner_text()).strip()
                        if time_text and len(time_text) > 0 and len(time_text) < 20:
                            note.publish_time = self._parse_datetime(time_text)
                            break

                if not note.publish_time:
                    note.publish_time = datetime.now().strftime("%Y-%m-%d")

                notes.append(note)
            except Exception as e:
                logger.warning(f"Failed to extract note {idx}: {e}")
                continue

        return notes

    async def search(self, keyword: str) -> list[NoteItem]:
        logger.info(f"Searching xiaohongshu for: {keyword}")
        self.results = []

        async with async_playwright() as p:
            context, browser = await self._create_context(p)
            try:
                page = await context.new_page()
                search_url = f"{XIAOHONGSHU_SEARCH_URL}?keyword={keyword}&source=web_search_result_notes"
                await page.goto(search_url, wait_until="networkidle", timeout=60000)
                await asyncio.sleep(3)

                await self._scroll_to_load(page)
                notes = await self._extract_notes(page, keyword)
                self.results.extend(notes)
                logger.info(f"Found {len(notes)} notes for keyword: {keyword}")
            except Exception as e:
                logger.error(f"Search failed for {keyword}: {e}")
            finally:
                await browser.close()

        return self.results

    async def search_multiple(self, keywords: list[str]) -> list[NoteItem]:
        all_notes = []
        for kw in keywords:
            notes = await self.search(kw)
            all_notes.extend(notes)
            delay = get_random_delay() * 3
            logger.info(f"Waiting {delay:.1f}s before next keyword...")
            await asyncio.sleep(delay)
        return all_notes


def generate_demo_data(keyword: str, days: int = 90) -> list[dict]:
    import numpy as np
    from datetime import timedelta

    np.random.seed(hash(keyword) % 2**31)
    base_date = datetime(2025, 10, 1)

    peak_day = np.random.randint(10, 15)
    growth_rate = np.random.uniform(0.4, 0.7)
    max_notes_per_day = np.random.randint(30, 80)
    decay_rate = np.random.uniform(0.05, 0.09)

    data = []
    note_counter = 0

    for day in range(days):
        current_date = base_date + timedelta(days=day)

        logistic_val = max_notes_per_day / (1 + np.exp(-growth_rate * (day - peak_day)))
        if day > peak_day:
            logistic_val *= np.exp(-decay_rate * (day - peak_day))

        noise = np.random.normal(0, max_notes_per_day * 0.1)
        note_count = max(0, int(logistic_val + noise))

        for _ in range(note_count):
            avg_likes = int(np.random.lognormal(3, 1.5) * (logistic_val / max(max_notes_per_day, 1)))
            avg_comments = int(avg_likes * np.random.uniform(0.05, 0.15))

            data.append({
                "keyword": keyword,
                "platform": "xiaohongshu",
                "note_id": f"demo_{keyword}_{note_counter}",
                "title": f"{keyword}打卡第{day}天",
                "publish_time": current_date.strftime("%Y-%m-%d"),
                "likes": avg_likes,
                "comments": avg_comments,
                "author": f"user_{np.random.randint(1000, 9999)}",
                "url": f"https://www.xiaohongshu.com/explore/demo_{note_counter}",
                "crawl_time": datetime.now().isoformat(),
            })
            note_counter += 1

    return data
