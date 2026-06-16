import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { MapPin, CloudRain, Droplets, Sun, CheckCircle2, Umbrella } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import RainSimToggle from '@/components/RainSimToggle';

const CITIES = ['北京', '郑州', '兰州', '石家庄', '济南'];

function RainTooltip({ active, payload, label }: any) {
  if (active && payload?.length) {
    return (
      <div className="glass-card !rounded-xl p-3 text-sm shadow-xl">
        <p className="font-semibold text-gray-800 dark:text-gray-100 mb-2">
          {dayjs(label).format('M月D日 HH时')}
        </p>
        {payload.map((e: any, i: number) => (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <span
              className="w-3 h-3 rounded-full"
              style={{
                background: e.payload?.precipitationProb > 60
                  ? 'linear-gradient(135deg,#1e40af,#4A90B8)'
                  : e.payload?.precipitationProb > 30
                  ? 'linear-gradient(135deg,#4A90B8,#7CB8D9)'
                  : 'linear-gradient(135deg,#7CB8D9,#dbeafe)'
              }}
            />
            <span className="text-gray-600 dark:text-gray-300">{e.name}:</span>
            <span className="font-medium text-gray-800 dark:text-gray-100">
              {Number(e.value).toFixed(1)} mm
            </span>
          </div>
        ))}
        {payload[0]?.payload?.precipitationProb !== undefined && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-600 flex items-center gap-2 text-xs">
            <Umbrella className="w-3.5 h-3.5 text-sky-blue" />
            <span className="text-gray-500 dark:text-gray-400">降水概率:</span>
            <span className="font-medium text-sky-blue">
              {payload[0].payload.precipitationProb}%
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
}

function LineTooltip({ active, payload, label }: any) {
  if (active && payload?.length) {
    return (
      <div className="glass-card !rounded-xl p-3 text-sm shadow-xl">
        <p className="font-semibold text-gray-800 dark:text-gray-100 mb-2">
          {dayjs(label).format('M月D日 HH时')}
        </p>
        {payload.map((e: any, i: number) => (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: e.color }} />
            <span className="text-gray-600 dark:text-gray-300">{e.name}:</span>
            <span className="font-medium text-gray-800 dark:text-gray-100">
              {Number(e.value).toFixed(2)} mm
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function WeatherPage() {
  const { weather, weatherLoading, fetchWeather, userConfig } = useAppStore();
  const [city, setCity] = useState(userConfig.defaultCity);

  useEffect(() => {
    fetchWeather(city);
  }, [city]);

  const rainChartData = weather?.hourly.slice(0, 72).map((h) => ({
    time: dayjs(h.time).format('MM-DD HH:00'),
    fullTime: h.time,
    precipitation: h.precipitation,
    precipitationProb: h.precipitationProb,
  })) || [];

  const etChartData = weather?.hourly.slice(0, 72).map((h) => ({
    time: dayjs(h.time).format('MM-DD HH:00'),
    fullTime: h.time,
    evaporation: h.evaporation,
    cropTranspiration: Number((h.evaporation * 0.85).toFixed(2)),
  })) || [];

  const totalRain72h = rainChartData.reduce((s, d) => s + d.precipitation, 0);
  const totalEt72h = etChartData.reduce((s, d) => s + d.evaporation, 0);
  const rainHours = rainChartData.filter((d) => d.precipitation > 0).length;

  const findDelayWindows = () => {
    const windows: { start: string; end: string; expected: number }[] = [];
    let inWindow = false;
    let startIdx = -1;
    let accum = 0;

    rainChartData.forEach((d, i) => {
      if (d.precipitationProb >= 60 && d.precipitation >= 0.5) {
        if (!inWindow) {
          inWindow = true;
          startIdx = i;
          accum = 0;
        }
        accum += d.precipitation;
      } else if (inWindow) {
        if (accum >= 5) {
          windows.push({
            start: rainChartData[startIdx].fullTime,
            end: rainChartData[i - 1]?.fullTime || rainChartData[startIdx].fullTime,
            expected: accum,
          });
        }
        inWindow = false;
      }
    });

    if (inWindow && accum >= 5) {
      const lastIdx = rainChartData.length - 1;
      windows.push({
        start: rainChartData[startIdx].fullTime,
        end: rainChartData[lastIdx].fullTime,
        expected: accum,
      });
    }
    return windows;
  };

  const delayWindows = weather?.hasEffectiveRain ? findDelayWindows() : [];

  if (weatherLoading && !weather) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-2">
          <div className="h-9 skeleton rounded-xl w-40" />
          <div className="h-5 skeleton rounded-lg w-72" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-6">
            <div className="h-7 skeleton rounded-lg w-48 mb-4" />
            <div className="skeleton rounded-xl" style={{ height: 280 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <RainSimToggle />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-800 dark:text-gray-100 mb-1">
            气象融合分析
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            多源气象数据融合，精准预测降雨与蒸发
          </p>
        </div>

        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary-green" />
          <div className="relative">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={cn(
                'input-field pr-8 appearance-none cursor-pointer',
                '!py-2 !pl-4 !pr-10 text-sm'
              )}
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: '72h累计降雨',
            value: `${totalRain72h.toFixed(1)} mm`,
            icon: CloudRain,
            color: 'sky-blue',
          },
          {
            label: '降雨小时数',
            value: `${rainHours} h`,
            icon: Umbrella,
            color: 'primary-green',
          },
          {
            label: '72h累计蒸发',
            value: `${totalEt72h.toFixed(1)} mm`,
            icon: Sun,
            color: 'amber',
          },
          {
            label: '是否有效降雨',
            value: weather?.hasEffectiveRain ? '是' : '否',
            icon: CheckCircle2,
            color: weather?.hasEffectiveRain ? 'primary-green' : 'soil-brown',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="glass-card p-4 data-card"
          >
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center mb-3',
                color === 'sky-blue' && 'bg-sky-blue/20',
                color === 'primary-green' && 'bg-primary-green/20',
                color === 'amber' && 'bg-amber/20',
                color === 'soil-brown' && 'bg-soil-brown/20'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5',
                  color === 'sky-blue' && 'text-sky-blue',
                  color === 'primary-green' && 'text-primary-green',
                  color === 'amber' && 'text-amber-dark',
                  color === 'soil-brown' && 'text-soil-brown'
                )}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
            <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{value}</div>
          </div>
        ))}
      </div>

      {weather?.hasEffectiveRain && delayWindows.length > 0 && (
        <div className="glass-card p-6 bg-gradient-to-br from-primary-green/10 to-sky-blue/10 border-primary-green/20">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary-green/20 flex items-center justify-center">
              <Umbrella className="w-5 h-5 text-primary-green" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-primary-green-dark dark:text-primary-green-light">
                降雨策略分析
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                检测到未来有有效降雨，可利用自然降雨减少灌溉
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {delayWindows.map((w, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-white/70 dark:bg-slate-700/50 border border-white/60 dark:border-slate-600/30"
              >
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  窗口期 #{i + 1}
                </div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
                  {dayjs(w.start).format('M月D日 HH:mm')} -{' '}
                  {dayjs(w.end).format('M月D日 HH:mm')}
                </div>
                <div className="flex items-center gap-2 text-sm text-primary-green-dark dark:text-primary-green-light">
                  <CloudRain className="w-4 h-4" />
                  预计降雨量 <span className="font-bold">{w.expected.toFixed(1)}mm</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-serif font-bold text-gray-800 dark:text-gray-100">
              72小时降水预报
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              颜色深浅表示降水概率，柱高表示降水量
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-gradient-to-b from-sky-blue-light/40 to-sky-blue-light/10" />
              <span>低概率</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-gradient-to-b from-sky-blue to-sky-blue/50" />
              <span>中概率</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-gradient-to-b from-sky-blue-dark to-sky-blue/70" />
              <span>高概率</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={rainChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {rainChartData.map((d, i) => (
                <linearGradient key={i} id={`rain-${i}`} x1="0" y1="0" x2="0" y2="1">
                  {d.precipitationProb > 60 ? (
                    <>
                      <stop offset="0%" stopColor="#2E6A8F" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#4A90B8" stopOpacity={0.5} />
                    </>
                  ) : d.precipitationProb > 30 ? (
                    <>
                      <stop offset="0%" stopColor="#4A90B8" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#7CB8D9" stopOpacity={0.4} />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor="#7CB8D9" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#dbeafe" stopOpacity={0.2} />
                    </>
                  )}
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0,0,0,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
              tickLine={false}
              interval={Math.floor(rainChartData.length / 12)}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              label={{
                value: 'mm',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 11, fill: '#6b7280' },
              }}
            />
            <Tooltip content={<RainTooltip />} />
            <Bar
              dataKey="precipitation"
              name="降水量"
              radius={[4, 4, 0, 0]}
              animationDuration={800}
              shape={(props: any) => {
                const { x, y, width, height, index } = props;
                return (
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    rx={4}
                    ry={4}
                    fill={`url(#rain-${index})`}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card p-6">
        <div className="mb-5">
          <h3 className="text-lg font-serif font-bold text-gray-800 dark:text-gray-100">
            蒸发量与作物蒸腾分析
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            综合评估水分消耗，辅助制定灌溉时机
          </p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={etChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="etGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E8A838" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#E8A838" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ctGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2D5A3D" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#2D5A3D" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0,0,0,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
              tickLine={false}
              interval={Math.floor(etChartData.length / 12)}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              label={{
                value: 'mm/h',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 11, fill: '#6b7280' },
              }}
            />
            <Tooltip content={<LineTooltip />} />
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
              formatter={(v: string) => (
                <span className="text-gray-600 dark:text-gray-400">{v}</span>
              )}
            />
            <Line
              type="monotone"
              dataKey="evaporation"
              name="土壤蒸发量"
              stroke="#E8A838"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
              animationDuration={800}
            />
            <Line
              type="monotone"
              dataKey="cropTranspiration"
              name="作物蒸腾量"
              stroke="#2D5A3D"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
