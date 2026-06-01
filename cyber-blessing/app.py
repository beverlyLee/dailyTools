import sys
import os
import datetime

import streamlit as st
import pandas as pd
import plotly.graph_objects as go

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.data.app_download import generate_dataset, get_download_peaks
from src.analysis.exam_season import (
    analyze_exam_season_impact,
    analyze_mercury_retrograde_correlation,
    get_exam_calendar,
    get_mercury_retrograde_schedule,
    compute_correlation_matrix,
)
from src.visualization.charts import (
    plot_timeseries_overview,
    plot_correlation_heatmap,
    plot_exam_impact_bar,
    plot_mercury_retrograde_comparison,
    plot_peak_analysis,
    get_summary_statistics,
)

st.set_page_config(
    page_title="赛博祈福数据可视化",
    page_icon="🪷",
    layout="wide",
)

st.markdown("""
<style>
    .main-header {
        font-size: 2rem;
        font-weight: bold;
        color: #2A9D8F;
        margin-bottom: 0.5rem;
    }
    .sub-header {
        font-size: 1rem;
        color: #7F8C8D;
        margin-bottom: 1.5rem;
    }
    .metric-card {
        background: linear-gradient(135deg, #F8F9FA 0%, #FFFFFF 100%);
        border-radius: 12px;
        padding: 16px;
        border: 1px solid #ECF0F1;
        text-align: center;
    }
    .metric-value {
        font-size: 1.6rem;
        font-weight: bold;
        color: #2A9D8F;
    }
    .metric-label {
        font-size: 0.8rem;
        color: #7F8C8D;
        margin-top: 4px;
    }
    .highlight-box {
        background-color: #FFF3CD;
        border-left: 4px solid #FFC107;
        padding: 12px 16px;
        border-radius: 4px;
        margin: 8px 0;
    }
    .retro-highlight {
        background-color: #F5EEF8;
        border-left: 4px solid #9B59B6;
        padding: 12px 16px;
        border-radius: 4px;
        margin: 8px 0;
    }
</style>
""", unsafe_allow_html=True)

st.markdown('<div class="main-header">🪷 赛博祈福数据可视化</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="sub-header">分析"电子木鱼"App 下载量与"转发锦鲤"行为的周期性，'
    '探究其与考试季、求职季等高压节点的相关性</div>',
    unsafe_allow_html=True,
)

df = generate_dataset()
impact_df = analyze_exam_season_impact(df)
corr_data = analyze_mercury_retrograde_correlation(df)
summary = get_summary_statistics()

tab1, tab2, tab3, tab4 = st.tabs([
    "📊 总览仪表板",
    "📈 时序分析",
    "🎯 考试季冲击",
    "🌊 水逆关联分析",
])

with tab1:
    st.subheader("核心指标")

    cols = st.columns(5)
    metrics = [
        ("累计下载量", f'{summary["total_downloads"]:,}', "📱"),
        ("日均下载", f'{summary["avg_daily_downloads"]:,}', "📊"),
        ("峰值下载", f'{summary["peak_download"]:,}', "🔥"),
        ("峰值日期", summary["peak_date"], "📅"),
        ("平均指数", f'{summary["avg_index"]:.2f}', "📈"),
    ]
    for i, (label, value, icon) in enumerate(metrics):
        with cols[i]:
            st.markdown(f"""
            <div class="metric-card">
                <div style="font-size:1.5rem;">{icon}</div>
                <div class="metric-value">{value}</div>
                <div class="metric-label">{label}</div>
            </div>
            """, unsafe_allow_html=True)

    st.markdown("---")
    st.subheader("关键发现")

    col_a, col_b = st.columns(2)

    with col_a:
        st.markdown("""
        <div class="highlight-box">
        <strong>📚 考试季效应显著</strong><br>
        每年 <strong>12 月考研前夕</strong>，"电子木鱼"类 App 下载量出现陡峭峰值，
        下载量可达日常基线的 <strong>5 倍以上</strong>，锦鲤表情包使用频次同步激增。
        </div>
        """, unsafe_allow_html=True)

        st.markdown(f"""
        <div class="highlight-box">
        <strong>💼 求职季次高峰</strong><br>
        国考（11-12月）、省考联考（2-3月）、教师资格证（9月）等节点，
        均观测到显著的祈福行为增长，高/极高影响事件占比达
        <strong>{summary['high_impact_events']}/{summary['exam_event_count']}</strong>。
        </div>
        """, unsafe_allow_html=True)

    with col_b:
        st.markdown(f"""
        <div class="retro-highlight">
        <strong>🌊 水逆关联度极高</strong><br>
        水星逆行期间，赛博祈福综合指数较非水逆期间提升
        <strong>{corr_data['index_lift_ratio']} 倍</strong>，
        下载量与表情包使用均呈现高度正相关，
        相关系数分析确认"水逆效应"为核心驱动力之一。
        </div>
        """, unsafe_allow_html=True)

        st.markdown(f"""
        <div class="retro-highlight">
        <strong>📊 数据详情</strong><br>
        水逆期间日均下载: <strong>{corr_data['avg_download_retrograde']:,.0f}</strong>
        vs 非水逆: <strong>{corr_data['avg_download_normal']:,.0f}</strong><br>
        表情包使用: <strong>{corr_data['avg_meme_retrograde']:,.0f}</strong>
        vs <strong>{corr_data['avg_meme_normal']:,.0f}</strong>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("---")
    st.subheader("赛博迷信综合指数趋势")

    fig_overview = plot_timeseries_overview(df)
    st.plotly_chart(fig_overview, width="stretch", key="overview_timeseries")

with tab2:
    st.subheader("时序趋势分析")

    date_range = st.date_input(
        "选择日期范围",
        value=(datetime.date(2023, 1, 1), datetime.date(2026, 6, 30)),
        min_value=datetime.date(2023, 1, 1),
        max_value=datetime.date(2026, 6, 30),
        key="timeseries_date_range",
    )

    if len(date_range) == 2:
        mask = (df["date"].dt.date >= date_range[0]) & (df["date"].dt.date <= date_range[1])
        df_filtered = df[mask].copy()
    else:
        df_filtered = df.copy()

    show_downloads = st.checkbox("显示下载量", value=True, key="show_downloads")
    show_meme = st.checkbox("显示表情包使用", value=True, key="show_meme")
    show_index = st.checkbox("显示综合指数", value=True, key="show_index")

    fig_ts = plot_timeseries_overview(df_filtered, show_downloads, show_meme, show_index)
    st.plotly_chart(fig_ts, width="stretch", key="timeseries_analysis")

    st.markdown("---")
    st.subheader("峰值分析")

    threshold = st.slider("峰值阈值（相对均值倍数）", 0.5, 1.0, 0.75, 0.05, key="peak_threshold")
    peaks = get_download_peaks(df, threshold=threshold)

    fig_peaks = plot_peak_analysis(peaks, df_filtered)
    st.plotly_chart(fig_peaks, width="stretch", key="peak_analysis")

    st.markdown("---")
    st.subheader("峰值事件列表")
    st.dataframe(
        peaks[["date", "download_count", "meme_usage", "cyber_blessing_index", "peak_type"]]
        .sort_values("download_count", ascending=False)
        .head(50)
        .rename(columns={
            "date": "日期",
            "download_count": "日下载量",
            "meme_usage": "表情包使用频次",
            "cyber_blessing_index": "赛博迷信综合指数",
            "peak_type": "事件类型",
        }),
        width="stretch",
        key="peaks_dataframe",
    )

with tab3:
    st.subheader("考试/求职季冲击分析")

    fig_impact = plot_exam_impact_bar(impact_df)
    st.plotly_chart(fig_impact, width="stretch", key="exam_impact_bar")

    st.markdown("---")
    st.subheader("详细冲击数据")
    st.dataframe(
        impact_df.rename(columns={
            "event_name": "考试事件",
            "event_date": "考试日期",
            "avg_download_30d_before": "考前30天日均下载",
            "avg_download_baseline": "基线日均下载",
            "download_surge_ratio": "下载量激增倍数",
            "peak_download_ratio": "峰值下载倍数",
            "meme_surge_ratio": "表情包激增倍数",
            "index_surge_ratio": "综合指数激增倍数",
            "impact_level": "影响等级",
        }),
        width="stretch",
        key="impact_dataframe",
    )

    st.markdown("---")
    st.subheader("考试日历")

    exam_cal = get_exam_calendar()
    for month, events in sorted(exam_cal.items()):
        with st.expander(f"📅 {month}", key=f"exam_cal_{month}"):
            for event in events:
                st.markdown(
                    f"- **{event['name']}** — {event['date']} "
                    f"(峰值强度: {event['peak_strength']})"
                )

with tab4:
    st.subheader("水星逆行关联分析")

    fig_compare = plot_mercury_retrograde_comparison(corr_data)
    st.plotly_chart(fig_compare, width="stretch", key="mercury_retrograde_comparison")

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("下载量提升倍数", f'{corr_data["download_lift_ratio"]}x')
    with col2:
        st.metric("表情包提升倍数", f'{corr_data["meme_lift_ratio"]}x')
    with col3:
        st.metric("综合指数提升倍数", f'{corr_data["index_lift_ratio"]}x')

    st.markdown("---")
    st.subheader("变量相关性热力图")

    corr_matrix = compute_correlation_matrix(df)
    fig_heat = plot_correlation_heatmap(corr_matrix)
    st.plotly_chart(fig_heat, width="stretch", key="correlation_heatmap")

    st.markdown("---")
    st.subheader("2023-2026 水星逆行时间表")

    schedule = get_mercury_retrograde_schedule()
    schedule_df = pd.DataFrame(schedule).rename(columns={
        "start": "开始日期",
        "end": "结束日期",
        "label": "水逆星座",
    })
    st.dataframe(schedule_df, width="stretch", key="schedule_dataframe")

st.markdown("---")
st.caption(
    "数据源: App Store 下载榜模拟数据 + 社交媒体表情包使用频率模拟数据 | "
    "赛博祈福数据可视化工具 v1.0"
)