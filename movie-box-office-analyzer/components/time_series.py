import plotly.graph_objects as go
import pandas as pd

class TimeSeriesPlot:
    @staticmethod
    def create_boxoffice_trend(trend_data, movie_name):
        df = pd.DataFrame(trend_data)
        
        fig = go.Figure()
        
        fig.add_trace(go.Scatter(
            x=df['date'],
            y=df['box_office'] / 10000,
            mode='lines+markers',
            name='日票房',
            line=dict(
                color='#1f77b4',
                width=3,
                shape='spline'
            ),
            marker=dict(
                size=8,
                color='#ff7f0e',
                line=dict(width=2, color='white')
            ),
            fill='tozeroy',
            fillcolor='rgba(31, 119, 180, 0.2)',
            hovertemplate='<b>%{x}</b><br>' +
                          '日票房: %{y:.2f}亿<br>' +
                          '<extra></extra>'
        ))
        
        total_boxoffice = df['box_office'].sum() / 10000
        
        fig.update_layout(
            title={
                'text': f'{movie_name} - 上映30天票房走势',
                'y': 0.95,
                'x': 0.5,
                'xanchor': 'center',
                'yanchor': 'top',
                'font': dict(size=18)
            },
            xaxis_title={
                'text': '日期',
                'font': dict(size=12)
            },
            yaxis_title={
                'text': '日票房 (亿元)',
                'font': dict(size=12)
            },
            hovermode='x unified',
            template='plotly_white',
            height=450,
            showlegend=True,
            xaxis=dict(
                tickangle=-45,
                tickfont=dict(size=10),
                nticks=15
            ),
            yaxis=dict(
                tickfont=dict(size=10)
            ),
            annotations=[
                dict(
                    x=0.02,
                    y=0.98,
                    xref='paper',
                    yref='paper',
                    text=f'<b>累计票房: {total_boxoffice:.1f}亿</b>',
                    showarrow=False,
                    font=dict(size=14, color='#2ca02c'),
                    bgcolor='rgba(255,255,255,0.8)',
                    bordercolor='#2ca02c',
                    borderwidth=1
                )
            ]
        )
        
        return fig
