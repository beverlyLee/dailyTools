'use client';

import dynamic from 'next/dynamic';
import { Transaction } from '@/types/transaction';

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-xl">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

interface SunburstChartProps {
  transactions: Transaction[];
  height?: number | string;
}

function calculateSunburstData(transactions: Transaction[]) {
  const expenses = transactions.filter(t => t.type === 'expense');
  
  const categoryTree: Record<string, Record<string, Record<string, number>>> = {};
  
  for (const t of expenses) {
    const level1 = t.category.level1;
    const level2 = t.category.level2;
    const level3 = t.category.level3 || '其他';
    
    if (!categoryTree[level1]) {
      categoryTree[level1] = {};
    }
    
    if (!categoryTree[level1][level2]) {
      categoryTree[level1][level2] = {};
    }
    
    if (!categoryTree[level1][level2][level3]) {
      categoryTree[level1][level2][level3] = 0;
    }
    
    categoryTree[level1][level2][level3] += t.amount;
  }
  
  const result: any[] = [];
  
  for (const [level1, level2Data] of Object.entries(categoryTree)) {
    const level1Children: any[] = [];
    
    for (const [level2, level3Data] of Object.entries(level2Data)) {
      const level2Children: any[] = [];
      
      for (const [level3, amount] of Object.entries(level3Data)) {
        if (Object.keys(level3Data).length > 1 || level3 !== '其他') {
          level2Children.push({
            name: level3,
            value: amount
          });
        }
      }
      
      if (level2Children.length > 0) {
        level1Children.push({
          name: level2,
          children: level2Children
        });
      } else {
        const totalAmount = Object.values(level3Data).reduce((a, b) => a + b, 0);
        level1Children.push({
          name: level2,
          value: totalAmount
        });
      }
    }
    
    result.push({
      name: level1,
      children: level1Children
    });
  }
  
  return result;
}

export default function ClientSunburstChart({ transactions, height = 500 }: SunburstChartProps) {
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
        if (!params.treePathInfo || !params.treePathInfo[0]) return '';
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
