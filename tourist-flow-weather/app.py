import dash
from dash import dcc, html, Input, Output, State, callback_context
import plotly.graph_objs as go
import plotly.express as px
import pandas as pd
import base64
import io
import time
import gc
import os
import psutil

from parsers.weather_parser import WeatherParser
from parsers.tourist_parser import TouristParser
from analysis.correlation import CorrelationAnalyzer
from ai_guide.ai_guide import AIGuide


tourist_parser = TouristParser()
weather_parser = WeatherParser()
analyzer = CorrelationAnalyzer()
ai_guide = AIGuide()


app = dash.Dash(__name__, title='文旅客流与天气分析')
server = app.server


app.layout = html.Div([
    dcc.Store(id='stored-data'),
    dcc.Store(id='last-location', data='黄山风景区'),
    
    html.H1('🏔️ 文旅客流与天气分析系统', style={'textAlign': 'center', 'color': '#2c3e50', 'marginBottom': 30}),
    
    html.Div(id='api-status', style={
        'padding': '12px 20px',
        'marginBottom': '20px',
        'borderRadius': '8px',
        'textAlign': 'center',
        'display': 'none',
        'fontWeight': '500'
    }),
    
    html.Div([
        html.Div([
            html.Label('选择景区:'),
            dcc.Dropdown(
                id='location-dropdown',
                options=[
                    {'label': '黄山风景区', 'value': '黄山风景区'},
                    {'label': '故宫博物院', 'value': '故宫博物院'},
                    {'label': '西湖风景区', 'value': '西湖风景区'},
                    {'label': '九寨沟', 'value': '九寨沟'},
                    {'label': '张家界', 'value': '张家界'}
                ],
                value='黄山风景区',
                style={'width': '100%'}
            )
        ], style={'width': '30%', 'display': 'inline-block', 'marginRight': '5%'}),
        
        html.Div([
            html.Label('年份:'),
            dcc.Dropdown(
                id='year-dropdown',
                options=[{'label': str(year), 'value': year} for year in range(2022, 2026)],
                value=2024,
                style={'width': '100%'}
            )
        ], style={'width': '30%', 'display': 'inline-block', 'marginRight': '5%'}),
        
        html.Div([
            html.Button(
                '🔄 加载数据', 
                id='load-data-btn', 
                n_clicks=0,
                disabled=False,
                style={
                    'marginTop': 20, 
                    'padding': '10px 20px', 
                    'backgroundColor': '#3498db', 
                    'color': 'white', 
                    'border': 'none', 
                    'borderRadius': 5, 
                    'cursor': 'pointer',
                    'transition': 'all 0.3s',
                    'minWidth': '120px'
                }
            ),
            dcc.Loading(
                id='loading-data-btn',
                type='circle',
                color='#3498db',
                children=[html.Div(id='load-data-status')],
                style={'display': 'inline-block', 'marginLeft': '10px'}
            )
        ], style={'width': '25%', 'display': 'inline-block', 'verticalAlign': 'bottom'})
    ], style={'marginBottom': 30, 'backgroundColor': '#f8f9fa', 'padding': 20, 'borderRadius': 10}),
    
    dcc.Tabs(id='tabs', value='tab-overview', children=[
        dcc.Tab(label='📊 数据概览', value='tab-overview', children=[
            html.Div([
                dcc.Loading(
                    id='loading-overview',
                    type='default',
                    color='#3498db',
                    fullscreen=False,
                    children=[
                        html.Div([
                            dcc.Graph(id='tourist-weather-chart')
                        ], style={'width': '100%', 'marginBottom': 20}),
                        
                        html.Div([
                            html.Div([
                                html.H4('📈 客流量统计'),
                                html.Div(id='tourist-stats')
                            ], style={'width': '30%', 'display': 'inline-block', 'backgroundColor': '#e8f4f8', 'padding': 20, 'borderRadius': 10, 'marginRight': '3%'}),
                            
                            html.Div([
                                html.H4('🌤️ 天气统计'),
                                html.Div(id='weather-stats')
                            ], style={'width': '30%', 'display': 'inline-block', 'backgroundColor': '#e8f4f8', 'padding': 20, 'borderRadius': 10, 'marginRight': '3%'}),
                            
                            html.Div([
                                html.H4('📉 相关性分析'),
                                html.Div(id='correlation-stats')
                            ], style={'width': '30%', 'display': 'inline-block', 'backgroundColor': '#e8f4f8', 'padding': 20, 'borderRadius': 10})
                        ])
                    ]
                )
            ], style={'padding': 20})
        ]),
        
        dcc.Tab(label='🔍 关联分析', value='tab-analysis', children=[
            html.Div([
                dcc.Loading(
                    id='loading-analysis',
                    type='default',
                    color='#9b59b6',
                    children=[
                        html.Div([
                            dcc.Graph(id='correlation-scatter')
                        ], style={'width': '48%', 'display': 'inline-block', 'marginRight': '4%'}),
                        
                        html.Div([
                            dcc.Graph(id='correlation-heatmap')
                        ], style={'width': '48%', 'display': 'inline-block'}),
                        
                        html.Div([
                            html.H3('📋 详细分析报告'),
                            html.Pre(id='analysis-report', style={'backgroundColor': '#f8f9fa', 'padding': 20, 'borderRadius': 10, 'whiteSpace': 'pre-wrap'})
                        ], style={'marginTop': 20})
                    ]
                )
            ], style={'padding': 20})
        ]),
        
        dcc.Tab(label='🤖 AI导游推荐', value='tab-ai', children=[
            html.Div([
                html.Div([
                    html.Div([
                        html.Label('API连接测试:'),
                        html.Button(
                            '🔌 测试API连接', 
                            id='test-api-btn', 
                            n_clicks=0,
                            style={
                                'marginLeft': 10,
                                'padding': '6px 15px', 
                                'backgroundColor': '#95a5a6', 
                                'color': 'white', 
                                'border': 'none', 
                                'borderRadius': 5, 
                                'cursor': 'pointer',
                                'fontSize': '14px'
                            }
                        ),
                        dcc.Loading(
                            id='loading-test-api',
                            type='dot',
                            color='#95a5a6',
                            children=[html.Div(id='test-api-status')],
                            style={'display': 'inline-block', 'marginLeft': '10px'}
                        )
                    ], style={'marginBottom': 15}),
                    html.Div(id='api-test-result', style={'marginBottom': 15, 'padding': 10, 'borderRadius': 5}),
                    
                    html.Label('输入您的偏好（可选）:'),
                    dcc.Textarea(
                        id='preferences-input',
                        placeholder='例如：喜欢摄影，希望人少，不喜欢爬山...',
                        style={'width': '100%', 'height': 100, 'padding': 10}
                    ),
                    html.Button(
                        '✨ 获取AI推荐', 
                        id='ai-recommend-btn', 
                        n_clicks=0,
                        disabled=False,
                        style={
                            'marginTop': 10, 
                            'padding': '10px 20px', 
                            'backgroundColor': '#9b59b6', 
                            'color': 'white', 
                            'border': 'none', 
                            'borderRadius': 5, 
                            'cursor': 'pointer',
                            'transition': 'all 0.3s',
                            'minWidth': '140px'
                        }
                    ),
                    dcc.Loading(
                        id='loading-ai-btn',
                        type='circle',
                        color='#9b59b6',
                        children=[html.Div(id='ai-btn-status')],
                        style={'display': 'inline-block', 'marginLeft': '10px'}
                    )
                ], style={'marginBottom': 20}),
                
                dcc.Loading(
                    id='loading-ai',
                    type='circle',
                    color='#9b59b6',
                    fullscreen=False,
                    children=[
                        html.Div(id='ai-recommendation', 
                                style={'backgroundColor': '#fdf2e9', 'padding': 30, 'borderRadius': 10, 'minHeight': 400})
                    ]
                )
            ], style={'padding': 20})
        ]),
        
        dcc.Tab(label='📁 数据导入', value='tab-import', children=[
            html.Div([
                html.H3('PDF数据导入'),
                html.Div([
                    html.Strong('📋 支持的格式:'),
                    html.Span(' 接待游客XXX万人次、游客量XXX人次、旅游收入XXX亿元', 
                             style={'color': '#666'})
                ], style={'marginBottom': 10, 'fontSize': '14px'}),
                
                dcc.Upload(
                    id='upload-pdf',
                    children=html.Div([
                        '拖拽PDF文件到此处 或 ',
                        html.A('点击选择文件', style={'fontWeight': 'bold', 'color': '#3498db'})
                    ]),
                    style={
                        'width': '100%',
                        'height': 80,
                        'lineHeight': '80px',
                        'borderWidth': '2px',
                        'borderStyle': 'dashed',
                        'borderRadius': '10px',
                        'borderColor': '#bdc3c7',
                        'textAlign': 'center',
                        'margin': '15px 0',
                        'backgroundColor': '#fafafa',
                        'transition': 'all 0.3s'
                    },
                    accept='.pdf',
                    max_size=10*1024*1024
                ),
                
                dcc.Loading(
                    id='loading-pdf',
                    type='dot',
                    color='#27ae60',
                    children=[
                        html.Div(id='upload-status', style={'minHeight': 60})
                    ]
                ),
                
                html.Hr(style={'margin': '30px 0', 'borderColor': '#ecf0f1'}),
                
                html.H3('快速加载示例数据', style={'marginBottom': 15}),
                html.Div([
                    html.Button(
                        '🏔️ 黄山', 
                        id='load-sample-btn', 
                        n_clicks=0,
                        style={
                            'padding': '12px 24px', 
                            'backgroundColor': '#27ae60', 
                            'color': 'white', 
                            'border': 'none', 
                            'borderRadius': 8, 
                            'cursor': 'pointer', 
                            'marginRight': '10px',
                            'marginBottom': '10px',
                            'fontSize': '15px',
                            'fontWeight': '500'
                        }
                    ),
                    html.Button(
                        '🏛️ 故宫', 
                        id='load-sample-btn-gg', 
                        n_clicks=0,
                        style={
                            'padding': '12px 24px', 
                            'backgroundColor': '#e67e22', 
                            'color': 'white', 
                            'border': 'none', 
                            'borderRadius': 8, 
                            'cursor': 'pointer', 
                            'marginRight': '10px',
                            'marginBottom': '10px',
                            'fontSize': '15px',
                            'fontWeight': '500'
                        }
                    ),
                    html.Button(
                        '🌊 西湖', 
                        id='load-sample-btn-xh', 
                        n_clicks=0,
                        style={
                            'padding': '12px 24px', 
                            'backgroundColor': '#3498db', 
                            'color': 'white', 
                            'border': 'none', 
                            'borderRadius': 8, 
                            'cursor': 'pointer', 
                            'marginRight': '10px',
                            'marginBottom': '10px',
                            'fontSize': '15px',
                            'fontWeight': '500'
                        }
                    ),
                    html.Button(
                        '💧 九寨沟', 
                        id='load-sample-btn-jzg', 
                        n_clicks=0,
                        style={
                            'padding': '12px 24px', 
                            'backgroundColor': '#9b59b6', 
                            'color': 'white', 
                            'border': 'none', 
                            'borderRadius': 8, 
                            'cursor': 'pointer', 
                            'marginRight': '10px',
                            'marginBottom': '10px',
                            'fontSize': '15px',
                            'fontWeight': '500'
                        }
                    ),
                    html.Button(
                        '⛰️ 张家界', 
                        id='load-sample-btn-zjj', 
                        n_clicks=0,
                        style={
                            'padding': '12px 24px', 
                            'backgroundColor': '#e74c3c', 
                            'color': 'white', 
                            'border': 'none', 
                            'borderRadius': 8, 
                            'cursor': 'pointer',
                            'marginBottom': '10px',
                            'fontSize': '15px',
                            'fontWeight': '500'
                        }
                    )
                ]),
                
                html.Hr(style={'margin': '30px 0', 'borderColor': '#ecf0f1'}),
                
                html.Div([
                    html.H4('🖥️ 系统状态监控'),
                    html.Div(id='system-status', style={
                        'backgroundColor': '#f8f9fa',
                        'padding': 15,
                        'borderRadius': 8,
                        'fontFamily': 'monospace',
                        'fontSize': '13px'
                    }),
                    html.Button(
                        '🔄 刷新系统状态',
                        id='refresh-status-btn',
                        n_clicks=0,
                        style={
                            'marginTop': 10,
                            'padding': '6px 15px',
                            'backgroundColor': '#95a5a6',
                            'color': 'white',
                            'border': 'none',
                            'borderRadius': 5,
                            'cursor': 'pointer'
                        }
                    )
                ])
            ], style={'padding': 20})
        ])
    ])
], style={'maxWidth': 1400, 'margin': '0 auto', 'padding': 20})


def get_system_status():
    process = psutil.Process(os.getpid())
    memory_mb = process.memory_info().rss / 1024 / 1024
    cpu_percent = process.cpu_percent()
    
    return html.Div([
        html.Div([
            html.Strong('内存使用: '),
            html.Span(f'{memory_mb:.1f} MB', style={'color': '#27ae60' if memory_mb < 500 else '#e67e22' if memory_mb < 1000 else '#e74c3c'})
        ]),
        html.Div([
            html.Strong('CPU使用: '),
            html.Span(f'{cpu_percent:.1f}%', style={'color': '#27ae60' if cpu_percent < 50 else '#e67e22' if cpu_percent < 80 else '#e74c3c'})
        ]),
        html.Div([
            html.Strong('GC对象: '),
            html.Span(f'{len(gc.get_objects()):,}')
        ])
    ])


def parse_pdf_contents(contents, filename):
    if contents is None:
        return None, None, None
    
    content_type, content_string = contents.split(',')
    file_size = len(content_string) * 3 / 4 / 1024 / 1024
    
    if file_size > 10:
        return False, f"文件过大: {file_size:.2f} MB，最大支持10MB", None
    
    decoded = base64.b64decode(content_string)
    
    try:
        import PyPDF2
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(decoded))
        text = ''
        for page in pdf_reader.pages:
            text += page.extract_text() + '\n'
        
        result = tourist_parser.extract_from_text(text, filename, 2024)
        
        if not result.empty:
            return True, f"成功解析PDF文件: {filename}，提取到 {len(result)} 条数据", result
        else:
            return False, f"PDF解析完成，但未提取到游客数据。请检查文件格式是否符合要求。", None
    except Exception as e:
        return False, f"PDF解析失败: {str(e)}", None


@app.callback(
    [Output('stored-data', 'data'),
     Output('api-status', 'children'),
     Output('api-status', 'style'),
     Output('last-location', 'data'),
     Output('load-data-btn', 'disabled'),
     Output('load-data-btn', 'children'),
     Output('load-data-status', 'children')],
    [Input('load-data-btn', 'n_clicks'),
     Input('load-sample-btn', 'n_clicks'),
     Input('load-sample-btn-gg', 'n_clicks'),
     Input('load-sample-btn-xh', 'n_clicks'),
     Input('load-sample-btn-jzg', 'n_clicks'),
     Input('load-sample-btn-zjj', 'n_clicks'),
     Input('upload-pdf', 'contents')],
    [State('location-dropdown', 'value'),
     State('year-dropdown', 'value'),
     State('upload-pdf', 'filename')]
)
def load_data(n_clicks_data, n_clicks_sample_gg, n_clicks_sample_xh, n_clicks_sample_jzg, n_clicks_sample_zjj, n_clicks_sample, contents, location, year, filename):
    ctx = callback_context
    if not ctx.triggered:
        return None, '', {'display': 'none'}, location, False, '🔄 加载数据', ''
    
    triggered_id = ctx.triggered[0]['prop_id'].split('.')[0]
    
    location_map = {
        'load-sample-btn': '黄山风景区',
        'load-sample-btn-gg': '故宫博物院',
        'load-sample-btn-xh': '西湖风景区',
        'load-sample-btn-jzg': '九寨沟',
        'load-sample-btn-zjj': '张家界'
    }
    
    if triggered_id in location_map:
        target_location = location_map[triggered_id]
        df = tourist_parser.load_sample_data(target_location)
        status_msg = f"✅ 成功加载 {target_location} 示例数据，共 {len(df)} 条记录"
        status_style = {
            'padding': '12px 20px',
            'marginBottom': '20px',
            'borderRadius': '8px',
            'textAlign': 'center',
            'backgroundColor': '#d4edda',
            'color': '#155724',
            'border': '1px solid #c3e6cb',
            'display': 'block'
        }
        gc.collect()
        return df.to_dict('records'), status_msg, status_style, target_location, False, '🔄 加载数据', ''
    
    if triggered_id == 'upload-pdf' and contents is not None:
        success, message, df = parse_pdf_contents(contents, filename)
        if success and df is not None:
            status_style = {
                'padding': '12px 20px',
                'marginBottom': '20px',
                'borderRadius': '8px',
                'textAlign': 'center',
                'backgroundColor': '#d4edda',
                'color': '#155724',
                'border': '1px solid #c3e6cb',
                'display': 'block'
            }
            gc.collect()
            return df.to_dict('records'), f"✅ {message}", status_style, location, False, '🔄 加载数据', ''
        else:
            status_style = {
                'padding': '12px 20px',
                'marginBottom': '20px',
                'borderRadius': '8px',
                'textAlign': 'center',
                'backgroundColor': '#f8d7da',
                'color': '#721c24',
                'border': '1px solid #f5c6cb',
                'display': 'block'
            }
            return None, f"❌ {message}", status_style, location, False, '🔄 加载数据', ''
    
    if triggered_id == 'load-data-btn':
        try:
            start_time = time.time()
            weather_df = weather_parser.get_monthly_weather_stats(location, year)
            
            if weather_df.empty:
                print(f"API获取 {location} 天气数据失败，使用示例数据")
                weather_df = weather_parser.get_sample_weather_data(location, year)
                status_msg = f"⚠️ API调用失败，已使用 {location} 示例数据"
                status_style = {
                    'padding': '12px 20px',
                    'marginBottom': '20px',
                    'borderRadius': '8px',
                    'textAlign': 'center',
                    'backgroundColor': '#fff3cd',
                    'color': '#856404',
                    'border': '1px solid #ffeaa7',
                    'display': 'block'
                }
            else:
                elapsed = time.time() - start_time
                status_msg = f"✅ 成功获取 {location} 天气数据 (API调用耗时: {elapsed:.2f}秒)"
                status_style = {
                    'padding': '12px 20px',
                    'marginBottom': '20px',
                    'borderRadius': '8px',
                    'textAlign': 'center',
                    'backgroundColor': '#d4edda',
                    'color': '#155724',
                    'border': '1px solid #c3e6cb',
                    'display': 'block'
                }
            
            tourist_df = tourist_parser.load_sample_data(location)
            
            merged_df = tourist_df.merge(weather_df, on='month', suffixes=('', '_weather'))
            
            for col in ['precipitation', 'avg_temp', 'rainy_days']:
                if f'{col}_weather' in merged_df.columns:
                    merged_df[col] = merged_df[f'{col}_weather']
                    merged_df.drop(f'{col}_weather', axis=1, inplace=True)
            
            print(f"成功加载数据: {location} {year}年")
            gc.collect()
            
            return merged_df.to_dict('records'), status_msg, status_style, location, False, '🔄 加载数据', ''
        except Exception as e:
            print(f"加载真实数据失败: {e}")
            df = tourist_parser.load_sample_data(location)
            status_msg = f"❌ 数据加载失败: {str(e)}，已使用示例数据"
            status_style = {
                'padding': '12px 20px',
                'marginBottom': '20px',
                'borderRadius': '8px',
                'textAlign': 'center',
                'backgroundColor': '#f8d7da',
                'color': '#721c24',
                'border': '1px solid #f5c6cb',
                'display': 'block'
            }
            return df.to_dict('records'), status_msg, status_style, location, False, '🔄 加载数据', ''
    
    return None, '', {'display': 'none'}, location, False, '🔄 加载数据', ''


@app.callback(
    [Output('tourist-weather-chart', 'figure'),
     Output('tourist-stats', 'children'),
     Output('weather-stats', 'children'),
     Output('correlation-stats', 'children')],
    [Input('stored-data', 'data')]
)
def update_overview(data):
    if not data:
        return go.Figure(), html.P('请先加载数据', style={'color': '#999', 'textAlign': 'center', 'padding': 20}), html.P('请先加载数据', style={'color': '#999', 'textAlign': 'center', 'padding': 20}), html.P('请先加载数据', style={'color': '#999', 'textAlign': 'center', 'padding': 20})
    
    df = pd.DataFrame(data)
    months = [f'{m}月' for m in df['month']]
    
    fig = go.Figure()
    
    fig.add_trace(go.Bar(
        x=months,
        y=df['tourist_count'],
        name='客流量',
        yaxis='y',
        marker_color='#3498db',
        opacity=0.7,
        hovertemplate='%{x}<br>客流量: %{y:,.0f}人次<extra></extra>'
    ))
    
    fig.add_trace(go.Scatter(
        x=months,
        y=df['precipitation'],
        name='降雨量(mm)',
        yaxis='y2',
        mode='lines+markers',
        line=dict(color='#e74c3c', width=3),
        marker=dict(size=8),
        hovertemplate='%{x}<br>降雨量: %{y:.1f}mm<extra></extra>'
    ))
    
    location = df['location'].iloc[0] if 'location' in df.columns else '景区'
    fig.update_layout(
        title=f'{location} - 客流量与降雨量对比',
        yaxis=dict(title='客流量 (人次)', side='left'),
        yaxis2=dict(title='降雨量 (mm)', side='right', overlaying='y'),
        hovermode='x unified',
        height=500,
        legend=dict(orientation='h', y=1.05),
        margin=dict(t=80)
    )
    
    tourist_stats = html.Div([
        html.P(f"年均客流量: {df['tourist_count'].mean():,.0f} 人次"),
        html.P(f"最高月份: {df.loc[df['tourist_count'].idxmax(), 'month']}月 ({df['tourist_count'].max():,.0f})"),
        html.P(f"最低月份: {df.loc[df['tourist_count'].idxmin(), 'month']}月 ({df['tourist_count'].min():,.0f})"),
        html.P(f"客流波动系数: {df['tourist_count'].std()/df['tourist_count'].mean():.2f}")
    ])
    
    weather_stats = html.Div([
        html.P(f"年均降雨量: {df['precipitation'].mean():.1f} mm"),
        html.P(f"降雨最多月份: {df.loc[df['precipitation'].idxmax(), 'month']}月"),
        html.P(f"年均气温: {df['avg_temp'].mean():.1f} °C"),
        html.P(f"年均雨天数: {df['rainy_days'].mean():.1f} 天")
    ])
    
    corr = analyzer.calculate_precipitation_correlation(df)
    correlation_stats = html.Div([
        html.P(f"降雨量相关系数: {corr['correlation_coefficient']:.3f}"),
        html.P(f"相关性: {'负相关 (雨多人少)' if corr['correlation_coefficient'] < 0 else '正相关'}"),
        html.P(f"显著性: {'显著' if corr['p_value'] < 0.05 else '不显著'}"),
        html.P(f"P值: {corr['p_value']:.3f}")
    ])
    
    return fig, tourist_stats, weather_stats, correlation_stats


@app.callback(
    [Output('correlation-scatter', 'figure'),
     Output('correlation-heatmap', 'figure'),
     Output('analysis-report', 'children')],
    [Input('stored-data', 'data')]
)
def update_analysis(data):
    if not data:
        return go.Figure(), go.Figure(), html.P('请先加载数据', style={'color': '#999', 'textAlign': 'center', 'padding': 20})
    
    df = pd.DataFrame(data)
    location = df['location'].iloc[0] if 'location' in df.columns else '景区'
    
    scatter_fig = px.scatter(
        df,
        x='precipitation',
        y='tourist_count',
        size='avg_temp',
        color='month',
        title=f'{location} - 降雨量 vs 客流量散点图',
        labels={'precipitation': '降雨量 (mm)', 'tourist_count': '客流量 (人次)'},
        hover_data=['month', 'avg_temp', 'rainy_days'],
        height=450
    )
    scatter_fig.update_layout(showlegend=True)
    
    corr_matrix = df[['tourist_count', 'precipitation', 'avg_temp', 'rainy_days']].corr()
    heatmap_fig = go.Figure(data=go.Heatmap(
        z=corr_matrix.values,
        x=corr_matrix.columns,
        y=corr_matrix.columns,
        colorscale='RdBu',
        zmid=0,
        text=corr_matrix.values.round(3),
        texttemplate='%{text}',
        textfont={"size": 12}
    ))
    heatmap_fig.update_layout(title=f'{location} - 相关性热力图', height=450)
    
    report = analyzer.generate_analysis_report(df)
    
    return scatter_fig, heatmap_fig, html.Pre(report, style={'whiteSpace': 'pre-wrap', 'lineHeight': '1.6'})


@app.callback(
    [Output('ai-recommendation', 'children'),
     Output('ai-recommend-btn', 'disabled'),
     Output('ai-recommend-btn', 'children'),
     Output('ai-btn-status', 'children')],
    [Input('ai-recommend-btn', 'n_clicks')],
    [State('stored-data', 'data'),
     State('location-dropdown', 'value'),
     State('preferences-input', 'value')]
)
def get_ai_recommendation(n_clicks, data, location, preferences):
    if n_clicks == 0:
        initial_div = html.Div([
            html.H4('👆 请先加载数据，然后点击"获取AI推荐"按钮', style={'textAlign': 'center', 'color': '#666'}),
            html.P('AI导游将根据天气和客流数据为您推荐最佳游览时间和路线。', style={'textAlign': 'center', 'color': '#999'})
        ])
        return initial_div, not bool(data), '✨ 获取AI推荐', ''
    
    if not data:
        no_data_div = html.Div([
            html.H4('⚠️ 请先加载数据', style={'textAlign': 'center', 'color': '#e67e22'}),
            html.P('请先在数据导入页面加载数据后再使用AI推荐功能。', style={'textAlign': 'center', 'color': '#999'})
        ])
        return no_data_div, True, '✨ 获取AI推荐', ''
    
    df = pd.DataFrame(data)
    
    try:
        recommendation = ai_guide.recommend_best_time(location, df)
        last_error = ai_guide.get_last_error()
        
        if last_error:
            error_display = html.Div([
                html.Div([
                    html.Strong('⚠️ API调用状态: '),
                    html.Span(last_error, style={'color': '#e67e22'})
                ], style={'padding': '12px', 'backgroundColor': '#fff3cd', 'borderRadius': '8px', 'marginBottom': '15px'}),
                html.Div([
                    html.Strong('💡 当前使用内置推荐数据'),
                ], style={'padding': '12px', 'backgroundColor': '#e8f4f8', 'borderRadius': '8px', 'marginBottom': '20px'}),
                dcc.Markdown(recommendation)
            ])
            return error_display, False, '✨ 获取AI推荐', ''
        else:
            success_display = html.Div([
                html.Div([
                    html.Strong('✅ API调用成功'),
                ], style={'padding': '12px', 'backgroundColor': '#d4edda', 'borderRadius': '8px', 'marginBottom': '20px'}),
                dcc.Markdown(recommendation)
            ])
            return success_display, False, '✨ 获取AI推荐', ''
    except Exception as e:
        error_display = html.Div([
            html.Div([
                html.Strong('❌ 推荐生成失败: '),
                html.Span(str(e), style={'color': '#e74c3c'})
            ], style={'padding': '12px', 'backgroundColor': '#f8d7da', 'borderRadius': '8px', 'marginBottom': '15px'}),
            dcc.Markdown(ai_guide._get_mock_recommendation(location))
        ])
        return error_display, False, '✨ 获取AI推荐', ''


@app.callback(
    [Output('api-test-result', 'children'),
     Output('api-test-result', 'style'),
     Output('test-api-btn', 'disabled'),
     Output('test-api-status', 'children')],
    [Input('test-api-btn', 'n_clicks')]
)
def test_api(n_clicks):
    if n_clicks == 0:
        return '', {'display': 'none'}, False, ''
    
    success, message = ai_guide.test_api_connection()
    
    if success:
        style = {
            'padding': '12px',
            'backgroundColor': '#d4edda',
            'color': '#155724',
            'borderRadius': '8px',
            'border': '1px solid #c3e6cb',
            'display': 'block'
        }
        return html.Div([
            html.Strong('✅ API连接测试成功: '),
            html.Span(message)
        ]), style, False, ''
    else:
        style = {
            'padding': '12px',
            'backgroundColor': '#fff3cd',
            'color': '#856404',
            'borderRadius': '8px',
            'border': '1px solid #ffeaa7',
            'display': 'block'
        }
        return html.Div([
            html.Strong('⚠️ API连接测试返回: '),
            html.Span(message)
        ]), style, False, ''


@app.callback(
    Output('upload-status', 'children'),
    [Input('upload-pdf', 'contents'),
     Input('upload-pdf', 'filename')]
)
def update_upload_status(contents, filename):
    if contents is None:
        return html.P('等待上传PDF文件...', style={'color': '#999', 'textAlign': 'center', 'padding': 20})
    
    content_type, content_string = contents.split(',')
    file_size = len(content_string) * 3 / 4 / 1024
    
    return html.Div([
        html.P([html.Strong('📄 文件: '), filename]),
        html.P([html.Strong('📊 文件大小: '), f'{file_size:.2f} KB']),
        html.P([html.Strong('⏳ 正在解析PDF文件...')], style={'color': '#3498db', 'fontWeight': '500'})
    ])


@app.callback(
    Output('system-status', 'children'),
    [Input('refresh-status-btn', 'n_clicks')]
)
def update_system_status(n_clicks):
    return get_system_status()


if __name__ == '__main__':
    gc.enable()
    gc.set_threshold(700, 10, 5)
    
    app.run_server(
        debug=True, 
        port=8050,
        dev_tools_hot_reload=True,
        dev_tools_hot_reload_interval=3000,
        dev_tools_silence_routes_logging=True
    )
