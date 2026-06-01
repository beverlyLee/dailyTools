import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import dash
from dash import dcc, html, Input, Output, State, callback
import plotly.graph_objects as go
import pandas as pd

from src.data_processing import PatientFlowAnalyzer
from src.models import RegistrationDifficultyScorer


app = dash.Dash(__name__)
server = app.server
app.title = '医院挂号竞争强度分析系统'

DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'hospital_registration_data.csv')

difficulty_scorer_sim = RegistrationDifficultyScorer(DATA_PATH)
patient_flow_analyzer_sim = PatientFlowAnalyzer(DATA_PATH, use_simulation=True)

difficulty_scorer_real = RegistrationDifficultyScorer(DATA_PATH)
patient_flow_analyzer_real = PatientFlowAnalyzer(DATA_PATH, use_simulation=False)

hospitals = difficulty_scorer_sim.get_all_hospitals()
default_hospital = '北京协和医院'

color_map = {
    '容易': '#2ecc71',
    '一般': '#f1c40f',
    '较难': '#e67e22',
    '困难': '#e74c3c',
    '极难': '#8b0000'
}

completeness_color = {
    '完整': '#27ae60',
    '较完整': '#f39c12',
    '基础': '#95a5a6'
}

app.layout = html.Div([
    html.H1('🏥 医院挂号竞争强度分析系统', style={
        'textAlign': 'center',
        'color': '#2c3e50',
        'padding': '20px',
        'backgroundColor': '#ecf0f1',
        'margin': '0',
        'borderRadius': '10px'
    }),
    
    html.Div([
        html.Label('📊 数据源:', style={
            'fontWeight': 'bold',
            'marginRight': '10px',
            'marginLeft': '20px',
            'fontSize': '14px',
            'color': '#2c3e50'
        }),
        dcc.RadioItems(
            id='data-source-selector',
            options=[
                {'label': '🎲 模拟数据 (1700患者)', 'value': 'simulation'},
                {'label': '📋 真实数据 (卫健委样本)', 'value': 'real'}
            ],
            value='simulation',
            style={'marginRight': '30px'},
            labelStyle={'marginRight': '15px'}
        ),
        html.Label('🏥 选择医院:', style={
            'fontWeight': 'bold',
            'marginRight': '10px',
            'fontSize': '14px',
            'color': '#2c3e50'
        }),
        dcc.Dropdown(
            id='hospital-selector',
            options=[{'label': h, 'value': h} for h in hospitals],
            value=default_hospital,
            style={'width': '280px', 'fontSize': '13px'}
        ),
        html.Div(id='data-completeness-badge', style={
            'marginLeft': '15px',
            'padding': '5px 12px',
            'borderRadius': '15px',
            'fontWeight': 'bold',
            'fontSize': '11px',
            'color': 'white'
        }),
        html.Label('🔀 桑基图类型:', style={
            'fontWeight': 'bold',
            'marginRight': '10px',
            'marginLeft': '30px',
            'fontSize': '14px',
            'color': '#2c3e50'
        }),
        dcc.RadioItems(
            id='sankey-type-selector',
            options=[
                {'label': '三层结构', 'value': '3layer'},
                {'label': '连续链路', 'value': 'continuous'}
            ],
            value='3layer',
            style={},
            labelStyle={'marginRight': '15px'}
        )
    ], style={
        'padding': '15px',
        'backgroundColor': '#f8f9fa',
        'display': 'flex',
        'alignItems': 'center',
        'flexWrap': 'wrap',
        'borderRadius': '10px',
        'margin': '10px'
    }),
    
    html.Div([
        html.H2('📊 各科室挂号难度指数', style={
            'textAlign': 'center',
            'color': '#34495e',
            'marginBottom': '20px'
        }),
        dcc.Graph(id='difficulty-chart')
    ], style={
        'padding': '20px',
        'margin': '20px',
        'backgroundColor': 'white',
        'borderRadius': '10px',
        'boxShadow': '0 4px 6px rgba(0,0,0,0.1)'
    }),
    
    html.Div([
        html.H2('🔄 患者状态流转路径分析（桑基图）', style={
            'textAlign': 'center',
            'color': '#34495e',
            'marginBottom': '20px'
        }),
        html.Div(id='transfer-stats', style={
            'textAlign': 'center',
            'padding': '15px',
            'backgroundColor': '#e8f4f8',
            'borderRadius': '8px',
            'marginBottom': '20px',
            'fontSize': '14px'
        }),
        dcc.Graph(id='flow-sankey'),
        html.Div(id='no-data-message', style={
            'display': 'none',
            'textAlign': 'center',
            'padding': '40px',
            'color': '#7f8c8d',
            'fontSize': '16px',
            'backgroundColor': '#f8f9fa',
            'borderRadius': '8px',
            'margin': '20px'
        })
    ], style={
        'padding': '20px',
        'margin': '20px',
        'backgroundColor': 'white',
        'borderRadius': '10px',
        'boxShadow': '0 4px 6px rgba(0,0,0,0.1)'
    }),
    
    html.Div([
        html.H2('⏱️ 科室平均候诊时长', style={
            'textAlign': 'center',
            'color': '#34495e',
            'marginBottom': '20px'
        }),
        dcc.Graph(id='wait-time-chart')
    ], style={
        'padding': '20px',
        'margin': '20px',
        'backgroundColor': 'white',
        'borderRadius': '10px',
        'boxShadow': '0 4px 6px rgba(0,0,0,0.1)'
    }),
    
    html.Div([
        html.Div([
            html.Strong('📋 桑基图图例：', style={'marginRight': '25px', 'fontSize': '13px'}),
            html.Span('🟢 科室节点', style={'marginRight': '20px', 'fontSize': '13px'}),
            html.Span('🔵 初诊', style={'marginRight': '20px', 'fontSize': '13px'}),
            html.Span('🟡 复诊', style={'marginRight': '20px', 'fontSize': '13px'}),
            html.Span('🔴 住院', style={'marginRight': '20px', 'fontSize': '13px'}),
            html.Span('🟣 转科', style={'marginRight': '20px', 'fontSize': '13px'}),
            html.Span('🔷 转入科室', style={'marginRight': '20px', 'fontSize': '13px'}),
            html.Span('💡 悬停查看详细流量', style={'marginRight': '15px', 'fontSize': '12px', 'color': '#7f8c8d'})
        ], style={
            'textAlign': 'center',
            'padding': '15px',
            'backgroundColor': '#f8f9fa',
            'borderRadius': '8px',
            'fontSize': '13px'
        })
    ], style={'margin': '20px'}),
    
    html.Div([
        html.P('数据来源：国家卫健委医院质量监测系统（公开样本数据）', 
               style={'textAlign': 'center', 'color': '#7f8c8d', 'fontSize': '12px'})
    ], style={'padding': '20px', 'backgroundColor': '#ecf0f1'})
], style={
    'backgroundColor': '#ecf0f1',
    'minHeight': '100vh',
    'fontFamily': 'Arial, sans-serif'
})


@app.callback(
    Output('difficulty-chart', 'figure'),
    [Input('hospital-selector', 'value'),
     Input('data-source-selector', 'value')]
)
def update_difficulty_chart(selected_hospital, data_source):
    try:
        scorer = difficulty_scorer_sim if data_source == 'simulation' else difficulty_scorer_real
        hospital_data = scorer.get_hospital_difficulty(selected_hospital)
        
        colors = [color_map.get(level, '#95a5a6') for level in hospital_data['难度等级']]
        
        fig = go.Figure(data=[
            go.Bar(
                x=hospital_data['科室'],
                y=hospital_data['挂号难度指数'],
                marker_color=colors,
                text=hospital_data['难度等级'],
                textposition='auto',
                hovertemplate=(
                    '<b>%{x}</b><br>' +
                    '挂号难度指数: %{y:.4f}<br>' +
                    '难度等级: %{text}<br>' +
                    '<extra></extra>'
                )
            )
        ])
        
        fig.update_layout(
            xaxis_title='科室',
            yaxis_title='挂号难度指数 (越低越难)',
            hovermode='x unified',
            height=500,
            showlegend=False
        )
        
        return fig
    except Exception as e:
        return go.Figure().add_annotation(text=f"数据加载错误: {str(e)}", showarrow=False)


@app.callback(
    [Output('flow-sankey', 'figure'),
     Output('flow-sankey', 'style'),
     Output('no-data-message', 'style'),
     Output('no-data-message', 'children'),
     Output('transfer-stats', 'children'),
     Output('data-completeness-badge', 'children'),
     Output('data-completeness-badge', 'style')],
    [Input('hospital-selector', 'value'),
     Input('data-source-selector', 'value'),
     Input('sankey-type-selector', 'value')]
)
def update_sankey(selected_hospital, data_source, sankey_type):
    try:
        analyzer = patient_flow_analyzer_sim if data_source == 'simulation' else patient_flow_analyzer_real
        data_summary = analyzer.get_data_summary()
        
        if sankey_type == 'continuous':
            flows, node_info, node_values = analyzer.get_continuous_patient_journey(selected_hospital)
        else:
            flows, node_info, node_values = analyzer.get_complete_flow_chain_3layer(selected_hospital)
        
        ratio_info = analyzer.get_internal_to_surgical_ratio(selected_hospital)
        completeness = analyzer.get_hospital_data_completeness(selected_hospital)
        
        completeness_badge = f'数据完整性: {completeness}'
        badge_style = {
            'marginLeft': '15px',
            'padding': '5px 12px',
            'borderRadius': '15px',
            'fontWeight': 'bold',
            'fontSize': '11px',
            'color': 'white',
            'backgroundColor': completeness_color.get(completeness, '#95a5a6')
        }
        
        has_valid_data = len(flows) > 0 and any(f['value'] > 0 for f in flows)
        
        stats_text = html.Div([
            html.Strong(f'🔀 内科转外科比例: {ratio_info.get("ratio", 0)}%'),
            html.Br(),
            html.Span(f'内科转外科: {ratio_info.get("internal_to_surgical", 0)}例 ｜ 总转科: {ratio_info.get("total_transfers", 0)}例'),
            html.Br(),
            html.Small(f'患者总流量: {data_summary.get("total_patients", 0)}人 ｜ 就诊记录: {data_summary.get("total_records", 0)}条', 
                      style={'color': '#7f8c8d'})
        ])
        
        if not has_valid_data:
            no_data_style = {
                'display': 'block',
                'textAlign': 'center',
                'padding': '60px 40px',
                'color': '#7f8c8d',
                'fontSize': '16px',
                'backgroundColor': '#f8f9fa',
                'borderRadius': '8px',
                'margin': '20px',
                'border': '2px dashed #ddd'
            }
            no_data_content = html.Div([
                html.H4('📭 当前医院暂无完整转科数据', style={'marginBottom': '10px', 'color': '#e74c3c'}),
                html.P('请选择 "北京协和医院"、"北京大学第一医院" 或 "中国人民解放军总医院" 查看完整流转路径'),
                html.P('三层结构：科室 → 初诊/复诊/住院/转科 → 转入科室', 
                       style={'marginTop': '15px', 'fontSize': '14px', 'color': '#95a5a6'}),
                html.P('连续链路：追踪患者多次就诊和转科的完整旅程', 
                       style={'fontSize': '14px', 'color': '#95a5a6'})
            ])
            return go.Figure(), {'display': 'none'}, no_data_style, no_data_content, stats_text, completeness_badge, badge_style
        
        all_nodes = sorted(node_info.keys())
        label_to_idx = {label: i for i, label in enumerate(all_nodes)}
        
        sources = [label_to_idx.get(f['source'], 0) for f in flows]
        targets = [label_to_idx.get(f['target'], 0) for f in flows]
        values = [f['value'] for f in flows]
        
        node_colors = []
        for node in all_nodes:
            if node in node_info:
                node_colors.append(node_info[node]['color'])
            else:
                node_colors.append('#95a5a6')
        
        link_colors = []
        for f in flows:
            source_color = node_info.get(f['source'], {}).get('color', '#bdc3c7')
            color_rgb = source_color.lstrip('#')
            try:
                r, g, b = int(color_rgb[0:2], 16), int(color_rgb[2:4], 16), int(color_rgb[4:6], 16)
                link_colors.append(f'rgba({r}, {g}, {b}, 0.4)')
            except:
                link_colors.append('rgba(189, 195, 199, 0.4)')
        
        node_labels_with_value = []
        for node in all_nodes:
            value = node_values.get(node, 0)
            if sankey_type == 'continuous':
                display_name = node.replace('(后续)', ' →').replace('(最终)', ' ✓').replace('(2)', ' (2次)')
            else:
                display_name = node
            node_labels_with_value.append(f'<b>{display_name}</b><br><span style="font-size:14px;color:#2c3e50;background-color:rgba(255,255,255,0.9);padding:2px 6px;border-radius:4px;border:1px solid #bdc3c7;">{value}人</span>')
        
        fig = go.Figure(data=[go.Sankey(
            arrangement='snap',
            node=dict(
                pad=25,
                thickness=30,
                line=dict(color='white', width=2),
                label=node_labels_with_value,
                color=node_colors,
                hovertemplate='<b>%{label}</b><br>总流量: %{value}人次<extra></extra>'
            ),
            link=dict(
                source=sources,
                target=targets,
                value=values,
                color=link_colors,
                hovertemplate=(
                    '%{source.label}<br> ↓ <br>%{target.label}<br>' +
                    '流量: %{value}人次<extra></extra>'
                )
            )
        )])
        
        sankey_title = {
            '3layer': '患者状态流转路径（三层结构：科室 → 状态 → 转入科室）',
            'continuous': '患者连续就诊流转链路（追踪完整就诊旅程）'
        }.get(sankey_type, '患者状态流转路径')
        
        fig.update_layout(
            height=750,
            font_size=13,
            font_family='Arial, sans-serif',
            title=dict(
                text=sankey_title,
                x=0.5,
                font=dict(size=15, color='#2c3e50')
            )
        )
        
        return fig, {'display': 'block'}, {'display': 'none'}, '', stats_text, completeness_badge, badge_style
        
    except Exception as e:
        error_fig = go.Figure().add_annotation(
            text=f"桑基图加载错误: {str(e)}", 
            showarrow=False,
            font=dict(size=14, color="#e74c3c")
        )
        badge_style = {
            'marginLeft': '15px',
            'padding': '5px 12px',
            'borderRadius': '15px',
            'fontWeight': 'bold',
            'fontSize': '11px',
            'color': 'white',
            'backgroundColor': '#95a5a6'
        }
        return error_fig, {'display': 'block'}, {'display': 'none'}, '', html.Div('数据加载中...'), '数据完整性: 未知', badge_style


@app.callback(
    Output('wait-time-chart', 'figure'),
    [Input('hospital-selector', 'value'),
     Input('data-source-selector', 'value')]
)
def update_wait_time_chart(selected_hospital, data_source):
    try:
        analyzer = patient_flow_analyzer_sim if data_source == 'simulation' else patient_flow_analyzer_real
        wait_time_data = analyzer.calculate_average_wait_time(selected_hospital)
        
        fig = go.Figure(data=[
            go.Bar(
                x=wait_time_data['科室'],
                y=wait_time_data['平均候诊时长'],
                marker_color='#3498db',
                text=wait_time_data['平均候诊时长'].astype(str) + '分钟',
                textposition='auto',
                error_y=dict(type='data', array=wait_time_data['候诊时长标准差']),
                hovertemplate=(
                    '<b>%{x}</b><br>' +
                    '平均候诊时长: %{y}分钟<br>' +
                    '就诊人数: %{customdata}人<br>' +
                    '<extra></extra>'
                ),
                customdata=wait_time_data['就诊人数']
            )
        ])
        
        fig.update_layout(
            xaxis_title='科室',
            yaxis_title='平均候诊时长 (分钟)',
            hovermode='x unified',
            height=500,
            showlegend=False
        )
        
        return fig
    except Exception as e:
        return go.Figure().add_annotation(text=f"数据加载错误: {str(e)}", showarrow=False)


if __name__ == '__main__':
    print("=" * 70)
    print("🚀 医院挂号竞争强度分析系统")
    print("=" * 70)
    print(f"📍 访问地址: http://localhost:8050")
    print(f"🏥 默认医院: {default_hospital}")
    print()
    print("📊 数据说明:")
    print("  - 模拟数据: 1700名患者，包含完整的就诊流转链路")
    print("  - 真实数据: 卫健委公开样本数据")
    print()
    print("🔀 桑基图类型:")
    print("  - 三层结构: 科室 → 初诊/复诊/住院/转科 → 转入科室")
    print("  - 连续链路: 追踪患者完整就诊旅程")
    print()
    print("✨ 视觉优化:")
    print("  - 节点标签带半透明白色背景和边框")
    print("  - 增大字号提升可读性")
    print("  - 优化标签位置避免重叠")
    print("=" * 70)
    app.run_server(debug=True, port=8050)
