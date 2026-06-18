import { useState, useEffect } from 'react'
import { FlaskConical, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'
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

interface FormErrors {
  ph?: string
  organicMatter?: string
  totalNitrogen?: string
  availablePhosphorus?: string
  availablePotassium?: string
  testDate?: string
}

function toNumberOrNaN(value: string): number {
  if (value === '' || value === null || value === undefined) return NaN
  const n = Number(value)
  return n
}

export default function Assessment() {
  const { currentData, shiResult, setCurrentData, setShiResult, setRecordId, reset } = useSoilStore()

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    ph: currentData?.ph != null ? String(currentData.ph) : '',
    organicMatter: currentData?.organicMatter != null ? String(currentData.organicMatter) : '',
    totalNitrogen: currentData?.totalNitrogen != null ? String(currentData.totalNitrogen) : '',
    availablePhosphorus: currentData?.availablePhosphorus != null ? String(currentData.availablePhosphorus) : '',
    availablePotassium: currentData?.availablePotassium != null ? String(currentData.availablePotassium) : '',
    testDate: currentData?.testDate ?? today,
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (currentData) {
      setForm({
        ph: String(currentData.ph),
        organicMatter: String(currentData.organicMatter),
        totalNitrogen: String(currentData.totalNitrogen),
        availablePhosphorus: String(currentData.availablePhosphorus),
        availablePotassium: String(currentData.availablePotassium),
        testDate: currentData.testDate,
      })
    }
  }, [currentData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
    setSubmitError(null)
  }

  const validate = (): { ok: boolean; numeric: Partial<Record<keyof FormErrors, number>> } => {
    const next: FormErrors = {}
    const numeric: Partial<Record<keyof FormErrors, number>> = {}

    const ph = toNumberOrNaN(form.ph)
    numeric.ph = ph
    if (form.ph === '' || Number.isNaN(ph)) {
      next.ph = '请输入有效的pH数值'
    } else if (ph < 0 || ph > 14) {
      next.ph = `pH值必须在 0-14 范围内（当前 ${ph}）`
    }

    const organicMatter = toNumberOrNaN(form.organicMatter)
    numeric.organicMatter = organicMatter
    if (form.organicMatter === '' || Number.isNaN(organicMatter)) {
      next.organicMatter = '请输入有效的有机质数值'
    } else if (organicMatter < 0) {
      next.organicMatter = `有机质不能为负数（当前 ${organicMatter}）`
    }

    const totalNitrogen = toNumberOrNaN(form.totalNitrogen)
    numeric.totalNitrogen = totalNitrogen
    if (form.totalNitrogen === '' || Number.isNaN(totalNitrogen)) {
      next.totalNitrogen = '请输入有效的全氮数值'
    } else if (totalNitrogen < 0) {
      next.totalNitrogen = `全氮不能为负数（当前 ${totalNitrogen}）`
    }

    const availablePhosphorus = toNumberOrNaN(form.availablePhosphorus)
    numeric.availablePhosphorus = availablePhosphorus
    if (form.availablePhosphorus === '' || Number.isNaN(availablePhosphorus)) {
      next.availablePhosphorus = '请输入有效的有效磷数值'
    } else if (availablePhosphorus < 0) {
      next.availablePhosphorus = `有效磷不能为负数（当前 ${availablePhosphorus}）`
    }

    const availablePotassium = toNumberOrNaN(form.availablePotassium)
    numeric.availablePotassium = availablePotassium
    if (form.availablePotassium === '' || Number.isNaN(availablePotassium)) {
      next.availablePotassium = '请输入有效的速效钾数值'
    } else if (availablePotassium < 0) {
      next.availablePotassium = `速效钾不能为负数（当前 ${availablePotassium}）`
    }

    if (!form.testDate) {
      next.testDate = '请选择检测日期'
    }

    setErrors(next)
    return { ok: Object.keys(next).length === 0, numeric }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    const { ok, numeric } = validate()
    if (!ok) return
    reset()
    setLoading(true)
    try {
      const soilData: SoilData = {
        ph: numeric.ph as number,
        organicMatter: numeric.organicMatter as number,
        totalNitrogen: numeric.totalNitrogen as number,
        availablePhosphorus: numeric.availablePhosphorus as number,
        availablePotassium: numeric.availablePotassium as number,
        testDate: form.testDate,
      }
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(soilData),
      })
      if (!res.ok) {
        throw new Error(`服务器错误：${res.status}`)
      }
      const json = await res.json()
      if (!json.success || !json.data) {
        throw new Error(json.error || '计算失败，请稍后重试')
      }
      const result = json.data as SHIResult
      setCurrentData(soilData)
      setShiResult(result)
      if (json.data.recordId) setRecordId(json.data.recordId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '网络异常，请检查连接后重试'
      setSubmitError(msg)
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

  const inputClass = (field: keyof FormErrors) =>
    `input-field ${errors[field] ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : ''}`

  return (
    <div className="flex gap-6 p-6 min-h-screen">
      <div className="w-1/2">
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <FlaskConical className="w-5 h-5 text-soil-green" />
            <h2 className="text-xl font-semibold text-earth-500">检测数据录入</h2>
          </div>

          {submitError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
              <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="label-text">pH值 (0-14)</label>
              <input
                type="number"
                name="ph"
                step="0.1"
                value={form.ph}
                onChange={handleChange}
                className={inputClass('ph')}
                placeholder="请输入pH值，如 5.0"
              />
              {errors.ph && (
                <div className="mt-1 flex items-center gap-1 text-xs text-red-500">
                  <XCircle className="w-3 h-3" />
                  {errors.ph}
                </div>
              )}
            </div>

            <div>
              <label className="label-text">有机质 (g/kg)</label>
              <input
                type="number"
                name="organicMatter"
                step="0.1"
                value={form.organicMatter}
                onChange={handleChange}
                className={inputClass('organicMatter')}
                placeholder="请输入有机质含量，如 12.0"
              />
              {errors.organicMatter && (
                <div className="mt-1 flex items-center gap-1 text-xs text-red-500">
                  <XCircle className="w-3 h-3" />
                  {errors.organicMatter}
                </div>
              )}
            </div>

            <div>
              <label className="label-text">全氮 (g/kg)</label>
              <input
                type="number"
                name="totalNitrogen"
                step="0.01"
                value={form.totalNitrogen}
                onChange={handleChange}
                className={inputClass('totalNitrogen')}
                placeholder="请输入全氮含量，如 0.80"
              />
              {errors.totalNitrogen && (
                <div className="mt-1 flex items-center gap-1 text-xs text-red-500">
                  <XCircle className="w-3 h-3" />
                  {errors.totalNitrogen}
                </div>
              )}
            </div>

            <div>
              <label className="label-text">有效磷 (mg/kg)</label>
              <input
                type="number"
                name="availablePhosphorus"
                step="0.1"
                value={form.availablePhosphorus}
                onChange={handleChange}
                className={inputClass('availablePhosphorus')}
                placeholder="请输入有效磷含量，如 8.0"
              />
              {errors.availablePhosphorus && (
                <div className="mt-1 flex items-center gap-1 text-xs text-red-500">
                  <XCircle className="w-3 h-3" />
                  {errors.availablePhosphorus}
                </div>
              )}
            </div>

            <div>
              <label className="label-text">速效钾 (mg/kg)</label>
              <input
                type="number"
                name="availablePotassium"
                step="0.1"
                value={form.availablePotassium}
                onChange={handleChange}
                className={inputClass('availablePotassium')}
                placeholder="请输入速效钾含量，如 60.0"
              />
              {errors.availablePotassium && (
                <div className="mt-1 flex items-center gap-1 text-xs text-red-500">
                  <XCircle className="w-3 h-3" />
                  {errors.availablePotassium}
                </div>
              )}
            </div>

            <div>
              <label className="label-text">检测日期</label>
              <input
                type="date"
                name="testDate"
                value={form.testDate}
                onChange={handleChange}
                className={inputClass('testDate')}
              />
              {errors.testDate && (
                <div className="mt-1 flex items-center gap-1 text-xs text-red-500">
                  <XCircle className="w-3 h-3" />
                  {errors.testDate}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-4 disabled:opacity-50"
            >
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
              <div
                className={`w-40 h-40 rounded-full flex flex-col items-center justify-center border-4 ${config?.bg ?? ''}`}
                style={{
                  borderColor:
                    grade === '优'
                      ? '#4C7844'
                      : grade === '良'
                        ? '#3B82F6'
                        : grade === '中'
                          ? '#D97706'
                          : '#DC2626',
                }}
              >
                <span className={`text-4xl font-bold ${config?.color ?? ''}`}>{shiResult.shi}</span>
                <span className={`text-lg font-semibold mt-1 px-3 py-0.5 rounded-full ${config?.css ?? ''}`}>
                  {grade}
                </span>
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
                      <span
                        key={dt}
                        className="px-3 py-1 rounded-full text-sm bg-soil-yellow/20 text-amber-800"
                      >
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
                          {k === 'ph'
                            ? 'pH'
                            : k === 'organicMatter'
                              ? '有机质'
                              : k === 'nitrogen'
                                ? '全氮'
                                : k === 'phosphorus'
                                  ? '有效磷'
                                  : '速效钾'}
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
