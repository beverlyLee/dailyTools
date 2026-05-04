import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import sys
import os

# 添加当前目录到路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.data_loader import DataLoader
from src.seir_model import SEIRModel, test_numerical_stability
from src.visualizations import create_comparison_chart, create_model_plot

# 设置页面配置
st.set_page_config(
    page_title="全球疫情数据追踪与模拟系统",
    page_icon="🦠",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 应用标题
st.title("🦠 全球疫情数据追踪与模拟系统")
st.markdown("---")

# 初始化数据加载器
@st.cache_resource
def load_data():
    data_loader = DataLoader()
    data_loader.load_csv_data("data/covid_data.csv")
    return data_loader

data_loader = load_data()

# 侧边栏导航
st.sidebar.title("导航")
page = st.sidebar.radio("选择页面", ["数据概览", "SEIR模型模拟", "数值稳定性测试"])

if page == "数据概览":
    st.header("📊 疫情数据概览")
    
    # 获取数据
    df = data_loader.get_all_data()
    
    if df is not None and not df.empty:
        # 显示基本统计信息
        col1, col2, col3, col4 = st.columns(4)
        
        # 获取最新日期的数据
        latest_date = df['date'].max()
        latest_data = df[df['date'] == latest_date]
        
        total_confirmed = latest_data['confirmed'].sum()
        total_deaths = latest_data['deaths'].sum()
        total_recovered = latest_data['recovered'].sum()
        countries_count = df['country'].nunique()
        
        with col1:
            st.metric("总确诊数", f"{total_confirmed:,}")
        
        with col2:
            st.metric("总死亡数", f"{total_deaths:,}")
        
        with col3:
            st.metric("总康复数", f"{total_recovered:,}")
        
        with col4:
            st.metric("覆盖国家数", f"{countries_count}")
        
        st.markdown("---")
        
        # 数据可视化部分
        st.subheader("疫情趋势图")
        
        # 按日期汇总全球数据
        global_data = df.groupby('date').agg({
            'confirmed': 'sum',
            'deaths': 'sum',
            'recovered': 'sum'
        }).reset_index()
        
        # 创建趋势图
        fig = make_subplots(rows=2, cols=1, shared_xaxes=True,
                            subplot_titles=('累计确诊趋势', '每日新增趋势'))
        
        # 累计数据
        fig.add_trace(go.Scatter(x=global_data['date'], y=global_data['confirmed'],
                                  mode='lines', name='累计确诊', line=dict(color='blue')),
                      row=1, col=1)
        fig.add_trace(go.Scatter(x=global_data['date'], y=global_data['deaths'],
                                  mode='lines', name='累计死亡', line=dict(color='red')),
                      row=1, col=1)
        fig.add_trace(go.Scatter(x=global_data['date'], y=global_data['recovered'],
                                  mode='lines', name='累计康复', line=dict(color='green')),
                      row=1, col=1)
        
        # 每日新增
        daily_new = global_data.copy()
        daily_new['new_confirmed'] = daily_new['confirmed'].diff()
        daily_new['new_deaths'] = daily_new['deaths'].diff()
        daily_new['new_recovered'] = daily_new['recovered'].diff()
        
        fig.add_trace(go.Bar(x=daily_new['date'], y=daily_new['new_confirmed'],
                              name='新增确诊', marker_color='blue', opacity=0.6),
                      row=2, col=1)
        fig.add_trace(go.Bar(x=daily_new['date'], y=daily_new['new_deaths'],
                              name='新增死亡', marker_color='red', opacity=0.6),
                      row=2, col=1)
        
        fig.update_layout(height=600, showlegend=True)
        st.plotly_chart(fig, use_container_width=True)
        
        st.markdown("---")
        
        # 国家列表选择
        st.subheader("国家/地区详细数据")
        
        countries = sorted(df['country'].unique())
        selected_countries = st.multiselect("选择国家/地区", countries, default=countries[:3])
        
        if selected_countries:
            # 显示选中国家的数据
            country_data = df[df['country'].isin(selected_countries)]
            
            # 创建国家对比图
            fig_comparison = create_comparison_chart(country_data, selected_countries)
            st.plotly_chart(fig_comparison, use_container_width=True)
            
            # 显示数据表格
            st.subheader("详细数据表格")
            st.dataframe(country_data[['date', 'country', 'confirmed', 'deaths', 'recovered']].sort_values(by='date', ascending=False), use_container_width=True)
    else:
        st.warning("无法加载数据，请检查数据文件是否存在。")

elif page == "SEIR模型模拟":
    st.header("🧬 SEIR传染病模型模拟")
    
    st.markdown("""
    SEIR模型是经典的传染病动力学模型，用于描述传染病在人群中的传播过程。
    模型包含四个状态：
    - **S (Susceptible)**: 易感人群
    - **E (Exposed)**: 暴露人群（已感染但尚未发病）
    - **I (Infectious)**: 感染人群（已发病且具有传染性）
    - **R (Recovered)**: 康复人群（获得免疫力）
    """)
    
    st.markdown("---")
    
    # 参数设置
    st.sidebar.markdown("### 模型参数设置")
    
    # 人口参数
    population = st.sidebar.number_input("总人口数", min_value=1000, max_value=1_000_000_000, 
                                          value=1_000_000, step=10000, format="%d")
    
    # 初始感染参数
    initial_exposed = st.sidebar.slider("初始暴露人数", min_value=1, max_value=1000, value=10, step=1)
    initial_infected = st.sidebar.slider("初始感染人数", min_value=1, max_value=1000, value=5, step=1)
    
    # 疾病参数
    st.sidebar.markdown("### 疾病传播参数")
    
    transmission_rate = st.sidebar.slider("传播率 (β)", min_value=0.0, max_value=1.0, 
                                           value=0.3, step=0.01, format="%.2f")
    
    incubation_rate = st.sidebar.slider("潜伏期倒数 (σ)", min_value=0.05, max_value=1.0, 
                                         value=0.2, step=0.01, format="%.2f",
                                         help="平均潜伏期为 1/σ 天")
    
    recovery_rate = st.sidebar.slider("康复率 (γ)", min_value=0.01, max_value=0.5, 
                                       value=0.1, step=0.01, format="%.2f",
                                       help="平均传染期为 1/γ 天")
    
    # 模拟参数
    st.sidebar.markdown("### 模拟参数")
    
    simulation_days = st.sidebar.slider("模拟天数", min_value=30, max_value=365, value=180, step=10)
    time_step = st.sidebar.slider("时间步长 (天)", min_value=0.1, max_value=1.0, value=0.5, step=0.1)
    
    # 参数验证
    st.sidebar.markdown("### 参数验证")
    valid_params = True
    validation_messages = []
    
    # 检查基本再生数
    R0 = transmission_rate / recovery_rate if recovery_rate > 0 else 0
    
    if R0 > 1:
        st.sidebar.success(f"基本再生数 R₀ = {R0:.2f} > 1，疫情将扩散")
    else:
        st.sidebar.warning(f"基本再生数 R₀ = {R0:.2f} ≤ 1，疫情将逐渐消失")
    
    # 检查时间步长稳定性 (Courant-Friedrichs-Lewy条件)
    max_rate = max(transmission_rate, incubation_rate, recovery_rate)
    if time_step * max_rate > 1.0:
        valid_params = False
        validation_messages.append(f"时间步长过大，可能导致数值不稳定。建议时间步长 < {1.0/max_rate:.2f} 天")
    
    # 初始条件检查
    if initial_exposed + initial_infected > population:
        valid_params = False
        validation_messages.append("初始感染人数不能超过总人口数")
    
    # 显示验证结果
    if not valid_params:
        for msg in validation_messages:
            st.error(msg)
    else:
        st.sidebar.success("✓ 参数设置有效")
    
    st.markdown("---")
    
    # 运行模拟
    if st.button("运行模拟", type="primary") and valid_params:
        with st.spinner("正在运行SEIR模型模拟..."):
            # 创建模型实例
            model = SEIRModel(
                population=population,
                transmission_rate=transmission_rate,
                incubation_rate=incubation_rate,
                recovery_rate=recovery_rate
            )
            
            # 设置初始条件
            initial_conditions = {
                'S': population - initial_exposed - initial_infected,
                'E': initial_exposed,
                'I': initial_infected,
                'R': 0
            }
            
            # 运行模拟
            results = model.simulate(
                initial_conditions=initial_conditions,
                simulation_days=simulation_days,
                time_step=time_step
            )
            
            # 显示模拟结果
            st.subheader("模拟结果")
            
            # 显示关键指标
            peak_infected = results['I'].max()
            peak_day = results.loc[results['I'] == peak_infected, 't'].values[0]
            total_infected = results['R'].max()
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.metric("感染峰值人数", f"{int(peak_infected):,}")
            
            with col2:
                st.metric("感染峰值天数", f"{int(peak_day)} 天")
            
            with col3:
                st.metric("最终感染人数", f"{int(total_infected):,}")
            
            st.markdown("---")
            
            # 绘制模型结果
            fig = create_model_plot(results)
            st.plotly_chart(fig, use_container_width=True)
            
            st.markdown("---")
            
            # 显示详细数据
            st.subheader("详细模拟数据")
            
            # 显示每天的数据
            daily_results = results[results['t'].astype(int) == results['t']]
            st.dataframe(daily_results[['t', 'S', 'E', 'I', 'R']].round(0).astype(int), 
                         use_container_width=True)

elif page == "数值稳定性测试":
    st.header("📐 数值稳定性测试")
    
    st.markdown("""
    本页面用于测试SEIR模型的数值稳定性，验证求解器在不同参数下的表现。
    测试内容包括：
    - **守恒性测试**: 验证总人口数在模拟过程中保持不变
    - **非负性测试**: 验证所有状态变量始终为非负值
    - **单调性测试**: 验证康复人数和死亡人数始终非递减
    - **时间步长敏感性分析**: 测试不同时间步长对结果的影响
    """)
    
    st.markdown("---")
    
    # 测试参数设置
    st.subheader("测试参数")
    
    col1, col2 = st.columns(2)
    
    with col1:
        test_population = st.number_input("测试人口数", min_value=10000, max_value=10_000_000, 
                                           value=1_000_000, step=10000)
        test_days = st.slider("测试天数", min_value=30, max_value=365, value=180, step=10)
        
    with col2:
        test_transmission = st.slider("传播率 (β)", min_value=0.1, max_value=0.8, value=0.3, step=0.05)
        test_recovery = st.slider("康复率 (γ)", min_value=0.05, max_value=0.3, value=0.1, step=0.05)
    
    if st.button("运行稳定性测试", type="primary"):
        with st.spinner("正在执行数值稳定性测试..."):
            # 运行稳定性测试
            test_results = test_numerical_stability(
                population=test_population,
                transmission_rate=test_transmission,
                recovery_rate=test_recovery,
                simulation_days=test_days
            )
            
            st.markdown("---")
            st.subheader("测试结果")
            
            # 显示测试结果
            col1, col2, col3 = st.columns(3)
            
            with col1:
                if test_results['conservation']['passed']:
                    st.success("✓ 守恒性测试通过")
                else:
                    st.error("✗ 守恒性测试失败")
                st.info(f"最大误差: {test_results['conservation']['max_error']:.2e}")
            
            with col2:
                if test_results['non_negative']['passed']:
                    st.success("✓ 非负性测试通过")
                else:
                    st.error("✗ 非负性测试失败")
                st.info(f"发现负值: {len(test_results['non_negative']['negative_values'])} 处")
            
            with col3:
                if test_results['monotonicity']['passed']:
                    st.success("✓ 单调性测试通过")
                else:
                    st.error("✗ 单调性测试失败")
            
            st.markdown("---")
            
            # 时间步长敏感性分析
            st.subheader("时间步长敏感性分析")
            
            # 创建比较图
            fig_steps = go.Figure()
            
            colors = ['blue', 'green', 'red', 'purple', 'orange']
            
            for i, (step, data) in enumerate(test_results['time_step_analysis'].items()):
                fig_steps.add_trace(go.Scatter(
                    x=data['t'], y=data['I'],
                    mode='lines', name=f'时间步长 = {step}天',
                    line=dict(color=colors[i % len(colors)])
                ))
            
            fig_steps.update_layout(
                title='不同时间步长下的感染人数曲线',
                xaxis_title='时间 (天)',
                yaxis_title='感染人数',
                height=500,
                legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
            )
            
            st.plotly_chart(fig_steps, use_container_width=True)
            
            # 显示时间步长误差
            st.subheader("时间步长收敛性分析")
            
            # 以最小时间步长为基准计算误差
            step_sizes = sorted(test_results['time_step_analysis'].keys(), reverse=True)
            baseline_step = step_sizes[-1]
            baseline_data = test_results['time_step_analysis'][baseline_step]
            
            error_data = []
            for step in step_sizes[:-1]:
                step_data = test_results['time_step_analysis'][step]
                
                # 计算关键点的误差
                peak_baseline = baseline_data['I'].max()
                peak_step = step_data['I'].max()
                
                error_peak = abs(peak_step - peak_baseline) / peak_baseline * 100
                
                error_data.append({
                    '时间步长 (天)': step,
                    '峰值感染人数': int(peak_step),
                    '相对误差 (%)': f"{error_peak:.4f}%"
                })
            
            st.table(pd.DataFrame(error_data))
            
            st.markdown("---")
            
            # 测试结论
            st.subheader("测试结论")
            
            all_passed = (test_results['conservation']['passed'] and 
                         test_results['non_negative']['passed'] and 
                         test_results['monotonicity']['passed'])
            
            if all_passed:
                st.success("所有数值稳定性测试通过！模型求解器表现稳定。")
            else:
                st.warning("部分测试未通过，建议检查模型参数或减小时间步长。")

# 页脚
st.markdown("---")
st.markdown("""
<div style='text-align: center'>
    <p>全球疫情数据追踪与模拟系统 | SEIR模型版本 1.0</p>
</div>
""", unsafe_allow_html=True)
