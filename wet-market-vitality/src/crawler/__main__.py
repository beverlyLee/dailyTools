"""
菜市场爬虫命令行入口

用法:
    python -m src.crawler.market_spider [--city 上海] [--headless]

环境要求:
    pip install playwright
    python -m playwright install chromium
"""

import argparse
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crawler.market_spider import MarketSpider


def main():
    parser = argparse.ArgumentParser(description="大众点评菜市场数据爬虫")
    parser.add_argument("--city", default="上海", help="城市名称，默认上海")
    parser.add_argument("--headless", action="store_true", help="无头模式运行")
    parser.add_argument("--output", default=None, help="输出文件名，默认 {城市}_markets.json")
    args = parser.parse_args()

    print(f"🚀 开始爬取 {args.city} 的菜市场数据...")
    print(f"   模式: {'无头' if args.headless else '有头'}")

    spider = MarketSpider(city=args.city, headless=args.headless)
    results = asyncio.run(spider.start())

    print(f"\n✅ 爬取完成，共 {len(results)} 家商户")

    if args.output:
        spider.save_results(args.output)
    else:
        spider.save_results()

    if results:
        print("\n📊 前 5 条结果:")
        for i, m in enumerate(results[:5]):
            print(f"  {i+1}. {m['name']}")
            print(f"     人均: ¥{m['avg_price']} | 评论: {m['review_count']}")
            print(f"     营业时间: {m['business_hours'] or '未知'}")
            print(f"     早市: {'是' if m['opens_early'] else '否'}")


if __name__ == "__main__":
    main()
