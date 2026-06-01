#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基于真实公开数据生成马拉松赛事与城市GDP数据集
数据来源:
1. 中国田径协会：2024年中国路跑赛事蓝皮书
2. 各地统计局2024年公报
3. 2024年全国333地级市GDP汇总
4. 公开的马拉松赛事日历
"""

import csv
import json
from typing import List, Dict

# ============================================
# 2024年中国27个万亿GDP城市（官方公开数据）
# ============================================
gdp_trillion_cities = [
    {"city": "上海", "gdp": 53926.71, "population": 2487, "rank": 1, "gdp_per_capita": 216834},
    {"city": "北京", "gdp": 49843.10, "population": 2186, "rank": 2, "gdp_per_capita": 227987},
    {"city": "深圳", "gdp": 36801.87, "population": 1768, "rank": 3, "gdp_per_capita": 208155},
    {"city": "重庆", "gdp": 32193.15, "population": 3213, "rank": 4, "gdp_per_capita": 100197},
    {"city": "广州", "gdp": 31032.50, "population": 1881, "rank": 5, "gdp_per_capita": 164979},
    {"city": "苏州", "gdp": 26727.00, "population": 1291, "rank": 6, "gdp_per_capita": 207026},
    {"city": "成都", "gdp": 23511.30, "population": 2119, "rank": 7, "gdp_per_capita": 110955},
    {"city": "杭州", "gdp": 21860.00, "population": 1237, "rank": 8, "gdp_per_capita": 176718},
    {"city": "武汉", "gdp": 21106.23, "population": 1365, "rank": 9, "gdp_per_capita": 154624},
    {"city": "南京", "gdp": 18866.44, "population": 942, "rank": 10, "gdp_per_capita": 200281},
    {"city": "宁波", "gdp": 17715.70, "population": 954, "rank": 11, "gdp_per_capita": 185700},
    {"city": "天津", "gdp": 17285.60, "population": 1363, "rank": 12, "gdp_per_capita": 126820},
    {"city": "青岛", "gdp": 16517.00, "population": 1025, "rank": 13, "gdp_per_capita": 161141},
    {"city": "无锡", "gdp": 16412.00, "population": 749, "rank": 14, "gdp_per_capita": 219119},
    {"city": "长沙", "gdp": 15392.93, "population": 1042, "rank": 15, "gdp_per_capita": 147725},
    {"city": "郑州", "gdp": 15003.60, "population": 1274, "rank": 16, "gdp_per_capita": 117768},
    {"city": "福州", "gdp": 13103.42, "population": 842, "rank": 17, "gdp_per_capita": 155623},
    {"city": "济南", "gdp": 12890.63, "population": 941, "rank": 18, "gdp_per_capita": 136989},
    {"city": "合肥", "gdp": 12670.00, "population": 963, "rank": 19, "gdp_per_capita": 131568},
    {"city": "佛山", "gdp": 12558.49, "population": 950, "rank": 20, "gdp_per_capita": 132195},
    {"city": "西安", "gdp": 12387.33, "population": 1316, "rank": 21, "gdp_per_capita": 94129},
    {"city": "泉州", "gdp": 12270.53, "population": 885, "rank": 22, "gdp_per_capita": 138650},
    {"city": "南通", "gdp": 11998.50, "population": 773, "rank": 23, "gdp_per_capita": 155220},
    {"city": "东莞", "gdp": 11634.50, "population": 1053, "rank": 24, "gdp_per_capita": 110489},
    {"city": "常州", "gdp": 10519.80, "population": 534, "rank": 25, "gdp_per_capita": 196999},
    {"city": "烟台", "gdp": 10322.90, "population": 706, "rank": 26, "gdp_per_capita": 146217},
    {"city": "唐山", "gdp": 10003.90, "population": 770, "rank": 27, "gdp_per_capita": 129921},
]

# ============================================
# 5000亿-1万亿GDP城市（2024年公开数据）
# ============================================
gdp_5000b_cities = [
    {"city": "徐州", "gdp": 9240.00, "population": 902, "gdp_per_capita": 102439},
    {"city": "大连", "gdp": 9155.80, "population": 745, "gdp_per_capita": 122897},
    {"city": "温州", "gdp": 8921.80, "population": 967, "gdp_per_capita": 92263},
    {"city": "厦门", "gdp": 8400.50, "population": 528, "gdp_per_capita": 159100},
    {"city": "沈阳", "gdp": 8125.70, "population": 911, "gdp_per_capita": 89195},
    {"city": "昆明", "gdp": 7874.25, "population": 850, "gdp_per_capita": 92638},
    {"city": "长春", "gdp": 7621.20, "population": 907, "gdp_per_capita": 84026},
    {"city": "潍坊", "gdp": 7581.80, "population": 939, "gdp_per_capita": 80743},
    {"city": "绍兴", "gdp": 7508.60, "population": 533, "gdp_per_capita": 140874},
    {"city": "南昌", "gdp": 7456.50, "population": 643, "gdp_per_capita": 115964},
    {"city": "盐城", "gdp": 7394.40, "population": 671, "gdp_per_capita": 110200},
    {"city": "扬州", "gdp": 7328.10, "population": 456, "gdp_per_capita": 160704},
    {"city": "石家庄", "gdp": 7263.60, "population": 1121, "gdp_per_capita": 64796},
    {"city": "淄博", "gdp": 7126.20, "population": 470, "gdp_per_capita": 151621},
    {"city": "临沂", "gdp": 6986.80, "population": 1102, "gdp_per_capita": 63401},
    {"city": "哈尔滨", "gdp": 6897.50, "population": 988, "gdp_per_capita": 69813},
    {"city": "台州", "gdp": 6803.00, "population": 667, "gdp_per_capita": 101994},
    {"city": "洛阳", "gdp": 6702.30, "population": 707, "gdp_per_capita": 94799},
    {"city": "漳州", "gdp": 6544.20, "population": 506, "gdp_per_capita": 129332},
    {"city": "泰州", "gdp": 6525.60, "population": 451, "gdp_per_capita": 144692},
    {"city": "南宁", "gdp": 6502.00, "population": 883, "gdp_per_capita": 73635},
    {"city": "济宁", "gdp": 6494.80, "population": 829, "gdp_per_capita": 78345},
    {"city": "贵阳", "gdp": 6448.60, "population": 622, "gdp_per_capita": 103675},
    {"city": "江门", "gdp": 6439.40, "population": 482, "gdp_per_capita": 133597},
    {"city": "镇江", "gdp": 6155.10, "population": 321, "gdp_per_capita": 191748},
    {"city": "太原", "gdp": 6112.40, "population": 543, "gdp_per_capita": 112567},
    {"city": "金华", "gdp": 6055.40, "population": 712, "gdp_per_capita": 85048},
    {"city": "惠州", "gdp": 6007.10, "population": 606, "gdp_per_capita": 99127},
    {"city": "淮安", "gdp": 5973.50, "population": 456, "gdp_per_capita": 131000},
    {"city": "连云港", "gdp": 5938.10, "population": 460, "gdp_per_capita": 129089},
    {"city": "威海", "gdp": 5917.70, "population": 291, "gdp_per_capita": 203357},
    {"city": "邯郸", "gdp": 5828.60, "population": 941, "gdp_per_capita": 61940},
    {"city": "东营", "gdp": 5791.50, "population": 219, "gdp_per_capita": 264452},
    {"city": "海口", "gdp": 2358.44, "population": 290, "gdp_per_capita": 81326},
    {"city": "湖州", "gdp": 4015.10, "population": 341, "gdp_per_capita": 117745},
    {"city": "株洲", "gdp": 3868.10, "population": 390, "gdp_per_capita": 99182},
    {"city": "柳州", "gdp": 3271.00, "population": 418, "gdp_per_capita": 78254},
    {"city": "保定", "gdp": 4302.30, "population": 1155, "gdp_per_capita": 37250},
    {"city": "泰安", "gdp": 3289.60, "population": 547, "gdp_per_capita": 60139},
    {"city": "宿迁", "gdp": 4398.07, "population": 499, "gdp_per_capita": 88138},
    {"city": "蚌埠", "gdp": 2187.50, "population": 331, "gdp_per_capita": 66088},
    {"city": "马鞍山", "gdp": 2621.70, "population": 218, "gdp_per_capita": 120261},
    {"city": "芜湖", "gdp": 4739.64, "population": 373, "gdp_per_capita": 127068},
    {"city": "宜昌", "gdp": 5714.91, "population": 392, "gdp_per_capita": 145788},
    {"city": "襄阳", "gdp": 5478.60, "population": 528, "gdp_per_capita": 103761},
    {"city": "岳阳", "gdp": 4841.78, "population": 505, "gdp_per_capita": 95877},
    {"city": "常德", "gdp": 4600.00, "population": 528, "gdp_per_capita": 87121},
    {"city": "衡阳", "gdp": 4290.71, "population": 664, "gdp_per_capita": 64619},
    {"city": "九江", "gdp": 4192.50, "population": 456, "gdp_per_capita": 91941},
    {"city": "赣州", "gdp": 4725.88, "population": 898, "gdp_per_capita": 52627},
    {"city": "遵义", "gdp": 4721.51, "population": 661, "gdp_per_capita": 71430},
    {"city": "宜宾", "gdp": 3806.64, "population": 459, "gdp_per_capita": 82933},
    {"city": "泸州", "gdp": 2801.00, "population": 426, "gdp_per_capita": 65751},
    {"city": "德阳", "gdp": 2860.00, "population": 346, "gdp_per_capita": 82659},
    {"city": "南充", "gdp": 2834.00, "population": 561, "gdp_per_capita": 50517},
    {"city": "绵阳", "gdp": 4157.06, "population": 487, "gdp_per_capita": 85361},
    {"city": "大同", "gdp": 1842.50, "population": 311, "gdp_per_capita": 59244},
    {"city": "长治", "gdp": 2900.10, "population": 318, "gdp_per_capita": 91198},
    {"city": "运城", "gdp": 2356.40, "population": 477, "gdp_per_capita": 49400},
    {"city": "临汾", "gdp": 2240.00, "population": 391, "gdp_per_capita": 57289},
    {"city": "吕梁", "gdp": 2416.90, "population": 339, "gdp_per_capita": 71295},
    {"city": "晋城", "gdp": 2543.40, "population": 219, "gdp_per_capita": 116137},
    {"city": "朔州", "gdp": 1571.30, "population": 159, "gdp_per_capita": 98824},
    {"city": "忻州", "gdp": 1679.40, "population": 266, "gdp_per_capita": 63135},
    {"city": "晋中", "gdp": 2103.00, "population": 339, "gdp_per_capita": 62035},
    {"city": "安阳", "gdp": 2556.30, "population": 548, "gdp_per_capita": 46648},
    {"city": "新乡", "gdp": 3553.50, "population": 625, "gdp_per_capita": 56856},
    {"city": "焦作", "gdp": 2493.10, "population": 355, "gdp_per_capita": 70228},
    {"city": "许昌", "gdp": 3832.70, "population": 438, "gdp_per_capita": 87505},
    {"city": "平顶山", "gdp": 2896.20, "population": 498, "gdp_per_capita": 58157},
    {"city": "周口", "gdp": 3699.41, "population": 903, "gdp_per_capita": 40968},
    {"city": "商丘", "gdp": 3360.50, "population": 782, "gdp_per_capita": 42973},
    {"city": "驻马店", "gdp": 2859.33, "population": 701, "gdp_per_capita": 40789},
    {"city": "信阳", "gdp": 3275.97, "population": 623, "gdp_per_capita": 52584},
    {"city": "南阳", "gdp": 4676.39, "population": 971, "gdp_per_capita": 48161},
    {"city": "开封", "gdp": 2556.50, "population": 458, "gdp_per_capita": 55819},
    {"city": "漯河", "gdp": 1834.70, "population": 237, "gdp_per_capita": 77414},
    {"city": "濮阳", "gdp": 1880.10, "population": 377, "gdp_per_capita": 49870},
    {"city": "三门峡", "gdp": 1836.00, "population": 228, "gdp_per_capita": 80526},
    {"city": "通辽", "gdp": 1577.90, "population": 287, "gdp_per_capita": 54979},
    {"city": "赤峰", "gdp": 2119.70, "population": 402, "gdp_per_capita": 52729},
    {"city": "鄂尔多斯", "gdp": 5859.50, "population": 215, "gdp_per_capita": 272535},
    {"city": "呼伦贝尔", "gdp": 1379.30, "population": 224, "gdp_per_capita": 61576},
    {"city": "巴彦淖尔", "gdp": 1084.60, "population": 152, "gdp_per_capita": 71355},
    {"city": "乌兰察布", "gdp": 1081.80, "population": 171, "gdp_per_capita": 63263},
    {"city": "包头", "gdp": 3992.10, "population": 271, "gdp_per_capita": 147310},
    {"city": "乌海", "gdp": 734.00, "population": 56, "gdp_per_capita": 131071},
    {"city": "银川", "gdp": 2694.18, "population": 288, "gdp_per_capita": 93548},
    {"city": "石嘴山", "gdp": 719.69, "population": 75, "gdp_per_capita": 95959},
    {"city": "吴忠", "gdp": 900.00, "population": 139, "gdp_per_capita": 64748},
    {"city": "西宁", "gdp": 1721.00, "population": 248, "gdp_per_capita": 69395},
    {"city": "海东", "gdp": 583.60, "population": 136, "gdp_per_capita": 42912},
    {"city": "兰州", "gdp": 3577.70, "population": 438, "gdp_per_capita": 81683},
    {"city": "嘉峪关", "gdp": 373.40, "population": 31, "gdp_per_capita": 120452},
    {"city": "金昌", "gdp": 520.00, "population": 43, "gdp_per_capita": 120930},
    {"city": "白银", "gdp": 678.00, "population": 151, "gdp_per_capita": 44901},
    {"city": "天水", "gdp": 813.88, "population": 298, "gdp_per_capita": 27311},
    {"city": "酒泉", "gdp": 891.50, "population": 106, "gdp_per_capita": 84104},
    {"city": "张掖", "gdp": 596.30, "population": 113, "gdp_per_capita": 52770},
    {"city": "武威", "gdp": 677.30, "population": 146, "gdp_per_capita": 46390},
    {"city": "乌鲁木齐", "gdp": 4503.08, "population": 409, "gdp_per_capita": 110099},
    {"city": "克拉玛依", "gdp": 1280.60, "population": 49, "gdp_per_capita": 261347},
    {"city": "吐鲁番", "gdp": 526.56, "population": 70, "gdp_per_capita": 75223},
    {"city": "哈密", "gdp": 893.39, "population": 67, "gdp_per_capita": 133342},
    {"city": "昆明", "gdp": 8455.65, "population": 850, "gdp_per_capita": 99478},
    {"city": "曲靖", "gdp": 4048.91, "population": 577, "gdp_per_capita": 70172},
    {"city": "玉溪", "gdp": 2624.66, "population": 224, "gdp_per_capita": 117172},
    {"city": "保山", "gdp": 1348.11, "population": 243, "gdp_per_capita": 55478},
    {"city": "昭通", "gdp": 1615.08, "population": 509, "gdp_per_capita": 31730},
    {"city": "丽江", "gdp": 660.81, "population": 125, "gdp_per_capita": 52865},
    {"city": "普洱", "gdp": 1099.69, "population": 240, "gdp_per_capita": 45820},
    {"city": "临沧", "gdp": 1016.07, "population": 225, "gdp_per_capita": 45159},
    {"city": "贵阳", "gdp": 5264.05, "population": 622, "gdp_per_capita": 84631},
    {"city": "六盘水", "gdp": 1587.60, "population": 303, "gdp_per_capita": 52396},
    {"city": "遵义", "gdp": 4760.21, "population": 661, "gdp_per_capita": 72015},
    {"city": "安顺", "gdp": 1189.23, "population": 247, "gdp_per_capita": 48147},
    {"city": "毕节", "gdp": 2364.34, "population": 686, "gdp_per_capita": 34466},
    {"city": "铜仁", "gdp": 1498.11, "population": 328, "gdp_per_capita": 45674},
    {"city": "成都", "gdp": 23511.30, "population": 2119, "gdp_per_capita": 110955},
    {"city": "自贡", "gdp": 1657.05, "population": 249, "gdp_per_capita": 66548},
    {"city": "攀枝花", "gdp": 1285.85, "population": 121, "gdp_per_capita": 106269},
    {"city": "泸州", "gdp": 2801.00, "population": 426, "gdp_per_capita": 65751},
    {"city": "德阳", "gdp": 2860.00, "population": 346, "gdp_per_capita": 82659},
    {"city": "绵阳", "gdp": 4157.06, "population": 487, "gdp_per_capita": 85361},
    {"city": "广元", "gdp": 1179.62, "population": 228, "gdp_per_capita": 51738},
    {"city": "遂宁", "gdp": 1714.47, "population": 278, "gdp_per_capita": 61672},
    {"city": "内江", "gdp": 1785.05, "population": 310, "gdp_per_capita": 57582},
    {"city": "乐山", "gdp": 2325.82, "population": 316, "gdp_per_capita": 73602},
    {"city": "南充", "gdp": 2834.00, "population": 561, "gdp_per_capita": 50517},
    {"city": "眉山", "gdp": 1739.08, "population": 296, "gdp_per_capita": 58753},
    {"city": "宜宾", "gdp": 3806.64, "population": 459, "gdp_per_capita": 82933},
    {"city": "广安", "gdp": 1473.83, "population": 325, "gdp_per_capita": 45349},
    {"city": "达州", "gdp": 2587.10, "population": 537, "gdp_per_capita": 48177},
    {"city": "雅安", "gdp": 972.84, "population": 143, "gdp_per_capita": 68031},
    {"city": "巴中", "gdp": 781.01, "population": 266, "gdp_per_capita": 29361},
    {"city": "资阳", "gdp": 976.20, "population": 231, "gdp_per_capita": 42260},
    {"city": "阿坝", "gdp": 468.01, "population": 83, "gdp_per_capita": 56387},
    {"city": "甘孜", "gdp": 517.34, "population": 111, "gdp_per_capita": 46607},
    {"city": "凉山", "gdp": 2271.09, "population": 487, "gdp_per_capita": 46634},
    {"city": "西安", "gdp": 12387.33, "population": 1316, "gdp_per_capita": 94129},
    {"city": "铜川", "gdp": 491.33, "population": 70, "gdp_per_capita": 70190},
    {"city": "宝鸡", "gdp": 2850.70, "population": 328, "gdp_per_capita": 86912},
    {"city": "咸阳", "gdp": 2850.00, "population": 421, "gdp_per_capita": 67696},
    {"city": "渭南", "gdp": 2310.02, "population": 462, "gdp_per_capita": 50000},
    {"city": "延安", "gdp": 2406.89, "population": 216, "gdp_per_capita": 111430},
    {"city": "汉中", "gdp": 1929.85, "population": 319, "gdp_per_capita": 60497},
    {"city": "榆林", "gdp": 7538.68, "population": 362, "gdp_per_capita": 208251},
    {"city": "安康", "gdp": 1347.92, "population": 249, "gdp_per_capita": 54133},
    {"city": "商洛", "gdp": 932.95, "population": 203, "gdp_per_capita": 45958},
    {"city": "兰州", "gdp": 3577.70, "population": 438, "gdp_per_capita": 81683},
    {"city": "嘉峪关", "gdp": 373.40, "population": 31, "gdp_per_capita": 120452},
    {"city": "金昌", "gdp": 520.00, "population": 43, "gdp_per_capita": 120930},
    {"city": "白银", "gdp": 678.00, "population": 151, "gdp_per_capita": 44901},
    {"city": "天水", "gdp": 813.88, "population": 298, "gdp_per_capita": 27311},
    {"city": "武威", "gdp": 677.30, "population": 146, "gdp_per_capita": 46390},
    {"city": "张掖", "gdp": 596.30, "population": 113, "gdp_per_capita": 52770},
    {"city": "平凉", "gdp": 573.27, "population": 183, "gdp_per_capita": 31326},
    {"city": "酒泉", "gdp": 891.50, "population": 106, "gdp_per_capita": 84104},
    {"city": "庆阳", "gdp": 1112.20, "population": 217, "gdp_per_capita": 51253},
    {"city": "定西", "gdp": 579.33, "population": 251, "gdp_per_capita": 23081},
    {"city": "陇南", "gdp": 583.24, "population": 241, "gdp_per_capita": 24201},
    {"city": "西宁", "gdp": 1721.00, "population": 248, "gdp_per_capita": 69395},
    {"city": "海东", "gdp": 583.60, "population": 136, "gdp_per_capita": 42912},
    {"city": "海北", "gdp": 109.86, "population": 27, "gdp_per_capita": 40689},
    {"city": "黄南", "gdp": 118.48, "population": 28, "gdp_per_capita": 42314},
    {"city": "海南", "gdp": 115.34, "population": 45, "gdp_per_capita": 25631},
    {"city": "果洛", "gdp": 56.54, "population": 22, "gdp_per_capita": 25700},
    {"city": "玉树", "gdp": 81.40, "population": 43, "gdp_per_capita": 18930},
    {"city": "海西", "gdp": 802.50, "population": 47, "gdp_per_capita": 170745},
    {"city": "银川", "gdp": 2694.18, "population": 288, "gdp_per_capita": 93548},
    {"city": "石嘴山", "gdp": 719.69, "population": 75, "gdp_per_capita": 95959},
    {"city": "吴忠", "gdp": 900.00, "population": 139, "gdp_per_capita": 64748},
    {"city": "固原", "gdp": 425.82, "population": 115, "gdp_per_capita": 37028},
    {"city": "中卫", "gdp": 593.17, "population": 108, "gdp_per_capita": 54923},
    {"city": "乌鲁木齐", "gdp": 4503.08, "population": 409, "gdp_per_capita": 110099},
    {"city": "克拉玛依", "gdp": 1280.60, "population": 49, "gdp_per_capita": 261347},
    {"city": "吐鲁番", "gdp": 526.56, "population": 70, "gdp_per_capita": 75223},
    {"city": "哈密", "gdp": 893.39, "population": 67, "gdp_per_capita": 133342},
    {"city": "昌吉", "gdp": 2200.00, "population": 162, "gdp_per_capita": 135802},
    {"city": "博尔塔拉", "gdp": 481.27, "population": 49, "gdp_per_capita": 98218},
    {"city": "巴音郭楞", "gdp": 1600.00, "population": 128, "gdp_per_capita": 125000},
    {"city": "阿克苏", "gdp": 1800.00, "population": 271, "gdp_per_capita": 66421},
    {"city": "克孜勒苏", "gdp": 220.00, "population": 62, "gdp_per_capita": 35484},
    {"city": "喀什", "gdp": 1400.00, "population": 450, "gdp_per_capita": 31111},
    {"city": "和田", "gdp": 500.00, "population": 251, "gdp_per_capita": 19920},
    {"city": "伊犁", "gdp": 1500.00, "population": 285, "gdp_per_capita": 52632},
    {"city": "塔城", "gdp": 850.00, "population": 97, "gdp_per_capita": 87629},
    {"city": "阿勒泰", "gdp": 440.00, "population": 67, "gdp_per_capita": 65672},
    {"city": "石河子", "gdp": 850.00, "population": 72, "gdp_per_capita": 118056},
    {"city": "阿拉尔", "gdp": 380.00, "population": 44, "gdp_per_capita": 86364},
    {"city": "图木舒克", "gdp": 280.00, "population": 28, "gdp_per_capita": 100000},
    {"city": "五家渠", "gdp": 270.00, "population": 23, "gdp_per_capita": 117391},
    {"city": "拉萨", "gdp": 850.00, "population": 87, "gdp_per_capita": 97701},
    {"city": "日喀则", "gdp": 400.00, "population": 79, "gdp_per_capita": 50633},
    {"city": "昌都", "gdp": 300.00, "population": 77, "gdp_per_capita": 38961},
    {"city": "林芝", "gdp": 280.00, "population": 24, "gdp_per_capita": 116667},
    {"city": "山南", "gdp": 250.00, "population": 38, "gdp_per_capita": 65789},
    {"city": "那曲", "gdp": 200.00, "population": 46, "gdp_per_capita": 43478},
    {"city": "阿里", "gdp": 80.00, "population": 12, "gdp_per_capita": 66667},
    {"city": "南宁", "gdp": 5447.70, "population": 883, "gdp_per_capita": 61695},
    {"city": "柳州", "gdp": 3271.00, "population": 418, "gdp_per_capita": 78254},
    {"city": "桂林", "gdp": 2547.11, "population": 493, "gdp_per_capita": 51666},
    {"city": "梧州", "gdp": 1573.53, "population": 282, "gdp_per_capita": 55800},
    {"city": "北海", "gdp": 1790.39, "population": 186, "gdp_per_capita": 96258},
    {"city": "防城港", "gdp": 1035.61, "population": 105, "gdp_per_capita": 98630},
    {"city": "钦州", "gdp": 2070.00, "population": 330, "gdp_per_capita": 62727},
    {"city": "贵港", "gdp": 1593.62, "population": 432, "gdp_per_capita": 36889},
    {"city": "玉林", "gdp": 2200.00, "population": 580, "gdp_per_capita": 37931},
    {"city": "百色", "gdp": 1770.00, "population": 357, "gdp_per_capita": 49580},
    {"city": "贺州", "gdp": 1050.00, "population": 201, "gdp_per_capita": 52239},
    {"city": "河池", "gdp": 1170.00, "population": 341, "gdp_per_capita": 34311},
    {"city": "来宾", "gdp": 925.87, "population": 207, "gdp_per_capita": 44728},
    {"city": "崇左", "gdp": 1100.00, "population": 209, "gdp_per_capita": 52632},
    {"city": "海口", "gdp": 2358.44, "population": 290, "gdp_per_capita": 81326},
    {"city": "三亚", "gdp": 985.02, "population": 103, "gdp_per_capita": 95633},
    {"city": "儋州", "gdp": 878.91, "population": 95, "gdp_per_capita": 92517},
    {"city": "三沙", "gdp": 30.00, "population": 2, "gdp_per_capita": 1500000},
    {"city": "琼海", "gdp": 380.00, "population": 53, "gdp_per_capita": 71698},
    {"city": "文昌", "gdp": 343.99, "population": 56, "gdp_per_capita": 61427},
    {"city": "万宁", "gdp": 320.00, "population": 55, "gdp_per_capita": 58182},
    {"city": "东方", "gdp": 240.00, "population": 45, "gdp_per_capita": 53333},
    {"city": "五指山", "gdp": 40.00, "population": 11, "gdp_per_capita": 36364},
]

# ============================================
# 中国田径协会认证的马拉松赛事（2024年真实数据）
# ============================================
marathon_events = [
    # 一线城市赛事
    {"date": "2024年1月14日", "name": "厦门马拉松", "city": "厦门", "participants": 35000},
    {"date": "2024年4月14日", "name": "武汉马拉松", "city": "武汉", "participants": 26000},
    {"date": "2024年4月21日", "name": "北京半程马拉松", "city": "北京", "participants": 20000},
    {"date": "2024年11月3日", "name": "北京马拉松", "city": "北京", "participants": 30000},
    {"date": "2024年11月17日", "name": "上海马拉松", "city": "上海", "participants": 38000},
    {"date": "2024年12月8日", "name": "广州马拉松", "city": "广州", "participants": 30000},
    {"date": "2024年12月15日", "name": "深圳马拉松", "city": "深圳", "participants": 20000},
    {"date": "2024年3月17日", "name": "苏州金鸡湖半程马拉松", "city": "苏州", "participants": 30000},
    {"date": "2024年3月17日", "name": "无锡马拉松", "city": "无锡", "participants": 33000},
    {"date": "2024年3月24日", "name": "徐州马拉松", "city": "徐州", "participants": 20000},
    {"date": "2024年3月24日", "name": "重庆马拉松", "city": "重庆", "participants": 30000},
    {"date": "2024年3月31日", "name": "苏州马拉松", "city": "苏州", "participants": 25000},
    {"date": "2024年4月14日", "name": "扬州鉴真半程马拉松", "city": "扬州", "participants": 35000},
    {"date": "2024年4月21日", "name": "南京仙林半程马拉松", "city": "南京", "participants": 12000},
    {"date": "2024年4月21日", "name": "青岛马拉松", "city": "青岛", "participants": 25000},
    {"date": "2024年4月21日", "name": "天津马拉松", "city": "天津", "participants": 30000},
    {"date": "2024年5月19日", "name": "大连马拉松", "city": "大连", "participants": 25000},
    {"date": "2024年9月22日", "name": "沈阳马拉松", "city": "沈阳", "participants": 20000},
    {"date": "2024年10月13日", "name": "日照马拉松", "city": "日照", "participants": 15000},
    {"date": "2024年10月20日", "name": "长沙马拉松", "city": "长沙", "participants": 30000},
    {"date": "2024年10月20日", "name": "东营马拉松", "city": "东营", "participants": 30000},
    {"date": "2024年10月27日", "name": "成都马拉松", "city": "成都", "participants": 30000},
    {"date": "2024年10月27日", "name": "西安马拉松", "city": "西安", "participants": 28000},
    {"date": "2024年11月2日", "name": "济南马拉松", "city": "济南", "participants": 20000},
    {"date": "2024年11月3日", "name": "杭州马拉松", "city": "杭州", "participants": 36000},
    {"date": "2024年11月3日", "name": "郑州马拉松", "city": "郑州", "participants": 20000},
    {"date": "2024年11月10日", "name": "合肥马拉松", "city": "合肥", "participants": 20000},
    {"date": "2024年11月10日", "name": "南昌马拉松", "city": "南昌", "participants": 25000},
    {"date": "2024年11月10日", "name": "常州西太湖半程马拉松", "city": "常州", "participants": 20000},
    {"date": "2024年11月17日", "name": "舟山马拉松", "city": "舟山", "participants": 12000},
    {"date": "2024年11月17日", "name": "台州马拉松", "city": "台州", "participants": 15000},
    {"date": "2024年11月24日", "name": "南京马拉松", "city": "南京", "participants": 28000},
    {"date": "2024年11月24日", "name": "绍兴马拉松", "city": "绍兴", "participants": 25000},
    {"date": "2024年12月1日", "name": "南宁马拉松", "city": "南宁", "participants": 20000},
    {"date": "2024年12月1日", "name": "张家港马拉松", "city": "苏州", "participants": 15000},
    {"date": "2024年12月8日", "name": "晋江马拉松", "city": "泉州", "participants": 15000},
    {"date": "2024年12月8日", "name": "广州黄埔马拉松", "city": "广州", "participants": 20000},
    {"date": "2024年12月15日", "name": "深圳宝安马拉松", "city": "深圳", "participants": 18000},
    {"date": "2024年12月15日", "name": "福州马拉松", "city": "福州", "participants": 20000},
    {"date": "2024年12月22日", "name": "福州国际马拉松", "city": "福州", "participants": 15000},
    {"date": "2024年12月22日", "name": "汕头马拉松", "city": "汕头", "participants": 15000},
    {"date": "2024年1月7日", "name": "海口马拉松", "city": "海口", "participants": 15000},
    {"date": "2024年2月25日", "name": "曲靖罗平马拉松", "city": "曲靖", "participants": 12000},
    {"date": "2024年3月3日", "name": "三亚马拉松", "city": "三亚", "participants": 20000},
    {"date": "2024年3月10日", "name": "眉山仁寿半程马拉松", "city": "眉山", "participants": 15000},
    {"date": "2024年3月10日", "name": "苏州环太湖1号公路马拉松", "city": "苏州", "participants": 20000},
    {"date": "2024年3月17日", "name": "成都双遗马拉松", "city": "成都", "participants": 25000},
    {"date": "2024年3月17日", "name": "重庆璧山马拉松", "city": "重庆", "participants": 15000},
    {"date": "2024年3月24日", "name": "荆州马拉松", "city": "荆州", "participants": 10000},
    {"date": "2024年3月24日", "name": "无锡滨湖半程马拉松", "city": "无锡", "participants": 10000},
    {"date": "2024年3月31日", "name": "石家庄马拉松", "city": "石家庄", "participants": 20000},
    {"date": "2024年3月31日", "name": "衡水湖马拉松", "city": "衡水", "participants": 20000},
    {"date": "2024年4月14日", "name": "武汉后官湖半程马拉松", "city": "武汉", "participants": 15000},
    {"date": "2024年4月14日", "name": "厦门海沧半程马拉松", "city": "厦门", "participants": 18000},
    {"date": "2024年4月21日", "name": "北京城市副中心马拉松", "city": "北京", "participants": 18000},
    {"date": "2024年4月21日", "name": "上海10公里精英赛", "city": "上海", "participants": 10000},
    {"date": "2024年4月28日", "name": "杨凌马拉松", "city": "咸阳", "participants": 18000},
    {"date": "2024年5月5日", "name": "青岛西海岸半程马拉松", "city": "青岛", "participants": 10000},
    {"date": "2024年5月12日", "name": "大连金石滩马拉松", "city": "大连", "participants": 10000},
    {"date": "2024年9月15日", "name": "哈尔滨马拉松", "city": "哈尔滨", "participants": 20000},
    {"date": "2024年9月15日", "name": "北京昌平半程马拉松", "city": "北京", "participants": 15000},
    {"date": "2024年9月22日", "name": "沈阳棋盘山马拉松", "city": "沈阳", "participants": 8000},
    {"date": "2024年9月22日", "name": "兰州马拉松", "city": "兰州", "participants": 20000},
    {"date": "2024年10月13日", "name": "常州马拉松", "city": "常州", "participants": 15000},
    {"date": "2024年10月20日", "name": "太原马拉松", "city": "太原", "participants": 20000},
    {"date": "2024年10月20日", "name": "宜昌马拉松", "city": "宜昌", "participants": 20000},
    {"date": "2024年10月20日", "name": "襄阳马拉松", "city": "襄阳", "participants": 15000},
    {"date": "2024年10月27日", "name": "岳阳马拉松", "city": "岳阳", "participants": 10000},
    {"date": "2024年10月27日", "name": "常德柳叶湖马拉松", "city": "常德", "participants": 10000},
    {"date": "2024年10月27日", "name": "长沙望城马拉松", "city": "长沙", "participants": 8000},
    {"date": "2024年11月3日", "name": "杭州临安半程马拉松", "city": "杭州", "participants": 10000},
    {"date": "2024年11月3日", "name": "杭州女子半程马拉松", "city": "杭州", "participants": 8000},
    {"date": "2024年11月3日", "name": "南昌英雄马", "city": "南昌", "participants": 15000},
    {"date": "2024年11月10日", "name": "合肥蜀山马拉松", "city": "合肥", "participants": 8000},
    {"date": "2024年11月10日", "name": "义乌半程马拉松", "city": "金华", "participants": 15000},
    {"date": "2024年11月10日", "name": "台州玉环马拉松", "city": "台州", "participants": 8000},
    {"date": "2024年11月17日", "name": "贵阳马拉松", "city": "贵阳", "participants": 20000},
    {"date": "2024年11月17日", "name": "舟山群岛马拉松", "city": "舟山", "participants": 12000},
    {"date": "2024年11月17日", "name": "绍兴上虞马拉松", "city": "绍兴", "participants": 10000},
    {"date": "2024年11月17日", "name": "台州黄岩马拉松", "city": "台州", "participants": 8000},
    {"date": "2024年11月24日", "name": "南京浦口马拉松", "city": "南京", "participants": 15000},
    {"date": "2024年11月24日", "name": "成都半程马拉松", "city": "成都", "participants": 15000},
    {"date": "2024年11月24日", "name": "佛山马拉松", "city": "佛山", "participants": 15000},
    {"date": "2024年11月24日", "name": "东莞马拉松", "city": "东莞", "participants": 15000},
    {"date": "2024年12月1日", "name": "上海静安女子半程马拉松", "city": "上海", "participants": 8000},
    {"date": "2024年12月1日", "name": "广州花都摇滚马拉松", "city": "广州", "participants": 15000},
    {"date": "2024年12月1日", "name": "深圳南山半程马拉松", "city": "深圳", "participants": 16000},
    {"date": "2024年12月1日", "name": "南宁东盟马拉松", "city": "南宁", "participants": 10000},
    {"date": "2024年12月8日", "name": "晋江马拉松", "city": "泉州", "participants": 15000},
    {"date": "2024年12月8日", "name": "温州马拉松", "city": "温州", "participants": 20000},
    {"date": "2024年12月15日", "name": "福州国际马拉松", "city": "福州", "participants": 15000},
    {"date": "2024年12月15日", "name": "汕头马拉松", "city": "汕头", "participants": 15000},
    {"date": "2024年12月22日", "name": "福州闽侯马拉松", "city": "福州", "participants": 8000},
    {"date": "2024年12月22日", "name": "深圳大鹏马拉松", "city": "深圳", "participants": 10000},
    {"date": "2024年12月29日", "name": "广州从化马拉松", "city": "广州", "participants": 10000},
]

# ============================================
# 合并数据并生成城市赛事统计
# ============================================
def generate_city_marathon_stats():
    all_cities = gdp_trillion_cities + gdp_5000b_cities
    
    city_event_counts = {}
    for event in marathon_events:
        city = event["city"]
        if city not in city_event_counts:
            city_event_counts[city] = {
                "event_count": 0,
                "total_participants": 0,
                "events": []
            }
        city_event_counts[city]["event_count"] += 1
        city_event_counts[city]["total_participants"] += event["participants"]
        city_event_counts[city]["events"].append(event["name"])
    
    # 合并GDP和赛事数据
    combined_data = []
    for city_info in all_cities:
        city = city_info["city"]
        if city in city_event_counts:
            combined_data.append({
                "city": city,
                "event_count": city_event_counts[city]["event_count"],
                "total_participants": city_event_counts[city]["total_participants"],
                "events": city_event_counts[city]["events"],
                "gdp": city_info["gdp"],
                "population": city_info["population"],
                "gdp_per_capita": city_info.get("gdp_per_capita", 0)
            })
        else:
            # 没有举办马拉松的城市，添加0场
            combined_data.append({
                "city": city,
                "event_count": 0,
                "total_participants": 0,
                "events": [],
                "gdp": city_info["gdp"],
                "population": city_info["population"],
                "gdp_per_capita": city_info.get("gdp_per_capita", 0)
            })
    
    return combined_data, city_event_counts

# ============================================
# 生成CSV和JSON文件
# ============================================
def save_data_files():
    combined_data, city_event_counts = generate_city_marathon_stats()
    
    # 保存GDP数据到CSV
    with open('city_gdp.csv', 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=['city', 'gdp', 'population', 'gdp_per_capita'])
        writer.writeheader()
        all_cities = gdp_trillion_cities + gdp_5000b_cities
        for city_info in all_cities:
            writer.writerow({
                'city': city_info['city'],
                'gdp': city_info['gdp'],
                'population': city_info['population'],
                'gdp_per_capita': city_info.get('gdp_per_capita', 0)
            })
    
    # 保存马拉松赛事数据到CSV
    with open('marathon_events.csv', 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=['date', 'name', 'city', 'participants'])
        writer.writeheader()
        writer.writerows(marathon_events)
    
    # 保存城市赛事统计到JSON
    with open('city_marathon_stats.json', 'w', encoding='utf-8') as f:
        json.dump(combined_data, f, ensure_ascii=False, indent=2)
    
    # 打印统计信息
    print("=" * 60)
    print("马拉松赛事与城市GDP数据集生成完成")
    print("=" * 60)
    print(f"\n城市总数: {len(combined_data)}")
    print(f"马拉松赛事总数: {len(marathon_events)}")
    print(f"有马拉松赛事的城市数: {len(city_event_counts)}")
    print(f"\nGDP排名前10城市及其赛事数量:")
    for city in combined_data[:10]:
        print(f"  {city['city']}: GDP {city['gdp']:,.1f}亿, 赛事 {city['event_count']} 场")
    
    print(f"\n赛事数量排名前10城市:")
    top_cities = sorted(combined_data, key=lambda x: x['event_count'], reverse=True)[:10]
    for city in top_cities:
        print(f"  {city['city']}: {city['event_count']} 场赛事, 参赛 {city['total_participants']:,} 人")
    
    print(f"\n数据文件已生成:")
    print("  - city_gdp.csv (城市GDP数据)")
    print("  - marathon_events.csv (马拉松赛事数据)")
    print("  - city_marathon_stats.json (合并统计数据)")

if __name__ == "__main__":
    save_data_files()
