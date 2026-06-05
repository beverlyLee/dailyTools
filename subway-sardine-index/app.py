import os
import sys
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List

import pandas as pd
import streamlit as st
from dotenv import load_dotenv

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

load_dotenv()

from src.poi.subway_poi_spider import SubwayPOISpider, SubwayStation
from src.traffic.congestion_inference import CongestionInferenceEngine, TrafficStatus
from src.analysis.crowd_level import CrowdLevelAnalyzer, CrowdData, CrowdLevel

st.set_page_config(
    page_title="地铁沙丁鱼指数 - 早高峰拥挤度可视化",
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
        with st.spinner(f"正在爬取 {city} 地铁站点数据..."):
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
            demo_reason = "用户选择模拟模式"
        else:
            congestion_data = engine.bulk_get_congestion(stations)
            demo_mode = engine.demo_mode
            demo_reason = engine.demo_reason

        congestion_dicts = [c.to_dict() for c in congestion_data]

        analyzer = CrowdLevelAnalyzer()
        crowd_data = analyzer.analyze(congestion_dicts, stations)

        return crowd_data, demo_mode, demo_reason


def create_map_dataframe(crowd_data: List[CrowdData]) -> pd.DataFrame:
    data = []
    for item in crowd_data:
        base_size = 15
        size = base_size * item.size_multiplier

        data.append(
            {
                "lat": item.latitude,
                "lon": item.longitude,
                "station_name": item.station_name,
                "crowd_level": item.crowd_level,
                "congestion_index": item.congestion_index,
                "status": item.status,
                "speed": item.speed,
                "is_transfer": item.is_transfer,
                "color": LEVEL_COLORS.get(item.crowd_level, "#888888"),
                "size": size,
                "emoji": LEVEL_EMOJIS.get(item.crowd_level, "❓"),
            }
        )
    return pd.DataFrame(data)


def main():
    st.title("🐟 地铁沙丁鱼指数")
    st.subheader("基于周边路况反推地铁站早高峰拥挤度")

    st.markdown(
        """
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    padding: 1rem; border-radius: 0.5rem; color: white; margin-bottom: 1rem;">
        <strong>📊 项目说明：</strong> 本系统不依赖官方客流数据，而是通过高德地图路况API
        获取地铁站周边1公里道路的拥堵指数，以此作为进站人流的代理变量，反推各站点拥挤度。
        </div>
        """,
        unsafe_allow_html=True,
    )

    with st.sidebar:
        st.header("⚙️ 控制面板")

        city = st.selectbox(
            "选择城市",
            options=list(CITY_COORDINATES.keys()),
            index=0,
        )

        refresh_stations = st.checkbox("重新爬取站点数据", value=False)

        data_mode = st.radio(
            "数据模式",
            options=["模拟早高峰", "实时API数据"],
            index=0,
            help="模拟模式可随时查看效果；实时模式需要早高峰时段(8:00-9:00)调用API",
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

            crowd_data, demo_mode, demo_reason = analyze_congestion(city, stations, use_simulation)

            if demo_mode or poi_demo_mode:
                reason = demo_reason or poi_demo_reason or "演示模式"
                st.warning(
                    f"⚠️ 当前使用演示模式数据\n\n"
                    f"原因: {reason}\n\n"
                    f"如需真实数据，请在 .env 文件中配置有效的高德地图Web服务API Key"
                )

            if show_transfer_only:
                crowd_data = [d for d in crowd_data if d.is_transfer]

            if min_congestion > 0:
                crowd_data = [d for d in crowd_data if d.congestion_index >= min_congestion]

            df = create_map_dataframe(crowd_data)

            col1, col2, col3 = st.columns([2, 1, 1])

            with col1:
                st.subheader(f"📍 {city} 地铁拥挤度地图")
                st.caption(f"数据更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                st.caption(f"模式: {data_mode}")

                map_df = df[["lat", "lon", "size", "color"]].rename(
                    columns={"color": "color_col", "size": "size_col"}
                )

                st.map(
                    map_df,
                    latitude="lat",
                    longitude="lon",
                    size="size_col",
                    color="color_col",
                    zoom=11,
                    use_container_width=True,
                )

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
                dist_df = pd.DataFrame(
                    [
                        {"等级": level, "数量": count, "颜色": LEVEL_COLORS.get(level, "#888")}
                        for level, count in level_dist.items()
                    ]
                )
                st.dataframe(
                    dist_df,
                    column_config={
                        "颜色": st.column_config.ColorColumn("颜色"),
                    },
                    hide_index=True,
                    use_container_width=True,
                )

                st.subheader("🏆 拥挤度排行")
                top_crowded = df.nlargest(10, "congestion_index")[
                    ["station_name", "crowd_level", "congestion_index", "emoji", "is_transfer"]
                ]
                top_crowded = top_crowded.rename(
                    columns={
                        "station_name": "站点",
                        "crowd_level": "等级",
                        "congestion_index": "拥堵指数",
                        "emoji": "状态",
                        "is_transfer": "换乘站",
                    }
                )
                st.dataframe(
                    top_crowded,
                    hide_index=True,
                    use_container_width=True,
                )

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
                    "emoji": "状态",
                }
            )

            st.dataframe(
                display_df,
                column_config={
                    "拥堵指数": st.column_config.NumberColumn(
                        "拥堵指数",
                        format="%.3f",
                    ),
                },
                use_container_width=True,
                hide_index=True,
            )

            st.divider()

            with st.expander("🔬 验证方法说明"):
                st.markdown(
                    """
                    ### 项目验证方法

                    **核心假设**：早高峰时段，地铁站周边道路越拥堵，说明进站人流越多。

                    **预期结果**：
                    - ❌ **核心换乘站**（如西二旗、人民广场、国贸、陆家嘴等）应显示为
                      <span style="color: #ef4444; font-weight: bold;">红色大号气泡</span>（爆满）
                    - ✅ **郊区始发站**应显示为
                      <span style="color: #10b981; font-weight: bold;">绿色小气泡</span>（舒适）
                    - ⚠️ **普通站点**根据位置和线路显示不同等级

                    **阈值设定**：
                    | 等级 | 拥堵指数范围 | 颜色 | 大小倍数 |
                    |------|-------------|------|---------|
                    | 舒适 | 0.00 - 0.30 | 🟢 绿色 | ×1.0 |
                    | 普通 | 0.30 - 0.55 | 🟡 黄色 | ×1.5 |
                    | 拥挤 | 0.55 - 0.80 | 🟠 橙色 | ×2.0 |
                    | 爆满 | 0.80 - 1.00 | 🔴 红色 | ×2.5 |

                    **验证步骤**：
                    1. 早高峰时段（8:00-9:00）启动系统
                    2. 选择「实时API数据」模式
                    3. 观察核心换乘站是否为红色
                    4. 观察郊区站点是否为绿色
                    """,
                    unsafe_allow_html=True,
                )

        except ValueError as e:
            if "GAODE_TRAFFIC_KEY" in str(e):
                st.error(
                    """
                    ⚠️ 未配置高德地图API Key！

                    请在项目根目录创建 `.env` 文件，添加：
                    ```
                    GAODE_TRAFFIC_KEY=your_amap_api_key
                    ```

                    获取Key：https://console.amap.com/dev/key/app
                    """
                )
            else:
                st.error(f"错误: {e}")
        except Exception as e:
            st.error(f"发生错误: {e}")
            st.exception(e)

    else:
        st.info("👈 请在左侧面板选择城市和参数，然后点击「开始分析」按钮")

        col1, col2 = st.columns(2)

        with col1:
            st.markdown(
                """
                ### 📋 功能模块

                1. **POI爬取** (`src/poi/`)
                   - 从高德地图批量获取地铁站出入口坐标和名称

                2. **路况反推** (`src/traffic/`)
                   - 早高峰(8:00-9:00)调用高德路况API
                   - 获取地铁站周边1公里道路拥堵指数

                3. **拥挤度分级** (`src/analysis/`)
                   - 将拥堵指数映射为4个等级
                   - 换乘站额外加权

                4. **可视化** (`app.py`)
                   - Streamlit地图组件
                   - 气泡颜色和大小代表拥挤等级
                """
            )

        with col2:
            st.markdown(
                """
                ### 🔧 技术栈

                - **后端**: Python + FastAPI
                - **前端**: Streamlit
                - **数据源**: 高德地图 API
                - **数据格式**: JSON + GeoJSON

                ### 🚀 快速启动

                ```bash
                # 1. 安装依赖
                pip install -r requirements.txt

                # 2. 配置API Key
                cp .env.example .env
                # 编辑 .env 添加你的 GAODE_TRAFFIC_KEY

                # 3. 启动可视化界面
                streamlit run app.py

                # 4. 或启动API服务
                python -m src.main
                ```
                """
            )


if __name__ == "__main__":
    main()
