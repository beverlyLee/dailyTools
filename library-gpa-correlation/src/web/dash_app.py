import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'src'))

import dash
from dash import dcc, html, dash_table
from dash.dependencies import Input, Output
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
import statsmodels.api as sm

from features.time_feature_extractor import (
    get_analysis_dataset, 
    calculate_major_median_hours
)
from analysis.regression import (
    run_full_regression_analysis, 
    format_regression_results
)
from config.settings import COLORS

app = dash.Dash(__name__, title='图书馆GPA关联分析')
server = app.server

df = get_analysis_dataset(use_local=True)
major_stats = calculate_major_median_hours(df)
results = run_full_regression_analysis(df)

cs_median = major_stats[major_stats['major'] == 'CS']['median_hours'].values[0]
chinese_median = major_stats[major_stats['major'] == 'Chinese']['median_hours'].values[0]

app.layout = html.Div([
    html.Div([
        html.H1('📚 图书馆使用时长与GPA关联分析', 
                style={'textAlign': 'center', 'color': '#2c3e50', 'marginBottom': '10px'}),
        html.P('分析"泡馆是否真的能提高绩点"', 
               style={'textAlign': 'center', 'color': '#7f8c8d', 'fontSize': '16px'})
    ], style={'backgroundColor': '#f8f9fa', 'padding': '20px', 'borderRadius': '10px', 'marginBottom': '20px'}),
    
    html.Div([
        html.H2('📊 数据概览', style={'color': '#34495e'}),
        dash_table.DataTable(
            data=df.head(10).to_dict('records'),
            columns=[{'name': col, 'id': col} for col in ['student_id', 'major', 'grade', 'gpa', 'avg_daily_hours', 'total_hours']],
            page_size=10,
            style_table={'overflowX': 'auto'},
            style_header={'backgroundColor': '#3498db', 'color': 'white', 'fontWeight': 'bold'},
            style_cell={'textAlign': 'left', 'padding': '10px'}
        )
    ], style={'padding': '20px', 'backgroundColor': 'white', 'borderRadius': '10px', 'marginBottom': '20px'}),
    
    html.Div([
        html.H2('🎯 各专业在馆时长对比', style={'color': '#34495e'}),
        html.Div([
            html.Div([
                html.Div([
                    html.H4(f'CS专业: {cs_median:.2f} 小时', 
                           style={'color': COLORS['CS'], 'textAlign': 'center', 'margin': '0'}),
                    html.P('日均在馆时长中位数', style={'textAlign': 'center', 'color': '#7f8c8d', 'margin': '5px 0'})
                ], style={'flex': 1, 'padding': '15px', 'backgroundColor': '#f8f9fa', 'borderRadius': '8px', 'margin': '0 10px'}),
                html.Div([
                    html.H4(f'文学院: {chinese_median:.2f} 小时', 
                           style={'color': COLORS['Chinese'], 'textAlign': 'center', 'margin': '0'}),
                    html.P('日均在馆时长中位数', style={'textAlign': 'center', 'color': '#7f8c8d', 'margin': '5px 0'})
                ], style={'flex': 1, 'padding': '15px', 'backgroundColor': '#f8f9fa', 'borderRadius': '8px', 'margin': '0 10px'}),
                html.Div([
                    html.H4(f'差值: {cs_median - chinese_median:.2f} 小时', 
                           style={'color': '#27ae60' if cs_median > chinese_median else '#e74c3c', 'textAlign': 'center', 'margin': '0'}),
                    html.P('CS vs 文学院', style={'textAlign': 'center', 'color': '#7f8c8d', 'margin': '5px 0'})
                ], style={'flex': 1, 'padding': '15px', 'backgroundColor': '#f8f9fa', 'borderRadius': '8px', 'margin': '0 10px'})
            ], style={'display': 'flex', 'marginBottom': '20px'})
        ]),
        dcc.Dropdown(
            id='chart-type',
            options=[
                {'label': '箱线图', 'value': 'box'},
                {'label': '柱状图', 'value': 'bar'},
                {'label': '小提琴图', 'value': 'violin'}
            ],
            value='box',
            style={'width': '50%', 'margin': '0 auto 20px auto'}
        ),
        dcc.Graph(id='major-comparison-graph')
    ], style={'padding': '20px', 'backgroundColor': 'white', 'borderRadius': '10px', 'marginBottom': '20px'}),
    
    html.Div([
        html.H2('📈 GPA与在馆时长关系', style={'color': '#34495e'}),
        dcc.Graph(id='scatter-graph'),
        dcc.Graph(id='distribution-graph')
    ], style={'padding': '20px', 'backgroundColor': 'white', 'borderRadius': '10px', 'marginBottom': '20px'}),
    
    html.Div([
        html.H2('🔬 回归分析结果', style={'color': '#34495e'}),
        dcc.Graph(id='regression-graph'),
        html.Div([
            html.Pre(format_regression_results(results), 
                    style={'backgroundColor': '#f8f9fa', 'padding': '20px', 'borderRadius': '8px', 'fontFamily': 'monospace'})
        ])
    ], style={'padding': '20px', 'backgroundColor': 'white', 'borderRadius': '10px', 'marginBottom': '20px'}),
    
    html.Div([
        html.H2('💡 最终结论', style={'color': '#34495e'}),
        html.Div(id='conclusion-box', style={'padding': '20px', 'backgroundColor': '#e8f4f8', 'borderRadius': '8px'})
    ], style={'padding': '20px', 'backgroundColor': 'white', 'borderRadius': '10px'})
], style={'maxWidth': '1400px', 'margin': '0 auto', 'padding': '20px', 'fontFamily': 'Arial, sans-serif'})

@app.callback(
    Output('major-comparison-graph', 'figure'),
    Input('chart-type', 'value')
)
def update_major_graph(chart_type):
    if chart_type == 'box':
        fig = px.box(df, x='major', y='avg_daily_hours', 
                    title='各专业学生日均在馆时长分布 (箱线图)',
                    labels={'avg_daily_hours': '日均在馆时长(小时)', 'major': '专业'},
                    color='major', color_discrete_map=COLORS, points='outliers')
    elif chart_type == 'bar':
        fig = px.bar(major_stats, x='major', y='median_hours',
                    title='各专业学生日均在馆时长中位数 (柱状图)',
                    labels={'median_hours': '日均在馆时长中位数(小时)', 'major': '专业'},
                    color='major', color_discrete_map=COLORS, text='median_hours')
        fig.update_traces(texttemplate='%{text:.2f}', textposition='outside')
    else:
        fig = px.violin(df, x='major', y='avg_daily_hours', 
                       title='各专业学生日均在馆时长分布 (小提琴图)',
                       labels={'avg_daily_hours': '日均在馆时长(小时)', 'major': '专业'},
                       color='major', color_discrete_map=COLORS, box=True)
    
    fig.update_layout(height=500, title_x=0.5, showlegend=False)
    return fig

@app.callback(
    Output('scatter-graph', 'figure'),
    Input('chart-type', 'value')
)
def update_scatter_graph(_):
    fig = px.scatter(df, x='avg_daily_hours', y='gpa', color='major', 
                    trendline='ols',
                    title='GPA与日均在馆时长散点图（含回归趋势线）',
                    labels={'avg_daily_hours': '日均在馆时长(小时)', 'gpa': 'GPA', 'major': '专业'},
                    hover_data=['student_id', 'total_hours', 'active_days', 'grade'],
                    color_discrete_map=COLORS, opacity=0.7)
    fig.update_layout(height=550, title_x=0.5)
    return fig

@app.callback(
    Output('distribution-graph', 'figure'),
    Input('chart-type', 'value')
)
def update_distribution_graph(_):
    fig = make_subplots(rows=1, cols=2, subplot_titles=('GPA分布直方图', '日均在馆时长分布直方图'))
    fig.add_trace(go.Histogram(x=df['gpa'], nbinsx=20, name='GPA', marker_color='#1f77b4', opacity=0.7), row=1, col=1)
    fig.add_trace(go.Histogram(x=df['avg_daily_hours'], nbinsx=20, name='日均时长', marker_color='#ff7f0e', opacity=0.7), row=1, col=2)
    fig.update_xaxes(title_text='GPA', row=1, col=1)
    fig.update_xaxes(title_text='日均在馆时长(小时)', row=1, col=2)
    fig.update_yaxes(title_text='学生人数')
    fig.update_layout(height=450, showlegend=False, title_text='核心变量分布', title_x=0.5)
    return fig

@app.callback(
    Output('regression-graph', 'figure'),
    Input('chart-type', 'value')
)
def update_regression_graph(_):
    simple_model = results['simple_regression']['model']
    x_range = np.linspace(df['avg_daily_hours'].min(), df['avg_daily_hours'].max(), 100)
    X_pred = sm.add_constant(x_range)
    y_pred = simple_model.predict(X_pred)
    
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=df['avg_daily_hours'], y=df['gpa'], mode='markers', name='实际数据',
                           marker=dict(size=8, opacity=0.5, color='#1f77b4')))
    fig.add_trace(go.Scatter(x=x_range, y=y_pred, mode='lines', name='回归线',
                           line=dict(color='red', width=3)))
    
    p_value = results['simple_regression']['p_values']['avg_daily_hours']
    fig.update_layout(
        title='简单线性回归：GPA vs 日均在馆时长',
        xaxis_title='日均在馆时长(小时)',
        yaxis_title='GPA',
        height=550,
        title_x=0.5,
        annotations=[
            dict(x=0.05, y=0.95, xref='paper', yref='paper',
                text=(f"R² = {results['simple_regression']['r_squared']:.4f}<br>"
                     f"p-value = {p_value:.6f}<br>"
                     f"系数 = {results['simple_regression']['coefficients']['avg_daily_hours']:.4f}"),
                showarrow=False, font=dict(size=13), bgcolor='white', bordercolor='gray', borderwidth=1)
        ]
    )
    return fig

@app.callback(
    Output('conclusion-box', 'children'),
    Input('chart-type', 'value')
)
def update_conclusion(_):
    p_value = results['simple_regression']['p_values']['avg_daily_hours']
    r_squared = results['simple_regression']['r_squared']
    coeff = results['simple_regression']['coefficients']['avg_daily_hours']
    
    if p_value < 0.01:
        sig_level = '在1%水平上统计显著 (高度显著) ✓'
    elif p_value < 0.05:
        sig_level = '在5%水平上统计显著 (中等显著) ✓'
    elif p_value < 0.1:
        sig_level = '在10%水平上统计显著 (边缘显著) ✓'
    else:
        sig_level = '统计不显著 ✗'
    
    conclusion_items = [
        html.H4('📊 验证点1: CS专业 vs 文学院在馆时长', style={'marginTop': '0'}),
        html.P(f'CS专业日均在馆时长中位数: {cs_median:.2f} 小时'),
        html.P(f'文学院日均在馆时长中位数: {chinese_median:.2f} 小时'),
        html.P(f'验证结果: {"✓ CS专业中位数高于文学院" if cs_median > chinese_median else "✗ 不满足"}', 
              style={'fontWeight': 'bold', 'color': '#27ae60' if cs_median > chinese_median else '#e74c3c'}),
        
        html.Hr(),
        html.H4('📈 验证点2: 统计显著性检验'),
        html.P(f'回归方程: GPA = {results["simple_regression"]["coefficients"]["const"]:.4f} + ({coeff:.4f} × 日均在馆时长)'),
        html.P(f'p值 (显著性): {p_value:.6f}'),
        html.P(f'显著性水平: {sig_level}', style={'fontWeight': 'bold'}),
        html.P(f'解释: 在馆时长与GPA存在{"正相关关系" if coeff > 0 else "负相关关系"}'),
        
        html.Hr(),
        html.H4('🔍 效应量分析'),
        html.P(f'回归系数: {coeff:.4f}'),
        html.P(f'实际意义: 日均在馆时长每增加1小时，GPA平均提高{coeff:.4f}'),
        html.P(f'R² (拟合优度): {r_squared:.4f} ({r_squared*100:.1f}% 的GPA变异能被在馆时长解释)'),
        
        html.Hr(),
        html.H4('💡 综合结论'),
    ]
    
    if cs_median > chinese_median and p_value < 0.05 and coeff > 0:
        conclusion_items.append(html.H3('✓ "泡馆能提高绩点"这一说法在统计上得到了支持！', 
                                       style={'color': '#27ae60', 'textAlign': 'center'}))
    else:
        conclusion_items.append(html.H3('✗ 数据不完全支持"泡馆能提高绩点"的说法', 
                                       style={'color': '#e74c3c', 'textAlign': 'center'}))
    
    return conclusion_items

if __name__ == '__main__':
    print('=' * 60)
    print('图书馆GPA关联分析 Dash Web应用')
    print('=' * 60)
    print('启动中...')
    print('请在浏览器中访问: http://localhost:8050')
    print('=' * 60)
    app.run(debug=True, host='0.0.0.0', port=8050)
