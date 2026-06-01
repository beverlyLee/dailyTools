import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from typing import Dict, List, Tuple
from plotly.subplots import make_subplots


class LoadProfileAnalyzer:
    PERIOD_COLORS = {
        'peak': '#FF6B6B',
        'normal': '#4ECDC4',
        'valley': '#95E1D3'
    }

    def __init__(self, daily_profile: pd.Series, tou_hours: Dict[str, List[int]]):
        self.daily_profile = daily_profile
        self.tou_hours = tou_hours
        self.hours = list(range(24))

    def get_period_for_hour(self, hour: int) -> str:
        for period, hours in self.tou_hours.items():
            if hour in hours:
                return period
        return 'normal'

    def create_load_curve(self) -> go.Figure:
        fig = go.Figure()

        colors = [self.PERIOD_COLORS[self.get_period_for_hour(h)] for h in self.hours]

        fig.add_trace(go.Bar(
            x=self.hours,
            y=self.daily_profile.values,
            marker_color=colors,
            name='用电量',
            hovertemplate='<b>%{x}:00</b><br>用电量: %{y:.2f} kWh',
        ))

        fig.add_trace(go.Scatter(
            x=self.hours,
            y=self.daily_profile.values,
            mode='lines+markers',
            line=dict(color='#2C3E50', width=2),
            marker=dict(size=6),
            name='负荷曲线',
            hoverinfo='skip'
        ))

        for period, hours_list in self.tou_hours.items():
            if hours_list:
                fig.add_vrect(
                    x0=min(hours_list) - 0.5,
                    x1=max(hours_list) + 0.5,
                    fillcolor=self.PERIOD_COLORS[period],
                    opacity=0.1,
                    layer="below",
                    line_width=0,
                )

        fig.update_layout(
            title='典型日负荷曲线',
            xaxis_title='时间 (小时)',
            yaxis_title='用电量 (kWh)',
            barmode='overlay',
            hovermode='x unified',
            showlegend=True,
            height=400
        )

        return fig

    def create_period_pie(self) -> go.Figure:
        breakdown = {'peak': 0, 'normal': 0, 'valley': 0}

        for hour in self.hours:
            period = self.get_period_for_hour(hour)
            breakdown[period] += self.daily_profile[hour]

        labels = ['尖峰时段', '平段时段', '谷段时段']
        values = [breakdown['peak'], breakdown['normal'], breakdown['valley']]
        colors = [self.PERIOD_COLORS['peak'], self.PERIOD_COLORS['normal'],
                  self.PERIOD_COLORS['valley']]

        fig = go.Figure(data=[go.Pie(
            labels=labels,
            values=values,
            hole=.3,
            marker=dict(colors=colors),
            textinfo='label+percent',
            hovertemplate='<b>%{label}</b><br>用电量: %{value:.2f} kWh',
        )])

        fig.update_layout(
            title='各时段用电占比',
            height=400
        )

        return fig

    def create_savings_analysis(self, savings_data: Dict) -> go.Figure:
        fig = go.Figure()

        categories = ['当前电费', '优化后电费']
        values = [savings_data['current_cost'], savings_data['optimized_cost']]
        colors = ['#FF6B6B', '#4ECDC4']

        fig.add_trace(go.Bar(
            x=categories,
            y=values,
            marker_color=colors,
            text=[f'¥{v:.2f}' for v in values],
            textposition='auto',
        ))

        fig.update_layout(
            title='电费优化对比',
            yaxis_title='月电费 (元)',
            height=350,
            showlegend=False
        )

        return fig

    def create_optimization_suggestion(self) -> List[Dict]:
        peak_hours = self.tou_hours['peak']
        peak_usage = sum(self.daily_profile[h] for h in peak_hours)
        total_usage = self.daily_profile.sum()
        peak_ratio = peak_usage / total_usage if total_usage > 0 else 0

        suggestions = []

        if peak_ratio > 0.4:
            suggestions.append({
                'type': 'high',
                'title': '高峰用电占比过高',
                'content': f'高峰时段用电占比{peak_ratio*100:.1f}%，建议将高能耗设备移至谷段使用'
            })

        valley_hours = self.tou_hours['valley']
        max_hour = self.daily_profile.idxmax()
        max_usage = self.daily_profile.max()

        if max_hour in peak_hours:
            suggestions.append({
                'type': 'warning',
                'title': '用电峰值在高峰时段',
                'content': f'最大用电负荷{max_usage:.2f}kWh出现在{max_hour}:00，正值电价高峰'
            })

        avg_usage = self.daily_profile.mean()
        for hour in self.hours:
            if self.daily_profile[hour] < avg_usage * 0.2:
                suggestions.append({
                    'type': 'info',
                    'title': '存在待机耗电',
                    'content': f'{hour}:00时段用电量较低，建议检查设备待机状态'
                })
                break

        if not suggestions:
            suggestions.append({
                'type': 'success',
                'title': '用电习惯良好',
                'content': '您的用电时间分布较为合理，继续保持！'
            })

        return suggestions

    def create_hourly_detail_table(self) -> pd.DataFrame:
        data = []
        for hour in self.hours:
            period = self.get_period_for_hour(hour)
            data.append({
                '时段': f'{hour:02d}:00',
                '用电量(kWh)': round(self.daily_profile[hour], 2),
                '电价时段': '尖峰' if period == 'peak' else ('平段' if period == 'normal' else '谷段')
            })
        return pd.DataFrame(data)
