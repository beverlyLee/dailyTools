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
        mock_data = [
            {
                "content": "这家咖啡馆真的太棒了！可以带狗狗进去，店员还给准备了宠物专用水碗，太贴心了！",
                "source": "dianping",
                "shop_name": "Paw Coffee 爪爪咖啡馆"
            },
            {
                "content": "周末带猫主子来探店，店员态度超好，还给了小零食，完全不排斥宠物！",
                "source": "xiaohongshu",
                "shop_name": "Paw Coffee 爪爪咖啡馆"
            },
            {
                "content": "宠物友好认证！户外区和室内都可以带狗狗，有免费尿垫提供，强烈推荐！",
                "source": "dianping",
                "shop_name": "毛孩子乐园餐厅"
            },
            {
                "content": "带金毛来吃饭，店员主动给了水碗和零食，还专门收拾了一块区域，服务满分！",
                "source": "xiaohongshu",
                "shop_name": "毛孩子乐园餐厅"
            },
            {
                "content": "这家餐厅明确禁止宠物入内，只能放在门口的笼子里，不太方便。",
                "source": "xiaohongshu",
                "shop_name": "传统美食餐厅"
            },
            {
                "content": "打电话咨询过了，店家说不允许带宠物，建议放在门口的临时寄存处。",
                "source": "dianping",
                "shop_name": "传统美食餐厅"
            },
            {
                "content": "商场的宠物政策很友好，大部分店铺都允许进入，还提供宠物推车租赁。",
                "source": "dianping",
                "shop_name": "阳光购物中心"
            },
            {
                "content": "周末带柯基逛商场，服务台免费借了宠物推车，逛了一下午都没问题！",
                "source": "xiaohongshu",
                "shop_name": "阳光购物中心"
            },
            {
                "content": "室外露台允许带狗狗，但是室内不行，天气好的时候来坐坐还不错。",
                "source": "xiaohongshu",
                "shop_name": "露台花园餐厅"
            },
            {
                "content": "仅限户外区可以带宠物，室内用餐区禁止宠物进入，需要注意。",
                "source": "dianping",
                "shop_name": "露台花园餐厅"
            },
            {
                "content": "猫咪主题咖啡馆太赞了！店里有好多可爱的猫咪，也可以带自己的猫来玩，有专门的宠物区和尿垫。",
                "source": "xiaohongshu",
                "shop_name": "猫咪主题咖啡馆"
            },
            {
                "content": "带自家布偶来打卡，店员很热情，给了猫咪零食和水碗，还有专门的猫咪玩耍区域！",
                "source": "dianping",
                "shop_name": "猫咪主题咖啡馆"
            }
        ]
        if shop_name:
            return [r for r in mock_data if r["shop_name"] == shop_name]
        return mock_data

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
    for r in reviews:
        print(f"- [{r['source']}] {r['content'][:50]}...")
