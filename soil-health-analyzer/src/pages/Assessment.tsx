import { useState, useEffect } from 'react'
import { FlaskConical, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { useSoilStore } from '@/store/useSoilStore'
import type { SoilData, SHIResult } from '@shared/types'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const gradeConfig: Record<string, { color: string; bg: string; css: string }> = {
  '优': { color: 'text-soil-green-dark', bg: 'bg-soil-green-light/30', css: 'grade-excellent' },
  '良': { color: 'text-blue-800', bg: 'bg-blue-100', css: 'grade-good' },
  '中': { color: 'text-amber-800', bg: 'bg-amber-100', css: 'grade-medium' },
  '差': { color: 'text-red-800', bg: 'bg-red-100', css: 'grade-poor' },
}

export default function Assessment() {
  const { currentData, shiResult, setCurrentData, setShiResult, setRecordId } = useSoilStore()

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    ph: currentData?.ph ?? 7,
    organicMatter: currentData?.organicMatter ?? 0,
    totalNitrogen: currentData?.totalNitrogen ?? 0,
    availablePhosphorus: currentData?.availablePhosphorus ?? 0,
    availablePotassium: currentData?.availablePotassium ?? 0,
    testDate: currentData?.testDate ?? today,
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (currentData) {
      setForm({
        ph: currentData.ph,
        organicMatter: currentData.organicMatter,
        totalNitrogen: currentData.totalNitrogen,
        availablePhosphorus: currentData.availablePhosphorus,
        availablePotassium: currentData.availablePotassium,
        testDate: currentData.testDate,
      })
    }
  }, [currentData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: name === 'testDate' ? value : Number(value) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      const result = json.data as SHIResult
      const soilData: SoilData = { ...form }
      setCurrentData(soilData)
      setShiResult(result)
      if (json.data.recordId) setRecordId(json.data.recordId)
    } catch {
      console.error('评估请求失败')
    } finally {
      setLoading(false)
    }
  }

  const chartData = shiResult
    ? {
        labels: ['pH', '有机质', '全氮', '有效磷', '速效钾'],
        datasets: [
          {
            label: '实际得分',
            data: [
              shiResult.scores.ph,
              shiResult.scores.organicMatter,
              shiResult.scores.nitrogen,
              shiResult.scores.phosphorus,
              shiResult.scores.potassium,
            ],
            backgroundColor: 'rgba(76, 120, 68, 0.2)',
            borderColor: 'rgb(76, 120, 68)',
            borderWidth: 2,
            pointBackgroundColor: 'rgb(76, 120, 68)',
          },
          {
            label: '理想值',
            data: [100, 100, 100, 100, 100],
            backgroundColor: 'rgba(200, 180, 140, 0.1)',
            borderColor: 'rgb(200, 180, 140)',
            borderDash: [6, 4],
            borderWidth: 1.5,
            pointBackgroundColor: 'rgb(200, 180, 140)',
          },
        ],
      }
    : null

  const chartOptions = {
    scales: {
      r: {
        suggestedMax: 100,
        beginAtZero: true,
        ticks: { stepSize: 20, font: { size: 10 } },
        pointLabels: { font: { size: 13 } },
      },
    },
    plugins: {
      legend: { position: 'bottom' as const },
    },
  }

  const grade = shiResult?.grade
  const config = grade ? gradeConfig[grade] : null

  return (
    <div className="flex gap-6 p-6 min-h-screen">
      <div className="w-1/2">
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <FlaskConical className="w-5 h-5 text-soil-green" />
            <h2 className="text-xl font-semibold text-earth-500">检测数据录入</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-text">pH值 (0-14)</label>
              <input type="number" name="ph" min={0} max={14} step={0.1}
                value={form.ph} onChange={handleChange} className="input-field" />
            </div>

            <div>
              <label className="label-text">有机质 (g/kg)</label>
              <input type="number" name="organicMatter" min={0} step={0.1}
                value={form.organicMatter} onChange={handleChange} className="input-field" />
            </div>

            <div>
              <label className="label-text">全氮 (g/kg)</label>
              <input type="number" name="totalNitrogen" min={0} step={0.01}
                value={form.totalNitrogen} onChange={handleChange} className="input-field" />
            </div>

            <div>
              <label className="label-text">有效磷 (mg/kg)</label>
              <input type="number" name="availablePhosphorus" min={0} step={0.1}
                value={form.availablePhosphorus} onChange={handleChange} className="input-field" />
            </div>

            <div>
              <label className="label-text">速效钾 (mg/kg)</label>
              <input type="number" name="availablePotassium" min={0} step={0.1}
                value={form.availablePotassium} onChange={handleChange} className="input-field" />
            </div>

            <div>
              <label className="label-text">检测日期</label>
              <input type="date" name="testDate"
                value={form.testDate} onChange={handleChange} className="input-field" />
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full mt-4 disabled:opacity-50">
              {loading ? '计算中...' : '计算健康指数'}
            </button>
          </form>
        </div>
      </div>

      <div className="w-1/2 space-y-6">
        {!shiResult ? (
          <div className="card flex flex-col items-center justify-center h-80 text-earth-300">
            <Info className="w-12 h-12 mb-3" />
            <p className="text-lg">请输入检测数据并点击计算</p>
          </div>
        ) : (
          <>
            <div className="card flex flex-col items-center">
              <div className={`w-40 h-40 rounded-full flex flex-col items-center justify-center border-4 ${config?.bg ?? ''}`}
                style={{ borderColor: grade === '优' ? '#4C7844' : grade === '良' ? '#3B82F6' : grade === '中' ? '#D97706' : '#DC2626' }}>
                <span className={`text-4xl font-bold ${config?.color ?? ''}`}>{shiResult.shi}</span>
                <span className={`text-lg font-semibold mt-1 px-3 py-0.5 rounded-full ${config?.css ?? ''}`}>{grade}</span>
              </div>
              <p className="mt-3 text-earth-500 font-medium">土壤健康指数</p>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-earth-500 mb-4">指标雷达图</h3>
              {chartData && <Radar data={chartData} options={chartOptions} />}
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                {shiResult.degradationTypes.length > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-soil-yellow" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-soil-green" />
                )}
                <h3 className="text-lg font-semibold text-earth-500">诊断解读</h3>
              </div>

              {shiResult.degradationTypes.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-earth-300 text-sm">退化类型：</p>
                  <div className="flex flex-wrap gap-2">
                    {shiResult.degradationTypes.map((dt) => (
                      <span key={dt} className="px-3 py-1 rounded-full text-sm bg-soil-yellow/20 text-amber-800">
                        {dt}
                      </span>
                    ))}
                  </div>
                  <p className="text-earth-300 text-sm mt-3">主要限制因子：</p>
                  <ul className="list-disc list-inside text-earth-500 text-sm space-y-1">
                    {Object.entries(shiResult.scores)
                      .filter(([, v]) => v < 60)
                      .map(([k]) => (
                        <li key={k}>
                          {k === 'ph' ? 'pH' : k === 'organicMatter' ? '有机质' : k === 'nitrogen' ? '全氮' : k === 'phosphorus' ? '有效磷' : '速效钾'}
                        </li>
                      ))}
                  </ul>
                </div>
              ) : (
                <p className="text-soil-green-dark flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  土壤各项指标均处于健康范围
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
