import os
import sys
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List

import pandas as pd
import streamlit as st
import pydeck as pdk
from dotenv import load_dotenv

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

load_dotenv()

from src.poi.subway_poi_spider import SubwayPOISpider
from src.traffic.congestion_inference import CongestionInferenceEngine
from src.analysis.crowd_level import CrowdLevelAnalyzer, CrowdData

st.set_page_config(
    page_title="地铁沙丁鱼指数",
    page_icon="🐟",
    layout="wide",
    initial_sidebar_state="expanded",
)

CITY_COORDINATES = {
    "北京": [39.9042, 116.4074],
    "上海": [31.2304, 121.4737],
    "广州": [23.1291, 113.2644],
    "深圳": [22.5431, 114.0579],
    "成都": [30.5728, 104.0668],
    "杭州": [30.2741, 120.1551],
    "武汉": [30.5928, 114.3055],
    "西安": [34.3416, 108.9398],
    "重庆": [29.4316, 106.9123],
    "南京": [32.0603, 118.7969],
}

LEVEL_COLORS = {
    "舒适": "#10b981",
    "普通": "#f59e0b",
    "拥挤": "#f97316",
    "爆满": "#ef4444",
}

LEVEL_EMOJIS = {
    "舒适": "😊",
    "普通": "😐",
    "拥挤": "😰",
    "爆满": "🥵",
}


def load_stations(city: str, refresh: bool = False) -> tuple[List[Dict], bool, str]:
    data_dir = Path("data")
    data_file = data_dir / f"{city}_subway_stations.json"

    if data_file.exists() and not refresh:
        with open(data_file, "r", encoding="utf-8") as f:
            return json.load(f), False, ""
    else:
        with st.spinner(f"正在加载 {city} 地铁站点数据..."):
            spider = SubwayPOISpider()
            stations = spider.search_subway_stations(city)
            return [s.to_dict() for s in stations], spider.demo_mode, spider.demo_reason


def analyze_congestion(
    city: str, stations: List[Dict], use_simulation: bool = True
) -> tuple[List[CrowdData], bool, str]:
    with st.spinner("正在分析拥堵数据..."):
        engine = CongestionInferenceEngine()

        if use_simulation:
            congestion_data = engine.simulate_morning_peak(stations)
            demo_mode = True
            demo_reason = "模拟模式"
        else:
            congestion_data = engine.bulk_get_congestion(stations)
            demo_mode = engine.demo_mode
            demo_reason = engine.demo_reason

        congestion_dicts = [c.to_dict() for c in congestion_data]

        analyzer = CrowdLevelAnalyzer()
        crowd_data = analyzer.analyze(congestion_dicts, stations)

        return crowd_data, demo_mode, demo_reason


def create_map_dataframe(crowd_data: List[CrowdData], stations: List[Dict]) -> pd.DataFrame:
    station_lines = {s["name"]: s.get("lines", []) for s in stations}

    COLOR_RGB = {
        "舒适": [16, 185, 129],
        "普通": [245, 158, 11],
        "拥挤": [249, 115, 22],
        "爆满": [239, 68, 68],
    }

    data = []
    for item in crowd_data:
        base_size = 15
        size = base_size * item.size_multiplier
        lines = station_lines.get(item.station_name, [])
        rgb = COLOR_RGB.get(item.crowd_level, [136, 136, 136])

        data.append(
            {
                "lat": item.latitude,
                "lon": item.longitude,
                "station_name": item.station_name,
                "crowd_level": item.crowd_level,
                "congestion_index": f"{item.congestion_index:.3f}",
                "status": item.status,
                "speed": f"{item.speed:.1f}",
                "is_transfer": item.is_transfer,
                "lines": "、".join(lines) if lines else "-",
                "color_r": rgb[0],
                "color_g": rgb[1],
                "color_b": rgb[2],
                "size": size,
                "emoji": LEVEL_EMOJIS.get(item.crowd_level, "❓"),
                "transfer_text": "🔄 换乘站" if item.is_transfer else "⚪ 普通站",
            }
        )
    return pd.DataFrame(data)


def create_pydeck_map(df: pd.DataFrame, city: str) -> pdk.Deck:
    center_lat, center_lon = CITY_COORDINATES.get(city, [39.9042, 116.4074])

    tooltip_html = """
    <b>{station_name}</b><br/>
    {transfer_text}<br/>
    拥挤等级: {emoji} {crowd_level}<br/>
    拥堵指数: {congestion_index}<br/>
    周边车速: {speed} km/h<br/>
    途经线路: {lines}
    """

    layer = pdk.Layer(
        "ScatterplotLayer",
        df,
        get_position=["lon", "lat"],
        get_fill_color=["color_r", "color_g", "color_b", 200],
        get_radius="size * 50",
        pickable=True,
        opacity=0.8,
        stroked=True,
        filled=True,
        radius_scale=1,
        radius_min_pixels=5,
        radius_max_pixels=50,
        line_width_min_pixels=1,
        get_line_color=[255, 255, 255, 100],
    )

    view_state = pdk.ViewState(
        latitude=center_lat,
        longitude=center_lon,
        zoom=11,
        min_zoom=8,
        max_zoom=16,
        pitch=0,
        bearing=0,
    )

    deck = pdk.Deck(
        layers=[layer],
        initial_view_state=view_state,
        map_style="road",
        tooltip={
            "html": tooltip_html,
            "style": {
                "backgroundColor": "rgba(0, 0, 0, 0.8)",
                "color": "white",
                "fontSize": "12px",
                "padding": "8px",
                "borderRadius": "4px",
            },
        },
    )

    return deck


def color_cell(color: str) -> str:
    return f'<div style="width: 20px; height: 20px; border-radius: 4px; background-color: {color};"></div>'


def main():
    st.title("🐟 地铁沙丁鱼指数")
    st.subheader("早高峰地铁站拥挤度可视化")

    with st.sidebar:
        st.header("⚙️ 控制面板")

        city = st.selectbox(
            "选择城市",
            options=list(CITY_COORDINATES.keys()),
            index=0,
        )

        refresh_stations = st.checkbox("重新加载数据", value=False)

        data_mode = st.radio(
            "数据模式",
            options=["模拟早高峰", "实时路况数据"],
            index=0,
            help="模拟模式可随时查看效果；实时模式调用高德地图API",
        )

        use_simulation = data_mode == "模拟早高峰"

        st.divider()

        st.subheader("🎨 显示设置")
        show_transfer_only = st.checkbox("仅显示换乘站", value=False)
        min_congestion = st.slider(
            "最小拥堵指数",
            min_value=0.0,
            max_value=1.0,
            value=0.0,
            step=0.05,
        )

        analyze_button = st.button(
            "🔍 开始分析",
            type="primary",
            use_container_width=True,
        )

    if analyze_button:
        try:
            stations, poi_demo_mode, poi_demo_reason = load_stations(city, refresh_stations)
            st.success(f"✅ 已加载 {len(stations)} 个地铁站点")

            crowd_data, demo_mode, demo_reason = analyze_congestion(
                city, stations, use_simulation
            )

            if demo_mode or poi_demo_mode:
                reason = demo_reason or poi_demo_reason or ""
                if reason:
                    st.warning(
                        f"⚠️ 当前使用演示数据\n\n"
                        f"原因: {reason}\n\n"
                        f"如需真实数据，请在 .env 文件中配置有效的高德地图API Key"
                    )
                else:
                    st.info("📊 当前使用模拟数据展示")

            if show_transfer_only:
                crowd_data = [d for d in crowd_data if d.is_transfer]

            if min_congestion > 0:
                crowd_data = [d for d in crowd_data if d.congestion_index >= min_congestion]

            df = create_map_dataframe(crowd_data, stations)

            col1, col2, col3 = st.columns([2, 1, 1])

            with col1:
                st.subheader(f"📍 {city} 地铁拥挤度地图")
                st.caption(f"更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                st.caption("💡 提示: 点击地图上的标记点可查看站点详情")

                deck = create_pydeck_map(df, city)
                st.pydeck_chart(deck, use_container_width=True)

                st.markdown(
                    """
                    <div style="display: flex; gap: 1rem; margin-top: 1rem; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div style="width: 20px; height: 20px; border-radius: 50%; background: #10b981;"></div>
                            <span>舒适 (0-0.3)</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div style="width: 20px; height: 20px; border-radius: 50%; background: #f59e0b;"></div>
                            <span>普通 (0.3-0.55)</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div style="width: 20px; height: 20px; border-radius: 50%; background: #f97316;"></div>
                            <span>拥挤 (0.55-0.8)</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div style="width: 20px; height: 20px; border-radius: 50%; background: #ef4444;"></div>
                            <span>爆满 (0.8-1.0)</span>
                        </div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

            with col2:
                st.subheader("📈 统计数据")

                analyzer = CrowdLevelAnalyzer()
                stats = analyzer.get_statistics(crowd_data)

                st.metric("站点总数", stats.get("total_stations", 0))
                st.metric("平均拥堵指数", f"{stats.get('average_congestion_index', 0):.3f}")
                st.metric("换乘站数量", stats.get("transfer_station_count", 0))

                most_crowded = stats.get("most_crowded", {})
                st.info(
                    f"🔥 最拥挤: {most_crowded.get('name', 'N/A')}\n"
                    f"指数: {most_crowded.get('index', 0):.3f}"
                )

                least_crowded = stats.get("least_crowded", {})
                st.success(
                    f"🌿 最舒适: {least_crowded.get('name', 'N/A')}\n"
                    f"指数: {least_crowded.get('index', 0):.3f}"
                )

            with col3:
                st.subheader("📊 等级分布")

                level_dist = stats.get("level_distribution", {})
                dist_data = []
                for level, count in level_dist.items():
                    color = LEVEL_COLORS.get(level, "#888888")
                    dist_data.append(
                        {
                            "等级": f"{LEVEL_EMOJIS.get(level, '')} {level}",
                            "数量": count,
                        }
                    )
                dist_df = pd.DataFrame(dist_data)

                st.dataframe(
                    dist_df,
                    hide_index=True,
                    use_container_width=True,
                )

                st.subheader("🏆 拥挤度排行")
                top_crowded = df.nlargest(10, "congestion_index")[
                    ["station_name", "crowd_level", "congestion_index", "emoji"]
                ]
                top_crowded = top_crowded.rename(
                    columns={
                        "station_name": "站点",
                        "crowd_level": "等级",
                        "congestion_index": "拥堵指数",
                        "emoji": "状态",
                    }
                )
                st.dataframe(
                    top_crowded,
                    hide_index=True,
                    use_container_width=True,
                )

            st.divider()

            st.subheader("📍 站点详情")

            station_names = sorted(df["station_name"].unique().tolist())
            selected_station = st.selectbox(
                "🔍 搜索或选择站点查看详情",
                options=station_names,
                help="选择一个站点查看详细信息",
            )

            if selected_station:
                station_info = df[df["station_name"] == selected_station].iloc[0]

                col_a, col_b, col_c, col_d = st.columns(4)

                with col_a:
                    is_transfer = station_info["is_transfer"]
                    st.metric(
                        "站点类型",
                        "🔄 换乘站" if is_transfer else "⚪ 普通站",
                        help="是否为换乘站",
                    )

                with col_b:
                    st.metric(
                        "拥挤等级",
                        f"{station_info['emoji']} {station_info['crowd_level']}",
                        help="站点拥挤程度",
                    )

                with col_c:
                    st.metric(
                        "拥堵指数",
                        f"{station_info['congestion_index']:.3f}",
                        help="0-1，越高越拥堵",
                    )

                with col_d:
                    st.metric(
                        "周边车速",
                        f"{station_info['speed']:.1f} km/h",
                        help="周边道路平均车速",
                    )

                st.markdown("---")

                col_e, col_f = st.columns(2)

                with col_e:
                    st.markdown("#### 🚇 途经线路")
                    lines = station_info["lines"] if station_info["lines"] != "-" else "暂无数据"
                    st.info(f"**{lines}**")

                with col_f:
                    st.markdown("#### 🛣️ 道路状态")
                    st.success(f"**{station_info['status']}**")

            st.divider()

            st.subheader("📋 详细数据")

            display_df = df[
                [
                    "station_name",
                    "crowd_level",
                    "congestion_index",
                    "status",
                    "speed",
                    "is_transfer",
                    "lines",
                    "emoji",
                ]
            ].rename(
                columns={
                    "station_name": "站点名称",
                    "crowd_level": "拥挤等级",
                    "congestion_index": "拥堵指数",
                    "status": "道路状态",
                    "speed": "平均车速(km/h)",
                    "is_transfer": "换乘站",
                    "lines": "途经线路",
                    "emoji": "状态",
                }
            )

            st.dataframe(
                display_df,
                use_container_width=True,
                hide_index=True,
            )

        except Exception as e:
            st.error(f"发生错误: {str(e)}")
            st.exception(e)

    else:
        st.info("👈 请在左侧选择城市和参数，点击「开始分析」按钮")

        st.markdown(
            """
            <div style="padding: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 0.5rem; color: white;">
            <strong>📊 系统说明</strong><br><br>
            本系统基于地铁站周边道路拥堵指数，反推各站点早高峰人流拥挤程度。<br><br>
            <strong>使用方法：</strong><br>
            1. 选择要查看的城市<br>
            2. 选择数据模式（模拟或实时）<br>
            3. 点击「开始分析」按钮
            </div>
            """,
            unsafe_allow_html=True,
        )


if __name__ == "__main__":
    main()
