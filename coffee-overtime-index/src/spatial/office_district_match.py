import math
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field

from src.poi.coffee_shop_spider import CoffeeShop
from src.index.overtime_calculator import calculate_overtime_index, OvertimeIndexResult


@dataclass
class OfficeDistrict:
    id: str
    name: str
    city: str
    center_lng: float
    center_lat: float
    sw_lng: float
    sw_lat: float
    ne_lng: float
    ne_lat: float
    district_type: str = "tech"
    description: str = ""


@dataclass
class DistrictOvertimeResult:
    district: OfficeDistrict
    overtime_index: OvertimeIndexResult
    shops_in_district: List[CoffeeShop] = field(default_factory=list)


PRESET_DISTRICTS: List[OfficeDistrict] = [
    OfficeDistrict(
        id="beijing_houchangcun",
        name="后厂村",
        city="北京",
        center_lng=116.302,
        center_lat=40.043,
        sw_lng=116.285,
        sw_lat=40.030,
        ne_lng=116.325,
        ne_lat=40.060,
        district_type="tech",
        description="互联网公司聚集地，百度、腾讯、新浪、网易等",
    ),
    OfficeDistrict(
        id="beijing_zhongguancun",
        name="中关村",
        city="北京",
        center_lng=116.316,
        center_lat=39.984,
        sw_lng=116.295,
        sw_lat=39.970,
        ne_lng=116.340,
        ne_lat=39.998,
        district_type="tech",
        description="科技创业中心",
    ),
    OfficeDistrict(
        id="beijing_wangjing",
        name="望京",
        city="北京",
        center_lng=116.475,
        center_lat=40.003,
        sw_lng=116.455,
        sw_lat=39.990,
        ne_lng=116.495,
        ne_lat=40.020,
        district_type="tech",
        description="互联网公司第二聚集地，美团、阿里等",
    ),
    OfficeDistrict(
        id="beijing_guomao",
        name="国贸CBD",
        city="北京",
        center_lng=116.46,
        center_lat=39.909,
        sw_lng=116.440,
        sw_lat=39.895,
        ne_lng=116.475,
        ne_lat=39.925,
        district_type="finance",
        description="中央商务区，金融和外企",
    ),
    OfficeDistrict(
        id="shenzhen_kexing",
        name="科兴科学园",
        city="深圳",
        center_lng=113.945,
        center_lat=22.547,
        sw_lng=113.932,
        sw_lat=22.538,
        ne_lng=113.958,
        ne_lat=22.560,
        district_type="tech",
        description="深圳互联网加班圣地，腾讯、大疆等",
    ),
    OfficeDistrict(
        id="shenzhen_nanshan_zhiyuan",
        name="南山智园",
        city="深圳",
        center_lng=113.957,
        center_lat=22.597,
        sw_lng=113.945,
        sw_lat=22.588,
        ne_lng=113.970,
        ne_lat=22.608,
        district_type="tech",
        description="科技园区",
    ),
    OfficeDistrict(
        id="shenzhen_futian_central",
        name="福田中心区",
        city="深圳",
        center_lng=114.062,
        center_lat=22.543,
        sw_lng=114.045,
        sw_lat=22.530,
        ne_lng=114.080,
        ne_lat=22.558,
        district_type="finance",
        description="深圳金融中心",
    ),
    OfficeDistrict(
        id="shanghai_lujiazui",
        name="陆家嘴",
        city="上海",
        center_lng=121.505,
        center_lat=31.240,
        sw_lng=121.490,
        sw_lat=31.228,
        ne_lng=121.525,
        ne_lat=31.252,
        district_type="finance",
        description="上海金融中心",
    ),
    OfficeDistrict(
        id="shanghai_zhangjiang",
        name="张江高科技园区",
        city="上海",
        center_lng=121.59,
        center_lat=31.205,
        sw_lng=121.572,
        sw_lat=31.192,
        ne_lng=121.608,
        ne_lat=31.220,
        district_type="tech",
        description="上海科技园区",
    ),
    OfficeDistrict(
        id="hangzhou_binjiang",
        name="滨江高新区",
        city="杭州",
        center_lng=120.21,
        center_lat=30.206,
        sw_lng=120.192,
        sw_lat=30.192,
        ne_lng=120.228,
        ne_lat=30.222,
        district_type="tech",
        description="阿里、网易等互联网公司",
    ),
    OfficeDistrict(
        id="guangzhou_tianhe",
        name="天河CBD",
        city="广州",
        center_lng=113.328,
        center_lat=23.128,
        sw_lng=113.312,
        sw_lat=23.112,
        ne_lng=113.345,
        ne_lat=23.145,
        district_type="finance",
        description="广州中央商务区",
    ),
    OfficeDistrict(
        id="guangzhou_pazhou",
        name="琶洲数字经济区",
        city="广州",
        center_lng=113.358,
        center_lat=23.104,
        sw_lng=113.342,
        sw_lat=23.092,
        ne_lng=113.375,
        ne_lat=23.12,
        district_type="tech",
        description="腾讯、阿里等广州总部",
    ),
    OfficeDistrict(
        id="chengdu_tianfu",
        name="天府软件园",
        city="成都",
        center_lng=104.065,
        center_lat=30.545,
        sw_lng=104.050,
        sw_lat=30.532,
        ne_lng=104.082,
        ne_lat=30.558,
        district_type="tech",
        description="成都软件产业基地",
    ),
    OfficeDistrict(
        id="wuhan_guanggu",
        name="光谷",
        city="武汉",
        center_lng=114.407,
        center_lat=30.476,
        sw_lng=114.390,
        sw_lat=30.462,
        ne_lng=114.425,
        ne_lat=30.490,
        district_type="tech",
        description="武汉光谷科技园区",
    ),
]


def is_shop_in_district(shop: CoffeeShop, district: OfficeDistrict) -> bool:
    return (
        district.sw_lng <= shop.longitude <= district.ne_lng
        and district.sw_lat <= shop.latitude <= district.ne_lat
    )


def match_shops_to_district(
    shops: List[CoffeeShop], district: OfficeDistrict
) -> List[CoffeeShop]:
    return [shop for shop in shops if is_shop_in_district(shop, district)]


def calculate_district_overtime(
    shops: List[CoffeeShop], district: OfficeDistrict
) -> DistrictOvertimeResult:
    shops_in = match_shops_to_district(shops, district)
    result = calculate_overtime_index(
        shops_in,
        district.sw_lng,
        district.sw_lat,
        district.ne_lng,
        district.ne_lat,
    )
    return DistrictOvertimeResult(
        district=district,
        overtime_index=result,
        shops_in_district=shops_in,
    )


def calculate_all_districts(
    shops: List[CoffeeShop], districts: Optional[List[OfficeDistrict]] = None
) -> List[DistrictOvertimeResult]:
    if districts is None:
        districts = PRESET_DISTRICTS

    results = []
    for district in districts:
        result = calculate_district_overtime(shops, district)
        results.append(result)

    results.sort(key=lambda x: x.overtime_index.overtime_index, reverse=True)
    return results


def get_districts_by_city(city: str) -> List[OfficeDistrict]:
    return [d for d in PRESET_DISTRICTS if d.city == city]


def get_all_cities() -> List[str]:
    cities = sorted(set(d.city for d in PRESET_DISTRICTS))
    return cities
