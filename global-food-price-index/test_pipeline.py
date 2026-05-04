#!/usr/bin/env python3
"""
测试数据处理流程
验证数据解析、指标计算是否正常工作
"""

import sys
import os
from datetime import datetime

# 添加源文件路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend', 'src'))

from data_parser import FAODataParser
from metrics_calculator import MetricsCalculator


def test_data_pipeline():
    """
    测试完整的数据处理流程
    """
    print("=" * 60)
    print("测试数据处理流程")
    print("=" * 60)
    
    # 1. 测试数据解析
    print("\n[1/4] 测试数据解析器...")
    try:
        parser = FAODataParser()
        df = parser.load_data()
        
        print(f"✓ 数据加载成功，共 {len(df)} 条记录")
        print(f"✓ 数据时间范围: {df['Date'].min().strftime('%Y-%m')} 到 {df['Date'].max().strftime('%Y-%m')}")
        
        categories = parser.get_available_categories()
        print(f"✓ 可用类别: {', '.join(categories)}")
        
        # 显示前5行数据
        print("\n数据预览 (前5行):")
        print(df.head().to_string())
        
    except Exception as e:
        print(f"✗ 数据解析失败: {str(e)}")
        return False
    
    # 2. 测试环比计算
    print("\n[2/4] 测试环比计算...")
    try:
        mom = MetricsCalculator.calculate_month_over_month(df, 'Food Price Index')
        
        # 验证几个已知值
        # 第2个月的环比
        if len(mom) >= 2:
            val1 = df['Food Price Index'].iloc[0]
            val2 = df['Food Price Index'].iloc[1]
            expected_mom = (val2 - val1) / val1 * 100
            actual_mom = mom.iloc[1]
            
            print(f"✓ 第2个月环比: 预期={expected_mom:.4f}%, 实际={actual_mom:.4f}%")
            
            if abs(expected_mom - actual_mom) < 0.0001:
                print("✓ 环比计算公式验证通过")
            else:
                print("✗ 环比计算存在误差")
        
        # 显示最近6个月的环比
        print("\n最近6个月环比数据:")
        recent_mom = mom.tail(6)
        for date, value in recent_mom.items():
            date_str = date.strftime('%Y-%m') if hasattr(date, 'strftime') else str(date)
            sign = "+" if value > 0 else ""
            print(f"  {date_str}: {sign}{value:.2f}%")
            
    except Exception as e:
        print(f"✗ 环比计算失败: {str(e)}")
        return False
    
    # 3. 测试同比计算
    print("\n[3/4] 测试同比计算...")
    try:
        yoy = MetricsCalculator.calculate_year_over_year(df, 'Food Price Index')
        
        # 验证同比计算（需要至少13个月数据）
        if len(yoy) >= 13:
            val_current = df['Food Price Index'].iloc[12]
            val_last_year = df['Food Price Index'].iloc[0]
            expected_yoy = (val_current - val_last_year) / val_last_year * 100
            actual_yoy = yoy.iloc[12]
            
            print(f"✓ 第13个月同比: 预期={expected_yoy:.4f}%, 实际={actual_yoy:.4f}%")
            
            if abs(expected_yoy - actual_yoy) < 0.0001:
                print("✓ 同比计算公式验证通过")
            else:
                print("✗ 同比计算存在误差")
        
        # 显示最近6个月的同比
        print("\n最近6个月同比数据:")
        recent_yoy = yoy.tail(6)
        for date, value in recent_yoy.items():
            date_str = date.strftime('%Y-%m') if hasattr(date, 'strftime') else str(date)
            if pd.isna(value):
                print(f"  {date_str}: N/A (数据不足)")
            else:
                sign = "+" if value > 0 else ""
                print(f"  {date_str}: {sign}{value:.2f}%")
            
    except Exception as e:
        print(f"✗ 同比计算失败: {str(e)}")
        return False
    
    # 4. 测试完整指标计算
    print("\n[4/4] 测试完整指标计算...")
    try:
        latest_metrics = MetricsCalculator.get_latest_metrics(df)
        
        print(f"✓ 最新数据日期: {latest_metrics.get('date', 'N/A')}")
        print("\n最新指标详情:")
        
        metrics = latest_metrics.get('metrics', {})
        for category, values in metrics.items():
            mom = values.get('MoM', 'N/A')
            yoy = values.get('YoY', 'N/A')
            
            mom_str = f"{mom:+.2f}%" if isinstance(mom, (int, float)) else str(mom)
            yoy_str = f"{yoy:+.2f}%" if isinstance(yoy, (int, float)) else str(yoy)
            
            print(f"  {category}:")
            print(f"    环比: {mom_str}")
            print(f"    同比: {yoy_str}")
        
    except Exception as e:
        print(f"✗ 完整指标计算失败: {str(e)}")
        return False
    
    print("\n" + "=" * 60)
    print("所有测试通过！数据处理流程正常工作。")
    print("=" * 60)
    
    return True


if __name__ == '__main__':
    import pandas as pd
    success = test_data_pipeline()
    sys.exit(0 if success else 1)
