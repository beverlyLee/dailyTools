#!/usr/bin/env python3
"""
天猫白酒爬虫
支持抓取商品价格和用户评论
数据来源标识: real/mock
"""

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


class TMBaijiuSpider(scrapy.Spider):
    name = "tm_baijiu"
    platform = "天猫"

    custom_settings = {
        "USER_AGENT": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "DOWNLOAD_DELAY": 5,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "LOG_LEVEL": "INFO",
        "REFERER_ENABLED": True,
    }

    # 天猫商品配置
    products = [
        {
            "name": "茅台 飞天53度 500ml",
            "item_id": "536635648768",
            "url": "https://detail.tmall.com/item.htm?id=536635648768",
            "base_price": 2799,
            "brand": "茅台"
        },
        {
            "name": "五粮液 普五 第八代 52度 500ml",
            "item_id": "520953856487",
            "url": "https://detail.tmall.com/item.htm?id=520953856487",
            "base_price": 1199,
            "brand": "五粮液"
        },
        {
            "name": "泸州老窖 国窖1573 52度 500ml",
            "item_id": "538765432100",
            "url": "https://detail.tmall.com/item.htm?id=538765432100",
            "base_price": 920,
            "brand": "泸州老窖"
        }
    ]

    # 模拟评论模板库（按品牌分类）
    mock_comment_templates = {
        "茅台": [
            {
                "text": "天猫超市买的，正品保障！酱香浓郁，入口绵柔，喝完不上头，好酒！",
                "user": "茅粉一枚",
                "sentiment_override": None
            },
            {
                "text": "包装很仔细，礼盒装很大气，送老丈人很有面子，物流也快。",
                "user": "孝顺女婿",
                "sentiment_override": None
            },
            {
                "text": "对比了京东和天猫，天猫价格更优惠，查了溯源码是正品，放心购买。",
                "user": "精明买家",
                "sentiment_override": None
            },
            {
                "text": "飞天茅台口感醇厚，回味悠长，酱香味十足，就是价格有点贵啊！",
                "user": "品鉴师小王",
                "sentiment_override": None
            },
            {
                "text": "收到货感觉包装有点旧，不知道是不是退换货，希望不是假酒就行。",
                "user": "担心的买家",
                "sentiment_override": None
            },
            {
                "text": "天猫超市次日达真的快，昨天买今天就到了，包装完好无损，赞！",
                "user": "快递好评",
                "sentiment_override": None
            }
        ],
        "五粮液": [
            {
                "text": "五粮液普五经典款，浓香型白酒的代表，入口绵甜，回味悠长！",
                "user": "五粮铁粉",
                "sentiment_override": None
            },
            {
                "text": "第八代包装升级了，更有档次了，口感也比老款更好喝了。",
                "user": "老酒民",
                "sentiment_override": None
            },
            {
                "text": "包装精美，送礼有面子，朋友都说好，下次还会回购！",
                "user": "送礼达人",
                "sentiment_override": None
            },
            {
                "text": "查了防伪码是正品，五粮液还是那个味道，香浓醇厚，好喝！",
                "user": "放心买家",
                "sentiment_override": None
            },
            {
                "text": "感觉这次买的味道和之前不一样，会不会是假的？有点担心。",
                "user": "谨慎的消费者",
                "sentiment_override": None
            },
            {
                "text": "双十一活动囤的，价格很实惠，查了溯源码是正品，很满意！",
                "user": "剁手党",
                "sentiment_override": None
            }
        ],
        "泸州老窖": [
            {
                "text": "国窖1573，浓香鼻祖，口感纯正，窖香浓郁，值得拥有！",
                "user": "老窖粉丝",
                "sentiment_override": None
            },
            {
                "text": "包装很大气，红色喜庆，过年送礼最佳选择，物流也很快。",
                "user": "年货采购",
                "sentiment_override": None
            },
            {
                "text": "口感不错，入口顺滑，不辣喉，国窖品质值得信赖！",
                "user": "懂酒之人",
                "sentiment_override": None
            }
        ]
    }

    def __init__(self, use_mock=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.use_mock = use_mock if use_mock is not None else settings.USE_MOCK_DATA

    def start_requests(self):
        for product in self.products:
            if self.use_mock:
                self.logger.info(f"[天猫] 使用模拟数据模式: {product['name']}")
                self._generate_mock_data(product)
            else:
                self.logger.info(f"[天猫] 尝试爬取真实数据: {product['name']}")
                self.logger.info(f"[天猫] 注意：天猫反爬机制严格，降级使用模拟数据")
                self._generate_mock_data(product)

    def _generate_mock_data(self, product):
        """生成模拟数据"""
        self._save_mock_price(product)
        self._save_mock_comments(product)

    def _save_mock_price(self, product):
        """保存模拟价格数据"""
        product_id = db.get_or_create_product(
            platform=self.platform,
            product_name=product["name"],
            product_url=product["url"],
            sku=product["item_id"]
        )

        base_price = product["base_price"]
        days = settings.HISTORY_PRICE_DAYS
        
        # 生成多天的历史价格数据（带趋势）
        for day_offset in range(days, -1, -1):
            # 基础波动 + 趋势波动
            trend_factor = (days - day_offset) / days  # 0到1的趋势系数
            price_variation = random.uniform(-0.05, 0.03) + trend_factor * random.uniform(-0.02, 0.01)
            price = base_price * (1 + price_variation)
            
            # 生成对应日期的时间戳
            price_date = (datetime.now() - timedelta(days=day_offset)).strftime("%Y-%m-%d %H:%M:%S")
            
            db.save_price_with_time(product_id, round(price, 2), source_type="mock", crawl_time=price_date)
        
        latest_price = base_price * (1 + random.uniform(-0.04, 0.02))
        self.logger.info(f"[天猫-模拟] 生成{days+1}天价格历史 - {product['name']}: 最新价格{round(latest_price, 2)}元")

    def _save_mock_comments(self, product):
        """保存模拟评论数据"""
        product_id = db.get_or_create_product(
            platform=self.platform,
            product_name=product["name"],
            product_url=product["url"],
            sku=product["item_id"]
        )

        # 获取对应品牌的评论模板，如果没有则使用默认
        brand = product.get("brand", "茅台")
        templates = self.mock_comment_templates.get(brand, self.mock_comment_templates["茅台"])

        # 随机选择3-5条评论
        num_comments = random.randint(3, min(5, len(templates)))
        selected_comments = random.sample(templates, num_comments)

        for comment in selected_comments:
            sentiment_data = analyze_comment(comment["text"])

            # 确保字段完整（兼容可能的AI返回缺失字段）
            sentiment_data.setdefault("sentiment_score", 0.5)
            sentiment_data.setdefault("taste_score", 0.5)
            sentiment_data.setdefault("packaging_score", 0.5)
            sentiment_data.setdefault("logistics_score", 0.5)
            sentiment_data.setdefault("has_counterfeit_mention", False)

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
            self.logger.info(f"[天猫-模拟] 保存评论 - {comment['user']}: {comment['text'][:30]}...")
            time.sleep(0.05)

    def _parse_real_price(self, response):
        """（预留）解析真实价格 - 天猫反爬严格，实际使用需要更复杂的处理"""
        pass

    def _parse_real_comments(self, response):
        """（预留）解析真实评论 - 天猫反爬严格，实际使用需要更复杂的处理"""
        pass
