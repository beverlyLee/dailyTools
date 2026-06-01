import streamlit as st
import pandas as pd
from wordcloud import WordCloud
import matplotlib.pyplot as plt
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.ocr.card_parser import CardParser
from src.analysis.requirement_counter import RequirementCounter
from src.scraper.runner import DataAdapter

st.set_page_config(page_title="城市公园相亲角数据分析", layout="wide")

st.title("🏞️ 城市公园相亲角征婚启事条件分析")
st.markdown("---")

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "mock_data.csv")


def get_chinese_font():
    font_paths = [
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Medium.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
    ]
    
    for path in font_paths:
        if os.path.exists(path):
            return path
    
    return None


def get_display_columns_mapping():
    return {
        "id": "编号",
        "city": "城市",
        "content": "征婚启事原文",
        "has_hukou": "包含户口要求",
        "hukou_keywords": "户口关键词",
        "has_house": "包含房产要求",
        "house_keywords": "房产关键词",
        "has_education": "包含学历要求",
        "education_keywords": "学历关键词",
        "ocr_confidence": "OCR识别置信度",
        "ocr_corrections": "OCR校正说明"
    }


def format_display_data(df):
    df_display = df.copy()
    
    bool_columns = ["has_hukou", "has_house", "has_education"]
    for col in bool_columns:
        if col in df_display.columns:
            df_display[col] = df_display[col].map({True: "是", False: "否"})
    
    text_columns = ["hukou_keywords", "house_keywords", "education_keywords", "ocr_corrections"]
    for col in text_columns:
        if col in df_display.columns:
            df_display[col] = df_display[col].fillna("无")
            df_display[col] = df_display[col].replace("", "无")
    
    if "ocr_confidence" in df_display.columns:
        df_display["ocr_confidence"] = df_display["ocr_confidence"].apply(
            lambda x: f"{x:.1%}" if pd.notna(x) else "无数据"
        )
    
    column_mapping = get_display_columns_mapping()
    df_display = df_display.rename(columns=column_mapping)
    
    return df_display


@st.cache_data(ttl=3600, show_spinner="正在加载和解析数据...")
def load_mock_data():
    parser = CardParser(enable_ocr_simulation=True)
    df = parser.parse_csv(DATA_PATH)
    return df


@st.cache_data(show_spinner="正在从Scrapy爬虫结果加载数据...")
def load_scrapy_data(json_path):
    return DataAdapter.scrapy_to_application(json_path)


def get_data_source_info():
    sources = DataAdapter.get_available_data_sources()
    return sources


data_sources = get_data_source_info()

st.sidebar.header("⚙️ 控制面板")

st.sidebar.subheader("📦 数据源")
data_source_option = st.sidebar.radio(
    "选择数据源",
    ["内置模拟数据", "Scrapy爬虫数据"],
    key="data_source_radio",
    help="选择使用内置模拟数据或Scrapy爬虫采集的数据"
)

if data_source_option == "内置模拟数据":
    df = load_mock_data()
    data_source_name = "内置模拟数据 (mock_data.csv)"
else:
    scrapy_files = [s for s in data_sources if s['type'] == 'json']
    if scrapy_files:
        selected_file = st.sidebar.selectbox(
            "选择爬虫数据文件",
            [s['filename'] for s in scrapy_files],
            key="scrapy_file_selector"
        )
        json_path = os.path.join(os.path.dirname(__file__), "data", selected_file)
        df = load_scrapy_data(json_path)
        data_source_name = f"Scrapy数据 ({selected_file})"
    else:
        st.sidebar.warning("⚠️ 未找到Scrapy爬虫数据文件")
        st.sidebar.info("💡 将使用内置模拟数据")
        df = load_mock_data()
        data_source_name = "内置模拟数据 (fallback)"

counter = RequirementCounter()
cities = counter.get_all_cities(df)

selected_city = st.sidebar.selectbox(
    "选择城市",
    cities,
    key="city_selector",
    help="选择要查看的城市相亲角数据"
)

with st.sidebar.expander("📊 数据采集状态"):
    st.info(f"当前数据源: {data_source_name}")
    st.metric("数据记录数", f"{len(df)} 条")
    st.metric("覆盖城市数", f"{len(cities)} 个")
    if data_sources:
        st.write("可用数据文件:")
        for s in data_sources[:3]:
            st.caption(f"• {s['filename']} ({s['modified']})")

tab1, tab2, tab3, tab4 = st.tabs(["📊 词云图", "📈 统计数据", "📋 原始数据", "🔧 数据管道"])

with tab1:
    st.header(f"{selected_city}相亲角关键词词云")
    
    wordcloud_data = counter.get_wordcloud_data(df, selected_city)
    
    if wordcloud_data:
        font_path = get_chinese_font()
        
        if font_path:
            wordcloud = WordCloud(
                font_path=font_path,
                width=800,
                height=400,
                background_color="white",
                max_words=50,
                colormap="viridis",
                random_state=42
            ).generate_from_frequencies(wordcloud_data)
        else:
            wordcloud = WordCloud(
                width=800,
                height=400,
                background_color="white",
                max_words=50,
                colormap="viridis",
                random_state=42
            ).generate_from_frequencies(wordcloud_data)
        
        plt.close('all')
        fig, ax = plt.subplots(figsize=(10, 5))
        ax.imshow(wordcloud, interpolation="bilinear")
        ax.axis("off")
        st.pyplot(fig, clear_figure=True)
        
        st.success(f"✅ {selected_city}相亲角词云已生成")
        if selected_city == "北京":
            st.info("💡 观察：北京相亲角'京户'字号巨大，户口是核心硬性要求")
        elif selected_city == "上海":
            st.info("💡 观察：上海相亲角'有房'是高频词，房产是重要条件")
        
        with st.expander("📋 查看词云数据明细"):
            st.dataframe(
                pd.DataFrame({
                    "关键词": list(wordcloud_data.keys()),
                    "权重": list(wordcloud_data.values())
                }).sort_values("权重", ascending=False),
                width="stretch"
            )
    else:
        st.warning("暂无词云数据")

with tab2:
    st.header("各城市相亲条件统计")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.subheader("🏠 户口要求")
        hukou_counts = counter.count_hukou(df)
        hukou_df = pd.DataFrame({
            "城市": list(hukou_counts.keys()),
            "提及次数": list(hukou_counts.values())
        }).sort_values("提及次数", ascending=False)
        st.bar_chart(hukou_df.set_index("城市"))
    
    with col2:
        st.subheader("🏡 房产要求")
        house_counts = counter.count_house(df)
        house_df = pd.DataFrame({
            "城市": list(house_counts.keys()),
            "提及次数": list(house_counts.values())
        }).sort_values("提及次数", ascending=False)
        st.bar_chart(house_df.set_index("城市"))
    
    with col3:
        st.subheader("🎓 学历要求")
        edu_counts = counter.count_education(df)
        edu_data = []
        for city, edu in edu_counts.items():
            edu_data.append({
                "城市": city,
                "博士": edu.get("博士", 0),
                "硕士": edu.get("硕士", 0),
                "本科": edu.get("本科", 0)
            })
        edu_df = pd.DataFrame(edu_data).set_index("城市")
        st.bar_chart(edu_df)

with tab3:
    st.header("原始征婚启事数据")
    
    city_filter = st.selectbox(
        "筛选城市",
        ["全部"] + cities,
        index=(["全部"] + cities).index(selected_city),
        key="data_filter_city",
        help="筛选查看指定城市的征婚数据"
    )
    
    if city_filter == "全部":
        display_df = df
    else:
        display_df = df[df["city"] == city_filter]
    
    display_df_formatted = format_display_data(display_df)
    
    st.dataframe(display_df_formatted, width="stretch")
    st.caption(f"共 {len(display_df_formatted)} 条记录")
    
    st.download_button(
        label="📥 下载CSV数据",
        data=df.to_csv(index=False).encode("utf-8"),
        file_name="matchmaking_data.csv",
        mime="text/csv",
        key="download_csv"
    )
    
    with st.expander("🔍 OCR识别详情示例"):
        if len(display_df) > 0:
            sample_content = display_df.iloc[0]["content"]
            parser = CardParser(enable_ocr_simulation=True)
            ocr_details = parser.get_ocr_details(sample_content)
            
            if ocr_details:
                st.write(f"**整体置信度**: {ocr_details.get('overall_confidence', 0):.2%}")
                st.write("**各识别区域**:")
                for region in ocr_details.get('regions', []):
                    with st.container():
                        col_a, col_b, col_c = st.columns(3)
                        with col_a:
                            st.write(f"区域: {region['name']}")
                        with col_b:
                            st.write(f"文本: {region['text']}")
                        with col_c:
                            st.write(f"置信度: {region['confidence']:.2%}")
                        if region['correction']:
                            st.caption(f"⚠️ {region['correction']}")
                        st.divider()

with tab4:
    st.header("🔧 数据管道监控")
    st.markdown("---")
    
    st.subheader("📥 Scrapy 爬虫架构")
    
    col_a, col_b, col_c = st.columns(3)
    
    with col_a:
        st.info("**爬虫定义 (Spider)**")
        st.caption("• MatchmakingSpider")
        st.caption("• 6个城市，17个公园")
        st.caption("• 模拟数据生成器")
        st.code("src/scraper/spiders/matchmaking_spider.py", language="python")
    
    with col_b:
        st.info("**数据管道 (Pipelines)**")
        st.caption("• DuplicatesPipeline: 去重")
        st.caption("• OCRValidationPipeline: 质量评估")
        st.caption("• MatchmakingPipeline: 持久化")
        st.code("src/scraper/pipelines.py", language="python")
    
    with col_c:
        st.info("**数据模型 (Items)**")
        st.caption("• item_id, city, park_name")
        st.caption("• ocr_raw_text, confidence")
        st.caption("• parsed_* 解析字段")
        st.code("src/scraper/items.py", language="python")
    
    st.markdown("---")
    st.subheader("📊 数据流转示意图")
    
    flow_code = """
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Scrapy Spider  │    │  Data Pipeline  │    │  Streamlit App  │
│  (数据采集)     │───▶│  (清洗/评估)    │───▶│  (分析/可视化)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                      │                      │
         ▼                      ▼                      ▼
    公园公示牌照片       OCR置信度评估         词云图/统计图表
    OCR识别结果         去重/校正             原始数据展示
    """
    st.code(flow_code, language="text")
    
    st.markdown("---")
    st.subheader("📦 可用数据文件")
    
    if data_sources:
        source_df = pd.DataFrame(data_sources)
        source_df = source_df.rename(columns={
            "filename": "文件名",
            "type": "类型",
            "size": "大小(字节)",
            "modified": "修改时间"
        })
        st.dataframe(source_df, width="stretch")
    else:
        st.info("暂无数据文件，使用内置模拟数据")

st.markdown("---")
st.caption(f"数据来源：{data_source_name} | 技术栈: Python + Scrapy + Streamlit")
