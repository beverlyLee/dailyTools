import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

from src.data.app_download import (
    generate_dataset,
    get_download_peaks,
    EXAM_EVENTS,
    MERCURY_RETROGRADE_PERIODS_2023_2026,
)
from src.analysis.exam_season import (
    analyze_exam_season_impact,
    analyze_mercury_retrograde_correlation,
    get_exam_calendar,
    get_mercury_retrograde_schedule,
    compute_correlation_matrix,
)

COLORS = {
    "download": "#E63946",
    "meme": "#F4A261",
    "index": "#2A9D8F",
    "retrograde": "#9B59B6",
    "exam": "#E74C3C",
    "grid": "#ECF0F1",
}


def _add_retrograde_shades(fig, dates, y_range, row=1, col=1):
    for start, end, label in MERCURY_RETROGRADE_PERIODS_2023_2026:
        start_ts = pd.Timestamp(start)
        end_ts = pd.Timestamp(end)
        if start_ts >= dates.min() and end_ts <= dates.max():
            fig.add_vrect(
                x0=start, x1=end,
                fillcolor=COLORS["retrograde"], opacity=0.08,
                layer="below", line_width=0,
                row=row, col=col,
            )


def _add_exam_markers(fig, dates, y_max, row=1, col=1):
    for event in EXAM_EVENTS:
        event_date = pd.Timestamp(event["date"])
        if dates.min() <= event_date <= dates.max():
            fig.add_vline(
                x=event_date, line_dash="dash",
                line_color=COLORS["exam"], line_width=1.2, opacity=0.6,
                row=row, col=col,
            )


def plot_timeseries_overview(df=None, show_downloads=True, show_meme=True, show_index=True):
    if df is None:
        df = generate_dataset()

    fig = make_subplots(
        rows=3, cols=1, shared_xaxes=True,
        vertical_spacing=0.04,
        row_heights=[0.4, 0.3, 0.3],
        subplot_titles=("电子木鱼类 App 下载量", "锦鲤表情包使用频率", "赛博迷信综合指数"),
    )

    if show_downloads:
        fig.add_trace(
            go.Scatter(
                x=df["date"], y=df["download_count"],
                mode="lines", name="日下载量",
                line=dict(color=COLORS["download"], width=1.2),
                hovertemplate="%{x|%Y-%m-%d}<br>下载量: %{y:,}",
            ),
            row=1, col=1,
        )

    if show_meme:
        fig.add_trace(
            go.Scatter(
                x=df["date"], y=df["meme_usage"],
                mode="lines", name="表情包使用",
                line=dict(color=COLORS["meme"], width=1.2),
                hovertemplate="%{x|%Y-%m-%d}<br>使用频次: %{y:,}",
            ),
            row=2, col=1,
        )

    if show_index:
        fig.add_trace(
            go.Scatter(
                x=df["date"], y=df["cyber_blessing_index"],
                mode="lines", name="综合指数",
                line=dict(color=COLORS["index"], width=1.5),
                fill="tozeroy",
                fillcolor="rgba(42, 157, 143, 0.1)",
                hovertemplate="%{x|%Y-%m-%d}<br>指数: %{y:.2f}",
            ),
            row=3, col=1,
        )

    for r in range(1, 4):
        _add_retrograde_shades(fig, df["date"], None, row=r, col=1)

    _add_exam_markers(fig, df["date"], None, row=1, col=1)

    fig.update_layout(
        height=720,
        showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        hovermode="x unified",
        plot_bgcolor="white",
        paper_bgcolor="white",
        font=dict(family="PingFang SC, Arial, sans-serif", size=11),
    )
    fig.update_xaxes(gridcolor=COLORS["grid"], gridwidth=0.5)
    fig.update_yaxes(gridcolor=COLORS["grid"], gridwidth=0.5)
    return fig


def plot_correlation_heatmap(corr_matrix):
    BEHAVIOR_VARS = ["download_count", "meme_usage", "cyber_blessing_index"]
    PERIOD_VARS = ["is_retrograde", "is_exam_month"]
    BEHAVIOR_CN = {
        "download_count": "日下载量",
        "meme_usage": "表情包使用",
        "cyber_blessing_index": "赛博迷信综合指数",
    }
    PERIOD_CN = {
        "is_retrograde": "是否水逆",
        "is_exam_month": "是否考试月",
    }

    sub = corr_matrix.loc[BEHAVIOR_VARS, PERIOD_VARS]
    y_labels = [BEHAVIOR_CN[v] for v in BEHAVIOR_VARS]
    x_labels = [PERIOD_CN[v] for v in PERIOD_VARS]

    fig = go.Figure(
        data=go.Heatmap(
            z=sub.values,
            x=x_labels,
            y=y_labels,
            colorscale="RdBu",
            zmin=-1, zmax=1,
            text=sub.round(3).values,
            texttemplate="%{text}",
            textfont={"size": 13},
            hovertemplate="%{y} vs %{x}<br>相关系数: %{z:.3f}<extra></extra>",
        )
    )
    fig.update_layout(
        title="行为指标 × 时间节点 相关性热力图",
        height=380,
        plot_bgcolor="white",
        font=dict(family="PingFang SC, Arial, sans-serif", size=12),
    )
    return fig


def plot_exam_impact_bar(impact_df):
    fig = go.Figure()

    fig.add_trace(go.Bar(
        x=impact_df["event_name"] + " (" + impact_df["event_date"] + ")",
        y=impact_df["download_surge_ratio"],
        name="下载量激增倍数",
        marker_color=COLORS["download"],
        hovertemplate="%{x}<br>下载量激增: %{y:.2f}x",
    ))

    fig.add_trace(go.Bar(
        x=impact_df["event_name"] + " (" + impact_df["event_date"] + ")",
        y=impact_df["meme_surge_ratio"],
        name="表情包使用激增倍数",
        marker_color=COLORS["meme"],
        hovertemplate="%{x}<br>表情包激增: %{y:.2f}x",
    ))

    fig.add_trace(go.Bar(
        x=impact_df["event_name"] + " (" + impact_df["event_date"] + ")",
        y=impact_df["index_surge_ratio"],
        name="综合指数激增倍数",
        marker_color=COLORS["index"],
        hovertemplate="%{x}<br>指数激增: %{y:.2f}x",
    ))

    fig.add_hline(y=1.0, line_dash="dash", line_color="gray", line_width=1,
                  annotation_text="基线水平")

    fig.update_layout(
        title="考试/求职季对赛博祈福行为的冲击倍数",
        barmode="group",
        height=480,
        xaxis_tickangle=-30,
        plot_bgcolor="white",
        font=dict(family="PingFang SC, Arial, sans-serif", size=11),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    )
    fig.update_yaxes(title_text="相对基线倍数", gridcolor=COLORS["grid"])
    return fig


def plot_mercury_retrograde_comparison(corr_data):
    categories = ["下载量", "表情包使用", "综合指数"]
    retro_values = [
        corr_data["avg_download_retrograde"],
        corr_data["avg_meme_retrograde"],
        corr_data["avg_index_retrograde"],
    ]
    normal_values = [
        corr_data["avg_download_normal"],
        corr_data["avg_meme_normal"],
        corr_data["avg_index_normal"],
    ]

    fig = go.Figure()

    fig.add_trace(go.Bar(
        name="水逆期间",
        x=categories,
        y=retro_values,
        marker_color=COLORS["retrograde"],
        hovertemplate="%{x}<br>水逆期间均值: %{y:,.1f}",
    ))

    fig.add_trace(go.Bar(
        name="非水逆期间",
        x=categories,
        y=normal_values,
        marker_color="#95A5A6",
        hovertemplate="%{x}<br>非水逆期间均值: %{y:,.1f}",
    ))

    fig.update_layout(
        title="水逆 vs 非水逆期间赛博祈福行为对比",
        barmode="group",
        height=420,
        plot_bgcolor="white",
        font=dict(family="PingFang SC, Arial, sans-serif", size=11),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    )
    fig.update_yaxes(title_text="均值", gridcolor=COLORS["grid"])
    return fig


def plot_peak_analysis(peaks_df, df):
    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=df["date"], y=df["download_count"],
        mode="lines", name="日下载量",
        line=dict(color=COLORS["download"], width=1),
        hovertemplate="%{x|%Y-%m-%d}<br>%{y:,}",
    ))

    peak_types = peaks_df["peak_type"].unique()
    color_map = {
        "常规波动": "#7F8C8D",
    }
    exam_colors = ["#E74C3C", "#C0392B", "#D35400"]
    retro_color = "#9B59B6"

    for i, ptype in enumerate(peak_types):
        if "考试" in ptype or "考研" in ptype or "公务员" in ptype or "教师" in ptype or "四六级" in ptype:
            c = exam_colors[i % len(exam_colors)]
        elif "水星" in ptype or "水逆" in ptype:
            c = retro_color
        else:
            c = color_map.get(ptype, "#3498DB")
        color_map[ptype] = c

        subset = peaks_df[peaks_df["peak_type"] == ptype]
        fig.add_trace(go.Scatter(
            x=subset["date"], y=subset["download_count"],
            mode="markers", name=ptype,
            marker=dict(size=8, color=c, line=dict(width=1, color="white")),
            hovertemplate="%{x|%Y-%m-%d}<br>%{y:,}<br>" + ptype,
        ))

    fig.update_layout(
        title="下载峰值分析（按事件类型分类）",
        height=460,
        plot_bgcolor="white",
        font=dict(family="PingFang SC, Arial, sans-serif", size=11),
        hovermode="x unified",
    )
    fig.update_xaxes(gridcolor=COLORS["grid"])
    fig.update_yaxes(title_text="日下载量", gridcolor=COLORS["grid"])
    return fig


def get_summary_statistics():
    df = generate_dataset()
    impact_df = analyze_exam_season_impact(df)
    corr_data = analyze_mercury_retrograde_correlation(df)

    return {
        "total_downloads": int(df["download_count"].sum()),
        "avg_daily_downloads": int(df["download_count"].mean()),
        "peak_download": int(df["download_count"].max()),
        "peak_date": df.loc[df["download_count"].idxmax(), "date"].strftime("%Y-%m-%d"),
        "avg_index": round(df["cyber_blessing_index"].mean(), 2),
        "max_index": round(df["cyber_blessing_index"].max(), 2),
        "download_lift": corr_data["download_lift_ratio"],
        "meme_lift": corr_data["meme_lift_ratio"],
        "index_lift": corr_data["index_lift_ratio"],
        "exam_event_count": len(impact_df),
        "high_impact_events": len(impact_df[impact_df["impact_level"].isin(["极高", "高"])]),
    }