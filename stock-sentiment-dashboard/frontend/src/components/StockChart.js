import React from 'react';
import { DualAxes } from '@ant-design/plots';

const StockChart = ({ data }) => {
  if (!data || !data.times || data.times.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>暂无数据</div>;
  }

  const priceData = data.times.map((time, index) => ({
    time,
    价格: data.prices[index],
  }));

  const volumeData = data.times.map((time, index) => ({
    time,
    成交量: data.volumes[index],
  }));

  const config = {
    data: [priceData, volumeData],
    xField: 'time',
    yField: ['价格', '成交量'],
    meta: {
      价格: {
        alias: '股价',
        min: Math.min(...data.prices) * 0.995,
        max: Math.max(...data.prices) * 1.005,
      },
      成交量: {
        alias: '成交量',
      },
    },
    geometryOptions: [
      {
        geometry: 'line',
        color: '#1890ff',
        lineStyle: {
          lineWidth: 2,
        },
      },
      {
        geometry: 'column',
        color: '#95de64',
        columnWidthRatio: 0.4,
      },
    ],
    tooltip: {
      showMarkers: true,
    },
    slider: {
      start: 0,
      end: 1,
    },
    xAxis: {
      tickCount: 8,
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
  };

  return <DualAxes {...config} />;
};

export default StockChart;
