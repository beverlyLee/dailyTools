import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import (
    _infer_bookstore_type,
    _validate_bookstore_classification,
    _force_correct_classification,
    _generate_city_bookstores,
    _generate_address,
    _city_seed,
    build_city_data,
    get_bookstore_detail,
    NEGATIVE_TYPE_RULES
)
import random


def test_fix_1_fallback_logic():
    print("=" * 70)
    print("优化 1 验证：亲子型品牌回退逻辑（非商场→混合型，非网红型）")
    print("=" * 70)

    test_cases = [
        ("西西弗书店(万象城店)", "上海市万象城购物中心", "family_friendly", "在商场里的西西弗→亲子型"),
        ("大众书局(万达广场店)", "北京市万达广场", "family_friendly", "在商场里的大众书局→亲子型"),
        ("西西弗书店(文三店)", "杭州市文三路", "deep_reading", "不在商场的西西弗→深度阅读型(大众向)"),
        ("大众书局(南京东店)", "上海市南京东路", "deep_reading", "不在商场的大众书局→深度阅读型(大众向)"),
    ]

    all_pass = True
    for name, address, expected, description in test_cases:
        inferred = _infer_bookstore_type(name, address)
        status = "✅" if inferred == expected else "❌"
        if inferred != expected:
            all_pass = False
        print(f"\n{status} {description}")
        print(f"   名称: {name}")
        print(f"   地址: {address}")
        print(f"   推断类型: {inferred}")
        print(f"   期望类型: {expected}")

    print("\n--- 反向校验：大众书局/西西弗不应是网红型 ---")
    negative_tests = [
        ("西西弗书店(市中心店)", "上海市中心", "internet_famous"),
        ("大众书局(步行街店)", "北京王府井", "internet_famous"),
    ]
    for name, address, bad_type in negative_tests:
        validation = _validate_bookstore_classification(name, address, bad_type)
        has_negative_reason = any("反向" in r for r in validation["reasons"])
        status = "✅" if has_negative_reason else "❌"
        if not has_negative_reason:
            all_pass = False
        print(f"{status} {name} 被分类为 {bad_type} 时应被反向规则拒绝")
        if validation["reasons"]:
            for r in validation["reasons"]:
                print(f"   原因: {r}")

    print(f"\n结论: {'全部通过' if all_pass else '存在失败'}")
    return all_pass


def test_fix_2_city_localization():
    print("\n" + "=" * 70)
    print("优化 2 验证：城市本地化分店名和地址")
    print("=" * 70)

    cities = ["上海", "北京", "广州", "成都", "杭州"]
    city_features = {
        "上海": ["外滩", "陆家嘴", "徐汇", "静安", "长宁", "五角场", "复旦", "同济", "M50", "田子坊", "思南", "武康", "多伦"],
        "北京": ["朝阳", "西单", "国贸", "三里屯", "万达", "合生", "海淀", "五道口", "学院路", "北大", "清华", "国子监", "南锣鼓", "什刹海", "798"],
        "广州": ["天河", "正佳", "太古", "万菱", "万达", "白云", "五山", "中山", "小洲", "红专", "TIT", "华师", "中大", "广外", "沙面", "永庆", "北京路", "上下九", "珠江"],
        "成都": ["春熙", "太古", "万象", "大悦", "万达", "凯德", "川大", "电子科", "宽窄", "东郊", "U37", "川师", "财大", "犀浦", "温江", "锦里", "九眼桥", "玉林"],
        "杭州": ["万象", "湖滨", "西湖", "大悦", "万达", "西溪", "浙大", "中国美院", "文三", "小河", "馒头山", "杭师", "下沙", "滨江", "小和山", "河坊", "南宋", "武林", "南山", "龙井"],
    }

    all_pass = True
    for city in cities:
        bookstores = _generate_city_bookstores(city)
        seed = _city_seed(city)
        rng = random.Random(seed)

        features = city_features[city]
        local_count = 0
        for bs in bookstores:
            name_local = any(f in bs["name"] for f in features)
            if name_local:
                local_count += 1

        print(f"\n{city}: {len(bookstores)} 家书店")
        for bs in bookstores[:3]:
            rng_tmp = random.Random(seed + hash(bs["name"]))
            addr = _generate_address(rng_tmp, city, _infer_bookstore_type(bs["name"], ""))
            print(f"  • {bs['name']}  →  {addr}")

        local_ratio = local_count / len(bookstores)
        if local_ratio >= 0.5:
            print(f"  ✅ 本地化店名比例: {local_ratio*100:.0f}%")
        else:
            print(f"  ⚠️  本地化店名比例: {local_ratio*100:.0f}%")
            all_pass = False

    print(f"\n结论: {'全部通过' if all_pass else '存在不足'}")
    return all_pass


def test_fix_3_negative_validation():
    print("\n" + "=" * 70)
    print("优化 3 验证：反向校验规则")
    print("=" * 70)

    print("\n--- 反向规则列表 ---")
    for brand, forbidden in NEGATIVE_TYPE_RULES.items():
        print(f"  {brand}: 不应是 {', '.join(forbidden)}")

    print("\n--- 强制校正测试（反向规则触发） ---")
    test_cases = [
        ("西西弗书店(文三店)", "杭州市文三路", "internet_famous"),
        ("大众书局(南京东店)", "上海市南京东路", "internet_famous"),
        ("考试教材书店(教育学院店)", "北京教育学院", "family_friendly"),
        ("考研之家书店(大学城店)", "广州大学城", "internet_famous"),
        ("先锋书店(大学路店)", "上海大学路", "family_friendly"),
        ("三联韬奋书店(学院路店)", "北京学院路", "internet_famous"),
    ]

    all_pass = True
    for name, address, wrong_type in test_cases:
        node = {
            "type": wrong_type,
            "type_name_cn": "错误",
            "type_color": "#ff0000",
            "group": wrong_type
        }
        corrected = _force_correct_classification(name, address, node)
        was_corrected = corrected.get("_classification_corrected", False)

        status = "✅" if was_corrected else "❌"
        if not was_corrected:
            all_pass = False

        reason = corrected.get("_correction_reason", "无")
        print(f"\n{status} {name}")
        print(f"   原类型: {wrong_type} → 校正后: {corrected['type']}")
        print(f"   校正原因: {reason}")

    print(f"\n结论: {'全部通过' if all_pass else '存在失败'}")
    return all_pass


def test_full_integration():
    print("\n" + "=" * 70)
    print("完整集成验证：上海 & 北京")
    print("=" * 70)

    for city in ["上海", "北京"]:
        data = build_city_data(city)
        nodes = data["nodes"]

        print(f"\n--- {city} ({len(nodes)}家) ---")
        print(f"类型分布:")
        for t, info in data["type_stats"]["by_type"].items():
            print(f"  {t}: {info['count']}家 ({info['percentage']}%)")

        print(f"\n典型书店:")
        for n in nodes[:4]:
            print(f"  • {n['name']:25s}  {n['type_name_cn']:8s}  孤独:{n['solitude_score']*100:5.1f}%")

        detail = get_bookstore_detail(city, nodes[0]["id"])
        print(f"\n详情接口一致性:")
        print(f"  类型一致: {detail['type'] == nodes[0]['type']}")
        print(f"  孤独指数一致: {abs(detail['solitude_index'] - nodes[0]['solitude_score']) < 0.001}")

    return True


def main():
    print("\n📚 书店孤独文化项目 - 第三轮优化验证")
    print("=" * 70)

    results = []
    results.append(("亲子型品牌回退逻辑", test_fix_1_fallback_logic()))
    results.append(("城市本地化", test_fix_2_city_localization()))
    results.append(("反向校验规则", test_fix_3_negative_validation()))
    results.append(("完整集成验证", test_full_integration()))

    print("\n" + "=" * 70)
    print("最终结果汇总")
    print("=" * 70)

    all_pass = True
    for name, ok in results:
        status = "✅ 通过" if ok else "❌ 失败"
        if not ok:
            all_pass = False
        print(f"  {status} - {name}")

    print(f"\n{'🎉 所有优化验证通过！' if all_pass else '⚠️ 存在需要完善的地方'}")


if __name__ == "__main__":
    main()
