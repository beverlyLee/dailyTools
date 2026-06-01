#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
新能源汽车市场趋势分析系统 - Streamlit Web应用
"""

import os
import sys
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tidy_data import load_and_clean_data, generate_mock_data, get_data_source_info
from metrics import calculate_metrics, calculate_yearly_summary
from ai_report.generate_report import call_volc_rest_api, prepare_data_summary

st.set_page_config(
    page_title="新能源汽车市场分析系统",
    page_icon="🚗",
    layout="wide",
    initial_sidebar_state="expanded"
)

def ensure_numeric_types(df):
    """确保数值列类型正确，文本列保留字符串类型"""
    df = df.copy()
    
    numeric_columns = [
        'total_sales', 'ev_sales', 'bev', 'phev',
        'penetration_rate', 'bev_ratio', 'phev_ratio',
        'total_sales_mom', 'ev_sales_mom',
        'total_sales_yoy', 'ev_sales_yoy',
        'penetration_rate_ma', 'ev_sales_ma', 'total_sales_ma'
    ]
    
    for col in numeric_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    if 'date' in df.columns:
        df['date'] = df['date'].astype(str)
    
    return df


def get_numeric_format_styler(df):
    """只对数值列设置浮点格式，文本列保持原样"""
    numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
    format_dict = {col: "{:.2f}" for col in numeric_cols}
    return df.style.format(format_dict)


def display_dataframe_safely(df, title=""):
    """安全显示DataFrame，出错时降级处理"""
    try:
        styler = get_numeric_format_styler(df)
        st.dataframe(styler, use_container_width=True)
    except Exception as e:
        st.warning(f"{title} 格式化显示异常，以原始格式展示: {str(e)}")
        st.dataframe(df, use_container_width=True)


def safe_numeric(val, default=0.0):
    """安全转换数值"""
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def get_kpi_cards(df):
    """获取KPI指标卡片数据"""
    try:
        latest = df.iloc[-1]
        prev = df.iloc[-2] if len(df) > 1 else df.iloc[0]
        
        penetration_rate = safe_numeric(latest.get('penetration_rate', 0))
        prev_penetration = safe_numeric(prev.get('penetration_rate', 0))
        total_sales = safe_numeric(latest.get('total_sales', 0))
        prev_total_sales = safe_numeric(prev.get('total_sales', 1))
        ev_sales = safe_numeric(latest.get('ev_sales', 0))
        prev_ev_sales = safe_numeric(prev.get('ev_sales', 1))
        bev_ratio = safe_numeric(latest.get('bev_ratio', 0))
        phev_ratio = safe_numeric(latest.get('phev_ratio', 0))
        
        return {
            'latest_date': str(latest.get('date', 'N/A')),
            'penetration_rate': penetration_rate * 100,
            'penetration_rate_change': (penetration_rate - prev_penetration) * 100,
            'total_sales': total_sales,
            'total_sales_change': (total_sales - prev_total_sales) / prev_total_sales * 100,
            'ev_sales': ev_sales,
            'ev_sales_change': (ev_sales - prev_ev_sales) / prev_ev_sales * 100,
            'bev_ratio': bev_ratio * 100,
            'phev_ratio': phev_ratio * 100,
        }
    except Exception as e:
        st.warning(f"KPI数据计算异常: {str(e)}")
        return {
            'latest_date': 'N/A',
            'penetration_rate': 0,
            'penetration_rate_change': 0,
            'total_sales': 0,
            'total_sales_change': 0,
            'ev_sales': 0,
            'ev_sales_change': 0,
            'bev_ratio': 0,
            'phev_ratio': 0,
        }


def filter_data_by_date(df, start_date, end_date):
    """根据日期范围过滤数据"""
    df = df.copy()
    
    try:
        start_str = start_date.strftime('%Y-%m')
        end_str = end_date.strftime('%Y-%m')
        
        df_filtered = df[(df['date'] >= start_str) & (df['date'] <= end_str)].reset_index(drop=True)
        
        if len(df_filtered) == 0:
            st.warning("筛选结果为空，已自动恢复显示全部数据")
            return df
        
        return df_filtered
    except Exception as e:
        st.warning(f"日期筛选异常: {str(e)}，已自动恢复显示全部数据")
        return df


def plot_penetration_trend(df):
    """渗透率趋势图"""
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=df['date'],
        y=df['penetration_rate'] * 100,
        mode='lines+markers',
        name='月度渗透率',
        line=dict(color='#1f77b4', width=2),
        marker=dict(size=4)
    ))
    
    if 'penetration_rate_ma' in df.columns:
        fig.add_trace(go.Scatter(
            x=df['date'],
            y=df['penetration_rate_ma'] * 100,
            mode='lines',
            name='3月移动平均',
            line=dict(color='#ff7f0e', width=3)
        ))
    
    fig.update_layout(
        title='新能源汽车渗透率趋势',
        xaxis_title='日期',
        yaxis_title='渗透率 (%)',
        hovermode='x unified',
        template='plotly_white',
        height=400,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    
    return fig


def plot_bev_phev_structure(df):
    """BEV/PHEV销量结构"""
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=df['date'],
        y=df['bev'],
        mode='lines',
        stackgroup='one',
        name='BEV',
        line=dict(color='#2ca02c', width=2),
        fillcolor='rgba(44, 160, 44, 0.8)'
    ))
    
    fig.add_trace(go.Scatter(
        x=df['date'],
        y=df['phev'],
        mode='lines',
        stackgroup='one',
        name='PHEV',
        line=dict(color='#9467bd', width=2),
        fillcolor='rgba(148, 103, 189, 0.8)'
    ))
    
    fig.update_layout(
        title='BEV vs PHEV销量结构',
        xaxis_title='日期',
        yaxis_title='销量',
        hovermode='x unified',
        template='plotly_white',
        height=400,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    
    return fig


def plot_bev_phev_ratio(df):
    """BEV/PHEV占比趋势"""
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=df['date'],
        y=df['bev_ratio'] * 100,
        mode='lines',
        stackgroup='one',
        name='BEV占比',
        line=dict(color='#2ca02c', width=2),
        fillcolor='rgba(44, 160, 44, 0.8)'
    ))
    
    fig.add_trace(go.Scatter(
        x=df['date'],
        y=df['phev_ratio'] * 100,
        mode='lines',
        stackgroup='one',
        name='PHEV占比',
        line=dict(color='#9467bd', width=2),
        fillcolor='rgba(148, 103, 189, 0.8)'
    ))
    
    fig.update_layout(
        title='BEV/PHEV占比变化趋势',
        xaxis_title='日期',
        yaxis_title='占比 (%)',
        hovermode='x unified',
        template='plotly_white',
        height=400,
        yaxis=dict(range=[0, 100]),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    
    return fig


def plot_sales_comparison(df):
    """销量对比图"""
    fig = make_subplots(specs=[[{"secondary_y": True}]])
    
    fig.add_trace(
        go.Bar(x=df['date'], y=df['total_sales'], name='总销量',
               marker_color='rgba(31, 119, 180, 0.3)'),
        secondary_y=False,
    )
    
    fig.add_trace(
        go.Scatter(x=df['date'], y=df['ev_sales'], name='新能源销量',
                   mode='lines+markers', line=dict(color='#ff7f0e', width=2)),
        secondary_y=True,
    )
    
    fig.update_layout(
        title='新能源销量 vs 总销量对比',
        hovermode='x unified',
        template='plotly_white',
        height=400,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    
    fig.update_yaxes(title_text="总销量", secondary_y=False)
    fig.update_yaxes(title_text="新能源销量", secondary_y=True)
    
    return fig


def plot_yoy_growth(df):
    """同比增速图"""
    df_valid = df.dropna(subset=['total_sales_yoy', 'ev_sales_yoy'])
    
    if len(df_valid) < 3:
        return None
    
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=df_valid['date'],
        y=df_valid['total_sales_yoy'],
        mode='lines+markers',
        name='总销量同比',
        line=dict(color='#1f77b4', width=2)
    ))
    
    fig.add_trace(go.Scatter(
        x=df_valid['date'],
        y=df_valid['ev_sales_yoy'],
        mode='lines+markers',
        name='新能源销量同比',
        line=dict(color='#ff7f0e', width=2)
    ))
    
    fig.add_hline(y=0, line_dash="dash", line_color="gray")
    
    fig.update_layout(
        title='同比增速对比',
        xaxis_title='日期',
        yaxis_title='同比增速 (%)',
        hovermode='x unified',
        template='plotly_white',
        height=400,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    
    return fig


def generate_ai_analysis(df, yearly_df, custom_prompt=None):
    """生成AI分析报告"""
    summary = prepare_data_summary(df, yearly_df)
    
    if custom_prompt:
        base_prompt = custom_prompt
    else:
        base_prompt = f"""
你是一位资深汽车行业分析师，请根据以下数据撰写一份专业的新能源汽车市场月度分析报告。

最新数据:
- 报告日期: {summary['report_date']}
- 新能源渗透率: {summary['latest_metrics']['penetration_rate']}
- 总销量: {summary['latest_metrics']['total_sales']}
- 新能源销量: {summary['latest_metrics']['ev_sales']}
- BEV销量: {summary['latest_metrics']['bev_sales']}
- PHEV销量: {summary['latest_metrics']['phev_sales']}
- BEV占比: {summary['latest_metrics']['bev_ratio']}
- PHEV占比: {summary['latest_metrics']['phev_ratio']}

趋势分析:
- 渗透率变化: {summary['trend']['penetration_start']} -> {summary['trend']['penetration_latest']}
- BEV占比趋势: {summary['trend']['bev_ratio_trend']}

请撰写一份包含以下部分的专业报告:
1. 市场概况
2. 渗透率深度分析
3. 产品结构变化(BEV vs PHEV)
4. 增长动力分析
5. 未来展望与风险提示

要求:
- 语言专业、数据准确
- 分析有深度，不只是罗列数据
- 结合行业背景和趋势
- 格式清晰，使用Markdown
- 字数约1000-1500字
"""
    
    with st.spinner('AI正在分析数据，请稍候...'):
        result = call_volc_rest_api(base_prompt)
    
    if result:
        return result
    else:
        return "⚠️ AI服务暂时不可用，请检查API配置或稍后重试。"


def main():
    """主函数"""
    st.title("🚗 新能源汽车市场趋势分析系统")
    st.markdown("---")
    
    try:
        if 'data_loaded' not in st.session_state:
            with st.spinner('正在加载数据...'):
                df_clean = load_and_clean_data()
                df_with_metrics = calculate_metrics(df_clean)
                yearly_df = calculate_yearly_summary(df_with_metrics)
                
                df_clean = ensure_numeric_types(df_clean)
                df_with_metrics = ensure_numeric_types(df_with_metrics)
                yearly_df = ensure_numeric_types(yearly_df)
                
                st.session_state.df_clean = df_clean
                st.session_state.df_with_metrics = df_with_metrics
                st.session_state.yearly_df = yearly_df
                st.session_state.data_loaded = True
        else:
            df_clean = st.session_state.df_clean
            df_with_metrics = st.session_state.df_with_metrics
            yearly_df = st.session_state.yearly_df
    except Exception as e:
        st.error(f"数据加载失败: {str(e)}")
        st.warning("正在使用备用数据方案...")
        df_clean = generate_mock_data()
        df_with_metrics = calculate_metrics(df_clean)
        yearly_df = calculate_yearly_summary(df_with_metrics)
        df_clean = ensure_numeric_types(df_clean)
        df_with_metrics = ensure_numeric_types(df_with_metrics)
        yearly_df = ensure_numeric_types(yearly_df)
    
    with st.sidebar:
        st.header("⚙️ 系统设置")
        
        st.subheader("📊 数据来源")
        data_info = get_data_source_info()
        st.success(f"✅ 主数据源: {data_info['primary_source']['name']}")
        st.info(f"数据覆盖: 2020年1月 - {df_with_metrics['date'].max()}")
        
        with st.expander("查看详细数据来源说明"):
            st.write(f"**主数据源**: {data_info['primary_source']['name']}")
            st.write(f"**官网**: {data_info['primary_source']['website']}")
            st.write(f"**数据类型**: {data_info['primary_source']['data_type']}")
            st.markdown("**数据说明**:")
            for note in data_info['data_notes']:
                st.write(f"- {note}")
            st.markdown(f"**兜底模式**: {data_info['fallback_mode']}")
        
        st.markdown("---")
        
        st.subheader("📅 数据时间范围")
        min_date = df_with_metrics['date'].min()
        max_date = df_with_metrics['date'].max()
        
        col_start, col_end = st.columns(2)
        with col_start:
            start_date = st.date_input(
                "开始日期",
                value=datetime.strptime(min_date, "%Y-%m").date(),
                min_value=datetime.strptime(min_date, "%Y-%m").date(),
                max_value=datetime.strptime(max_date, "%Y-%m").date()
            )
        with col_end:
            end_date = st.date_input(
                "结束日期",
                value=datetime.strptime(max_date, "%Y-%m").date(),
                min_value=datetime.strptime(min_date, "%Y-%m").date(),
                max_value=datetime.strptime(max_date, "%Y-%m").date()
            )
        
        col_btn1, col_btn2 = st.columns(2)
        with col_btn1:
            if st.button("🔍 查询数据", use_container_width=True, type="primary"):
                if start_date > end_date:
                    st.error("开始日期不能晚于结束日期")
                else:
                    df_filtered = filter_data_by_date(df_with_metrics, start_date, end_date)
                    yearly_filtered = calculate_yearly_summary(df_filtered)
                    yearly_filtered = ensure_numeric_types(yearly_filtered)
                    
                    st.session_state.df_filtered = df_filtered
                    st.session_state.yearly_filtered = yearly_filtered
                    st.success(f"✅ 数据筛选成功！共 {len(df_filtered)} 条记录")
        
        with col_btn2:
            if st.button("🔄 重置范围", use_container_width=True):
                if 'df_filtered' in st.session_state:
                    del st.session_state.df_filtered
                if 'yearly_filtered' in st.session_state:
                    del st.session_state.yearly_filtered
                st.success("✅ 已恢复全部数据")
        
        st.markdown("---")
        
        st.subheader("📊 图表选项")
        chart_height = st.slider("图表高度", 300, 600, 400)
        
        st.markdown("---")
        st.info("💡 提示：配置ARK_API_KEY环境变量以启用AI分析功能")
    
    if 'df_filtered' in st.session_state:
        display_df = st.session_state.df_filtered
        display_yearly = st.session_state.yearly_filtered
        st.info(f"📅 当前显示范围: {display_df['date'].iloc[0]} 至 {display_df['date'].iloc[-1]} (共 {len(display_df)} 个月)")
    else:
        display_df = df_with_metrics
        display_yearly = yearly_df
    
    kpis = get_kpi_cards(display_df)
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            label="📈 最新渗透率",
            value=f"{kpis['penetration_rate']:.1f}%",
            delta=f"{kpis['penetration_rate_change']:.2f}%"
        )
    
    with col2:
        st.metric(
            label="🚗 总销量",
            value=f"{kpis['total_sales']/10000:.1f}万",
            delta=f"{kpis['total_sales_change']:.1f}%"
        )
    
    with col3:
        st.metric(
            label="⚡ 新能源销量",
            value=f"{kpis['ev_sales']/10000:.1f}万",
            delta=f"{kpis['ev_sales_change']:.1f}%"
        )
    
    with col4:
        st.metric(
            label="🔋 BEV/PHEV占比",
            value=f"{kpis['bev_ratio']:.1f}% / {kpis['phev_ratio']:.1f}%"
        )
    
    st.markdown(f"📅 数据日期: {kpis['latest_date']}")
    st.markdown("---")
    
    tab1, tab2, tab3 = st.tabs(["📊 数据可视化", "🤖 AI智能解读", "📋 数据详情"])
    
    with tab1:
        st.header("数据可视化分析")
        
        col_left, col_right = st.columns(2)
        
        with col_left:
            fig_penetration = plot_penetration_trend(display_df)
            fig_penetration.update_layout(height=chart_height)
            st.plotly_chart(fig_penetration, use_container_width=True)
            
            fig_ratio = plot_bev_phev_ratio(display_df)
            fig_ratio.update_layout(height=chart_height)
            st.plotly_chart(fig_ratio, use_container_width=True)
        
        with col_right:
            fig_structure = plot_bev_phev_structure(display_df)
            fig_structure.update_layout(height=chart_height)
            st.plotly_chart(fig_structure, use_container_width=True)
            
            fig_sales = plot_sales_comparison(display_df)
            fig_sales.update_layout(height=chart_height)
            st.plotly_chart(fig_sales, use_container_width=True)
        
        fig_yoy = plot_yoy_growth(display_df)
        if fig_yoy:
            fig_yoy.update_layout(height=chart_height)
            st.plotly_chart(fig_yoy, use_container_width=True)
    
    with tab2:
        st.header("AI智能解读")
        
        st.markdown("### 🎯 快速分析")
        
        col_ai1, col_ai2, col_ai3 = st.columns(3)
        
        ai_result = None
        
        with col_ai1:
            if st.button("📝 生成完整市场分析报告", use_container_width=True):
                ai_result = generate_ai_analysis(display_df, display_yearly)
        
        with col_ai2:
            if st.button("🔍 深度解读渗透率趋势", use_container_width=True):
                custom_prompt = f"""
请作为资深汽车分析师，深度解读新能源汽车渗透率变化趋势。
当前渗透率{display_df.iloc[-1]['penetration_rate']*100:.1f}%，
从{display_df.iloc[0]['penetration_rate']*100:.1f}%增长至今。

请分析：
1. 渗透率增长的关键驱动因素
2. 不同阶段的增长特点
3. 未来渗透率走势预测
4. 对行业格局的影响

用专业、精炼的语言回答，约500字。
"""
                ai_result = generate_ai_analysis(display_df, display_yearly, custom_prompt)
        
        with col_ai3:
            if st.button("📊 BEV vs PHEV 结构分析", use_container_width=True):
                custom_prompt = f"""
请作为资深汽车分析师，分析BEV和PHEV的市场结构变化。
当前BEV占比{display_df.iloc[-1]['bev_ratio']*100:.1f}%，PHEV占比{display_df.iloc[-1]['phev_ratio']*100:.1f}%。

请分析：
1. BEV和PHEV各自的市场定位和用户群体
2. 两者比例变化背后的原因
3. 未来两者的市场份额走势预测
4. 对企业产品策略的建议

用专业、精炼的语言回答，约500字。
"""
                ai_result = generate_ai_analysis(display_df, display_yearly, custom_prompt)
        
        st.markdown("---")
        
        with st.expander("✏️ 自定义提问"):
            user_question = st.text_area("输入您的问题，让AI帮您分析：", 
                                        placeholder="例如：新能源汽车市场未来3年的发展趋势如何？")
            if st.button("提交问题") and user_question:
                summary = prepare_data_summary(display_df, display_yearly)
                context_prompt = f"""
基于以下新能源汽车市场数据，回答用户的问题：

最新数据:
- 报告日期: {summary['report_date']}
- 新能源渗透率: {summary['latest_metrics']['penetration_rate']}
- 总销量: {summary['latest_metrics']['total_sales']}
- 新能源销量: {summary['latest_metrics']['ev_sales']}
- BEV占比: {summary['latest_metrics']['bev_ratio']}
- PHEV占比: {summary['latest_metrics']['phev_ratio']}

趋势分析:
- 渗透率变化: {summary['trend']['penetration_start']} -> {summary['trend']['penetration_latest']}

用户问题: {user_question}

请用专业、精炼的语言回答，结合数据给出有深度的见解。
"""
                ai_result = generate_ai_analysis(display_df, display_yearly, context_prompt)
        
        if ai_result:
            st.markdown("---")
            st.markdown("### 📄 AI分析结果")
            st.markdown(ai_result)
            
            st.download_button(
                label="💾 下载分析报告",
                data=ai_result,
                file_name=f"ev_market_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md",
                mime="text/markdown"
            )
    
    with tab3:
        st.header("数据详情")
        
        try:
            st.subheader("年度汇总数据")
            display_dataframe_safely(display_yearly, "年度汇总数据")
            
            st.subheader("完整月度数据")
            display_dataframe_safely(display_df, "完整月度数据")
            
            try:
                csv = display_df.to_csv(index=False, encoding='utf-8-sig')
                st.download_button(
                    label="📥 下载完整数据 (CSV)",
                    data=csv,
                    file_name="ev_market_data.csv",
                    mime="text/csv"
                )
            except Exception as e:
                st.warning(f"CSV导出功能暂时不可用: {str(e)}")
                
        except Exception as e:
            st.error(f"数据详情模块加载异常: {str(e)}")
            st.info("其他模块功能不受影响，可正常使用。")
            
            try:
                st.subheader("原始数据预览")
                st.dataframe(display_df.head(20), use_container_width=True)
            except:
                st.warning("原始数据预览也无法加载")
    
    st.markdown("---")
    st.markdown("""
    <div style='text-align: center; color: #888;'>
        <p>🚗 新能源汽车市场趋势分析系统 | 数据驱动决策</p>
    </div>
    """, unsafe_allow_html=True)


if __name__ == "__main__":
    main()
