import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime

from collector.data_loader import CommentDataLoader
from analyzer.sentiment_analyzer import SentimentAnalyzer


st.set_page_config(
    page_title="社交媒体情感分析",
    page_icon="📊",
    layout="wide"
)

st.title("📊 社交媒体情感分析系统")

st.sidebar.header("配置")

use_volcengine = st.sidebar.checkbox("使用火山大模型增强分析", value=False)
if use_volcengine:
    st.sidebar.info("需要在 .env 文件中配置 ARK_API_KEY")

data_loader = CommentDataLoader(data_dir="../data")
analyzer = SentimentAnalyzer()

available_files = data_loader.get_available_files()

if not available_files:
    st.warning("⚠️ data 目录中没有找到评论数据文件，请添加 CSV 或 JSON 文件")
    st.info("支持的数据格式: CSV (需包含 comment, date 列), JSON")
    st.stop()

selected_file = st.sidebar.selectbox(
    "选择评论数据文件",
    available_files
)

@st.cache_data
def load_and_analyze_data(filename, _use_volcengine):
    df = data_loader.load_comments(filename)
    
    if not data_loader.validate_data(df):
        return None, None
    
    comments = df['comment'].tolist()
    results = analyzer.batch_analyze(comments, use_volcengine=_use_volcengine)
    
    df['sentiment'] = [r['final_sentiment'] for r in results]
    df['sentiment_label'] = [r['final_label'] for r in results]
    df['snownlp_score'] = [r['snownlp']['score'] for r in results]
    
    if 'date' in df.columns:
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
    
    stats = analyzer.get_sentiment_stats(results)
    
    return df, stats

with st.spinner("正在加载和分析数据..."):
    df, stats = load_and_analyze_data(selected_file, use_volcengine)

if df is None:
    st.error("数据格式不正确，请确保包含 'comment' 和 'date' 列")
    st.stop()

col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric("总评论数", stats['total'])

with col2:
    st.metric("积极评论", f"{stats['positive']} ({stats['positive_ratio']:.1%})")

with col3:
    st.metric("消极评论", f"{stats['negative']} ({stats['negative_ratio']:.1%})")

with col4:
    st.metric("中性评论", f"{stats['neutral']} ({stats['neutral_ratio']:.1%})")

st.divider()

col_pie, col_line = st.columns(2)

with col_pie:
    st.subheader("情感分布饼图")
    pie_data = pd.DataFrame({
        '情感': ['积极', '消极', '中性'],
        '数量': [stats['positive'], stats['negative'], stats['neutral']],
        '颜色': ['#4CAF50', '#F44336', '#FFC107']
    })
    
    fig_pie = px.pie(
        pie_data,
        values='数量',
        names='情感',
        color='情感',
        color_discrete_map={'积极': '#4CAF50', '消极': '#F44336', '中性': '#FFC107'},
        hole=0.3
    )
    st.plotly_chart(fig_pie, use_container_width=True)

with col_line:
    st.subheader("情绪随时间变化")
    if 'date' in df.columns:
        df_time = df.copy()
        df_time['sentiment_num'] = df_time['sentiment'].map({
            'positive': 1,
            'neutral': 0,
            'negative': -1
        })
        
        df_daily = df_time.groupby(df_time['date'].dt.date).agg({
            'sentiment_num': ['mean', 'count']
        }).reset_index()
        df_daily.columns = ['date', 'avg_sentiment', 'count']
        
        fig_line = px.line(
            df_daily,
            x='date',
            y='avg_sentiment',
            labels={'avg_sentiment': '平均情感指数', 'date': '日期'},
            title='情感指数时间趋势'
        )
        fig_line.add_hline(y=0, line_dash="dash", line_color="gray")
        fig_line.update_layout(yaxis_range=[-1, 1])
        st.plotly_chart(fig_line, use_container_width=True)
    else:
        st.info("数据中缺少日期列，无法显示时间趋势")

st.divider()

st.subheader("单条评论分析")

sample_comment = st.selectbox(
    "选择评论查看详情",
    df['comment'].tolist()
)

if sample_comment:
    with st.spinner("分析中..."):
        result = analyzer.analyze(sample_comment, use_volcengine=use_volcengine)
        
        col_left, col_right = st.columns(2)
        
        with col_left:
            st.info("评论文本")
            st.write(sample_comment)
            
            st.subheader("SnowNLP 分析结果")
            st.write(f"情感得分: {result['snownlp']['score']:.4f}")
            st.write(f"情感倾向: {result['snownlp']['sentiment_label']}")
            st.write(f"关键词: {', '.join(result['snownlp']['keywords'])}")
            st.write(f"摘要: {', '.join(result['snownlp']['summary'])}")
        
        with col_right:
            if use_volcengine and 'volcengine' in result and 'error' not in result['volcengine']:
                st.subheader("火山大模型分析结果")
                volc = result['volcengine']
                st.write(f"情感标签: {volc.get('sentiment_label', 'N/A')}")
                st.write(f"置信度: {volc.get('confidence', 0):.2f}")
                
                emotions = volc.get('emotions', {})
                if emotions:
                    emotion_names = {
                        'joy': '喜悦',
                        'anger': '愤怒',
                        'sadness': '悲伤',
                        'surprise': '惊讶',
                        'fear': '恐惧',
                        'disgust': '厌恶'
                    }
                    
                    emotion_df = pd.DataFrame({
                        '情绪': [emotion_names.get(k, k) for k in emotions.keys()],
                        '得分': list(emotions.values())
                    })
                    
                    fig_bar = px.bar(
                        emotion_df,
                        x='情绪',
                        y='得分',
                        color='情绪',
                        title='多维度情绪分析'
                    )
                    st.plotly_chart(fig_bar, use_container_width=True)
            else:
                st.info("火山大模型分析未启用或配置缺失")

st.divider()

st.subheader("评论详情列表")
display_df = df[['date', 'comment', 'sentiment_label', 'snownlp_score']].copy()
display_df.columns = ['日期', '评论内容', '情感标签', '情感得分']
st.dataframe(display_df, use_container_width=True)

st.divider()

st.subheader("自定义评论分析")
user_input = st.text_area("输入你想分析的评论", "")
if st.button("分析") and user_input:
    with st.spinner("分析中..."):
        result = analyzer.analyze(user_input, use_volcengine=use_volcengine)
        
        st.success(f"分析结果: {result['final_label']}")
        st.write(f"SnowNLP 情感得分: {result['snownlp']['score']:.4f}")
        
        if use_volcengine and 'volcengine' in result and 'error' not in result['volcengine']:
            volc = result['volcengine']
            st.write(f"火山大模型标签: {volc.get('sentiment_label', 'N/A')}")
            st.write(f"置信度: {volc.get('confidence', 0):.2f}")
