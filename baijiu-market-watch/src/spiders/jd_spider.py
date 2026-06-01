import scrapy
import json
import random
import time
from datetime import datetime, timedelta
from typing import List, Dict
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from src.database import db
from src.sentiment.comment_analyzer import analyze_comment
from config.settings import settings


class JDBaijiuSpider(scrapy.Spider):
    name = "jd_baijiu"

    custom_settings = {
        "USER_AGENT": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "DOWNLOAD_DELAY": 3,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "LOG_LEVEL": "INFO",
    }

    products = [
        {
            "name": "茅台 飞天53度 500ml",
            "sku": "100012043978",
            "url": "https://item.jd.com/100012043978.html",
            "base_price": 2680
        },
        {
            "name": "五粮液 普五 第八代 52度 500ml",
            "sku": "100006301303",
            "url": "https://item.jd.com/100006301303.html",
            "base_price": 1099
        }
    ]

    def __init__(self, use_mock=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.use_mock = use_mock if use_mock is not None else settings.USE_MOCK_DATA

    def start_requests(self):
        for product in self.products:
            if self.use_mock:
                self.logger.info(f"使用模拟数据模式: {product['name']}")
                self._generate_mock_data(product)
            else:
                self.logger.info(f"开始爬取真实数据: {product['name']}")
                price_url = f"https://p.3.cn/prices/mgets?skuIds=J_{product['sku']}"
                comment_url = f"https://club.jd.com/comment/productPageComments.action?productId={product['sku']}&score=0&sortType=5&page=0&pageSize=10"

                yield scrapy.Request(
                    price_url,
                    callback=self.parse_price,
                    meta={"product": product},
                    headers=self._get_headers()
                )

                yield scrapy.Request(
                    comment_url,
                    callback=self.parse_comments,
                    meta={"product": product},
                    headers=self._get_headers()
                )

    def _get_headers(self) -> Dict:
        return {
            "Referer": "https://www.jd.com/",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }

    def parse_price(self, response):
        product = response.meta["product"]
        self.logger.info(f"解析价格: {product['name']}")

        try:
            data = json.loads(response.text)
            if data and len(data) > 0:
                price = float(data[0].get("p", 0))
                if price > 0:
                    product_id = db.get_or_create_product(
                        platform="京东",
                        product_name=product["name"],
                        product_url=product["url"],
                        sku=product["sku"]
                    )
                    db.save_price(product_id, price, source_type="real")
                    self.logger.info(f"保存真实价格 - {product['name']}: {price}元")
                else:
                    self._save_mock_price(product)
        except Exception as e:
            self.logger.error(f"解析价格失败: {e}")
            self._save_mock_price(product)

    def parse_comments(self, response):
        product = response.meta["product"]
        self.logger.info(f"解析评论: {product['name']}")

        try:
            data = json.loads(response.text)
            comments = data.get("comments", [])

            if not comments:
                self._save_mock_comments(product)
                return

            product_id = db.get_or_create_product(
                platform="京东",
                product_name=product["name"],
                product_url=product["url"],
                sku=product["sku"]
            )

            for comment in comments:
                comment_text = comment.get("content", "")
                if comment_text:
                    sentiment_data = analyze_comment(comment_text)
                    db.save_comment(
                        product_id=product_id,
                        comment_text=comment_text,
                        comment_user=comment.get("nickname", ""),
                        comment_time=comment.get("creationTime", ""),
                        sentiment_data=sentiment_data,
                        source_type="real"
                    )
                    self.logger.info(f"分析评论 - {comment_text[:50]}...")

        except Exception as e:
            self.logger.error(f"解析评论失败: {e}")
            self._save_mock_comments(product)

    def _generate_mock_data(self, product):
        self._save_mock_price(product)
        self._save_mock_comments(product)

    def _save_mock_price(self, product):
        product_id = db.get_or_create_product(
            platform="京东",
            product_name=product["name"],
            product_url=product["url"],
            sku=product["sku"]
        )

        base_price = product["base_price"]
        days = settings.HISTORY_PRICE_DAYS
        
        # 生成多天的历史价格数据（带趋势）
        for day_offset in range(days, -1, -1):
            # 基础波动 + 趋势波动
            trend_factor = (days - day_offset) / days  # 0到1的趋势系数
            price_variation = random.uniform(-100, 50) + trend_factor * random.uniform(-50, 30)
            price = base_price + price_variation
            
            # 生成对应日期的时间戳
            price_date = (datetime.now() - timedelta(days=day_offset)).strftime("%Y-%m-%d %H:%M:%S")
            
            # 保存价格并指定时间（需要修改数据库save_price方法支持自定义时间）
            db.save_price_with_time(product_id, round(price, 2), source_type="mock", crawl_time=price_date)
        
        latest_price = base_price + random.uniform(-80, 40)
        self.logger.info(f"[模拟数据] 生成{days+1}天价格历史 - {product['name']}: 最新价格{round(latest_price, 2)}元")

    def _save_mock_comments(self, product):
        product_id = db.get_or_create_product(
            platform="京东",
            product_name=product["name"],
            product_url=product["url"],
            sku=product["sku"]
        )

        mock_comments = [
            {
                "text": "口感醇厚，酱香味十足，包装精美，物流很快，正品无疑！",
                "user": "白酒爱好者",
                "sentiment_override": None
            },
            {
                "text": "酒的品质很好，入口绵柔，不辣喉，第二天不上头，非常满意。",
                "user": "老酒民",
                "sentiment_override": None
            },
            {
                "text": "包装很严实，没有破损，京东物流就是快，第二天就到了。",
                "user": "网购达人",
                "sentiment_override": None
            },
            {
                "text": "多次购买了，品质稳定，价格合理，推荐购买。",
                "user": "回头客",
                "sentiment_override": None
            },
            {
                "text": "感觉这次的酒有点问题，口感不对，会不会是假酒？",
                "user": "谨慎买家",
                "sentiment_override": None
            },
            {
                "text": "包装有点简陋，酒还没喝，希望是正品。",
                "user": "新手买家",
                "sentiment_override": None
            },
            {
                "text": "物流给力，上午下单下午到，包装很精美，送礼有面子。",
                "user": "送礼达人",
                "sentiment_override": None
            },
            {
                "text": "酒质没得说，飞天茅台yyds，就是价格有点贵，希望多搞活动。",
                "user": "茅台粉丝",
                "sentiment_override": None
            },
            {
                "text": "五粮液普五经典款，口感浓香型，回味悠长，好喝！",
                "user": "五粮粉丝",
                "sentiment_override": None
            },
            {
                "text": "收到货了，包装完好，查了防伪是正品，放心了。",
                "user": "细心买家",
                "sentiment_override": None
            }
        ]

        for comment in mock_comments:
            sentiment_data = analyze_comment(comment["text"])
            if comment["sentiment_override"]:
                sentiment_data.update(comment["sentiment_override"])

            db.save_comment(
                product_id=product_id,
                comment_text=comment["text"],
                comment_user=comment["user"],
                comment_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                sentiment_data=sentiment_data,
                source_type="mock"
            )
            self.logger.info(f"[模拟数据] 保存评论 - {comment['text'][:30]}...")
            time.sleep(0.05)
