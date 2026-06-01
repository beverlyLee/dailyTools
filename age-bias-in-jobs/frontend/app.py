import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import sys
import os

sys.path.append(os.path.dirname(__file__))
from api_client import APIClient


st.set_page_config(
    page_title="招聘市场年龄歧视分析",
    page_icon="📊",
    layout="wide"
)


client = APIClient(base_url="http://localhost:8001")


def check_api_connection():
    status = client.get_status()
    if status is None:
        st.warning("⚠️ 后端API连接失败，请确保FastAPI服务正在运行 (http://localhost:8000)")
        return False
    return True


def generate_funnel_chart(funnel_data, industry_name):
    age_groups = [item['age_group'] for item in funnel_data]
    candidates = [item['candidates'] for item in funnel_data]
    rates = [item['invitation_rate'] * 100 for item in funnel_data]
    
    hover_texts = [
        f"<b>{group}</b><br>邀约人数: {cand}人<br>邀约率: {rate:.1f}%<br>转化率: {cand/candidates[0]*100:.1f}%"
        for group, cand, rate in zip(age_groups, candidates, rates)
    ]
    
    fig = go.Figure(go.Funnel(
        y=age_groups,
        x=candidates,
        textposition="inside",
        textinfo="value+percent initial",
        hovertext=hover_texts,
        hoverinfo="text",
        opacity=0.85,
        marker={
            "color": ['#1f77b4', '#2ca02c', '#ff7f0e', '#d62728', '#9467bd', '#8c564b'],
            "line": {"width": [3, 3, 3, 3, 3, 3], "color": "white"}
        },
        connector={"line": {"color": "lightgray", "dash": "solid", "width": 2}}
    ))
    
    fig.update_layout(
        title={
            "text": f"{industry_name} - 各年龄段面试邀约率漏斗图",
            "y": 0.95,
            "x": 0.5,
            "xanchor": "center",
            "yanchor": "top",
            "font": {"size": 20}
        },
        height=600,
        plot_bgcolor='white',
        paper_bgcolor='white',
        yaxis={
            "title": "年龄段",
            "title_font": {"size": 14},
            "tickfont": {"size": 12}
        },
        xaxis={
            "title": "获得面试邀约人数 (初始1000人)",
            "title_font": {"size": 14},
            "tickfont": {"size": 12}
        }
    )
    
    return fig


def main():
    st.title("📊 招聘市场年龄歧视分析系统")
    st.markdown("---")
    
    api_connected = check_api_connection()
    
    with st.sidebar:
        st.header("🔧 设置")
        
        st.subheader("数据源选择")
        source_option = st.selectbox(
            "选择数据来源",
            ["全部", "Boss直聘", "拉勾招聘"],
            index=0
        )
        
        st.markdown("---")
        
        st.subheader("🤖 AI模型配置")
        
        model_name = st.text_input(
            "模型名称",
            value="doubao-seed-1-8-251228",
            help="从火山引擎ARK控制台获取的模型ID，注意使用横杠而非点号"
        )
        
        api_key = st.text_input(
            "API Key",
            type="password",
            help="从火山引擎控制台获取的API Key"
        )
        
        temperature = st.slider(
            "温度参数",
            min_value=0.0,
            max_value=2.0,
            value=0.7,
            step=0.1,
            help="值越高输出越有创造性，越低越稳定"
        )
        
        col_test1, col_test2 = st.columns(2)
        
        with col_test1:
            test_button = st.button("🧪 测试连接", use_container_width=True)
        
        with col_test2:
            pass
        
        if test_button and api_connected:
            if not api_key:
                st.error("❌ 请先输入API Key")
            else:
                with st.spinner("正在测试API连接..."):
                    result = client.test_ai_connection(api_key, model_name)
                    if result:
                        if result.get('success'):
                            st.success("✅ API连接测试成功！")
                            with st.expander("查看测试结果"):
                                st.write(result.get('result'))
                        else:
                            st.error(f"❌ API连接测试失败")
                            with st.expander("查看错误详情"):
                                st.error(result.get('message'))
        
        st.markdown("---")
        
        with st.expander("📚 使用说明"):
            st.markdown("""
            **获取API Key和模型ID的步骤：**
            1. 访问 [火山引擎控制台](https://console.volcengine.com/ark)
            2. 进入智能方舟（ARK）服务
            3. 创建推理接入点，选择模型（如 doubao-seed-1.8-251228）
            4. 创建API Key并复制
            5. 将API Key和模型ID填入上方
            
            **启动后端服务：**
            ```bash
            cd backend
            pip install -r requirements.txt
            uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
            ```
            """)
        
        st.markdown("---")
        st.caption("v2.0 | 前后端分离架构")
    
    if not api_connected:
        st.error("❌ 无法连接到后端API服务，请确保FastAPI服务正在运行")
        st.info("💡 请在终端中执行: `cd backend && uvicorn app.main:app --reload --port 8000`")
        return
    
    stats = client.get_overall_statistics(source=source_option)
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        total_jobs = stats.get('total_jobs', 0) if stats else 0
        st.metric("分析职位总数", f"{total_jobs}个")
    
    with col2:
        st.metric("数据源", source_option)
    
    with col3:
        overall_ratio = stats.get('overall_age_limit_ratio', 0) if stats else 0
        st.metric("整体年龄限制比例", f"{overall_ratio * 100:.1f}%")
    
    with col4:
        most_biased = stats.get('most_biased_industry', 'N/A') if stats else 'N/A'
        st.metric("最严重行业", most_biased)
    
    st.markdown("---")
    
    tab1, tab2, tab3, tab4 = st.tabs(["🔍 年龄限制分析", "📈 行业对比", "🎯 面试漏斗图", "💡 AI应对建议"])
    
    with tab1:
        st.header("年龄限制关键词提取分析")
        
        industry_filter = st.selectbox(
            "筛选行业",
            ["全部"] + (client.get_industries() if api_connected else [])
        )
        
        sample_jobs = client.get_sample_jobs(count=20)
        if sample_jobs:
            job_descriptions = [job['job_description'] for job in sample_jobs]
            selected_jd = st.selectbox(
                "选择职位描述进行分析",
                job_descriptions,
                format_func=lambda x: x[:60] + "..." if len(x) > 60 else x
            )
            
            if selected_jd:
                result = client.extract_age_info(selected_jd)
                
                if result:
                    st.subheader("分析结果")
                    col_a, col_b, col_c = st.columns(3)
                    
                    with col_a:
                        has_limit = result.get('has_age_limit', False)
                        st.info(f"**是否有年龄限制**: {'是' if has_limit else '否'}")
                    
                    with col_b:
                        max_age = result.get('max_age')
                        display_age = max_age if max_age else '无'
                        st.info(f"**最大年龄限制**: {display_age}岁")
                    
                    with col_c:
                        generation = result.get('generation')
                        display_gen = generation if generation else '无'
                        st.info(f"**特定代际**: {display_gen}")
                    
                    if result.get('raw_matches'):
                        st.write("**匹配到的关键词**:")
                        for match in result['raw_matches']:
                            st.markdown(f"- `{match}`")
                    
                    with st.expander("查看完整职位描述"):
                        st.write(selected_jd)
        
        st.markdown("---")
        st.subheader("年龄限制类别分布")
        
        if stats and 'age_categories' in stats:
            cat_data = stats['age_categories']
        else:
            cat_data = {}
        
        if cat_data:
            fig_pie = px.pie(
                values=list(cat_data.values()),
                names=list(cat_data.keys()),
                title="年龄限制类别占比",
                color_discrete_sequence=px.colors.sequential.RdBu_r,
                hole=0.4
            )
            fig_pie.update_traces(textposition='inside', textinfo='percent+label')
            st.plotly_chart(fig_pie, use_container_width=True)
        else:
            st.info("暂无分类数据")
    
    with tab2:
        st.header("各行业年龄限制对比")
        
        if stats and 'industry_comparison' in stats:
            industry_comparison = stats['industry_comparison']
            
            industry_names = [item['industry'] for item in industry_comparison]
            limit_ratios = [item['age_limit_ratio'] * 100 for item in industry_comparison]
            limit_35_ratios = [item['limit_35_ratio'] * 100 for item in industry_comparison]
            
            fig_bar = go.Figure()
            fig_bar.add_trace(go.Bar(
                x=industry_names,
                y=limit_ratios,
                name='有年龄限制比例',
                marker_color='indianred',
                text=[f'{r:.1f}%' for r in limit_ratios],
                textposition='auto'
            ))
            fig_bar.add_trace(go.Bar(
                x=industry_names,
                y=limit_35_ratios,
                name='35岁以下限制比例',
                marker_color='lightsalmon',
                text=[f'{r:.1f}%' for r in limit_35_ratios],
                textposition='auto'
            ))
            
            fig_bar.update_layout(
                title="各行业年龄限制比例对比",
                barmode='group',
                xaxis_title="行业",
                yaxis_title="比例 (%)",
                yaxis_range=[0, 100],
                height=500
            )
            st.plotly_chart(fig_bar, use_container_width=True)
            
            st.markdown("---")
            st.subheader("详细数据")
            
            comparison_df = pd.DataFrame(industry_comparison)
            comparison_df['age_limit_ratio'] = comparison_df['age_limit_ratio'].apply(lambda x: f"{x*100:.1f}%")
            comparison_df['limit_35_ratio'] = comparison_df['limit_35_ratio'].apply(lambda x: f"{x*100:.1f}%")
            st.dataframe(comparison_df, use_container_width=True)
        else:
            st.info("暂无行业对比数据")
    
    with tab3:
        st.header("面试邀约率漏斗图")
        
        industries = ["全行业"] + (client.get_industries() if api_connected else [])
        selected_industry = st.selectbox(
            "选择行业查看漏斗图",
            industries
        )
        
        industry_param = None if selected_industry == "全行业" else selected_industry
        funnel_result = client.get_funnel_data(industry=industry_param, source=source_option)
        
        if funnel_result and 'funnel_data' in funnel_result:
            funnel_data = funnel_result['funnel_data']
            industry_name = funnel_result.get('industry', '全行业')
            
            funnel_fig = generate_funnel_chart(funnel_data, industry_name)
            st.plotly_chart(funnel_fig, use_container_width=True)
            
            st.markdown("### 📊 漏斗数据详解")
            
            col_data1, col_data2 = st.columns(2)
            
            with col_data1:
                for i, item in enumerate(funnel_data[:3]):
                    with st.expander(f"📌 {item['age_group']} - {item['invitation_rate']*100:.1f}%"):
                        st.write(f"**获得邀约人数**: {item['candidates']}人")
                        st.write(f"**JD年龄排除率**: {item.get('jd_exclusion_rate', 0)*100:.1f}%")
            
            with col_data2:
                for i, item in enumerate(funnel_data[3:]):
                    with st.expander(f"📌 {item['age_group']} - {item['invitation_rate']*100:.1f}%"):
                        st.write(f"**获得邀约人数**: {item['candidates']}人")
                        st.write(f"**JD年龄排除率**: {item.get('jd_exclusion_rate', 0)*100:.1f}%")
            
            if selected_industry == '互联网':
                st.warning("⚠️ **特别发现**：互联网行业在35岁年龄段面试邀约率急剧下降，呈现明显的\"35岁门槛\"现象")
            
            st.markdown("---")
            
            compare_choice = st.checkbox("显示行业漏斗图对比")
            
            if compare_choice:
                comparison_result = client.get_funnel_comparison(source=source_option)
                
                if comparison_result and 'comparison' in comparison_result:
                    comparison = comparison_result['comparison']
                    
                    comparison_fig = go.Figure()
                    
                    industry_colors = {
                        '互联网': '#d62728',
                        '金融': '#1f77b4',
                        '制造业': '#2ca02c',
                        '教育': '#ff7f0e',
                        '医疗健康': '#9467bd',
                        '房地产': '#8c564b',
                        '消费零售': '#e377c2',
                        '企业服务': '#7f7f7f',
                        '物流运输': '#bcbd22',
                        '能源化工': '#17becf'
                    }
                    
                    for industry, funnel_info in comparison.items():
                        if 'funnel_data' in funnel_info:
                            rates = [item['invitation_rate'] * 100 for item in funnel_info['funnel_data']]
                            age_labels = [item['age_group'] for item in funnel_info['funnel_data']]
                            
                            comparison_fig.add_trace(go.Scatter(
                                x=age_labels,
                                y=rates,
                                name=industry,
                                mode='lines+markers',
                                line=dict(color=industry_colors.get(industry, '#7f7f7f'), width=3),
                                marker=dict(size=10)
                            ))
                    
                    comparison_fig.update_layout(
                        title="各行业面试邀约率对比曲线",
                        xaxis_title="年龄段",
                        yaxis_title="面试邀约率 (%)",
                        hovermode='x unified',
                        height=550,
                        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
                    )
                    
                    st.plotly_chart(comparison_fig, use_container_width=True)
        else:
            st.info("暂无漏斗数据")
    
    with tab4:
        st.header("💡 AI生成：如何应对年龄危机")
        
        if not api_key:
            st.warning("⚠️ 请先在左侧边栏配置API Key")
        
        col_input1, col_input2 = st.columns(2)
        
        with col_input1:
            user_age = st.slider("你的年龄", 20, 50, 30)
        
        with col_input2:
            industries_list = client.get_industries() if api_connected else ['互联网', '金融', '制造业', '教育', '医疗健康']
            user_industry = st.selectbox(
                "你所在的行业",
                industries_list
            )
        
        col_input3, col_input4 = st.columns(2)
        
        with col_input3:
            position_options = ['技术开发', '产品经理', '运营', '销售', '设计', '数据分析', '项目管理', '管理岗', '其他']
            user_position = st.selectbox(
                "你的职位类型",
                position_options
            )
        
        with col_input4:
            years_exp = st.slider("工作年限(年)", 0, 25, 5)
        
        generate_button = st.button("🤖 生成个性化AI建议", type="primary", use_container_width=True)
        
        if generate_button:
            if not api_key:
                st.error("❌ 请先在左侧边栏输入火山引擎API Key")
            else:
                with st.spinner("AI正在思考中，请稍候..."):
                    ai_result = client.get_ai_suggestion(
                        age=user_age,
                        industry=user_industry,
                        position=user_position,
                        years_of_experience=years_exp,
                        api_key=api_key,
                        model_name=model_name,
                        temperature=temperature
                    )
                    
                    if ai_result:
                        if ai_result.get('success'):
                            st.success("✅ AI建议生成成功！")
                            st.markdown("---")
                            st.markdown(ai_result.get('suggestion'))
                        else:
                            st.error(f"❌ AI建议生成失败")
                            with st.expander("查看错误详情"):
                                st.error(ai_result.get('error'))
    
    st.markdown("---")
    st.caption("数据来源：Boss直聘、拉勾招聘模拟数据（500条）| 分析工具：年龄歧视分析系统 v2.0 | 架构：前后端分离")


if __name__ == '__main__':
    main()
