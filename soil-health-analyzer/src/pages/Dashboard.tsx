import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, ClipboardList, TrendingUp, AlertTriangle, ArrowRight, Activity } from 'lucide-react'
import { useSoilStore } from '@/store/useSoilStore'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js'
import type { SoilRecord, TrackingRecord } from '@shared/types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

const gradeBg: Record<string, string> = {
  '优': 'bg-gradient-to-br from-green-500 to-green-600',
  '良': 'bg-gradient-to-br from-blue-500 to-blue-600',
  '中': 'bg-gradient-to-br from-amber-500 to-amber-600',
  '差': 'bg-gradient-to-br from-red-500 to-red-600',
  '未检测': 'bg-gradient-to-br from-gray-400 to-gray-500',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { shiResult, currentData } = useSoilStore()
  const [records, setRecords] = useState<SoilRecord[]>([])
  const [tracking, setTracking] = useState<TrackingRecord[]>([])

  const grade = shiResult?.grade ?? '未检测'

  useEffect(() => {
    fetch('/api/records')
      .then((r) => r.json())
      .then((json) => setRecords((json.data ?? []).slice(0, 5)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/records/tracking')
      .then((r) => r.json())
      .then((json) => setTracking(json.data ?? []))
      .catch(() => {})
  }, [])

  const statCards = [
    { label: 'SHI健康指数', value: shiResult?.shi?.toFixed(1) ?? '--', icon: Activity },
    { label: '等级评定', value: grade, icon: FlaskConical },
    { label: '主要退化类型', value: shiResult?.degradationTypes?.join('、') ?? '未检测', icon: AlertTriangle },
    { label: '检测日期', value: currentData?.testDate ?? '--', icon: ClipboardList },
  ]

  const actions = [
    { label: '健康指数评价', path: '/assessment', icon: FlaskConical },
    { label: '改良处方生成', path: '/prescription', icon: ClipboardList },
    { label: '地力演变追踪', path: '/tracking', icon: TrendingUp },
  ]

  const chartData = tracking.length > 0 ? {
    labels: tracking.map((t) => t.testDate),
    datasets: [{
      label: 'SHI',
      data: tracking.map((t) => t.shi),
      borderColor: '#2E7D32',
      backgroundColor: 'rgba(46,125,50,0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 3,
    }],
  } : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-earth-500">土壤健康仪表盘</h1>
        <p className="mt-1 text-earth-300">实时监测土壤健康状况，科学指导改良决策</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg ${gradeBg[grade]} flex items-center justify-center text-white`}>
              <card.icon size={22} />
            </div>
            <div>
              <p className="text-sm text-earth-300">{card.label}</p>
              <p className="text-lg font-semibold text-earth-500">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-earth-500 mb-4">快捷操作</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {actions.map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="btn-primary flex items-center justify-center gap-2"
            >
              <action.icon size={18} />
              {action.label}
              <ArrowRight size={16} />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-earth-500 mb-4">近期检测记录</h2>
          {records.length === 0 ? (
            <p className="text-earth-300 text-center py-8">暂无检测记录</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-earth-200">
                    <th className="text-left py-2 text-earth-300 font-medium">日期</th>
                    <th className="text-left py-2 text-earth-300 font-medium">pH</th>
                    <th className="text-left py-2 text-earth-300 font-medium">有机质</th>
                    <th className="text-left py-2 text-earth-300 font-medium">SHI</th>
                    <th className="text-left py-2 text-earth-300 font-medium">等级</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id ?? r.testDate} className="border-b border-earth-100 last:border-0">
                      <td className="py-2">{r.testDate}</td>
                      <td className="py-2">{r.ph}</td>
                      <td className="py-2">{r.organicMatter}</td>
                      <td className="py-2">{r.shi?.toFixed(1)}</td>
                      <td className="py-2">
                        <span className={`grade-${({ '优': 'excellent', '良': 'good', '中': 'medium', '差': 'poor' } as Record<string, string>)[r.grade] ?? 'medium'} px-2 py-0.5 rounded-full text-xs font-medium`}>
                          {r.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-earth-500 mb-4">SHI趋势</h2>
          {chartData ? (
            <Line data={chartData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false }, title: { display: false } },
              scales: { y: { beginAtZero: false, min: 0, max: 100 } },
            }} style={{ height: '200px' }} />
          ) : (
            <p className="text-earth-300 text-center py-8">暂无趋势数据</p>
          )}
        </div>
      </div>
    </div>
  )
}
