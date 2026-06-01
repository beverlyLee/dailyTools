import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.formula.api import ols
from typing import Dict, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')


def perform_simple_regression(df: pd.DataFrame, 
                              x_col: str = 'avg_daily_hours', 
                              y_col: str = 'gpa') -> Dict:
    X = df[x_col]
    y = df[y_col]
    X = sm.add_constant(X)
    
    model = sm.OLS(y, X).fit()
    
    return {
        'model': model,
        'r_squared': model.rsquared,
        'coefficients': model.params.to_dict(),
        'p_values': model.pvalues.to_dict(),
        'equation': f'GPA = {model.params["const"]:.4f} + {model.params[x_col]:.4f} * DailyHours'
    }


def perform_multiple_regression(df: pd.DataFrame) -> Dict:
    df_encoded = pd.get_dummies(df, columns=['major'], drop_first=True, dtype=float)
    
    features = ['avg_daily_hours', 'total_visits', 'active_days']
    major_features = [col for col in df_encoded.columns if col.startswith('major_')]
    all_features = features + major_features
    
    X = df_encoded[all_features].astype(float)
    y = df_encoded['gpa'].astype(float)
    X = sm.add_constant(X)
    
    model = sm.OLS(y, X).fit()
    
    equation_terms = [f'{model.params["const"]:.4f}']
    for feature in all_features:
        coeff = model.params[feature]
        sign = '+' if coeff >= 0 else '-'
        equation_terms.append(f'{sign} {abs(coeff):.4f}*{feature}')
    
    equation = 'GPA = ' + ' '.join(equation_terms)
    
    return {
        'model': model,
        'r_squared': model.rsquared,
        'adjusted_r_squared': model.rsquared_adj,
        'coefficients': model.params.to_dict(),
        'p_values': model.pvalues.to_dict(),
        'equation': equation,
        'feature_names': all_features
    }


def calculate_correlation(df: pd.DataFrame, 
                          x_col: str = 'avg_daily_hours', 
                          y_col: str = 'gpa') -> Dict:
    correlation = df[x_col].corr(df[y_col])
    spearman_corr = df[x_col].corr(df[y_col], method='spearman')
    
    return {
        'pearson_correlation': correlation,
        'spearman_correlation': spearman_corr
    }


def run_full_regression_analysis(df: pd.DataFrame) -> Dict:
    simple_result = perform_simple_regression(df)
    multiple_result = perform_multiple_regression(df)
    corr_result = calculate_correlation(df)
    
    return {
        'simple_regression': simple_result,
        'multiple_regression': multiple_result,
        'correlation': corr_result
    }


def format_regression_results(results: Dict) -> str:
    output = []
    output.append("=" * 60)
    output.append("图书馆使用时长与GPA关联分析结果")
    output.append("=" * 60)
    
    output.append("\n【简单线性回归分析】")
    output.append(f"回归方程: {results['simple_regression']['equation']}")
    output.append(f"R² (决定系数): {results['simple_regression']['r_squared']:.4f}")
    output.append(f"截距 p值: {results['simple_regression']['p_values']['const']:.6f}")
    output.append(f"日均时长 p值: {results['simple_regression']['p_values']['avg_daily_hours']:.6f}")
    
    p_value = results['simple_regression']['p_values']['avg_daily_hours']
    if p_value < 0.01:
        sig_note = "★★★ 在1%水平上统计显著"
    elif p_value < 0.05:
        sig_note = "★★ 在5%水平上统计显著"
    elif p_value < 0.1:
        sig_note = "★ 在10%水平上统计显著"
    else:
        sig_note = "统计不显著"
    output.append(f"显著性: {sig_note}")
    
    output.append("\n【相关性分析】")
    output.append(f"Pearson相关系数: {results['correlation']['pearson_correlation']:.4f}")
    output.append(f"Spearman相关系数: {results['correlation']['spearman_correlation']:.4f}")
    
    output.append("\n【多元线性回归分析】")
    output.append(f"R²: {results['multiple_regression']['r_squared']:.4f}")
    output.append(f"调整R²: {results['multiple_regression']['adjusted_r_squared']:.4f}")
    output.append("\n各变量系数与p值:")
    for feature in ['const'] + results['multiple_regression']['feature_names']:
        coeff = results['multiple_regression']['coefficients'][feature]
        p_val = results['multiple_regression']['p_values'][feature]
        stars = '***' if p_val < 0.01 else '**' if p_val < 0.05 else '*' if p_val < 0.1 else ''
        output.append(f"  {feature:20s}: {coeff:10.4f}  (p={p_val:.6f}) {stars}")
    
    output.append("\n" + "=" * 60)
    
    return '\n'.join(output)


if __name__ == '__main__':
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
    from features.time_feature_extractor import get_analysis_dataset
    
    df = get_analysis_dataset()
    if not df.empty:
        results = run_full_regression_analysis(df)
        print(format_regression_results(results))
    else:
        print('无法加载数据，请确保mock服务器正在运行。')
