import argparse
import asyncio
import sys
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import router
from src.economics.hedonic_model import HedonicModel
from src.real_estate.house_spider import HouseSpider
from src.real_estate.school_spider import SchoolSpider
from src.spatial.district_matcher import DistrictMatcher

app = FastAPI(title="学区溢价分析系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "学区溢价分析系统 API", "docs": "/docs"}


def run_pipeline(city: str = "beijing", district: str = "haidian"):
    print(f"[1/4] 爬取学校划片数据 ({city})...")
    spider = SchoolSpider()
    schools = asyncio.run(spider.crawl_schools(city))
    print(f"  获取到 {len(schools)} 所学校")

    print(f"[2/4] 爬取二手房成交数据 ({district})...")
    house_spider = HouseSpider()
    houses = asyncio.run(house_spider.crawl_district(district, max_pages=2))
    print(f"  获取到 {len(houses)} 条成交记录")

    print("[3/4] 空间匹配与溢价计算...")
    matcher = DistrictMatcher(schools)
    matcher.load_schools(schools)

    if not houses:
        print("  使用内置模拟数据进行演示...")
        model = HedonicModel()
        premium_results = model._generate_synthetic_premiums()
    else:
        houses = matcher.enrich_houses_with_coords(houses)
        district_flags = matcher.match_all(houses)
        model = HedonicModel()
        fit_result = model.fit(houses, district_flags)
        print(f"  模型 R²={fit_result.get('r_squared', 'N/A')}")
        premium_results = model.compute_premium(houses, district_flags)

    print("[4/4] 计算学区溢价统计...")
    stats = DistrictMatcher.compute_district_premium_stats(premium_results, schools)
    for s in stats:
        print(f"  {s['school_name']}: 溢价率 {s['avg_premium_pct']}%, 均价 {s['avg_unit_price']}元/m²")

    print("\n✅ 数据处理完成！启动 API 服务...")
    return premium_results, stats


def main():
    parser = argparse.ArgumentParser(description="学区溢价分析系统")
    parser.add_argument("--city", default="beijing", help="城市")
    parser.add_argument("--district", default="haidian", help="区域")
    parser.add_argument("--skip-crawl", action="store_true", help="跳过爬虫，使用缓存数据")
    parser.add_argument("--host", default="0.0.0.0", help="API 服务地址")
    parser.add_argument("--port", type=int, default=8000, help="API 服务端口")
    args = parser.parse_args()

    if not args.skip_crawl:
        run_pipeline(args.city, args.district)
    else:
        print("跳过爬虫，使用缓存数据...")
        schools = SchoolSpider.load_cached(args.city)
        premium_results = HedonicModel.load_results()
        if not premium_results:
            model = HedonicModel()
            premium_results = model._generate_synthetic_premiums()
        stats = DistrictMatcher.compute_district_premium_stats(premium_results, schools)

    print(f"\n🚀 启动 API 服务: http://{args.host}:{args.port}")
    print(f"📖 API 文档: http://{args.host}:{args.port}/docs")
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
