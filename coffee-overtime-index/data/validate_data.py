"""
数据验证脚本 - 检查所有商务区的模拟数据质量
验证政务区的加班指数和深夜营业比例是否达标
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from data.mock_data_generator import generate_all_mock_shops
from src.spatial.office_district_match import PRESET_DISTRICTS
from src.index.overtime_calculator import calculate_overtime_index

MIN_LATE_RATIO_GOVERNMENT = 8.0
MIN_OVERTIME_INDEX_GOVERNMENT = 8.0


def validate_districts(shops=None):
    if shops is None:
        shops = generate_all_mock_shops()

    district_shops = {}
    for shop in shops:
        for d in PRESET_DISTRICTS:
            if shop.id.startswith(d.id + "_"):
                district_shops.setdefault(d.id, []).append(shop)
                break

    results = []
    failed = []

    for d in PRESET_DISTRICTS:
        d_shops = district_shops.get(d.id, [])
        idx = calculate_overtime_index(
            d_shops, d.sw_lng, d.sw_lat, d.ne_lng, d.ne_lat
        )

        is_gov = d.district_type == "government"
        late_ok = idx.late_night_ratio >= MIN_LATE_RATIO_GOVERNMENT if is_gov else True
        index_ok = idx.overtime_index >= MIN_OVERTIME_INDEX_GOVERNMENT if is_gov else True

        all_ok = late_ok and index_ok

        result = {
            "id": d.id,
            "name": d.name,
            "city": d.city,
            "type": d.district_type,
            "total_shops": idx.total_shops,
            "late_shops": idx.late_night_shops,
            "late_ratio": idx.late_night_ratio,
            "density_score": idx.density_score,
            "overtime_index": idx.overtime_index,
            "area_km2": idx.area_km2,
            "late_ratio_ok": late_ok,
            "index_ok": index_ok,
            "all_ok": all_ok,
        }
        results.append(result)

        if is_gov and not all_ok:
            failed.append(result)

    return results, failed


def print_report():
    results, failed = validate_districts()

    print("=" * 70)
    print(" 咖啡加班指数 - 数据质量验证报告")
    print("=" * 70)
    print()

    gov_count = sum(1 for r in results if r["type"] == "government")
    gov_pass = sum(1 for r in results if r["type"] == "government" and r["all_ok"])
    total = len(results)

    print(f" 总商务区数量: {total} 个")
    print(f" 政务区数量:   {gov_count} 个")
    print(f" 政务区达标:   {gov_pass}/{gov_count}")
    print()

    if failed:
        print("-" * 70)
        print(" ❌ 不合格政务区列表")
        print("-" * 70)
        for r in failed:
            late_status = "✓" if r["late_ratio_ok"] else "✗"
            idx_status = "✓" if r["index_ok"] else "✗"
            print(f"  [{r['city']}] {r['name']}")
            print(f"    店铺: {r['total_shops']}家 | 深夜营业: {r['late_shops']}家")
            print(f"    深夜比例: {r['late_ratio']:.1f}% {late_status} (≥{MIN_LATE_RATIO_GOVERNMENT}%)")
            print(f"    加班指数: {r['overtime_index']:.1f} {idx_status} (≥{MIN_OVERTIME_INDEX_GOVERNMENT})")
            print()
    else:
        print(" ✅ 所有政务区数据质量达标！")
        print()

    print("-" * 70)
    print(" 📊 各城市政务区详情")
    print("-" * 70)
    print()

    cities = {}
    for r in results:
        if r["type"] == "government":
            cities.setdefault(r["city"], []).append(r)

    for city in sorted(cities.keys()):
        for r in cities[city]:
            status = "✅" if r["all_ok"] else "❌"
            print(
                f"  {status} {city} - {r['name']}: "
                f"指数={r['overtime_index']:.1f}, "
                f"深夜={r['late_ratio']:.1f}%, "
                f"店铺={r['total_shops']}家"
            )

    print()
    print("=" * 70)

    return len(failed) == 0


if __name__ == "__main__":
    all_pass = print_report()
    sys.exit(0 if all_pass else 1)
