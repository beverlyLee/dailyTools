#!/usr/bin/env python3

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

import argparse


def print_banner():
    print('=' * 70)
    print('    📚 图书馆使用时长与GPA关联分析工具')
    print('=' * 70)
    print()


def run_mock_server(port=8000):
    print(f'🚀 启动Mock API服务器，端口: {port}')
    print(f'   端点: http://localhost:{port}/api/grades')
    print(f'         http://localhost:{port}/api/swipes')
    print(f'         http://localhost:{port}/api/health')
    print()
    print('💡 提示: 服务器无需任何token或权限验证')
    print()
    
    from data_acquisition.mock_server import run_server
    run_server(port)


def run_feature_analysis():
    print('📊 执行特征提取与分析...')
    print()
    
    from features.time_feature_extractor import (
        get_analysis_dataset, 
        calculate_major_median_hours
    )
    
    df = get_analysis_dataset(use_local=True)
    print(f'✅ 成功加载 {len(df)} 条学生记录')
    print()
    
    print('📋 数据样例:')
    print(df[['student_id', 'major', 'gpa', 'avg_daily_hours']].head())
    print()
    
    major_stats = calculate_major_median_hours(df)
    print('📈 各专业日均在馆时长统计:')
    print(major_stats[['major', 'median_hours', 'mean_hours', 'student_count']])
    print()
    
    cs_median = major_stats[major_stats['major'] == 'CS']['median_hours'].values[0]
    chinese_median = major_stats[major_stats['major'] == 'Chinese']['median_hours'].values[0]
    print(f'🎯 验证结果: CS专业中位数 ({cs_median:.2f}h) > 文学院中位数 ({chinese_median:.2f}h): {cs_median > chinese_median} ✓')
    print()


def run_regression_analysis():
    print('🔬 执行回归分析...')
    print()
    
    from features.time_feature_extractor import get_analysis_dataset
    from analysis.regression import run_full_regression_analysis, format_regression_results
    
    df = get_analysis_dataset(use_local=True)
    results = run_full_regression_analysis(df)
    
    print(format_regression_results(results))
    print()


def run_dash_app(port=8050):
    print(f'🌐 启动Dash Web可视化应用')
    print(f'   请在浏览器中访问: http://localhost:{port}')
    print()
    
    from web.dash_app import app
    app.run(debug=True, host='0.0.0.0', port=port)


def run_full_analysis():
    print_banner()
    print('📋 执行完整分析流程...')
    print()
    
    run_feature_analysis()
    run_regression_analysis()
    
    print('=' * 70)
    print('✅ 分析完成！')
    print()
    print('💡 后续操作建议:')
    print('   1. 运行 Jupyter Notebook: jupyter notebook analysis.ipynb')
    print('   2. 启动 Web 可视化: python run_analysis.py --dash')
    print('   3. 启动 API 服务器: python run_analysis.py --server')
    print('=' * 70)


def main():
    parser = argparse.ArgumentParser(
        description='图书馆使用时长与GPA关联分析工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
使用示例:
  python run_analysis.py              # 执行完整分析（默认）
  python run_analysis.py --server     # 启动Mock API服务器
  python run_analysis.py --dash       # 启动Dash Web可视化应用
  python run_analysis.py --features   # 仅执行特征分析
  python run_analysis.py --regression # 仅执行回归分析
        '''
    )
    
    parser.add_argument('--server', action='store_true', help='启动Mock API服务器')
    parser.add_argument('--dash', action='store_true', help='启动Dash Web可视化应用')
    parser.add_argument('--features', action='store_true', help='仅执行特征分析')
    parser.add_argument('--regression', action='store_true', help='仅执行回归分析')
    parser.add_argument('--port', type=int, default=None, help='指定端口号')
    
    args = parser.parse_args()
    
    print_banner()
    
    if args.server:
        run_mock_server(args.port or 8000)
    elif args.dash:
        run_dash_app(args.port or 8050)
    elif args.features:
        run_feature_analysis()
    elif args.regression:
        run_regression_analysis()
    else:
        run_full_analysis()


if __name__ == '__main__':
    main()
