import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple

def create_model_plot(results: pd.DataFrame, 
                      show_log_scale: bool = False) -> go.Figure:
    
    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=(
            'SEIR模型各状态人群趋势',
            '每日状态变化',
            '有效再生数趋势',
            '人群比例分布'
        ),
        specs=[
            [{'type': 'scatter'}, {'type': 'scatter'}],
            [{'type': 'scatter'}, {'type': 'domain'}]
        ]
    )
    
    colors = {
        'S': '#1f77b4',
        'E': '#ff7f0e',
        'I': '#d62728',
        'R': '#2ca02c'
    }
    
    labels = {
        'S': '易感人群 (S)',
        'E': '暴露人群 (E)',
        'I': '感染人群 (I)',
        'R': '康复人群 (R)'
    }
    
    for state in ['S', 'E', 'I', 'R']:
        y_data = results[state]
        if show_log_scale and state != 'S':
            y_data = np.where(y_data > 0, np.log10(y_data), 0)
        
        fig.add_trace(
            go.Scatter(
                x=results['t'],
                y=y_data,
                mode='lines',
                name=labels[state],
                line=dict(color=colors[state], width=2),
                fill='tozeroy' if state in ['E', 'I'] else None,
                opacity=0.8 if state in ['E', 'I'] else 1.0
            ),
            row=1, col=1
        )
    
    fig.update_xaxes(title_text='时间 (天)', row=1, col=1)
    y_label = '人数 (log₁₀)' if show_log_scale else '人数'
    fig.update_yaxes(title_text=y_label, row=1, col=1)
    
    for state in ['E', 'I', 'R']:
        daily_change = results[state].diff()
        fig.add_trace(
            go.Scatter(
                x=results['t'][1:],
                y=daily_change[1:],
                mode='lines',
                name=f'{labels[state]} 日变化',
                line=dict(color=colors[state], width=2)
            ),
            row=1, col=2
        )
    
    fig.add_hline(y=0, line_dash='dash', line_color='gray', row=1, col=2)
    fig.update_xaxes(title_text='时间 (天)', row=1, col=2)
    fig.update_yaxes(title_text='每日变化人数', row=1, col=2)
    
    total_population = results['total'].iloc[0]
    effective_R = []
    for i in range(len(results)):
        S = results['S'].iloc[i]
        I = results['I'].iloc[i]
        
        if I > 0:
            lambda_ = S / total_population
        else:
            lambda_ = 0
        
        effective_R.append(lambda_)
    
    fig.add_trace(
        go.Scatter(
            x=results['t'],
            y=effective_R,
            mode='lines',
            name='相对易感比例',
            line=dict(color='#9467bd', width=2)
        ),
        row=2, col=1
    )
    
    fig.add_hline(y=1.0, line_dash='dash', line_color='red', 
                  annotation_text='阈值线', row=2, col=1)
    fig.update_xaxes(title_text='时间 (天)', row=2, col=1)
    fig.update_yaxes(title_text='S/N 比例', row=2, col=1)
    
    final_row = results.iloc[-1]
    pie_values = [
        final_row['S'],
        final_row['E'],
        final_row['I'],
        final_row['R']
    ]
    pie_labels = [
        f'易感人群\n({final_row["S"]:,.0f})',
        f'暴露人群\n({final_row["E"]:,.0f})',
        f'感染人群\n({final_row["I"]:,.0f})',
        f'康复人群\n({final_row["R"]:,.0f})'
    ]
    
    fig.add_trace(
        go.Pie(
            values=pie_values,
            labels=pie_labels,
            marker_colors=[colors['S'], colors['E'], colors['I'], colors['R']],
            textinfo='percent+label',
            textposition='outside',
            hole=0.4
        ),
        row=2, col=2
    )
    
    fig.update_layout(
        height=800,
        showlegend=True,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        ),
        title={
            'text': 'SEIR模型模拟结果',
            'y': 0.95,
            'x': 0.5,
            'xanchor': 'center',
            'yanchor': 'top'
        }
    )
    
    return fig

def create_comparison_chart(data: pd.DataFrame, 
                             countries: List[str]) -> go.Figure:
    
    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=(
            '累计确诊对比',
            '累计死亡对比',
            '累计康复对比',
            '每日新增确诊'
        )
    )
    
    colors = [
        '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
        '#9467bd', '#8c564b', '#e377c2', '#7f7f7f'
    ]
    
    for i, country in enumerate(countries):
        country_data = data[data['country'] == country].sort_values('date')
        
        fig.add_trace(
            go.Scatter(
                x=country_data['date'],
                y=country_data['confirmed'],
                mode='lines',
                name=country,
                line=dict(color=colors[i % len(colors)], width=2)
            ),
            row=1, col=1
        )
        
        fig.add_trace(
            go.Scatter(
                x=country_data['date'],
                y=country_data['deaths'],
                mode='lines',
                name=country,
                line=dict(color=colors[i % len(colors)], width=2),
                showlegend=False
            ),
            row=1, col=2
        )
        
        fig.add_trace(
            go.Scatter(
                x=country_data['date'],
                y=country_data['recovered'],
                mode='lines',
                name=country,
                line=dict(color=colors[i % len(colors)], width=2),
                showlegend=False
            ),
            row=2, col=1
        )
        
        daily_new = country_data['confirmed'].diff()
        fig.add_trace(
            go.Bar(
                x=country_data['date'][1:],
                y=daily_new[1:],
                name=country,
                marker_color=colors[i % len(colors)],
                opacity=0.7,
                showlegend=False
            ),
            row=2, col=2
        )
    
    fig.update_xaxes(title_text='日期', row=1, col=1)
    fig.update_xaxes(title_text='日期', row=1, col=2)
    fig.update_xaxes(title_text='日期', row=2, col=1)
    fig.update_xaxes(title_text='日期', row=2, col=2)
    
    fig.update_yaxes(title_text='人数', row=1, col=1)
    fig.update_yaxes(title_text='人数', row=1, col=2)
    fig.update_yaxes(title_text='人数', row=2, col=1)
    fig.update_yaxes(title_text='每日新增', row=2, col=2)
    
    fig.update_layout(
        height=700,
        showlegend=True,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        ),
        barmode='group'
    )
    
    return fig

def create_sensitivity_chart(sensitivity_results: Dict,
                              param_name: str) -> go.Figure:
    
    if param_name not in sensitivity_results:
        return go.Figure()
    
    data = sensitivity_results[param_name]
    
    fig = make_subplots(
        rows=1, cols=2,
        subplot_titles=(
            f'峰值感染人数 vs {param_name}',
            f'最终感染人数 vs {param_name}'
        )
    )
    
    fig.add_trace(
        go.Scatter(
            x=data['values'],
            y=data['peak_infected'],
            mode='lines+markers',
            name='峰值感染人数',
            line=dict(color='#d62728', width=2),
            marker=dict(size=8)
        ),
        row=1, col=1
    )
    
    fig.add_trace(
        go.Scatter(
            x=data['values'],
            y=data['total_infected'],
            mode='lines+markers',
            name='最终感染人数',
            line=dict(color='#2ca02c', width=2),
            marker=dict(size=8)
        ),
        row=1, col=2
    )
    
    fig.update_xaxes(title_text=param_name, row=1, col=1)
    fig.update_xaxes(title_text=param_name, row=1, col=2)
    
    fig.update_yaxes(title_text='人数', row=1, col=1)
    fig.update_yaxes(title_text='人数', row=1, col=2)
    
    fig.update_layout(
        height=500,
        showlegend=True
    )
    
    return fig

def create_reproduction_number_chart(R0_values: List[float],
                                      days: int = 180) -> go.Figure:
    
    fig = go.Figure()
    
    colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']
    
    for i, R0 in enumerate(R0_values):
        t = np.arange(0, days, 1)
        
        if R0 <= 1:
            y = np.exp(-(1 - R0) * t)
        else:
            y = np.exp((R0 - 1) * t)
            max_y = 1e6
            y = np.minimum(y, max_y)
        
        fig.add_trace(
            go.Scatter(
                x=t,
                y=y,
                mode='lines',
                name=f'R₀ = {R0:.1f}',
                line=dict(color=colors[i % len(colors)], width=2)
            )
        )
    
    fig.add_hline(y=1, line_dash='dash', line_color='gray', 
                  annotation_text='阈值线')
    
    fig.update_layout(
        title='不同基本再生数 R₀ 下的疫情发展趋势',
        xaxis_title='时间 (天)',
        yaxis_title='相对感染规模 (对数尺度)',
        yaxis_type='log',
        height=500,
        showlegend=True,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        )
    )
    
    return fig

def create_dashboard_summary(global_summary: Dict,
                              daily_trends: pd.DataFrame) -> go.Figure:
    
    fig = make_subplots(
        rows=2, cols=2,
        specs=[
            [{'type': 'indicator'}, {'type': 'indicator'}],
            [{'type': 'scatter'}, {'type': 'bar'}]
        ],
        subplot_titles=(
            '总确诊数',
            '总死亡数',
            '累计趋势',
            '每日新增'
        )
    )
    
    fig.add_trace(
        go.Indicator(
            mode="number+delta",
            value=global_summary['total_confirmed'],
            delta={'reference': 0, 'relative': False},
            number={'valueformat': ',', 'font': {'size': 40}},
            domain={'row': 0, 'column': 0}
        )
    )
    
    fig.add_trace(
        go.Indicator(
            mode="number+delta",
            value=global_summary['total_deaths'],
            delta={'reference': 0, 'relative': False},
            number={'valueformat': ',', 'font': {'size': 40}},
            domain={'row': 0, 'column': 1}
        )
    )
    
    fig.add_trace(
        go.Scatter(
            x=daily_trends['date'],
            y=daily_trends['confirmed'],
            mode='lines',
            name='累计确诊',
            line=dict(color='#1f77b4', width=2)
        ),
        row=2, col=1
    )
    
    fig.add_trace(
        go.Scatter(
            x=daily_trends['date'],
            y=daily_trends['deaths'],
            mode='lines',
            name='累计死亡',
            line=dict(color='#d62728', width=2)
        ),
        row=2, col=1
    )
    
    fig.add_trace(
        go.Bar(
            x=daily_trends['date'][1:],
            y=daily_trends['new_confirmed'][1:],
            name='新增确诊',
            marker_color='#1f77b4',
            opacity=0.7
        ),
        row=2, col=2
    )
    
    fig.update_layout(
        height=600,
        showlegend=True
    )
    
    return fig
