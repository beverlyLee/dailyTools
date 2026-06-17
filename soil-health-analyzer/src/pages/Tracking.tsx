import { useState, useEffect } from 'react';
import { TrendingUp, Calendar, BarChart3, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Radar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import type { TrackingRecord } from '@shared/types';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale
);

const RADAR_LABELS = ['pH', '有机质', '全氮', '有效磷', '速效钾'];

function getEffectivenessRating(delta: number): { text: string; cls: string } {
  if (delta >= 15) return { text: '显著改善', cls: 'grade-excellent' };
  if (delta >= 5) return { text: '有所改善', cls: 'grade-good' };
  if (delta >= 0) return { text: '基本持平', cls: 'grade-medium' };
  return { text: '有所恶化', cls: 'grade-poor' };
}

function scoreToArr(s: TrackingRecord['scores']): number[] {
  return [s.ph, s.organicMatter, s.nitrogen, s.phosphorus, s.potassium];
}

function ChangeArrow({ value }: { value: number }) {
  if (value > 0) return <ArrowUpRight className="w-4 h-4 text-soil-green" />;
  if (value < 0) return <ArrowDownRight className="w-4 h-4 text-soil-red" />;
  return <Minus className="w-4 h-4 text-soil-yellow" />;
}

export default function Tracking() {
  const [records, setRecords] = useState<TrackingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/records/tracking')
      .then((r) => r.json())
      .then((json) => {
        const data: TrackingRecord[] = json.data ?? []
        setRecords(data.sort((a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime()));
      })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, []);

  const years = [...new Set(records.map((r) => new Date(r.testDate).getFullYear()))].sort((a, b) => b - a);
  const [yearA, setYearA] = useState<number | null>(null);
  const [yearB, setYearB] = useState<number | null>(null);

  useEffect(() => {
    if (years.length >= 2 && yearA === null) {
      setYearA(years[0]);
      setYearB(years[1]);
    } else if (years.length === 1 && yearA === null) {
      setYearA(years[0]);
      setYearB(years[0]);
    }
  }, [years]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-earth-500 text-lg">加载中...</div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <BarChart3 className="w-16 h-16 text-earth-300" />
        <p className="text-earth-500 text-lg">暂无历史监测数据，请先进行土壤检测</p>
        <a href="/assessment" className="btn-primary">前往检测</a>
      </div>
    );
  }

  const recordA = records.find((r) => new Date(r.testDate).getFullYear() === yearA);
  const recordB = records.find((r) => new Date(r.testDate).getFullYear() === yearB);

  const radarData = {
    labels: RADAR_LABELS,
    datasets: [
      ...(recordA
        ? [
            {
              label: `${yearA}年`,
              data: scoreToArr(recordA.scores),
              borderColor: 'rgb(34,197,94)',
              backgroundColor: 'rgba(34,197,94,0.2)',
              pointBackgroundColor: 'rgb(34,197,94)',
            },
          ]
        : []),
      ...(recordB && yearB !== yearA
        ? [
            {
              label: `${yearB}年`,
              data: scoreToArr(recordB.scores),
              borderColor: 'rgb(245,158,11)',
              backgroundColor: 'rgba(245,158,11,0.2)',
              pointBackgroundColor: 'rgb(245,158,11)',
            },
          ]
        : []),
    ],
  };

  const radarOptions = {
    scales: {
      r: {
        suggestedMax: 100,
        beginAtZero: true,
        ticks: { stepSize: 20 },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
    },
    plugins: { legend: { position: 'top' as const } },
  };

  const lineData = {
    labels: records.map((r) => r.testDate),
    datasets: [
      {
        label: 'SHI',
        data: records.map((r) => r.shi),
        borderColor: 'rgb(34,197,94)',
        backgroundColor: 'rgba(34,197,94,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: records.map((_, i) => (i === 0 || i === records.length - 1 ? 7 : 4)),
        pointBackgroundColor: records.map((_, i) => {
          if (i === 0) return 'rgb(59,130,246)';
          if (i === records.length - 1) return 'rgb(239,68,68)';
          return 'rgb(34,197,94)';
        }),
        pointBorderWidth: records.map((_, i) => (i === 0 || i === records.length - 1 ? 3 : 1)),
        pointStyle: records.map((_, i) =>
          i === 0 || i === records.length - 1 ? 'rectRot' as const : 'circle' as const
        ),
      },
    ],
  };

  const lineOptions = {
    scales: {
      y: { suggestedMin: 0, suggestedMax: 100 },
      x: {},
    },
    plugins: { legend: { display: false } },
  };

  const first = records[0];
  const last = records[records.length - 1];
  const indicatorKeys: { key: keyof TrackingRecord['scores']; label: string }[] = [
    { key: 'ph', label: 'pH' },
    { key: 'organicMatter', label: '有机质' },
    { key: 'nitrogen', label: '全氮' },
    { key: 'phosphorus', label: '有效磷' },
    { key: 'potassium', label: '速效钾' },
  ];

  const shiDelta = last.shi - first.shi;
  const rating = getEffectivenessRating(shiDelta);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-earth-500 flex items-center gap-2">
          <TrendingUp className="w-7 h-7" />
          地力演变追踪
        </h1>
        <p className="text-earth-300 mt-1">历年监测数据对比分析，评估改良措施有效性</p>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3 text-earth-500 font-medium">
          <Calendar className="w-5 h-5" />
          <span>年份选择</span>
        </div>
        <div className="flex gap-4">
          <select
            className="btn-secondary"
            value={yearA ?? ''}
            onChange={(e) => setYearA(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          <span className="self-center text-earth-300">vs</span>
          <select
            className="btn-secondary"
            value={yearB ?? ''}
            onChange={(e) => setYearB(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-semibold text-earth-500 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          指标雷达对比
        </h2>
        <div className="max-w-md mx-auto">
          <Radar data={radarData} options={radarOptions} />
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-semibold text-earth-500 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          SHI 趋势变化
        </h2>
        <Line data={lineData} options={lineOptions} />
        <div className="flex gap-6 mt-3 text-sm text-earth-300 justify-center">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-blue-500" /> 首次检测
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-red-500" /> 最近检测
          </span>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-semibold text-earth-500 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          改良效果评估
        </h2>
        {records.length < 2 ? (
          <p className="text-earth-300">数据不足，需要至少两次检测才能评估改良效果</p>
        ) : (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg text-center ${rating.cls}`}>
              <div className="text-2xl font-bold">{rating.text}</div>
              <div className="text-sm mt-1">
                SHI {first.shi.toFixed(1)} → {last.shi.toFixed(1)}（{shiDelta >= 0 ? '+' : ''}{shiDelta.toFixed(1)}）
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {indicatorKeys.map(({ key, label }) => {
                const delta = last.scores[key] - first.scores[key];
                return (
                  <div key={key} className="bg-earth-50 rounded-lg p-3 text-center">
                    <div className="text-earth-300 text-sm">{label}</div>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <span className="font-semibold text-earth-500">{last.scores[key].toFixed(1)}</span>
                      <ChangeArrow value={delta} />
                    </div>
                    <div className="text-xs text-earth-300 mt-0.5">
                      {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
