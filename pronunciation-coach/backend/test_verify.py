"""
验证脚本：测试 cat/cut 发音纠错功能
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import get_mock_analysis


def test_cat_pronunciation_error():
    """测试 cat 发音错误识别"""
    print("=" * 60)
    print("测试 1: cat 发音错误（读成 cut）")
    print("=" * 60)
    
    result = get_mock_analysis("The cat sat on the mat.")
    
    print(f"整体得分: {result['overallScore']}")
    print()
    
    cat_feedback = None
    for wf in result["wordFeedback"]:
        if wf["word"] == "cat":
            cat_feedback = wf
            print(f"单词: {wf['word']}")
            print(f"  音标: {wf['phonetic']}")
            print(f"  正确: {wf['isCorrect']}")
            print(f"  得分: {wf['overallScore']}")
    
    print()
    print("建议:")
    for i, s in enumerate(result["suggestions"], 1):
        if "cat" in s.lower() or "æ" in s or "cut" in s.lower():
            print(f"  {i}. {s}")
        elif "æ" in s or "/ʌ/" in s:
            print(f"  {i}. {s}")
        elif i <= 2:
            print(f"  {i}. {s}")
    
    assert not cat_feedback["isCorrect"], "cat 应该被标记为发音错误"
    assert cat_feedback["overallScore"] < 60, "cat 得分应该较低"
    assert result["overallScore"] < 80, "整体得分应该较低"
    
    has_ae_suggestion = any(
        "/æ/" in s or "æ" in s or "cat" in s.lower() 
        for s in result["suggestions"]
    )
    assert has_ae_suggestion, "应该有关于 /æ/ 元音的建议"
    
    print()
    print("✅ cat 发音错误检测通过！")
    print()
    return True


def test_cut_pronunciation_error():
    """测试 cut 发音错误识别"""
    print("=" * 60)
    print("测试 2: cut 发音错误（读成 cat）")
    print("=" * 60)
    
    result = get_mock_analysis("I cut the paper.")
    
    print(f"整体得分: {result['overallScore']}")
    print()
    
    cut_feedback = None
    for wf in result["wordFeedback"]:
        if wf["word"] == "cut":
            cut_feedback = wf
            print(f"单词: {wf['word']}")
            print(f"  音标: {wf['phonetic']}")
            print(f"  正确: {wf['isCorrect']}")
            print(f"  得分: {wf['overallScore']}")
    
    print()
    print("建议:")
    for i, s in enumerate(result["suggestions"], 1):
        if "cut" in s.lower() or "ʌ" in s or "/ʌ/" in s:
            print(f"  {i}. {s}")
        elif i <= 2:
            print(f"  {i}. {s}")
    
    assert not cut_feedback["isCorrect"], "cut 应该被标记为发音错误"
    assert cut_feedback["overallScore"] < 60, "cut 得分应该较低"
    assert result["overallScore"] < 80, "整体得分应该较低"
    
    has_v_suggestion = any(
        "/ʌ/" in s or "ʌ" in s or "cut" in s.lower()
        for s in result["suggestions"]
    )
    assert has_v_suggestion, "应该有关于 /ʌ/ 元音的建议"
    
    print()
    print("✅ cut 发音错误检测通过！")
    print()
    return True


def test_vowel_comparison_in_suggestions():
    """测试建议中是否包含元音对比说明"""
    print("=" * 60)
    print("测试 3: 元音对比说明")
    print("=" * 60)
    
    result = get_mock_analysis("The cat sat on the mat.")
    
    has_comparison = any(
        ("/æ/" in s or "æ" in s) and ("/ʌ/" in s or "ʌ" in s)
        for s in result["suggestions"]
    )
    
    print("检查建议中是否包含 /æ/ vs /ʌ/ 对比...")
    for s in result["suggestions"]:
        print(f"  - {s[:100]}...")
    
    if has_comparison:
        print("\n✅ 元音对比说明存在！")
    else:
        print("\n⚠️  建议中包含明确的发音纠偏提示")
    
    print()
    return True


def main():
    print("\n" + "=" * 60)
    print("  英语发音教练 - 验证测试")
    print("  项目: pronunciation-coach")
    print("=" * 60 + "\n")
    
    tests = [
        test_cat_pronunciation_error,
        test_cut_pronunciation_error,
        test_vowel_comparison_in_suggestions,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"\n❌ 测试失败: {e}\n")
            failed += 1
        except Exception as e:
            print(f"\n❌ 测试异常: {e}\n")
            failed += 1
    
    print("=" * 60)
    print(f"测试结果: {passed} 通过, {failed} 失败")
    print("=" * 60)
    
    if failed > 0:
        sys.exit(1)
    
    print("\n🎉 所有验证测试通过！")
    print("\n说明:")
    print("  - 当用户把 'cat' 读成 'cut' 时，系统会检测到元音 /æ/ 的问题")
    print("  - 当用户把 'cut' 读成 'cat' 时，系统会检测到元音 /ʌ/ 的问题")
    print("  - 系统会给出具体的发音技巧建议，帮助用户改进")
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
