import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import sys
import os
import requests
import json

sys.path.append(os.path.dirname(__file__))
from src.nlp.age_extractor import AgeExtractor, calculate_age_bias_ratio
from src.analysis.industry_bias import IndustryBiasAnalyzer


st.set_page_config(
    page_title="招聘市场年龄歧视分析",
    page_icon="📊",
    layout="wide"
)


if 'api_debug_log' not in st.session_state:
    st.session_state.api_debug_log = []

if 'last_test_result' not in st.session_state:
    st.session_state.last_test_result = None


@st.cache_data
def load_data():
    data_path = os.path.join(os.path.dirname(__file__), 'data', 'recruitment_data_500.csv')
    df = pd.read_csv(data_path)
    return df


def add_debug_log(log_type, message, data=None):
    log_entry = {
        'type': log_type,
        'message': message,
        'data': data
    }
    st.session_state.api_debug_log.append(log_entry)
    if len(st.session_state.api_debug_log) > 20:
        st.session_state.api_debug_log.pop(0)


def call_volcengine_api(prompt, api_key, model_name, api_endpoint, temperature=0.7):
    if api_key is None or api_key.strip() == '':
        return None, "请先输入火山引擎API Key"
    
    add_debug_log('INFO', f'开始调用API，端点: {api_endpoint}, 模型: {model_name}')
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    try:
        if api_endpoint == "responses":
            url = "https://ark.cn-beijing.volces.com/api/v3/responses"
            payload = {
                "model": model_name,
                "input": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "input_text",
                                "text": prompt
                            }
                        ]
                    }
                ]
            }
        else:
            url = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
            payload = {
                "model": model_name,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": temperature,
                "max_tokens": 2000
            }
        
        add_debug_log('REQUEST', f'请求URL: {url}', {'url': url, 'model': model_name})
        
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        
        add_debug_log('RESPONSE', f'响应状态码: {response.status_code}', {
            'status_code': response.status_code,
            'headers': dict(response.headers),
            'content': response.text[:500] if response.text else None
        })
        
        if response.status_code == 200:
            result = response.json()
            add_debug_log('SUCCESS', 'API调用成功', result)
            
            if api_endpoint == "responses":
                content = result.get('output', {}).get('text', '')
                if content:
                    return content, None
                else:
                    return None, "API返回格式异常，请检查模型是否正确"
            else:
                choices = result.get('choices', [])
                if choices and len(choices) > 0:
                    content = choices[0].get('message', {}).get('content', '')
                    if content:
                        return content, None
                    else:
                        return None, "API返回内容为空"
                else:
                    return None, "API返回格式异常，没有choices字段"
        else:
            error_msg = f"API调用失败，状态码: {response.status_code}"
            try:
                error_detail = response.json()
                error_msg += f"\n错误详情: {json.dumps(error_detail, ensure_ascii=False, indent=2)}"
            except:
                error_msg += f"\n响应内容: {response.text}"
            return None, error_msg
            
    except requests.exceptions.Timeout:
        error_msg = "请求超时，请检查网络连接或稍后重试"
        add_debug_log('ERROR', error_msg)
        return None, error_msg
    except requests.exceptions.ConnectionError:
        error_msg = "连接错误，请检查网络连接或防火墙设置"
        add_debug_log('ERROR', error_msg)
        return None, error_msg
    except Exception as e:
        error_msg = f"请求异常: {str(e)}"
        add_debug_log('ERROR', error_msg)
        return None, error_msg


def test_api_connection(api_key, model_name, api_endpoint):
    test_prompt = "你好，请用一句话介绍你自己。"
    result, error = call_volcengine_api(test_prompt, api_key, model_name, api_endpoint)
    
    if error:
        st.session_state.last_test_result = {
            'success': False,
            'error': error
        }
        return False, error
    else:
        st.session_state.last_test_result = {
            'success': True,
            'result': result
        }
        return True, result


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
        
        api_endpoint = st.selectbox(
            "API端点",
            ["chat/completions (推荐)", "responses"],
            help="chat/completions 是标准聊天接口，responses 是多模态接口",
            index=0
        )
        
        endpoint_type = "chat/completions" if "chat" in api_endpoint else "responses"
        
        model_name = st.text_input(
            "模型名称",
            value="doubao-seed-1-8-251228",
            help="从火山引擎ARK控制台获取的模型ID",
            placeholder="例如: doubao-seed-1-8-251228"
        )
        
        api_key = st.text_input(
            "API Key",
            type="password",
            help="从火山引擎控制台获取的API Key",
            placeholder="请输入火山引擎API Key"
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
            clear_log = st.button("🗑️ 清空日志", use_container_width=True)
        
        if test_button:
            if not api_key:
                st.error("❌ 请先输入API Key")
            elif not model_name:
                st.error("❌ 请先输入模型名称")
            else:
                with st.spinner("正在测试API连接..."):
                    success, result = test_api_connection(api_key, model_name, endpoint_type)
                    if success:
                        st.success("✅ API连接测试成功！")
                        with st.expander("查看测试结果"):
                            st.write(result)
                    else:
                        st.error("❌ API连接测试失败")
        
        if clear_log:
            st.session_state.api_debug_log = []
            st.session_state.last_test_result = None
            st.rerun()
        
        if st.checkbox("显示调试日志") and st.session_state.api_debug_log:
            st.subheader("📋 调试日志")
            for log in reversed(st.session_state.api_debug_log[-10:]):
                if log['type'] == 'INFO':
                    st.info(f"ℹ️ {log['message']}")
                elif log['type'] == 'SUCCESS':
                    st.success(f"✅ {log['message']}")
                elif log['type'] == 'ERROR':
                    st.error(f"❌ {log['message']}")
                else:
                    with st.expander(f"🔍 {log['message']}"):
                        st.json(log['data'])
        
        st.markdown("---")
        
        with st.expander("📚 使用说明"):
            st.markdown("""
            **获取API Key和模型ID的步骤：**
            1. 访问 [火山引擎控制台](https://console.volcengine.com/ark)
            2. 进入智能方舟（ARK）服务
            3. 创建推理接入点，选择模型（如 doubao-seed-1-8-251228）
            4. 创建API Key并复制
            5. 将API Key和模型ID填入上方
            
            **常见问题：**
            - 401错误：检查API Key是否正确
            - 404错误：检查模型名称是否正确
            - 超时：检查网络连接或重试
            """)
        
        st.markdown("---")
        st.caption("v2.1 | 500条真实模拟数据 | 支持AI调试")
    
    df = load_data()
    
    if source_option != "全部":
        df = df[df['source'] == source_option]
    
    analyzer = IndustryBiasAnalyzer(df)
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("分析职位总数", f"{len(df)}个")
    
    with col2:
        st.metric("数据源", source_option)
    
    summary = analyzer.get_statistics_summary()
    
    with col3:
        st.metric("整体年龄限制比例", f"{summary['overall_age_limit_ratio']:.1f}%")
    
    with col4:
        st.metric("最严重行业", f"{summary['most_biased_industry'][0]} ({summary['most_biased_industry'][1]:.1f}%)")
    
    st.markdown("---")
    
    tab1, tab2, tab3, tab4 = st.tabs(["🔍 年龄限制分析", "📈 行业对比", "🎯 面试漏斗图", "💡 AI应对建议"])
    
    with tab1:
        st.header("年龄限制关键词提取分析")
        
        extractor = AgeExtractor()
        
        industry_filter = st.selectbox(
            "筛选行业",
            ["全部"] + list(df['industry'].unique())
        )
        
        filtered_df = df
        if industry_filter != "全部":
            filtered_df = df[df['industry'] == industry_filter]
        
        sample_jd = st.selectbox(
            "选择职位描述进行分析",
            filtered_df['job_description'].tolist(),
            format_func=lambda x: x[:60] + "..." if len(x) > 60 else x
        )
        
        if sample_jd:
            result = extractor.extract_age_info(sample_jd)
            
            st.subheader("分析结果")
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.info(f"**是否有年龄限制**: {'是' if result['has_age_limit'] else '否'}")
            
            with col_b:
                max_age = result['max_age'] if result['max_age'] else '无'
                st.info(f"**最大年龄限制**: {max_age}岁")
            
            with col_c:
                generation = f"{result['generation']}后" if result['generation'] else '无'
                st.info(f"**特定代际**: {generation}")
            
            if result['raw_matches']:
                st.write("**匹配到的关键词**:")
                for match in result['raw_matches']:
                    st.markdown(f"- `{match}`")
            
            with st.expander("查看完整职位描述"):
                st.write(sample_jd)
        
        st.markdown("---")
        st.subheader("年龄限制类别分布")
        
        age_cat_result = calculate_age_bias_ratio(filtered_df)
        cat_data = age_cat_result['age_categories']
        
        fig_pie = px.pie(
            values=list(cat_data.values()),
            names=list(cat_data.keys()),
            title="年龄限制类别占比",
            color_discrete_sequence=px.colors.sequential.RdBu_r,
            hole=0.4
        )
        fig_pie.update_traces(textposition='inside', textinfo='percent+label')
        st.plotly_chart(fig_pie, use_container_width=True)
    
    with tab2:
        st.header("各行业年龄限制对比")
        
        industry_results = analyzer.analyze_by_industry()
        
        industry_names = list(industry_results.keys())
        limit_ratios = [r['age_limit_ratio'] * 100 for r in industry_results.values()]
        limit_35_ratios = [r['35_limit_ratio'] * 100 for r in industry_results.values()]
        
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
        
        comparison_data = []
        for industry, result in industry_results.items():
            comparison_data.append({
                '行业': industry,
                '职位数量': result['total_jobs'],
                '有年龄限制职位': result['has_age_limit'],
                '年龄限制比例(%)': f"{result['age_limit_ratio'] * 100:.1f}",
                '35岁以下限制(%)': f"{result['35_limit_ratio'] * 100:.1f}"
            })
        
        comparison_df = pd.DataFrame(comparison_data)
        st.dataframe(comparison_df, use_container_width=True)
    
    with tab3:
        st.header("面试邀约率漏斗图")
        
        selected_industry = st.selectbox(
            "选择行业查看漏斗图",
            ['全行业'] + list(df['industry'].unique())
        )
        
        industry_param = None if selected_industry == '全行业' else selected_industry
        funnel_result = analyzer.get_funnel_data(industry=industry_param)
        funnel_data = funnel_result['funnel_data']
        
        funnel_fig = generate_funnel_chart(funnel_data, funnel_result['industry'])
        st.plotly_chart(funnel_fig, use_container_width=True)
        
        st.markdown("### 📊 漏斗数据详解")
        
        col_data1, col_data2 = st.columns(2)
        
        with col_data1:
            for i, item in enumerate(funnel_data[:3]):
                with st.expander(f"📌 {item['age_group']} - {item['invitation_rate']*100:.1f}%"):
                    st.write(f"**获得邀约人数**: {item['candidates']}人")
                    st.write(f"**JD年龄排除率**: {item['jd_exclusion_rate']*100:.1f}%")
                    st.write(f"**转化率**: {item['candidates']/funnel_data[0]['candidates']*100:.1f}%")
        
        with col_data2:
            for i, item in enumerate(funnel_data[3:]):
                with st.expander(f"📌 {item['age_group']} - {item['invitation_rate']*100:.1f}%"):
                    st.write(f"**获得邀约人数**: {item['candidates']}人")
                    st.write(f"**JD年龄排除率**: {item['jd_exclusion_rate']*100:.1f}%")
                    st.write(f"**转化率**: {item['candidates']/funnel_data[0]['candidates']*100:.1f}%")
        
        if selected_industry == '互联网':
            st.warning("⚠️ **特别发现**：互联网行业在35岁年龄段面试邀约率急剧下降，呈现明显的\"35岁门槛\"现象")
            st.markdown("""
            <div style='background-color: #fff3cd; padding: 15px; border-radius: 5px; color: #856404;'>
                <strong>🔍 数据解读：</strong>互联网行业35岁以上人群的面试邀约率相比30岁以下下降了<strong>80%</strong>以上，
                这是所有行业中下降最明显的，反映出该行业存在较为严重的年龄歧视问题。
            </div>
            """, unsafe_allow_html=True)
        
        st.markdown("---")
        
        compare_choice = st.checkbox("显示行业漏斗图对比")
        
        if compare_choice:
            all_funnels = analyzer.compare_industries_funnel()
            
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
            
            for industry, funnel_info in all_funnels.items():
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
    
    with tab4:
        st.header("💡 AI生成：如何应对年龄危机")
        
        if not api_key or not model_name:
            st.warning("⚠️ 请先在左侧边栏配置API Key和模型名称，然后点击'测试连接'验证是否可以正常调用")
        
        col_input1, col_input2 = st.columns(2)
        
        with col_input1:
            user_age = st.slider("你的年龄", 20, 50, 30)
        
        with col_input2:
            user_industry = st.selectbox(
                "你所在的行业",
                ['互联网', '金融', '制造业', '教育', '医疗健康', '房地产', '消费零售', '企业服务', '物流运输', '能源化工', '其他']
            )
        
        col_input3, col_input4 = st.columns(2)
        
        with col_input3:
            user_position = st.selectbox(
                "你的职位类型",
                ['技术开发', '产品经理', '运营', '销售', '设计', '数据分析', '项目管理', '管理岗', '其他']
            )
        
        with col_input4:
            years_exp = st.slider("工作年限(年)", 0, 25, 5)
        
        generate_button = st.button("🤖 生成个性化AI建议", type="primary", use_container_width=True)
        
        if generate_button:
            if not api_key:
                st.error("❌ 请先在左侧边栏输入火山引擎API Key")
            elif not model_name:
                st.error("❌ 请先在左侧边栏输入模型名称")
            else:
                with st.spinner("AI正在思考中，请稍候..."):
                    prompt = f"""
                    请为一位{user_age}岁，在{user_industry}行业工作了{years_exp}年的{user_position}人员，
                    提供应对职场年龄危机的个性化建议。
                    
                    请从以下几个方面给出具体、可操作的建议：
                    
                    1. 🌟 职业发展路径建议（结合{user_industry}行业特点）
                    2. 💪 技能升级与转型方向
                    3. 📝 简历优化与面试技巧
                    4. 🤝 人脉建设与个人品牌
                    5. 💰 财务规划与被动收入
                    6. 😊 心态调整与生活平衡
                    
                    要求：
                    - 语气积极、专业、鼓励
                    - 建议具体可操作，有实际案例或数据支撑
                    - 结合{user_industry}行业的特殊性
                    - 针对{user_age}岁这个年龄段的痛点给出方案
                    - 使用Markdown格式，分点清晰，有醒目的emoji标题
                    """
                    
                    ai_response, error = call_volcengine_api(prompt, api_key, model_name, endpoint_type, temperature)
                    
                    if error:
                        st.error("❌ AI建议生成失败")
                        with st.expander("查看详细错误信息"):
                            st.error(error)
                        st.info("💡 提示：请检查左侧的API Key和模型名称是否正确，或点击'测试连接'按钮验证API连接")
                        
                        st.markdown("---")
                        st.subheader("📋 备用建议模板")
                        st.markdown(analyzer.get_age_crisis_advice())
                    else:
                        st.success("✅ AI建议生成成功！")
                        st.markdown("---")
                        st.markdown(ai_response)
        
        st.markdown("---")
        st.subheader("📚 通用应对建议")
        st.markdown(analyzer.get_age_crisis_advice())
    
    st.markdown("---")
    st.caption("数据来源：Boss直聘、拉勾招聘模拟数据（500条）| 分析工具：年龄歧视分析系统 v2.1")


if __name__ == '__main__':
    main()
