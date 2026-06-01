import dash
from dash import dcc, html, Input, Output, State, callback
import plotly.graph_objects as go
import pandas as pd
import os
import sys
from dotenv import load_dotenv
import dash_leaflet as dl

load_dotenv()

sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
from geo.buffer_check import (
    load_parks_from_csv,
    load_residential_areas_from_csv,
    check_park_proximity
)
from data.complaint_matcher import (
    load_complaints_from_csv,
    match_complaints_to_parks
)

app = dash.Dash(__name__, title="广场舞噪音监测系统")
server = app.server

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
GAODE_API_KEY = os.getenv('GAODE_API_KEY', '')


def load_data():
    parks = load_parks_from_csv(os.path.join(DATA_DIR, 'parks.csv'))
    residential = load_residential_areas_from_csv(os.path.join(DATA_DIR, 'residential_areas.csv'))
    complaints = load_complaints_from_csv(os.path.join(DATA_DIR, 'complaints.csv'))
    
    parks_with_risk = check_park_proximity(parks, residential, buffer_meters=250)
    parks_with_complaints = match_complaints_to_parks(parks_with_risk, complaints, max_distance_meters=500)
    
    return parks_with_complaints


def get_risk_color(risk_level):
    color_map = {
        'high': '#dc3545',
        'medium': '#ffc107',
        'low': '#28a745'
    }
    return color_map.get(risk_level, '#6c757d')


def get_marker_size(complaint_count, base_size=10):
    return base_size + complaint_count * 3


parks_data = load_data()


def create_park_markers():
    markers = []
    for park in parks_data:
        risk_color = get_risk_color(park['risk_level'])
        size = get_marker_size(park['complaint_count_30d'])
        
        icon = {
            "iconUrl": f"data:image/svg+xml;base64,{create_marker_svg(risk_color, size)}",
            "iconSize": [size * 2, size * 2],
            "iconAnchor": [size, size]
        }
        
        popup_content = f"""
        <div style="padding: 10px; min-width: 200px;">
            <h4 style="margin: 0 0 10px 0;">{park['park_name']}</h4>
            <p style="margin: 5px 0;"><strong>风险等级:</strong> {'高' if park['risk_level'] == 'high' else '中' if park['risk_level'] == 'medium' else '低'}</p>
            <p style="margin: 5px 0;"><strong>风险评分:</strong> {park['risk_score']:.1f}</p>
            <p style="margin: 5px 0;"><strong>近30天投诉:</strong> {park['complaint_count_30d']} 起</p>
            <p style="margin: 5px 0;"><strong>最近居民区距离:</strong> {park.get('nearest_residential_distance', 0):.1f} 米</p>
        </div>
        """
        
        marker = dl.Marker(
            position=[park['lat'], park['lon']],
            icon=icon,
            id={'type': 'park-marker', 'index': park['park_id']},
            n_clicks=0
        )
        markers.append(marker)
    return markers


import base64

def create_marker_svg(color, size):
    svg = f'''
    <svg xmlns="http://www.w3.org/2000/svg" width="{size * 2}" height="{size * 2}" viewBox="0 0 {size * 2} {size * 2}">
        <circle cx="{size}" cy="{size}" r="{size - 2}" fill="{color}" stroke="white" stroke-width="2"/>
        <circle cx="{size}" cy="{size}" r="{size * 0.4}" fill="white"/>
    </svg>
    '''
    return base64.b64encode(svg.encode()).decode()


center_lat = sum(p['lat'] for p in parks_data) / len(parks_data)
center_lon = sum(p['lon'] for p in parks_data) / len(parks_data)

gaode_url = "https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"

app.layout = html.Div([
    html.Div([
        html.H1("广场舞噪音监测系统", style={'textAlign': 'center', 'color': '#333', 'marginBottom': '20px'}),
        html.P("分析公园广场舞场地与居民区的距离，关联12345热线投诉数据", 
               style={'textAlign': 'center', 'color': '#666', 'marginBottom': '30px'})
    ], style={'backgroundColor': '#f8f9fa', 'padding': '20px', 'borderRadius': '10px', 'marginBottom': '20px'}),
    
    html.Div([
        html.Div([
            html.H3("统计概览", style={'marginBottom': '20px'}),
            html.Div([
                html.Div([
                    html.H4("监测公园总数"),
                    html.H2(str(len(parks_data)), style={'color': '#007bff'})
                ], className='stat-card', style={'flex': 1, 'padding': '20px', 'backgroundColor': '#fff', 'borderRadius': '8px', 'boxShadow': '0 2px 4px rgba(0,0,0,0.1)', 'textAlign': 'center', 'margin': '0 10px'}),
                
                html.Div([
                    html.H4("高风险公园"),
                    html.H2(str(len([p for p in parks_data if p['risk_level'] == 'high'])), 
                            style={'color': '#dc3545'})
                ], className='stat-card', style={'flex': 1, 'padding': '20px', 'backgroundColor': '#fff', 'borderRadius': '8px', 'boxShadow': '0 2px 4px rgba(0,0,0,0.1)', 'textAlign': 'center', 'margin': '0 10px'}),
                
                html.Div([
                    html.H4("近30天投诉总数"),
                    html.H2(str(sum(p['complaint_count_30d'] for p in parks_data)), 
                            style={'color': '#fd7e14'})
                ], className='stat-card', style={'flex': 1, 'padding': '20px', 'backgroundColor': '#fff', 'borderRadius': '8px', 'boxShadow': '0 2px 4px rgba(0,0,0,0.1)', 'textAlign': 'center', 'margin': '0 10px'})
            ], style={'display': 'flex', 'marginBottom': '20px'}),
            
            html.Div([
                html.H4("风险等级图例", style={'marginBottom': '10px'}),
                html.Div([
                    html.Div([
                        html.Div(style={'width': '20px', 'height': '20px', 'backgroundColor': '#dc3545', 'borderRadius': '50%', 'display': 'inline-block', 'marginRight': '10px'}),
                        html.Span("高风险")
                    ], style={'margin': '5px 0'}),
                    html.Div([
                        html.Div(style={'width': '20px', 'height': '20px', 'backgroundColor': '#ffc107', 'borderRadius': '50%', 'display': 'inline-block', 'marginRight': '10px'}),
                        html.Span("中风险")
                    ], style={'margin': '5px 0'}),
                    html.Div([
                        html.Div(style={'width': '20px', 'height': '20px', 'backgroundColor': '#28a745', 'borderRadius': '50%', 'display': 'inline-block', 'marginRight': '10px'}),
                        html.Span("低风险")
                    ], style={'margin': '5px 0'})
                ])
            ], style={'padding': '15px', 'backgroundColor': '#fff', 'borderRadius': '8px', 'boxShadow': '0 2px 4px rgba(0,0,0,0.1)'})
        ], style={'width': '30%', 'paddingRight': '20px'}),
        
        html.Div([
            dl.Map(
                center=[center_lat, center_lon],
                zoom=11,
                children=[
                    dl.TileLayer(url=gaode_url, subdomains=['1', '2', '3', '4']),
                    dl.LayerGroup(id='park-markers', children=create_park_markers())
                ],
                style={'width': '100%', 'height': '600px', 'borderRadius': '8px', 'boxShadow': '0 2px 4px rgba(0,0,0,0.1)'}
            ),
            dcc.Store(id='selected-park-id', data=None)
        ], style={'width': '70%'})
    ], style={'display': 'flex', 'marginBottom': '20px'}),
    
    html.Div([
        html.H3("公园详情", style={'marginBottom': '20px'}),
        html.Div(id='park-detail', style={'padding': '20px', 'backgroundColor': '#fff', 'borderRadius': '8px', 'boxShadow': '0 2px 4px rgba(0,0,0,0.1)'})
    ], style={'marginBottom': '20px'}),
    
    html.Div([
        html.H3("公园投诉排名", style={'marginBottom': '20px'}),
        dcc.Graph(id='complaint-chart')
    ])
], style={'maxWidth': '1400px', 'margin': '0 auto', 'padding': '20px', 'backgroundColor': '#e9ecef'})


@app.callback(
    Output('selected-park-id', 'data'),
    Input({'type': 'park-marker', 'index': dash.ALL}, 'n_clicks'),
    State({'type': 'park-marker', 'index': dash.ALL}, 'id'),
    prevent_initial_call=True
)
def update_selected_park(n_clicks_list, ids_list):
    ctx = dash.callback_context
    if not ctx.triggered:
        return dash.no_update
    
    triggered_id = ctx.triggered[0]['prop_id'].split('.')[0]
    import json
    park_id = json.loads(triggered_id)['index']
    
    n_clicks = ctx.triggered[0]['value']
    if n_clicks and n_clicks > 0:
        return park_id
    return dash.no_update


@app.callback(
    Output('park-detail', 'children'),
    Input('selected-park-id', 'data')
)
def display_park_detail(selected_park_id):
    if selected_park_id is None:
        return html.P("点击地图上的公园标记查看详情", style={'textAlign': 'center', 'color': '#999'})
    
    park = next((p for p in parks_data if p['park_id'] == selected_park_id), None)
    
    if park is None:
        return html.P("未找到公园信息", style={'textAlign': 'center', 'color': '#999'})
    
    risk_color = get_risk_color(park['risk_level'])
    risk_text = '高' if park['risk_level'] == 'high' else '中' if park['risk_level'] == 'medium' else '低'
    
    complaints_html = []
    if park['complaints']:
        complaints_html.append(html.H4("最近投诉:", style={'marginTop': '20px', 'marginBottom': '10px'}))
        for complaint in park['complaints'][:5]:
            complaints_html.append(
                html.Div([
                    html.Strong(f"{complaint['title']}"),
                    html.P(f"{complaint['content']}"),
                    html.P(f"时间: {complaint['datetime']} | 距离: {complaint['distance']:.1f}米", 
                           style={'fontSize': '12px', 'color': '#666'})
                ], style={'padding': '10px', 'backgroundColor': '#f8f9fa', 'borderRadius': '5px', 'marginBottom': '10px'})
            )
    else:
        complaints_html.append(html.P("暂无投诉记录", style={'color': '#999'}))
    
    return [
        html.Div([
            html.H3(park['park_name'], style={'display': 'inline-block', 'marginRight': '15px'}),
            html.Span(f"{risk_text}风险", 
                     style={'padding': '5px 15px', 'backgroundColor': risk_color, 'color': 'white', 'borderRadius': '20px', 'fontSize': '14px'})
        ]),
        html.P(f"风险评分: {park['risk_score']:.1f}", style={'fontSize': '16px'}),
        html.P(f"最近居民区距离: {park.get('nearest_residential_distance', 0):.1f} 米", style={'fontSize': '16px'}),
        html.Div([
            html.Div([
                html.Strong("近7天投诉:"),
                html.Span(f" {park['complaint_count_7d']} 起", style={'color': '#fd7e14', 'fontWeight': 'bold'})
            ], style={'display': 'inline-block', 'marginRight': '30px'}),
            html.Div([
                html.Strong("近30天投诉:"),
                html.Span(f" {park['complaint_count_30d']} 起", style={'color': '#dc3545', 'fontWeight': 'bold'})
            ], style={'display': 'inline-block'})
        ], style={'padding': '15px', 'backgroundColor': '#f8f9fa', 'borderRadius': '5px', 'marginTop': '10px'})
    ] + complaints_html


@app.callback(
    Output('complaint-chart', 'figure'),
    Input('selected-park-id', 'data')
)
def update_complaint_chart(_):
    sorted_parks = sorted(parks_data, key=lambda x: x['complaint_count_30d'], reverse=True)
    
    names = [p['park_name'] for p in sorted_parks]
    complaint_30d = [p['complaint_count_30d'] for p in sorted_parks]
    complaint_7d = [p['complaint_count_7d'] for p in sorted_parks]
    colors = [get_risk_color(p['risk_level']) for p in sorted_parks]
    
    fig = go.Figure()
    
    fig.add_trace(go.Bar(
        name='近30天投诉',
        x=names,
        y=complaint_30d,
        marker_color=colors,
        opacity=0.8
    ))
    
    fig.add_trace(go.Bar(
        name='近7天投诉',
        x=names,
        y=complaint_7d,
        marker_color='#6c757d',
        opacity=0.6
    ))
    
    fig.update_layout(
        barmode='group',
        title='各公园投诉数量对比',
        xaxis_title='公园名称',
        yaxis_title='投诉数量（起）',
        margin=dict(l=0, r=0, t=40, b=0),
        height=400
    )
    
    return fig


if __name__ == '__main__':
    app.run(debug=False, port=8050)
