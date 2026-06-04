import json
from datetime import datetime, timedelta

import dash
from dash import dcc, html, Input, Output, State
import plotly.graph_objects as go
import pandas as pd
import numpy as np
import httpx

API_BASE = "http://localhost:8000/api"

app = dash.Dash(__name__, title="网红地生命周期追踪器")
app.config.suppress_callback_exceptions = True

PHASE_COLORS = {
    "萌芽期": "rgba(76, 175, 80, 0.15)",
    "爆发期": "rgba(255, 193, 7, 0.15)",
    "衰退期": "rgba(255, 87, 34, 0.15)",
    "死亡期": "rgba(158, 158, 158, 0.15)",
}

PHASE_BORDER_COLORS = {
    "萌芽期": "rgba(76, 175, 80, 0.5)",
    "爆发期": "rgba(255, 193, 7, 0.5)",
    "衰退期": "rgba(255, 87, 34, 0.5)",
    "死亡期": "rgba(158, 158, 158, 0.5)",
}

KEYWORD_COLORS = [
    "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
    "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
]


def call_api(endpoint: str, method: str = "GET", data: dict = None):
    try:
        url = f"{API_BASE}{endpoint}"
        if method == "GET":
            resp = httpx.get(url, timeout=30)
        else:
            resp = httpx.post(url, json=data, timeout=60)

        result = resp.json()

        if resp.status_code >= 400:
            error_msg = result.get("detail", str(result)) if isinstance(result, dict) else str(result)
            return {"error": error_msg}

        return result
    except Exception as e:
        return {"error": str(e)}


def create_lifecycle_figure(timelines: dict, lifecycles: dict, keywords: list):
    fig = go.Figure()

    for idx, keyword in enumerate(keywords):
        color = KEYWORD_COLORS[idx % len(KEYWORD_COLORS)]

        if keyword not in timelines:
            continue

        tl = timelines[keyword]
        dates = tl.get("date", [])
        note_counts = tl.get("note_count", [])
        note_ma = tl.get("note_count_ma", [])

        if not dates:
            continue

        fig.add_trace(go.Scatter(
            x=dates,
            y=note_counts,
            mode="markers",
            name=f"{keyword} (日发布量)",
            marker=dict(color=color, size=4, opacity=0.4),
            legendgroup=keyword,
        ))

        fig.add_trace(go.Scatter(
            x=dates,
            y=note_ma,
            mode="lines",
            name=f"{keyword} (7日均线)",
            line=dict(color=color, width=2.5),
            legendgroup=keyword,
        ))

        if keyword in lifecycles and lifecycles[keyword]:
            lc = lifecycles[keyword]
            fitted = lc.get("fitted_values", [])
            if fitted and len(fitted) <= len(dates):
                fig.add_trace(go.Scatter(
                    x=dates[:len(fitted)],
                    y=fitted,
                    mode="lines",
                    name=f"{keyword} (Logistic拟合)",
                    line=dict(color=color, width=2, dash="dash"),
                    legendgroup=keyword,
                ))

    fig.update_layout(
        title="网红地热度时间序列对比",
        xaxis_title="日期",
        yaxis_title="笔记发布量",
        template="plotly_white",
        hovermode="x unified",
        height=500,
        legend=dict(yanchor="top", y=0.99, xanchor="left", x=0.01),
    )

    return fig


def create_phase_figure(timeline: dict, lifecycle: dict, keyword: str):
    fig = go.Figure()

    dates = timeline.get("date", [])
    note_ma = timeline.get("note_count_ma", [])

    if not dates:
        return fig

    fig.add_trace(go.Scatter(
        x=dates,
        y=note_ma,
        mode="lines+markers",
        name="热度(7日均线)",
        line=dict(color="#1f77b4", width=2),
        marker=dict(size=3),
    ))

    if lifecycle and lifecycle.get("fitted_values"):
        fitted = lifecycle["fitted_values"]
        fig.add_trace(go.Scatter(
            x=dates[:len(fitted)],
            y=fitted,
            mode="lines",
            name="Logistic拟合曲线",
            line=dict(color="#ff7f0e", width=2, dash="dash"),
        ))

    if lifecycle and lifecycle.get("phases"):
        phases = lifecycle["phases"]
        for phase in phases:
            name = phase["name"]
            start_day = phase["start_day"]
            end_day = phase["end_day"]

            start_idx = min(start_day, len(dates) - 1)
            end_idx = min(end_day, len(dates) - 1)

            if start_idx < len(dates) and end_idx < len(dates):
                fig.add_vrect(
                    x0=dates[start_idx],
                    x1=dates[end_idx],
                    fillcolor=PHASE_COLORS.get(name, "rgba(200,200,200,0.1)"),
                    line=dict(color=PHASE_BORDER_COLORS.get(name, "rgba(200,200,200,0.3)"), width=1),
                    annotation_text=name,
                    annotation_position="top left",
                    annotation=dict(font_size=12, font_color="#333"),
                )

    fig.update_layout(
        title=f'"{keyword}" 生命周期阶段分析',
        xaxis_title="日期",
        yaxis_title="热度指数",
        template="plotly_white",
        height=450,
    )

    return fig


def create_metrics_card(lifecycle: dict, keyword: str):
    if not lifecycle:
        return html.Div("暂无数据", className="metric-card")

    peak_day = lifecycle.get("peak_day", 0)
    growth_rate = lifecycle.get("growth_rate_at_peak", 0)
    decay_rate = lifecycle.get("decay_rate", 0)
    r_squared = lifecycle.get("r_squared", 0)

    return html.Div([
        html.H4(keyword, style={"textAlign": "center", "marginBottom": "10px"}),
        html.Div([
            html.Span("峰值天数: ", style={"fontWeight": "bold"}),
            html.Span(f"第 {peak_day} 天"),
        ], style={"marginBottom": "5px"}),
        html.Div([
            html.Span("峰值增长率: ", style={"fontWeight": "bold"}),
            html.Span(f"{growth_rate:.2f}"),
        ], style={"marginBottom": "5px"}),
        html.Div([
            html.Span("衰减率: ", style={"fontWeight": "bold"}),
            html.Span(f"{decay_rate:.4f}"),
        ], style={"marginBottom": "5px"}),
        html.Div([
            html.Span("R²: ", style={"fontWeight": "bold"}),
            html.Span(f"{r_squared:.4f}"),
        ], style={"marginBottom": "5px"}),
        html.Div([
            html.Span("生命周期阶段: ", style={"fontWeight": "bold"}),
        ], style={"marginTop": "10px"}),
        html.Div([
            html.Span(f"▸ {p['name']}: 第{p['start_day']}-{p['end_day']}天 - {p['description']}")
            for p in lifecycle.get("phases", [])
        ], style={"fontSize": "12px", "paddingLeft": "10px"}),
    ], style={
        "border": "1px solid #ddd",
        "borderRadius": "8px",
        "padding": "15px",
        "margin": "10px",
        "backgroundColor": "#fafafa",
        "minWidth": "250px",
        "flex": "1",
    })


app.layout = html.Div([
    html.Div([
        html.H1("📸 网红地生命周期追踪器", style={"textAlign": "center", "marginBottom": "5px"}),
        html.P("追踪社交媒体关键词热度变化，预测网红地生命周期", style={"textAlign": "center", "color": "#666"}),
    ], style={"padding": "20px", "backgroundColor": "#f5f5f5", "marginBottom": "20px"}),

    html.Div([
        html.Div([
            html.Label("输入关键词（用逗号分隔多个）:", style={"fontWeight": "bold"}),
            dcc.Input(
                id="keyword-input",
                type="text",
                value="xx彩虹楼梯",
                placeholder="如：xx彩虹楼梯, xx天空之镜",
                style={"width": "100%", "padding": "8px", "marginTop": "5px", "fontSize": "14px"},
            ),
        ], style={"flex": "2", "marginRight": "10px"}),

        html.Div([
            html.Label("数据天数:", style={"fontWeight": "bold"}),
            dcc.Input(
                id="days-input",
                type="number",
                value=90,
                min=30,
                max=365,
                style={"width": "80px", "padding": "8px", "marginTop": "5px"},
            ),
        ], style={"flex": "0.5", "marginRight": "10px"}),

        html.Div([
            html.Label("平台:", style={"fontWeight": "bold"}),
            dcc.Dropdown(
                id="platform-select",
                options=[
                    {"label": "小红书", "value": "xiaohongshu"},
                    {"label": "抖音", "value": "douyin"},
                ],
                value="xiaohongshu",
                clearable=False,
                style={"width": "120px", "marginTop": "5px"},
            ),
        ], style={"flex": "0.5", "marginRight": "10px"}),

        html.Div([
            html.Label("使用Demo数据:", style={"fontWeight": "bold"}),
            dcc.Checklist(
                id="demo-toggle",
                options=[{"label": "Demo", "value": "demo"}],
                value=["demo"],
                style={"marginTop": "8px"},
            ),
        ], style={"flex": "0.5", "marginRight": "10px"}),

        html.Div([
            html.Button("🔍 开始分析", id="analyze-btn", n_clicks=0, style={
                "padding": "10px 25px",
                "fontSize": "14px",
                "backgroundColor": "#1976D2",
                "color": "white",
                "border": "none",
                "borderRadius": "5px",
                "cursor": "pointer",
                "marginTop": "22px",
            }),
        ], style={"flex": "0.5"}),
    ], style={"display": "flex", "padding": "0 20px", "marginBottom": "20px"}),

    html.Div(id="status-message", style={"padding": "0 20px", "marginBottom": "10px"}),

    dcc.Tabs(id="main-tabs", value="lifecycle", children=[
        dcc.Tab(label="🔥 热度时间序列", value="lifecycle", style={"fontSize": "14px"}),
        dcc.Tab(label="📊 阶段分析", value="phase", style={"fontSize": "14px"}),
        dcc.Tab(label="📋 指标对比", value="metrics", style={"fontSize": "14px"}),
    ], style={"margin": "0 20px"}),

    html.Div(id="tab-content", style={"padding": "20px"}),

    dcc.Store(id="analysis-data"),
], style={"fontFamily": "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif"})


@app.callback(
    [Output("analysis-data", "data"),
     Output("status-message", "children")],
    [Input("analyze-btn", "n_clicks")],
    [State("keyword-input", "value"),
     State("days-input", "value"),
     State("platform-select", "value"),
     State("demo-toggle", "value")],
)
def analyze(n_clicks, keywords_str, days, platform, demo_value):
    if n_clicks == 0:
        return None, ""

    if not keywords_str or not keywords_str.strip():
        return None, html.Span("请输入关键词", style={"color": "red"})

    keywords = [kw.strip() for kw in keywords_str.split(",") if kw.strip()]
    use_demo = "demo" in (demo_value or [])
    platform = platform or "xiaohongshu"

    if len(keywords) == 1:
        result = call_api("/crawl", method="POST", data={
            "keyword": keywords[0],
            "use_demo": use_demo,
            "days": days or 90,
            "platform": platform,
        })
        if "error" in result:
            return None, html.Span(f"请求失败: {result['error']}", style={"color": "red"})

        stored = {
            "keywords": keywords,
            "platform": platform,
            "timelines": {keywords[0]: result.get("timeline", {})},
            "lifecycles": {keywords[0]: result.get("lifecycle")},
        }
    else:
        result = call_api("/compare", method="POST", data={
            "keywords": keywords,
            "use_demo": use_demo,
            "days": days or 90,
            "platform": platform,
        })
        if "error" in result:
            return None, html.Span(f"请求失败: {result['error']}", style={"color": "red"})

        timelines = {}
        lifecycles = {}
        results = result.get("results", {})
        for kw in keywords:
            if kw in results:
                timelines[kw] = results[kw].get("timeline", {})
                lifecycles[kw] = results[kw].get("lifecycle")

        stored = {
            "keywords": keywords,
            "platform": platform,
            "timelines": timelines,
            "lifecycles": lifecycles,
        }

    platform_name = "小红书" if platform == "xiaohongshu" else "抖音"
    msg = html.Span(f"✅ 分析完成！平台: {platform_name}, 共分析 {len(keywords)} 个关键词", style={"color": "green"})
    return stored, msg


@app.callback(
    Output("tab-content", "children"),
    [Input("main-tabs", "value"),
     Input("analysis-data", "data")],
)
def render_tab(tab, data):
    if not data:
        return html.Div("请输入关键词并点击「开始分析」", style={"textAlign": "center", "color": "#999", "padding": "50px"})

    keywords = data.get("keywords", [])
    timelines = data.get("timelines", {})
    lifecycles = data.get("lifecycles", {})

    if tab == "lifecycle":
        fig = create_lifecycle_figure(timelines, lifecycles, keywords)
        return dcc.Graph(figure=fig, id="lifecycle-graph")

    elif tab == "phase":
        children = []
        for keyword in keywords:
            tl = timelines.get(keyword, {})
            lc = lifecycles.get(keyword)
            fig = create_phase_figure(tl, lc, keyword)
            children.append(dcc.Graph(figure=fig, id=f"phase-graph-{keyword}"))
        return children

    elif tab == "metrics":
        cards = []
        for keyword in keywords:
            lc = lifecycles.get(keyword)
            cards.append(create_metrics_card(lc, keyword))

        comparison = {}
        for kw in keywords:
            lc = lifecycles.get(kw)
            if lc:
                comparison[kw] = {
                    "peak_day": lc.get("peak_day", 0),
                    "growth_rate": lc.get("growth_rate_at_peak", 0),
                    "decay_rate": lc.get("decay_rate", 0),
                    "r_squared": lc.get("r_squared", 0),
                }

        if len(comparison) > 1:
            fig = go.Figure()
            metrics = ["peak_day", "growth_rate", "decay_rate", "r_squared"]
            metric_labels = ["峰值天数", "增长率", "衰减率", "R²"]

            for idx, (kw, vals) in enumerate(comparison.items()):
                fig.add_trace(go.Bar(
                    name=kw,
                    x=metric_labels,
                    y=[vals.get(m, 0) for m in metrics],
                    marker_color=KEYWORD_COLORS[idx % len(KEYWORD_COLORS)],
                ))

            fig.update_layout(
                title="多关键词指标对比",
                barmode="group",
                template="plotly_white",
                height=400,
            )
            return html.Div([
                html.Div(cards, style={"display": "flex", "flexWrap": "wrap"}),
                dcc.Graph(figure=fig, id="comparison-graph"),
            ])

        return html.Div(cards, style={"display": "flex", "flexWrap": "wrap"})

    return html.Div()


app.config.update(
    suppress_callback_exceptions=True,
    show_undo_redo=False,
)

if __name__ == "__main__":
    import os
    debug_mode = os.environ.get("DASH_DEBUG", "False").lower() == "true"
    app.run(debug=debug_mode, port=8050, host="0.0.0.0")
