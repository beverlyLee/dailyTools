'use client';

import dynamic from 'next/dynamic';
import { Transaction } from '@/types/transaction';
import { calculateCategoryStats } from '@/lib/utils/stats';

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-xl">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

interface CategoryPieChartProps {
  transactions: Transaction[];
  height?: number | string;
}

export default function ClientPieChart({ transactions, height = 400 }: CategoryPieChartProps) {
  const categoryStats = calculateCategoryStats(transactions);
  
  const option = {
    title: {
      text: '消费分类占比',
      left: 'center',
      top: 10,
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: {
        fontSize: 12
      }
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '55%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: categoryStats.map(c => ({
          value: c.amount,
          name: c.name
        }))
      }
    ],
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
