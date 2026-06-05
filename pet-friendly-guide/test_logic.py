#!/usr/bin/env python3
from src.nlp.policy_detector import PolicyDetector

print("=" * 70)
print("  核心判定逻辑验证")
print("=" * 70)

detector = PolicyDetector()

test_cases = [
    {
        "name": "1. 仅限户外（应该为宠物友好）",
        "content": "室外露台允许带狗狗，但是室内不行，天气好的时候来坐坐还不错。",
        "expected_friendly": True,
        "expected_location": "outdoor"
    },
    {
        "name": "2. 室内外都可以（应该为宠物友好）",
        "content": "这家店超赞，室内外都可以带宠物，还有专门的宠物活动区！",
        "expected_friendly": True,
        "expected_location": "both"
    },
    {
        "name": "3. 完全禁止（应该为不友好）",
        "content": "这家餐厅明确禁止宠物入内，只能放在门口的笼子里，不太方便。",
        "expected_friendly": False,
        "expected_location": "unknown"
    },
    {
        "name": "4. 专门区域检测",
        "content": "带金毛来吃饭，店员主动给了水碗和零食，还专门收拾了一块区域，服务满分！",
        "expected_friendly": True,
        "expected_facility": {"has_pet_area": True, "has_pet_snack": True, "has_water_bowl": True}
    },
    {
        "name": "5. 给了零食检测",
        "content": "周末带猫主子来探店，店员态度超好，还给了小零食，完全不排斥宠物！",
        "expected_friendly": True,
        "expected_facility": {"has_pet_snack": True}
    },
    {
        "name": "6. 提供零食检测",
        "content": "超赞的店！室内外都可以带宠物，提供水碗和零食，店员超热情！",
        "expected_friendly": True,
        "expected_facility": {"has_pet_snack": True, "has_water_bowl": True}
    },
    {
        "name": "7. 猫咪玩耍区域检测",
        "content": "猫咪主题咖啡馆太赞了！有猫咪玩耍区域，也可以带自己的猫来玩。",
        "expected_friendly": True,
        "expected_facility": {"has_pet_area": True}
    },
    {
        "name": "8. 全场允许（室内外均可）",
        "content": "全场都可以带狗狗进去，店员还给准备了宠物专用水碗，太贴心了！",
        "expected_friendly": True,
        "expected_location": "both"
    },
    {
        "name": "9. 打电话咨询不允许（应该为不友好）",
        "content": "打电话咨询过了，店家说不允许带宠物，建议放在门口的临时寄存处。",
        "expected_friendly": False,
        "expected_location": "unknown"
    },
    {
        "name": "10. 仅限户外区带宠物（应该为友好）",
        "content": "仅限户外区可以带宠物，室内用餐区禁止宠物进入，需要注意。",
        "expected_friendly": True,
        "expected_location": "outdoor"
    },
    {
        "name": "11. 尿垫检测",
        "content": "宠物友好认证！室内都可以带狗狗，有免费尿垫提供，强烈推荐！",
        "expected_friendly": True,
        "expected_facility": {"has_pee_pad": True}
    },
    {
        "name": "12. 室内可以（应该为友好）",
        "content": "室内也可以进哦，店员态度超好，还给了小零食。",
        "expected_friendly": True,
        "expected_location": "indoor"
    }
]

passed = 0
failed = 0

for test in test_cases:
    print(f"\n{test['name']}")
    print(f"  评论: {test['content'][:60]}...")
    
    result = detector.analyze_review({"content": test['content'], "shop_name": "测试店"})
    
    status = "✅"
    issues = []
    
    if "expected_friendly" in test:
        if result.is_pet_friendly != test["expected_friendly"]:
            status = "❌"
            issues.append(f"友好性: 预期={test['expected_friendly']}, 实际={result.is_pet_friendly}")
    
    if "expected_location" in test:
        if result.location_restriction.value != test["expected_location"]:
            status = "❌"
            issues.append(f"位置限制: 预期={test['expected_location']}, 实际={result.location_restriction.value}")
    
    if "expected_facility" in test:
        for attr, expected in test["expected_facility"].items():
            actual = getattr(result.facility, attr)
            if actual != expected:
                status = "❌"
                issues.append(f"{attr}: 预期={expected}, 实际={actual}")
    
    if status == "✅":
        passed += 1
    else:
        failed += 1
    
    print(f"  结果: {status}")
    print(f"  宠物友好: {result.is_pet_friendly}")
    print(f"  位置限制: {result.location_restriction.value}")
    print(f"  设施: water_bowl={result.facility.has_water_bowl}, pee_pad={result.facility.has_pee_pad}, snack={result.facility.has_pet_snack}, area={result.facility.has_pet_area}")
    
    if issues:
        for issue in issues:
            print(f"  ❌ 问题: {issue}")

print("\n" + "=" * 70)
print(f"  测试结果: {passed} 通过, {failed} 失败")
print("=" * 70)

if failed == 0:
    print("\n🎉 所有测试通过！")
else:
    print(f"\n⚠️  有 {failed} 个测试失败")
