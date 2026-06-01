#!/usr/bin/env python3
"""安装验证脚本 - 检查项目是否可以正常运行"""
import sys
import os

def main():
    print("=" * 50)
    print("外卖营养分析器 - 安装验证")
    print("=" * 50)
    print()
    
    # 1. 检查Python版本
    print("📌 Python 版本检查:")
    print(f"   Python 版本: {sys.version}")
    if sys.version_info >= (3, 8):
        print("   ✓ Python 版本符合要求 (>= 3.8)")
    else:
        print("   ⚠️  Python 版本可能过低，建议使用 3.8+")
    print()
    
    # 2. 检查依赖
    print("📌 依赖检查:")
    deps = [
        ("PyQt5", "GUI 框架"),
        ("matplotlib", "图表绘制"),
        ("fuzzywuzzy", "模糊字符串匹配"),
        ("Levenshtein", "字符串相似度加速"),
        ("dotenv", "环境变量加载"),
        ("PIL", "图片处理 (OCR)"),
    ]
    
    all_ok = True
    for dep, desc in deps:
        try:
            __import__(dep)
            print(f"   ✓ {dep} - {desc}")
        except ImportError:
            print(f"   ✗ {dep} - {desc} [缺失]")
            all_ok = False
    print()
    
    # 3. 检查项目文件
    print("📌 项目文件检查:")
    files = [
        "main.py",
        "src/ui/main_window.py",
        "src/nutrition_db/database.py",
        "src/nutrition_db/food_matcher.py",
        "src/input/csv_importer.py",
        "requirements.txt",
    ]
    
    for f in files:
        if os.path.exists(f):
            print(f"   ✓ {f}")
        else:
            print(f"   ✗ {f} [缺失]")
            all_ok = False
    print()
    
    # 4. 测试核心功能
    print("📌 核心功能测试:")
    
    try:
        sys.path.insert(0, '.')
        
        # 测试数据库
        from src.nutrition_db.database import init_database, get_all_foods
        init_database()
        foods = get_all_foods()
        print(f"   ✓ 数据库初始化成功，加载 {len(foods)} 种食物")
        
        # 测试食物匹配
        from src.nutrition_db.food_matcher import FoodMatcher, get_exercise_equivalent
        matcher = FoodMatcher()
        result = matcher.calculate_calories('炸鸡', quantity=1)
        print(f"   ✓ 食物匹配功能正常: 炸鸡 = {result['total_calories']} kcal")
        
        # 测试运动当量
        exercise = get_exercise_equivalent(500)
        print(f"   ✓ 运动当量计算正常: 500 kcal = 跑步{exercise['跑步']}")
        
        # 测试CSV导入
        from src.input.csv_importer import CSVImporter
        csv_importer = CSVImporter()
        print(f"   ✓ CSV导入器初始化成功")
        
        # 测试主窗口
        from src.ui.main_window import MainWindow
        print(f"   ✓ 主窗口类导入成功")
        
    except Exception as e:
        print(f"   ✗ 功能测试失败: {e}")
        import traceback
        traceback.print_exc()
        all_ok = False
    
    print()
    
    # 5. 总结
    print("=" * 50)
    if all_ok:
        print("🎉 安装验证全部通过！")
        print()
        print("启动方式:")
        print("  方式1: ./run.sh")
        print("  方式2: /opt/anaconda3/bin/python main.py")
        print()
        print("使用提示:")
        print("  - 点击 '生成示例数据' 按钮导入测试订单")
        print("  - 在日历中选择日期查看对应订单")
        print("  - 切换到 '热量趋势' 标签查看摄入趋势图")
        print("  - 点击订单查看详细营养分析和运动建议")
    else:
        print("⚠️  部分检查未通过，请修复后重试")
        print()
        print("安装依赖命令:")
        print("  /opt/anaconda3/bin/pip install -r requirements.txt")
    print("=" * 50)

if __name__ == "__main__":
    main()
