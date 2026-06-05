#!/usr/bin/env python3
from src.nlp.policy_detector import PolicyDetector
from src.reviews.pet_comment_spider import PetCommentSpider

print("=" * 70)
print("  数据一致性和空值处理验证")
print("=" * 70)

detector = PolicyDetector()
spider = PetCommentSpider()

print("\n【测试1: 传统美食餐厅应为禁止宠物】")
traditional_reviews = spider.get_mock_reviews("传统美食餐厅")
print(f"  评论数量: {len(traditional_reviews)}")
for r in traditional_reviews:
    print(f"  - {r['content'][:60]}...")
    result = detector.analyze_review(r)
    print(f"    判定: 友好={result.is_pet_friendly}, 位置={result.location_restriction.value}")

print("\n【测试2: 仅限户外应为宠物友好】")
outdoor_test_cases = [
    "室外露台允许带狗狗，但是室内不行，天气好的时候来坐坐还不错。",
    "仅限户外区可以带宠物，室内用餐区禁止宠物进入，需要注意。",
    "只能在露台带狗狗，室内不让进，不过露台风景挺好的。"
]
for content in outdoor_test_cases:
    result = detector.analyze_review({"content": content, "shop_name": "测试店"})
    status = "✅" if result.is_pet_friendly and result.location_restriction.value == "outdoor" else "❌"
    print(f"  {status} 友好={result.is_pet_friendly}, 位置={result.location_restriction.value}")
    print(f"     评论: {content[:50]}...")

print("\n【测试3: 设施关键词匹配】")
facility_test_cases = [
    ("专门区域", "店内有专门区域供宠物玩耍，很贴心", "has_pet_area"),
    ("收拾了一块区域", "店员专门收拾了一块区域给狗狗休息", "has_pet_area"),
    ("专门的地方", "有专门的地方可以放宠物用品", "has_pet_area"),
    ("给了零食", "店员态度超好，还给了小零食", "has_pet_snack"),
    ("提供零食", "店内提供零食和水碗", "has_pet_snack")
]
for name, content, expected_attr in facility_test_cases:
    result = detector.analyze_review({"content": content, "shop_name": "测试店"})
    actual = getattr(result.facility, expected_attr)
    status = "✅" if actual else "❌"
    print(f"  {status} {name}: {expected_attr}={actual}")
    print(f"     评论: {content}")

print("\n【测试4: 完整评论数据统计】")
all_reviews = spider.get_mock_reviews()
print(f"  总评论数: {len(all_reviews)}")

analysis_results = detector.aggregate_analysis(all_reviews)
print(f"  分析商家数: {len(analysis_results)}")

friendly_shops = sum(1 for r in analysis_results.values() if r.is_pet_friendly)
forbidden_shops = sum(1 for r in analysis_results.values() if r.is_pet_friendly is False)
unknown_shops = sum(1 for r in analysis_results.values() if r.is_pet_friendly is None)

print(f"  友好商家: {friendly_shops}")
print(f"  不友好商家: {forbidden_shops}")
print(f"  未知商家: {unknown_shops}")

print("\n【测试5: 传统美食餐厅最终判定】")
if "传统美食餐厅" in analysis_results:
    result = analysis_results["传统美食餐厅"]
    status = "✅" if result.is_pet_friendly is False else "❌"
    print(f"  {status} 传统美食餐厅: 友好={result.is_pet_friendly}")
else:
    print("  ❌ 未找到传统美食餐厅的分析结果")

print("\n" + "=" * 70)
print("  验证完成")
print("=" * 70)
