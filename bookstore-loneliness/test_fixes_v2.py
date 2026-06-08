import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import (
    _infer_bookstore_type,
    _validate_bookstore_classification,
    _force_correct_classification,
    build_city_data,
    get_bookstore_detail,
    BRAND_TYPE_MAP
)


def test_fix_1_priority():
    print("=" * 70)
    print("修复 1 验证：类型推断优先级（网红品牌 > 商场位置）")
    print("=" * 70)

    test_cases = [
        ("钟书阁(万象城店)", "上海市万象城购物中心", "internet_famous", "网红品牌钟书阁即使在商场也应是网红型"),
        ("言几又(大悦城店)", "北京市大悦城4楼", "internet_famous", "网红品牌言几又即使在商场也应是网红型"),
        ("方所(万达店)", "广州市万达广场", "internet_famous", "网红品牌方所即使在商场也应是网红型"),
        ("西西弗书店(万象城店)", "成都市万象城B1层", "family_friendly", "西西弗在商场里应是亲子型"),
        ("先锋书店(大学城店)", "南京市大学城文教区", "deep_reading", "先锋书店是深度阅读型"),
        ("考试教材书店(师大附中店)", "武汉市师大附中旁", "study_oriented", "考试教材书店是教辅型"),
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

    print(f"\n结论: {'全部通过' if all_pass else '存在失败'}")
    return all_pass


def test_fix_2_validation():
    print("\n" + "=" * 70)
    print("修复 2 验证：分类合理性校验与强制校正")
    print("=" * 70)

    print("\n--- 分类校验测试 ---")
    test_validations = [
        ("钟书阁(万象城店)", "上海万象城", "family_friendly", False, "网红品牌被误分类为亲子型，应校验不通过"),
        ("先锋书店(大学城店)", "南京大学城", "deep_reading", True, "先锋书店分类为深度阅读型，校验通过"),
        ("考试教材书店(教育学院店)", "北京教育学院", "study_oriented", True, "考试教材分类为教辅型，校验通过"),
        ("学而优书店(华师店)", "广州华师旁", "internet_famous", False, "学而优被误分类为网红型，应校验不通过"),
    ]

    all_pass = True
    for name, addr, classified_type, expected_valid, description in test_validations:
        result = _validate_bookstore_classification(name, addr, classified_type)
        status = "✅" if result["valid"] == expected_valid else "❌"
        if result["valid"] != expected_valid:
            all_pass = False
        print(f"\n{status} {description}")
        print(f"   名称: {name}")
        print(f"   分类: {classified_type}")
        print(f"   校验结果: {'通过' if result['valid'] else '不通过'}")
        print(f"   品牌匹配: {result['brand_found']}")
        print(f"   期望类型: {result['expected_type']}")

    print("\n--- 强制校正测试 ---")
    test_corrections = [
        ("钟书阁(万象城店)", "上海万象城", "family_friendly", "internet_famous"),
        ("方所(太古里店)", "成都太古里", "study_oriented", "internet_famous"),
        ("先锋书店(大学路店)", "上海大学路", "internet_famous", "deep_reading"),
        ("学而优书店(华师店)", "广州华师", "family_friendly", "study_oriented"),
    ]

    for name, addr, wrong_type, expected_corrected in test_corrections:
        node = {
            "type": wrong_type,
            "type_name_cn": "错误类型",
            "type_color": "#ff0000",
            "group": wrong_type
        }
        corrected = _force_correct_classification(name, addr, node)
        status = "✅" if corrected["type"] == expected_corrected else "❌"
        if corrected["type"] != expected_corrected:
            all_pass = False
        print(f"\n{status} {name}: {wrong_type} → {corrected['type']}")
        print(f"   期望: {expected_corrected}")
        print(f"   已校正: {corrected.get('_classification_corrected', False)}")

    print(f"\n结论: {'全部通过' if all_pass else '存在失败'}")
    return all_pass


def test_fix_3_favicon():
    print("\n" + "=" * 70)
    print("修复 3 验证：favicon 路由")
    print("=" * 70)

    from app import app
    client = app.test_client()

    resp = client.get("/favicon.ico")
    status = "✅" if resp.status_code == 200 else "❌"
    print(f"{status} HTTP 状态码: {resp.status_code}")
    print(f"   Content-Type: {resp.content_type}")
    print(f"   内容长度: {len(resp.data)} bytes")

    return resp.status_code == 200


def test_full_integration():
    print("\n" + "=" * 70)
    print("完整集成验证：上海数据")
    print("=" * 70)

    data = build_city_data("上海")
    nodes = data["nodes"]

    print(f"\n总书店数: {len(nodes)}")
    print(f"类型分布:")
    for t, info in data["type_stats"]["by_type"].items():
        print(f"  {t}: {info['count']}家 ({info['percentage']}%)")

    print("\n--- 典型品牌分类验证 ---")
    brand_expectations = {
        "先锋书店": "deep_reading",
        "三联韬奋书店": "deep_reading",
        "钟书阁": "internet_famous",
        "言几又": "internet_famous",
        "方所": "internet_famous",
        "考试教材书店": "study_oriented",
        "考研之家书店": "study_oriented",
        "学而优书店": "study_oriented",
        "西西弗书店": "family_friendly",
    }

    all_correct = True
    for brand, expected_type in brand_expectations.items():
        matched = [n for n in nodes if brand in n["name"]]
        if matched:
            actual_type = matched[0]["type"]
            status = "✅" if actual_type == expected_type else "❌"
            if actual_type != expected_type:
                all_correct = False
            print(f"  {status} {brand} → {actual_type} (期望: {expected_type})")
        else:
            print(f"  ⚠️  {brand} - 未找到样本")

    print("\n--- 详情接口一致性验证 ---")
    first_node = nodes[0]
    detail = get_bookstore_detail("上海", first_node["id"])

    checks = [
        ("名称一致", detail["name"] == first_node["name"]),
        ("类型一致", detail["type"] == first_node["type"]),
        ("孤独指数一致", abs(detail["solitude_index"] - first_node["solitude_score"]) < 0.001),
        ("分数构成存在", "score_composition" in detail),
        ("分数构成合计≈100%", abs(sum(detail["score_composition"].values()) - 1.0) < 0.02),
    ]

    all_detail_ok = True
    for label, ok in checks:
        status = "✅" if ok else "❌"
        if not ok:
            all_detail_ok = False
        print(f"  {status} {label}")

    print(f"\n结论: 品牌分类{'全部正确' if all_correct else '存在错误'}，详情接口{'一致' if all_detail_ok else '存在不一致'}")
    return all_correct and all_detail_ok


def main():
    print("\n" + "📚 书店孤独文化项目 - 第二轮修复验证")
    print("=" * 70)

    results = []
    results.append(("类型推断优先级", test_fix_1_priority()))
    results.append(("分类合理性校验", test_fix_2_validation()))
    results.append(("favicon 路由", test_fix_3_favicon()))
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

    print(f"\n{'🎉 所有修复验证通过！' if all_pass else '⚠️ 存在需要修复的问题'}")


if __name__ == "__main__":
    main()
