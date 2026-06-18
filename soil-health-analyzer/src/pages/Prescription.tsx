import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Droplets, Leaf, Wheat, Calendar, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'
import { useSoilStore } from '@/store/useSoilStore'

export default function Prescription() {
  const { currentData, shiResult, prescription, setPrescription, recordId } = useSoilStore()
  const [prescriptionData, setPrescriptionData] = useState(prescription)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const lastFetchedKey = useRef<string | null>(null)

  useEffect(() => {
    if (!shiResult || !currentData) return

    const cacheKey = `${recordId ?? ''}-${currentData.testDate}-${currentData.ph}-${currentData.organicMatter}`
    if (lastFetchedKey.current === cacheKey) {
      if (prescription) setPrescriptionData(prescription)
      return
    }

    if (prescription) {
      setPrescriptionData(prescription)
      lastFetchedKey.current = cacheKey
      return
    }

    lastFetchedKey.current = cacheKey
    setLoading(true)
    setFetchError(null)

    fetch('/api/prescription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...currentData, recordId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`请求失败：${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (json.success && json.data) {
          const rx = json.data
          setPrescription(rx)
          setPrescriptionData(rx)
        } else {
          throw new Error(json.error || '处方生成失败')
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : '网络异常，请稍后重试'
        setFetchError(msg)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [shiResult, currentData, prescription, recordId, setPrescription])

  if (!shiResult) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-16 h-16 text-soil-yellow mb-4" />
        <h2 className="text-xl font-semibold text-earth-500 mb-2">请先完成土壤健康评价</h2>
        <p className="text-earth-300 mb-6">需要评价结果才能生成改良处方</p>
        <Link to="/assessment" className="btn-primary flex items-center gap-2">
          前往评价 <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-soil-green border-t-transparent" />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="card max-w-md mx-auto mt-10 border-l-4 border-l-red-400">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <h3 className="text-lg font-semibold text-earth-500">处方生成失败</h3>
        </div>
        <p className="text-earth-500 mb-4">{fetchError}</p>
        <Link to="/assessment" className="btn-secondary inline-flex items-center gap-2">
          返回到评价页 <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  if (!prescriptionData) {
    return (
      <div className="flex items-center justify-center py-20 text-earth-300">
        暂无处方数据
      </div>
    )
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const calendarMap = new Map(prescriptionData.calendar.map((c) => [c.month, c.action]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-earth-500 flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-soil-green" />
          改良处方方案
        </h1>
        <p className="text-earth-300 mt-1">
          退化类型：{shiResult.degradationTypes.join('、') || '无'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card border-l-4 border-l-soil-yellow">
          <div className="flex items-center gap-2 mb-3">
            <Droplets className="w-5 h-5 text-soil-yellow" />
            <h3 className="font-semibold text-earth-500">酸化改良</h3>
          </div>
          {prescriptionData.details.acidification.needed ? (
            <div className="space-y-2">
              <div>
                <p className="text-sm text-earth-300">石灰用量</p>
                <p className="text-3xl font-bold text-soil-yellow">
                  {prescriptionData.details.acidification.limeKgPerMu}
                  <span className="text-sm font-normal ml-1">kg/亩</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-earth-300">施用方法</p>
                <p className="text-sm text-earth-500">{prescriptionData.details.acidification.method}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-earth-300">
              <CheckCircle className="w-4 h-4 text-soil-green" />
              <span className="text-sm">无需酸化改良</span>
            </div>
          )}
        </div>

        <div className="card border-l-4 border-l-soil-green">
          <div className="flex items-center gap-2 mb-3">
            <Wheat className="w-5 h-5 text-soil-green" />
            <h3 className="font-semibold text-earth-500">板结改良</h3>
          </div>
          {prescriptionData.details.compaction.needed ? (
            <div className="space-y-2">
              <div>
                <p className="text-sm text-earth-300">有机肥施用量</p>
                <p className="text-3xl font-bold text-soil-green">
                  {prescriptionData.details.compaction.organicFertilizerKgPerMu}
                  <span className="text-sm font-normal ml-1">kg/亩</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-earth-300">施用方法</p>
                <p className="text-sm text-earth-500">{prescriptionData.details.compaction.method}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-earth-300">
              <CheckCircle className="w-4 h-4 text-soil-green" />
              <span className="text-sm">无需板结改良</span>
            </div>
          )}
        </div>

        <div className="card border-l-4 border-l-[#1565C0]">
          <div className="flex items-center gap-2 mb-3">
            <Leaf className="w-5 h-5 text-[#1565C0]" />
            <h3 className="font-semibold text-earth-500">贫瘠改良</h3>
          </div>
          {prescriptionData.details.barrenness.needed ? (
            <div className="space-y-2">
              <div>
                <p className="text-sm text-earth-300">NPK补充</p>
                <p className="text-sm font-medium text-earth-500">{prescriptionData.details.barrenness.npkSupplement}</p>
              </div>
              <div>
                <p className="text-sm text-earth-300">有机肥施用量</p>
                <p className="text-3xl font-bold text-[#1565C0]">
                  {prescriptionData.details.barrenness.organicFertilizerKgPerMu}
                  <span className="text-sm font-normal ml-1">kg/亩</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-earth-300">
              <CheckCircle className="w-4 h-4 text-soil-green" />
              <span className="text-sm">无需贫瘠改良</span>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-earth-500 flex items-center gap-2 mb-2">
          <Leaf className="w-5 h-5 text-soil-green" />
          绿肥种植建议
        </h3>
        <p className="text-earth-500">{prescriptionData.greenManureSuggestion}</p>
      </div>

      <div className="card">
        <h3 className="font-semibold text-earth-500 flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-soil-green" />
          改良日历
        </h3>
        <div className="grid grid-cols-6 gap-2">
          {months.map((m) => {
            const action = calendarMap.get(m)
            return (
              <div
                key={m}
                className={`rounded-lg p-3 text-center ${
                  action
                    ? 'bg-soil-green/10 border border-soil-green/30'
                    : 'bg-earth-50 border border-earth-100'
                }`}
              >
                <p className={`text-sm font-medium ${action ? 'text-soil-green-dark' : 'text-earth-300'}`}>
                  {m}月
                </p>
                {action && (
                  <p className="text-xs text-soil-green-dark mt-1">{action}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
