from fastapi import APIRouter, Query

from src.economics.hedonic_model import HedonicModel
from src.real_estate.house_spider import HouseSpider
from src.real_estate.school_spider import SchoolSpider
from src.spatial.district_matcher import DistrictMatcher


router = APIRouter()


@router.get("/schools")
async def get_schools(city: str = Query(default="beijing", description="城市")):
    schools = SchoolSpider.load_cached(city)
    return {"schools": schools, "count": len(schools)}


@router.get("/houses")
async def get_houses(district: str = Query(default="haidian", description="区域")):
    houses = HouseSpider.load_cached(district)
    return {"houses": houses, "count": len(houses)}


@router.get("/premium")
async def get_premium():
    results = HedonicModel.load_results()
    return {"premiums": results, "count": len(results)}


@router.get("/district-stats")
async def get_district_stats(city: str = Query(default="beijing")):
    import json
    from pathlib import Path

    data_dir = Path(__file__).resolve().parent.parent / "data"
    stats_path = data_dir / "district_stats.json"
    if stats_path.exists():
        stats = json.loads(stats_path.read_text(encoding="utf-8"))
    else:
        schools = SchoolSpider.load_cached(city)
        premium_results = HedonicModel.load_results()
        if not premium_results:
            model = HedonicModel()
            premium_results = model._generate_synthetic_premiums()
        stats = DistrictMatcher.compute_district_premium_stats(premium_results, schools)
    return {"districts": stats, "count": len(stats)}


@router.post("/crawl/houses")
async def crawl_houses(district: str = Query(default="haidian"), max_pages: int = Query(default=3)):
    spider = HouseSpider()
    results = await spider.crawl_district(district, max_pages)
    return {"houses": results, "count": len(results)}


@router.post("/crawl/schools")
async def crawl_schools(city: str = Query(default="beijing")):
    spider = SchoolSpider()
    results = await spider.crawl_schools(city)
    return {"schools": results, "count": len(results)}


@router.post("/compute")
async def compute_premium(city: str = Query(default="beijing")):
    schools = SchoolSpider.load_cached(city)
    houses = HouseSpider.load_cached("haidian")

    matcher = DistrictMatcher(schools)
    matcher.load_schools(schools)

    if not houses:
        model = HedonicModel()
        premium_results = model._generate_synthetic_premiums()
    else:
        houses = matcher.enrich_houses_with_coords(houses)
        district_flags = matcher.match_all(houses)
        model = HedonicModel()
        model.fit(houses, district_flags)
        premium_results = model.compute_premium(houses, district_flags)

    stats = DistrictMatcher.compute_district_premium_stats(premium_results, schools)
    return {"premiums": premium_results, "districts": stats}
