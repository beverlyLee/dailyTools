import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface TrendChartProps {
  data: Record<string, number>;
  title?: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({ 
  data, 
  title = '消费趋势' 
}) => {
  const sortedKeys = Object.keys(data).sort();
  const dates = sortedKeys.map(date => {
    const parts = date.split('-');
    if (parts.length === 3) {
      return `${parts[1]}-${parts[2]}`;
    }
    return date;
  });
  const values = sortedKeys.map(key => data[key] || 0);

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
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#667eea',
      borderWidth: 1,
      textStyle: {
        color: '#333',
      },
      formatter: (params: any) => {
        const date = params[0].name;
        const value = params[0].value;
        return `<div style="font-weight: 600; margin-bottom: 5px;">${date}</div>
                <div>支出金额: <span style="color: #e74c3c; font-weight: 600;">¥${value.toFixed(2)}</span></div>`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '60px',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: {
        lineStyle: {
          color: '#ddd',
        },
      },
      axisLabel: {
        color: '#666',
        fontSize: 12,
        rotate: 45,
      },
    },
    yAxis: {
      type: 'value',
      name: '金额 (元)',
      nameTextStyle: {
        color: '#666',
        fontSize: 12,
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0',
          type: 'dashed',
        },
      },
      axisLabel: {
        color: '#666',
        fontSize: 12,
        formatter: '¥{value}',
      },
    },
    series: [
      {
        name: '支出金额',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#667eea' },
              { offset: 1, color: '#764ba2' },
            ],
          },
        },
        itemStyle: {
          color: '#667eea',
          borderColor: '#fff',
          borderWidth: 2,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(102, 126, 234, 0.3)' },
              { offset: 1, color: 'rgba(102, 126, 234, 0.05)' },
            ],
          },
        },
        data: values,
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
