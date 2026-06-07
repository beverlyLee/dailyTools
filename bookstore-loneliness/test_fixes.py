import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import build_city_data, get_bookstore_detail, get_public_data


def test_all_fixes():
    print("=" * 70)
    print("书店孤独文化项目 - 修复验证")
    print("=" * 70)

    print("\n🔍 修复 1：详情面板分数条同维度")
    print("-" * 70)
    sh_data = build_city_data("上海")
    node = sh_data["nodes"][0]
    detail = get_bookstore_detail("上海", node["id"])

    print(f"书店: {detail['name']}")
    print(f"孤独指数 (综合指标): {detail['solitude_index']:.4f}")
    print(f"\n构成比例 (同维度 score_composition):")
    comp = detail["score_composition"]
    total_comp = sum(comp.values())
    print(f"  独处: {comp['solitude']*100:.1f}%")
    print(f"  亲子: {comp['family']*100:.1f}%")
    print(f"  学生: {comp['student']*100:.1f}%")
    print(f"  网红: {comp['internet_famous']*100:.1f}%")
    print(f"  合计: {total_comp*100:.1f}% (应为100%)")

    if abs(total_comp - 1.0) < 0.01:
        print("✅ 分数构成同维度验证通过（合计=100%）")
    else:
        print("❌ 分数构成同维度验证失败")

    print("\n🔍 修复 2：列表与详情数据一致性")
    print("-" * 70)
    node_match = None
    for n in sh_data["nodes"]:
        if n["id"] == node["id"]:
            node_match = n
            break

    print(f"列表中孤独指数: {node_match['solitude_score']:.6f}")
    print(f"详情中孤独指数: {detail['solitude_index']:.6f}")

    if abs(node_match["solitude_score"] - detail["solitude_index"]) < 0.001:
        print("✅ 列表与详情数据一致性验证通过")
    else:
        print("❌ 列表与详情数据不一致")

    print(f"\n列表中类型: {node_match['type']}")
    print(f"详情中类型: {detail['type']}")
    if node_match["type"] == detail["type"]:
        print("✅ 类型数据一致")
    else:
        print("❌ 类型数据不一致")

    print("\n🔍 修复 3：城市切换有实际数据差异")
    print("-" * 70)
    cities = ["上海", "北京", "广州", "成都", "杭州"]
    city_results = {}

    for city in cities:
        data = build_city_data(city)
        city_results[city] = {
            "count": len(data["nodes"]),
            "avg_solitude": data["city_stats"]["avg_solitude"],
            "first_shop": data["nodes"][0]["name"],
            "types": {t: v["count"] for t, v in data["type_stats"]["by_type"].items()}
        }
        print(f"\n{city}:")
        print(f"  书店数量: {len(data['nodes'])} 家")
        print(f"  平均孤独指数: {data['city_stats']['avg_solitude']:.4f}")
        print(f"  第一家: {data['nodes'][0]['name']}")

    first_shops = [city_results[c]["first_shop"] for c in cities]
    unique_first = len(set(first_shops))
    if unique_first >= 3:
        print(f"\n✅ 城市间数据有差异 ({unique_first} 种不同的首店)")
    else:
        print("❌ 城市间数据差异不足")

    avg_solitudes = [city_results[c]["avg_solitude"] for c in cities]
    if max(avg_solitudes) - min(avg_solitudes) > 0.01:
        print(f"✅ 城市间孤独指数有差异 (范围: {min(avg_solitudes):.4f} ~ {max(avg_solitudes):.4f})")
    else:
        print("❌ 城市间孤独指数差异不足")

    print("\n🔍 修复 4：四种书店类型都有样本覆盖")
    print("-" * 70)
    sh_types = sh_data["type_stats"]["by_type"]
    type_names = {
        "deep_reading": "深度阅读型",
        "family_friendly": "亲子型",
        "internet_famous": "网红打卡型",
        "study_oriented": "教辅型"
    }

    print("上海书店类型分布:")
    all_types_present = True
    for t, name in type_names.items():
        count = sh_types.get(t, {}).get("count", 0)
        print(f"  {name}: {count} 家")
        if count == 0:
            all_types_present = False

    if all_types_present:
        print("\n✅ 四种书店类型都有样本覆盖")
    else:
        print("\n❌ 存在缺失的书店类型")

    print("\n📚 教辅型书店示例:")
    study_bookstores = [n for n in sh_data["nodes"] if n["type"] == "study_oriented"]
    for bs in study_bookstores[:3]:
        print(f"  - {bs['name']} (学生指数: {bs['score_composition']['student']*100:.1f}%)")
    if study_bookstores:
        print("✅ 教辅型书店样本存在")
    else:
        print("❌ 教辅型书店缺失")

    print("\n" + "=" * 70)
    print("🎉 修复验证完成")
    print("=" * 70)

    print("\n📊 项目假设验证:")
    print("-" * 70)
    deep_reading = [n for n in sh_data["nodes"] if n["type"] == "deep_reading"]
    family = [n for n in sh_data["nodes"] if n["type"] == "family_friendly"]
    study = [n for n in sh_data["nodes"] if n["type"] == "study_oriented"]

    if deep_reading:
        avg_deep_sol = sum(n["solitude_score"] for n in deep_reading) / len(deep_reading)
        print(f"深度阅读型平均孤独指数: {avg_deep_sol*100:.1f}% ({len(deep_reading)} 家)")
    if family:
        avg_fam_sol = sum(n["solitude_score"] for n in family) / len(family)
        print(f"亲子型平均孤独指数: {avg_fam_sol*100:.1f}% ({len(family)} 家)")
    if study:
        avg_study_sol = sum(n["solitude_score"] for n in study) / len(study)
        print(f"教辅型平均孤独指数: {avg_study_sol*100:.1f}% ({len(study)} 家)")


if __name__ == "__main__":
    test_all_fixes()
