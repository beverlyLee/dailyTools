'use client';

import ReactECharts from 'echarts-for-react';
import { Transaction } from '@/types/transaction';
import { calculateSunburstData } from '@/lib/utils/stats';

interface SunburstChartProps {
  transactions: Transaction[];
  height?: number | string;
}

export default function SunburstChart({ transactions, height = 500 }: SunburstChartProps) {
  const option = {
    title: {
      text: '消费层级分布',
      left: 'center',
      top: 10,
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: function(params: any) {
        const percent = ((params.value / params.treePathInfo[0].value) * 100).toFixed(1);
        return `${params.name}<br/>金额: ¥${params.value.toFixed(2)}<br/>占比: ${percent}%`;
      }
    },
    series: {
      type: 'sunburst',
      data: calculateSunburstData(transactions),
      radius: ['15%', '80%'],
      center: ['50%', '55%'],
      sort: function(a: any, b: any) {
        return b.value - a.value;
      },
      emphasis: {
        focus: 'ancestor'
      },
      levels: [
        {},
        {
          r0: '15%',
          r: '40%',
          itemStyle: {
            borderWidth: 2,
            borderColor: '#fff'
          },
          label: {
            show: true,
            fontSize: 12,
            position: 'outside'
          }
        },
        {
          r0: '40%',
          r: '60%',
          itemStyle: {
            borderWidth: 2,
            borderColor: '#fff'
          },
          label: {
            show: true,
            fontSize: 10
          }
        },
        {
          r0: '60%',
          r: '80%',
          itemStyle: {
            borderWidth: 2,
            borderColor: '#fff'
          },
          label: {
            show: true,
            fontSize: 9
          }
        }
      ]
    },
    color: [
      '#165DFF',
      '#0FC6C2',
      '#722ED1',
      '#FF7D00',
      '#F53F3F',
      '#00B42A',
      '#168CFF',
      '#CB2634',
      '#86909C',
      '#FFC53D'
    ]
  };

  return (
    <div className="w-full bg-white rounded-xl p-4 shadow-sm">
      <ReactECharts 
        option={option} 
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
