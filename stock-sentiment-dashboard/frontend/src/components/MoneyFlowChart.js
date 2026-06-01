import React from 'react';
import { Column } from '@ant-design/plots';

const MoneyFlowChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>暂无数据</div>;
  }

  const chartData = data.map(item => ({
    日期: item.trade_date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
    主力净流入: item.main_net_inflow / 100000000,
  }));

  const config = {
    data: chartData,
    xField: '日期',
    yField: '主力净流入',
    color: (d) => d.主力净流入 > 0 ? '#ff4d4f' : '#52c41a',
    label: {
      position: 'middle',
      style: {
        fill: '#fff',
        opacity: 0.6,
      },
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    yAxis: {
      label: {
        formatter: (v) => `${v}亿`,
      },
    },
    tooltip: {
      formatter: (datum) => {
        return {
          name: '主力净流入',
          value: `${datum.主力净流入.toFixed(2)}亿`,
        };
      },
    },
    slider: {
      start: 0,
      end: 1,
    },
  };

  return <Column {...config} />;
};

export default MoneyFlowChart;
