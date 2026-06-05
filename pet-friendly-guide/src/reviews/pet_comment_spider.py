import asyncio
import json
import os
from typing import List, Dict
from playwright.async_api import async_playwright, Browser, Page


class PetCommentSpider:
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.keywords = ["宠物", "狗狗", "猫", "猫咪", "禁止", "不允许", "可以带", "允许带", "水碗", "尿垫"]
        self.data_dir = os.path.join(os.path.dirname(__file__), "../../data")
        os.makedirs(self.data_dir, exist_ok=True)

    async def _init_browser(self) -> tuple[Browser, Page]:
        playwright = await async_playwright().start()
        browser = await playwright.chromium.launch(headless=self.headless)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        return browser, page

    async def search_shop_reviews(self, shop_name: str, city: str = "上海") -> List[Dict]:
        reviews = []
        try:
            browser, page = await self._init_browser()
            
            search_url = f"https://www.dianping.com/search/keyword/{city}/0_{shop_name}"
            await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            
            await page.wait_for_timeout(2000)
            
            review_elements = await page.query_selector_all(".review-words")
            for elem in review_elements[:10]:
                text = await elem.inner_text()
                if any(keyword in text for keyword in self.keywords):
                    reviews.append({
                        "content": text.strip(),
                        "source": "dianping",
                        "shop_name": shop_name
                    })
            
            await browser.close()
        except Exception as e:
            print(f"爬取大众点评出错: {e}")
        
        return reviews

    async def search_xiaohongshu_notes(self, keyword: str) -> List[Dict]:
        notes = []
        try:
            browser, page = await self._init_browser()
            
            search_url = f"https://www.xiaohongshu.com/search_result?keyword={keyword} 宠物友好"
            await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            
            await page.wait_for_timeout(3000)
            
            note_elements = await page.query_selector_all(".note-item")
            for elem in note_elements[:10]:
                try:
                    title_elem = await elem.query_selector(".title")
                    desc_elem = await elem.query_selector(".desc")
                    title = await title_elem.inner_text() if title_elem else ""
                    desc = await desc_elem.inner_text() if desc_elem else ""
                    
                    content = f"{title} {desc}".strip()
                    if any(kw in content for kw in self.keywords):
                        notes.append({
                            "content": content,
                            "source": "xiaohongshu",
                            "keyword": keyword
                        })
                except:
                    continue
            
            await browser.close()
        except Exception as e:
            print(f"爬取小红书出错: {e}")
        
        return notes

    def get_mock_reviews(self, shop_name: str = "") -> List[Dict]:
        mock_data = self._generate_rich_reviews()
        if shop_name:
            return [r for r in mock_data if r["shop_name"] == shop_name]
        return mock_data

    def _generate_rich_reviews(self) -> List[Dict]:
        review_templates = [
            {
                "type": "friendly_indoor",
                "templates": [
                    "{shop}真的太棒了！全场都可以带狗狗进去，店员还给准备了宠物专用水碗，太贴心了！",
                    "周末带猫主子来{shop}探店，店员态度超好，还给了小零食，完全不排斥宠物！室内也可以进哦！",
                    "{shop}宠物友好认证！室内都可以带狗狗，有免费尿垫提供，强烈推荐！",
                    "带金毛来{shop}吃饭，店员主动给了水碗和零食，还专门收拾了一块区域，服务满分！",
                    "{shop}这家店超赞，带狗狗来完全没问题，室内室外都欢迎，还有猫咪玩耍区域！"
                ]
            },
            {
                "type": "friendly_outdoor",
                "templates": [
                    "{shop}的室外露台允许带狗狗，但是室内不行，天气好的时候来坐坐还不错。",
                    "仅限户外区可以带宠物，{shop}的室内用餐区禁止宠物进入，需要注意。",
                    "{shop}只能在露台带狗狗，室内不让进，不过露台风景挺好的，还有水碗提供。",
                    "{shop}的花园可以带宠物，但是室内不行，有点遗憾，不过服务员态度还是挺好的。",
                    "去{shop}的话只能在户外区域带宠物，室内是不允许的，这点要注意。"
                ]
            },
            {
                "type": "friendly_both",
                "templates": [
                    "{shop}宠物友好！室内外都可以带狗狗，还有专门的宠物活动区！",
                    "{shop}全场都欢迎宠物，室内有宠物活动区，室外也可以，还提供推车租赁！",
                    "超赞的{shop}！室内外都可以带宠物，提供水碗和零食，店员超热情！",
                    "{shop}真的是铲屎官的福音！室内外都可以进，还有宠物玩具提供！",
                    "推荐{shop}，室内外都允许宠物进入，还有免费尿垫和零食可以选择！"
                ]
            },
            {
                "type": "forbidden",
                "templates": [
                    "{shop}明确禁止宠物入内，只能放在门口的笼子里，不太方便。",
                    "打电话咨询过了，{shop}说不允许带宠物，建议放在门口的临时寄存处。",
                    "{shop}不让带宠物进去，态度也不是很好，不太推荐。",
                    "{shop}谢绝宠物入内，门口有寄存笼，但是感觉不太安全。",
                    "{shop}不可以带宠物，店员态度冷漠，不太适合铲屎官。"
                ]
            }
        ]

        shop_names = [
            "Paw Coffee 爪爪咖啡馆", "毛孩子乐园餐厅", "传统美食餐厅", "阳光购物中心",
            "露台花园餐厅", "猫咪主题咖啡馆", "萌宠咖啡屋", "汪汪西餐厅",
            "喵喵火锅", "爱宠日料", "宠物乐园商场", "爪爪烧烤",
            "萌爪宠物用品店", "宠爱购物中心", "毛茸茸咖啡馆", "汪汪公园",
            "喵星人餐厅", "宠物生活馆", "萌宠天地", "爱宠咖啡店",
            "爪爪西餐厅", "喵喵咖啡馆", "宠物友好餐厅", "毛孩子乐园",
            "宠爱餐厅", "萌宠烧烤", "汪汪咖啡店", "猫咪乐园",
            "宠物购物中心", "爱宠餐厅", "爪爪火锅", "毛茸茸西餐厅",
            "萌爪日料", "宠爱咖啡店", "汪汪公园餐厅", "喵星人咖啡店",
            "宠物友好商场", "毛孩子咖啡馆", "爪爪购物中心", "萌宠餐厅",
            "爱宠烧烤", "猫咪咖啡屋", "宠物乐园餐厅", "汪汪购物中心",
            "喵喵餐厅", "毛茸茸咖啡店", "萌爪火锅", "宠爱日料",
            "毛孩子烧烤", "宠物友好咖啡店", "爪爪餐厅", "萌宠购物中心",
            "爱宠咖啡店", "猫咪西餐厅", "汪汪火锅", "宠物公园",
            "喵喵购物中心", "毛茸茸餐厅", "萌爪咖啡店", "宠爱烧烤",
            "毛孩子日料", "宠物友好公园", "爪爪咖啡店", "萌宠火锅",
            "爱宠购物中心", "猫咪餐厅", "汪汪日料", "宠物咖啡店",
            "喵喵烧烤", "毛茸茸购物中心", "萌爪餐厅", "宠爱火锅",
            "毛孩子咖啡店", "宠物友好烧烤", "爪爪日料", "萌宠咖啡店",
            "爱宠火锅", "汪汪餐厅", "猫咪购物中心", "宠物友好日料",
            "喵喵咖啡店", "毛茸茸火锅", "萌爪购物中心", "宠爱咖啡店"
        ]

        reviews = []
        for i, shop_name in enumerate(shop_names):
            if i < 25:
                review_type = "friendly_both"
            elif i < 50:
                review_type = "friendly_indoor"
            elif i < 70:
                review_type = "friendly_outdoor"
            else:
                review_type = "forbidden"
            
            template_group = [t for t in review_templates if t["type"] == review_type][0]
            
            num_reviews = 2 if i < 6 else 1
            for j in range(num_reviews):
                template_idx = (i + j) % len(template_group["templates"])
                template = template_group["templates"][template_idx]
                content = template.replace("{shop}", shop_name)
                reviews.append({
                    "content": content,
                    "source": "dianping" if j % 2 == 0 else "xiaohongshu",
                    "shop_name": shop_name
                })

        return reviews

    def save_reviews(self, reviews: List[Dict], filename: str = "reviews.json"):
        filepath = os.path.join(self.data_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(reviews, f, ensure_ascii=False, indent=2)
        print(f"评论已保存到 {filepath}")

    def load_reviews(self, filename: str = "reviews.json") -> List[Dict]:
        filepath = os.path.join(self.data_dir, filename)
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        return []


if __name__ == "__main__":
    spider = PetCommentSpider(headless=False)
    reviews = spider.get_mock_reviews()
    print(f"获取到 {len(reviews)} 条评论")
    for r in reviews[:10]:
        print(f"- [{r['source']}] {r['shop_name']}: {r['content'][:50]}...")
