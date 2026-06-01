"""
AQI 历史数据探索主应用
基于Streamlit的交互式数据分析界面
"""
import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from datetime import datetime, timedelta
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.data_sources.cnemc_api import CNEMCApiClient
from src.processing.pollutant_decomposer import PollutantDecomposer
from src.ai.attribution_assistant import AIAnalysisAssistant

st.set_page_config(
    page_title="AQI历史数据探索器",
    page_icon="🌫️",
    layout="wide",
    initial_sidebar_state="expanded"
)

@st.cache_resource
def load_modules():
    """加载模块"""
    api_client = CNEMCApiClient()
    decomposer = PollutantDecomposer()
    ai_assistant = AIAnalysisAssistant()
    return api_client, decomposer, ai_assistant

@st.cache_data
def get_city_data(_api_client, city_name, start_date, end_date):
    """获取城市数据（带缓存）"""
    return _api_client.get_historical_data(city_name, start_date, end_date)

def get_aqi_level_color(aqi):
    """根据AQI值获取颜色"""
    if aqi <= 50:
        return "#00E400"
    elif aqi <= 100:
        return "#FFFF00"
    elif aqi <= 150:
        return "#FF7E00"
    elif aqi <= 200:
        return "#FF0000"
    elif aqi <= 300:
        return "#99004C"
    else:
        return "#7E0023"

def create_correlation_heatmap(df, title, title_text):
    """创建相关性热图"""
    cols = ["aqi", "pm25", "pm10", "so2", "no2", "co", "o3",
            "temperature", "humidity", "wind_speed"]
    numeric_cols = [col for col in cols if col in df.columns]
    corr_matrix = df[numeric_cols].corr().round(3)

    fig = go.Figure(data=go.Heatmap(
        z=corr_matrix.values,
        x=corr_matrix.columns,
        y=corr_matrix.index,
        colorscale='RdBu_r',
        zmid=0,
        text=corr_matrix.values,
        texttemplate='%{text:.2f}',
        textfont={"size": 10},
    ))

    fig.update_layout(
        title=title_text,
        height=500,
        xaxis_title="",
        yaxis_title=""
    )

    return fig

def main():
    api_client, decomposer, ai_assistant = load_modules()

    st.title("🌫️ AQI历史数据探索器")
    st.markdown("---")

    with st.sidebar:
        st.header("📊 控制面板")

        st.subheader("📍 城市选择")
        all_cities = api_client.get_all_cities()

        col1, col2 = st.columns(2)
        with col1:
            city1 = st.selectbox("城市1", all_cities, index=all_cities.index("石家庄"))
        with col2:
            city2 = st.selectbox("城市2", all_cities, index=all_cities.index("海口"))

        compare_mode = st.checkbox("启用双城市对比", value=True)

        st.subheader("📅 时间范围")
        end_date = st.date_input("结束日期", value=datetime.now())
        start_date = st.date_input("开始日期", value=end_date - timedelta(days=365))

        if start_date >= end_date:
            st.error("开始日期必须早于结束日期")
            return

        st.subheader("🔍 分析选项")
        show_contribution = st.checkbox("显示污染物贡献率", value=True)
        show_meteorology = st.checkbox("显示气象要素分析", value=True)
        enable_ai_analysis = st.checkbox("启用AI归因分析", value=True)

        st.markdown("---")
        st.markdown("### 📖 使用说明")
        st.markdown("""
        1. 选择要分析的城市和时间范围
        2. 点击图表上的数据点可查看详情
        3. 重污染天气可触发AI归因分析
        4. 箱线图用于多城市年度对比
        """)

    df1 = get_city_data(api_client, city1, start_date, end_date)
    df1 = decomposer.add_contribution_columns(df1)
    df1["date"] = pd.to_datetime(df1["date"])

    if compare_mode:
        df2 = get_city_data(api_client, city2, start_date, end_date)
        df2 = decomposer.add_contribution_columns(df2)
        df2["date"] = pd.to_datetime(df2["date"])

    tab1, tab2, tab3, tab4 = st.tabs([
        "📈 趋势分析",
        "📦 统计分布",
        "🔬 污染物分析",
        "🤖 AI归因分析"
    ])

    with tab1:
        st.subheader("AQI变化趋势")

        fig = go.Figure()

        fig.add_trace(go.Scatter(
            x=df1["date"],
            y=df1["aqi"],
            mode='lines+markers',
            name=city1,
            line=dict(color='#FF6B6B', width=2),
            marker=dict(size=6),
            hovertemplate=(
                '日期: %{x|%Y-%m-%d}<br>'
                'AQI: %{y}<br>'
                '等级: %{customdata[0]}<br>'
                'PM2.5: %{customdata[1]} μg/m³<br>'
                '<extra></extra>'
            ),
            customdata=df1[["level", "pm25"]].values
        ))

        if compare_mode:
            fig.add_trace(go.Scatter(
                x=df2["date"],
                y=df2["aqi"],
                mode='lines+markers',
                name=city2,
                line=dict(color='#4ECDC4', width=2),
                marker=dict(size=6),
                hovertemplate=(
                    '日期: %{x|%Y-%m-%d}<br>'
                    'AQI: %{y}<br>'
                    '等级: %{customdata[0]}<br>'
                    'PM2.5: %{customdata[1]} μg/m³<br>'
                    '<extra></extra>'
                ),
                customdata=df2[["level", "pm25"]].values
            ))

        fig.add_hrect(y0=0, y1=50, fillcolor="#00E400", opacity=0.1, layer="below", annotation_text="优")
        fig.add_hrect(y0=50, y1=100, fillcolor="#FFFF00", opacity=0.1, layer="below", annotation_text="良")
        fig.add_hrect(y0=100, y1=150, fillcolor="#FF7E00", opacity=0.1, layer="below", annotation_text="轻度污染")
        fig.add_hrect(y0=150, y1=200, fillcolor="#FF0000", opacity=0.1, layer="below", annotation_text="中度污染")
        fig.add_hrect(y0=200, y1=300, fillcolor="#99004C", opacity=0.1, layer="below", annotation_text="重度污染")
        fig.add_hrect(y0=300, y1=500, fillcolor="#7E0023", opacity=0.1, layer="below", annotation_text="严重污染")

        fig.update_layout(
            title=f"{city1}{' vs ' + city2 if compare_mode else ''} AQI变化趋势",
            xaxis_title="日期",
            yaxis_title="AQI",
            hovermode='x unified',
            height=500
        )

        st.plotly_chart(fig, use_container_width=True)

        st.subheader("📊 数据详情 & AI分析")
        col_a, col_b, col_c = st.columns([3, 1, 1])
        with col_a:
            date_options = df1["date"].dt.strftime("%Y-%m-%d").tolist()
            selected_date_str = st.selectbox(
                f"选择{city1}的日期查看详情",
                date_options,
                format_func=lambda x: f"{x} - AQI: {df1.loc[df1['date'].dt.strftime('%Y-%m-%d') == x, 'aqi'].values[0]}"
            )
        with col_b:
            selected_row = df1[df1["date"].dt.strftime("%Y-%m-%d") == selected_date_str].iloc[0]
            aqi_value = selected_row["aqi"]
            st.metric("AQI", aqi_value, f"{selected_row['level']}")
            
        with col_c:
            pm25_value = selected_row["pm25"]
            pm10_value = selected_row["pm10"]
            st.metric("PM2.5", f"{pm25_value}", f"PM10: {pm10_value}")

        # 显示污染物贡献率
        with st.expander("📈 污染物贡献率详情", expanded=False):
            contribution_data = {
                "污染物": ["PM2.5", "PM10", "SO2", "NO2", "CO", "O3"],
                "贡献率 (%)": [
                    round(selected_row["pm25_contribution"], 2),
                    round(selected_row["pm10_contribution"], 2),
                    round(selected_row["so2_contribution"], 2),
                    round(selected_row["no2_contribution"], 2),
                    round(selected_row["co_contribution"], 2),
                    round(selected_row["o3_contribution"], 2),
                ],
                "浓度": [
                    f"{pm25_value} μg/m³",
                    f"{pm10_value} μg/m³",
                    f"{selected_row['so2']} μg/m³",
                    f"{selected_row['no2']} μg/m³",
                    f"{selected_row['co']} mg/m³",
                    f"{selected_row['o3']} μg/m³",
                ]
            }
            st.dataframe(pd.DataFrame(contribution_data), use_container_width=True)

        # 明确的AI归因分析按钮
        if enable_ai_analysis:
            st.markdown("---")
            col_btn1, col_btn2 = st.columns([1, 2])
            
            with col_btn1:
                button_label = "🔍 生成污染归因分析报告"
                if aqi_value > 300:
                    button_type = "primary"
                    st.error("⚠️ 严重污染天气，建议立即进行AI分析！")
                elif aqi_value > 200:
                    button_type = "primary"
                    st.warning("⚠️ 重度污染天气，建议进行AI分析！")
                elif aqi_value > 150:
                    button_type = "primary"
                    st.warning("⚠️ 中度污染天气，可进行AI分析")
                else:
                    button_type = "secondary"
                    st.info("💡 空气质量良好，可查看参考分析")
            
            with col_btn2:
                if st.button(button_label, type=button_type, use_container_width=True):
                    with st.spinner("🤖 AI正在深入分析污染成因..."):
                        analysis = ai_assistant.analyze_pollution_cause(
                            selected_row.to_dict(),
                            city1,
                            None
                        )
                    st.success("✅ 分析完成！")
                    st.markdown(analysis)

        st.subheader("PM2.5 & PM10变化趋势")

        fig2 = make_subplots(rows=1, cols=2, subplot_titles=("PM2.5", "PM10"))

        fig2.add_trace(go.Scatter(
            x=df1["date"], y=df1["pm25"], name=f"{city1} PM2.5",
            line=dict(color='#FF6B6B')
        ), row=1, col=1)

        if compare_mode:
            fig2.add_trace(go.Scatter(
                x=df2["date"], y=df2["pm25"], name=f"{city2} PM2.5",
                line=dict(color='#4ECDC4')
            ), row=1, col=1)

        fig2.add_trace(go.Scatter(
            x=df1["date"], y=df1["pm10"], name=f"{city1} PM10",
            line=dict(color='#FF6B6B')
        ), row=1, col=2)

        if compare_mode:
            fig2.add_trace(go.Scatter(
                x=df2["date"], y=df2["pm10"], name=f"{city2} PM10",
                line=dict(color='#4ECDC4')
            ), row=1, col=2)

        fig2.update_layout(height=400, showlegend=True)
        st.plotly_chart(fig2, use_container_width=True)

    with tab2:
        st.subheader("AQI箱线图 - 年度对比")

        box_data = []
        df1["city"] = city1
        box_data.append(df1)

        if compare_mode:
            df2["city"] = city2
            box_data.append(df2)

        combined_df = pd.concat(box_data, ignore_index=True)

        fig_box = px.box(
            combined_df,
            x="city",
            y="aqi",
            color="city",
            color_discrete_map={city1: '#FF6B6B', city2: '#4ECDC4'},
            title=f"{city1} vs {city2} AQI分布对比",
            labels={"aqi": "AQI值", "city": "城市"},
            points="outliers",
            boxmode="group"
        )

        fig_box.add_hline(y=50, line_dash="dash", line_color="#00E400", annotation_text="优")
        fig_box.add_hline(y=100, line_dash="dash", line_color="#FFFF00", annotation_text="良")
        fig_box.add_hline(y=150, line_dash="dash", line_color="#FF7E00", annotation_text="轻度污染")

        fig_box.update_layout(height=500)
        st.plotly_chart(fig_box, use_container_width=True)

        st.markdown("""
        **箱线图解读：
        - 箱体代表AQI的分布范围
        - 箱体中线为中位数
        - 箱体上下边为25%和75%分位数
        - 须线表示数据范围
        - 散点为异常值（极端污染天气）
        """)

        col1, col2 = st.columns(2)

        with col1:
            st.subheader("空气质量等级分布")

            level_order = ["优", "良", "轻度污染", "中度污染", "重度污染", "严重污染"]
            level_colors = ["#00E400", "#FFFF00", "#FF7E00", "#FF0000", "#99004C", "#7E0023"]

            pie_cols = 2 if compare_mode else 1
            fig_pie = make_subplots(
                rows=1, cols=pie_cols,
                specs=[[{"type": "domain"}] * pie_cols],
                subplot_titles=[city1, city2] if compare_mode else [city1]
            )

            level_counts1 = df1["level"].value_counts().reindex(level_order, fill_value=0)
            fig_pie.add_trace(go.Pie(
                labels=level_counts1.index,
                values=level_counts1.values,
                name=city1,
                marker=dict(colors=level_colors),
                textinfo='label+percent'
            ), 1, 1)

            if compare_mode:
                level_counts2 = df2["level"].value_counts().reindex(level_order, fill_value=0)
                fig_pie.add_trace(go.Pie(
                    labels=level_counts2.index,
                    values=level_counts2.values,
                    name=city2,
                    marker=dict(colors=level_colors),
                    textinfo='label+percent'
                ), 1, 2)

            fig_pie.update_layout(height=400)
            st.plotly_chart(fig_pie, use_container_width=True)

        with col2:
            st.subheader("关键统计指标")

            stats1 = decomposer.calculate_exceedance_days(df1)

            metrics_data = {
                "指标": ["平均AQI", "中位数AQI", "最大AQI", "优良天数", "重度污染天数", "超标率"],
                city1: [
                    round(df1["aqi"].mean(), 1),
                    int(df1["aqi"].median()),
                    df1["aqi"].max(),
                    stats1["good_days"] + stats1["moderate_days"],
                    stats1["heavy_pollution_days"] + stats1["severe_pollution_days"],
                    round(stats1["exceedance_rate"], 2)
                ]
            }

            if compare_mode:
                stats2 = decomposer.calculate_exceedance_days(df2)
                metrics_data[city2] = [
                    round(df2["aqi"].mean(), 1),
                    int(df2["aqi"].median()),
                    df2["aqi"].max(),
                    stats2["good_days"] + stats2["moderate_days"],
                    stats2["heavy_pollution_days"] + stats2["severe_pollution_days"],
                    round(stats2["exceedance_rate"], 2)
                ]

            metrics_df = pd.DataFrame(metrics_data)
            st.dataframe(metrics_df, use_container_width=True)
            
            # 显示超标率单位说明
            st.caption("注：超标率单位为百分比（%）")

        st.subheader("月度AQI变化趋势")

        df1_month = df1.copy()
        df1_month["month"] = df1_month["date"].dt.month
        monthly1 = df1_month.groupby("month", observed=True)["aqi"].agg(["mean", "median", "min", "max"]).reset_index()
        monthly1.columns = ["month", "mean", "median", "min", "max"]

        fig_monthly = go.Figure()

        fig_monthly.add_trace(go.Scatter(
            x=monthly1["month"], y=monthly1["mean"],
            name=f"{city1} 平均值",
            line=dict(color='#FF6B6B', width=3)
        ))

        if compare_mode:
            df2_month = df2.copy()
            df2_month["month"] = df2_month["date"].dt.month
            monthly2 = df2_month.groupby("month", observed=True)["aqi"].agg(["mean", "median", "min", "max"]).reset_index()
            monthly2.columns = ["month", "mean", "median", "min", "max"]

            fig_monthly.add_trace(go.Scatter(
                x=monthly2["month"], y=monthly2["mean"],
                name=f"{city2} 平均值",
                line=dict(color='#4ECDC4', width=3)
            ))

        fig_monthly.update_layout(
            title="月度平均AQI对比",
            xaxis_title="月份",
            yaxis_title="平均AQI",
            height=400,
            xaxis=dict(tickmode='linear', tick0=1, dtick=1)
        )

        st.plotly_chart(fig_monthly, use_container_width=True)

    with tab3:
        st.subheader("污染物贡献率分析")

        if show_contribution:
            contribution_cols = ["pm25_contribution", "pm10_contribution",
                               "so2_contribution", "no2_contribution",
                               "co_contribution", "o3_contribution"]

            contrib_df1 = df1[contribution_cols].mean().reset_index()
            contrib_df1.columns = ["pollutant", "contribution"]
            contrib_df1["pollutant"] = contrib_df1["pollutant"].str.replace("_contribution", "").str.upper()
            contrib_df1["city"] = city1

            all_contrib = [contrib_df1]

            if compare_mode:
                contrib_df2 = df2[contribution_cols].mean().reset_index()
                contrib_df2.columns = ["pollutant", "contribution"]
                contrib_df2["pollutant"] = contrib_df2["pollutant"].str.replace("_contribution", "").str.upper()
                contrib_df2["city"] = city2
                all_contrib.append(contrib_df2)

            combined_contrib = pd.concat(all_contrib, ignore_index=True)

            fig_contrib = px.bar(
                combined_contrib,
                x="pollutant",
                y="contribution",
                color="city",
                barmode="group",
                title="各污染物平均贡献率",
                labels={"contribution": "贡献率 (%)", "pollutant": "污染物"},
                color_discrete_map={city1: '#FF6B6B', city2: '#4ECDC4'}
            )
            fig_contrib.update_layout(height=400)
            st.plotly_chart(fig_contrib, use_container_width=True)

        if show_meteorology:
            st.subheader("气象要素相关性分析")

            col1, col2 = st.columns(2)

            with col1:
                st.markdown(f"**{city1} 相关性矩阵**")
                fig_corr1 = create_correlation_heatmap(df1, city1, f"{city1} 污染物与气象要素相关性")
                st.plotly_chart(fig_corr1, use_container_width=True)

            if compare_mode:
                with col2:
                    st.markdown(f"**{city2} 相关性矩阵**")
                    fig_corr2 = create_correlation_heatmap(df2, city2, f"{city2} 污染物与气象要素相关性")
                    st.plotly_chart(fig_corr2, use_container_width=True)

            st.subheader("风速与AQI关系")

            df1_scatter = df1.copy()
            df1_scatter["is_pollution_level"] = pd.cut(
                df1_scatter["aqi"],
                bins=[0, 50, 100, 150, 200, 300, 500],
                labels=["优", "良", "轻度污染", "中度污染", "重度污染", "严重污染"]
            )

            fig_wind = px.scatter(
                df1_scatter,
                x="wind_speed",
                y="aqi",
                color="is_pollution_level",
                color_discrete_map={
                    "优": "#00E400",
                    "良": "#FFFF00",
                    "轻度污染": "#FF7E00",
                    "中度污染": "#FF0000",
                    "重度污染": "#99004C",
                    "严重污染": "#7E0023"
                },
                title=f"{city1} 风速 vs AQI",
                labels={"wind_speed": "风速 (m/s)", "aqi": "AQI", "is_pollution_level": "空气质量等级"},
                trendline="lowess",
                trendline_color_override="black"
            )
            fig_wind.update_layout(height=400)
            st.plotly_chart(fig_wind, use_container_width=True)

            st.markdown("""
            **相关性解读：**
            - 通常风速与AQI呈负相关（风速越大，空气质量越好）
            - 湿度较高时容易形成雾霾，污染物不易扩散
            - 温度季节性变化影响大气稳定度
            """)

    with tab4:
        st.subheader("🤖 AI污染归因分析")

        if not enable_ai_analysis:
            st.info("请在侧边栏启用AI归因分析功能")
            return

        episodes1 = decomposer.get_pollution_episodes(df1, threshold=150, min_duration=1)

        if not episodes1:
            st.info(f"{city1} 在所选时间段内未检测到重污染天气过程")
        else:
            st.success(f"检测到 {len(episodes1)} 次重污染天气过程")

            for i, episode in enumerate(episodes1, 1):
                with st.expander(f"🚨 污染过程 #{i} - {episode['start_date'].strftime('%Y-%m-%d')} 至 {episode['end_date'].strftime('%Y-%m-%d')}"):
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        st.metric("持续天数", f"{episode['days']} 天")
                    with col2:
                        st.metric("最高AQI", episode['max_aqi'])
                    with col3:
                        st.metric("平均AQI", episode['avg_aqi'])

                    episode_df = pd.DataFrame(episode['data'])
                    st.line_chart(episode_df.set_index('date')[['aqi', 'pm25', 'pm10']])

                    if st.button(f"生成归因分析报告 - 过程 #{i}", key=f"analyze_episode_{i}"):
                        with st.spinner("AI正在分析污染成因..."):
                            main_data = episode['data'][len(episode['data']) // 2]
                            analysis = ai_assistant.analyze_pollution_cause(
                                main_data,
                                city1,
                                episode['data']
                            )
                            st.markdown(analysis)

        if compare_mode:
            st.markdown("---")
            episodes2 = decomposer.get_pollution_episodes(df2, threshold=150, min_duration=1)

            if not episodes2:
                st.info(f"{city2} 在所选时间段内未检测到重污染天气过程")
            else:
                st.success(f"检测到 {len(episodes2)} 次重污染天气过程")

                for i, episode in enumerate(episodes2, 1):
                    with st.expander(f"🚨 {city2} 污染过程 #{i} - {episode['start_date'].strftime('%Y-%m-%d')}"):
                        col1, col2, col3 = st.columns(3)
                        with col1:
                            st.metric("持续天数", f"{episode['days']} 天")
                        with col2:
                            st.metric("最高AQI", episode['max_aqi'])
                        with col3:
                            st.metric("平均AQI", episode['avg_aqi'])

                        episode_df = pd.DataFrame(episode['data'])
                        st.line_chart(episode_df.set_index('date')[['aqi', 'pm25', 'pm10']])

                        if st.button(f"生成{city2}归因分析报告 - 过程 #{i}", key=f"analyze_{city2}_episode_{i}"):
                            with st.spinner("AI正在分析污染成因..."):
                                main_data = episode['data'][len(episode['data']) // 2]
                                analysis = ai_assistant.analyze_pollution_cause(
                                    main_data,
                                    city2,
                                    episode['data']
                                )
                                st.markdown(analysis)

    st.markdown("---")
    st.subheader("📋 数据详情")

    selected_city = st.selectbox("选择查看数据的城市", [city1] + ([city2] if compare_mode else []))
    display_df = df1 if selected_city == city1 else df2

    columns_to_show = ["date", "aqi", "level", "pm25", "pm10", "so2", "no2", "co", "o3",
                      "temperature", "humidity", "wind_speed", "weather"]
    display_df["date"] = display_df["date"].dt.strftime("%Y-%m-%d")

    st.dataframe(
        display_df[columns_to_show],
        use_container_width=True,
        height=300
    )

    csv = display_df.to_csv(index=False, encoding='utf-8-sig')
    st.download_button(
        label="📥 下载数据CSV",
        data=csv,
        file_name=f"{selected_city}_AQI数据_{start_date}_{end_date}.csv",
        mime="text/csv"
    )

if __name__ == "__main__":
    main()
