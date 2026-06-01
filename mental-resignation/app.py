import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots

try:
    import requests
except ImportError:
    st.error("请先安装 requests 库: pip install requests")
    st.stop()

st.set_page_config(
    page_title="职场精神离职分析仪表板",
    page_icon="😮‍💨",
    layout="wide",
    initial_sidebar_state="expanded",
)

API_BASE = os.environ.get("API_BASE", "http://localhost:5001")
API_TIMEOUT = 5


def _safe_request(url, description, fallback=None):
    try:
        resp = requests.get(url, timeout=API_TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.ConnectionError:
        st.warning(
            f"⚠️ 无法连接后端 API ({url})。"
            f"请确保 Flask 服务已启动 (`python src/api/server.py`)。"
            f"当前使用内置降级数据。"
        )
        return fallback
    except requests.exceptions.Timeout:
        st.warning(f"⚠️ 请求超时: {description}")
        return fallback
    except requests.exceptions.RequestException as e:
        st.warning(f"⚠️ API 请求失败 ({description}): {e}")
        return fallback


@st.cache_data(ttl=60, show_spinner=False)
def _fetch_overall_index():
    return _safe_request(
        f"{API_BASE}/api/overall-index",
        "整体指数",
        fallback={},
    )


@st.cache_data(ttl=60, show_spinner=False)
def _fetch_industry_index():
    resp = _safe_request(
        f"{API_BASE}/api/industry-index",
        "行业指数",
        fallback={},
    )
    return resp.get("data", [])


@st.cache_data(ttl=60, show_spinner=False)
def _fetch_city_index():
    resp = _safe_request(
        f"{API_BASE}/api/city-index",
        "城市指数",
        fallback={},
    )
    return resp.get("data", [])


@st.cache_data(ttl=60, show_spinner=False)
def _fetch_keyword_frequency():
    resp = _safe_request(
        f"{API_BASE}/api/keyword-frequency",
        "关键词频率",
        fallback={},
    )
    return resp.get("data", {})


@st.cache_data(ttl=60, show_spinner=False)
def _fetch_full_analysis():
    return _safe_request(
        f"{API_BASE}/api/full-analysis",
        "综合分析",
        fallback={},
    )


@st.cache_data(ttl=60, show_spinner=False)
def _fetch_time_heatmap():
    return _safe_request(
        f"{API_BASE}/api/time-heatmap",
        "时段热力图",
        fallback={},
    )


@st.cache_data(ttl=60, show_spinner=False)
def _fetch_mouyu_ranking():
    resp = _safe_request(
        f"{API_BASE}/api/mouyu-ranking",
        "摸鱼技巧排行",
        fallback={},
    )
    return resp.get("data", [])


@st.cache_data(ttl=60, show_spinner=False)
def _fetch_contexts(keyword, window=20):
    resp = _safe_request(
        f"{API_BASE}/api/contexts?keyword={keyword}&window={window}",
        f"关键词上下文: {keyword}",
        fallback={},
    )
    return resp.get("data", [])


@st.cache_data(ttl=60, show_spinner=False)
def _fetch_time_distribution():
    resp = _safe_request(
        f"{API_BASE}/api/time-distribution",
        "时段分布",
        fallback={},
    )
    return resp.get("data", {})


@st.cache_data(ttl=60, show_spinner=False)
def _fetch_weekday_distribution():
    resp = _safe_request(
        f"{API_BASE}/api/weekday-distribution",
        "星期分布",
        fallback={},
    )
    return resp.get("data", {})


@st.cache_data(ttl=60, show_spinner=False)
def _fetch_time_heat_data():
    resp = _safe_request(
        f"{API_BASE}/api/time-heat-data",
        "时间热度数据",
        fallback={},
    )
    return resp.get("data", {})


def _generate_time_heat_fallback():
    weekdays_order = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    slots = [
        "09:00-10:00", "10:00-11:00", "11:00-12:00",
        "12:00-13:00", "13:00-14:00", "14:00-15:00",
        "15:00-16:00", "16:00-17:00", "17:00-18:00",
        "18:00-19:00", "19:00-20:00", "20:00-21:00",
    ]
    import random
    rng = random.Random(42)
    result = {}
    for wd in weekdays_order:
        vals = []
        for slot in slots:
            hour = int(slot.split("-")[0].split(":")[0])
            if 9 <= hour < 12:
                v = rng.uniform(30, 60)
            elif 12 <= hour < 14:
                v = rng.uniform(80, 120)
            elif 14 <= hour < 15:
                v = rng.uniform(40, 70)
            elif 15 <= hour < 17:
                v = rng.uniform(130, 180) if wd == "周五" else rng.uniform(70, 110)
            elif 17 <= hour < 19:
                v = rng.uniform(60, 100)
            else:
                v = rng.uniform(10, 40)
            vals.append(round(v, 1))
        result[wd] = vals
    return result


def check_api_health():
    try:
        resp = requests.get(f"{API_BASE}/api/health", timeout=3)
        return resp.status_code == 200 and resp.json().get("status") == "ok"
    except Exception:
        return False


api_healthy = check_api_health()

st.title("😮‍💨 职场精神离职分析仪表板")

if api_healthy:
    st.success("✅ 后端 API 连接正常")
else:
    st.warning(
        "⚠️ 后端 API 未连接。请启动后端服务: `python src/api/server.py`。"
        "当前使用降级数据展示。"
    )

st.markdown("---")

with st.sidebar:
    st.header("⚙️ 控制面板")

    st.markdown("### 📡 API 状态")
    health_color = "🟢" if api_healthy else "🔴"
    st.markdown(f"{health_color} 后端: **{'已连接' if api_healthy else '未连接'}**")
    st.markdown(f"`{API_BASE}`")

    st.markdown("---")
    st.markdown("### 📊 可视化设置")
    chart_type = st.selectbox(
        "主图表类型",
        ["柱状图", "瀑布图", "热力图"],
        index=0,
    )
    st.markdown("---")
    if st.button("🔄 刷新数据"):
        st.cache_data.clear()
        st.rerun()

overall = _fetch_overall_index()
industry_idx = _fetch_industry_index()
city_idx = _fetch_city_index()
kw_freq = _fetch_keyword_frequency()
full_analysis = _fetch_full_analysis()
time_heatmap = _fetch_time_heatmap()
mouyu_ranking = _fetch_mouyu_ranking()
time_dist = _fetch_time_distribution()
weekday_dist = _fetch_weekday_distribution()
time_heat_api = _fetch_time_heat_data()

time_heat = time_heat_api if time_heat_api else _generate_time_heat_fallback()

if not overall and not industry_idx:
    st.warning(
        "无法获取数据。请确保后端 Flask 服务已运行在端口 5001。"
        "\n\n启动命令:\n"
        "```bash\n"
        "cd /Users/liboyang/trae/dailyTools/mental-resignation\n"
        "python src/api/server.py\n"
        "```"
    )
    st.stop()

total_posts = full_analysis.get("total_posts", 500)

col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric(
        "📊 整体精神离职指数",
        f"{overall.get('overall_resignation_index', 0)}",
        delta="全国基准线: 50",
    )

with col2:
    st.metric(
        "🔥 高风险行业",
        industry_idx[0]["industry"] if industry_idx else "N/A",
        delta=f"指数: {industry_idx[0]['resignation_index']}" if industry_idx else "",
    )

with col3:
    st.metric(
        "🏙️ 高风险城市",
        city_idx[0]["city"] if city_idx else "N/A",
        delta=f"指数: {city_idx[0]['resignation_index']}" if city_idx else "",
    )

with col4:
    top_peak = full_analysis.get("peak_hours", [{}])
    peak_info = top_peak[0] if top_peak else {}
    st.metric(
        "⏰ 摸鱼峰值时段",
        peak_info.get("time_slot", "N/A"),
        delta=f"热度: {peak_info.get('count', 0)}",
    )

st.markdown("---")

tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "📈 摸鱼时段热度分析",
    "🏭 行业精神离职指数",
    "🏙️ 城市精神离职指数",
    "🎣 摸鱼技巧排行榜",
    "🔍 关键词上下文挖掘",
])

with tab1:
    st.subheader("一天中不同时段的「摸鱼」讨论热度")

    weekdays_order = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    slots = [
        "09:00-10:00", "10:00-11:00", "11:00-12:00",
        "12:00-13:00", "13:00-14:00", "14:00-15:00",
        "15:00-16:00", "16:00-17:00", "17:00-18:00",
        "18:00-19:00", "19:00-20:00", "20:00-21:00",
    ]

    if chart_type == "柱状图":
        df_heat = pd.DataFrame(time_heat)
        df_heat["时段"] = slots
        df_melted = df_heat.melt(id_vars=["时段"], var_name="星期", value_name="热度")

        fig = px.bar(
            df_melted,
            x="时段",
            y="热度",
            color="星期",
            barmode="group",
            title="📊 各时段摸鱼讨论热度对比",
            color_discrete_sequence=px.colors.qualitative.Set3,
        )
        fig.update_layout(height=550)
        st.plotly_chart(fig, width="stretch")

        st.markdown("### 📊 单日详情")
        selected_day = st.selectbox(
            "选择星期查看当日热度",
            weekdays_order,
            index=4,
            key="bar_day_select",
        )
        values = time_heat.get(selected_day, [0] * len(slots))
        peak_idx = values.index(max(values))
        st.info(
            f"🔥 {selected_day} 峰值时段: **{slots[peak_idx]}** "
            f"(热度: {values[peak_idx]:.0f})"
            + (" - 午休及下班前摸鱼需求最强烈" if peak_idx in [3, 6, 7] else "")
        )

    elif chart_type == "瀑布图":
        selected_day = st.selectbox(
            "选择星期查看瀑布图",
            weekdays_order,
            index=4,
        )
        values = time_heat.get(selected_day, [0] * len(slots))

        deltas = [values[0]]
        for i in range(1, len(values)):
            deltas.append(values[i] - values[i - 1])

        fig = go.Figure(go.Waterfall(
            name="摸鱼热度增量",
            orientation="v",
            measure=["absolute"] + ["relative"] * (len(slots) - 1),
            x=slots,
            y=deltas,
            text=[f"{v:+.0f}" if i > 0 else f"{v:.0f}" for i, v in enumerate(deltas)],
            textposition="outside",
            connector={"line": {"color": "#888", "width": 1}},
            increasing={"marker": {"color": "#FF6B6B"}},
            decreasing={"marker": {"color": "#4ECDC4"}},
            totals={"marker": {"color": "#FFE66D"}},
        ))
        fig.update_layout(
            title=f"📊 {selected_day} 摸鱼讨论热度变化瀑布图（时段间增量）",
            xaxis_title="时段",
            yaxis_title="热度增量",
            height=500,
            showlegend=False,
        )
        st.plotly_chart(fig, width="stretch")

        st.markdown(f"**{selected_day} 热度变化分析:**")
        abs_values = values
        peak_idx = abs_values.index(max(abs_values))
        st.info(
            f"🔥 峰值时段: **{slots[peak_idx]}** (绝对热度: {abs_values[peak_idx]:.0f})"
            + (" - 午休及下班前摸鱼需求最强烈" if peak_idx in [3, 6, 7] else "")
        )

    else:
        matrix = time_heatmap.get("heatmap_matrix", [])
        weekdays_hm = time_heatmap.get("weekdays", weekdays_order)
        slots_hm = time_heatmap.get("time_slots", [s[:5] for s in slots])

        if matrix:
            df_hm = pd.DataFrame(matrix, index=weekdays_hm, columns=slots_hm)
            fig = px.imshow(
                df_hm,
                labels=dict(x="时段", y="星期", color="热度"),
                x=slots_hm,
                y=weekdays_hm,
                title="🔥 摸鱼热度热力图（星期 × 时段）",
                color_continuous_scale="YlOrRd",
                aspect="auto",
            )
            fig.update_layout(height=500)
            st.plotly_chart(fig, width="stretch")
        else:
            st.info("热力图数据暂不可用")

    st.markdown("### 💡 洞察")
    st.markdown("""
    - **午休时段（12:00-14:00）**：摸鱼讨论热度明显上升，是全天第一个高峰
    - **周五下午（15:00-17:00）**：讨论热度达到峰值，"精神已下班"效应显著
    - **工作日 vs 周末**：工作日热度远高于周末，说明"摸鱼"是典型的职场现象
    """)

with tab2:
    st.subheader("各行业精神离职指数排名")

    if industry_idx:
        df_ind = pd.DataFrame(industry_idx)

        risk_colors = {"高": "#FF4757", "中": "#FFA502", "低": "#2ED573"}
        df_ind["color"] = df_ind["risk_level"].map(risk_colors)

        fig = go.Figure()
        fig.add_trace(go.Bar(
            x=df_ind["resignation_index"],
            y=df_ind["industry"],
            orientation="h",
            marker_color=df_ind["color"],
            text=df_ind["resignation_index"],
            textposition="outside",
            name="精神离职指数",
        ))
        fig.add_vline(x=75, line_dash="dash", line_color="red", annotation_text="高风险线")
        fig.add_vline(x=55, line_dash="dash", line_color="orange", annotation_text="中风险线")
        fig.update_layout(
            title="🏭 行业精神离职指数排行榜",
            xaxis_title="精神离职指数",
            yaxis_title="",
            height=500,
            yaxis={"autorange": "reversed"},
        )
        st.plotly_chart(fig, width="stretch")

        col_a, col_b = st.columns(2)
        with col_a:
            st.markdown("#### 📋 详细数据")
            display_cols = [c for c in [
                "industry", "resignation_index", "risk_level",
                "post_count", "turnover_risk"
            ] if c in df_ind.columns]
            st.dataframe(
                df_ind[display_cols],
                column_config={
                    "industry": "行业",
                    "resignation_index": "精神离职指数",
                    "risk_level": "风险等级",
                    "post_count": "样本数",
                    "turnover_risk": "流失风险评估",
                },
                hide_index=True,
                height=400,
            )
        with col_b:
            st.markdown("#### 🔍 行业分析洞察")
            if len(industry_idx) >= 2:
                top1, top2 = industry_idx[0], industry_idx[1]
                st.warning(
                    f"⚠️ **{top1['industry']}** 和 **{top2['industry']}** 行业"
                    f"精神离职指数最高（分别为 {top1['resignation_index']} 和 {top2['resignation_index']}），"
                    f"人员流失风险评估为「{top1.get('turnover_risk', 'N/A')}」。"
                )
            st.markdown("""
            **关键发现：**
            - IT互联网行业因996文化、内卷严重，精神离职倾向最高
            - 广告营销行业因乙方地位、改方案频繁，紧随其后
            - 传统制造业相对稳定，但也需关注倒班制度对员工心态的影响
            """)
    else:
        st.info("行业指数数据暂不可用")

with tab3:
    st.subheader("各城市精神离职指数排名")

    if city_idx:
        df_city = pd.DataFrame(city_idx)

        fig = px.bar(
            df_city,
            x="city",
            y="resignation_index",
            color="resignation_index",
            color_continuous_scale="Reds",
            title="🏙️ 城市精神离职指数分布",
            text="resignation_index",
        )
        fig.update_layout(
            xaxis_title="城市",
            yaxis_title="精神离职指数",
            height=450,
        )
        st.plotly_chart(fig, width="stretch")

        col_a, col_b = st.columns(2)
        with col_a:
            st.markdown("#### 📋 城市数据")
            display_cols = [c for c in [
                "city", "resignation_index", "post_count",
                "negative_ratio", "avg_engagement"
            ] if c in df_city.columns]
            st.dataframe(
                df_city[display_cols],
                column_config={
                    "city": "城市",
                    "resignation_index": "精神离职指数",
                    "post_count": "样本数",
                    "negative_ratio": "负面情绪比例",
                    "avg_engagement": "平均互动量",
                },
                hide_index=True,
                height=350,
            )
        with col_b:
            st.markdown("#### 🗺️ 城市分析洞察")
            st.markdown("""
            **城市分布特点：**
            - 深圳因互联网公司密集、加班文化盛行，精神离职倾向最突出
            - 北京、上海紧随其后，高强度工作节奏是主要推手
            - 新一线城市（杭州、成都）正在追赶，行业聚集效应明显
            - 通勤时间与精神离职指数呈正相关
            """)
    else:
        st.info("城市指数数据暂不可用")

with tab4:
    st.subheader("🎣 高频摸鱼技巧排行榜")

    if mouyu_ranking:
        df_mouyu = pd.DataFrame(mouyu_ranking)

        def _efficiency_tier(score):
            if score >= 0.75:
                return "高效"
            elif score >= 0.5:
                return "中效"
            else:
                return "低效"

        TIER_COLORS = {
            "高效": "#2ED573",
            "中效": "#FFA502",
            "低效": "#FF4757",
        }

        df_mouyu["tier"] = df_mouyu["efficiency_score"].apply(_efficiency_tier)
        df_mouyu["color"] = df_mouyu["tier"].map(TIER_COLORS)

        fig = go.Figure()
        fig.add_trace(go.Bar(
            x=df_mouyu["technique"],
            y=df_mouyu["frequency"],
            marker_color=df_mouyu["color"],
            text=df_mouyu["frequency"],
            textposition="outside",
            hovertemplate=(
                "<b>%{x}</b><br>"
                "使用频次: %{y}<br>"
                "效率评分: %{customdata[0]:.0%}<br>"
                "效率等级: %{customdata[1]}<br>"
                "高发行业: %{customdata[2]}<extra></extra>"
            ),
            customdata=df_mouyu[["efficiency_score", "tier", "industry_bias"]].values,
        ))
        fig.update_layout(
            title="🎣 摸鱼技巧使用频率（颜色按效率评分分档）",
            xaxis_title="摸鱼技巧",
            yaxis_title="使用频次",
            height=500,
            xaxis={"tickangle": -30},
            showlegend=False,
        )

        from plotly.graph_objects import Figure
        for tier, color in TIER_COLORS.items():
            label = "高效 (≥75%)" if tier == "高效" else ("中效 (50%-75%)" if tier == "中效" else "低效 (<50%)")
            fig.add_trace(go.Scatter(
                x=[None], y=[None], mode="markers",
                marker=dict(size=14, color=color),
                showlegend=True, name=label,
            ))
        fig.update_layout(
            legend=dict(
                orientation="h",
                yanchor="bottom",
                y=-0.25,
                xanchor="right",
                x=1,
            ),
        )
        st.plotly_chart(fig, width="stretch")

        st.markdown("#### 🎯 效率-频次散点图")
        fig_scatter = px.scatter(
            df_mouyu,
            x="frequency",
            y="efficiency_score",
            size="frequency",
            color="efficiency_score",
            color_continuous_scale="RdYlGn",
            range_color=[0.3, 0.95],
            text="technique",
            title="效率 vs 频次四象限分析",
            size_max=60,
            hover_data={
                "technique": True,
                "frequency": True,
                "efficiency_score": ":,.0%",
            },
        )
        fig_scatter.update_layout(
            height=450,
            xaxis_title="使用频次",
            yaxis_title="效率评分",
            yaxis={"tickformat": ".0%", "range": [0.2, 1.0]},
            showlegend=False,
        )
        fig_scatter.add_hline(
            y=0.6,
            line_dash="dash",
            line_color="gray",
            annotation_text="高效阈值",
        )
        fig_scatter.add_vline(
            x=df_mouyu["frequency"].median(),
            line_dash="dash",
            line_color="gray",
            annotation_text="高频阈值",
        )
        st.plotly_chart(fig_scatter, width="stretch")

        st.markdown("#### 📊 技巧详情")
        for i, item in enumerate(mouyu_ranking[:5]):
            efficiency_bar = "🟢" if item["efficiency_score"] >= 0.8 else "🟡" if item["efficiency_score"] >= 0.5 else "🔴"
            st.markdown(
                f"**{i+1}. {item['technique']}** "
                f"{efficiency_bar} 效率: {item['efficiency_score']:.0%} | "
                f"📊 频次: {item['frequency']} | "
                f"🏢 高发行业: {item['industry_bias']}"
            )
    else:
        st.info("摸鱼技巧数据暂不可用")

with tab5:
    st.subheader("🔍 关键词上下文挖掘")

    if kw_freq:
        col_a, col_b = st.columns([1, 2])
        with col_a:
            kw_list = list(kw_freq.keys())[:20]
            selected_kw = st.selectbox("选择关键词", kw_list, index=0)
            window_size = st.slider("上下文窗口大小（字符）", 10, 50, 20)

        contexts = _fetch_contexts(selected_kw, window_size)

        with col_b:
            st.markdown(f"**关键词「{selected_kw}」出现频次: {kw_freq.get(selected_kw, 0)}**")
            st.markdown(f"**找到 {len(contexts)} 条相关上下文，展示前30条**")

        if contexts:
            for ctx in contexts[:30]:
                content = ctx.get("context", "")
                highlighted = content.replace(selected_kw, f"**{selected_kw}**")
                with st.expander(
                    f"📱 [{ctx.get('platform', '')}] {ctx.get('industry', '')} - "
                    f"{ctx.get('city', '')} | {ctx.get('timestamp', '')[:16]}"
                ):
                    st.markdown(f"> ...{highlighted}...")
        else:
            st.info("未找到相关上下文，请尝试其他关键词")
    else:
        st.info("关键词数据暂不可用")

st.markdown("---")
st.markdown("### 📊 整体市场态势")

if overall:
    st.markdown(f"""
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 30px; border-radius: 12px; color: white;">
        <h2 style="margin: 0;">{overall.get('market_status', 'N/A')}</h2>
        <p style="font-size: 18px; margin: 10px 0;">
            整体精神离职指数: <strong>{overall.get('overall_resignation_index', 0)}</strong>
        </p>
        <p style="margin: 5px 0;">💡 {overall.get('recommendation', '')}</p>
    </div>
    """, unsafe_allow_html=True)
else:
    st.info("整体指数数据暂不可用")

st.markdown("---")
st.caption(
    "📡 数据源: 脉脉/小红书职场话题 | "
    "🛠️ 技术栈: Python + Flask + Streamlit | "
    "⚠️ 本仪表板数据为模拟数据，仅用于演示分析方法论"
)
