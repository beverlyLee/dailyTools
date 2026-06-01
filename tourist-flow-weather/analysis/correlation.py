import pandas as pd
import numpy as np
from scipy import stats


class CorrelationAnalyzer:
    def __init__(self):
        pass

    def calculate_precipitation_correlation(self, df):
        if df.empty or 'precipitation' not in df.columns or 'tourist_count' not in df.columns:
            return None

        corr, p_value = stats.pearsonr(df['precipitation'], df['tourist_count'])

        return {
            'correlation_coefficient': corr,
            'p_value': p_value,
            'significance': '显著' if p_value < 0.05 else '不显著',
            'correlation_type': '负相关' if corr < 0 else '正相关'
        }

    def calculate_temperature_correlation(self, df):
        if df.empty or 'avg_temp' not in df.columns or 'tourist_count' not in df.columns:
            return None

        corr, p_value = stats.pearsonr(df['avg_temp'], df['tourist_count'])

        return {
            'correlation_coefficient': corr,
            'p_value': p_value,
            'significance': '显著' if p_value < 0.05 else '不显著',
            'correlation_type': '负相关' if corr < 0 else '正相关'
        }

    def calculate_rainy_days_correlation(self, df):
        if df.empty or 'rainy_days' not in df.columns or 'tourist_count' not in df.columns:
            return None

        corr, p_value = stats.pearsonr(df['rainy_days'], df['tourist_count'])

        return {
            'correlation_coefficient': corr,
            'p_value': p_value,
            'significance': '显著' if p_value < 0.05 else '不显著',
            'correlation_type': '负相关' if corr < 0 else '正相关'
        }

    def get_all_correlations(self, df):
        return {
            'precipitation': self.calculate_precipitation_correlation(df),
            'temperature': self.calculate_temperature_correlation(df),
            'rainy_days': self.calculate_rainy_days_correlation(df)
        }

    def find_best_months(self, df, weight_precipitation=0.4, weight_temp=0.3, weight_tourists=0.3):
        if df.empty:
            return pd.DataFrame()

        df_normalized = df.copy()

        df_normalized['precipitation_score'] = 1 - (df['precipitation'] - df['precipitation'].min()) / (df['precipitation'].max() - df['precipitation'].min())
        df_normalized['temp_score'] = 1 - abs(df['avg_temp'] - 22) / abs(df['avg_temp'] - 22).max()
        df_normalized['tourist_score'] = 1 - (df['tourist_count'] - df['tourist_count'].min()) / (df['tourist_count'].max() - df['tourist_count'].min())

        df_normalized['total_score'] = (
            weight_precipitation * df_normalized['precipitation_score'] +
            weight_temp * df_normalized['temp_score'] +
            weight_tourists * df_normalized['tourist_score']
        )

        return df_normalized.sort_values('total_score', ascending=False)

    def generate_analysis_report(self, df):
        if df.empty:
            return "无数据可分析"

        correlations = self.get_all_correlations(df)
        best_months = self.find_best_months(df)

        report = f"""
=== 文旅客流与天气关联分析报告 ===

1. 降雨量与客流量相关性:
   - 相关系数: {correlations['precipitation']['correlation_coefficient']:.3f}
   - P值: {correlations['precipitation']['p_value']:.3f}
   - 显著性: {correlations['precipitation']['significance']}
   - 类型: {correlations['precipitation']['correlation_type']}

2. 温度与客流量相关性:
   - 相关系数: {correlations['temperature']['correlation_coefficient']:.3f}
   - P值: {correlations['temperature']['p_value']:.3f}
   - 显著性: {correlations['temperature']['significance']}
   - 类型: {correlations['temperature']['correlation_type']}

3. 降雨天数与客流量相关性:
   - 相关系数: {correlations['rainy_days']['correlation_coefficient']:.3f}
   - P值: {correlations['rainy_days']['p_value']:.3f}
   - 显著性: {correlations['rainy_days']['significance']}
   - 类型: {correlations['rainy_days']['correlation_type']}

4. 推荐游览月份（按综合评分）:
"""
        for i, row in best_months.head(3).iterrows():
            report += f"   - {int(row['month'])}月: 评分 {row['total_score']:.3f}\n"

        return report
