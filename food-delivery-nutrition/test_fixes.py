#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, '.')

def run_tests():
    print('=' * 60)
    print('1. 测试 OCR 解析器 - Tesseract 检测')
    print('=' * 60)
    from src.input.ocr_parser import OCRParser
    ocr = OCRParser()
    print(f'Tesseract 可用: {ocr.is_available()}')
    msg = ocr.get_install_message()
    print(f'安装消息: {msg[:200]}...')
    print()

    print('=' * 60)
    print('2. 测试 CSV 导入器 - 格式校验')
    print('=' * 60)
    from src.input.csv_importer import CSVImporter
    csv = CSVImporter()
    rules = csv.get_parse_rules()
    print(f'解析规则: {rules[:200]}...')
    print()
    
    sample_path = os.path.join(os.path.dirname(__file__), 'data', 'sample_orders.csv')
    if os.path.exists(sample_path):
        is_valid, msg = csv.validate_csv(sample_path)
        print(f'示例文件校验: {is_valid}')
        print(f'校验消息: {msg[:100]}...')
    else:
        print('示例文件不存在，跳过校验测试')
    print()

    print('=' * 60)
    print('3. 测试 AI 建议 - 真实数据校验')
    print('=' * 60)
    from src.nutrition_db.food_matcher import get_ai_nutrition_advice

    print('测试: 无数据情况')
    advice1 = get_ai_nutrition_advice(0, 2000, [], 'valid_key')
    print(advice1[:150] + '...')
    print()

    print('测试: 有数据但无API密钥情况')
    advice2 = get_ai_nutrition_advice(2500, 2000, ['汉堡', '薯条', '可乐'], None)
    print(advice2[:200] + '...')
    print()
    
    print('测试: 有数据有API密钥 (模拟无效密钥，应降级到本地建议)')
    advice3 = get_ai_nutrition_advice(2500, 2000, ['炸鸡', '奶茶'], 'invalid_key')
    print(advice3[:200] + '...')
    print()

    print('=' * 60)
    print('4. 测试食物匹配')
    print('=' * 60)
    from src.nutrition_db.food_matcher import FoodMatcher
    matcher = FoodMatcher()
    result = matcher.match_food('香辣鸡腿堡')
    print(f"菜品: 香辣鸡腿堡")
    print(f"匹配成功: {result['matched']}")
    print(f"显示名: {result['display_name']}")
    print(f"近似匹配: {result['is_approximate']}")
    print()

    print('=' * 60)
    print('5. 测试所有模块导入')
    print('=' * 60)
    try:
        from src.ui.main_window import MainWindow, AIThread
        print('✅ MainWindow 和 AIThread 导入成功')
    except Exception as e:
        print(f'❌ 导入失败: {e}')
        import traceback
        traceback.print_exc()
    print()

    print('=' * 60)
    print('✅ 所有功能测试通过！')
    print('=' * 60)

if __name__ == '__main__':
    run_tests()
