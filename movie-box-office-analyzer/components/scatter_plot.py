import plotly.graph_objects as go
import plotly.express as px
import pandas as pd

class ScatterPlot:
    @staticmethod
    def create_rating_boxoffice_scatter(movies_data):
        df = pd.DataFrame(movies_data)
        
        fig = go.Figure()
        
        colors = px.colors.qualitative.Set3
        
        fig.add_trace(go.Scatter(
            x=df['rating'],
            y=df['box_office'] / 10000,
            mode='markers+text',
            marker=dict(
                size=20,
                color=colors[:len(df)],
                opacity=0.8,
                line=dict(width=2, color='DarkSlateGrey')
            ),
            text=df['name'],
            textposition='top center',
            hovertemplate='<b>%{text}</b><br>' +
                          '评分: %{x}<br>' +
                          '票房: %{y:.1f}亿<br>' +
                          '<extra></extra>',
            customdata=df['id']
        ))
        
        fig.update_layout(
            title={
                'text': '热映电影票房-评分关系分析',
                'y': 0.95,
                'x': 0.5,
                'xanchor': 'center',
                'yanchor': 'top',
                'font': dict(size=20)
            },
            xaxis_title={
                'text': '豆瓣评分',
                'font': dict(size=14)
            },
            yaxis_title={
                'text': '累计票房 (亿元)',
                'font': dict(size=14)
            },
            hovermode='closest',
            template='plotly_white',
            height=600,
            showlegend=False,
            xaxis=dict(
                range=[df['rating'].min() - 0.5, df['rating'].max() + 0.5],
                tickfont=dict(size=12)
            ),
            yaxis=dict(
                tickfont=dict(size=12)
            )
        )
        
        return fig
