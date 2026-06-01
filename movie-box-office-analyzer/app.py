import dash
from dash import dcc, html, Input, Output, State
import dash_bootstrap_components as dbc
import plotly.graph_objects as go

from data_source.public_movie_data import PublicMovieDataSource
from components import ScatterPlot, TimeSeriesPlot
from ai_review import VolcengineAI

app = dash.Dash(__name__, 
                external_stylesheets=[dbc.themes.BOOTSTRAP],
                title='电影票房分析',
                suppress_callback_exceptions=True)

movie_ds = PublicMovieDataSource()
ai_review = VolcengineAI()

movies_data = movie_ds.get_now_playing_movies()

app.layout = dbc.Container([
    html.H1('🎬 电影票房与评分分析系统', 
            className='text-center my-4',
            style={'color': '#2c3e50'}),
    
    dbc.Row([
        dbc.Col([
            dbc.Alert([
                html.I(className="fas fa-database me-2"),
                f"数据源: 豆瓣电影公开页面 | 数据获取时间: {movie_ds.get_data_source_info()['fetch_time']} | 共 {len(movies_data)} 部热映电影",
            ], color="info", className="text-center mb-3")
        ], width=12)
    ]),
    
    dbc.Row([
        dbc.Col([
            dcc.Graph(
                id='scatter-plot',
                figure=ScatterPlot.create_rating_boxoffice_scatter(movies_data),
                config={'displayModeBar': True}
            )
        ], width=12)
    ]),
    
    html.Hr(),
    
    dbc.Row([
        dbc.Col([
            html.Div(id='movie-detail-panel')
        ], width=12)
    ]),
    
    html.Footer([
        html.P('数据来源：整合电影数据库 | 火山引擎大模型',
               className='text-center text-muted mt-4')
    ]),
    
    dcc.Store(id='ai-review-cache', data={})
], fluid=True, style={'maxWidth': '1400px'})

@app.callback(
    Output('movie-detail-panel', 'children'),
    Input('scatter-plot', 'clickData'),
    State('ai-review-cache', 'data'),
    prevent_initial_call=False
)
def display_movie_details(clickData, cache_data):
    if clickData is None:
        return dbc.Alert(
            '👆 点击散点图中的任意电影点，查看详细票房走势和AI点评',
            color='info',
            className='text-center'
        )
    
    movie_id = clickData['points'][0]['customdata']
    movie = movie_ds.get_movie_detail(movie_id)
    
    if not movie:
        return dbc.Alert('未找到电影信息', color='warning')
    
    trend_data = movie_ds.get_box_office_trend(movie_id, 30)
    
    cache_key = str(movie_id)
    if cache_key in cache_data:
        ai_review_text = cache_data[cache_key]
    else:
        ai_review_text = ai_review.generate_movie_review(
            movie['name'],
            movie['rating'],
            movie['box_office'],
            movie['genre'],
            movie['director'],
            movie['summary']
        )
        cache_data[cache_key] = ai_review_text
    
    detail_card = dbc.Card([
        dbc.CardHeader([
            html.H3(movie['name'], className='mb-0'),
            html.Small(f'上映日期: {movie["release_date"]}', className='text-muted')
        ]),
        dbc.CardBody([
            dbc.Row([
                dbc.Col([
                    html.H5('📊 基本信息', className='mb-3'),
                    html.P([
                        html.Strong('导演：'), movie['director']
                    ]),
                    html.P([
                        html.Strong('主演：'), movie['actors']
                    ]),
                    html.P([
                        html.Strong('类型：'), movie['genre']
                    ]),
                    html.P([
                        html.Strong('片长：'), f'{movie["duration"]} 分钟'
                    ]),
                    html.P([
                        html.Strong('评分：'), 
                        html.Span(f'{movie["rating"]} 分', 
                                  className='badge bg-warning text-dark')
                    ]),
                    html.P([
                        html.Strong('累计票房：'), 
                        html.Span(f'{movie["box_office"]/10000:.1f} 亿',
                                  className='badge bg-success')
                    ]),
                    html.Hr(),
                    html.P([
                        html.Strong('剧情简介：'), movie['summary']
                    ])
                ], md=4),
                
                dbc.Col([
                    dcc.Graph(
                        id='trend-plot',
                        figure=TimeSeriesPlot.create_boxoffice_trend(
                            trend_data, 
                            movie['name']
                        ),
                        config={'displayModeBar': False}
                    )
                ], md=8)
            ]),
            
            html.Hr(),
            
            dbc.Card([
                dbc.CardHeader([
                    html.I(className='fas fa-robot me-2'),
                    'AI 智能影评',
                    dbc.Badge('火山大模型', color='primary', className='ms-2')
                ]),
                dbc.CardBody([
                    html.Div([
                        html.Blockquote(
                            ai_review_text,
                            className='blockquote mb-0',
                            style={
                                'fontSize': '1.1rem',
                                'color': '#34495e',
                                'borderLeft': '4px solid #3498db',
                                'paddingLeft': '1rem',
                                'background': 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
                                'padding': '1.5rem',
                                'borderRadius': '8px'
                            }
                        ),
                        html.Footer(
                            f'— 基于电影AI评论生成',
                            className='blockquote-footer mt-2'
                        )
                    ])
                ])
            ], className='mt-3')
        ])
    ])
    
    return detail_card

if __name__ == '__main__':
    app.run_server(debug=True, port=8050)
