import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import calendar
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.data.checkin_counter import CheckinCounter
from src.model.congestion_predictor import CongestionPredictor
from src.data.weather_service import WeatherService


st.set_page_config(
    page_title="露营地拥挤度预测",
    page_icon="🏕️",
    layout="wide",
    initial_sidebar_state="expanded"
)


@st.cache_resource(show_spinner="正在加载数据...")
def load_data(use_mock: bool = True):
    counter = CheckinCounter(use_mock=use_mock)
    predictor = CongestionPredictor(counter.checkin_data)
    weather_service = WeatherService()
    return counter, predictor, weather_service


with st.sidebar:
    st.header("📊 导航")
    page = st.radio(
        "选择功能",
        ["📅 节假日拥挤预测", "🗺️ 露营地日历热力图", "⭐ 最佳露营窗口期", "📈 单营地详细分析", "🔧 数据源管理"]
    )
    
    st.markdown("---")
    st.header("⚙️ 设置")
    selected_year = st.selectbox("预测年份", [2024, 2025, 2026], index=2)
    
    st.markdown("---")
    st.header("🔄 数据源")
    use_mock_data = st.toggle("使用模拟数据", value=True, help="关闭后将尝试从API获取真实数据")
    
    data_source_info = "📊 模拟数据" if use_mock_data else "🌤️ 和风天气API"
    st.info(f"当前数据源：{data_source_info}")


counter, predictor, weather_service = load_data(use_mock_data)


st.title("🏕️ 露营地拥挤度预测系统")
st.markdown("基于小红书打卡数据和天气，预测节假日露营地拥挤程度")


if page == "📅 节假日拥挤预测":
    st.header("📅 节假日拥挤度预测")
    
    col1, col2 = st.columns(2)
    
    with col1:
        holiday_type = st.selectbox(
            "选择节假日",
            ["五一劳动节", "十一国庆节"]
        )
    
    holiday_param = "may_day" if holiday_type == "五一劳动节" else "national_day"
    
    predictions = predictor.predict_holiday_congestion(selected_year, holiday_param)
    
    alert_sites = predictions[predictions["alert"] == True]["site_name"].unique()
    
    if len(alert_sites) > 0:
        st.error(f"⚠️ **红色预警**：以下露营地在{holiday_type}期间严重拥挤：")
        for site in alert_sites:
            site_data = predictions[predictions["site_name"] == site]
            max_congestion = site_data["congestion_level"].max()
            st.markdown(f"- **{site}**：最高拥挤度 {max_congestion:.1f}%")
    
    st.subheader(f"{selected_year}年{holiday_type}各营地拥挤度详情")
    
    pivot_data = predictions.pivot(
        index="site_name",
        columns="date",
        values="congestion_level"
    )
    
    pivot_data.columns = [col.strftime('%m-%d') for col in pivot_data.columns]
    
    cmap = [[0, '#00C851'], [0.4, '#ffbb33'], [0.6, '#ff8800'], [1, '#ff4444']]
    
    fig = go.Figure(data=go.Heatmap(
        z=pivot_data.values,
        x=pivot_data.columns,
        y=pivot_data.index,
        colorscale=cmap,
        zmin=40,
        zmax=95,
        hovertemplate='<b>%{y}</b><br>日期: %{x}<br>拥挤度: %{z:.1f}%<extra></extra>',
        showscale=True,
        colorbar=dict(
            title="拥挤度",
            tickvals=[40, 60, 80, 95],
            ticktext=["舒适", "适中", "拥挤", "严重拥挤"]
        )
    ))
    
    fig.update_layout(
        height=400,
        xaxis_title="日期",
        yaxis_title="露营地",
        margin=dict(l=10, r=10, t=10, b=10)
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    st.subheader("📋 详细数据表格")
    
    styled_df = pivot_data.style.background_gradient(cmap='RdYlGn_r', vmin=40, vmax=95).format("{:.1f}")
    st.dataframe(styled_df, use_container_width=True)
    
    st.subheader("📈 拥挤度趋势图")
    fig = go.Figure()
    
    sites = predictions["site_name"].unique()
    for site in sites:
        site_data = predictions[predictions["site_name"] == site]
        fig.add_trace(go.Scatter(
            x=site_data["date"],
            y=site_data["congestion_level"],
            name=site,
            mode='lines+markers',
            line=dict(width=2.5),
            marker=dict(size=10),
            hovertemplate='<b>%{fullData.name}</b><br>%{x|%m-%d}<br>拥挤度: %{y:.1f}%<extra></extra>'
        ))
    
    fig.add_hrect(y0=80, y1=100, line_width=0, fillcolor="red", opacity=0.1, annotation_text="严重拥挤")
    fig.add_hrect(y0=60, y1=80, line_width=0, fillcolor="orange", opacity=0.1, annotation_text="拥挤")
    
    fig.update_layout(
        title=f"{selected_year}年{holiday_type}拥挤度趋势",
        xaxis_title="日期",
        yaxis_title="拥挤度 (%)",
        hovermode="x unified",
        height=500,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    
    st.plotly_chart(fig, use_container_width=True)


elif page == "🗺️ 露营地日历热力图":
    st.header("🗺️ 全年露营地日历热力图")
    
    col1, col2 = st.columns([1, 3])
    
    with col1:
        selected_site = st.selectbox("选择露营地", counter.get_all_sites())
        view_type = st.radio("查看类型", ["拥挤度", "天气适宜度"])
    
    month_predictions = []
    for month in range(1, 13):
        month_data = predictor.predict_month_congestion(selected_site, selected_year, month)
        month_predictions.append(month_data)
    
    all_data = pd.concat(month_predictions)
    
    cal_data = []
    for _, row in all_data.iterrows():
        date = row["date"]
        if view_type == "拥挤度":
            value = row["congestion_level"]
        else:
            weather_data = weather_service.get_weather_for_date(selected_site, date)
            value = weather_data.get("weather_score", 70)
        
        cal_data.append({
            "date": date,
            "value": value,
            "day": date.day,
            "weekday": date.weekday(),
            "month": date.month,
            "week_num": (date.day - 1) // 7
        })
    
    cal_df = pd.DataFrame(cal_data)
    
    if view_type == "拥挤度":
        cmap = 'RdYlGn_r'
        title = "拥挤度 (%)"
    else:
        cmap = 'RdYlGn'
        title = "天气适宜度评分"
    
    for row_start in range(0, 12, 3):
        cols = st.columns(3)
        for i in range(3):
            month = row_start + i + 1
            with cols[i]:
                st.subheader(f"📅 {calendar.month_name[month]}")
                
                month_df = cal_df[cal_df["month"] == month].copy()
                
                pivot = month_df.pivot(
                    index="week_num",
                    columns="weekday",
                    values="value"
                )
                
                pivot.columns = ["一", "二", "三", "四", "五", "六", "日"]
                
                text_data = month_df.pivot(
                    index="week_num",
                    columns="weekday",
                    values="day"
                )
                text_data.columns = ["一", "二", "三", "四", "五", "六", "日"]
                
                fig = px.imshow(
                    pivot,
                    labels=dict(x="星期", y="周数", color=title),
                    color_continuous_scale=cmap,
                    aspect="auto",
                    zmin=40,
                    zmax=95,
                    text_auto=False
                )
                
                for y in range(len(pivot.index)):
                    for x in range(len(pivot.columns)):
                        if not pd.isna(pivot.iloc[y, x]):
                            day_val = int(text_data.iloc[y, x]) if not pd.isna(text_data.iloc[y, x]) else ""
                            val = pivot.iloc[y, x]
                            color = "white" if val > 75 else "black"
                            fig.add_annotation(
                                x=x, y=y,
                                text=f"{day_val}<br>{val:.0f}",
                                showarrow=False,
                                font=dict(size=10, color=color)
                            )
                
                fig.update_layout(
                    height=280,
                    margin=dict(l=10, r=10, t=10, b=10),
                    coloraxis_showscale=False
                )
                
                st.plotly_chart(fig, use_container_width=True)
    
    st.markdown("---")
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown("🟢 80-95% 舒适/极佳")
    with col2:
        st.markdown("🟡 60-80% 适中/良好")
    with col3:
        st.markdown("🟠 40-60% 拥挤/一般")
    with col4:
        st.markdown("🔴 <40% 严重拥挤/较差")


elif page == "⭐ 最佳露营窗口期":
    st.header("⭐ 最佳露营窗口期推荐")
    
    st.markdown("综合考虑天气适宜度和拥挤程度，为您推荐全年最佳露营时间地点")
    
    best_windows = counter.get_best_camping_windows(selected_year, top_n=50)
    
    best_windows["date_str"] = best_windows["date"].dt.strftime("%Y-%m-%d")
    best_windows["weekday"] = best_windows["date"].dt.day_name()
    
    autumn_wugong = best_windows[
        (best_windows["site_name"] == "武功山") & 
        (best_windows["date"].dt.month == 10) &
        (best_windows["date"].dt.day >= 10)
    ]
    
    if len(autumn_wugong) > 0:
        st.success("🏆 **特别推荐**：10月中旬的江西武功山")
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("天气评分", f"{autumn_wugong.iloc[0]['weather_score']:.1f}")
        with col2:
            st.metric("拥挤度", f"{autumn_wugong.iloc[0]['congestion_level']:.1f}%")
        with col3:
            st.metric("综合评分", f"{autumn_wugong.iloc[0]['overall_score']:.1f}")
        
        st.markdown("武功山以秋季的云海、金色草甸和凉爽气候著称，10月中旬避开了国庆高峰，天气晴朗，是全年最佳露营窗口期。")
    
    st.subheader(f"🔝 Top 15 最佳露营日期（{selected_year}年）")
    
    top_15 = best_windows.head(15).copy()
    display_df = top_15[[
        "date_str", "weekday", "site_name", "province",
        "checkin_count", "weather_score", "congestion_level", "overall_score"
    ]].rename(columns={
        "date_str": "日期",
        "weekday": "星期",
        "site_name": "露营地",
        "province": "省份",
        "checkin_count": "打卡人数",
        "weather_score": "天气评分",
        "congestion_level": "拥挤度",
        "overall_score": "综合评分"
    })
    
    fig = px.scatter(
        display_df,
        x="拥挤度",
        y="天气评分",
        size="综合评分",
        color="综合评分",
        hover_data=["露营地", "日期", "省份"],
        title="天气 vs 拥挤度 分布",
        color_continuous_scale="RdYlGn",
        size_max=30,
        height=450
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    st.dataframe(
        display_df.style.background_gradient(
            subset=["综合评分"], cmap="Greens", vmin=60, vmax=100
        ).format({
            "天气评分": "{:.1f}",
            "拥挤度": "{:.1f}",
            "综合评分": "{:.1f}"
        }),
        use_container_width=True,
        hide_index=True
    )
    
    st.subheader("📊 各月份最佳露营地推荐")
    
    best_windows["month"] = best_windows["date"].dt.month
    monthly_best = best_windows.loc[best_windows.groupby("month")["overall_score"].idxmax()]
    
    monthly_best["month_name"] = monthly_best["month"].apply(
        lambda x: calendar.month_name[x]
    )
    
    monthly_display = monthly_best[[
        "month_name", "site_name", "province", "date_str",
        "weather_score", "congestion_level", "overall_score"
    ]].rename(columns={
        "month_name": "月份",
        "site_name": "最佳露营地",
        "province": "省份",
        "date_str": "推荐日期",
        "weather_score": "天气评分",
        "congestion_level": "拥挤度",
        "overall_score": "综合评分"
    })
    
    fig = go.Figure(data=[
        go.Bar(
            name='天气评分',
            x=monthly_display["月份"],
            y=monthly_display["天气评分"],
            marker_color='rgba(46, 204, 113, 0.8)'
        ),
        go.Bar(
            name='拥挤度',
            x=monthly_display["月份"],
            y=100 - monthly_display["拥挤度"],
            marker_color='rgba(241, 196, 15, 0.8)'
        )
    ])
    
    fig.update_layout(
        title="各月份露营地天气与拥挤度对比",
        barmode='group',
        height=400
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    st.dataframe(
        monthly_display.style.background_gradient(
            subset=["综合评分"], cmap="Greens", vmin=60, vmax=100
        ).format({
            "天气评分": "{:.1f}",
            "拥挤度": "{:.1f}",
            "综合评分": "{:.1f}"
        }),
        use_container_width=True,
        hide_index=True
    )


elif page == "📈 单营地详细分析":
    st.header("📈 单营地详细分析")
    
    col1, col2 = st.columns([1, 2])
    
    with col1:
        selected_site = st.selectbox("选择露营地", counter.get_all_sites())
        
        st.subheader("📍 营地信息")
        site_info = counter.camping_sites[selected_site]
        loc_info = weather_service.site_locations[selected_site]
        
        st.markdown(f"**省份**：{site_info['province']}")
        st.markdown(f"**坐标**：{loc_info['lat']}°N, {loc_info['lon']}°E")
        st.markdown(f"**基础人气**：{site_info['base_popularity']}")
        
        st.markdown("**季节因子**：")
        season_map = {"spring": "春季", "summer": "夏季", "autumn": "秋季", "winter": "冬季"}
        for season, factor in site_info["season_factor"].items():
            st.markdown(f"- {season_map[season]}：{factor}")
    
    with col2:
        st.subheader("📊 历史打卡数据趋势")
        
        site_checkins = counter.get_site_checkins(selected_site)
        
        monthly_avg = site_checkins.groupby(
            site_checkins["date"].dt.to_period("M")
        )["checkin_count"].mean().reset_index()
        monthly_avg["date"] = monthly_avg["date"].dt.to_timestamp()
        
        fig = px.line(
            monthly_avg,
            x="date",
            y="checkin_count",
            title=f"{selected_site} - 月度平均打卡人数",
            labels={"checkin_count": "打卡人数", "date": "日期"},
            markers=True
        )
        
        fig.update_layout(height=350)
        st.plotly_chart(fig, use_container_width=True)
    
    st.subheader("🌤️ 未来7天天气预报")
    
    forecast_7d = weather_service.get_7days_forecast(selected_site)
    
    fig = make_subplots(specs=[[{"secondary_y": True}]])
    
    fig.add_trace(
        go.Bar(
            x=forecast_7d["date"],
            y=forecast_7d["weather_score"],
            name="适宜度评分",
            marker_color='rgba(46, 204, 113, 0.6)',
            hovertemplate='%{x|%m-%d}<br>适宜度: %{y:.1f}<extra></extra>'
        ),
        secondary_y=False
    )
    
    fig.add_trace(
        go.Scatter(
            x=forecast_7d["date"],
            y=forecast_7d["temperature"],
            name="温度 (°C)",
            mode='lines+markers',
            line=dict(color='red', width=3),
            hovertemplate='%{x|%m-%d}<br>温度: %{y:.1f}°C<br>天气: %{customdata}<extra></extra>',
            customdata=forecast_7d["weather_type"]
        ),
        secondary_y=True
    )
    
    fig.update_layout(
        title="未来7天天气适宜度与温度",
        height=400,
        hovermode="x unified"
    )
    
    fig.update_yaxes(title_text="适宜度评分", secondary_y=False)
    fig.update_yaxes(title_text="温度 (°C)", secondary_y=True)
    
    st.plotly_chart(fig, use_container_width=True)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📋 天气详情表格")
        forecast_display = forecast_7d.copy()
        forecast_display["date_str"] = forecast_display["date"].dt.strftime("%m-%d")
        forecast_display["weekday"] = forecast_display["date"].dt.day_name()
        
        display_df = forecast_display[[
            "date_str", "weekday", "weather_type", "temperature",
            "precipitation", "wind_speed", "weather_score"
        ]].rename(columns={
            "date_str": "日期",
            "weekday": "星期",
            "weather_type": "天气",
            "temperature": "温度(°C)",
            "precipitation": "降水(mm)",
            "wind_speed": "风力(级)",
            "weather_score": "适宜度"
        })
        
        st.dataframe(
            display_df.style.background_gradient(
                subset=["适宜度"], cmap="RdYlGn", vmin=40, vmax=100
            ).format({
                "温度(°C)": "{:.1f}",
                "降水(mm)": "{:.1f}",
                "风力(级)": "{:.1f}",
                "适宜度": "{:.0f}"
            }),
            use_container_width=True,
            hide_index=True
        )
    
    with col2:
        st.subheader("⏰ 未来30天拥挤度预测")
        
        forecast = predictor.get_congestion_forecast(selected_site, days_ahead=30)
        
        fig = go.Figure()
        
        fig.add_trace(go.Scatter(
            x=forecast["date"],
            y=forecast["congestion_level"],
            mode='lines+markers',
            name='拥挤度',
            line=dict(color='royalblue', width=3),
            marker=dict(size=8),
            fill='tonexty',
            hovertemplate='<b>%{x|%Y-%m-%d}</b><br>拥挤度: %{y:.1f}%<br>%{customdata}<extra></extra>',
            customdata=forecast["level"]
        ))
        
        fig.add_hrect(y0=80, y1=100, line_width=0, fillcolor="red", opacity=0.1, annotation_text="严重拥挤")
        fig.add_hrect(y0=60, y1=80, line_width=0, fillcolor="orange", opacity=0.1, annotation_text="拥挤")
        fig.add_hrect(y0=40, y1=60, line_width=0, fillcolor="yellow", opacity=0.1, annotation_text="适中")
        fig.add_hrect(y0=0, y1=40, line_width=0, fillcolor="green", opacity=0.1, annotation_text="舒适")
        
        fig.update_layout(
            title="未来30天拥挤度预测",
            xaxis_title="日期",
            yaxis_title="拥挤度 (%)",
            height=400,
            hovermode="x unified"
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    st.subheader("📅 月度拥挤度热力图")
    
    month_data = []
    for month in range(1, 13):
        pred = predictor.predict_month_congestion(selected_site, selected_year, month)
        avg_congestion = pred["congestion_level"].mean()
        month_data.append({
            "month": calendar.month_name[month],
            "avg_congestion": avg_congestion,
            "month_num": month
        })
    
    month_df = pd.DataFrame(month_data)
    
    fig = px.bar(
        month_df,
        x="month",
        y="avg_congestion",
        color="avg_congestion",
        color_continuous_scale="RdYlGn_r",
        range_color=[40, 95],
        title=f"{selected_year}年各月平均拥挤度",
        labels={"avg_congestion": "平均拥挤度 (%)", "month": "月份"},
        text="avg_congestion",
        height=400
    )
    
    fig.update_traces(texttemplate='%{text:.1f}%', textposition='outside')
    fig.update_layout(coloraxis_showscale=False)
    
    st.plotly_chart(fig, use_container_width=True)
    
    st.subheader("🌟 推荐前往日期")
    
    future_dates = [datetime.now() + timedelta(days=i) for i in range(7, 90)]
    recommendations = []
    
    for date in future_dates:
        recs = predictor.recommend_best_sites(date, top_n=10)
        for rec in recs:
            if rec["site_name"] == selected_site:
                weather = weather_service.get_weather_for_date(selected_site, date)
                rec["weather_type"] = weather.get("weather_type", "晴")
                rec["temperature"] = weather.get("temperature", 20)
                recommendations.append(rec)
                break
    
    rec_df = pd.DataFrame(recommendations)
    best_dates = rec_df.sort_values("overall_score", ascending=False).head(8)
    
    cols = st.columns(4)
    for idx, (_, row) in enumerate(best_dates.iterrows()):
        with cols[idx % 4]:
            date_str = row["date"].strftime("%Y-%m-%d")
            weekday = row["date"].strftime("%A")
            
            if row["color"] == "green":
                status_bg = "#00C851"
            elif row["color"] == "yellow":
                status_bg = "#ffbb33"
            elif row["color"] == "orange":
                status_bg = "#ff8800"
            else:
                status_bg = "#ff4444"
            
            st.markdown(
                f"""
                <div style="
                    background-color: {status_bg}22;
                    border-left: 5px solid {status_bg};
                    padding: 10px;
                    border-radius: 5px;
                    margin-bottom: 10px;
                ">
                    <h4 style="margin: 0;">📅 {date_str}</h4>
                    <p style="margin: 5px 0;">{weekday}</p>
                    <p style="margin: 5px 0;">🌡️ {row['temperature']:.1f}°C {row['weather_type']}</p>
                    <p style="margin: 5px 0;">👥 拥挤度: {row['congestion_level']:.0f}%</p>
                    <p style="margin: 5px 0;">⭐ 综合评分: {row['overall_score']:.0f}</p>
                </div>
                """,
                unsafe_allow_html=True
            )


elif page == "🔧 数据源管理":
    st.header("🔧 数据源管理")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📊 数据状态")
        status = counter.get_data_status()
        
        st.metric("最后更新", status["last_update"])
        st.metric("数据源", status["data_source"])
        st.metric("总记录数", f"{status['total_records']:,}")
        st.metric("数据范围", f"{status['date_range']['start']} ~ {status['date_range']['end']}")
        
        if st.button("🔄 刷新数据", type="primary"):
            with st.spinner("正在刷新数据..."):
                success = counter.refresh_data()
                if success:
                    st.success("数据刷新成功！")
                    st.rerun()
                else:
                    st.error("数据刷新失败，请查看日志")
    
    with col2:
        st.subheader("🌤️ 天气API状态")
        api_status = "✅ 已配置" if weather_service.api_key else "⚠️ 使用模拟数据"
        st.metric("API状态", api_status)
        st.metric("缓存状态", "已启用" if weather_service.last_update else "未使用")
        
        if weather_service.last_update:
            st.metric("最后天气更新", weather_service.last_update)
    
    st.markdown("---")
    
    st.subheader("📱 社交媒体平台分布")
    
    platform_data = counter.get_platform_distribution()
    
    fig = px.pie(
        values=list(platform_data["distribution"].values()),
        names=list(platform_data["distribution"].keys()),
        title="打卡数据来源平台分布",
        color_discrete_sequence=px.colors.qualitative.Set3,
        hole=0.3
    )
    
    fig.update_traces(textposition='inside', textinfo='percent+label')
    
    st.plotly_chart(fig, use_container_width=True)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📈 互动指标详情")
        site_for_metric = st.selectbox("选择营地查看互动数据", counter.get_all_sites())
        metrics = counter.get_engagement_metrics(site_for_metric)
        
        if metrics:
            col_a, col_b, col_c = st.columns(3)
            with col_a:
                st.metric("总打卡人数", metrics.get("total_checkins", 0))
            with col_b:
                st.metric("获赞数", metrics.get("total_likes", 0))
            with col_c:
                st.metric("互动率", f"{metrics.get('engagement_rate', 0)}%")
            
            st.markdown("**平台分布**：")
            for platform, count in metrics.get("platform_distribution", {}).items():
                st.markdown(f"- {platform}: {count} 次")
    
    with col2:
        st.subheader("🔴 节假日高峰分析")
        peak_site = st.selectbox("选择营地查看高峰数据", counter.get_all_sites(), key="peak")
        peak_analysis = counter.crawler.get_holiday_peak_analysis(peak_site, selected_year)
        
        if peak_analysis:
            col_x, col_y = st.columns(2)
            with col_x:
                st.metric("五一高峰人数", f"{peak_analysis['may_day_peak']:,}")
                st.metric("国庆高峰人数", f"{peak_analysis['national_day_peak']:,}")
            with col_y:
                st.metric("节假日平均", f"{peak_analysis['holiday_avg']:,}")
                st.metric("峰值倍数", f"{peak_analysis['peak_multiplier']}x")
    
    st.markdown("---")
    
    st.subheader("📋 数据来源说明")
    st.markdown("""
    - **小红书打卡数据**：模拟用户在小红书平台的打卡、点赞、评论、分享行为
    - **抖音打卡数据**：模拟短视频平台的打卡数据，占比约30%
    - **微博打卡数据**：模拟社交媒体打卡数据，占比约15%
    - **大众点评数据**：模拟本地生活平台打卡数据，占比约15%
    - **天气数据**：通过和风天气API获取，包含温度、降水、风力、湿度等多维度
    """)
    
    st.info(f"📝 当前数据更新时间：{status['last_update']}")


st.markdown("---")
col1, col2, col3, col4 = st.columns(4)
with col1:
    st.markdown("📊 数据来源：小红书/抖音/微博/大众点评")
with col2:
    st.markdown("🌤️ 天气服务：和风天气API")
with col3:
    st.markdown(f"🔄 当前状态：{'模拟数据模式' if use_mock_data else '实时API模式'}")
with col4:
    status = counter.get_data_status()
    st.markdown(f"🕒 最后更新：{status['last_update']}")
