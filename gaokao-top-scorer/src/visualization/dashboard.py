import dash
from dash import dcc, html, Input, Output
import plotly.graph_objects as go
import plotly.express as px
import sys
import os
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.data.top_scorer_loader import TopScorerLoader
from src.analysis.university_flow import UniversityFlowAnalyzer

loader = TopScorerLoader()
data = loader.load_data()
analyzer = UniversityFlowAnalyzer(data)

app = dash.Dash(__name__, title="高考状元流向分析系统")
server = app.server

colors = {
    'background': '#f8f9fa',
    'text': '#2c3e50',
    'primary': '#3498db',
    'secondary': '#e74c3c',
    'accent': '#2ecc71'
}

app.layout = html.Div([
    html.Div([
        html.H1("高考状元流向分析系统", 
                style={'textAlign': 'center', 'color': colors['text'], 'marginBottom': '10px'}),
        html.P("追踪历年高考状元的大学及专业选择，分析顶尖教育资源的地域分布",
               style={'textAlign': 'center', 'color': '#7f8c8d', 'marginBottom': '30px'})
    ], style={'padding': '20px', 'backgroundColor': 'white', 'boxShadow': '0 2px 4px rgba(0,0,0,0.1)'}),

    html.Div([
        html.Div([
            html.H3("总体统计", style={'color': colors['text'], 'textAlign': 'center'}),
            html.Div([
                html.Div([
                    html.H4(id='total-count', style={'color': colors['primary'], 'fontSize': '32px', 'margin': '0'}),
                    html.P("状元总数", style={'color': '#7f8c8d', 'margin': '5px 0'})
                ], className='stat-card', style={'flex': 1, 'textAlign': 'center', 'padding': '15px'}),
                html.Div([
                    html.H4(id='province-count', style={'color': colors['accent'], 'fontSize': '32px', 'margin': '0'}),
                    html.P("覆盖省份", style={'color': '#7f8c8d', 'margin': '5px 0'})
                ], className='stat-card', style={'flex': 1, 'textAlign': 'center', 'padding': '15px'}),
                html.Div([
                    html.H4(id='school-count', style={'color': colors['secondary'], 'fontSize': '32px', 'margin': '0'}),
                    html.P("录取院校", style={'color': '#7f8c8d', 'margin': '5px 0'})
                ], className='stat-card', style={'flex': 1, 'textAlign': 'center', 'padding': '15px'}),
                html.Div([
                    html.H4(id='year-range', style={'color': '#9b59b6', 'fontSize': '32px', 'margin': '0'}),
                    html.P("统计年份", style={'color': '#7f8c8d', 'margin': '5px 0'})
                ], className='stat-card', style={'flex': 1, 'textAlign': 'center', 'padding': '15px'}),
            ], style={'display': 'flex', 'justifyContent': 'space-around', 'backgroundColor': 'white', 'borderRadius': '10px', 'padding': '10px'})
        ], style={'marginBottom': '30px'})
    ], style={'padding': '0 20px'}),

    html.Div([
        html.H2("状元生源流向地图", style={'color': colors['text'], 'marginBottom': '20px', 'padding': '0 20px'}),
        html.Div([
            dcc.Graph(id='flow-map', style={'height': '600px'})
        ], style={'backgroundColor': 'white', 'borderRadius': '10px', 'padding': '20px', 'margin': '0 20px', 'boxShadow': '0 2px 4px rgba(0,0,0,0.1)'})
    ], style={'marginBottom': '30px'}),

    html.Div([
        html.H2("专业选择趋势分析", style={'color': colors['text'], 'marginBottom': '20px', 'padding': '0 20px'}),
        html.Div([
            dcc.Graph(id='major-trend-chart', style={'height': '450px'})
        ], style={'backgroundColor': 'white', 'borderRadius': '10px', 'padding': '20px', 'margin': '0 20px', 'boxShadow': '0 2px 4px rgba(0,0,0,0.1)'})
    ], style={'marginBottom': '30px'}),

    html.Div([
        html.H2("各省状元输出排名", style={'color': colors['text'], 'marginBottom': '20px', 'padding': '0 20px'}),
        html.Div([
            dcc.Graph(id='province-ranking-chart', style={'height': '500px'})
        ], style={'backgroundColor': 'white', 'borderRadius': '10px', 'padding': '20px', 'margin': '0 20px', 'boxShadow': '0 2px 4px rgba(0,0,0,0.1)'})
    ], style={'marginBottom': '30px'}),

    html.Div([
        html.H2("各大学录取状元统计", style={'color': colors['text'], 'marginBottom': '20px', 'padding': '0 20px'}),
        html.Div([
            dcc.Graph(id='university-stats-chart', style={'height': '450px'})
        ], style={'backgroundColor': 'white', 'borderRadius': '10px', 'padding': '20px', 'margin': '0 20px', 'boxShadow': '0 2px 4px rgba(0,0,0,0.1)'})
    ], style={'marginBottom': '30px'}),

    html.Div([
        html.H2("生源集中度分析", style={'color': colors['text'], 'marginBottom': '20px', 'padding': '0 20px'}),
        html.Div([
            dcc.Graph(id='concentration-pie-chart', style={'height': '400px'})
        ], style={'backgroundColor': 'white', 'borderRadius': '10px', 'padding': '20px', 'margin': '0 20px', 'boxShadow': '0 2px 4px rgba(0,0,0,0.1)'})
    ], style={'marginBottom': '40px'}),

    html.Div([
        html.P("数据来源：阳光高考平台、各大学招生网公开数据", 
               style={'textAlign': 'center', 'color': '#7f8c8d', 'fontSize': '12px'})
    ], style={'padding': '20px', 'backgroundColor': 'white'})

], style={'backgroundColor': colors['background'], 'minHeight': '100vh', 'fontFamily': 'Arial, sans-serif'})


@app.callback(
    [Output('total-count', 'children'),
     Output('province-count', 'children'),
     Output('school-count', 'children'),
     Output('year-range', 'children')],
    Input('flow-map', 'figure')
)
def update_stats(_):
    stats = loader.get_statistics()
    year_range = f"{stats['year_range'][0]}-{stats['year_range'][1]}"
    return stats['total_count'], stats['province_count'], stats['school_count'], year_range


@app.callback(
    Output('flow-map', 'figure'),
    Input('flow-map', 'figure')
)
def update_flow_map(_):
    flows = analyzer.get_flow_data()
    
    fig = go.Figure()
    
    max_count = max(f['count'] for f in flows) if flows else 1
    
    for flow in flows:
        line_width = 1 + (flow['count'] / max_count) * 8
        
        fig.add_trace(go.Scattergeo(
            lon=[flow['source_lon'], flow['target_lon']],
            lat=[flow['source_lat'], flow['target_lat']],
            mode='lines',
            line=dict(width=line_width, color=f'rgba(52, 152, 219, {0.3 + flow["count"]/max_count * 0.5})'),
            text=f"{flow['source']} → {flow['target']}: {flow['count']}人",
            hoverinfo='text',
            name='',
            showlegend=False
        ))
    
    source_provinces = set(f['source'] for f in flows)
    target_universities = set(f['target'] for f in flows)
    
    source_lons = []
    source_lats = []
    source_texts = []
    
    for province in source_provinces:
        if province in analyzer.province_coords:
            lon, lat = analyzer.province_coords[province]
            count = sum(f['count'] for f in flows if f['source'] == province)
            source_lons.append(lon)
            source_lats.append(lat)
            source_texts.append(f"{province}<br>输出: {count}人")
    
    fig.add_trace(go.Scattergeo(
        lon=source_lons,
        lat=source_lats,
        mode='markers',
        marker=dict(size=12, color=colors['accent'], line=dict(width=2, color='white')),
        text=source_texts,
        hoverinfo='text',
        name='生源地'
    ))
    
    target_lons = []
    target_lats = []
    target_texts = []
    
    for uni in target_universities:
        if uni in analyzer.university_coords:
            lon, lat = analyzer.university_coords[uni]
            count = sum(f['count'] for f in flows if f['target'] == uni)
            target_lons.append(lon)
            target_lats.append(lat)
            target_texts.append(f"{uni}<br>录取: {count}人")
    
    fig.add_trace(go.Scattergeo(
        lon=target_lons,
        lat=target_lats,
        mode='markers',
        marker=dict(size=15, color=colors['secondary'], symbol='star', line=dict(width=2, color='white')),
        text=target_texts,
        hoverinfo='text',
        name='目标院校'
    ))
    
    fig.update_geos(
        scope='asia',
        projection=dict(scale=1.8),
        center=dict(lon=110, lat=35),
        showland=True,
        landcolor='rgb(235, 235, 235)',
        showcountries=True,
        countrycolor='rgb(200, 200, 200)',
        showcoastlines=False,
        showframe=False
    )
    
    fig.update_layout(
        geo=dict(showframe=False, showcoastlines=False),
        margin=dict(l=0, r=0, t=0, b=0),
        legend=dict(orientation='h', yanchor='bottom', y=0.01, xanchor='right', x=0.99)
    )
    
    return fig


@app.callback(
    Output('major-trend-chart', 'figure'),
    Input('flow-map', 'figure')
)
def update_major_trend(_):
    trend_df = analyzer.get_major_trend()
    
    colors_map = {
        '计算机类': '#3498db',
        '经管类': '#e74c3c',
        '医学类': '#2ecc71',
        '工科类': '#f39c12',
        '理科类': '#9b59b6',
        '法学类': '#1abc9c',
        '其他': '#95a5a6'
    }
    
    fig = go.Figure()
    
    for category in trend_df.columns:
        fig.add_trace(go.Scatter(
            x=trend_df.index,
            y=trend_df[category],
            mode='lines+markers',
            name=category,
            line=dict(color=colors_map.get(category, '#95a5a6'), width=3),
            marker=dict(size=8)
        ))
    
    fig.update_layout(
        xaxis_title='年份',
        yaxis_title='人数',
        hovermode='x unified',
        legend=dict(orientation='h', yanchor='bottom', y=1.02, xanchor='right', x=1),
        margin=dict(l=40, r=40, t=40, b=40)
    )
    
    return fig


@app.callback(
    Output('province-ranking-chart', 'figure'),
    Input('flow-map', 'figure')
)
def update_province_ranking(_):
    ranking = analyzer.get_province_ranking()
    
    provinces = [r['province'] for r in ranking][:15]
    counts = [r['total_count'] for r in ranking][:15]
    
    colors_list = [colors['primary'] if p in ['河北', '河南', '山东'] else '#bdc3c7' for p in provinces]
    
    fig = go.Figure(go.Bar(
        x=counts,
        y=provinces,
        orientation='h',
        marker_color=colors_list,
        text=counts,
        textposition='auto'
    ))
    
    fig.update_layout(
        xaxis_title='状元人数',
        yaxis_title='省份',
        yaxis=dict(autorange='reversed'),
        margin=dict(l=40, r=40, t=40, b=40)
    )
    
    return fig


@app.callback(
    Output('university-stats-chart', 'figure'),
    Input('flow-map', 'figure')
)
def update_university_stats(_):
    top_unis = analyzer.get_top_universities(10)
    
    names = [u[0] for u in top_unis]
    counts = [u[1] for u in top_unis]
    
    colors_list = [colors['secondary'] if n in ['清华大学', '北京大学'] else '#3498db' for n in names]
    
    fig = go.Figure(go.Bar(
        x=names,
        y=counts,
        marker_color=colors_list,
        text=counts,
        textposition='auto'
    ))
    
    fig.update_layout(
        xaxis_title='大学',
        yaxis_title='录取状元人数',
        margin=dict(l=40, r=40, t=40, b=40)
    )
    
    return fig


@app.callback(
    Output('concentration-pie-chart', 'figure'),
    Input('flow-map', 'figure')
)
def update_concentration_pie(_):
    outflow = analyzer.get_province_outflow()
    
    top3 = sorted(outflow.items(), key=lambda x: x[1], reverse=True)[:3]
    others_sum = sum(v for k, v in outflow.items() if k not in [x[0] for x in top3])
    
    labels = [x[0] for x in top3] + ['其他省份']
    values = [x[1] for x in top3] + [others_sum]
    
    colors_list = [colors['primary'], colors['accent'], colors['secondary'], '#bdc3c7']
    
    fig = go.Figure(go.Pie(
        labels=labels,
        values=values,
        marker=dict(colors=colors_list),
        textinfo='label+percent',
        hoverinfo='label+value',
        textposition='inside'
    ))
    
    fig.update_layout(
        margin=dict(l=40, r=40, t=40, b=40)
    )
    
    return fig


if __name__ == '__main__':
    app.run_server(debug=True, host='0.0.0.0', port=8050)
