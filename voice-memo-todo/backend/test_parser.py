from main import smart_parse

test_cases = [
    "下午三点开会，买牛奶",
    "这家店卖彩色郁金香，挺好看的",
    "下午三点开会，买牛奶，这家店卖彩色郁金香",
    "明天上午去超市买东西，记得带伞",
    "今天天气真不错，适合出去散步",
    "这本书写得太好了，推荐给大家",
    "周五晚上要开会，准备好资料",
]

print("=" * 70)
print("智能分类测试")
print("=" * 70)

for test in test_cases:
    print(f"\n输入: {test}")
    print("-" * 50)
    
    todos, notes = smart_parse(test)
    
    if todos:
        print(f"  待办事项 ({len(todos)} 个):")
        for text, time_info in todos:
            if time_info:
                print(f"      - [ ] {text} (时间: {time_info})")
            else:
                print(f"      - [ ] {text}")
    
    if notes:
        print(f"  笔记 ({len(notes)} 个):")
        for note in notes:
            print(f"      - {note}")
    
    if not todos and not notes:
        print("  未能识别内容")

print("\n" + "=" * 70)
print("智能分类测试完成!")
print("=" * 70)
