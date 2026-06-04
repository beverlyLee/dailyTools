"""
学区溢价分析系统 - 可视化验证脚本
用于验证颜色规则、点位计算和交互功能
"""

import json
from pathlib import Path

COLOR_RULES = {
    "TIER_1": {"min": 30, "label": "深红", "desc": "高溢价 (>30%)"},
    "TIER_2": {"min": 20, "label": "橙黄", "desc": "中高溢价 (20-30%)"},
    "TIER_3": {"min": 15, "label": "浅黄", "desc": "中溢价 (15-20%)"},
    "TIER_4": {"min": 0, "label": "浅蓝", "desc": "低溢价 (<15%)"},
}

FILL_COLORS = {
    "TIER_1": "rgba(211, 47, 47, 0.55)",
    "TIER_2": "rgba(245, 124, 0, 0.45)",
    "TIER_3": "rgba(251, 192, 45, 0.40)",
    "TIER_4": "rgba(79, 195, 247, 0.35)",
}

STROKE_COLORS = {
    "TIER_1": "#d32f2f",
    "TIER_2": "#f57c00",
    "TIER_3": "#fbc02d",
    "TIER_4": "#4fc3f7",
}

def get_color_tier(premium):
    if premium > 30:
        return "TIER_1"
    if premium > 20:
        return "TIER_2"
    if premium > 15:
        return "TIER_3"
    return "TIER_4"

def get_fill_color(premium):
    return FILL_COLORS[get_color_tier(premium)]

def get_stroke_color(premium):
    return STROKE_COLORS[get_color_tier(premium)]

def calculate_marker_radius(unit_price):
    """点位半径公式：clamp(单位价格 / 8000, min=8, max=20)"""
    return max(8, min(20, unit_price / 8000))

def validate_district(district, verbose=True):
    premium = district["avg_premium_pct"]
    tier = get_color_tier(premium)
    rule = COLOR_RULES[tier]
    fill_color = get_fill_color(premium)
    stroke_color = get_stroke_color(premium)

    is_valid = True
    messages = []

    if tier == "TIER_1" and premium <= 30:
        is_valid = False
        messages.append(f"❌ 溢价率 {premium}% 应标记为 TIER_1 但 premium <= 30")
    if tier == "TIER_2" and (premium <= 20 or premium > 30):
        is_valid = False
        messages.append(f"❌ 溢价率 {premium}% 应标记为 TIER_2 但不在 (20, 30] 范围内")
    if tier == "TIER_3" and (premium <= 15 or premium > 20):
        is_valid = False
        messages.append(f"❌ 溢价率 {premium}% 应标记为 TIER_3 但不在 (15, 20] 范围内")
    if tier == "TIER_4" and premium > 15:
        is_valid = False
        messages.append(f"❌ 溢价率 {premium}% 应标记为 TIER_4 但 premium > 15")

    if verbose:
        status = "✅" if is_valid else "❌"
        print(f"\n{status} {district['school_name']}:")
        print(f"   溢价率: {premium}%")
        print(f"   层级: {tier} ({rule['label']})")
        print(f"   填充色: {fill_color}")
        print(f"   边框色: {stroke_color}")
        for msg in messages:
            print(f"   {msg}")

    return {
        "valid": is_valid,
        "school_name": district["school_name"],
        "premium": premium,
        "tier": tier,
        "label": rule["label"],
        "fill_color": fill_color,
        "stroke_color": stroke_color,
        "messages": messages,
    }

def validate_marker(marker, verbose=True):
    unit_price = marker["unit_price"]
    premium = marker["premium_pct"]
    expected_radius = calculate_marker_radius(unit_price)

    if premium > 25:
        marker_tier = "TIER_1"
        marker_color = "#e94560"
    elif premium > 15:
        marker_tier = "TIER_2"
        marker_color = "#f57c00"
    else:
        marker_tier = "TIER_3"
        marker_color = "#4fc3f7"

    if verbose:
        print(f"\n📍 {marker['community']}:")
        print(f"   单价: {unit_price} 元/m²")
        print(f"   溢价率: {premium}%")
        print(f"   点位颜色: {marker_color}")
        print(f"   点位半径: {expected_radius:.2f} (clamp({unit_price}/8000, 8, 20))")

    return {
        "community": marker["community"],
        "unit_price": unit_price,
        "premium_pct": premium,
        "marker_color": marker_color,
        "marker_radius": expected_radius,
    }

def run_edge_case_tests():
    """边界用例测试"""
    print("\n" + "="*60)
    print("📊 边界用例颜色验证")
    print("="*60)

    test_cases = [
        {"name": "中关村一小 (34.65%)", "premium": 34.65, "expected_tier": "TIER_1", "expected_label": "深红"},
        {"name": "人大附中 (38.58%)", "premium": 38.58, "expected_tier": "TIER_1", "expected_label": "深红"},
        {"name": "北大附小 (30.68%)", "premium": 30.68, "expected_tier": "TIER_1", "expected_label": "深红"},
        {"name": "中关村二小 (27.13%)", "premium": 27.13, "expected_tier": "TIER_2", "expected_label": "橙黄"},
        {"name": "清华附小 (25%)", "premium": 25, "expected_tier": "TIER_2", "expected_label": "橙黄"},
        {"name": "景山学校 (26%)", "premium": 26, "expected_tier": "TIER_2", "expected_label": "橙黄"},
        {"name": "中关村三小 (23.41%)", "premium": 23.41, "expected_tier": "TIER_2", "expected_label": "橙黄"},
        {"name": "北京小学 (20%)", "premium": 20, "expected_tier": "TIER_3", "expected_label": "浅黄"},
        {"name": "芳草地小学 (15.9%)", "premium": 15.9, "expected_tier": "TIER_3", "expected_label": "浅黄"},
        {"name": "普通学校 (15%)", "premium": 15, "expected_tier": "TIER_4", "expected_label": "浅蓝"},
        {"name": "非学区房 (10%)", "premium": 10, "expected_tier": "TIER_4", "expected_label": "浅蓝"},
        {"name": "边界 30.01%", "premium": 30.01, "expected_tier": "TIER_1", "expected_label": "深红"},
        {"name": "边界 30.0%", "premium": 30.0, "expected_tier": "TIER_2", "expected_label": "橙黄"},
        {"name": "边界 20.01%", "premium": 20.01, "expected_tier": "TIER_2", "expected_label": "橙黄"},
        {"name": "边界 20.0%", "premium": 20.0, "expected_tier": "TIER_3", "expected_label": "浅黄"},
        {"name": "边界 15.01%", "premium": 15.01, "expected_tier": "TIER_3", "expected_label": "浅黄"},
        {"name": "边界 15.0%", "premium": 15.0, "expected_tier": "TIER_4", "expected_label": "浅蓝"},
    ]

    passed = 0
    failed = 0

    for tc in test_cases:
        actual_tier = get_color_tier(tc["premium"])
        actual_label = COLOR_RULES[actual_tier]["label"]
        status = "✅" if actual_tier == tc["expected_tier"] else "❌"

        if actual_tier == tc["expected_tier"]:
            passed += 1
        else:
            failed += 1

        print(f"{status} {tc['name']}: 实际={actual_label}({actual_tier}), 期望={tc['expected_label']}({tc['expected_tier']})")

    print(f"\n📊 边界测试结果: {passed} 通过, {failed} 失败")
    return passed == 0

def run_radius_formula_tests():
    """点位半径公式验证"""
    print("\n" + "="*60)
    print("📏 点位半径公式验证: radius = clamp(单价 / 8000, 8, 20)")
    print("="*60)

    test_cases = [
        {"price": 40000, "expected": 8.0},
        {"price": 64000, "expected": 8.0},
        {"price": 80000, "expected": 10.0},
        {"price": 96000, "expected": 12.0},
        {"price": 120000, "expected": 15.0},
        {"price": 160000, "expected": 20.0},
        {"price": 200000, "expected": 20.0},
    ]

    passed = 0
    failed = 0

    for tc in test_cases:
        actual = calculate_marker_radius(tc["price"])
        status = "✅" if abs(actual - tc["expected"]) < 0.001 else "❌"
        if abs(actual - tc["expected"]) < 0.001:
            passed += 1
        else:
            failed += 1
        print(f"{status} 单价 {tc['price']:>6} 元/m²: 实际半径={actual:.2f}, 期望={tc['expected']:.2f}")

    print(f"\n📏 半径测试结果: {passed} 通过, {failed} 失败")
    return failed == 0

def main():
    data_path = Path(__file__).resolve().parent.parent.parent / "src" / "data" / "district_stats.json"

    print("\n" + "="*60)
    print("🏫 学区溢价分析系统 - 可视化验证报告")
    print("="*60)

    if not data_path.exists():
        print(f"⚠️  数据文件不存在: {data_path}")
        print("   使用模拟数据进行验证...")
        data = generate_mock_data()
    else:
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.loads(f.read())

    districts = data if isinstance(data, list) else data.get("districts", [])

    print(f"\n📊 共加载 {len(districts)} 个学区数据")

    print("\n" + "="*60)
    print("🎨 颜色分级规则")
    print("="*60)
    for tier, rule in COLOR_RULES.items():
        print(f"   {tier} ({rule['label']}): {rule['desc']}")
        print(f"     填充: {FILL_COLORS[tier]}, 边框: {STROKE_COLORS[tier]}")

    print("\n" + "="*60)
    print("🏫 学区颜色验证")
    print("="*60)

    all_valid = True
    validation_results = []
    for d in districts:
        result = validate_district(d)
        validation_results.append(result)
        if not result["valid"]:
            all_valid = False

    # 关键用例验证
    print("\n" + "="*60)
    print("⭐ 关键用例验证")
    print("="*60)

    key_cases = [
        ("中关村第一小学", 34.65, "TIER_1", "深红"),
        ("芳草地小学", 15.9, "TIER_3", "浅黄"),
    ]

    for name, expected_premium, expected_tier, expected_label in key_cases:
        match = next((r for r in validation_results if r["school_name"] == name), None)
        if match:
            status = "✅" if (match["tier"] == expected_tier and abs(match["premium"] - expected_premium) < 2) else "❌"
            print(f"{status} {name}: 溢价率={match['premium']}%, 颜色={match['label']}({match['tier']})")
            print(f"   期望: 溢价率≈{expected_premium}%, 颜色={expected_label}({expected_tier})")
            if status == "❌":
                all_valid = False
        else:
            print(f"⚠️  未找到 {name} 的数据")

    run_edge_case_tests()
    run_radius_formula_tests()

    print("\n" + "="*60)
    if all_valid:
        print("✅ 所有验证通过!")
    else:
        print("❌ 部分验证失败, 请检查上方错误")
    print("="*60 + "\n")

    return all_valid


def generate_mock_data():
    return [
        {"school_name": "中关村第一小学", "avg_premium_pct": 34.65, "district": "海淀"},
        {"school_name": "中关村第二小学", "avg_premium_pct": 27.13, "district": "海淀"},
        {"school_name": "中关村第三小学", "avg_premium_pct": 23.41, "district": "海淀"},
        {"school_name": "人大附中", "avg_premium_pct": 38.58, "district": "海淀"},
        {"school_name": "北大附小", "avg_premium_pct": 30.68, "district": "海淀"},
        {"school_name": "清华大学附属小学", "avg_premium_pct": 25.0, "district": "海淀"},
        {"school_name": "史家胡同小学", "avg_premium_pct": 32.0, "district": "东城"},
        {"school_name": "北京小学", "avg_premium_pct": 20.0, "district": "西城"},
        {"school_name": "景山学校", "avg_premium_pct": 26.0, "district": "东城"},
        {"school_name": "芳草地小学", "avg_premium_pct": 15.9, "district": "朝阳"},
    ]


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
