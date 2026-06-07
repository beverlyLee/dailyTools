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
    polygon: List[List[float]] = field(default_factory=list)


@dataclass
class DistrictOvertimeResult:
    district: OfficeDistrict
    overtime_index: OvertimeIndexResult
    shops_in_district: List[CoffeeShop] = field(default_factory=list)


def _generate_irregular_polygon(
    center_lng: float,
    center_lat: float,
    width_lng: float,
    height_lat: float,
    seed: int = 42,
    num_points: int = 8,
) -> List[List[float]]:
    import random
    random.seed(seed + hash(f"{center_lng}_{center_lat}") % 10000)

    half_w = width_lng / 2
    half_h = height_lat / 2

    angles = [i * (2 * math.pi / num_points) for i in range(num_points)]
    points = []

    for angle in angles:
        base_x = math.cos(angle) * half_w
        base_y = math.sin(angle) * half_h

        jitter = random.uniform(0.75, 1.15)
        x = center_lng + base_x * jitter
        y = center_lat + base_y * jitter

        points.append([round(x, 6), round(y, 6)])

    return points


PRESET_DISTRICTS: List[OfficeDistrict] = [
    OfficeDistrict(
        id="beijing_houchangcun",
        name="后厂村",
        city="北京",
        center_lng=116.302,
        center_lat=40.043,
        sw_lng=116.275,
        sw_lat=40.025,
        ne_lng=116.330,
        ne_lat=40.060,
        district_type="tech",
        description="互联网公司聚集地，百度、腾讯、新浪、网易等",
        polygon=[
            [116.280, 40.032],
            [116.288, 40.026],
            [116.305, 40.027],
            [116.318, 40.030],
            [116.325, 40.040],
            [116.322, 40.052],
            [116.310, 40.058],
            [116.292, 40.056],
            [116.282, 40.048],
        ],
    ),
    OfficeDistrict(
        id="beijing_zhongguancun",
        name="中关村",
        city="北京",
        center_lng=116.316,
        center_lat=39.984,
        sw_lng=116.292,
        sw_lat=39.970,
        ne_lng=116.342,
        ne_lat=39.998,
        district_type="tech",
        description="科技创业中心",
        polygon=[
            [116.295, 39.973],
            [116.308, 39.971],
            [116.320, 39.975],
            [116.332, 39.980],
            [116.338, 39.988],
            [116.335, 39.995],
            [116.322, 39.997],
            [116.305, 39.993],
            [116.297, 39.985],
        ],
    ),
    OfficeDistrict(
        id="beijing_wangjing",
        name="望京",
        city="北京",
        center_lng=116.475,
        center_lat=40.003,
        sw_lng=116.450,
        sw_lat=39.985,
        ne_lng=116.500,
        ne_lat=40.022,
        district_type="tech",
        description="互联网公司第二聚集地，美团、阿里等",
        polygon=[
            [116.455, 39.988],
            [116.468, 39.986],
            [116.480, 39.990],
            [116.492, 39.997],
            [116.495, 40.008],
            [116.490, 40.018],
            [116.475, 40.020],
            [116.460, 40.015],
            [116.454, 40.005],
        ],
    ),
    OfficeDistrict(
        id="beijing_guomao",
        name="国贸CBD",
        city="北京",
        center_lng=116.460,
        center_lat=39.909,
        sw_lng=116.435,
        sw_lat=39.890,
        ne_lng=116.485,
        ne_lat=39.928,
        district_type="finance",
        description="中央商务区，金融和外企",
        polygon=[
            [116.440, 39.893],
            [116.455, 39.891],
            [116.470, 39.895],
            [116.480, 39.903],
            [116.482, 39.915],
            [116.475, 39.925],
            [116.458, 39.927],
            [116.442, 39.920],
            [116.438, 39.908],
        ],
    ),
    OfficeDistrict(
        id="beijing_zhengwujingkai",
        name="政务区-经开",
        city="北京",
        center_lng=116.382,
        center_lat=39.912,
        sw_lng=116.360,
        sw_lat=39.895,
        ne_lng=116.405,
        ne_lat=39.930,
        district_type="government",
        description="北京政务聚集区，机关单位集中",
        polygon=[
            [116.365, 39.898],
            [116.378, 39.896],
            [116.390, 39.900],
            [116.400, 39.908],
            [116.402, 39.918],
            [116.395, 39.927],
            [116.380, 39.928],
            [116.368, 39.922],
            [116.363, 39.912],
        ],
    ),
    OfficeDistrict(
        id="shenzhen_kexing",
        name="科兴科学园",
        city="深圳",
        center_lng=113.945,
        center_lat=22.547,
        sw_lng=113.928,
        sw_lat=22.532,
        ne_lng=113.962,
        ne_lat=22.565,
        district_type="tech",
        description="深圳互联网加班圣地，腾讯、大疆等",
        polygon=[
            [113.932, 22.536],
            [113.942, 22.534],
            [113.952, 22.538],
            [113.958, 22.546],
            [113.960, 22.556],
            [113.955, 22.562],
            [113.945, 22.564],
            [113.935, 22.560],
            [113.930, 22.550],
        ],
    ),
    OfficeDistrict(
        id="shenzhen_nanshan_zhiyuan",
        name="南山智园",
        city="深圳",
        center_lng=113.957,
        center_lat=22.597,
        sw_lng=113.940,
        sw_lat=22.585,
        ne_lng=113.975,
        ne_lat=22.610,
        district_type="tech",
        description="科技园区",
        polygon=[
            [113.944, 22.588],
            [113.954, 22.586],
            [113.964, 22.590],
            [113.970, 22.597],
            [113.972, 22.605],
            [113.966, 22.610],
            [113.955, 22.608],
            [113.945, 22.604],
            [113.942, 22.595],
        ],
    ),
    OfficeDistrict(
        id="shenzhen_futian_central",
        name="福田中心区",
        city="深圳",
        center_lng=114.035,
        center_lat=22.535,
        sw_lng=114.015,
        sw_lat=22.518,
        ne_lng=114.055,
        ne_lat=22.552,
        district_type="finance",
        description="深圳金融中心，车公庙CBD",
        polygon=[
            [114.018, 22.522],
            [114.030, 22.520],
            [114.042, 22.525],
            [114.050, 22.533],
            [114.052, 22.543],
            [114.047, 22.550],
            [114.035, 22.551],
            [114.023, 22.547],
            [114.017, 22.537],
        ],
    ),
    OfficeDistrict(
        id="shenzhen_zhengwu",
        name="市民中心政务区",
        city="深圳",
        center_lng=114.062,
        center_lat=22.547,
        sw_lng=114.048,
        sw_lat=22.538,
        ne_lng=114.076,
        ne_lat=22.558,
        district_type="government",
        description="深圳市政府及周边政务区域",
        polygon=[
            [114.052, 22.540],
            [114.060, 22.539],
            [114.068, 22.542],
            [114.074, 22.548],
            [114.073, 22.554],
            [114.066, 22.557],
            [114.057, 22.556],
            [114.051, 22.551],
            [114.050, 22.545],
        ],
    ),
    OfficeDistrict(
        id="shanghai_lujiazui",
        name="陆家嘴",
        city="上海",
        center_lng=121.505,
        center_lat=31.240,
        sw_lng=121.482,
        sw_lat=31.222,
        ne_lng=121.530,
        ne_lat=31.258,
        district_type="finance",
        description="上海金融中心",
        polygon=[
            [121.488, 31.226],
            [121.500, 31.224],
            [121.512, 31.228],
            [121.522, 31.236],
            [121.526, 31.246],
            [121.520, 31.255],
            [121.508, 31.257],
            [121.492, 31.252],
            [121.486, 31.242],
        ],
    ),
    OfficeDistrict(
        id="shanghai_zhangjiang",
        name="张江高科技园区",
        city="上海",
        center_lng=121.590,
        center_lat=31.205,
        sw_lng=121.565,
        sw_lat=31.188,
        ne_lng=121.615,
        ne_lat=31.225,
        district_type="tech",
        description="上海科技园区",
        polygon=[
            [121.572, 31.192],
            [121.584, 31.190],
            [121.596, 31.194],
            [121.608, 31.202],
            [121.612, 31.212],
            [121.605, 31.222],
            [121.590, 31.224],
            [121.575, 31.218],
            [121.570, 31.206],
        ],
    ),
    OfficeDistrict(
        id="shanghai_zhengwu",
        name="人民广场政务区",
        city="上海",
        center_lng=121.474,
        center_lat=31.231,
        sw_lng=121.458,
        sw_lat=31.218,
        ne_lng=121.490,
        ne_lat=31.242,
        district_type="government",
        description="上海市政府及人民广场周边",
        polygon=[
            [121.462, 31.221],
            [121.472, 31.220],
            [121.482, 31.224],
            [121.488, 31.232],
            [121.486, 31.240],
            [121.478, 31.243],
            [121.468, 31.240],
            [121.460, 31.234],
            [121.461, 31.226],
        ],
    ),
    OfficeDistrict(
        id="hangzhou_binjiang",
        name="滨江高新区",
        city="杭州",
        center_lng=120.210,
        center_lat=30.206,
        sw_lng=120.185,
        sw_lat=30.188,
        ne_lng=120.235,
        ne_lat=30.228,
        district_type="tech",
        description="阿里、网易等互联网公司",
        polygon=[
            [120.190, 30.192],
            [120.202, 30.190],
            [120.215, 30.195],
            [120.228, 30.203],
            [120.232, 30.214],
            [120.225, 30.225],
            [120.210, 30.227],
            [120.195, 30.220],
            [120.188, 30.208],
        ],
    ),
    OfficeDistrict(
        id="hangzhou_qianjiang",
        name="钱江新城",
        city="杭州",
        center_lng=120.212,
        center_lat=30.252,
        sw_lng=120.190,
        sw_lat=30.235,
        ne_lng=120.235,
        ne_lat=30.272,
        district_type="finance",
        description="杭州金融中心CBD",
        polygon=[
            [120.195, 30.238],
            [120.205, 30.236],
            [120.218, 30.240],
            [120.228, 30.248],
            [120.232, 30.258],
            [120.225, 30.268],
            [120.212, 30.270],
            [120.198, 30.265],
            [120.193, 30.254],
        ],
    ),
    OfficeDistrict(
        id="hangzhou_future_tech",
        name="未来科技城",
        city="杭州",
        center_lng=119.970,
        center_lat=30.285,
        sw_lng=119.945,
        sw_lat=30.268,
        ne_lng=119.995,
        ne_lat=30.305,
        district_type="tech",
        description="阿里西溪园区、梦想小镇",
        polygon=[
            [119.950, 30.272],
            [119.962, 30.270],
            [119.975, 30.275],
            [119.988, 30.283],
            [119.992, 30.294],
            [119.985, 30.302],
            [119.970, 30.304],
            [119.955, 30.298],
            [119.948, 30.286],
        ],
    ),
    OfficeDistrict(
        id="hangzhou_zhengwu",
        name="省府政务区",
        city="杭州",
        center_lng=120.155,
        center_lat=30.272,
        sw_lng=120.138,
        sw_lat=30.258,
        ne_lng=120.172,
        ne_lat=30.286,
        district_type="government",
        description="浙江省政府及周边政务区域",
        polygon=[
            [120.142, 30.261],
            [120.150, 30.260],
            [120.160, 30.263],
            [120.168, 30.270],
            [120.170, 30.278],
            [120.162, 30.284],
            [120.152, 30.285],
            [120.142, 30.280],
            [120.140, 30.272],
        ],
    ),
    OfficeDistrict(
        id="guangzhou_tianhe",
        name="天河CBD",
        city="广州",
        center_lng=113.328,
        center_lat=23.128,
        sw_lng=113.305,
        sw_lat=23.108,
        ne_lng=113.352,
        ne_lat=23.148,
        district_type="finance",
        description="广州中央商务区",
        polygon=[
            [113.310, 23.112],
            [113.322, 23.110],
            [113.335, 23.115],
            [113.345, 23.124],
            [113.348, 23.136],
            [113.340, 23.145],
            [113.325, 23.147],
            [113.312, 23.140],
            [113.308, 23.128],
        ],
    ),
    OfficeDistrict(
        id="guangzhou_pazhou",
        name="琶洲数字经济区",
        city="广州",
        center_lng=113.358,
        center_lat=23.104,
        sw_lng=113.335,
        sw_lat=23.085,
        ne_lng=113.382,
        ne_lat=23.122,
        district_type="tech",
        description="腾讯、阿里等广州总部",
        polygon=[
            [113.340, 23.088],
            [113.352, 23.086],
            [113.365, 23.092],
            [113.375, 23.100],
            [113.378, 23.112],
            [113.370, 23.120],
            [113.355, 23.121],
            [113.342, 23.115],
            [113.338, 23.103],
        ],
    ),
    OfficeDistrict(
        id="guangzhou_kexuecheng",
        name="广州科学城",
        city="广州",
        center_lng=113.472,
        center_lat=23.178,
        sw_lng=113.448,
        sw_lat=23.158,
        ne_lng=113.498,
        ne_lat=23.198,
        district_type="tech",
        description="广州开发区、高新技术产业",
        polygon=[
            [113.455, 23.162],
            [113.468, 23.160],
            [113.480, 23.166],
            [113.490, 23.174],
            [113.494, 23.185],
            [113.485, 23.195],
            [113.470, 23.196],
            [113.456, 23.190],
            [113.450, 23.178],
        ],
    ),
    OfficeDistrict(
        id="guangzhou_zhengwu",
        name="越秀政务区",
        city="广州",
        center_lng=113.270,
        center_lat=23.132,
        sw_lng=113.250,
        sw_lat=23.115,
        ne_lng=113.290,
        ne_lat=23.150,
        district_type="government",
        description="广东省政府、广州市政府周边",
        polygon=[
            [113.254, 23.118],
            [113.264, 23.116],
            [113.276, 23.120],
            [113.285, 23.128],
            [113.284, 23.138],
            [113.275, 23.147],
            [113.262, 23.148],
            [113.253, 23.142],
            [113.252, 23.132],
        ],
    ),
    OfficeDistrict(
        id="chengdu_tianfu",
        name="天府软件园",
        city="成都",
        center_lng=104.065,
        center_lat=30.545,
        sw_lng=104.042,
        sw_lat=30.528,
        ne_lng=104.090,
        ne_lat=30.565,
        district_type="tech",
        description="成都软件产业基地",
        polygon=[
            [104.048, 30.532],
            [104.058, 30.530],
            [104.070, 30.535],
            [104.082, 30.544],
            [104.086, 30.555],
            [104.078, 30.563],
            [104.065, 30.564],
            [104.050, 30.558],
            [104.045, 30.546],
        ],
    ),
    OfficeDistrict(
        id="chengdu_jincheng",
        name="金融城",
        city="成都",
        center_lng=104.065,
        center_lat=30.598,
        sw_lng=104.045,
        sw_lat=30.582,
        ne_lng=104.088,
        ne_lat=30.615,
        district_type="finance",
        description="成都金融中心",
        polygon=[
            [104.050, 30.585],
            [104.060, 30.583],
            [104.072, 30.588],
            [104.082, 30.596],
            [104.085, 30.606],
            [104.078, 30.613],
            [104.065, 30.614],
            [104.052, 30.608],
            [104.048, 30.598],
        ],
    ),
    OfficeDistrict(
        id="chengdu_chunxi",
        name="春熙路商圈",
        city="成都",
        center_lng=104.080,
        center_lat=30.653,
        sw_lng=104.060,
        sw_lat=30.638,
        ne_lng=104.100,
        ne_lat=30.670,
        district_type="finance",
        description="春熙路、太古里商业中心",
        polygon=[
            [104.065, 30.642],
            [104.075, 30.640],
            [104.088, 30.645],
            [104.096, 30.653],
            [104.098, 30.662],
            [104.090, 30.668],
            [104.078, 30.669],
            [104.065, 30.664],
            [104.062, 30.654],
        ],
    ),
    OfficeDistrict(
        id="chengdu_zhengwu",
        name="青羊政务区",
        city="成都",
        center_lng=104.030,
        center_lat=30.675,
        sw_lng=104.012,
        sw_lat=30.660,
        ne_lng=104.048,
        ne_lat=30.690,
        district_type="government",
        description="青羊区政府及政务服务中心",
        polygon=[
            [104.016, 30.663],
            [104.025, 30.662],
            [104.038, 30.666],
            [104.045, 30.672],
            [104.046, 30.682],
            [104.038, 30.688],
            [104.026, 30.689],
            [104.016, 30.684],
            [104.014, 30.674],
        ],
    ),
    OfficeDistrict(
        id="wuhan_guanggu",
        name="光谷",
        city="武汉",
        center_lng=114.407,
        center_lat=30.476,
        sw_lng=114.382,
        sw_lat=30.458,
        ne_lng=114.435,
        ne_lat=30.495,
        district_type="tech",
        description="武汉光谷科技园区",
        polygon=[
            [114.388, 30.462],
            [114.400, 30.460],
            [114.412, 30.465],
            [114.425, 30.474],
            [114.430, 30.485],
            [114.422, 30.493],
            [114.408, 30.494],
            [114.392, 30.488],
            [114.386, 30.476],
        ],
    ),
    OfficeDistrict(
        id="wuhan_cbd",
        name="武汉CBD",
        city="武汉",
        center_lng=114.265,
        center_lat=30.602,
        sw_lng=114.245,
        sw_lat=30.585,
        ne_lng=114.285,
        ne_lat=30.620,
        district_type="finance",
        description="武汉中央商务区",
        polygon=[
            [114.250, 30.588],
            [114.260, 30.586],
            [114.272, 30.592],
            [114.280, 30.600],
            [114.282, 30.610],
            [114.275, 30.618],
            [114.262, 30.619],
            [114.250, 30.614],
            [114.247, 30.604],
        ],
    ),
    OfficeDistrict(
        id="wuhan_zhongnan",
        name="中南路商圈",
        city="武汉",
        center_lng=114.338,
        center_lat=30.545,
        sw_lng=114.318,
        sw_lat=30.528,
        ne_lng=114.358,
        ne_lat=30.562,
        district_type="finance",
        description="武昌商业金融中心",
        polygon=[
            [114.322, 30.532],
            [114.332, 30.530],
            [114.345, 30.536],
            [114.354, 30.544],
            [114.356, 30.554],
            [114.348, 30.560],
            [114.335, 30.561],
            [114.323, 30.556],
            [114.320, 30.545],
        ],
    ),
    OfficeDistrict(
        id="wuhan_zhengwu",
        name="市民之家政务区",
        city="武汉",
        center_lng=114.292,
        center_lat=30.625,
        sw_lng=114.275,
        sw_lat=30.610,
        ne_lng=114.310,
        ne_lat=30.642,
        district_type="government",
        description="武汉市民之家、政务服务中心",
        polygon=[
            [114.278, 30.613],
            [114.286, 30.612],
            [114.298, 30.616],
            [114.306, 30.624],
            [114.308, 30.634],
            [114.300, 30.640],
            [114.288, 30.640],
            [114.278, 30.635],
            [114.276, 30.626],
        ],
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
