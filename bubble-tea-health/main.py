import dash
from dash import dcc, html, Input, Output, State
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from src.data.order_sugar import get_city_data_for_visualization, get_tier_summary
from src.analysis.health_correlation import calculate_correlation, get_health_insights, get_city_comparison

app = dash.Dash(__name__, title="奶茶健康数据分析")
server = app.server

city_data = get_city_data_for_visualization()
df = pd.DataFrame(city_data)

tier_summary = get_tier_summary()
tier_names = {"tier1": "一线城市", "tier2": "新一线/二线", "tier3": "三线城市", "tier4": "四线及以下"}

correlation = calculate_correlation(city_data)
insights = get_health_insights(city_data)

app.layout = html.Div([
    html.Div([
        html.H1("奶茶健康数据分析", style={'textAlign': 'center', 'marginBottom': 30}),
        
        html.Div([
            html.Div([
                html.H3(f"糖分选择与肥胖率相关性"),
                html.P(f"相关系数: {correlation['correlation_coefficient']:.2f}"),
                html.P(f"显著性水平: {correlation['p_value']:.4f}"),
                html.P(f"样本量: {correlation['sample_size']} 个城市"),
                html.P(f"解读: {correlation['interpretation']}")
            ], className='stats-card'),
            
            html.Div([
                html.H3("关键洞察"),
                html.Ul([html.Li(insight) for insight in insights])
            ], className='stats-card')
        ], style={'display': 'flex', 'gap': '20px', 'marginBottom': 30}),
        
        dcc.Graph(id='china-map', figure={}, style={'height': '600px'}),
        
        html.Div([
            html.H3("城市选择"),
            dcc.Dropdown(
                id='city-dropdown',
                options=[{'label': city['name'], 'value': city['name']} for city in city_data],
                value='长沙',
                clearable=False
            )
        ], style={'width': '50%', 'margin': '0 auto', 'marginBottom': 30}),
        
        html.Div([
            html.Div([
                html.H3("城市详情"),
                html.Div(id='city-details')
            ], className='stats-card')
        ]),
        
        html.Div([
            html.H3("各线城市无糖/三分糖比例对比"),
            dcc.Graph(id='tier-bar-chart', figure={})
        ]),
        
        html.Div([
            html.H3("肥胖率与低糖选择散点图"),
            dcc.Graph(id='scatter-plot', figure={})
        ])
    ], style={'padding': '20px', 'maxWidth': '1200px', 'margin': '0 auto'})
])

@app.callback(
    Output('china-map', 'figure'),
    [Input('city-dropdown', 'value')]
)
def update_map(selected_city):
    fig = go.Figure()
    
    fig.add_trace(go.Scattergeo(
        lon=df['lon'],
        lat=df['lat'],
        text=df.apply(lambda row: f"{row['name']}<br>肥胖率: {row['obesity_rate']}%<br>低糖比例: {row['low_sugar_ratio']:.1f}%<br>消费量: {row['consumption']}", axis=1),
        marker=dict(
            size=df['consumption'].apply(lambda x: min(x / 500, 30)),
            color=df['obesity_rate'],
            colorscale='Reds',
            colorbar_title='肥胖率 (%)',
            line_width=2,
            line_color='white',
            opacity=0.7
        ),
        mode='markers',
        name='城市数据'
    ))
    
    selected_data = df[df['name'] == selected_city].iloc[0]
    fig.add_trace(go.Scattergeo(
        lon=[selected_data['lon']],
        lat=[selected_data['lat']],
        text=[f"<b>{selected_city}</b><br>肥胖率: {selected_data['obesity_rate']}%<br>低糖比例: {selected_data['low_sugar_ratio']:.1f}%<br>消费量: {selected_data['consumption']}"],
        marker=dict(
            size=selected_data['consumption'] / 500 + 5,
            color='blue',
            line_width=3,
            line_color='yellow',
            opacity=1
        ),
        mode='markers',
        name='选中城市'
    ))
    
    fig.update_layout(
        title='中国城市肥胖率与奶茶消费分布图',
        geo=dict(
            scope='asia',
            projection_type='mercator',
            center={'lat': 35, 'lon': 105},
            zoom=4,
            countrycolor='rgb(204, 204, 204)',
            countrywidth=1,
            coastlinewidth=1
        ),
        legend_title='气泡大小: 奶茶消费量'
    )
    
    return fig

@app.callback(
    Output('city-details', 'children'),
    [Input('city-dropdown', 'value')]
)
def update_city_details(selected_city):
    comparison = get_city_comparison(selected_city)
    if not comparison:
        return "未找到该城市数据"
    
    return html.Div([
        html.P(f"<strong>城市:</strong> {comparison['city']}", style={'margin': '5px 0'}),
        html.P(f"<strong>肥胖率:</strong> {comparison['obesity_rate']}% (排名: {comparison['obesity_rank']})", style={'margin': '5px 0'}),
        html.P(f"<strong>无糖/三分糖比例:</strong> {comparison['low_sugar_ratio']:.1f}% (排名: {comparison['low_sugar_rank']})", style={'margin': '5px 0'}),
        html.P(f"<strong>奶茶消费量:</strong> {comparison['consumption']}杯/月 (排名: {comparison['consumption_rank']})", style={'margin': '5px 0'}),
        html.Hr(),
        html.P(f"<strong>全国平均肥胖率:</strong> {comparison['avg_obesity']:.1f}%", style={'margin': '5px 0'}),
        html.P(f"<strong>全国平均低糖比例:</strong> {comparison['avg_low_sugar']:.1f}%", style={'margin': '5px 0'}),
        html.P(f"<strong>全国平均消费量:</strong> {int(comparison['avg_consumption'])}杯/月", style={'margin': '5px 0'})
    ])

@app.callback(
    Output('tier-bar-chart', 'figure'),
    []
)
def update_tier_chart():
    tier_data = pd.DataFrame([
        {'城市层级': tier_names.get(tier, tier), '低糖比例': info['avg_low_sugar_ratio']}
        for tier, info in tier_summary.items()
    ])
    
    fig = px.bar(tier_data, x='城市层级', y='低糖比例', 
                 title='各线城市无糖/三分糖选择比例',
                 color='城市层级',
                 labels={'低糖比例': '无糖/三分糖比例 (%)'},
                 text_auto='.1f')
    fig.update_layout(yaxis_range=[0, 70])
    return fig

@app.callback(
    Output('scatter-plot', 'figure'),
    [Input('city-dropdown', 'value')]
)
def update_scatter_plot(selected_city):
    fig = px.scatter(df, x='obesity_rate', y='low_sugar_ratio',
                     size='consumption',
                     color='consumption',
                     hover_name='name',
                     title='肥胖率与低糖选择比例散点图',
                     labels={'obesity_rate': '肥胖率 (%)', 'low_sugar_ratio': '无糖/三分糖比例 (%)'},
                     color_continuous_scale='Viridis')
    
    selected_data = df[df['name'] == selected_city].iloc[0]
    fig.add_trace(go.Scatter(
        x=[selected_data['obesity_rate']],
        y=[selected_data['low_sugar_ratio']],
        mode='markers',
        marker=dict(size=20, color='red'),
        name=selected_city
    ))
    
    z = df['obesity_rate']
    p = df['low_sugar_ratio']
    coeffs = pd.Series(z).corr(p)
    fig.add_trace(go.Scatter(
        x=df['obesity_rate'],
        y=df['low_sugar_ratio'].mean() + coeffs * (df['obesity_rate'] - df['obesity_rate'].mean()),
        mode='lines',
        line=dict(color='red', dash='dash'),
        name=f'趋势线 (r={coeffs:.2f})'
    ))
    
    return fig

if __name__ == '__main__':
    app.run_server(debug=True, host='0.0.0.0', port=8050)