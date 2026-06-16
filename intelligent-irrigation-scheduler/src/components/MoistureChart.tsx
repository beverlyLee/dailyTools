import {
  AreaChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Legend,
} from 'recharts';
import type { SoilSimulationResponse, MoistureStatus } from '../../shared/types';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';

interface MoistureChartProps {
  data: SoilSimulationResponse | null;
  loading?: boolean;
  compact?: boolean;
  height?: number;
}

const STATUS_COLORS: Record<MoistureStatus, string> = {
  sufficient: '#2D5A3D',
  moderate: '#E8A838',
  deficit: '#F97316',
  severe: '#DC2626',
};

const STATUS_LABELS: Record<MoistureStatus, string> = {
  sufficient: '墒情充足',
  moderate: '墒情适中',
  deficit: '墒情亏缺',
  severe: '严重亏缺',
};

function getStatusColor(moisture: number, sim: SoilSimulationResponse): MoistureStatus {
  const range = sim.fieldCapacity - sim.wiltingPoint;
  if (moisture >= sim.fieldCapacity * 0.8) return 'sufficient';
  if (moisture >= sim.criticalMoisture) return 'moderate';
  if (moisture >= sim.wiltingPoint + range * 0.15) return 'deficit';
  return 'severe';
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card !rounded-xl p-3 text-sm shadow-xl border">
        <p className="font-semibold text-gray-800 dark:text-gray-100 mb-2">
          {dayjs(label).format('M月D日')}
        </p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2 py-0.5">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-300">{entry.name}:</span>
            <span className="font-medium text-gray-800 dark:text-gray-100">
              {entry.value?.toFixed ? entry.value.toFixed(1) : entry.value}
              {entry.dataKey === 'moisture' ? '%' : entry.dataKey === 'rainfallMm' ? 'mm' : 'mm'}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function MoistureChart({ data, loading, compact, height = 360 }: MoistureChartProps) {
  if (loading || !data || !data.moistureCurve || data.moistureCurve.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 skeleton rounded-lg w-32" />
          <div className="h-4 skeleton rounded-lg w-40" />
        </div>
        <div className="skeleton rounded-xl" style={{ height }} />
      </div>
    );
  }

  const chartData = data.moistureCurve.map((point, idx) => {
    const status = getStatusColor(point.moisture, data);
    return {
      ...point,
      id: `moisture-${idx}-${point.date}`,
      statusColor: STATUS_COLORS[status],
      date: dayjs(point.date).format('MM-DD'),
      fullDate: point.date,
    };
  });

  const maxRainfall = Math.max(...chartData.map((d) => d.rainfallMm), 10);
  const yAxisMax = Math.max(data.fieldCapacity + 5, 50);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-serif font-bold text-gray-800 dark:text-gray-100">
          {compact ? '墒情趋势' : '土壤含水量模拟曲线'}
        </h3>
        {!compact && (
          <div className="flex flex-wrap gap-3 text-xs">
            {(['sufficient', 'moderate', 'deficit', 'severe'] as MoistureStatus[]).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[s] }}
                />
                <span className="text-gray-600 dark:text-gray-400">
                  {STATUS_LABELS[s]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="moistureGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2D5A3D" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#2D5A3D" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4A90B8" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#4A90B8" stopOpacity={0.3} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(0,0,0,0.05)"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
            tickLine={false}
          />

          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            domain={[0, yAxisMax]}
            label={{
              value: '含水量 %',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 11, fill: '#6b7280' },
              offset: 10,
            }}
          />

          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            domain={[0, Math.max(maxRainfall * 1.2, 20)]}
            label={{
              value: '降雨 mm',
              angle: 90,
              position: 'insideRight',
              style: { fontSize: 11, fill: '#6b7280' },
              offset: 10,
            }}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4A90B8', strokeDasharray: '5 5' }} />

          {!compact && (
            <>
              <ReferenceLine
                yAxisId="left"
                y={data.fieldCapacity}
                stroke="#2D5A3D"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{
                  value: `田间持水量 ${data.fieldCapacity}%`,
                  position: 'top',
                  fill: '#2D5A3D',
                  fontSize: 10,
                }}
              />
              <ReferenceLine
                yAxisId="left"
                y={data.criticalMoisture}
                stroke="#E8A838"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{
                  value: `临界含水量 ${data.criticalMoisture}%`,
                  position: 'top',
                  fill: '#B8812A',
                  fontSize: 10,
                }}
              />
              <ReferenceLine
                yAxisId="left"
                y={data.wiltingPoint}
                stroke="#DC2626"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{
                  value: `凋萎系数 ${data.wiltingPoint}%`,
                  position: 'bottom',
                  fill: '#DC2626',
                  fontSize: 10,
                }}
              />
            </>
          )}

          <Bar
            yAxisId="right"
            dataKey="rainfallMm"
            name="降雨量"
            fill="url(#rainGradient)"
            radius={[4, 4, 0, 0]}
            barSize={compact ? 8 : 16}
            animationDuration={800}
          />

          <Area
            yAxisId="left"
            type="monotone"
            dataKey="moisture"
            name="土壤含水量"
            stroke="#2D5A3D"
            strokeWidth={2.5}
            fill="url(#moistureGradient)"
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={compact ? 2 : 4}
                  fill={payload.statusColor}
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              );
            }}
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
            animationDuration={800}
          />

          {!compact && (
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
              formatter={(value: string) => (
                <span className="text-gray-600 dark:text-gray-400">{value}</span>
              )}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
