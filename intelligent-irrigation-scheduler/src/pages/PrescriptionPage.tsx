import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  CloudRain,
  AlertTriangle,
  RefreshCw,
  Sprout,
  Ruler,
  Sparkles,
  Calendar as CalendarIcon,
  ChevronRight,
} from 'lucide-react';
import { useAppStore, GROWTH_STAGES, CROP_NAME_MAP } from '@/store/appStore';
import WeatherCard from '@/components/WeatherCard';
import PrescriptionCard from '@/components/PrescriptionCard';
import RainSimToggle from '@/components/RainSimToggle';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import type { CropType } from '../../shared/types';

export default function PrescriptionPage() {
  const navigate = useNavigate();
  const {
    weather,
    weatherLoading,
    fetchWeather,
    soilSim,
    soilSimLoading,
    fetchSoilSimulation,
    prescription,
    prescriptionLoading,
    fetchPrescription,
    cropParams,
    soilParams,
    setCropParams,
    setSoilParams,
    userConfig,
  } = useAppStore();

  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  const steps = [
    { n: 1, title: '确认参数', desc: '作物与土壤配置' },
    { n: 2, title: '气象融合', desc: '天气与降雨分析' },
    { n: 3, title: '生成处方', desc: '精准灌溉方案' },
  ];

  useEffect(() => {
    if (!weather) fetchWeather();
    if (!soilSim) fetchSoilSimulation();
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await fetchPrescription();
      setStep(3);
    } finally {
      setIsGenerating(false);
    }
  };

  const canProceedToStep2 = true;
  const canProceedToStep3 = !soilSimLoading && !weatherLoading && soilSim && weather;

  const showDelayPanel = prescription && !prescription.isValid && prescription.delayReason;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <RainSimToggle />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-800 dark:text-gray-100 mb-1">
            灌溉处方生成
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            三步骤生成精准灌溉方案
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !canProceedToStep3}
          className="btn-primary flex items-center gap-2"
        >
          <Sparkles className={cn('w-4 h-4', isGenerating && 'animate-spin')} />
          {isGenerating ? '生成中...' : '重新生成处方'}
        </button>
      </div>

      <div className="glass-card p-6">
        <div className="grid grid-cols-3 gap-4">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gray-200 dark:bg-slate-600 -z-0" />
              )}
              <button
                onClick={() => canProceedToStep3 && setStep(s.n)}
                className="relative w-full flex flex-col items-center text-center group"
              >
                <div
                  className={cn(
                    'w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold transition-all z-10 mb-3',
                    step > s.n
                      ? 'bg-primary-green text-white shadow-lg shadow-primary-green/30'
                      : step === s.n
                      ? 'bg-gradient-to-br from-primary-green to-sky-blue text-white shadow-lg shadow-sky-blue/30 scale-105'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-400'
                  )}
                >
                  {step > s.n ? <CheckCircle2 className="w-7 h-7" /> : s.n}
                </div>
                <div
                  className={cn(
                    'font-medium transition-colors',
                    step >= s.n
                      ? 'text-gray-800 dark:text-gray-100'
                      : 'text-gray-400'
                  )}
                >
                  {s.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {s.desc}
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={cn('space-y-6 transition-all', step >= 1 ? 'animate-fade-in' : 'hidden')}>
        {step === 1 && (
          <>
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-9 h-9 rounded-xl bg-primary-green/20 flex items-center justify-center">
                  <Sprout className="w-5 h-5 text-primary-green" />
                </div>
                <h3 className="text-lg font-serif font-bold text-gray-800 dark:text-gray-100">
                  Step 1: 作物参数配置
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="label-text">作物类型</label>
                  <select
                    className="input-field"
                    value={cropParams.cropType}
                    onChange={(e) => setCropParams({ cropType: e.target.value as CropType })}
                  >
                    {Object.entries(CROP_NAME_MAP).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-text">生育期</label>
                  <select
                    className="input-field"
                    value={cropParams.growthStage}
                    onChange={(e) => setCropParams({ growthStage: e.target.value })}
                  >
                    {GROWTH_STAGES[cropParams.cropType].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-text">种植面积（亩）</label>
                  <input
                    type="number"
                    className="input-field"
                    value={cropParams.plantingArea || userConfig.plantingArea}
                    onChange={(e) =>
                      setCropParams({ plantingArea: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className="label-text">根系深度（m）</label>
                  <input
                    type="number"
                    className="input-field"
                    value={cropParams.rootDepth}
                    onChange={(e) =>
                      setCropParams({ rootDepth: parseFloat(e.target.value) || 0 })
                    }
                    step={0.1}
                  />
                </div>
                <div>
                  <label className="label-text">作物系数 Kc</label>
                  <input
                    type="number"
                    className="input-field"
                    value={cropParams.cropCoefficient}
                    onChange={(e) =>
                      setCropParams({ cropCoefficient: parseFloat(e.target.value) || 0 })
                    }
                    step={0.05}
                  />
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-9 h-9 rounded-xl bg-soil-brown/20 flex items-center justify-center">
                  <Ruler className="w-5 h-5 text-soil-brown" />
                </div>
                <h3 className="text-lg font-serif font-bold text-gray-800 dark:text-gray-100">
                  Step 1: 土壤参数配置
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <label className="label-text">田间持水量（%）</label>
                  <input
                    type="number"
                    className="input-field"
                    value={soilParams.fieldCapacity}
                    onChange={(e) =>
                      setSoilParams({ fieldCapacity: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className="label-text">凋萎系数（%）</label>
                  <input
                    type="number"
                    className="input-field"
                    value={soilParams.wiltingPoint}
                    onChange={(e) =>
                      setSoilParams({ wiltingPoint: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className="label-text">初始含水量（%）</label>
                  <input
                    type="number"
                    className="input-field"
                    value={soilParams.initialMoisture}
                    onChange={(e) =>
                      setSoilParams({ initialMoisture: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className="label-text">土壤容重（g/cm³）</label>
                  <input
                    type="number"
                    className="input-field"
                    value={soilParams.bulkDensity}
                    onChange={(e) =>
                      setSoilParams({ bulkDensity: parseFloat(e.target.value) || 0 })
                    }
                    step={0.1}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!canProceedToStep2}
                className="btn-primary flex items-center gap-2"
              >
                下一步：查看气象
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {step >= 2 && (
          <>
            <WeatherCard weather={weather} loading={weatherLoading} />

            {soilSim && !soilSim.needsIrrigation && (
              <div className="glass-card p-6 bg-gradient-to-br from-primary-green/10 to-primary-green/5 border-primary-green/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-green/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-primary-green" />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif font-bold text-primary-green-dark dark:text-primary-green-light mb-1">
                      当前墒情充足，暂无需灌溉
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                      土壤含水量已达到适宜水平，建议继续监测墒情变化。系统将持续跟踪降雨与蒸发数据，
                      在需要灌溉时自动提醒。当前预计可保持 {soilSim.deficitDays.length === 0 ? '7天以上' : `${soilSim.deficitDays.length}天`} 无需灌溉。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="btn-outline flex items-center gap-2"
                >
                  返回修改参数
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!canProceedToStep3 || isGenerating}
                  className="btn-primary flex items-center gap-2"
                >
                  <RefreshCw className={cn('w-4 h-4', isGenerating && 'animate-spin')} />
                  {isGenerating ? '正在生成...' : '生成灌溉处方'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            {showDelayPanel && (
              <div className="glass-card p-6 bg-gradient-to-br from-sky-blue/10 to-amber/10 border-sky-blue/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky-blue/20 flex items-center justify-center flex-shrink-0">
                    <CloudRain className="w-6 h-6 text-sky-blue animate-pulse-soft" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-serif font-bold text-sky-blue-dark dark:text-sky-blue-light mb-2">
                      降雨延后建议
                    </h3>
                    <p className="text-gray-700 dark:text-gray-200 text-sm mb-3">
                      {prescription!.delayReason}
                    </p>
                    {prescription!.suggestedAlternativeDate && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-white/70 dark:bg-slate-700/50">
                        <CalendarIcon className="w-5 h-5 text-amber" />
                        <div>
                          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                            建议灌溉日期：
                          </span>
                          <span className="font-semibold text-amber-dark dark:text-amber-light">
                            {dayjs(prescription!.suggestedAlternativeDate).format('YYYY年M月D日 dddd')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  {weather?.hasEffectiveRain && (
                    <div className="hidden sm:flex flex-col items-end text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">预计降雨</div>
                      <div className="text-2xl font-bold text-sky-blue-dark dark:text-sky-blue-light">
                        {weather.totalExpectedRain}mm
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <PrescriptionCard
              prescription={prescription}
              loading={prescriptionLoading || isGenerating}
              onAddToCalendar={() => navigate('/calendar')}
            />

            <div className="flex items-center justify-between flex-wrap gap-3">
              <button
                onClick={() => setStep(2)}
                className="btn-outline flex items-center gap-2"
              >
                返回查看气象
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="btn-secondary flex items-center gap-2"
                >
                  <RefreshCw className={cn('w-4 h-4', isGenerating && 'animate-spin')} />
                  重新生成
                </button>
                <button
                  onClick={() => navigate('/calendar')}
                  className="btn-primary flex items-center gap-2"
                >
                  <CalendarIcon className="w-4 h-4" />
                  查看日历
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
