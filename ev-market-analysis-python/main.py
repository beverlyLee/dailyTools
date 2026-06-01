#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tidy_data import load_and_clean_data
from metrics import calculate_metrics, calculate_yearly_summary
from visualization import generate_all_charts
from ai_report import generate_ai_report


def main():
    print("=" * 60)
    print("新能源汽车市场趋势分析系统")
    print("=" * 60)
    print()
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(base_dir, 'output')
    
    os.makedirs(output_dir, exist_ok=True)
    
    print("步骤1: 加载并整理数据...")
    df_clean = load_and_clean_data()
    print(f"  - 数据行数: {len(df_clean)}")
    print(f"  - 时间范围: {df_clean['date'].iloc[0]} ~ {df_clean['date'].iloc[-1]}")
    
    from tidy_data import get_data_source_info
    data_info = get_data_source_info()
    print(f"  - 数据源: {data_info['primary_source']['name']}")
    print(f"  - 官网: {data_info['primary_source']['website']}")
    print()
    
    print("步骤2: 计算分析指标...")
    df_with_metrics = calculate_metrics(df_clean)
    yearly_df = calculate_yearly_summary(df_with_metrics)
    print(f"  - 渗透率范围: {df_with_metrics['penetration_rate'].min()*100:.1f}% ~ {df_with_metrics['penetration_rate'].max()*100:.1f}%")
    print(f"  - 最新渗透率: {df_with_metrics['penetration_rate'].iloc[-1]*100:.1f}%")
    print()
    
    print("步骤3: 保存数据结果...")
    df_clean.to_csv(os.path.join(output_dir, 'cleaned_sales_data.csv'), index=False, encoding='utf-8-sig')
    df_with_metrics.to_csv(os.path.join(output_dir, 'data_with_metrics.csv'), index=False, encoding='utf-8-sig')
    yearly_df.to_csv(os.path.join(output_dir, 'yearly_summary.csv'), index=False, encoding='utf-8-sig')
    print("  - cleaned_sales_data.csv (原始清洗数据)")
    print("  - data_with_metrics.csv (含计算指标的完整数据)")
    print("  - yearly_summary.csv (年度汇总数据)")
    print()
    
    print("步骤4: 生成分析图表...")
    generate_all_charts(df_with_metrics, output_dir)
    print()
    
    print("步骤5: 生成AI分析报告...")
    generate_ai_report(df_with_metrics, yearly_df, output_dir, use_ai=True)
    print()
    
    print("=" * 60)
    print("分析完成！所有输出文件位于:")
    print(f"  {output_dir}")
    print("=" * 60)
    print()
    print("主要输出文件:")
    print("  📊 图表文件 (PNG + HTML):")
    print("     - penetration_trend.* (渗透率趋势)")
    print("     - bev_phev_structure.* (BEV/PHEV销量结构)")
    print("     - bev_phev_ratio.* (BEV/PHEV占比趋势)")
    print("     - sales_comparison.* (销量对比)")
    print("     - yoy_growth.* (同比增速)")
    print()
    print("  📈 数据文件:")
    print("     - cleaned_sales_data.csv")
    print("     - data_with_metrics.csv")
    print("     - yearly_summary.csv")
    print()
    print("  📝 分析报告:")
    print("     - ev_market_report.md")
    print()


if __name__ == '__main__':
    main()
