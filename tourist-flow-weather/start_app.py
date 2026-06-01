#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def verify_imports():
    print("=" * 60)
    print("验证依赖导入...")
    print("=" * 60)
    
    try:
        import dash
        from dash import dcc, html, Input, Output, State
        print("✓ Dash导入成功")
    except Exception as e:
        print(f"✗ Dash导入失败: {e}")
        return False
    
    try:
        import plotly.graph_objs as go
        import plotly.express as px
        print("✓ Plotly导入成功")
    except Exception as e:
        print(f"✗ Plotly导入失败: {e}")
        return False
    
    try:
        import pandas as pd
        import numpy as np
        print("✓ Pandas/Numpy导入成功")
    except Exception as e:
        print(f"✗ Pandas/Numpy导入失败: {e}")
        return False
    
    try:
        from parsers.weather_parser import WeatherParser
        from parsers.tourist_parser import TouristParser
        from analysis.correlation import CorrelationAnalyzer
        from ai_guide.ai_guide import AIGuide
        print("✓ 自定义模块导入成功")
    except Exception as e:
        print(f"✗ 自定义模块导入失败: {e}")
        return False
    
    return True


def test_callbacks():
    print("\n" + "=" * 60)
    print("测试回调逻辑...")
    print("=" * 60)
    
    try:
        from parsers.weather_parser import WeatherParser
        from parsers.tourist_parser import TouristParser
        
        weather_parser = WeatherParser()
        tourist_parser = TouristParser()
        
        location = '黄山风景区'
        year = 2024
        
        print(f"测试数据加载逻辑...")
        weather_df = weather_parser.get_sample_weather_data(location, year)
        tourist_df = tourist_parser.load_sample_data(location)
        
        merged_df = tourist_df.merge(weather_df, on='month', suffixes=('', '_weather'))
        
        for col in ['precipitation', 'avg_temp', 'rainy_days']:
            if f'{col}_weather' in merged_df.columns:
                merged_df[col] = merged_df[f'{col}_weather']
                merged_df.drop(f'{col}_weather', axis=1, inplace=True)
        
        print(f"✓ 数据合并成功: {len(merged_df)} 条记录")
        
        correlation = merged_df['precipitation'].corr(merged_df['tourist_count'])
        print(f"✓ 相关性计算成功: {correlation:.3f}")
        
        if correlation < 0:
            print("✓ 验证通过: 降雨量与客流量呈负相关")
        
        return True
    except Exception as e:
        print(f"✗ 回调逻辑测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("🏔️ 文旅客流与天气分析系统 - 启动验证")
    
    if not verify_imports():
        print("\n❌ 依赖导入失败，请检查requirements.txt安装情况")
        return 1
    
    if not test_callbacks():
        print("\n❌ 回调逻辑测试失败，请检查代码")
        return 1
    
    print("\n" + "=" * 60)
    print("✅ 所有验证通过!")
    print("=" * 60)
    print("\n🚀 即将启动Dash应用...")
    print("📋 启动后请访问: http://localhost:8050")
    print("\n💡 使用说明:")
    print("   1. 点击'数据导入'标签页")
    print("   2. 点击'加载黄山示例数据'按钮")
    print("   3. 查看'数据概览'和'关联分析'标签页")
    print("   4. 在'AI导游推荐'标签页点击'获取AI推荐'")
    print("\n" + "=" * 60)
    
    try:
        from app import app
        app.run_server(debug=True, port=8050)
    except KeyboardInterrupt:
        print("\n👋 应用已停止")
    except Exception as e:
        print(f"\n❌ 应用启动失败: {e}")
        return 1
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
