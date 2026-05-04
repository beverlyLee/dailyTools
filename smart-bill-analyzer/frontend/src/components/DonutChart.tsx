import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface DonutChartProps {
  data: Record<string, number>;
  title?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  '餐饮': '#ff9800',
  '购物': '#9c27b0',
  '交通': '#2196f3',
  '娱乐': '#4caf50',
  '居住': '#ffeb3b',
  '医疗': '#e91e63',
  '教育': '#00bcd4',
  '其他': '#9e9e9e',
};

export const DonutChart: React.FC<DonutChartProps> = ({ 
  data, 
  title = '消费分类占比' 
}) => {
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
      itemStyle: {
        color: CATEGORY_COLORS[name] || '#9e9e9e',
      },
    }))
    .sort((a, b) => b.value - a.value);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const option: EChartsOption = {
    title: {
      text: title,
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 600,
        color: '#333',
      },
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#667eea',
      borderWidth: 1,
      textStyle: {
        color: '#333',
      },
      formatter: (params: any) => {
        const percent = total > 0 ? ((params.value / total) * 100).toFixed(1) : '0';
        return `<div style="font-weight: 600; margin-bottom: 5px;">${params.name}</div>
                <div>金额: <span style="color: #e74c3c; font-weight: 600;">¥${params.value.toFixed(2)}</span></div>
                <div>占比: <span style="color: #667eea; font-weight: 600;">${percent}%</span></div>`;
      },
    },
    legend: {
      orient: 'vertical',
      left: '5%',
      top: 'middle',
      itemGap: 15,
      itemWidth: 12,
      itemHeight: 12,
      textStyle: {
        fontSize: 13,
        color: '#555',
      },
      formatter: (name: string) => {
        const item = chartData.find(d => d.name === name);
        if (item) {
          const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
          return `${name}  ${percent}%`;
        }
        return name;
      },
    },
    series: [
      {
        name: '消费分类',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['65%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 18,
            fontWeight: 'bold',
            formatter: '{b}\n{d}%',
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
        labelLine: {
          show: false,
        },
        data: chartData,
      },
    ],
  };

  return (
    <div className="chart-container">
      <ReactECharts 
        option={option} 
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};
