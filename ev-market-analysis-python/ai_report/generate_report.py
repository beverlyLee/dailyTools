import os
import json
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()


def format_number(num):
    if num >= 10000:
        return f"{num/10000:.1f}万"
    return f"{int(num)}"


def format_percent(num):
    return f"{num*100:.1f}%"


def prepare_data_summary(df, yearly_df):
    import pandas as pd
    latest = df.iloc[-1]
    first_this_year = df[df['date'].str.startswith(str(datetime.now().year))].iloc[0] if len(df[df['date'].str.startswith(str(datetime.now().year))]) > 0 else df.iloc[0]
    
    summary = {
        "report_date": latest['date'],
        "latest_metrics": {
            "penetration_rate": format_percent(latest['penetration_rate']),
            "penetration_rate_val": latest['penetration_rate'],
            "total_sales": format_number(latest['total_sales']),
            "total_sales_val": latest['total_sales'],
            "ev_sales": format_number(latest['ev_sales']),
            "ev_sales_val": latest['ev_sales'],
            "bev_sales": format_number(latest['bev']),
            "phev_sales": format_number(latest['phev']),
            "bev_ratio": format_percent(latest['bev_ratio']),
            "phev_ratio": format_percent(latest['phev_ratio']),
        },
        "yearly_summary": yearly_df.to_dict('records') if len(yearly_df) > 0 else [],
        "trend": {
            "penetration_start": format_percent(df.iloc[0]['penetration_rate']),
            "penetration_latest": format_percent(latest['penetration_rate']),
            "penetration_growth": f"{(latest['penetration_rate'] - df.iloc[0]['penetration_rate'])*100:.1f}pct",
            "bev_ratio_trend": f"从{df.iloc[0]['bev_ratio']*100:.1f}%到{latest['bev_ratio']*100:.1f}%"
        }
    }
    
    if 'total_sales_yoy' in df.columns and not pd.isna(latest['total_sales_yoy']):
        summary['latest_metrics']['total_sales_yoy'] = f"{latest['total_sales_yoy']:.1f}%"
    if 'ev_sales_yoy' in df.columns and not pd.isna(latest['ev_sales_yoy']):
        summary['latest_metrics']['ev_sales_yoy'] = f"{latest['ev_sales_yoy']:.1f}%"
    
    return summary


def call_volc_rest_api(prompt, model_name=None):
    api_key = os.getenv('ARK_API_KEY') or os.getenv('VOLC_API_KEY')
    model_name = model_name or os.getenv('MODEL_NAME', 'doubao-seed-2-0-code-preview-260215')
    api_url = os.getenv('VOLC_API_URL', 'https://ark.cn-beijing.volces.com/api/v3/chat/completions')
    
    if not api_key:
        print("未配置ARK_API_KEY或VOLC_API_KEY，使用模拟报告模式")
        return None
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    data = {
        "model": model_name,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.7,
        "max_tokens": 2000
    }
    
    try:
        response = requests.post(api_url, headers=headers, json=data, timeout=60)
        response.raise_for_status()
        result = response.json()
        return result['choices'][0]['message']['content']
    except requests.exceptions.RequestException as e:
        print(f"调用火山RESTful API失败: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"响应内容: {e.response.text}")
        return None


def generate_mock_report(summary):
    metrics = summary['latest_metrics']
    trend = summary['trend']
    
    report = f"""# 中国新能源汽车市场月度分析报告

**报告日期**: {summary['report_date']}

---

## 一、市场概况

本月中国乘用车市场整体表现稳健，总销量达到 **{metrics['total_sales']}**，其中新能源汽车销量 **{metrics['ev_sales']}**，市场渗透率达到 **{metrics['penetration_rate']}**。

从长期趋势来看，新能源汽车渗透率从{trend['penetration_start']}提升至当前的{trend['penetration_latest']}，累计提升{trend['penetration_growth']}，充分展现了新能源汽车市场的强劲增长动力。

---

## 二、渗透率深度分析

### 2.1 月度渗透率走势
本月渗透率 **{metrics['penetration_rate']}**，继续保持在高位运行。3月移动平均数据显示，渗透率上升趋势明显，市场对新能源汽车的接受度持续提升。

### 2.2 驱动因素分析
1. **政策端**: 新能源汽车购置税减免政策延续，地方补贴政策持续发力
2. **供给端**: 新车型密集上市，产品力显著提升
3. **需求端**: 消费者认知度提高，充电基础设施完善

---

## 三、产品结构变化

### 3.1 BEV vs PHEV市场份额
- **BEV(纯电动)**: {metrics['bev_ratio']}，销量 {metrics['bev_sales']}
- **PHEV(插电混动)**: {metrics['phev_ratio']}，销量 {metrics['phev_sales']}

### 3.2 结构变化趋势
BEV与PHEV的市场份额呈现动态调整。趋势数据: {trend['bev_ratio_trend']}。

**BEV市场特点**:
- 高端车型增长迅速
- 微型电动车市场稳定
- 智能化配置成为核心竞争力

**PHEV市场特点**:
- 成为传统燃油车转型的重要过渡方案
- 增程式技术路线获得市场认可
- 性价比优势明显

---

## 四、增长动力分析

### 4.1 市场增长动力
1. **技术迭代加速**: 电池技术进步，续航里程持续提升
2. **充电网络完善**: 公共充电桩数量快速增长
3. **消费观念转变**: 绿色出行理念深入人心

### 4.2 未来展望
预计未来几个月:
- 新能源汽车渗透率将继续攀升
- BEV仍将保持市场主导地位
- PHEV份额有望进一步提升
- 高端化、智能化趋势明显

---

## 五、风险提示

1. **政策风险**: 补贴退坡可能影响短期销量
2. **竞争加剧**: 价格战可能压缩企业利润空间
3. **供应链风险**: 芯片、电池原材料供应波动
4. **需求波动**: 宏观经济不确定性

---

*本报告由AI自动生成，仅供参考*
"""
    
    return report


def generate_ai_report(df, yearly_df, output_dir='../output', use_ai=True):
    import pandas as pd
    
    os.makedirs(output_dir, exist_ok=True)
    
    summary = prepare_data_summary(df, yearly_df)
    
    if use_ai:
        prompt = f"""
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
- 字数约1500-2000字
"""
        
        ai_content = call_volc_rest_api(prompt)
        
        if ai_content:
            report_content = ai_content
        else:
            print("AI调用失败或未配置，生成标准模板报告")
            report_content = generate_mock_report(summary)
    else:
        report_content = generate_mock_report(summary)
    
    report_path = os.path.join(output_dir, 'ev_market_report.md')
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report_content)
    
    print(f"报告已生成: {report_path}")
    
    return report_content
