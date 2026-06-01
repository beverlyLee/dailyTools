#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.sentiment.comment_analyzer import analyze_comment


def test_positive_comment():
    """测试正面评论"""
    result = analyze_comment("口感醇厚，酱香味十足，包装精美，物流很快，正品无疑！")
    assert result['sentiment_score'] > 0.7
    assert result['taste_score'] > 0.7
    assert result['packaging_score'] > 0.7
    assert result['logistics_score'] > 0.7
    assert not result['has_counterfeit_mention']
    print("✅ test_positive_comment passed")


def test_negative_comment():
    """测试负面评论"""
    result = analyze_comment("口感很差，包装破损，物流慢，怀疑是假酒！")
    assert result['sentiment_score'] < 0.6
    assert result['has_counterfeit_mention'] == True
    print("✅ test_negative_comment passed")


def test_counterfeit_detection():
    """测试假酒关键词检测"""
    test_cases = [
        "会不会是假酒？",
        "感觉是假货",
        "是不是伪造的？",
        "怀疑是仿造的",
        "不是正品吧"
    ]
    for comment in test_cases:
        result = analyze_comment(comment)
        assert result['has_counterfeit_mention'] == True, f"Failed for: {comment}"
    print("✅ test_counterfeit_detection passed")


def test_taste_related():
    """测试口感相关评论"""
    result = analyze_comment("入口绵柔，不上头，酱香浓郁，回味悠长")
    assert result['taste_score'] > 0.7
    print("✅ test_taste_related passed")


def test_logistics_related():
    """测试物流相关评论"""
    result = analyze_comment("京东物流就是快，次日达，包装完好")
    assert result['logistics_score'] > 0.7
    assert result['packaging_score'] > 0.7
    print("✅ test_logistics_related passed")


if __name__ == '__main__':
    print("🧪 开始运行情感分析模块测试...\n")
    test_positive_comment()
    test_negative_comment()
    test_counterfeit_detection()
    test_taste_related()
    test_logistics_related()
    print("\n🎉 所有测试通过！")
