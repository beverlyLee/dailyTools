import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface CalendarHeatmapProps {
  data: [string, number][];
  illness: string;
  year?: number;
  month?: number;
}

const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  data,
  illness,
  year = 2025,
  month,
}) => {
  const chartHeight = month ? 280 : 320;

  const option = useMemo<EChartsOption>(() => {
    const displayRange = month
      ? `${year}-${String(month).padStart(2, '0')}`
      : `${year}`;

    const cellSize: (number | 'auto')[] = month ? [50, 30] : ['auto', 20];
    const fontSize = month ? 13 : 11;

    return {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          if (!params.data) return '';
          const date = params.data[0];
          const risk = params.data[1];
          const riskPercent = (risk * 100).toFixed(2);
          const riskLevel =
            risk >= 0.3 ? '高风险' : risk >= 0.15 ? '中风险' : '低风险';
          return `${date}<br/>${illness}风险: ${riskPercent}%<br/>风险等级: ${riskLevel}`;
        },
      },
      visualMap: {
        min: 0,
        max: 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 5,
        itemWidth: 20,
        itemHeight: 120,
        textStyle: {
          fontSize: 11,
          color: '#666',
        },
        inRange: {
          color: [
            '#ebedf0',
            '#c6e48b',
            '#7bc96f',
            '#239a3b',
            '#f0ad4e',
            '#d9534f',
            '#c9302c',
          ],
        },
        formatter: (value: any) => {
          return `${(value as number * 100).toFixed(0)}%`;
        },
        text: ['高', '低'],
        textGap: 10,
      },
      calendar: {
        top: 30,
        left: 60,
        right: 60,
        cellSize: cellSize,
        range: displayRange,
        itemStyle: {
          borderWidth: 2,
          borderColor: '#fff',
        },
        yearLabel: { show: false },
        monthLabel: {
          nameMap: [
            '1月',
            '2月',
            '3月',
            '4月',
            '5月',
            '6月',
            '7月',
            '8月',
            '9月',
            '10月',
            '11月',
            '12月',
          ],
          fontSize: 13,
          color: '#555',
          fontWeight: 500,
        },
        dayLabel: {
          firstDay: 1,
          nameMap: ['日', '一', '二', '三', '四', '五', '六'],
          fontSize: fontSize,
          color: '#888',
        },
        splitLine: {
          show: false,
        },
      },
      series: [
        {
          type: 'heatmap',
          coordinateSystem: 'calendar',
          data: data,
          label: {
            show: month ? true : false,
            formatter: (params: any) => {
              if (!params.data) return '';
              const dateStr = params.data[0];
              const day = parseInt(dateStr.split('-')[2]);
              return day.toString();
            },
            color: '#333',
            fontSize: 11,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
        },
      ],
    };
  }, [data, illness, year, month]);

  return (
    <div className="heatmap-wrapper">
      <ReactECharts
        option={option}
        style={{ height: chartHeight, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};

export default CalendarHeatmap;
