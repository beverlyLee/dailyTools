import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card } from 'antd';
import { ChartType, ChartDataPoint } from '../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

interface ChartComponentProps {
  type: ChartType;
  data: ChartDataPoint[];
  dataKeys: string[];
  labelKey: string;
  title?: string;
  height?: number;
}

export const ChartComponent: React.FC<ChartComponentProps> = ({
  type,
  data,
  dataKeys,
  labelKey,
  title,
  height = 300
}) => {
  const renderLines = () => {
    return dataKeys.map((key, index) => (
      <Line
        key={key}
        type="monotone"
        dataKey={key}
        stroke={COLORS[index % COLORS.length]}
        activeDot={{ r: 5 }}
        strokeWidth={2}
      />
    ));
  };

  const renderBars = () => {
    return dataKeys.map((key, index) => (
      <Bar
        key={key}
        dataKey={key}
        fill={COLORS[index % COLORS.length]}
      />
    ));
  };

  const renderAreas = () => {
    return dataKeys.map((key, index) => (
      <Area
        key={key}
        type="monotone"
        dataKey={key}
        stroke={COLORS[index % COLORS.length]}
        fill={COLORS[index % COLORS.length]}
        fillOpacity={0.3}
      />
    ));
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={labelKey} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #f0f0f0',
                  borderRadius: 8
                }}
              />
              <Legend />
              {renderLines()}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={labelKey} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #f0f0f0',
                  borderRadius: 8
                }}
              />
              <Legend />
              {renderBars()}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const pieDataKey = dataKeys[0] || 'value';
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={Math.min(height * 0.35, 80)}
                innerRadius={20}
                dataKey={pieDataKey}
                nameKey={labelKey}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #f0f0f0',
                  borderRadius: 8
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={labelKey} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #f0f0f0',
                  borderRadius: 8
                }}
              />
              <Legend />
              {renderAreas()}
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Card
      title={title}
      style={{ height: '100%', borderRadius: 8 }}
      styles={{
        body: { height: 'calc(100% - 56px)', padding: '16px' }
      }}
    >
      {renderChart()}
    </Card>
  );
};
