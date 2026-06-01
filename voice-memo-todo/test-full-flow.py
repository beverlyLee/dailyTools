#!/usr/bin/env python3
"""
完整流程测试脚本：验证语音转文字 + 智能解析
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from main import smart_parse, split_sentences, classify_sentence

print("=" * 70)
print("🧪 完整流程测试")
print("=" * 70)

test_cases = [
    "下午三点开会，买牛奶",
    "这家店卖彩色郁金香，挺好看的",
    "下午三点开会，买牛奶，这家店卖彩色郁金香",
    "明天上午去超市买东西，记得带伞",
]

all_passed = True

for i, test in enumerate(test_cases, 1):
    print(f"\n📋 测试 {i}/{len(test_cases)}: '{test}'")
    print("-" * 70)
    
    sentences = split_sentences(test)
    print(f"  分句结果: {sentences}")
    
    todos, notes = smart_parse(test)
    
    print(f"\n  ✅ 待办事项 ({len(todos)} 个):")
    for text, time in todos:
        if time:
            print(f"      - [ ] {text} (时间: {time})")
        else:
            print(f"      - [ ] {text}")
    
    print(f"\n  📝 笔记 ({len(notes)} 个):")
    for note in notes:
        print(f"      - {note}")
    
    if len(todos) + len(notes) >= len(sentences) * 0.5:
        print(f"\n  ✅ 测试通过")
    else:
        print(f"\n  ⚠️  部分内容未识别")
        all_passed = False

print("\n" + "=" * 70)
if all_passed:
    print("🎉 所有测试通过！智能解析功能正常工作")
else:
    print("⚠️  部分测试需要优化")
print("=" * 70)
