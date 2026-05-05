import React, { useEffect, useRef } from 'react';
import { Card, Row, Col, Empty } from 'antd';
import { Chart } from '@antv/g2';
import type { Stats, LogEntry } from '@/types';
import { prepareChartData, groupLogsByTime, LOG_LEVEL_ORDER } from '@/utils/helpers';
import { LOG_LEVEL_COLORS } from '@/utils/constants';

interface LevelDistributionProps {
  stats: Stats | null;
}

export const LevelDistributionChart: React.FC<LevelDistributionProps> = ({ stats }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const { levelData } = prepareChartData(stats);
    const nonZeroData = levelData.filter(d => d.count > 0);

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    if (nonZeroData.length === 0) {
      return;
    }

    const chart = new Chart({
      container: containerRef.current,
      autoFit: true,
      height: 250,
    });

    chart.data(nonZeroData);
    
    chart.coordinate({ type: 'theta', innerRadius: 0.4 });
    
    chart
      .interval()
      .adjust('stack')
      .position('count')
      .color('level', Object.values(LOG_LEVEL_COLORS))
      .label('level', {
        content: ({ level, count }) => `${level}: ${count}`,
      })
      .tooltip({
        showMarkers: false,
      });

    chart.interaction('element-active');
    
    chart.render();
    chartRef.current = chart;

    return () => {
      chart.destroy();
    };
  }, [stats]);

  return (
    <Card title="日志级别分布" size="small">
      <div ref={containerRef} style={{ height: 250 }}>
        {(!stats || Object.keys(stats.logs.by_level).length === 0) && (
          <Empty description="暂无数据" style={{ paddingTop: 80 }} />
        )}
      </div>
    </Card>
  );
};

interface ServiceDistributionProps {
  stats: Stats | null;
}

export const ServiceDistributionChart: React.FC<ServiceDistributionProps> = ({ stats }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const { serviceData } = prepareChartData(stats);

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    if (serviceData.length === 0) {
      return;
    }

    const chart = new Chart({
      container: containerRef.current,
      autoFit: true,
      height: 250,
    });

    chart.data(serviceData.sort((a, b) => b.count - a.count));
    
    chart
      .interval()
      .position('service*count')
      .color('service')
      .label('count', {
        position: 'top',
      })
      .tooltip({
        showMarkers: false,
      });

    chart.interaction('element-active');
    
    chart.render();
    chartRef.current = chart;

    return () => {
      chart.destroy();
    };
  }, [stats]);

  return (
    <Card title="服务分布" size="small">
      <div ref={containerRef} style={{ height: 250 }}>
        {(!stats || Object.keys(stats.logs.by_service).length === 0) && (
          <Empty description="暂无数据" style={{ paddingTop: 80 }} />
        )}
      </div>
    </Card>
  );
};

interface ErrorRateTrendProps {
  logs: LogEntry[];
}

export const ErrorRateTrendChart: React.FC<ErrorRateTrendProps> = ({ logs }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const timeData = groupLogsByTime(logs, 'hour');
    
    const trendData = timeData.map((item) => {
      const errorCount = (item.byLevel['Error'] || 0) + (item.byLevel['Fatal'] || 0);
      const totalCount = item.count;
      const errorRate = totalCount > 0 ? (errorCount / totalCount) * 100 : 0;
      
      return {
        time: item.time,
        errorRate: Number(errorRate.toFixed(2)),
        total: totalCount,
        errors: errorCount,
      };
    });

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    if (trendData.length === 0) {
      return;
    }

    const chart = new Chart({
      container: containerRef.current,
      autoFit: true,
      height: 300,
    });

    chart.data(trendData);
    
    chart.scale({
      errorRate: {
        min: 0,
        alias: '错误率 (%)',
      },
      total: {
        alias: '总日志数',
      },
    });

    chart.tooltip({
      showCrosshairs: true,
      shared: true,
    });

    chart.axis('errorRate', {
      title: {
        text: '错误率 (%)',
      },
    });

    chart.axis('total', {
      title: {
        text: '总日志数',
      },
      position: 'right',
    });

    chart
      .line()
      .position('time*errorRate')
      .color('#ff4d4f')
      .size(2)
      .shape('smooth');

    chart
      .point()
      .position('time*errorRate')
      .color('#ff4d4f')
      .shape('circle')
      .size(4);

    chart
      .interval()
      .position('time*total')
      .color('#1890ff')
      .opacity(0.3);

    chart.render();
    chartRef.current = chart;

    return () => {
      chart.destroy();
    };
  }, [logs]);

  return (
    <Card title="错误率趋势" size="small">
      <div ref={containerRef} style={{ height: 300 }}>
        {logs.length === 0 && (
          <Empty description="暂无数据" style={{ paddingTop: 100 }} />
        )}
      </div>
    </Card>
  );
};

interface AccessHeatmapProps {
  logs: LogEntry[];
}

export const AccessHeatmapChart: React.FC<AccessHeatmapProps> = ({ logs }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const dayMap: Record<string, number> = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
    };

    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    const heatmapData = Array.from({ length: 7 }, (_, dayIndex) => {
      return Array.from({ length: 24 }, (_, hour) => {
        return {
          day: dayNames[dayIndex],
          dayIndex,
          hour,
          count: 0,
        };
      });
    }).flat();

    logs.forEach((log) => {
      const date = new Date(log.timestamp);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const dayIndex = dayMap[dayName] || 0;
      const hour = date.getHours();

      const dataPoint = heatmapData.find(
        (d) => d.dayIndex === dayIndex && d.hour === hour
      );
      if (dataPoint) {
        dataPoint.count++;
      }
    });

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const hasData = heatmapData.some((d) => d.count > 0);
    if (!hasData) {
      return;
    }

    const chart = new Chart({
      container: containerRef.current,
      autoFit: true,
      height: 300,
    });

    chart.data(heatmapData);
    
    chart.scale({
      day: {
        type: 'cat',
      },
      hour: {
        type: 'cat',
      },
      count: {
        sync: true,
        nice: true,
      },
    });

    chart
      .cell()
      .position('day*hour')
      .color('count', ['#e8f4f8', '#91d5ff', '#40a9ff', '#1890ff', '#096dd9'])
      .style({
        lineWidth: 2,
        stroke: '#fff',
      })
      .tooltip({
        showMarkers: false,
        content: (item) => {
          return [
            { name: '时段', value: `${item.day} ${item.hour}:00` },
            { name: '日志数', value: item.count },
          ];
        },
      });

    chart.interaction('element-active');
    
    chart.render();
    chartRef.current = chart;

    return () => {
      chart.destroy();
    };
  }, [logs]);

  return (
    <Card title="访问热力图 (24小时/周)" size="small">
      <div ref={containerRef} style={{ height: 300 }}>
        {logs.length === 0 && (
          <Empty description="暂无数据" style={{ paddingTop: 100 }} />
        )}
      </div>
    </Card>
  );
};
