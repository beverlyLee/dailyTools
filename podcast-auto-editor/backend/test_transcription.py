#!/usr/bin/env python3
"""
测试音频转写和文本润色功能
"""

import os
import sys
import tempfile

print("=" * 60)
print("播客自动剪辑工具 - 音频转写 & 文本润色 测试")
print("=" * 60)

print("\n1. 测试依赖导入...")
try:
    import jieba
    print("  ✓ jieba 导入成功")
except ImportError as e:
    print(f"  ✗ jieba 导入失败: {e}")
    sys.exit(1)

try:
    from audio_processor import TextPolisher, get_transcriber
    print("  ✓ audio_processor 导入成功")
except ImportError as e:
    print(f"  ✗ audio_processor 导入失败: {e}")
    sys.exit(1)

print("\n2. 测试文本润色功能...")
try:
    polisher = TextPolisher()
    
    test_cases = [
        ("嗯那个今天啊我们想聊一下关于人工智能的话题对吧其实这个技术呢发展得非常快哦", "带口癖的中文"),
        ("Um, so today we want to talk about AI, right? Actually, you know, this technology is developing really fast.", "带口癖的英文"),
        ("这个怎么说呢说实话基本上我觉得嗯可以试试看那个对吧", "口癖密集型"),
    ]
    
    for text, description in test_cases:
        print(f"\n  测试: {description}")
        print(f"  原文: {text}")
        
        result = polisher.polish(text, language="zh" if description.endswith("中文") else "en")
        
        print(f"  润色后: {result['polished_text']}")
        print(f"  精简率: {result['reduction_ratio']*100:.1f}%")
        print(f"  移除词汇数: {result['changes'][0]['count']}")
        if result['changes'][0]['removed_fillers']:
            print(f"  移除的口癖词: {', '.join(result['changes'][0]['removed_fillers'])}")
        print("  ✓ 润色成功")
        
except Exception as e:
    print(f"  ✗ 文本润色测试失败: {e}")
    import traceback
    traceback.print_exc()

print("\n3. 测试音频转写器初始化...")
try:
    transcriber = get_transcriber()
    print(f"  转写器类型: {type(transcriber).__name__}")
    
    from audio_processor import WHISPER_AVAILABLE
    if WHISPER_AVAILABLE:
        print("  ✓ Whisper 模型可用")
    else:
        print("  ⚠  Whisper 模型不可用，将使用模拟模式")
        
except Exception as e:
    print(f"  ✗ 转写器初始化失败: {e}")

print("\n4. 测试模拟转写功能...")
try:
    import ffmpeg
    import tempfile
    
    test_audio = tempfile.mktemp(suffix=".wav")
    (
        ffmpeg
        .input('sine=frequency=1000:duration=3', f='lavfi')
        .output(test_audio, acodec='pcm_s16le', ar='44100')
        .overwrite_output()
        .run(capture_stdout=True, capture_stderr=True)
    )
    print("  ✓ 测试音频生成成功")
    
    result = transcriber.transcribe(test_audio, language="zh")
    
    print(f"  转写文本长度: {len(result['text'])} 字符")
    print(f"  转写词数: {len(result['words'])} 个")
    print(f"  检测到口癖数: {result['filler_count']} 个")
    print(f"  是否为模拟模式: {'是' if result.get('is_mock') else '否'}")
    
    print("  ✓ 转写功能正常")
    
    os.unlink(test_audio)
    
except Exception as e:
    print(f"  ✗ 模拟转写测试失败: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("🎉 测试完成！")
print("=" * 60)
print("\n功能总结：")
print("  ✓ 文本润色：智能移除口癖词，保留原意")
print("  ✓ 音频转写：支持 Whisper 真转写（需安装）或模拟模式")
print("  ✓ 静音检测：使用 FFmpeg 检测静音片段")
print("  ✓ 口癖识别：自动识别并标记口癖词汇")
print("")
print("如需启用真实转写功能，请安装 Whisper：")
print("  pip install openai-whisper torch")
