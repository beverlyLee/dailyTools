import dash
from dash import dcc, html, Input, Output, State, callback
import dash_bootstrap_components as dbc
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from data_parser import FAODataParser
from metrics_calculator import MetricsCalculator
from data_sources import (
    data_source_manager, 
    DataSourceManager,
    FAOLocalDataSource,
    WorldBankDataSource,
    IMFDataSource,
    ExtendedCategoriesDataSource
)


# 颜色主题
COLORS = {
    'primary': '#2c3e50',
    'secondary': '#34495e',
    'success': '#27ae60',
    'danger': '#e74c3c',
    'warning': '#f39c12',
    'info': '#3498db',
    'light': '#ecf0f1',
    'dark': '#2c3e50',
    'purple': '#9b59b6',
    'orange': '#e67e22',
    'teal': '#1abc9c'
}

# 分类颜色映射
CATEGORY_COLORS = {
    'Food Price Index': '#3498db',
    'Meat': '#e74c3c',
    'Dairy': '#f39c12',
    'Cereals': '#27ae60',
    'Oils': '#9b59b6',
    'Sugar': '#e67e22',
    'Beef': '#c0392b',
    'Pork': '#e74c3c',
    'Poultry': '#f39c12',
    'Sheep': '#8e44ad',
    'Wheat': '#27ae60',
    'Maize': '#f1c40f',
    'Rice': '#3498db',
    'Barley': '#95a5a6',
    'Sorghum': '#7f8c8d',
    'Palm Oil': '#e67e22',
    'Soybean Oil': '#d35400',
    'Sunflower Oil': '#f39c12',
    'Rapeseed Oil': '#c0392b',
    'Milk': '#ecf0f1',
    'Butter': '#f39c12',
    'Cheese': '#e67e22',
    'Milk Powder': '#bdc3c7',
    'Raw Sugar': '#d4ac0d',
    'White Sugar': '#f4d03f',
    'Inflation Rate': '#e74c3c',
    'Food Inflation': '#c0392b',
    'Energy Price Index': '#e67e22',
    'Fertilizer Price Index': '#27ae60',
    'Exchange Rate': '#3498db'
}


# 全局数据存储
global_df = None
global_metrics_df = None
global_source_manager = None


def get_category_color(category: str) -> str:
    return CATEGORY_COLORS.get(category, px.colors.qualitative.Plotly[0])


def create_year_month_heatmap(df: pd.DataFrame, category: str):
    """
    创建年月热力图
    """
    if df is None or category not in df.columns:
        return go.Figure()
    
    # 获取最近10年的数据
    max_year = df['Date'].dt.year.max()
    min_year = max(max_year - 10, df['Date'].dt.year.min())
    
    mask = (df['Date'].dt.year >= min_year) & (df['Date'].dt.year <= max_year)
    df_recent = df.loc[mask].copy()
    
    # 创建透视表
    pivot_df = df_recent.pivot_table(
        index=df_recent['Date'].dt.year,
        columns=df_recent['Date'].dt.month,
        values=category,
        aggfunc='first'
    )
    
    # 重命名列
    month_names = ['1月', '2月', '3月', '4月', '5月', '6月', 
                  '7月', '8月', '9月', '10月', '11月', '12月']
    pivot_df.columns = month_names[:len(pivot_df.columns)]
    
    # 计算年度平均值作为最后一列
    pivot_df['年均'] = pivot_df.mean(axis=1)
    
    # 创建热力图
    fig = px.imshow(
        pivot_df,
        labels=dict(x='月份', y='年份', color='价格指数'),
        x=pivot_df.columns,
        y=pivot_df.index.astype(str),
        title=f"{category} 年月热力图 ({min_year}-{max_year})",
        color_continuous_scale='RdYlBu_r',
        aspect='auto'
    )
    
    # 添加数值标注（根据数据量决定是否显示）
    show_annotations = len(pivot_df) <= 15 and len(pivot_df.columns) <= 13
    
    if show_annotations:
        annotations = []
        for i, year in enumerate(pivot_df.index):
            for j, month in enumerate(pivot_df.columns):
                value = pivot_df.iloc[i, j]
                if pd.notna(value):
                    # 根据背景色决定文字颜色
                    text_color = 'white' if (value > pivot_df.mean().mean()) else 'black'
                    annotations.append(dict(
                        x=month,
                        y=str(year),
                        text=f'{value:.0f}',
                        showarrow=False,
                        font=dict(color=text_color, size=10)
                    ))
        
        fig.update_layout(annotations=annotations)
    
    # 更新布局
    fig.update_layout(
        template='plotly_white',
        title_x=0.5,
        xaxis=dict(side='top'),
        font=dict(size=11),
        coloraxis_colorbar=dict(
            title='价格指数',
            tickfont=dict(size=10)
        )
    )
    
    return fig


def load_initial_data():
    """
    加载初始数据
    """
    global global_df, global_metrics_df, global_source_manager
    
    # 初始化数据源管理器
    global_source_manager = data_source_manager
    
    # 注册扩展数据源
    extended_source = ExtendedCategoriesDataSource()
    global_source_manager.register_source(extended_source)
    
    # 加载数据
    try:
        if global_source_manager.active_source and global_source_manager.active_source.is_ready:
            print(f"使用已加载的数据源: {global_source_manager._active_source_name}")
        else:
            if not global_source_manager.load_active_source():
                print("数据源加载失败，尝试使用扩展数据源...")
                if global_source_manager.switch_source("扩展类别数据"):
                    global_source_manager.load_active_source()
        
        global_df = global_source_manager.get_data()
        
        if global_df is not None and not global_df.empty:
            global_metrics_df = MetricsCalculator.calculate_all_metrics(global_df)
            print(f"数据加载成功: {len(global_df)} 条记录, {len(global_source_manager.get_available_categories())} 个类别")
            print(f"数据时间范围: {global_df['Date'].min()} 到 {global_df['Date'].max()}")
        else:
            print("警告: 没有加载到有效数据，创建示例数据...")
            create_sample_data()
            
    except Exception as e:
        print(f"数据加载失败: {str(e)}，创建示例数据...")
        create_sample_data()


def create_sample_data():
    """
    创建示例数据
    """
    global global_df, global_metrics_df
    
    print("创建示例数据...")
    
    dates = pd.date_range(start='2010-01-01', end='2025-12-31', freq='MS')
    
    np.random.seed(42)
    base_value = 100
    
    data = {'Date': dates}
    
    all_categories = list(ExtendedCategoriesDataSource.EXTENDED_CATEGORIES.keys())
    
    for i in range(len(dates)):
        year = dates[i].year
        month = dates[i].month
        
        trend = 0.12 * i
        seasonality = 4 * np.sin(2 * np.pi * (month - 1) / 12)
        
        event_effect = 0
        if year == 2022:
            event_effect = 15 * np.exp(-((month - 3) ** 2) / 6)
        elif year == 2008:
            event_effect = 12 * np.exp(-((month - 6) ** 2) / 4)
        
        noise = np.random.normal(0, 1.5)
        fpi = base_value + trend + seasonality + event_effect + noise
        
        data.setdefault('Food Price Index', []).append(fpi)
        
        data.setdefault('Meat', []).append(fpi * 1.1 + np.random.normal(0, 1))
        data.setdefault('Dairy', []).append(fpi * 0.95 + np.random.normal(0, 0.8))
        data.setdefault('Cereals', []).append(fpi * 1.02 + np.random.normal(0, 1))
        data.setdefault('Oils', []).append(fpi * 1.15 + np.random.normal(0, 1.5))
        data.setdefault('Sugar', []).append(fpi * 0.9 + np.random.normal(0, 1))
        
        # 子类别
        data.setdefault('Beef', []).append(fpi * 1.25 + np.random.normal(0, 1.2))
        data.setdefault('Pork', []).append(fpi * 1.05 + np.random.normal(0, 1))
        data.setdefault('Poultry', []).append(fpi * 0.95 + np.random.normal(0, 0.8))
        data.setdefault('Wheat', []).append(fpi * 1.05 + np.random.normal(0, 1))
        data.setdefault('Maize', []).append(fpi * 1.0 + np.random.normal(0, 1))
        data.setdefault('Rice', []).append(fpi * 1.08 + np.random.normal(0, 0.8))
        data.setdefault('Palm Oil', []).append(fpi * 1.25 + np.random.normal(0, 1.5))
        data.setdefault('Soybean Oil', []).append(fpi * 1.1 + np.random.normal(0, 1.2))
        data.setdefault('Milk', []).append(fpi * 0.9 + np.random.normal(0, 0.7))
        data.setdefault('Butter', []).append(fpi * 1.1 + np.random.normal(0, 1))
        data.setdefault('Inflation Rate', []).append(
            (fpi - (data['Food Price Index'][i-12] if i >= 12 else fpi)) / 
            (data['Food Price Index'][i-12] if i >= 12 else fpi) * 100 + np.random.normal(0, 0.5)
            if i >= 12 else np.nan
        )
    
    global_df = pd.DataFrame(data)
    global_metrics_df = MetricsCalculator.calculate_all_metrics(global_df)
    
    print(f"示例数据创建成功: {len(global_df)} 条记录")


# 加载初始数据
load_initial_data()


# 创建Dash应用
app = dash.Dash(
    __name__,
    title='全球食品价格与通胀分析仪表板',
    suppress_callback_exceptions=True,
    external_stylesheets=[dbc.themes.FLATLY]
)


def create_layout():
    """
    创建布局
    """
    # 获取可用数据源
    sources = global_source_manager.list_sources()
    source_options = [{'label': s['name'], 'value': s['name']} for s in sources]
    
    # 获取可用年份
    if global_df is not None and not global_df.empty:
        years = sorted(global_df['Date'].dt.year.unique())
    else:
        years = list(range(2010, 2026))
    
    # 获取可用类别
    categories = global_source_manager.get_available_categories()
    if not categories and global_df is not None:
        categories = [col for col in global_df.columns if col != 'Date']
    
    # 主要类别
    main_categories = [
        'Food Price Index', 'Meat', 'Dairy', 'Cereals', 'Oils', 'Sugar'
    ]
    
    return html.Div([
        # 页面头部
        dbc.Navbar(
            dbc.Container([
                html.A(
                    dbc.Row([
                        dbc.Col(html.I(className="fas fa-chart-line fa-2x text-white")),
                        dbc.Col(dbc.NavbarBrand("全球食品价格与通胀分析仪表板", className="ml-2 text-white")),
                    ], align="center"),
                    href="#",
                    style={"textDecoration": "none"},
                ),
                dbc.Nav([
                    dbc.NavItem(dbc.NavLink("首页", href="#", active=True)),
                    dbc.DropdownMenu(
                        [
                            dbc.DropdownMenuItem("数据说明", id='btn-data-info'),
                            dbc.DropdownMenuItem("数据源设置", id='btn-source-settings'),
                            dbc.DropdownMenuItem(divider=True),
                            dbc.DropdownMenuItem("关于", id='btn-about'),
                        ],
                        nav=True,
                        in_navbar=True,
                        label="菜单",
                    ),
                ], navbar=True),
            ]),
            color="primary",
            dark=True,
            className="mb-4",
            style={'backgroundColor': COLORS['primary']}
        ),
        
        # 数据说明模态框
        dbc.Modal(
            [
                dbc.ModalHeader(html.H4("📊 数据说明")),
                dbc.ModalBody([
                    html.H5("数据来源", className="text-primary"),
                    html.P([
                        html.Strong("联合国粮农组织(FAO)食品价格指数"),
                        html.Br(),
                        "FAO食品价格指数是衡量一篮子食品类商品国际价格月度变化的贸易加权指数。",
                        html.Br(),
                        "基准期: 2014-2016 = 100"
                    ]),
                    html.Hr(),
                    html.H5("指标说明", className="text-primary"),
                    html.Ul([
                        html.Li([html.Strong("食品价格指数(FPI): "), "包括肉类、乳制品、谷物、植物油和食糖五个商品组的价格指数加权平均"]),
                        html.Li([html.Strong("月环比涨幅(MoM): "), "与上月相比的价格变化百分比，公式: (当前值-上月值)/上月值×100"]),
                        html.Li([html.Strong("年同比涨幅(YoY): "), "与去年同月相比的价格变化百分比，公式: (当前值-去年同月值)/去年同月值×100"]),
                    ]),
                    html.Hr(),
                    html.H5("食品类别", className="text-primary"),
                    html.Ul([
                        html.Li([html.Strong("主要类别: "), "食品总指数、肉类、乳制品、谷物、植物油、食糖"]),
                        html.Li([html.Strong("肉类子类: "), "牛肉、猪肉、禽肉、羊肉"]),
                        html.Li([html.Strong("谷物子类: "), "小麦、玉米、大米、大麦、高粱"]),
                        html.Li([html.Strong("油脂子类: "), "棕榈油、大豆油、葵花籽油、菜籽油"]),
                        html.Li([html.Strong("乳制品子类: "), "牛奶、黄油、奶酪、奶粉"]),
                        html.Li([html.Strong("宏观指标: "), "通货膨胀率、能源价格指数、化肥价格指数"]),
                    ]),
                ]),
                dbc.ModalFooter(
                    dbc.Button("关闭", id="close-data-info", className="ml-auto")
                ),
            ],
            id="modal-data-info",
            size="lg",
        ),
        
        # 数据源设置模态框
        dbc.Modal(
            [
                dbc.ModalHeader(html.H4("⚙️ 数据源设置")),
                dbc.ModalBody([
                    html.H5("选择数据源", className="text-primary"),
                    dcc.Dropdown(
                        id='modal-source-dropdown',
                        options=source_options,
                        value=global_source_manager._active_source_name,
                        style={'marginBottom': '15px'}
                    ),
                    html.Div(id='modal-source-description', style={'marginBottom': '20px'}),
                    html.Hr(),
                    html.H5("自动刷新设置", className="text-primary"),
                    dbc.Row([
                        dbc.Col([
                            html.Label("刷新间隔（分钟）:"),
                            dcc.Input(
                                id='refresh-interval',
                                type='number',
                                value=60,
                                min=1,
                                max=1440,
                                style={'width': '100%'}
                            ),
                        ], width=6),
                        dbc.Col([
                            html.Label(" "),
                            html.Div([
                                dbc.Button("刷新数据", id='btn-refresh-data', color='primary', className="mr-2"),
                                dbc.Button("应用设置", id='btn-apply-settings', color='success'),
                            ], style={'marginTop': '5px'})
                        ], width=6),
                    ]),
                    html.Div(id='settings-status', style={'marginTop': '15px'}),
                ]),
                dbc.ModalFooter(
                    dbc.Button("关闭", id="close-source-settings", className="ml-auto")
                ),
            ],
            id="modal-source-settings",
            size="lg",
        ),
        
        # 关于模态框
        dbc.Modal(
            [
                dbc.ModalHeader(html.H4("ℹ️ 关于本仪表板")),
                dbc.ModalBody([
                    html.H5("全球食品价格与通胀分析仪表板", className="text-primary"),
                    html.P("本仪表板旨在分析全球食品价格走势及其与通货膨胀的关系。"),
                    html.Hr(),
                    html.H5("主要功能", className="text-primary"),
                    html.Ul([
                        html.Li("多数据源支持（FAO、世界银行、IMF、扩展类别）"),
                        html.Li("食品价格趋势可视化（折线图、柱状图、面积图、热力图）"),
                        html.Li("同比/环比涨幅计算与展示"),
                        html.Li("多类别对比分析"),
                        html.Li("数据自动刷新功能"),
                    ]),
                    html.Hr(),
                    html.P([
                        "数据更新时间: ", 
                        html.Strong(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                    ]),
                ]),
                dbc.ModalFooter(
                    dbc.Button("关闭", id="close-about", className="ml-auto")
                ),
            ],
            id="modal-about",
            size="md",
        ),
        
        # 主内容区域
        dbc.Container([
            # 数据源和类别选择区域
            dbc.Card([
                dbc.CardHeader([
                    html.I(className="fas fa-filter mr-2"),
                    "数据筛选与设置"
                ], style={'backgroundColor': COLORS['light']}),
                dbc.CardBody([
                    dbc.Row([
                        # 数据源选择
                        dbc.Col([
                            html.Label("数据源:", className="font-weight-bold"),
                            dcc.Dropdown(
                                id='source-dropdown',
                                options=source_options,
                                value=global_source_manager._active_source_name,
                                clearable=False,
                                style={'width': '100%'}
                            ),
                        ], width=3),
                        
                        # 年份选择
                        dbc.Col([
                            html.Label("年份:", className="font-weight-bold"),
                            dcc.Dropdown(
                                id='year-dropdown',
                                options=[{'label': str(y), 'value': y} for y in years],
                                value=years[-1] if years else None,
                                clearable=False,
                                style={'width': '100%'}
                            ),
                        ], width=2),
                        
                        # 图表类型
                        dbc.Col([
                            html.Label("图表类型:", className="font-weight-bold"),
                            dcc.Dropdown(
                                id='chart-type-dropdown',
                                options=[
                                    {'label': '📈 折线图', 'value': 'line'},
                                    {'label': '📊 柱状图', 'value': 'bar'},
                                    {'label': '🗺️ 热力图', 'value': 'heatmap'},
                                    {'label': '📈 面积图', 'value': 'area'}
                                ],
                                value='line',
                                clearable=False,
                                style={'width': '100%'}
                            ),
                        ], width=2),
                        
                        # 类别选择（多选）
                        dbc.Col([
                            html.Label("食品类别（可多选）:", className="font-weight-bold"),
                            dcc.Dropdown(
                                id='category-dropdown',
                                options=[{'label': cat, 'value': cat} for cat in categories if cat in main_categories],
                                value=['Food Price Index'],
                                multi=True,
                                clearable=False,
                                style={'width': '100%'}
                            ),
                        ], width=4),
                    ]),
                    
                    # 高级类别选择（折叠面板）
                    html.Details([
                        html.Summary("更多类别选项", style={'cursor': 'pointer', 'color': COLORS['info']}),
                        html.Div([
                            html.Label("扩展类别（子类别和宏观指标）:", className="font-weight-bold mt-2"),
                            dcc.Dropdown(
                                id='extended-category-dropdown',
                                options=[
                                    {'label': cat, 'value': cat} 
                                    for cat in categories 
                                    if cat not in main_categories and cat != 'Date'
                                ],
                                value=[],
                                multi=True,
                                placeholder="选择更多类别...",
                                style={'width': '100%'}
                            ),
                        ], style={'padding': '10px', 'backgroundColor': '#f8f9fa', 'borderRadius': '5px', 'marginTop': '10px'})
                    ], style={'marginTop': '15px'}),
                ])
            ], className="mb-4"),
            
            # 关键指标卡片
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.Div([
                                html.I(className="fas fa-chart-pie fa-3x text-primary float-left mr-3"),
                                html.Div([
                                    html.H6("最新食品价格指数", className="text-muted mb-1"),
                                    html.H3(id='latest-fpi', className="font-weight-bold text-primary"),
                                ]),
                            ], className="clearfix")
                        ])
                    ], color="primary", outline=True)
                ], width=3),
                
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.Div([
                                html.I(className="fas fa-arrow-circle-up fa-3x text-danger float-left mr-3"),
                                html.Div([
                                    html.H6("月环比涨幅", className="text-muted mb-1"),
                                    html.H3(id='latest-mom', className="font-weight-bold"),
                                ]),
                            ], className="clearfix")
                        ])
                    ], color="danger", outline=True)
                ], width=3),
                
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.Div([
                                html.I(className="fas fa-calendar-alt fa-3x text-success float-left mr-3"),
                                html.Div([
                                    html.H6("年同比涨幅", className="text-muted mb-1"),
                                    html.H3(id='latest-yoy', className="font-weight-bold"),
                                ]),
                            ], className="clearfix")
                        ])
                    ], color="success", outline=True)
                ], width=3),
                
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.Div([
                                html.I(className="fas fa-clock fa-3x text-info float-left mr-3"),
                                html.Div([
                                    html.H6("数据更新时间", className="text-muted mb-1"),
                                    html.H3(id='latest-date', className="font-weight-bold text-info"),
                                ]),
                            ], className="clearfix")
                        ])
                    ], color="info", outline=True)
                ], width=3),
            ], className="mb-4"),
            
            # 主趋势图
            dbc.Card([
                dbc.CardHeader([
                    html.I(className="fas fa-chart-line mr-2"),
                    html.Span(id='main-chart-title', children="食品价格指数趋势图"),
                    dbc.Badge(
                        id='data-count-badge',
                        color="secondary",
                        className="ml-2 float-right"
                    )
                ], style={'backgroundColor': COLORS['light']}),
                dbc.CardBody([
                    dcc.Graph(id='main-chart', style={'height': '500px'})
                ])
            ], className="mb-4"),
            
            # 热力图和同比环比图表（并排）
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.I(className="fas fa-th mr-2"),
                            "食品价格指数热力图（最近10年）"
                        ], style={'backgroundColor': COLORS['light']}),
                        dbc.CardBody([
                            dcc.Graph(id='heatmap-chart', style={'height': '450px'})
                        ])
                    ])
                ], width=6),
                
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.I(className="fas fa-percentage mr-2"),
                            "同比与环比涨幅趋势"
                        ], style={'backgroundColor': COLORS['light']}),
                        dbc.CardBody([
                            dcc.Graph(id='metrics-chart', style={'height': '450px'})
                        ])
                    ])
                ], width=6),
            ], className="mb-4"),
            
            # 多类别对比图
            dbc.Card([
                dbc.CardHeader([
                    html.I(className="fas fa-balance-scale mr-2"),
                    "各类别食品价格指数对比"
                ], style={'backgroundColor': COLORS['light']}),
                dbc.CardBody([
                    dcc.Graph(id='comparison-chart', style={'height': '500px'})
                ])
            ], className="mb-4"),
            
            # 数据表格
            dbc.Card([
                dbc.CardHeader([
                    html.I(className="fas fa-table mr-2"),
                    "详细数据表格",
                    dbc.Button(
                        "下载数据",
                        id='btn-download',
                        color="primary",
                        size="sm",
                        className="ml-2 float-right"
                    )
                ], style={'backgroundColor': COLORS['light']}),
                dbc.CardBody([
                    html.Div(id='data-table-container')
                ])
            ], className="mb-4"),
            
            # 页脚
            html.Footer([
                html.Hr(),
                dbc.Row([
                    dbc.Col([
                        html.P([
                            "📊 数据来源: ",
                            html.Strong(id='footer-source-name', children="FAO食品价格指数"),
                            " (基准期: 2014-2016=100)"
                        ], className="text-muted text-center"),
                    ], width=12)
                ])
            ])
        ], fluid=True),
        
        # 隐藏组件
        dcc.Store(id='current-data-source', data=global_source_manager._active_source_name),
        dcc.Store(id='selected-categories', data=['Food Price Index']),
        dcc.Store(id='refresh-interval-seconds', data=3600),
        dcc.Download(id='download-data'),
        dcc.Interval(
            id='auto-refresh-interval',
            interval=3600 * 1000,  # 默认1小时
            disabled=True  # 默认禁用
        ),
    ])


# 设置布局
app.layout = create_layout


# ============================================
# 回调函数
# ============================================

# 模态框回调
@app.callback(
    Output("modal-data-info", "is_open"),
    [Input("btn-data-info", "n_clicks"), Input("close-data-info", "n_clicks")],
    [State("modal-data-info", "is_open")],
)
def toggle_data_info_modal(n1, n2, is_open):
    if n1 or n2:
        return not is_open
    return is_open


@app.callback(
    Output("modal-source-settings", "is_open"),
    [Input("btn-source-settings", "n_clicks"), Input("close-source-settings", "n_clicks")],
    [State("modal-source-settings", "is_open")],
)
def toggle_source_settings_modal(n1, n2, is_open):
    if n1 or n2:
        return not is_open
    return is_open


@app.callback(
    Output("modal-about", "is_open"),
    [Input("btn-about", "n_clicks"), Input("close-about", "n_clicks")],
    [State("modal-about", "is_open")],
)
def toggle_about_modal(n1, n2, is_open):
    if n1 or n2:
        return not is_open
    return is_open


# 数据源切换回调
@app.callback(
    [Output('year-dropdown', 'options'),
     Output('category-dropdown', 'options'),
     Output('extended-category-dropdown', 'options'),
     Output('footer-source-name', 'children')],
    [Input('source-dropdown', 'value')]
)
def update_on_source_change(source_name):
    global global_df, global_metrics_df
    
    print(f"切换数据源到: {source_name}")
    
    # 切换数据源
    if global_source_manager.switch_source(source_name):
        global_source_manager.load_active_source()
    
    # 重新加载数据
    global_df = global_source_manager.get_data()
    
    if global_df is not None and not global_df.empty:
        global_metrics_df = MetricsCalculator.calculate_all_metrics(global_df)
        print(f"数据加载成功: {len(global_df)} 条记录")
    
    # 获取新的选项
    if global_df is not None and not global_df.empty:
        years = sorted(global_df['Date'].dt.year.unique())
        year_options = [{'label': str(y), 'value': y} for y in years]
    else:
        year_options = [{'label': str(y), 'value': y} for y in range(2010, 2026)]
    
    # 获取类别
    categories = global_source_manager.get_available_categories()
    if not categories and global_df is not None:
        categories = [col for col in global_df.columns if col != 'Date']
    
    # 主要类别
    main_cats = ['Food Price Index', 'Meat', 'Dairy', 'Cereals', 'Oils', 'Sugar']
    main_category_options = [
        {'label': cat, 'value': cat} 
        for cat in categories 
        if cat in main_cats
    ]
    
    # 扩展类别
    extended_category_options = [
        {'label': cat, 'value': cat} 
        for cat in categories 
        if cat not in main_cats and cat != 'Date'
    ]
    
    return year_options, main_category_options, extended_category_options, source_name


# 更新关键指标
@app.callback(
    [Output('latest-fpi', 'children'),
     Output('latest-mom', 'children'),
     Output('latest-yoy', 'children'),
     Output('latest-date', 'children')],
    [Input('category-dropdown', 'value'),
     Input('extended-category-dropdown', 'value')]
)
def update_latest_metrics(main_categories, extended_categories):
    global global_df, global_metrics_df
    
    if global_df is None or global_metrics_df is None:
        return 'N/A', 'N/A', 'N/A', 'N/A'
    
    # 合并类别
    all_categories = (main_categories or []) + (extended_categories or [])
    if not all_categories:
        all_categories = ['Food Price Index']
    
    primary_category = all_categories[0]
    
    try:
        # 获取最新数据
        latest_idx = global_df['Date'].idxmax()
        latest_row = global_df.loc[latest_idx]
        latest_metrics_row = global_metrics_df.loc[latest_idx]
        
        # 获取值
        value = latest_row.get(primary_category, np.nan)
        mom_value = latest_metrics_row.get(f'{primary_category}_MoM', np.nan)
        yoy_value = latest_metrics_row.get(f'{primary_category}_YoY', np.nan)
        date_value = latest_row['Date']
        
        # 格式化
        value_str = f'{value:.2f}' if pd.notna(value) else 'N/A'
        
        # 环比（带颜色）
        if pd.notna(mom_value):
            mom_color = 'text-danger' if mom_value > 0 else 'text-success' if mom_value < 0 else ''
            mom_str = html.Span(f'{mom_value:+.2f}%', className=mom_color)
        else:
            mom_str = 'N/A'
        
        # 同比（带颜色）
        if pd.notna(yoy_value):
            yoy_color = 'text-danger' if yoy_value > 0 else 'text-success' if yoy_value < 0 else ''
            yoy_str = html.Span(f'{yoy_value:+.2f}%', className=yoy_color)
        else:
            yoy_str = 'N/A'
        
        date_str = date_value.strftime('%Y-%m') if pd.notna(date_value) else 'N/A'
        
        return value_str, mom_str, yoy_str, date_str
        
    except Exception as e:
        print(f"更新指标失败: {e}")
        return 'N/A', 'N/A', 'N/A', 'N/A'


# 主图表回调
@app.callback(
    [Output('main-chart', 'figure'),
     Output('main-chart-title', 'children'),
     Output('data-count-badge', 'children')],
    [Input('year-dropdown', 'value'),
     Input('category-dropdown', 'value'),
     Input('extended-category-dropdown', 'value'),
     Input('chart-type-dropdown', 'value')]
)
def update_main_chart(selected_year, main_categories, extended_categories, chart_type):
    global global_df
    
    if global_df is None:
        return go.Figure(), "食品价格指数趋势图", "0 条数据"
    
    # 合并类别
    all_categories = (main_categories or []) + (extended_categories or [])
    if not all_categories:
        all_categories = ['Food Price Index']
    
    # 筛选年份数据
    if selected_year:
        mask = global_df['Date'].dt.year == selected_year
        df_filtered = global_df.loc[mask].copy()
    else:
        df_filtered = global_df.copy()
    
    # 检查数据量
    if df_filtered.empty:
        return go.Figure(), f"{selected_year}年 - 无数据", "0 条数据"
    
    # 创建月份标签
    df_filtered['Month'] = df_filtered['Date'].dt.strftime('%m月')
    df_filtered['MonthLabel'] = df_filtered['Date'].dt.strftime('%Y-%m')
    
    data_count = len(df_filtered)
    
    # 根据图表类型创建
    if chart_type == 'heatmap':
        # 创建年份x月份热力图
        fig = create_year_month_heatmap(global_df, all_categories[0])
        title = f"{all_categories[0]} 历年热力图"
        
    elif chart_type == 'bar':
        # 柱状图
        fig = go.Figure()
        
        for category in all_categories:
            if category in df_filtered.columns:
                # 准备文本标注（处理NaN值）
                text_values = [f'{v:.1f}' if pd.notna(v) else '' for v in df_filtered[category]]
                
                # 单数据点特殊处理
                if data_count == 1:
                    textposition = 'outside'
                    bar_width = 0.3
                else:
                    textposition = 'outside' if data_count <= 12 else 'auto'
                    bar_width = None
                
                fig.add_trace(go.Bar(
                    x=df_filtered['Month'],
                    y=df_filtered[category],
                    name=category,
                    marker_color=get_category_color(category),
                    text=text_values,
                    textposition=textposition,
                    width=bar_width,
                ))
        
        fig.update_layout(
            barmode='group' if len(all_categories) > 1 else 'relative',
            xaxis_title='月份',
            yaxis_title='价格指数',
        )
        title = f"{selected_year}年 食品价格指数柱状图"
        
    elif chart_type == 'area':
        # 面积图
        fig = go.Figure()
        
        # 检查数据点数量
        show_text = data_count <= 12
        show_markers = data_count <= 24
        
        for category in all_categories:
            if category in df_filtered.columns:
                # 准备文本标注
                text_values = [f'{v:.1f}' if pd.notna(v) else '' for v in df_filtered[category]] if show_text else None
                
                fig.add_trace(go.Scatter(
                    x=df_filtered['Month'],
                    y=df_filtered[category],
                    name=category,
                    stackgroup='one' if len(all_categories) > 1 else None,
                    fill='tonexty',
                    mode='lines+markers+text' if show_text else 'lines+markers' if show_markers else 'lines',
                    line=dict(color=get_category_color(category), width=2),
                    marker=dict(size=8) if show_markers else None,
                    text=text_values,
                    textposition='top center' if show_text else None,
                ))
        
        fig.update_layout(
            xaxis_title='月份',
            yaxis_title='价格指数',
        )
        title = f"{selected_year}年 食品价格指数面积图"
        
    else:  # line
        # 折线图
        fig = go.Figure()
        
        for category in all_categories:
            if category in df_filtered.columns:
                # 添加数据标注（仅当数据点较少时）
                show_text = data_count <= 24
                show_markers = data_count <= 36
                
                # 准备文本标注（处理NaN值）
                if show_text:
                    text_values = [f'{v:.1f}' if pd.notna(v) else '' for v in df_filtered[category]]
                else:
                    text_values = None
                
                # 单数据点特殊处理
                if data_count == 1:
                    mode = 'markers+text'
                    marker_size = 12
                elif show_text:
                    mode = 'lines+markers+text'
                    marker_size = 8
                elif show_markers:
                    mode = 'lines+markers'
                    marker_size = 8
                else:
                    mode = 'lines'
                    marker_size = None
                
                fig.add_trace(go.Scatter(
                    x=df_filtered['Month'],
                    y=df_filtered[category],
                    name=category,
                    mode=mode,
                    line=dict(color=get_category_color(category), width=3),
                    marker=dict(size=marker_size) if marker_size else None,
                    text=text_values,
                    textposition='top center',
                ))
        
        fig.update_layout(
            xaxis_title='月份',
            yaxis_title='价格指数',
            hovermode='x unified'
        )
        title = f"{selected_year}年 食品价格指数趋势图"
    
    # 统一布局
    fig.update_layout(
        template='plotly_white',
        title_x=0.5,
        font=dict(size=12),
        legend=dict(
            orientation='h',
            yanchor='bottom',
            y=1.02,
            xanchor='center',
            x=0.5
        ),
        margin=dict(t=50, b=80, l=50, r=50),
        xaxis=dict(
            tickangle=45 if data_count > 6 else 0,
            tickfont=dict(size=10)
        )
    )
    
    # 确保y轴从合适的位置开始
    fig.update_yaxes(rangemode='tozero' if chart_type in ['bar', 'area'] else 'normal')
    
    # 单数据点特殊处理：确保y轴有适当的范围
    if data_count == 1:
        all_values = []
        for category in all_categories:
            if category in df_filtered.columns:
                val = df_filtered[category].iloc[0]
                if pd.notna(val):
                    all_values.append(val)
        if all_values:
            min_val = min(all_values) * 0.9
            max_val = max(all_values) * 1.1
            fig.update_yaxes(range=[min_val, max_val])
    
    return fig, title, f"{data_count} 条数据"


# 热力图回调
@app.callback(
    Output('heatmap-chart', 'figure'),
    [Input('category-dropdown', 'value')]
)
def update_heatmap(categories):
    global global_df
    
    if global_df is None:
        return go.Figure()
    
    category = categories[0] if categories and len(categories) > 0 else 'Food Price Index'
    
    return create_year_month_heatmap(global_df, category)


# 同比环比图表回调
@app.callback(
    Output('metrics-chart', 'figure'),
    [Input('category-dropdown', 'value'),
     Input('extended-category-dropdown', 'value')]
)
def update_metrics_chart(main_categories, extended_categories):
    global global_metrics_df
    
    if global_metrics_df is None:
        return go.Figure()
    
    # 合并类别
    all_categories = (main_categories or []) + (extended_categories or [])
    if not all_categories:
        all_categories = ['Food Price Index']
    
    primary_category = all_categories[0]
    
    # 获取最近24个月的数据
    df_recent = global_metrics_df.tail(24).copy()
    df_recent['YearMonth'] = df_recent['Date'].dt.strftime('%Y-%m')
    
    data_count = len(df_recent)
    show_text = data_count <= 12
    
    # 创建双轴图表
    fig = make_subplots(specs=[[{"secondary_y": True}]])
    
    # 环比（柱状图）
    mom_col = f'{primary_category}_MoM'
    if mom_col in df_recent.columns:
        # 设置颜色（正值红色，负值绿色）
        colors = ['#e74c3c' if v > 0 else '#27ae60' if v < 0 else '#95a5a6' 
                 for v in df_recent[mom_col].fillna(0)]
        
        # 准备文本标注
        mom_text = [f'{v:+.1f}%' if pd.notna(v) else '' for v in df_recent[mom_col]]
        
        fig.add_trace(
            go.Bar(
                x=df_recent['YearMonth'],
                y=df_recent[mom_col],
                name='月环比 (%)',
                marker_color=colors,
                opacity=0.7,
                text=mom_text if show_text else None,
                textposition='outside' if show_text else None,
            ),
            secondary_y=False,
        )
    
    # 同比（折线图）
    yoy_col = f'{primary_category}_YoY'
    if yoy_col in df_recent.columns:
        # 准备文本标注
        yoy_text = [f'{v:+.1f}%' if pd.notna(v) else '' for v in df_recent[yoy_col]]
        
        fig.add_trace(
            go.Scatter(
                x=df_recent['YearMonth'],
                y=df_recent[yoy_col],
                name='年同比 (%)',
                mode='lines+markers+text' if show_text else 'lines+markers',
                line=dict(color='#3498db', width=3),
                marker=dict(size=8),
                text=yoy_text if show_text else None,
                textposition='top center' if show_text else None,
            ),
            secondary_y=True,
        )
    
    # 添加零线
    fig.add_hline(y=0, line_dash='dash', line_color='gray', line_width=1)
    
    # 更新布局 - 使用新的Plotly API
    fig.update_layout(
        title=f'{primary_category} 同比与环比涨幅趋势（最近{data_count}个月）',
        title_x=0.5,
        xaxis_title='月份',
        yaxis=dict(
            title=dict(text='月环比 (%)', font=dict(color='#e74c3c')),
            tickfont=dict(color='#e74c3c'),
            zeroline=True,
            zerolinecolor='gray'
        ),
        yaxis2=dict(
            title=dict(text='年同比 (%)', font=dict(color='#3498db')),
            tickfont=dict(color='#3498db'),
            overlaying='y',
            side='right',
            zeroline=True,
            zerolinecolor='gray'
        ),
        template='plotly_white',
        legend=dict(
            orientation='h',
            yanchor='bottom',
            y=1.02,
            xanchor='center',
            x=0.5
        ),
        xaxis=dict(
            tickangle=45 if data_count > 6 else 0,
            tickfont=dict(size=10)
        ),
        font=dict(size=11),
        bargap=0.15,
        margin=dict(t=50, b=80, l=50, r=50)
    )
    
    return fig


# 多类别对比图回调
@app.callback(
    Output('comparison-chart', 'figure'),
    [Input('year-dropdown', 'value'),
     Input('category-dropdown', 'value'),
     Input('extended-category-dropdown', 'value')]
)
def update_comparison_chart(selected_year, main_categories, extended_categories):
    global global_df
    
    if global_df is None:
        return go.Figure()
    
    # 合并类别
    all_categories = (main_categories or []) + (extended_categories or [])
    if not all_categories:
        all_categories = ['Food Price Index', 'Meat', 'Dairy', 'Cereals', 'Oils', 'Sugar']
    
    # 筛选年份数据
    if selected_year:
        mask = global_df['Date'].dt.year == selected_year
        df_filtered = global_df.loc[mask].copy()
    else:
        df_filtered = global_df.copy()
    
    if df_filtered.empty:
        return go.Figure()
    
    # 创建月份标签
    df_filtered['Month'] = df_filtered['Date'].dt.strftime('%m月')
    
    data_count = len(df_filtered)
    
    # 决定是否显示文本标注（数据点少且类别少时）
    show_text = data_count <= 6 and len(all_categories) <= 4
    
    # 创建图表
    fig = go.Figure()
    
    # 如果类别太多，只显示主要趋势线
    max_categories = 8
    display_categories = all_categories[:max_categories]
    
    for i, category in enumerate(display_categories):
        if category in df_filtered.columns:
            # 检查数据是否有效
            values = df_filtered[category].dropna()
            if len(values) > 0:
                # 准备文本标注
                if show_text:
                    text_values = [f'{v:.1f}' if pd.notna(v) else '' for v in df_filtered[category]]
                    mode = 'lines+markers+text'
                else:
                    text_values = None
                    mode = 'lines+markers'
                
                # 使用平滑线
                fig.add_trace(go.Scatter(
                    x=df_filtered['Month'],
                    y=df_filtered[category],
                    name=category,
                    mode=mode,
                    line=dict(
                        color=get_category_color(category),
                        width=2.5,
                        shape='spline',
                        smoothing=0.3
                    ),
                    marker=dict(
                        size=7,
                        symbol='circle'
                    ),
                    text=text_values,
                    textposition='top center' if show_text else None,
                    hovertemplate=f'{category}: %{{y:.2f}}<extra></extra>'
                ))
    
    # 更新布局
    fig.update_layout(
        title=f'{selected_year}年 各类别食品价格指数对比（共{len(display_categories)}个类别）',
        title_x=0.5,
        xaxis_title='月份',
        yaxis_title='价格指数',
        template='plotly_white',
        hovermode='x unified',
        legend=dict(
            orientation='v',
            yanchor='top',
            y=1,
            xanchor='left',
            x=1.02,
            bgcolor='rgba(255, 255, 255, 0.8)',
            bordercolor='lightgray',
            borderwidth=1
        ),
        xaxis=dict(
            tickangle=45 if data_count > 6 else 0,
            tickfont=dict(size=10)
        ),
        font=dict(size=11),
        margin=dict(r=180, t=50, b=80, l=50)
    )
    
    # 添加网格
    fig.update_xaxes(
        showgrid=True,
        gridwidth=1,
        gridcolor='lightgray'
    )
    
    fig.update_yaxes(
        showgrid=True,
        gridwidth=1,
        gridcolor='lightgray',
        zeroline=True,
        zerolinecolor='gray'
    )
    
    # 单数据点特殊处理
    if data_count == 1:
        all_values = []
        for category in display_categories:
            if category in df_filtered.columns:
                val = df_filtered[category].iloc[0]
                if pd.notna(val):
                    all_values.append(val)
        if all_values:
            min_val = min(all_values) * 0.9
            max_val = max(all_values) * 1.1
            fig.update_yaxes(range=[min_val, max_val])
    
    return fig


# 数据表格回调
@app.callback(
    Output('data-table-container', 'children'),
    [Input('year-dropdown', 'value'),
     Input('category-dropdown', 'value'),
     Input('extended-category-dropdown', 'value')]
)
def update_data_table(selected_year, main_categories, extended_categories):
    global global_df
    
    if global_df is None:
        return html.P("暂无数据", className="text-muted text-center")
    
    # 合并类别
    all_categories = (main_categories or []) + (extended_categories or [])
    if not all_categories:
        all_categories = ['Food Price Index']
    
    # 筛选年份数据
    if selected_year:
        mask = global_df['Date'].dt.year == selected_year
        df_filtered = global_df.loc[mask].copy()
    else:
        df_filtered = global_df.copy()
    
    if df_filtered.empty:
        return html.P(f"{selected_year}年无数据", className="text-muted text-center")
    
    # 准备显示列
    display_columns = ['Date'] + all_categories
    
    # 检查列是否存在
    display_columns = [col for col in display_columns if col in df_filtered.columns]
    
    # 格式化日期
    df_display = df_filtered[display_columns].copy()
    df_display['Date'] = df_display['Date'].dt.strftime('%Y-%m')
    
    # 格式化数值列
    for col in display_columns[1:]:
        df_display[col] = df_display[col].round(2)
    
    # 只显示最近12行或全部
    if len(df_display) > 12:
        df_display = df_display.tail(12)
        show_note = html.P("显示最近12个月的数据", className="text-muted small text-right mt-2")
    else:
        show_note = html.Div()
    
    # 创建表格
    table_header = [html.Thead(html.Tr([
        html.Th(col, style={'backgroundColor': COLORS['light']})
        for col in df_display.columns
    ]))]
    
    table_body = [html.Tbody([
        html.Tr([
            html.Td(df_display.iloc[i][col], 
                   style={'color': '#e74c3c' if col != 'Date' and i > 0 and 
                          df_display.iloc[i][col] > df_display.iloc[i-1][col] 
                          else '#27ae60' if col != 'Date' and i > 0 and 
                          df_display.iloc[i][col] < df_display.iloc[i-1][col]
                          else '#2c3e50'})
            for col in df_display.columns
        ])
        for i in range(len(df_display))
    ])]
    
    table = dbc.Table(
        table_header + table_body,
        bordered=True,
        hover=True,
        responsive=True,
        striped=True,
        size="sm"
    )
    
    return html.Div([table, show_note])


# 下载数据回调
@app.callback(
    Output('download-data', 'data'),
    [Input('btn-download', 'n_clicks')],
    [State('year-dropdown', 'value'),
     State('category-dropdown', 'value'),
     State('extended-category-dropdown', 'value')],
    prevent_initial_call=True
)
def download_data(n_clicks, selected_year, main_categories, extended_categories):
    global global_df
    
    if global_df is None:
        return None
    
    # 合并类别
    all_categories = (main_categories or []) + (extended_categories or [])
    if not all_categories:
        all_categories = ['Food Price Index']
    
    # 准备数据
    export_columns = ['Date'] + all_categories
    export_columns = [col for col in export_columns if col in global_df.columns]
    
    df_export = global_df[export_columns].copy()
    df_export['Date'] = df_export['Date'].dt.strftime('%Y-%m-%d')
    
    return dcc.send_data_frame(
        df_export.to_csv,
        f'food_price_data_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv',
        index=False
    )


# 数据源设置回调 - 显示数据源描述
@app.callback(
    Output('modal-source-description', 'children'),
    [Input('modal-source-dropdown', 'value')]
)
def update_source_description(source_name):
    if not source_name:
        return html.P("请选择一个数据源", className="text-muted")
    
    source = global_source_manager.get_source(source_name)
    if source:
        return html.Div([
            html.Strong(f"📊 {source_name}"),
            html.P(source.description, className="text-muted mt-1"),
            html.P([
                "数据量: ", 
                html.Strong(f"{len(source.data)} 条记录" if source.is_ready else "未加载"),
                " | 类别数: ",
                html.Strong(f"{len(source.categories)} 个")
            ], className="text-muted small")
        ])
    return html.P("未知数据源", className="text-danger")


# 数据源设置回调 - 刷新数据
@app.callback(
    Output('settings-status', 'children'),
    [Input('btn-refresh-data', 'n_clicks'),
     Input('btn-apply-settings', 'n_clicks')],
    [State('modal-source-dropdown', 'value'),
     State('refresh-interval', 'value')],
    prevent_initial_call=True
)
def handle_source_settings(refresh_clicks, apply_clicks, source_name, refresh_interval):
    global global_df, global_metrics_df
    
    ctx = dash.callback_context
    if not ctx.triggered:
        return ""
    
    button_id = ctx.triggered[0]['prop_id'].split('.')[0]
    
    if button_id == 'btn-refresh-data':
        # 刷新当前数据源
        if global_source_manager.refresh_active_source():
            global_df = global_source_manager.get_data()
            if global_df is not None and not global_df.empty:
                global_metrics_df = MetricsCalculator.calculate_all_metrics(global_df)
            
            return html.Span([
                html.I(className="fas fa-check-circle text-success mr-2"),
                f"数据刷新成功！共 {len(global_df) if global_df is not None else 0} 条记录"
            ])
        else:
            return html.Span([
                html.I(className="fas fa-exclamation-circle text-danger mr-2"),
                "数据刷新失败"
            ])
    
    elif button_id == 'btn-apply-settings':
        # 应用设置：切换数据源 + 设置刷新间隔
        status_messages = []
        
        # 切换数据源
        if source_name and source_name != global_source_manager._active_source_name:
            if global_source_manager.switch_source(source_name):
                global_source_manager.load_active_source()
                global_df = global_source_manager.get_data()
                if global_df is not None and not global_df.empty:
                    global_metrics_df = MetricsCalculator.calculate_all_metrics(global_df)
                status_messages.append(f"已切换到: {source_name}")
            else:
                status_messages.append(f"切换数据源失败: {source_name}")
        
        # 设置刷新间隔
        if refresh_interval:
            interval_seconds = refresh_interval * 60
            global_source_manager.auto_refresh_interval = interval_seconds
            status_messages.append(f"刷新间隔已设置为: {refresh_interval} 分钟")
        
        if not status_messages:
            return html.Span([
                html.I(className="fas fa-info-circle text-info mr-2"),
                "设置没有变化"
            ])
        
        return html.Span([
            html.I(className="fas fa-check-circle text-success mr-2"),
            " | ".join(status_messages)
        ])
    
    return ""


# 自动刷新回调
@app.callback(
    [Output('auto-refresh-interval', 'interval'),
     Output('auto-refresh-interval', 'disabled')],
    [Input('refresh-interval-seconds', 'data')]
)
def update_auto_refresh(interval_seconds):
    if interval_seconds and interval_seconds > 0:
        return interval_seconds * 1000, False
    return 3600 * 1000, True


# 自动刷新数据回调
@app.callback(
    Output('settings-status', 'children', allow_duplicate=True),
    [Input('auto-refresh-interval', 'n_intervals')],
    prevent_initial_call=True
)
def auto_refresh_data(n_intervals):
    global global_df, global_metrics_df
    
    if n_intervals is None or n_intervals == 0:
        raise dash.exceptions.PreventUpdate
    
    # 检查是否需要刷新
    if global_source_manager.should_auto_refresh():
        print(f"自动刷新数据... (第 {n_intervals} 次)")
        
        if global_source_manager.refresh_active_source():
            global_df = global_source_manager.get_data()
            if global_df is not None and not global_df.empty:
                global_metrics_df = MetricsCalculator.calculate_all_metrics(global_df)
            
            return html.Span([
                html.I(className="fas fa-sync-alt text-info mr-2"),
                f"自动刷新成功: {datetime.now().strftime('%H:%M:%S')}"
            ], className="small")
    
    raise dash.exceptions.PreventUpdate


# 服务器入口
server = app.server

if __name__ == '__main__':
    print(f"=" * 60)
    print("启动全球食品价格与通胀分析仪表板...")
    print(f"访问地址: http://localhost:8050")
    print(f"=" * 60)
    
    # 兼容新旧版本Dash API
    try:
        app.run(debug=True, host='0.0.0.0', port=8050)
    except AttributeError:
        app.run_server(debug=True, host='0.0.0.0', port=8050)
