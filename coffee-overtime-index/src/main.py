import os
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from src.poi.coffee_shop_spider import CoffeeShop, GAODE_POI_KEY, grid_search_coffee_shops
from src.index.overtime_calculator import OvertimeIndexResult
from src.spatial.office_district_match import (
    OfficeDistrict,
    DistrictOvertimeResult,
    PRESET_DISTRICTS,
    calculate_all_districts,
    calculate_district_overtime,
    get_all_cities,
    get_districts_by_city,
)
from data.mock_data_generator import load_mock_data, generate_mock_shops_for_district

app = FastAPI(title="咖啡加班指数 API", version="1.0.0")

_static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.exists(_static_dir):
    app.mount("/static", StaticFiles(directory=_static_dir), name="static")


class CoffeeShopSchema(BaseModel):
    id: str
    name: str
    brand: str
    address: str
    longitude: float
    latitude: float
    business_hours: str
    is_open_late: bool


class OfficeDistrictSchema(BaseModel):
    id: str
    name: str
    city: str
    center_lng: float
    center_lat: float
    sw_lng: float
    sw_lat: float
    ne_lng: float
    ne_lat: float
    district_type: str
    description: str


class OvertimeIndexSchema(BaseModel):
    overtime_index: float
    density_score: float
    late_night_ratio: float
    total_shops: int
    late_night_shops: int
    area_km2: float
    brand_distribution: Dict[str, int]
    late_night_brand_distribution: Dict[str, int]


class DistrictOvertimeSchema(BaseModel):
    district: OfficeDistrictSchema
    overtime_index: OvertimeIndexSchema


def _shop_to_schema(shop: CoffeeShop) -> CoffeeShopSchema:
    return CoffeeShopSchema(
        id=shop.id,
        name=shop.name,
        brand=shop.brand,
        address=shop.address,
        longitude=shop.longitude,
        latitude=shop.latitude,
        business_hours=shop.business_hours,
        is_open_late=shop.is_open_late,
    )


def _district_to_schema(district: OfficeDistrict) -> OfficeDistrictSchema:
    return OfficeDistrictSchema(
        id=district.id,
        name=district.name,
        city=district.city,
        center_lng=district.center_lng,
        center_lat=district.center_lat,
        sw_lng=district.sw_lng,
        sw_lat=district.sw_lat,
        ne_lng=district.ne_lng,
        ne_lat=district.ne_lat,
        district_type=district.district_type,
        description=district.description,
    )


def _overtime_to_schema(result: OvertimeIndexResult) -> OvertimeIndexSchema:
    return OvertimeIndexSchema(
        overtime_index=result.overtime_index,
        density_score=result.density_score,
        late_night_ratio=result.late_night_ratio,
        total_shops=result.total_shops,
        late_night_shops=result.late_night_shops,
        area_km2=result.area_km2,
        brand_distribution=result.brand_distribution,
        late_night_brand_distribution=result.late_night_brand_distribution,
    )


def _district_result_to_schema(result: DistrictOvertimeResult) -> DistrictOvertimeSchema:
    return DistrictOvertimeSchema(
        district=_district_to_schema(result.district),
        overtime_index=_overtime_to_schema(result.overtime_index),
    )


_cached_mock_shops = None


def _get_shops(use_real: bool = False) -> List[CoffeeShop]:
    global _cached_mock_shops
    if use_real and GAODE_POI_KEY:
        return []
    if _cached_mock_shops is None:
        _cached_mock_shops = load_mock_data()
    return _cached_mock_shops


@app.get("/")
async def root():
    index_path = os.path.join(_static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "咖啡加班指数 API", "version": "1.0.0"}


@app.get("/api/cities")
async def get_cities() -> List[str]:
    return get_all_cities()


@app.get("/api/districts")
async def get_districts(city: Optional[str] = Query(None, description="城市名称，不填则返回全部")) -> List[OfficeDistrictSchema]:
    if city:
        districts = get_districts_by_city(city)
    else:
        districts = PRESET_DISTRICTS
    return [_district_to_schema(d) for d in districts]


@app.get("/api/overtime")
async def get_overtime_index(
    city: Optional[str] = Query(None, description="城市名称，不填则返回全部"),
    use_real_data: bool = Query(False, description="是否使用真实高德数据，默认使用模拟数据"),
) -> List[DistrictOvertimeSchema]:
    shops = _get_shops(use_real=use_real_data)

    if city:
        districts = get_districts_by_city(city)
    else:
        districts = PRESET_DISTRICTS

    results = []
    for district in districts:
        district_shops = [s for s in shops if district.sw_lng <= s.longitude <= district.ne_lng
                          and district.sw_lat <= s.latitude <= district.ne_lat]
        result = calculate_district_overtime(district_shops, district)
        results.append(result)

    results.sort(key=lambda x: x.overtime_index.overtime_index, reverse=True)
    return [_district_result_to_schema(r) for r in results]


@app.get("/api/overtime/{district_id}")
async def get_district_overtime(
    district_id: str,
    use_real_data: bool = Query(False, description="是否使用真实高德数据"),
) -> DistrictOvertimeSchema:
    district = next((d for d in PRESET_DISTRICTS if d.id == district_id), None)
    if not district:
        raise HTTPException(status_code=404, detail="商务区不存在")

    shops = _get_shops(use_real=use_real_data)
    district_shops = [s for s in shops if district.sw_lng <= s.longitude <= district.ne_lng
                      and district.sw_lat <= s.latitude <= district.ne_lat]
    result = calculate_district_overtime(district_shops, district)
    return _district_result_to_schema(result)


@app.get("/api/districts/{district_id}/shops")
async def get_district_shops(
    district_id: str,
    use_real_data: bool = Query(False, description="是否使用真实高德数据"),
) -> List[CoffeeShopSchema]:
    district = next((d for d in PRESET_DISTRICTS if d.id == district_id), None)
    if not district:
        raise HTTPException(status_code=404, detail="商务区不存在")

    shops = _get_shops(use_real=use_real_data)
    district_shops = [s for s in shops if district.sw_lng <= s.longitude <= district.ne_lng
                      and district.sw_lat <= s.latitude <= district.ne_lat]
    return [_shop_to_schema(s) for s in district_shops]


@app.get("/api/has_gaode_key")
async def has_gaode_key() -> Dict[str, bool]:
    return {"has_key": bool(GAODE_POI_KEY)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
