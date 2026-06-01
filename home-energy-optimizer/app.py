import dash
from dash import dcc, html, Input, Output, State, dash_table, callback_context
import dash_bootstrap_components as dbc
import pandas as pd
import base64
import io
import os
import tempfile
import time
from dotenv import load_dotenv

load_dotenv()

from src.parsers.state_grid_parser import StateGridParser
from src.analytics.load_profile import LoadProfileAnalyzer
from src.ai_suggestions import EnergyAISuggestor

app = dash.Dash(__name__, external_stylesheets=[dbc.themes.BOOTSTRAP])
server = app.server

app.title = '家庭用电优化器'

navbar = dbc.NavbarSimple(
    brand="🏠 家庭用电优化器",
    brand_href="#",
    color="primary",
    dark=True,
    children=[
        dbc.NavItem(dbc.NavLink("使用说明", href="#")),
    ]
)

upload_card = dbc.Card(
    [
        dbc.CardHeader("📤 上传用电数据"),
        dbc.CardBody(
            [
                dcc.Upload(
                    id='upload-data',
                    children=html.Div(id='upload-area-content', children=[
                        html.Div([
                            html.I(className="fas fa-file-csv fa-2x mb-2", style={'display': 'block'}),
                            html.Div('拖拽CSV文件到此处', className='mb-1'),
                            html.A('或点击选择文件', style={'color': '#0d6efd', 'cursor': 'pointer', 'fontWeight': '500'})
                        ], style={'padding': '15px 0'})
                    ]),
                    style={
                        'width': '100%',
                        'minHeight': '120px',
                        'borderWidth': '3px',
                        'borderStyle': 'dashed',
                        'borderRadius': '12px',
                        'borderColor': '#dee2e6',
                        'textAlign': 'center',
                        'margin': '10px 0',
                        'backgroundColor': '#f8f9fa',
                        'transition': 'all 0.3s ease',
                        'cursor': 'pointer'
                    },
                    className='upload-area',
                    multiple=False,
                    accept='.csv',
                    max_size=-1
                ),
                html.Div([
                    dbc.Label("选择地区:"),
                    dcc.Dropdown(
                        id='region-select',
                        options=[
                            {'label': '北京', 'value': 'beijing'},
                            {'label': '上海', 'value': 'shanghai'},
                            {'label': '广东', 'value': 'guangdong'},
                            {'label': '默认', 'value': 'default'}
                        ],
                        value='default',
                        clearable=False
                    )
                ], style={'marginTop': '15px'}),
                html.Div(id='file-name', style={'marginTop': '10px', 'color': '#6c757d'})
            ]
        )
    ]
)

stats_card = dbc.Card(
    [
        dbc.CardHeader("📊 用电统计"),
        dbc.CardBody(id='stats-content', children=[
            html.P("请上传CSV文件以查看用电统计", className="text-center text-muted")
        ])
    ]
)

savings_card = dbc.Card(
    [
        dbc.CardHeader("💰 峰谷电价优化收益"),
        dbc.CardBody(id='savings-content', children=[
            html.P("请上传CSV文件以计算优化收益", className="text-center text-muted")
        ])
    ]
)

load_curve_card = dbc.Card(
    [
        dbc.CardHeader("📈 典型日负荷曲线"),
        dbc.CardBody([
            dcc.Graph(id='load-curve-graph', config={'displayModeBar': False})
        ])
    ]
)

pie_card = dbc.Card(
    [
        dbc.CardHeader("🥧 时段用电占比"),
        dbc.CardBody([
            dcc.Graph(id='pie-graph', config={'displayModeBar': False})
        ])
    ]
)

savings_graph_card = dbc.Card(
    [
        dbc.CardHeader("📊 电费优化对比"),
        dbc.CardBody([
            dcc.Graph(id='savings-graph', config={'displayModeBar': False})
        ])
    ]
)

suggestions_card = dbc.Card(
    [
        dbc.CardHeader(
            dbc.Row([
                dbc.Col("🤖 AI 智能节能建议", width=8),
                dbc.Col(
                    dbc.Button(
                        "✨ 生成AI建议",
                        id='generate-ai-btn',
                        color="primary",
                        size="sm",
                        disabled=True,
                        className="float-end"
                    ),
                    width=4
                )
            ])
        ),
        dbc.CardBody(id='suggestions-content', children=[
            html.Div([
                html.I(className="fas fa-lightbulb fa-3x text-muted mb-3"),
                html.P("上传CSV文件后点击上方按钮获取AI个性化建议", className="text-center text-muted")
            ], className="text-center py-4")
        ])
    ]
)

table_card = dbc.Card(
    [
        dbc.CardHeader("📋 小时用电详情"),
        dbc.CardBody(id='table-content', children=[
            html.P("请上传CSV文件以查看详细数据", className="text-center text-muted")
        ])
    ]
)

# 拖拽状态管理 - 通过上传文件状态变化来重置UI
@app.callback(
    Output('upload-area-content', 'children'),
    [Input('upload-data', 'contents')],
    prevent_initial_call=True
)
def reset_upload_content(contents):
    """文件上传后重置显示内容"""
    return html.Div([
        html.I(
            className="fas fa-file-csv fa-2x mb-2",
            style={'display': 'block', 'color': '#6c757d'}
        ),
        html.Div('拖拽CSV文件到此处', className='mb-1'),
        html.A(
            '或点击选择文件',
            style={'color': '#0d6efd', 'cursor': 'pointer', 'fontWeight': '500'}
        )
    ], style={'padding': '15px 0'})

app.layout = dbc.Container(
    [
        navbar,
        dcc.Store(id='data-store', storage_type='memory'),
        dcc.Store(id='ai-suggestions-store', storage_type='memory'),
        html.Br(),
        dbc.Row(
            [
                dbc.Col(upload_card, md=4),
                dbc.Col(stats_card, md=4),
                dbc.Col(savings_card, md=4),
            ]
        ),
        html.Br(),
        dbc.Row(
            [
                dbc.Col(load_curve_card, md=8),
                dbc.Col(pie_card, md=4),
            ]
        ),
        html.Br(),
        dbc.Row(
            [
                dbc.Col(savings_graph_card, md=6),
                dbc.Col(suggestions_card, md=6),
            ]
        ),
        html.Br(),
        dbc.Row([dbc.Col(table_card, md=12)]),
        html.Br(),
        html.Footer(
            "© 2024 家庭用电优化器 | 基于Python + Dash构建",
            className="text-center text-muted"
        )
    ],
    fluid=True,
    style={'maxWidth': '1400px'}
)


def parse_contents(contents, filename, region):
    if contents is None:
        return None

    content_type, content_string = contents.split(',')
    decoded = base64.b64decode(content_string)

    try:
        with tempfile.NamedTemporaryFile(mode='wb', suffix='.csv', delete=False) as f:
            f.write(decoded)
            temp_path = f.name

        parser = StateGridParser(region=region)
        df, col_mapping = parser.parse_csv(temp_path)

        os.unlink(temp_path)

        return parser, df, col_mapping

    except Exception as e:
        print(f"Error parsing file: {e}")
        return None


def create_empty_fig(title="请上传数据"):
    return {
        'data': [],
        'layout': {
            'title': title,
            'xaxis': {'visible': False},
            'yaxis': {'visible': False},
            'paper_bgcolor': 'rgba(0,0,0,0)',
            'plot_bgcolor': 'rgba(0,0,0,0)'
        }
    }


@app.callback(
    [Output('file-name', 'children'),
     Output('stats-content', 'children'),
     Output('savings-content', 'children'),
     Output('load-curve-graph', 'figure'),
     Output('pie-graph', 'figure'),
     Output('savings-graph', 'figure'),
     Output('table-content', 'children'),
     Output('data-store', 'data'),
     Output('generate-ai-btn', 'disabled')],
    [Input('upload-data', 'contents'),
     Input('region-select', 'value')],
    [State('upload-data', 'filename')]
)
def update_output(contents, region, filename):
    if contents is None:
        return (
            "",
            html.P("请上传CSV文件以查看用电统计", className="text-center text-muted"),
            html.P("请上传CSV文件以计算优化收益", className="text-center text-muted"),
            create_empty_fig(),
            create_empty_fig(),
            create_empty_fig(),
            html.P("请上传CSV文件以查看详细数据", className="text-center text-muted"),
            None,
            True
        )

    result = parse_contents(contents, filename, region)

    if result is None:
        error_msg = html.Div([
            html.I(className="fas fa-exclamation-circle text-danger fa-2x mb-2"),
            html.H5("文件解析失败", className="text-danger"),
            html.P("请确保CSV文件格式正确，包含日期和用电量列")
        ], className="text-center py-3")
        return (
            f"❌ 解析失败: {filename}",
            error_msg,
            error_msg,
            create_empty_fig("解析失败"),
            create_empty_fig("解析失败"),
            create_empty_fig("解析失败"),
            error_msg,
            None,
            True
        )

    parser, df, col_mapping = result

    cost_data = parser.calculate_cost(use_tou=False)
    savings_data = parser.calculate_savings()

    daily_profile = parser.get_daily_profile()
    tou_hours = parser.get_tou_hours()

    analyzer = LoadProfileAnalyzer(daily_profile, tou_hours)

    stats_content = html.Div([
        dbc.Row([
            dbc.Col([
                html.H4(f"⚡ {cost_data['daily_usage']:.1f} kWh"),
                html.Small("日用电量", className="text-muted")
            ], className="text-center"),
            dbc.Col([
                html.H4(f"📊 {cost_data['monthly_usage']:.0f} kWh"),
                html.Small("月用电量", className="text-muted")
            ], className="text-center"),
            dbc.Col([
                html.H4(f"📶 {cost_data['tier']}"),
                html.Small("电价档位", className="text-muted")
            ], className="text-center"),
        ])
    ])

    savings_content = html.Div([
        dbc.Row([
            dbc.Col([
                html.H4(f"💰 ¥{savings_data['monthly_savings']:.0f}"),
                html.Small("每月节省", className="text-muted")
            ], className="text-center"),
            dbc.Col([
                html.H4(f"📈 {savings_data['savings_percentage']:.0f}%"),
                html.Small("节省比例", className="text-muted")
            ], className="text-center"),
            dbc.Col([
                html.H4(f"🗓️ ¥{savings_data['yearly_savings']:.0f}"),
                html.Small("每年节省", className="text-muted")
            ], className="text-center"),
        ]),
        html.Hr(),
        html.Div([
            html.Strong("开启峰谷电价后预计每月节省"),
            html.H3(f"¥{savings_data['monthly_savings']:.2f}",
                   className="text-success text-center mt-2")
        ])
    ])

    load_curve_fig = analyzer.create_load_curve()
    pie_fig = analyzer.create_period_pie()
    savings_fig = analyzer.create_savings_analysis(savings_data)

    table_df = analyzer.create_hourly_detail_table()
    table_content = dash_table.DataTable(
        data=table_df.to_dict('records'),
        columns=[{'name': i, 'id': i} for i in table_df.columns],
        page_size=12,
        style_table={'overflowX': 'auto'},
        style_header={
            'backgroundColor': 'rgb(230, 230, 230)',
            'fontWeight': 'bold'
        },
        style_data_conditional=[
            {
                'if': {'filter_query': '{电价时段} = "尖峰"'},
                'backgroundColor': '#FFEEEB',
            },
            {
                'if': {'filter_query': '{电价时段} = "谷段"'},
                'backgroundColor': '#E8F5F3',
            }
        ]
    )

    data_store = {
        'region': region,
        'daily_profile': daily_profile.to_dict(),
        'savings_data': savings_data,
        'cost_data': cost_data,
        'tou_hours': tou_hours
    }

    return (
        dbc.Alert([
            html.I(className="fas fa-check-circle me-2"),
            f"已成功加载: {filename}"
        ], color="success", className="mb-0 py-2"),
        stats_content,
        savings_content,
        load_curve_fig,
        pie_fig,
        savings_fig,
        table_content,
        data_store,
        False
    )


@app.callback(
    Output('suggestions-content', 'children'),
    [Input('generate-ai-btn', 'n_clicks'),
     Input('data-store', 'data')],
    prevent_initial_call=True
)
def generate_ai_suggestions(n_clicks, stored_data):
    ctx = callback_context

    if not ctx.triggered:
        return html.Div([
            html.I(className="fas fa-lightbulb fa-3x text-muted mb-3"),
            html.P("上传CSV文件后点击上方按钮获取AI个性化建议", className="text-center text-muted")
        ], className="text-center py-4")

    trigger_id = ctx.triggered[0]['prop_id'].split('.')[0]

    if trigger_id == 'data-store':
        if stored_data is None:
            return html.Div([
                html.I(className="fas fa-lightbulb fa-3x text-muted mb-3"),
                html.P("上传CSV文件后点击上方按钮获取AI个性化建议", className="text-center text-muted")
            ], className="text-center py-4")
        else:
            return html.Div([
                html.I(className="fas fa-lightbulb fa-3x text-primary mb-3"),
                html.P("数据已准备就绪，点击按钮生成AI个性化节能建议", className="text-center text-primary")
            ], className="text-center py-4")

    if trigger_id == 'generate-ai-btn' and stored_data is not None:
        try:
            daily_profile = pd.Series(stored_data['daily_profile'])
            savings_data = stored_data['savings_data']
            cost_data = stored_data['cost_data']
            tou_hours = stored_data['tou_hours']
            region = stored_data['region']

            suggestor = EnergyAISuggestor(region=region)
            result = suggestor.get_ai_suggestions(daily_profile, savings_data, cost_data, tou_hours)

            if result['success'] and result['source'] == 'ai':
                return html.Div([
                    dbc.Badge("AI 智能生成", color="success", className="mb-3"),
                    dcc.Markdown(
                        result['content'],
                        style={
                            'whiteSpace': 'pre-wrap',
                            'lineHeight': '1.8',
                            'fontSize': '14px'
                        }
                    )
                ], className="py-2")
            else:
                suggestions = result['content']
                suggestion_items = []
                for s in suggestions:
                    suggestion_items.append(
                        html.Div([
                            html.H6(f"{s['icon']} {s['category']}", className="text-primary mt-3 mb-2"),
                            html.Ul([
                                html.Li(item, className="mb-1") for item in s['items']
                            ], style={'paddingLeft': '20px'})
                        ])
                    )

                return html.Div([
                    dbc.Badge("规则引擎生成", color="info", className="mb-3"),
                    html.Div(suggestion_items)
                ], className="py-2")

        except Exception as e:
            return html.Div([
                html.I(className="fas fa-exclamation-triangle text-warning fa-2x mb-2"),
                html.H5("生成建议时出现错误", className="text-warning"),
                html.P(str(e), className="text-muted small")
            ], className="text-center py-4")

    return html.Div([
        html.I(className="fas fa-lightbulb fa-3x text-muted mb-3"),
        html.P("上传CSV文件后点击上方按钮获取AI个性化建议", className="text-center text-muted")
    ], className="text-center py-4")


if __name__ == '__main__':
    app.run_server(debug=True, host='0.0.0.0', port=8050)
