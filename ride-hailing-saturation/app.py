import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import dash
from dash import dcc, html, Input, Output
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd

from src.data.driver_online import get_driver_online_stats
from src.economics.income_model import analyze_city_saturation

app = dash.Dash(
    __name__,
    title="网约车司机收入分析平台",
    suppress_callback_exceptions=True
)

server = app.server

cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安']

def get_color_for_saturation(level: str) -> str:
    if "绿色" in level:
        return "#22c55e"
    elif "黄色" in level:
        return "#eab308"
    else:
        return "#ef4444"

app.layout = html.Div([
    html.Div([
        html.H1("网约车司机收入与运力饱和度分析平台", 
                style={'textAlign': 'center', 'color': '#1e293b', 'marginBottom': 10}),
        html.P("基于滴滴开放平台模拟数据 - 分析司机每小时收入与在线时长关系", 
               style={'textAlign': 'center', 'color': '#64748b', 'marginBottom': 30})
    ], style={'background': '#f8fafc', 'padding': '20px', 'borderRadius': '10px'}),
    
    html.Div([
        html.Label("选择城市：", style={'fontWeight': 'bold', 'marginRight': '10px'}),
        dcc.Dropdown(
            id='city-selector',
            options=[{'label': city, 'value': city} for city in cities],
            value='北京',
            style={'width': '200px', 'display': 'inline-block'}
        )
    ], style={'margin': '20px 0'}),
    
    html.Div(id='status-card', style={'margin': '20px 0'}),
    
    html.Div([
        html.Div([
            html.H3("运力饱和度趋势（近3个月）", style={'textAlign': 'center'}),
            dcc.Graph(id='saturation-trend-chart')
        ], style={'width': '48%', 'display': 'inline-block', 'verticalAlign': 'top'}),
        
        html.Div([
            html.H3("司机在线时长分布（24小时）", style={'textAlign': 'center'}),
            dcc.Graph(id='hourly-distribution-chart')
        ], style={'width': '48%', 'display': 'inline-block', 'verticalAlign': 'top', 'marginLeft': '4%'})
    ], style={'margin': '20px 0'}),
    
    html.Div([
        html.H3("每小时收入 vs 在线时长关系曲线", style={'textAlign': 'center'}),
        dcc.Graph(id='income-vs-hours-chart', style={'height': '500px'})
    ], style={'margin': '20px 0'}),
    
    html.Div([
        html.H3("各城市运力饱和度对比", style={'textAlign': 'center'}),
        dcc.Graph(id='city-comparison-chart')
    ], style={'margin': '20px 0'}),
    
    html.Div(id='ai-suggestion-box', style={
        'margin': '30px 0',
        'padding': '20px',
        'borderRadius': '10px',
        'background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'color': 'white',
        'boxShadow': '0 4px 15px rgba(0,0,0,0.2)'
    })
], style={'maxWidth': '1400px', 'margin': '0 auto', 'padding': '20px'})

@app.callback(
    [Output('status-card', 'children'),
     Output('saturation-trend-chart', 'figure'),
     Output('hourly-distribution-chart', 'figure'),
     Output('income-vs-hours-chart', 'figure'),
     Output('city-comparison-chart', 'figure'),
     Output('ai-suggestion-box', 'children')],
    [Input('city-selector', 'value')]
)
def update_charts(selected_city):
    driver_stats = get_driver_online_stats(selected_city)
    saturation_analysis = analyze_city_saturation(selected_city, driver_stats['monthly_data'])
    
    status_card = html.Div([
        html.Div([
            html.H4("当前运力状态", style={'margin': 0}),
            html.Div(
                saturation_analysis['latest_saturation'],
                style={
                    'backgroundColor': get_color_for_saturation(saturation_analysis['latest_saturation']),
                    'color': 'white',
                    'padding': '10px 20px',
                    'borderRadius': '20px',
                    'fontWeight': 'bold',
                    'display': 'inline-block',
                    'marginTop': '10px'
                }
            )
        ], style={'width': '30%', 'display': 'inline-block'}),
        
        html.Div([
            html.P("饱和度指数:", style={'margin': 0}),
            html.H3(f"{saturation_analysis['latest_index']}", style={'margin': '5px 0', 'color': '#1e293b'})
        ], style={'width': '20%', 'display': 'inline-block', 'textAlign': 'center'}),
        
        html.Div([
            html.P("每小时收入:", style={'margin': 0}),
            html.H3(f"¥{saturation_analysis['latest_hourly_income']}", style={'margin': '5px 0', 'color': '#22c55e'})
        ], style={'width': '20%', 'display': 'inline-block', 'textAlign': 'center'}),
        
        html.Div([
            html.P("在线司机数量:", style={'margin': 0}),
            html.H3(f"{driver_stats['latest_count']:,}", style={'margin': '5px 0', 'color': '#3b82f6'})
        ], style={'width': '30%', 'display': 'inline-block', 'textAlign': 'center'})
    ], style={
        'background': 'white',
        'padding': '25px',
        'borderRadius': '10px',
        'boxShadow': '0 2px 10px rgba(0,0,0,0.1)'
    })
    
    monthly_data = saturation_analysis['monthly_analysis']
    months = [m['month'] for m in monthly_data]
    saturation_indices = [m['saturation_index'] for m in monthly_data]
    hourly_incomes = [m['hourly_income'] for m in monthly_data]
    
    fig1 = go.Figure()
    fig1.add_trace(go.Bar(
        x=months,
        y=saturation_indices,
        name='饱和度指数',
        marker_color=[get_color_for_saturation(m['saturation_level']) for m in monthly_data],
        opacity=0.7
    ))
    fig1.add_trace(go.Scatter(
        x=months,
        y=hourly_incomes,
        name='每小时收入(¥)',
        yaxis='y2',
        mode='lines+markers',
        line=dict(color='#3b82f6', width=3),
        marker=dict(size=10)
    ))
    fig1.add_hline(y=1.3, line_dash="dash", line_color="#ef4444", annotation_text="过剩警戒线")
    fig1.add_hline(y=1.0, line_dash="dash", line_color="#eab308", annotation_text="饱和警戒线")
    fig1.update_layout(
        yaxis=dict(title='饱和度指数'),
        yaxis2=dict(title='每小时收入(¥)', overlaying='y', side='right'),
        hovermode='x unified',
        showlegend=True
    )
    
    hourly_data = pd.DataFrame(driver_stats['hourly_data'])
    fig2 = px.bar(
        hourly_data,
        x='hour',
        y='online_drivers',
        color='hour_factor',
        color_continuous_scale='RdYlGn_r',
        labels={'online_drivers': '在线司机数', 'hour': '小时', 'hour_factor': '高峰系数'}
    )
    fig2.update_layout(showlegend=True)
    
    curve_data = pd.DataFrame(saturation_analysis['income_curve']['curve_data'])
    fig3 = px.line(
        curve_data,
        x='online_hours',
        y='hourly_income',
        color='scenario',
        markers=True,
        labels={'online_hours': '在线时长(小时)', 'hourly_income': '每小时收入(¥)', 'scenario': '运力场景'},
        color_discrete_map={
            '运力充足': '#22c55e',
            '接近饱和': '#eab308',
            '轻度过剩': '#f97316',
            '严重过剩': '#ef4444'
        }
    )
    fig3.update_traces(line=dict(width=3), marker=dict(size=8))
    fig3.update_layout(hovermode='x unified')
    
    all_cities_data = []
    for city in cities:
        city_stats = get_driver_online_stats(city)
        city_saturation = analyze_city_saturation(city, city_stats['monthly_data'])
        all_cities_data.append({
            'city': city,
            'saturation_index': city_saturation['latest_index'],
            'saturation_level': city_saturation['latest_saturation'],
            'hourly_income': city_saturation['latest_hourly_income']
        })
    
    city_df = pd.DataFrame(all_cities_data)
    city_df = city_df.sort_values('saturation_index', ascending=False)
    
    fig4 = go.Figure()
    fig4.add_trace(go.Bar(
        y=city_df['city'],
        x=city_df['saturation_index'],
        orientation='h',
        marker_color=[get_color_for_saturation(level) for level in city_df['saturation_level']],
        text=city_df['saturation_index'].round(2),
        textposition='auto'
    ))
    fig4.add_vline(x=1.3, line_dash="dash", line_color="#ef4444")
    fig4.add_vline(x=1.0, line_dash="dash", line_color="#eab308")
    fig4.update_layout(
        xaxis_title='饱和度指数',
        yaxis_title='城市',
        yaxis={'categoryorder': 'total ascending'}
    )
    
    ai_suggestion = html.Div([
        html.H3("🤖 AI 智能分析建议", style={'marginTop': 0}),
        html.P(saturation_analysis['suggestion'], 
               style={'fontSize': '18px', 'lineHeight': '1.6', 'margin': '15px 0'}),
        html.Div([
            html.Strong("关键指标："),
            html.Ul([
                html.Li(f"连续3个月饱和度指数：{', '.join([str(m['saturation_index']) for m in monthly_data])}"),
                html.Li(f"收入变化趋势：{'下降' if hourly_incomes[-1] < hourly_incomes[0] else '上升'}"),
                html.Li(f"市场建议：{'不宜新司机进入' if saturation_analysis['latest_saturation'] == '红色过剩' else '可考虑进入'}")
            ])
        ])
    ])
    
    return status_card, fig1, fig2, fig3, fig4, ai_suggestion

if __name__ == "__main__":
    print("🚀 网约车司机收入分析平台启动中...")
    print("📊 访问地址：http://localhost:8080")
    app.run_server(host="0.0.0.0", port=8080, debug=False)
