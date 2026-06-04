import os
import json
import time
import random
import asyncio
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "true").lower() == "true"

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]

VIEWPORTS = [
    {"width": 1920, "height": 1080},
    {"width": 1440, "height": 900},
    {"width": 1536, "height": 864},
    {"width": 1366, "height": 768},
]


class DianpingDetailSpider:
    def __init__(self):
        self.data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "data")
        os.makedirs(self.data_dir, exist_ok=True)
        self.browser = None
        self.context = None

    async def _init_browser(self):
        from playwright.async_api import async_playwright
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-features=IsolateOrigins,site-per-process",
                "--no-sandbox",
            ]
        )
        self.context = await self.browser.new_context(
            viewport=random.choice(VIEWPORTS),
            user_agent=random.choice(USER_AGENTS),
            locale="zh-CN",
            timezone_id="Asia/Shanghai",
        )
        await self.context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        """)

    async def _close_browser(self):
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    async def _random_delay(self, min_sec=2, max_sec=5):
        await asyncio.sleep(random.uniform(min_sec, max_sec))

    async def _new_page(self):
        page = await self.context.new_page()
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        """)
        return page

    async def scrape_city(self, city: str, keyword: str = "剧本杀") -> List[Dict]:
        if USE_MOCK_DATA:
            return self._get_demo_data(city)

        try:
            await self._init_browser()
            shops = []
            page = await self._new_page()

            search_url = f"https://www.dianping.com/search/keyword/0/0_{keyword}"
            await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            await self._random_delay(3, 6)

            shop_items = await page.query_selector_all(".shop-all-list li")
            for idx, item in enumerate(shop_items[:30]):
                try:
                    link_el = await item.query_selector("a.shop-name, a.ttl, a[data-shopid]")
                    if not link_el:
                        continue

                    detail_url = await link_el.get_attribute("href")
                    if not detail_url:
                        continue
                    if not detail_url.startswith("http"):
                        detail_url = "https://www.dianping.com" + detail_url

                    shop_basic = await self._extract_list_info(item, city)
                    detail = await self._scrape_detail(detail_url, shop_basic)
                    shops.append(detail)

                    await self._random_delay(2, 5)
                except Exception as e:
                    print(f"Error scraping shop {idx}: {e}")
                    continue

            await page.close()
            await self._close_browser()

            if shops:
                self._save_data(shops, f"{city}_shops.json")
            return shops
        except Exception as e:
            print(f"Scraping error for {city}: {e}")
            await self._close_browser()
            return self._get_demo_data(city)

    async def _extract_list_info(self, item, city: str) -> Dict:
        name = ""
        name_el = await item.query_selector(".shop-name, .ttl, h4 a")
        if name_el:
            name = await name_el.inner_text()

        rating = 0.0
        rating_el = await item.query_selector(".star_score, .comment-score span, .remark span")
        if rating_el:
            rating_text = await rating_el.inner_text()
            try:
                rating = float(rating_text.strip())
            except ValueError:
                pass

        price = 0
        price_el = await item.query_selector(".mean-price b, .avg-price, .price b")
        if price_el:
            price_text = await price_el.inner_text()
            try:
                price = int("".join(filter(str.isdigit, price_text)))
            except ValueError:
                pass

        address = ""
        addr_el = await item.query_selector(".addr, .item-address, .area-name")
        if addr_el:
            address = await addr_el.inner_text()

        tags = []
        tag_els = await item.query_selector_all(".tag, .shop-tags span, .category span")
        for t in tag_els:
            tag_text = await t.inner_text()
            if tag_text.strip():
                tags.append(tag_text.strip())

        return {
            "name": name.strip(),
            "city": city,
            "rating": rating,
            "avg_price": price,
            "address": address.strip(),
            "tags": tags,
        }

    async def _scrape_detail(self, url: str, basic: Dict) -> Dict:
        page = await self._new_page()
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            await self._random_delay(2, 4)

            detail = dict(basic)
            detail["detail_url"] = url

            rating_el = await page.query_selector(".score-inner .score, .comment-score .score")
            if rating_el:
                try:
                    detail["rating"] = float(await rating_el.inner_text())
                except ValueError:
                    pass

            price_el = await page.query_selector(".price b, .avg-price b, .mean-price")
            if price_el:
                try:
                    price_text = await price_el.inner_text()
                    detail["avg_price"] = int("".join(filter(str.isdigit, price_text)))
                except ValueError:
                    pass

            tag_els = await page.query_selector_all(".tag-group span, .shop-tags .tag, .category-tags span")
            tags = list(detail.get("tags", []))
            for t in tag_els:
                tag_text = await t.inner_text()
                if tag_text.strip() and tag_text.strip() not in tags:
                    tags.append(tag_text.strip())
            detail["tags"] = tags

            district = ""
            dist_el = await page.query_selector(".region, .district, .area-name a")
            if dist_el:
                district = await dist_el.inner_text()
            detail["district"] = district.strip()

            lat, lng = 0, 0
            try:
                loc_script = await page.evaluate("""() => {
                    const meta = document.querySelector('meta[name="location"]');
                    if (meta) return meta.getAttribute('content');
                    const scriptTags = document.querySelectorAll('script');
                    for (const s of scriptTags) {
                        const text = s.textContent;
                        const latMatch = text.match(/latitude['"]*[:=]['"]*([\\d.]+)/);
                        const lngMatch = text.match(/longitude['"]*[:=]['"]*([\\d.]+)/);
                        if (latMatch && lngMatch) return latMatch[1] + ',' + lngMatch[1];
                    }
                    return '';
                }""")
                if loc_script:
                    parts = loc_script.split(",")
                    if len(parts) == 2:
                        lat, lng = float(parts[0]), float(parts[1])
            except Exception:
                pass
            detail["lat"] = lat
            detail["lng"] = lng

            return detail
        except Exception as e:
            print(f"Detail scraping error: {e}")
            return basic
        finally:
            await page.close()

    def _get_demo_data(self, city: str) -> List[Dict]:
        cached = self._load_data(f"{city}_shops.json")
        if cached:
            return cached
        return self._generate_demo_data(city)

    def _generate_demo_data(self, city: str) -> List[Dict]:
        templates = {
            "北京": self._beijing_shops,
            "上海": self._shanghai_shops,
            "成都": self._chengdu_shops,
            "广州": self._guangzhou_shops,
            "武汉": self._wuhan_shops,
        }
        generator = templates.get(city, self._wuhan_shops)
        shops = generator()
        self._save_data(shops, f"{city}_shops.json")
        return shops

    def _beijing_shops(self) -> List[Dict]:
        return [
            {"id": "bj001", "name": "迷局推理馆(朝阳大悦城店)", "city": "北京", "district": "朝阳区", "address": "朝阳区朝阳北路101号朝阳大悦城B1", "lat": 39.9218, "lng": 116.4737, "rating": 4.9, "review_count": 467, "avg_price": 138, "tags": ["硬核推理", "沉浸剧场", "本格推理"], "cluster_id": 0},
            {"id": "bj002", "name": "暗影密室(三里屯店)", "city": "北京", "district": "朝阳区", "address": "朝阳区三里屯路19号院2号楼", "lat": 39.9337, "lng": 116.4545, "rating": 4.7, "review_count": 356, "avg_price": 128, "tags": ["硬核推理", "恐怖惊悚", "密室逃脱"], "cluster_id": 0},
            {"id": "bj003", "name": "戏梦沉浸剧场(CBD店)", "city": "北京", "district": "朝阳区", "address": "朝阳区建国路89号华贸中心", "lat": 39.9087, "lng": 116.4603, "rating": 4.8, "review_count": 412, "avg_price": 158, "tags": ["沉浸剧场", "硬核推理", "情感本"], "cluster_id": 0},
            {"id": "bj004", "name": "逻辑猎人推理社", "city": "北京", "district": "朝阳区", "address": "朝阳区望京SOHO T1-2108", "lat": 39.9893, "lng": 116.4782, "rating": 4.6, "review_count": 289, "avg_price": 118, "tags": ["硬核推理", "本格推理", "变格推理"], "cluster_id": 0},
            {"id": "bj005", "name": "诡夜惊魂密室", "city": "北京", "district": "朝阳区", "address": "朝阳区劲松南路1号", "lat": 39.8765, "lng": 116.4632, "rating": 4.5, "review_count": 234, "avg_price": 108, "tags": ["恐怖惊悚", "密室逃脱", "沉浸式"], "cluster_id": 1},
            {"id": "bj006", "name": "京城剧本馆(国贸店)", "city": "北京", "district": "朝阳区", "address": "朝阳区国贸建外SOHO西区12号楼", "lat": 39.9095, "lng": 116.4587, "rating": 4.7, "review_count": 378, "avg_price": 148, "tags": ["沉浸剧场", "硬核推理", "欢乐机制"], "cluster_id": 0},
            {"id": "bj007", "name": "悬疑档案馆", "city": "北京", "district": "海淀区", "address": "海淀区中关村大街15号", "lat": 39.9812, "lng": 116.3107, "rating": 4.8, "review_count": 401, "avg_price": 128, "tags": ["硬核推理", "本格推理", "密室逃脱"], "cluster_id": 0},
            {"id": "bj008", "name": "幻境密室(五道口店)", "city": "北京", "district": "海淀区", "address": "海淀区成府路28号五道口购物中心", "lat": 39.9928, "lng": 116.3377, "rating": 4.4, "review_count": 178, "avg_price": 98, "tags": ["恐怖惊悚", "沉浸式", "密室逃脱"], "cluster_id": 1},
            {"id": "bj009", "name": "推理工坊(西直门店)", "city": "北京", "district": "西城区", "address": "西城区西直门外大街1号嘉茂中心", "lat": 39.9421, "lng": 116.3487, "rating": 4.6, "review_count": 245, "avg_price": 108, "tags": ["硬核推理", "阵营对抗", "变格推理"], "cluster_id": 0},
            {"id": "bj010", "name": "欢乐研究所", "city": "北京", "district": "朝阳区", "address": "朝阳区双井富力广场3层", "lat": 39.8953, "lng": 116.4612, "rating": 4.5, "review_count": 198, "avg_price": 88, "tags": ["欢乐机制", "派对游戏", "轻松休闲"], "cluster_id": 2},
            {"id": "bj011", "name": "红尘客栈剧本社", "city": "北京", "district": "东城区", "address": "东城区王府井大街301号", "lat": 39.9142, "lng": 116.4107, "rating": 4.7, "review_count": 312, "avg_price": 138, "tags": ["情感沉浸", "古风本", "沉浸剧场"], "cluster_id": 3},
            {"id": "bj012", "name": "鬼门关密室体验馆", "city": "北京", "district": "朝阳区", "address": "朝阳区百子湾路33号院", "lat": 39.8978, "lng": 116.4765, "rating": 4.3, "review_count": 167, "avg_price": 118, "tags": ["恐怖惊悚", "沉浸式", "NPC互动"], "cluster_id": 1},
            {"id": "bj013", "name": "真探局(望京店)", "city": "北京", "district": "朝阳区", "address": "朝阳区望京西路50号", "lat": 39.9912, "lng": 116.4723, "rating": 4.8, "review_count": 356, "avg_price": 148, "tags": ["硬核推理", "沉浸剧场", "本格推理"], "cluster_id": 0},
            {"id": "bj014", "name": "乱世枭雄剧本杀", "city": "北京", "district": "丰台区", "address": "丰台区丰台路75号", "lat": 39.8582, "lng": 116.2867, "rating": 4.4, "review_count": 156, "avg_price": 98, "tags": ["阵营对抗", "欢乐机制", "机制本"], "cluster_id": 4},
            {"id": "bj015", "name": "密室大逃脱(通州店)", "city": "北京", "district": "通州区", "address": "通州区新华西街58号", "lat": 39.9087, "lng": 116.6623, "rating": 4.3, "review_count": 134, "avg_price": 78, "tags": ["密室逃脱", "恐怖惊悚", "解谜"], "cluster_id": 1},
            {"id": "bj016", "name": "云梦泽情感剧场", "city": "北京", "district": "朝阳区", "address": "朝阳区建国路93号万达广场", "lat": 39.9082, "lng": 116.4653, "rating": 4.9, "review_count": 489, "avg_price": 168, "tags": ["情感沉浸", "沉浸剧场", "古风本"], "cluster_id": 3},
            {"id": "bj017", "name": "京城诡事录", "city": "北京", "district": "东城区", "address": "东城区安定门内大街25号", "lat": 39.9478, "lng": 116.4023, "rating": 4.6, "review_count": 278, "avg_price": 128, "tags": ["硬核推理", "恐怖惊悚", "变格推理"], "cluster_id": 0},
            {"id": "bj018", "name": "嘻哈欢乐局", "city": "北京", "district": "海淀区", "address": "海淀区学院路15号", "lat": 39.9832, "lng": 116.3487, "rating": 4.4, "review_count": 189, "avg_price": 78, "tags": ["欢乐机制", "派对游戏", "轻松休闲"], "cluster_id": 2},
        ]

    def _shanghai_shops(self) -> List[Dict]:
        return [
            {"id": "sh001", "name": "魔都推理局(南京路店)", "city": "上海", "district": "黄浦区", "address": "黄浦区南京东路353号", "lat": 31.2345, "lng": 121.4782, "rating": 4.8, "review_count": 423, "avg_price": 148, "tags": ["硬核推理", "沉浸剧场", "本格推理"], "cluster_id": 0},
            {"id": "sh002", "name": "沪上鬼屋(静安店)", "city": "上海", "district": "静安区", "address": "静安区南京西路1266号", "lat": 31.2267, "lng": 121.4487, "rating": 4.6, "review_count": 287, "avg_price": 128, "tags": ["恐怖惊悚", "密室逃脱", "NPC互动"], "cluster_id": 1},
            {"id": "sh003", "name": "笑果推理社", "city": "上海", "district": "徐汇区", "address": "徐汇区漕溪北路398号", "lat": 31.1878, "lng": 121.4382, "rating": 4.5, "review_count": 234, "avg_price": 108, "tags": ["欢乐机制", "派对游戏", "轻松休闲"], "cluster_id": 2},
            {"id": "sh004", "name": "海上繁花情感剧场", "city": "上海", "district": "黄浦区", "address": "黄浦区淮海中路282号", "lat": 31.2234, "lng": 121.4712, "rating": 4.9, "review_count": 501, "avg_price": 168, "tags": ["情感沉浸", "沉浸剧场", "古风本"], "cluster_id": 3},
            {"id": "sh005", "name": "阵营之战(浦东店)", "city": "上海", "district": "浦东新区", "address": "浦东新区陆家嘴环路1000号", "lat": 31.2398, "lng": 121.5012, "rating": 4.7, "review_count": 345, "avg_price": 138, "tags": ["阵营对抗", "欢乐机制", "机制本"], "cluster_id": 4},
            {"id": "sh006", "name": "暗黑密室(长宁店)", "city": "上海", "district": "长宁区", "address": "长宁区中山公园附近", "lat": 31.2187, "lng": 121.4123, "rating": 4.4, "review_count": 178, "avg_price": 108, "tags": ["恐怖惊悚", "密室逃脱", "沉浸式"], "cluster_id": 1},
            {"id": "sh007", "name": "魔方推理馆(虹口店)", "city": "上海", "district": "虹口区", "address": "虹口区四川北路1800号", "lat": 31.2567, "lng": 121.4823, "rating": 4.6, "review_count": 267, "avg_price": 118, "tags": ["硬核推理", "本格推理", "密室逃脱"], "cluster_id": 0},
            {"id": "sh008", "name": "梦境沉浸剧场", "city": "上海", "district": "静安区", "address": "静安区北京西路968号", "lat": 31.2312, "lng": 121.4423, "rating": 4.8, "review_count": 389, "avg_price": 158, "tags": ["沉浸剧场", "情感沉浸", "硬核推理"], "cluster_id": 3},
            {"id": "sh009", "name": "欢乐多多剧本社", "city": "上海", "district": "浦东新区", "address": "浦东新区张杨路500号", "lat": 31.2287, "lng": 121.5212, "rating": 4.3, "review_count": 156, "avg_price": 88, "tags": ["欢乐机制", "派对游戏", "轻松休闲"], "cluster_id": 2},
            {"id": "sh010", "name": "诡案调查局", "city": "上海", "district": "徐汇区", "address": "徐汇区宜山路455号", "lat": 31.1782, "lng": 121.4232, "rating": 4.7, "review_count": 312, "avg_price": 128, "tags": ["硬核推理", "恐怖惊悚", "变格推理"], "cluster_id": 0},
            {"id": "sh011", "name": "热血阵营杀", "city": "上海", "district": "黄浦区", "address": "黄浦区人民广场附近", "lat": 31.2312, "lng": 121.4712, "rating": 4.5, "review_count": 201, "avg_price": 108, "tags": ["阵营对抗", "欢乐机制", "机制本"], "cluster_id": 4},
            {"id": "sh012", "name": "鬼魅之夜密室", "city": "上海", "district": "浦东新区", "address": "浦东新区世纪大道1198号", "lat": 31.2212, "lng": 121.5312, "rating": 4.3, "review_count": 145, "avg_price": 98, "tags": ["恐怖惊悚", "密室逃脱", "NPC互动"], "cluster_id": 1},
            {"id": "sh013", "name": "上海滩推理社", "city": "上海", "district": "黄浦区", "address": "黄浦区外滩附近", "lat": 31.2401, "lng": 121.4901, "rating": 4.8, "review_count": 398, "avg_price": 148, "tags": ["硬核推理", "沉浸剧场", "本格推理"], "cluster_id": 0},
            {"id": "sh014", "name": "锦瑟年华情感本", "city": "上海", "district": "静安区", "address": "静安区曹家渡附近", "lat": 31.2387, "lng": 121.4312, "rating": 4.6, "review_count": 267, "avg_price": 138, "tags": ["情感沉浸", "古风本", "沉浸剧场"], "cluster_id": 3},
            {"id": "sh015", "name": "笑声工厂剧本杀", "city": "上海", "district": "虹口区", "address": "虹口区鲁迅公园附近", "lat": 31.2612, "lng": 121.4712, "rating": 4.4, "review_count": 178, "avg_price": 88, "tags": ["欢乐机制", "派对游戏", "轻松休闲"], "cluster_id": 2},
        ]

    def _chengdu_shops(self) -> List[Dict]:
        return [
            {"id": "cd001", "name": "蜀欢乐剧场(春熙路店)", "city": "成都", "district": "锦江区", "address": "锦江区春熙路26号", "lat": 30.6578, "lng": 104.0812, "rating": 4.8, "review_count": 456, "avg_price": 98, "tags": ["欢乐机制", "派对游戏", "轻松休闲"], "cluster_id": 2},
            {"id": "cd002", "name": "锦城欢乐派", "city": "成都", "district": "锦江区", "address": "锦江区红星路三段1号", "lat": 30.6612, "lng": 104.0823, "rating": 4.7, "review_count": 389, "avg_price": 88, "tags": ["欢乐机制", "派对游戏", "阵营对抗"], "cluster_id": 2},
            {"id": "cd003", "name": "巴蜀谜局", "city": "成都", "district": "锦江区", "address": "锦江区东大街紫东楼段35号", "lat": 30.6523, "lng": 104.0834, "rating": 4.6, "review_count": 312, "avg_price": 108, "tags": ["硬核推理", "本格推理", "变格推理"], "cluster_id": 0},
            {"id": "cd004", "name": "火锅欢乐杀(春熙路店)", "city": "成都", "district": "锦江区", "address": "锦江区春熙路68号", "lat": 30.6589, "lng": 104.0798, "rating": 4.9, "review_count": 523, "avg_price": 78, "tags": ["欢乐机制", "阵营对抗", "派对游戏"], "cluster_id": 2},
            {"id": "cd005", "name": "川蜀鬼话密室", "city": "成都", "district": "青羊区", "address": "青羊区人民中路一段28号", "lat": 30.6712, "lng": 104.0623, "rating": 4.5, "review_count": 234, "avg_price": 108, "tags": ["恐怖惊悚", "密室逃脱", "NPC互动"], "cluster_id": 1},
            {"id": "cd006", "name": "蓉城推理社", "city": "成都", "district": "武侯区", "address": "武侯区科华北路62号", "lat": 30.6312, "lng": 104.0712, "rating": 4.7, "review_count": 345, "avg_price": 118, "tags": ["硬核推理", "沉浸剧场", "本格推理"], "cluster_id": 0},
            {"id": "cd007", "name": "锦里情感剧场", "city": "成都", "district": "武侯区", "address": "武侯区锦里古街旁", "lat": 30.6456, "lng": 104.0478, "rating": 4.8, "review_count": 401, "avg_price": 128, "tags": ["情感沉浸", "古风本", "沉浸剧场"], "cluster_id": 3},
            {"id": "cd008", "name": "嘻哈剧本馆(太古里店)", "city": "成都", "district": "锦江区", "address": "锦江区中纱帽街8号", "lat": 30.6545, "lng": 104.0856, "rating": 4.6, "review_count": 287, "avg_price": 88, "tags": ["欢乐机制", "轻松休闲", "派对游戏"], "cluster_id": 2},
            {"id": "cd009", "name": "蜀山诡事录", "city": "成都", "district": "金牛区", "address": "金牛区蜀汉路89号", "lat": 30.6912, "lng": 104.0412, "rating": 4.4, "review_count": 178, "avg_price": 98, "tags": ["恐怖惊悚", "硬核推理", "变格推理"], "cluster_id": 1},
            {"id": "cd010", "name": "群雄逐鹿阵营杀", "city": "成都", "district": "成华区", "address": "成华区建设路26号", "lat": 30.6612, "lng": 104.1012, "rating": 4.5, "review_count": 201, "avg_price": 108, "tags": ["阵营对抗", "欢乐机制", "机制本"], "cluster_id": 4},
            {"id": "cd011", "name": "蜀乐坊(春熙路二店)", "city": "成都", "district": "锦江区", "address": "锦江区联升巷18号", "lat": 30.6598, "lng": 104.0801, "rating": 4.7, "review_count": 367, "avg_price": 88, "tags": ["欢乐机制", "派对游戏", "轻松休闲"], "cluster_id": 2},
            {"id": "cd012", "name": "梦回唐朝沉浸馆", "city": "成都", "district": "锦江区", "address": "锦江区东御街18号", "lat": 30.6534, "lng": 104.0756, "rating": 4.9, "review_count": 478, "avg_price": 148, "tags": ["情感沉浸", "沉浸剧场", "古风本"], "cluster_id": 3},
            {"id": "cd013", "name": "天府推理局", "city": "成都", "district": "武侯区", "address": "武侯区天府大道北段1700号", "lat": 30.6212, "lng": 104.0612, "rating": 4.8, "review_count": 398, "avg_price": 128, "tags": ["硬核推理", "本格推理", "沉浸剧场"], "cluster_id": 0},
            {"id": "cd014", "name": "欢乐大乱斗", "city": "成都", "district": "锦江区", "address": "锦江区大慈寺路23号", "lat": 30.6567, "lng": 104.0834, "rating": 4.5, "review_count": 234, "avg_price": 78, "tags": ["欢乐机制", "阵营对抗", "派对游戏"], "cluster_id": 2},
            {"id": "cd015", "name": "青城诡事密室", "city": "成都", "district": "青羊区", "address": "青羊区光华村街45号", "lat": 30.6812, "lng": 104.0312, "rating": 4.3, "review_count": 156, "avg_price": 98, "tags": ["恐怖惊悚", "密室逃脱", "沉浸式"], "cluster_id": 1},
            {"id": "cd016", "name": "熊喵欢乐杀", "city": "成都", "district": "锦江区", "address": "锦江区东大街下东大街段68号", "lat": 30.6545, "lng": 104.0778, "rating": 4.6, "review_count": 289, "avg_price": 68, "tags": ["欢乐机制", "轻松休闲", "派对游戏"], "cluster_id": 2},
        ]

    def _guangzhou_shops(self) -> List[Dict]:
        return [
            {"id": "gz001", "name": "穗城推理社(天河店)", "city": "广州", "district": "天河区", "address": "天河区天河路385号太古汇", "lat": 23.1367, "lng": 113.3212, "rating": 4.8, "review_count": 398, "avg_price": 128, "tags": ["硬核推理", "沉浸剧场", "本格推理"], "cluster_id": 0},
            {"id": "gz002", "name": "岭南鬼屋(越秀店)", "city": "广州", "district": "越秀区", "address": "越秀区北京路168号", "lat": 23.1212, "lng": 113.2612, "rating": 4.5, "review_count": 234, "avg_price": 108, "tags": ["恐怖惊悚", "密室逃脱", "NPC互动"], "cluster_id": 1},
            {"id": "gz003", "name": "粤欢乐剧场(天河城店)", "city": "广州", "district": "天河区", "address": "天河区天河路208号天河城", "lat": 23.1312, "lng": 113.3245, "rating": 4.7, "review_count": 345, "avg_price": 98, "tags": ["欢乐机制", "派对游戏", "轻松休闲"], "cluster_id": 2},
            {"id": "gz004", "name": "花城情感剧场", "city": "广州", "district": "海珠区", "address": "海珠区江南大道中180号", "lat": 23.0912, "lng": 113.2712, "rating": 4.6, "review_count": 267, "avg_price": 138, "tags": ["情感沉浸", "古风本", "沉浸剧场"], "cluster_id": 3},
            {"id": "gz005", "name": "岭南阵营战(番禺店)", "city": "广州", "district": "番禺区", "address": "番禺区市桥街道大北路112号", "lat": 22.9412, "lng": 113.3612, "rating": 4.4, "review_count": 178, "avg_price": 88, "tags": ["阵营对抗", "欢乐机制", "机制本"], "cluster_id": 4},
            {"id": "gz006", "name": "珠江诡事录", "city": "广州", "district": "荔湾区", "address": "荔湾区上下九路68号", "lat": 23.1112, "lng": 113.2412, "rating": 4.6, "review_count": 256, "avg_price": 118, "tags": ["硬核推理", "恐怖惊悚", "变格推理"], "cluster_id": 0},
            {"id": "gz007", "name": "广府欢乐局", "city": "广州", "district": "天河区", "address": "天河区体育西路191号", "lat": 23.1345, "lng": 113.3178, "rating": 4.5, "review_count": 201, "avg_price": 88, "tags": ["欢乐机制", "派对游戏", "轻松休闲"], "cluster_id": 2},
            {"id": "gz008", "name": "南国密室(越秀二店)", "city": "广州", "district": "越秀区", "address": "越秀区环市东路339号", "lat": 23.1412, "lng": 113.2789, "rating": 4.3, "review_count": 145, "avg_price": 98, "tags": ["恐怖惊悚", "密室逃脱", "沉浸式"], "cluster_id": 1},
            {"id": "gz009", "name": "羊城推理馆", "city": "广州", "district": "天河区", "address": "天河区天河北路233号", "lat": 23.1389, "lng": 113.3312, "rating": 4.7, "review_count": 312, "avg_price": 138, "tags": ["硬核推理", "沉浸剧场", "本格推理"], "cluster_id": 0},
            {"id": "gz010", "name": "广州大阵营", "city": "广州", "district": "天河区", "address": "天河区龙口西路138号", "lat": 23.1412, "lng": 113.3412, "rating": 4.5, "review_count": 223, "avg_price": 108, "tags": ["阵营对抗", "欢乐机制", "机制本"], "cluster_id": 4},
            {"id": "gz011", "name": "粤夜惊魂密室", "city": "广州", "district": "海珠区", "address": "海珠区昌岗中路128号", "lat": 23.0812, "lng": 113.2812, "rating": 4.4, "review_count": 167, "avg_price": 108, "tags": ["恐怖惊悚", "密室逃脱", "NPC互动"], "cluster_id": 1},
            {"id": "gz012", "name": "西关情感剧场", "city": "广州", "district": "荔湾区", "address": "荔湾区恩宁路99号", "lat": 23.1012, "lng": 113.2312, "rating": 4.8, "review_count": 378, "avg_price": 148, "tags": ["情感沉浸", "古风本", "沉浸剧场"], "cluster_id": 3},
            {"id": "gz013", "name": "天河欢乐世界剧本杀", "city": "广州", "district": "天河区", "address": "天河区五山路381号", "lat": 23.1512, "lng": 113.3512, "rating": 4.6, "review_count": 289, "avg_price": 88, "tags": ["欢乐机制", "轻松休闲", "派对游戏"], "cluster_id": 2},
        ]

    def _wuhan_shops(self) -> List[Dict]:
        return [
            {"id": "wh001", "name": "迷雾剧本杀推理社(光谷店)", "city": "武汉", "district": "洪山区", "address": "洪山区光谷步行街西班牙风情街D栋5单元", "lat": 30.508, "lng": 114.385, "rating": 4.8, "review_count": 328, "avg_price": 88, "tags": ["硬核推理", "情感沉浸", "恐怖惊悚"], "cluster_id": 0},
            {"id": "wh002", "name": "剧满楼沉浸式剧本杀", "city": "武汉", "district": "洪山区", "address": "洪山区光谷世界城广场1栋", "lat": 30.510, "lng": 114.382, "rating": 4.7, "review_count": 256, "avg_price": 108, "tags": ["情感沉浸", "欢乐机制"], "cluster_id": 3},
            {"id": "wh003", "name": "天黑请闭眼剧本杀俱乐部", "city": "武汉", "district": "洪山区", "address": "洪山区鲁巷广场购物中心旁", "lat": 30.512, "lng": 114.379, "rating": 4.6, "review_count": 198, "avg_price": 78, "tags": ["硬核推理", "阵营对抗"], "cluster_id": 0},
            {"id": "wh004", "name": "秘境剧本杀体验馆", "city": "武汉", "district": "洪山区", "address": "洪山区光谷SBI创业街10栋", "lat": 30.515, "lng": 114.388, "rating": 4.5, "review_count": 156, "avg_price": 98, "tags": ["情感沉浸", "欢乐机制"], "cluster_id": 3},
            {"id": "wh005", "name": "剧本杀研究院", "city": "武汉", "district": "洪山区", "address": "洪山区珞喻路726号", "lat": 30.509, "lng": 114.375, "rating": 4.9, "review_count": 412, "avg_price": 128, "tags": ["硬核推理", "情感沉浸", "恐怖惊悚"], "cluster_id": 0},
            {"id": "wh006", "name": "戏精学院剧本杀", "city": "武汉", "district": "洪山区", "address": "洪山区光谷天地F1区", "lat": 30.485, "lng": 114.395, "rating": 4.4, "review_count": 134, "avg_price": 68, "tags": ["欢乐机制", "阵营对抗"], "cluster_id": 2},
            {"id": "wh007", "name": "推理大师剧本杀", "city": "武汉", "district": "武昌区", "address": "武昌区中南路7号中商广场", "lat": 30.545, "lng": 114.335, "rating": 4.7, "review_count": 287, "avg_price": 98, "tags": ["硬核推理", "阵营对抗"], "cluster_id": 0},
            {"id": "wh008", "name": "梦境剧本杀体验馆", "city": "武汉", "district": "洪山区", "address": "洪山区民族大道158号", "lat": 30.495, "lng": 114.368, "rating": 4.6, "review_count": 178, "avg_price": 85, "tags": ["情感沉浸", "恐怖惊悚"], "cluster_id": 3},
            {"id": "wh009", "name": "百变大侦探剧本杀", "city": "武汉", "district": "洪山区", "address": "洪山区关山大道光谷软件园A1栋", "lat": 30.488, "lng": 114.398, "rating": 4.5, "review_count": 145, "avg_price": 75, "tags": ["硬核推理", "欢乐机制"], "cluster_id": 0},
            {"id": "wh010", "name": "桌游俱乐部剧本杀", "city": "武汉", "district": "洪山区", "address": "洪山区珞狮路147号未来城C座", "lat": 30.528, "lng": 114.355, "rating": 4.3, "review_count": 98, "avg_price": 58, "tags": ["阵营对抗", "欢乐机制"], "cluster_id": 4},
            {"id": "wh011", "name": "沉浸式剧场剧本杀", "city": "武汉", "district": "洪山区", "address": "洪山区光谷步行街意大利风情街5号楼", "lat": 30.507, "lng": 114.380, "rating": 4.8, "review_count": 367, "avg_price": 138, "tags": ["情感沉浸", "硬核推理", "欢乐机制"], "cluster_id": 3},
            {"id": "wh012", "name": "暗夜侦探社", "city": "武汉", "district": "洪山区", "address": "洪山区关山大道218号", "lat": 30.492, "lng": 114.402, "rating": 4.6, "review_count": 203, "avg_price": 95, "tags": ["恐怖惊悚", "硬核推理"], "cluster_id": 1},
            {"id": "wh013", "name": "汉口诡事录", "city": "武汉", "district": "江汉区", "address": "江汉区解放大道688号", "lat": 30.5812, "lng": 114.2712, "rating": 4.7, "review_count": 312, "avg_price": 118, "tags": ["硬核推理", "恐怖惊悚", "沉浸剧场"], "cluster_id": 0},
            {"id": "wh014", "name": "欢乐武汉剧本馆", "city": "武汉", "district": "江岸区", "address": "江岸区中山大道818号", "lat": 30.5912, "lng": 114.3012, "rating": 4.4, "review_count": 167, "avg_price": 78, "tags": ["欢乐机制", "派对游戏", "轻松休闲"], "cluster_id": 2},
            {"id": "wh015", "name": "江城密室大逃脱", "city": "武汉", "district": "武昌区", "address": "武昌区解放路398号", "lat": 30.5512, "lng": 114.3212, "rating": 4.5, "review_count": 198, "avg_price": 108, "tags": ["恐怖惊悚", "密室逃脱", "沉浸式"], "cluster_id": 1},
        ]

    def _save_data(self, data: List[Dict], filename: str):
        filepath = os.path.join(self.data_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _load_data(self, filename: str) -> Optional[List[Dict]]:
        filepath = os.path.join(self.data_dir, filename)
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        return None

    def get_all_cities_data(self) -> List[Dict]:
        all_shops = []
        for city in ["北京", "上海", "成都", "广州", "武汉"]:
            shops = self._get_demo_data(city)
            all_shops.extend(shops)
        return all_shops
