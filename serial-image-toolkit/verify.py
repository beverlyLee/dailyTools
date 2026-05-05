#!/usr/bin/env python3
"""
串口工具与图像处理助手
========================

项目结构:
serial-image-toolkit/
├── main.py                          # 主启动器
├── requirements.txt                 # 依赖列表
├── serial-port-monitor/            # 串口调试助手
│   ├── main.py
│   ├── core/
│   │   ├── serial_port.py          # 串口管理
│   │   └── database.py             # SQLite 日志存储
│   └── ui/
│       └── main_window.py          # PyQt 主界面
└── batch-image-processor/          # 图片批量处理
    ├── main.py
    ├── core/
    │   ├── image_processor.py      # 图片处理
    │   ├── watermark_service.py    # 水印服务
    │   ├── rule_engine.py          # 重命名规则引擎
    │   └── database.py             # SQLite 规则/历史存储
    ├── ui/
    │   └── main_window.py          # PyQt 主界面
    └── utils/
        └── exif_utils.py           # EXIF 信息读取

快速开始:
1. 安装依赖: pip install -r requirements.txt
2. 运行主程序: python main.py
3. 或单独运行子系统:
   - python serial-port-monitor/main.py
   - python batch-image-processor/main.py
"""

import sys
import os

def check_imports():
    print("=" * 60)
    print("检查模块导入...")
    print("=" * 60)
    
    base_path = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, base_path)
    
    errors = []
    
    try:
        print("\n[1/5] 检查串口调试助手核心模块...")
        from serial_port_monitor.core.serial_port import SerialManager, SerialConfig
        print("  ✓ serial_port.py - OK")
    except Exception as e:
        print(f"  ✗ serial_port.py - 错误: {e}")
        errors.append(f"serial_port.py: {e}")
    
    try:
        from serial_port_monitor.core.database import SerialDatabase
        print("  ✓ database.py - OK")
    except Exception as e:
        print(f"  ✗ database.py - 错误: {e}")
        errors.append(f"database.py: {e}")
    
    try:
        print("\n[2/5] 检查图片处理核心模块...")
        from batch_image_processor.core.image_processor import ImageProcessor
        print("  ✓ image_processor.py - OK")
    except Exception as e:
        print(f"  ✗ image_processor.py - 错误: {e}")
        errors.append(f"image_processor.py: {e}")
    
    try:
        from batch_image_processor.core.watermark_service import WatermarkService
        print("  ✓ watermark_service.py - OK")
    except Exception as e:
        print(f"  ✗ watermark_service.py - 错误: {e}")
        errors.append(f"watermark_service.py: {e}")
    
    try:
        from batch_image_processor.core.rule_engine import RuleEngine, RenameRule
        print("  ✓ rule_engine.py - OK")
    except Exception as e:
        print(f"  ✗ rule_engine.py - 错误: {e}")
        errors.append(f"rule_engine.py: {e}")
    
    try:
        from batch_image_processor.core.database import ImageDatabase
        print("  ✓ database.py - OK")
    except Exception as e:
        print(f"  ✗ database.py - 错误: {e}")
        errors.append(f"database.py: {e}")
    
    try:
        print("\n[3/5] 检查工具模块...")
        from batch_image_processor.utils.exif_utils import EXIFUtils
        print("  ✓ exif_utils.py - OK")
    except Exception as e:
        print(f"  ✗ exif_utils.py - 错误: {e}")
        errors.append(f"exif_utils.py: {e}")
    
    try:
        print("\n[4/5] 测试核心功能...")
        ip = ImageProcessor()
        print(f"  ✓ 支持的图片格式: {ip.SUPPORTED_FORMATS}")
    except Exception as e:
        print(f"  ✗ 测试失败: {e}")
        errors.append(f"ImageProcessor 测试: {e}")
    
    try:
        ws = WatermarkService()
        print(f"  ✓ 水印位置选项: {len(ws.POSITIONS)} 个")
    except Exception as e:
        print(f"  ✗ 测试失败: {e}")
        errors.append(f"WatermarkService 测试: {e}")
    
    try:
        rule = RenameRule(
            name="测试规则",
            use_sequence=True,
            sequence_start=1,
            sequence_padding=4
        )
        engine = RuleEngine(rule)
        preview = engine.preview_example()
        print(f"  ✓ 命名规则预览: {preview['final_example']}")
    except Exception as e:
        print(f"  ✗ 测试失败: {e}")
        errors.append(f"RuleEngine 测试: {e}")
    
    print("\n" + "=" * 60)
    if errors:
        print("发现以下问题:")
        for err in errors:
            print(f"  - {err}")
    else:
        print("所有核心模块检查通过! ✓")
    print("=" * 60)
    
    return len(errors) == 0

if __name__ == "__main__":
    success = check_imports()
    
    if success:
        print("""
下一步操作:
1. 安装依赖: pip install -r requirements.txt
2. 运行主程序: python main.py

注意: PySide6 GUI 模块需要显示环境才能完整运行。
""")
    else:
        print("\n请修复上述错误后再运行。")
        sys.exit(1)
