import os
import json
import requests
from typing import Dict, List, Optional
import pandas as pd
from dotenv import load_dotenv

load_dotenv()


class EnergyAISuggestor:
    def __init__(self, api_key: Optional[str] = None, region: str = 'default'):
        self.api_key = api_key or os.getenv('VOLCENGINE_API_KEY', '')
        self.region = region
        self.endpoint = os.getenv('VOLCENGINE_ENDPOINT', 'https://ark.cn-beijing.volces.com/api/v3/chat/completions')
        self.model = os.getenv('VOLCENGINE_MODEL', 'doubao-seed-2-0-code-preview-260215')

    def generate_prompt(self, daily_profile: pd.Series, savings_data: Dict, cost_data: Dict, tou_hours: Dict) -> str:
        peak_hours = tou_hours.get('peak', [8, 9, 10, 18, 19, 20, 21])
        valley_hours = tou_hours.get('valley', [0, 1, 2, 3, 4, 5, 23])
        normal_hours = tou_hours.get('normal', [])

        peak_usage = sum(daily_profile[h] for h in peak_hours)
        valley_usage = sum(daily_profile[h] for h in valley_hours)
        normal_usage = sum(daily_profile[h] for h in normal_hours)
        total_usage = daily_profile.sum()

        max_hour = daily_profile.idxmax()
        max_usage = daily_profile.max()

        # 找出用电高峰的3个小时
        top_hours = sorted(range(24), key=lambda h: daily_profile[h], reverse=True)[:3]

        prompt = f"""你是一位专业的家庭用电节能顾问，擅长分析用电数据并给出实用的节能建议。

【用户用电数据分析】
📊 基本信息：
- 日用电量: {total_usage:.2f} kWh
- 月用电量: {cost_data['monthly_usage']:.2f} kWh
- 电价档位: {cost_data['tier']}
- 所在地区: {self.region}

💰 电费分析：
- 单一电价月费: ¥{savings_data['current_cost']:.2f}
- 峰谷电价月费: ¥{savings_data['optimized_cost']:.2f}
- 每月可节省: ¥{savings_data['monthly_savings']:.2f} ({savings_data['savings_percentage']:.1f}%)
- 每年可节省: ¥{savings_data['yearly_savings']:.2f}

⏰ 时段用电分布：
- 尖峰时段 ({min(peak_hours)}:00-{max(peak_hours)}:00): {peak_usage:.2f} kWh ({peak_usage/total_usage*100:.1f}%)
- 平段时段: {normal_usage:.2f} kWh ({normal_usage/total_usage*100:.1f}%)
- 低谷时段 ({min(valley_hours)}:00-{max(valley_hours)}:00): {valley_usage:.2f} kWh ({valley_usage/total_usage*100:.1f}%)

⚡ 用电特征：
- 用电峰值: {max_usage:.2f} kWh，出现在 {max_hour}:00
- 高用电时段: {', '.join([f'{h}:00' for h in top_hours])}

【24小时用电详情】
"""
        for h in range(24):
            period = ""
            if h in peak_hours:
                period = " 🔺尖峰"
            elif h in valley_hours:
                period = " 🔻谷段"
            prompt += f"- {h:02d}:00 {daily_profile[h]:.2f} kWh{period}\n"

        prompt += """
【请提供以下方面的建议】：
1. 🎯 峰谷电价优化建议：具体哪些高能耗设备可以移到低谷时段使用，给出具体的时间安排
2. 🔧 设备节能措施：针对空调、热水器、洗衣机、冰箱、厨房电器等给出具体建议
3. 💡 行为习惯改进：根据用户的用电习惯，给出可操作的行为调整建议
4. 💰 智能设备推荐：推荐适合用户的智能用电设备，说明预期收益
5. 📊 总结与展望：给出一个月的预期节省金额，以及长期优化方向

要求：
- 语言通俗易懂，贴近普通家庭用户
- 每条建议要有具体可操作性，避免空泛
- 结合用户的实际用电数据，给出针对性建议
- 分类清晰，使用表情符号增加可读性
- 总字数控制在800字以内
"""
        return prompt

    def get_ai_suggestions(self, daily_profile: pd.Series, savings_data: Dict, cost_data: Dict, tou_hours: Dict) -> Dict:
        if not self.api_key or self.api_key == 'your_api_key_here':
            return {
                'success': False,
                'error': '未配置API密钥',
                'content': self.get_default_suggestions(daily_profile, savings_data, cost_data)
            }

        try:
            prompt = self.generate_prompt(daily_profile, savings_data, cost_data, tou_hours)

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }

            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": "你是一位专业的家庭用电节能顾问，擅长分析用电数据并给出实用的节能建议。"},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 1500,
                "temperature": 0.7
            }

            response = requests.post(
                self.endpoint,
                headers=headers,
                json=payload,
                timeout=60
            )

            if response.status_code == 200:
                result = response.json()
                ai_content = result['choices'][0]['message']['content']
                return {
                    'success': True,
                    'content': ai_content,
                    'source': 'ai'
                }
            else:
                return {
                    'success': False,
                    'error': f'API调用失败: {response.status_code}',
                    'content': self.get_default_suggestions(daily_profile, savings_data, cost_data)
                }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'content': self.get_default_suggestions(daily_profile, savings_data, cost_data)
            }

    def get_default_suggestions(self, daily_profile: pd.Series, savings_data: Dict, cost_data: Dict) -> List:
        peak_hours = [8, 9, 10, 18, 19, 20, 21]
        peak_usage = sum(daily_profile[h] for h in peak_hours)
        total_usage = daily_profile.sum()
        peak_ratio = peak_usage / total_usage if total_usage > 0 else 0

        suggestions = []

        suggestions.append({
            'category': '峰谷电价优化',
            'icon': '⚡',
            'items': [
                '热水器：建议设置在23:00-7:00低谷时段加热',
                '洗衣机：尽量在22:00后或周末低谷时段使用',
                '电动汽车：充电时间安排在0:00-7:00谷段',
                '洗碗机：晚餐后推迟到22:00后启动'
            ]
        })

        if peak_ratio > 0.35:
            suggestions.append({
                'category': '高峰用电调整',
                'icon': '⏰',
                'items': [
                    f'您高峰用电占比{peak_ratio*100:.1f}%，建议减少18:00-22:00时段高能耗设备使用',
                    '空调在高峰时段可适当调高1-2度，降低功率',
                    '电水壶烧水提前或推迟到非高峰时段',
                    '避免同时使用多个大功率电器'
                ]
            })

        suggestions.append({
            'category': '设备节能措施',
            'icon': '🔧',
            'items': [
                '空调：定期清洗滤网，设置26度以上，配合风扇使用',
                '冰箱：远离热源，减少开门次数，及时除霜',
                '热水器：温度设置在45-50度，不用时关闭电源',
                '灯具：全部更换为LED灯，随手关灯',
                '待机耗电：电视、路由器等不用时拔掉插头'
            ]
        })

        suggestions.append({
            'category': '行为习惯改进',
            'icon': '💡',
            'items': [
                '养成随手关灯的习惯，充分利用自然光',
                '减少冰箱开门次数和时间',
                '衣物集中洗涤，减少洗衣机使用次数',
                '微波炉加热食物时加盖，减少加热时间',
                '使用节能模式（空调、洗衣机等）'
            ]
        })

        if savings_data['monthly_savings'] > 30:
            suggestions.append({
                'category': '预期收益',
                'icon': '💰',
                'items': [
                    f'开通峰谷电价后每月预计节省¥{savings_data["monthly_savings"]:.2f}',
                    f'一年可节省¥{savings_data["yearly_savings"]:.2f}！',
                    '节省的费用可用于购买智能插座等节能设备',
                    '建议向电网公司申请开通居民峰谷电价'
                ]
            })

        return suggestions
