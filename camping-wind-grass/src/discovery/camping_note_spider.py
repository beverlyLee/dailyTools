import asyncio
import json
import re
import os
from typing import List, Dict, Optional
from urllib.parse import quote
from fake_useragent import UserAgent
import aiohttp
from dotenv import load_dotenv

load_dotenv()


class CampingNoteSpider:
    def __init__(self):
        self.ua = UserAgent()
        self.base_url = "https://www.xiaohongshu.com"
        self.search_keywords = ["露营", "Glamping", "野营", "露营地推荐"]
        self.session = None
        self.camping_sites = []

    def _get_headers(self) -> Dict:
        cookie = os.getenv("XHS_COOKIE", "")
        return {
            "User-Agent": self.ua.random,
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Cookie": cookie,
            "Referer": "https://www.xiaohongshu.com/",
        }

    async def search_notes(self, keyword: str, page: int = 1) -> List[Dict]:
        url = f"{self.base_url}/api/sns/web/v1/search/notes"
        params = {
            "keyword": keyword,
            "page": page,
            "page_size": 20,
            "search_id": "",
            "sort": "general",
        }

        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(
                    url, headers=self._get_headers(), params=params, timeout=10
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("data", {}).get("notes", [])
            except Exception as e:
                print(f"搜索笔记失败: {e}")
        return []

    async def get_note_detail(self, note_id: str) -> Optional[Dict]:
        url = f"{self.base_url}/api/sns/web/v1/feed"
        params = {"source_note_id": note_id}

        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(
                    url, headers=self._get_headers(), params=params, timeout=10
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        items = data.get("data", {}).get("items", [])
                        if items:
                            return items[0]
            except Exception as e:
                print(f"获取笔记详情失败: {e}")
        return None

    def _extract_camping_info(self, note_data: Dict) -> Optional[Dict]:
        try:
            note_card = note_data.get("note_card", {})
            title = note_card.get("title", "")
            description = note_card.get("desc", "")
            content = f"{title} {description}"

            location_patterns = [
                r"([\u4e00-\u9fa5]{2,10}(?:公园|营地|露营地|山谷|草原|湖畔|湖边|海边|沙滩|山|岭|峰|谷|湾|岛))",
                r"位于([\u4e00-\u9fa5]{2,20})",
                r"地址[：:]\s*([\u4e00-\u9fa5a-zA-Z0-9\s]+)",
                r"📍\s*([\u4e00-\u9fa5a-zA-Z0-9\s]+)",
            ]

            location = None
            for pattern in location_patterns:
                match = re.search(pattern, content)
                if match:
                    location = match.group(1).strip()
                    break

            if not location:
                location = title[:20] if len(title) > 0 else "未知地点"

            image_list = note_card.get("image_list", [])
            photos = [img.get("url_default", "") for img in image_list[:3]]

            keywords = self._extract_keywords(content)

            return {
                "name": title[:50] if title else location,
                "location": location,
                "description": description[:500],
                "photos": photos,
                "keywords": keywords,
                "source": "xiaohongshu",
                "note_id": note_card.get("id", ""),
            }
        except Exception as e:
            print(f"提取露营信息失败: {e}")
            return None

    def _extract_keywords(self, content: str) -> List[str]:
        keyword_list = [
            "草坪", "草地", "无大风", "风小", "避风", "背风",
            "排水好", "不积水", "干燥", "平坦", "开阔",
            "厕所", "水源", "淋浴", "便利店", "停车场",
            "篝火", "烧烤", "钓鱼", "徒步", "看日出", "星空",
        ]

        found = []
        for kw in keyword_list:
            if kw in content:
                found.append(kw)
        return found

    async def crawl(self, max_pages: int = 3) -> List[Dict]:
        all_sites = []

        for keyword in self.search_keywords[:2]:
            for page in range(1, max_pages + 1):
                notes = await self.search_notes(keyword, page)
                for note in notes:
                    note_id = note.get("id")
                    if note_id:
                        detail = await self.get_note_detail(note_id)
                        if detail:
                            info = self._extract_camping_info(detail)
                            if info:
                                all_sites.append(info)
                await asyncio.sleep(2)

        self.camping_sites = all_sites
        return all_sites

    def load_mock_data(self) -> List[Dict]:
        mock_data = [
            {
                "name": "杭州千岛湖露营基地",
                "location": "浙江省杭州市淳安县千岛湖镇",
                "description": "湖边草坪营地，环境优美，设施齐全",
                "photos": [],
                "keywords": ["草坪", "平坦", "水源", "厕所", "停车场"],
                "source": "mock",
                "note_id": "mock_1",
            },
            {
                "name": "北京金海湖露营地",
                "location": "北京市平谷区金海湖镇",
                "description": "湖畔营地，草地覆盖率高，排水良好",
                "photos": [],
                "keywords": ["草坪", "排水好", "湖畔", "烧烤"],
                "source": "mock",
                "note_id": "mock_2",
            },
            {
                "name": "张家口草原天路风口营地",
                "location": "河北省张家口市张北县",
                "description": "风口山谷位置，常年风大、暴晒，草地稀疏，雨后容易积水泥泞，蚊虫较多",
                "photos": [],
                "keywords": ["草原", "开阔", "风大", "暴晒", "积水", "泥泞", "蚊子多"],
                "source": "mock",
                "note_id": "mock_3",
            },
            {
                "name": "成都三岔湖露营地",
                "location": "四川省成都市简阳市三岔湖",
                "description": "湖中小岛，草坪平整，适合家庭露营",
                "photos": [],
                "keywords": ["草坪", "钓鱼", "烧烤", "平坦"],
                "source": "mock",
                "note_id": "mock_4",
            },
            {
                "name": "广州从化溪头村露营",
                "location": "广东省广州市从化区溪头村",
                "description": "山谷营地，有溪流，背风处较好",
                "photos": [],
                "keywords": ["山谷", "水源", "徒步", "背风"],
                "source": "mock",
                "note_id": "mock_5",
            },
        ]
        self.camping_sites = mock_data
        return mock_data

    def save_to_file(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(self.camping_sites, f, ensure_ascii=False, indent=2)


async def main():
    spider = CampingNoteSpider()
    sites = spider.load_mock_data()
    print(f"获取到 {len(sites)} 个露营地")
    spider.save_to_file("/Users/liboyang/trae/dailyTools/camping-wind-grass/data/camping_sites.json")


if __name__ == "__main__":
    asyncio.run(main())
