import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import seaborn as sns
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import os


sns.set_style("whitegrid")
plt.rcParams['font.sans-serif'] = ['SimHei', 'Arial Unicode MS', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False


def format_date_labels(ax, df):
    n = len(df)
    if n > 36:
        step = 6
    elif n > 12:
        step = 3
    else:
        step = 1
    
    ax.set_xticks(range(0, n, step))
    ax.set_xticklabels(df['date'].iloc[::step], rotation=45, ha='right')


def plot_penetration_trend(df, output_dir='../output'):
    os.makedirs(output_dir, exist_ok=True)
    
    fig, ax = plt.subplots(figsize=(12, 6))
    
    ax.plot(df.index, df['penetration_rate'] * 100, 
            marker='o', linewidth=2, markersize=4, 
            label='月度渗透率', color='#1f77b4', alpha=0.6)
    
    if 'penetration_rate_ma' in df.columns:
        ax.plot(df.index, df['penetration_rate_ma'] * 100, 
                linewidth=3, label='3月移动平均', color='#ff7f0e')
    
    ax.set_title('新能源汽车渗透率趋势', fontsize=16, pad=20)
    ax.set_xlabel('日期', fontsize=12)
    ax.set_ylabel('渗透率 (%)', fontsize=12)
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.3)
    
    format_date_labels(ax, df)
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'penetration_trend.png'), dpi=300, bbox_inches='tight')
    plt.close()
    
    fig_plotly = go.Figure()
    
    fig_plotly.add_trace(go.Scatter(
        x=df['date'],
        y=df['penetration_rate'] * 100,
        mode='lines+markers',
        name='月度渗透率',
        line=dict(color='#1f77b4', width=2),
        marker=dict(size=4)
    ))
    
    if 'penetration_rate_ma' in df.columns:
        fig_plotly.add_trace(go.Scatter(
            x=df['date'],
            y=df['penetration_rate_ma'] * 100,
            mode='lines',
            name='3月移动平均',
            line=dict(color='#ff7f0e', width=3)
        ))
    
    fig_plotly.update_layout(
        title='新能源汽车渗透率趋势',
        xaxis_title='日期',
        yaxis_title='渗透率 (%)',
        hovermode='x unified',
        template='plotly_white'
    )
    
    fig_plotly.write_html(os.path.join(output_dir, 'penetration_trend.html'))
    
    return fig, fig_plotly


def plot_bev_phev_structure(df, output_dir='../output'):
    os.makedirs(output_dir, exist_ok=True)
    
    fig, ax = plt.subplots(figsize=(12, 6))
    
    x = df.index
    bev = df['bev']
    phev = df['phev']
    
    ax.stackplot(x, bev, phev, 
                 labels=['BEV', 'PHEV'],
                 colors=['#2ca02c', '#9467bd'],
                 alpha=0.8)
    
    ax.set_title('BEV vs PHEV销量结构', fontsize=16, pad=20)
    ax.set_xlabel('日期', fontsize=12)
    ax.set_ylabel('销量', fontsize=12)
    ax.legend(loc='upper left', fontsize=11)
    ax.grid(True, alpha=0.3)
    
    format_date_labels(ax, df)
    
    ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'{int(x/10000)}万'))
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'bev_phev_structure.png'), dpi=300, bbox_inches='tight')
    plt.close()
    
    fig_plotly = go.Figure()
    
    fig_plotly.add_trace(go.Scatter(
        x=df['date'],
        y=df['bev'],
        mode='lines',
        stackgroup='one',
        name='BEV',
        line=dict(color='#2ca02c', width=2),
        fillcolor='rgba(44, 160, 44, 0.8)'
    ))
    
    fig_plotly.add_trace(go.Scatter(
        x=df['date'],
        y=df['phev'],
        mode='lines',
        stackgroup='one',
        name='PHEV',
        line=dict(color='#9467bd', width=2),
        fillcolor='rgba(148, 103, 189, 0.8)'
    ))
    
    fig_plotly.update_layout(
        title='BEV vs PHEV销量结构',
        xaxis_title='日期',
        yaxis_title='销量',
        hovermode='x unified',
        template='plotly_white'
    )
    
    fig_plotly.write_html(os.path.join(output_dir, 'bev_phev_structure.html'))
    
    return fig, fig_plotly


def plot_bev_phev_ratio(df, output_dir='../output'):
    os.makedirs(output_dir, exist_ok=True)
    
    fig, ax = plt.subplots(figsize=(12, 6))
    
    x = df.index
    bev_ratio = df['bev_ratio'] * 100
    phev_ratio = df['phev_ratio'] * 100
    
    ax.stackplot(x, bev_ratio, phev_ratio,
                 labels=['BEV占比', 'PHEV占比'],
                 colors=['#2ca02c', '#9467bd'],
                 alpha=0.8)
    
    ax.set_title('BEV/PHEV占比变化趋势', fontsize=16, pad=20)
    ax.set_xlabel('日期', fontsize=12)
    ax.set_ylabel('占比 (%)', fontsize=12)
    ax.legend(loc='upper right', fontsize=11)
    ax.grid(True, alpha=0.3)
    ax.set_ylim(0, 100)
    
    format_date_labels(ax, df)
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'bev_phev_ratio.png'), dpi=300, bbox_inches='tight')
    plt.close()
    
    fig_plotly = go.Figure()
    
    fig_plotly.add_trace(go.Scatter(
        x=df['date'],
        y=bev_ratio,
        mode='lines',
        stackgroup='one',
        name='BEV占比',
        line=dict(color='#2ca02c', width=2),
        fillcolor='rgba(44, 160, 44, 0.8)'
    ))
    
    fig_plotly.add_trace(go.Scatter(
        x=df['date'],
        y=phev_ratio,
        mode='lines',
        stackgroup='one',
        name='PHEV占比',
        line=dict(color='#9467bd', width=2),
        fillcolor='rgba(148, 103, 189, 0.8)'
    ))
    
    fig_plotly.update_layout(
        title='BEV/PHEV占比变化趋势',
        xaxis_title='日期',
        yaxis_title='占比 (%)',
        hovermode='x unified',
        template='plotly_white',
        yaxis=dict(range=[0, 100])
    )
    
    fig_plotly.write_html(os.path.join(output_dir, 'bev_phev_ratio.html'))
    
    return fig, fig_plotly


def plot_sales_comparison(df, output_dir='../output'):
    os.makedirs(output_dir, exist_ok=True)
    
    fig, ax1 = plt.subplots(figsize=(12, 6))
    
    ax1.bar(df.index, df['total_sales'], alpha=0.3, label='总销量', color='#1f77b4')
    ax1.set_xlabel('日期', fontsize=12)
    ax1.set_ylabel('总销量', fontsize=12, color='#1f77b4')
    ax1.tick_params(axis='y', labelcolor='#1f77b4')
    
    ax2 = ax1.twinx()
    ax2.plot(df.index, df['ev_sales'], marker='o', linewidth=2, markersize=4,
             label='新能源销量', color='#ff7f0e')
    ax2.set_ylabel('新能源销量', fontsize=12, color='#ff7f0e')
    ax2.tick_params(axis='y', labelcolor='#ff7f0e')
    
    ax1.set_title('新能源销量 vs 总销量对比', fontsize=16, pad=20)
    
    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc='upper left', fontsize=11)
    
    format_date_labels(ax1, df)
    
    ax1.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'{int(x/10000)}万'))
    ax2.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'{int(x/10000)}万'))
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'sales_comparison.png'), dpi=300, bbox_inches='tight')
    plt.close()
    
    fig_plotly = make_subplots(specs=[[{"secondary_y": True}]])
    
    fig_plotly.add_trace(
        go.Bar(x=df['date'], y=df['total_sales'], name='总销量',
               marker_color='rgba(31, 119, 180, 0.3)'),
        secondary_y=False,
    )
    
    fig_plotly.add_trace(
        go.Scatter(x=df['date'], y=df['ev_sales'], name='新能源销量',
                   mode='lines+markers', line=dict(color='#ff7f0e', width=2)),
        secondary_y=True,
    )
    
    fig_plotly.update_layout(
        title_text='新能源销量 vs 总销量对比',
        hovermode='x unified',
        template='plotly_white'
    )
    
    fig_plotly.update_yaxes(title_text="总销量", secondary_y=False)
    fig_plotly.update_yaxes(title_text="新能源销量", secondary_y=True)
    
    fig_plotly.write_html(os.path.join(output_dir, 'sales_comparison.html'))
    
    return fig, fig_plotly


def plot_yoy_growth(df, output_dir='../output'):
    os.makedirs(output_dir, exist_ok=True)
    
    df_valid = df.dropna(subset=['total_sales_yoy', 'ev_sales_yoy'])
    
    if len(df_valid) < 3:
        print("数据不足，跳过同比增速图")
        return None, None
    
    fig, ax = plt.subplots(figsize=(12, 6))
    
    x = df_valid.index
    
    ax.plot(x, df_valid['total_sales_yoy'], 
            marker='o', linewidth=2, markersize=4,
            label='总销量同比', color='#1f77b4')
    ax.plot(x, df_valid['ev_sales_yoy'],
            marker='s', linewidth=2, markersize=4,
            label='新能源销量同比', color='#ff7f0e')
    
    ax.axhline(y=0, color='gray', linestyle='--', alpha=0.5)
    
    ax.set_title('同比增速对比', fontsize=16, pad=20)
    ax.set_xlabel('日期', fontsize=12)
    ax.set_ylabel('同比增速 (%)', fontsize=12)
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.3)
    
    format_date_labels(ax, df_valid)
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'yoy_growth.png'), dpi=300, bbox_inches='tight')
    plt.close()
    
    fig_plotly = go.Figure()
    
    fig_plotly.add_trace(go.Scatter(
        x=df_valid['date'],
        y=df_valid['total_sales_yoy'],
        mode='lines+markers',
        name='总销量同比',
        line=dict(color='#1f77b4', width=2)
    ))
    
    fig_plotly.add_trace(go.Scatter(
        x=df_valid['date'],
        y=df_valid['ev_sales_yoy'],
        mode='lines+markers',
        name='新能源销量同比',
        line=dict(color='#ff7f0e', width=2)
    ))
    
    fig_plotly.add_hline(y=0, line_dash="dash", line_color="gray")
    
    fig_plotly.update_layout(
        title='同比增速对比',
        xaxis_title='日期',
        yaxis_title='同比增速 (%)',
        hovermode='x unified',
        template='plotly_white'
    )
    
    fig_plotly.write_html(os.path.join(output_dir, 'yoy_growth.html'))
    
    return fig, fig_plotly


def generate_all_charts(df, output_dir='../output'):
    os.makedirs(output_dir, exist_ok=True)
    
    print("生成渗透率趋势图...")
    plot_penetration_trend(df, output_dir)
    
    print("生成BEV/PHEV结构图...")
    plot_bev_phev_structure(df, output_dir)
    
    print("生成BEV/PHEV占比图...")
    plot_bev_phev_ratio(df, output_dir)
    
    print("生成销量对比图...")
    plot_sales_comparison(df, output_dir)
    
    print("生成同比增速图...")
    plot_yoy_growth(df, output_dir)
    
    print("所有图表生成完成！")
