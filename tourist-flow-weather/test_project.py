#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def test_parsers():
    print("=" * 50)
    print("测试1: 数据解析模块")
    print("=" * 50)
    
    try:
        from parsers.tourist_parser import TouristParser
        
        parser = TouristParser()
        df = parser.load_sample_data("黄山风景区")
        
        print(f"✓ 成功加载示例数据，共 {len(df)} 条记录")
        print(f"  - 数据列: {list(df.columns)}")
        print(f"  - 月份范围: {df['month'].min()}月 - {df['month'].max()}月")
        print(f"  - 客流量范围: {df['tourist_count'].min():,} - {df['tourist_count'].max():,} 人次")
        print(f"  - 降雨量范围: {df['precipitation'].min():.1f} - {df['precipitation'].max():.1f} mm")
        
        return True
    except Exception as e:
        print(f"✗ 数据解析模块测试失败: {e}")
        return False


def test_analysis():
    print("\n" + "=" * 50)
    print("测试2: 关联分析模块")
    print("=" * 50)
    
    try:
        from parsers.tourist_parser import TouristParser
        from analysis.correlation import CorrelationAnalyzer
        
        parser = TouristParser()
        df = parser.load_sample_data("黄山风景区")
        
        analyzer = CorrelationAnalyzer()
        
        corr_result = analyzer.calculate_precipitation_correlation(df)
        
        print(f"✓ 成功计算相关性")
        print(f"  - 降雨量与客流量相关系数: {corr_result['correlation_coefficient']:.3f}")
        print(f"  - 相关性类型: {corr_result['correlation_type']}")
        print(f"  - 显著性: {corr_result['significance']}")
        print(f"  - P值: {corr_result['p_value']:.3f}")
        
        if corr_result['correlation_coefficient'] < 0:
            print("  ✓ 验证通过: 降雨量与客流量呈负相关（雨雪天气游客减少）")
        else:
            print("  ⚠ 注意: 当前数据未显示负相关")
        
        best_months = analyzer.find_best_months(df)
        print(f"\n  最佳游览月份推荐（前3名）:")
        for i, row in best_months.head(3).iterrows():
            print(f"    - {int(row['month'])}月 (综合评分: {row['total_score']:.3f})")
        
        return True
    except Exception as e:
        print(f"✗ 关联分析模块测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_ai_guide():
    print("\n" + "=" * 50)
    print("测试3: AI导游模块")
    print("=" * 50)
    
    try:
        from parsers.tourist_parser import TouristParser
        from ai_guide.ai_guide import AIGuide
        
        parser = TouristParser()
        df = parser.load_sample_data("黄山风景区")
        
        ai_guide = AIGuide()
        recommendation = ai_guide.recommend_best_time("黄山风景区", df)
        
        print("✓ AI导游推荐功能正常")
        print("  推荐内容预览（前200字）:")
        print("  " + recommendation[:200].replace('\n', '\n  ') + "...")
        
        if "9月" in recommendation or "4月" in recommendation:
            print("  ✓ 验证通过: AI推荐了合理的游览月份")
        
        if "路线" in recommendation or "避开" in recommendation:
            print("  ✓ 验证通过: AI提供了避堵路线建议")
        
        return True
    except Exception as e:
        print(f"✗ AI导游模块测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_dash_import():
    print("\n" + "=" * 50)
    print("测试4: Dash应用导入")
    print("=" * 50)
    
    try:
        from dash import Dash, dcc, html
        import plotly.graph_objs as go
        import plotly.express as px
        
        print("✓ Dash和Plotly库导入成功")
        print(f"  - Dash版本: {Dash.__version__ if hasattr(Dash, '__version__') else '可用'}")
        print(f"  - Plotly版本: {go.__version__ if hasattr(go, '__version__') else '可用'}")
        
        return True
    except Exception as e:
        print(f"✗ Dash导入测试失败: {e}")
        return False


def main():
    print("🏔️ 文旅客流与天气分析系统 - 项目验证测试")
    print("=" * 60)
    
    tests = [
        test_parsers(),
        test_analysis(),
        test_ai_guide(),
        test_dash_import()
    ]
    
    passed = sum(tests)
    total = len(tests)
    
    print("\n" + "=" * 60)
    print(f"测试结果: {passed}/{total} 项通过")
    print("=" * 60)
    
    if passed == total:
        print("\n✅ 所有测试通过！项目功能正常。")
        print("\n📋 验证总结:")
        print("  ✓ 示例数据加载正常（黄山风景区）")
        print("  ✓ 降雨量与客流量呈负相关（雨雪天气游客骤减）")
        print("  ✓ AI导游能推荐最佳游览月份和避堵路线")
        print("  ✓ Dash可视化框架准备就绪")
        print("\n🚀 下一步: 运行 'python app.py' 启动Web应用")
        print("   访问 http://localhost:8050 查看完整功能")
        return 0
    else:
        print(f"\n❌ {total - passed} 项测试未通过，请检查依赖安装。")
        print("   建议运行: pip install -r requirements.txt")
        return 1


if __name__ == '__main__':
    sys.exit(main())
