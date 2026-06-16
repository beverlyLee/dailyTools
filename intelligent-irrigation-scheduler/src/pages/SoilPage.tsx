import { useState, useEffect } from 'react';
import {
  Sprout,
  Ruler,
  Droplets,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useAppStore, GROWTH_STAGES, CROP_NAME_MAP, SOIL_DEFAULTS } from '@/store/appStore';
import MoistureChart from '@/components/MoistureChart';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import type {
  CropType,
  SoilTexture,
  MoistureStatus,
} from '../../shared/types';

const CROP_OPTIONS: CropType[] = ['wheat', 'corn', 'cotton', 'soybean', 'rice', 'other'];
const SOIL_OPTIONS: SoilTexture[] = ['sand', 'loam', 'clay'];

const SOIL_TEXTURE_LABEL: Record<SoilTexture, string> = {
  sand: '砂质土',
  loam: '壤质土',
  clay: '黏质土',
};

const MOISTURE_STATUS_LABEL: Record<MoistureStatus, string> = {
  sufficient: '墒情充足',
  moderate: '墒情适中',
  deficit: '墒情亏缺',
  severe: '严重亏缺',
};

const MOISTURE_STATUS_CLASS: Record<MoistureStatus, string> = {
  sufficient: 'badge-success',
  moderate: 'badge-warning',
  deficit: 'badge-warning',
  severe: 'badge-danger',
};

const FORM_LABEL_CLS = 'label-text';
const INPUT_CLS = 'input-field';

export default function SoilPage() {
  const {
    cropParams,
    soilParams,
    setCropParams,
    setSoilParams,
    soilSim,
    soilSimLoading,
    fetchSoilSimulation,
    userConfig,
  } = useAppStore();

  const [localArea, setLocalArea] = useState(String(cropParams.plantingArea || userConfig.plantingArea));
  const [areaError, setAreaError] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (!soilSim) {
      handleSimulate();
    }
  }, []);

  const validateArea = (v: string) => {
    const num = parseFloat(v);
    if (isNaN(num) || num <= 0) return '请输入有效面积（亩）';
    if (num > 100000) return '面积过大';
    return '';
  };

  const handleAreaChange = (v: string) => {
    setLocalArea(v);
    setAreaError(validateArea(v));
  };

  const handleSimulate = async () => {
    const err = validateArea(localArea);
    if (err) {
      setAreaError(err);
      return;
    }
    setIsSimulating(true);
    try {
      setCropParams({ plantingArea: parseFloat(localArea) });
      await fetchSoilSimulation();
    } finally {
      setIsSimulating(false);
    }
  };

  const todayData = soilSim?.moistureCurve[0];
  const fc = soilSim?.fieldCapacity || soilParams.fieldCapacity;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-800 dark:text-gray-100 mb-1">
          墒情模拟
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          基于作物与土壤参数，结合气象数据预测未来墒情变化
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 rounded-xl bg-primary-green/20 flex items-center justify-center">
                <Sprout className="w-5 h-5 text-primary-green" />
              </div>
              <h3 className="text-lg font-serif font-bold text-gray-800 dark:text-gray-100">
                作物参数
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className={FORM_LABEL_CLS}>作物类型</label>
                <select
                  className={INPUT_CLS}
                  value={cropParams.cropType}
                  onChange={(e) => setCropParams({ cropType: e.target.value as CropType })}
                >
                  {CROP_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {CROP_NAME_MAP[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={FORM_LABEL_CLS}>生育期</label>
                <select
                  className={INPUT_CLS}
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
                <label className={FORM_LABEL_CLS}>种植面积（亩）</label>
                <input
                  type="number"
                  className={cn(INPUT_CLS, areaError && '!border-red-400 !ring-red-400/30')}
                  value={localArea}
                  onChange={(e) => handleAreaChange(e.target.value)}
                  min={0.1}
                  step={1}
                  placeholder="请输入种植面积"
                />
                {areaError && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {areaError}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={FORM_LABEL_CLS}>根系深度（m）</label>
                  <input
                    type="number"
                    className={INPUT_CLS}
                    value={cropParams.rootDepth}
                    onChange={(e) => setCropParams({ rootDepth: parseFloat(e.target.value) || 0 })}
                    min={0.1}
                    step={0.1}
                  />
                </div>
                <div>
                  <label className={FORM_LABEL_CLS}>作物系数 Kc</label>
                  <input
                    type="number"
                    className={INPUT_CLS}
                    value={cropParams.cropCoefficient}
                    onChange={(e) =>
                      setCropParams({ cropCoefficient: parseFloat(e.target.value) || 0 })
                    }
                    min={0.1}
                    max={1.5}
                    step={0.05}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 rounded-xl bg-soil-brown/20 flex items-center justify-center">
                <Ruler className="w-5 h-5 text-soil-brown" />
              </div>
              <h3 className="text-lg font-serif font-bold text-gray-800 dark:text-gray-100">
                土壤参数
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className={FORM_LABEL_CLS}>土壤质地</label>
                <select
                  className={INPUT_CLS}
                  value={soilParams.soilTexture}
                  onChange={(e) => setSoilParams({ soilTexture: e.target.value as SoilTexture })}
                >
                  {SOIL_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {SOIL_TEXTURE_LABEL[t]}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  选择质地将自动填充默认水力参数
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={FORM_LABEL_CLS}>田间持水量（%）</label>
                  <input
                    type="number"
                    className={INPUT_CLS}
                    value={soilParams.fieldCapacity}
                    onChange={(e) =>
                      setSoilParams({ fieldCapacity: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className={FORM_LABEL_CLS}>凋萎系数（%）</label>
                  <input
                    type="number"
                    className={INPUT_CLS}
                    value={soilParams.wiltingPoint}
                    onChange={(e) =>
                      setSoilParams({ wiltingPoint: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className={FORM_LABEL_CLS}>初始含水量（%）</label>
                  <input
                    type="number"
                    className={INPUT_CLS}
                    value={soilParams.initialMoisture}
                    onChange={(e) =>
                      setSoilParams({ initialMoisture: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className={FORM_LABEL_CLS}>容重（g/cm³）</label>
                  <input
                    type="number"
                    className={INPUT_CLS}
                    value={soilParams.bulkDensity}
                    onChange={(e) =>
                      setSoilParams({ bulkDensity: parseFloat(e.target.value) || 0 })
                    }
                    step={0.1}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSimulate}
            disabled={isSimulating || !!areaError}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', isSimulating && 'animate-spin')} />
            {isSimulating ? '模拟中...' : '开始墒情模拟'}
          </button>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <MoistureChart data={soilSim} loading={soilSimLoading || isSimulating} height={380} />

          {todayData && soilSim && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className={cn(
                  'glass-card p-5 data-card border',
                  todayData.moistureStatus === 'sufficient' &&
                    'border-primary-green/30 bg-primary-green/5',
                  todayData.moistureStatus === 'moderate' && 'border-amber/30 bg-amber/5',
                  (todayData.moistureStatus === 'deficit' ||
                    todayData.moistureStatus === 'severe') &&
                    'border-red-200 dark:border-red-800/30 bg-red-50 dark:bg-red-900/10'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">今日墒情</span>
                  <span
                    className={cn('badge', MOISTURE_STATUS_CLASS[todayData.moistureStatus])}
                  >
                    {MOISTURE_STATUS_LABEL[todayData.moistureStatus]}
                  </span>
                </div>
                <div className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                  {todayData.moisture.toFixed(1)}
                  <span className="text-lg font-normal text-gray-500 ml-1">%</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  占田间持水量的 {((todayData.moisture / fc) * 100).toFixed(0)}%
                </div>
              </div>

              <div className="glass-card p-5 data-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">水分亏缺</span>
                  {todayData.deficitMm > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-amber" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-primary-green" />
                  )}
                </div>
                <div className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                  {todayData.deficitMm.toFixed(1)}
                  <span className="text-lg font-normal text-gray-500 ml-1">mm</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  需补水量约 {(todayData.deficitMm * (cropParams.plantingArea || userConfig.plantingArea) * 666.67 / 1000).toFixed(0)} m³
                </div>
              </div>

              <div className="glass-card p-5 data-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">临界含水量</span>
                  <Droplets className="w-4 h-4 text-sky-blue" />
                </div>
                <div className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                  {soilSim.criticalMoisture.toFixed(1)}
                  <span className="text-lg font-normal text-gray-500 ml-1">%</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {soilSim.needsIrrigation ? (
                    <span className="text-amber-dark dark:text-amber-light font-medium">
                      建议尽快灌溉，未来 {soilSim.deficitDays.length} 天有亏缺风险
                    </span>
                  ) : (
                    <span className="text-primary-green font-medium">
                      当前墒情充足，暂无需灌溉
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="glass-card p-6 overflow-hidden">
            <h3 className="text-lg font-serif font-bold text-gray-800 dark:text-gray-100 mb-4">
              未来7天墒情预报
            </h3>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-600">
                    <th className="text-left py-3 px-3 font-medium text-gray-600 dark:text-gray-300">
                      日期
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600 dark:text-gray-300">
                      含水量
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600 dark:text-gray-300">
                      状态
                    </th>
                    <th className="text-right py-3 px-3 font-medium text-gray-600 dark:text-gray-300">
                      降雨量
                    </th>
                    <th className="text-right py-3 px-3 font-medium text-gray-600 dark:text-gray-300">
                      蒸发量
                    </th>
                    <th className="text-right py-3 px-3 font-medium text-gray-600 dark:text-gray-300">
                      亏缺量
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(soilSim?.moistureCurve || []).slice(0, 7).map((row, i) => (
                    <tr
                      key={i}
                      className={cn(
                        'border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors',
                        i === 0 && 'bg-primary-green/5 dark:bg-primary-green/10'
                      )}
                    >
                      <td className="py-3 px-3 text-gray-800 dark:text-gray-200 font-medium">
                        {dayjs(row.date).format('M月D日')}
                        {i === 0 && (
                          <span className="ml-2 text-xs text-primary-green font-normal">
                            今天
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-800 dark:text-gray-200 font-semibold">
                        {row.moisture.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3">
                        <span className={cn('badge', MOISTURE_STATUS_CLASS[row.moistureStatus])}>
                          {MOISTURE_STATUS_LABEL[row.moistureStatus]}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-sky-blue font-medium">
                        {row.rainfallMm > 0 ? `${row.rainfallMm.toFixed(1)} mm` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-dark dark:text-amber-light font-medium">
                        {row.evaporationMm.toFixed(1)} mm
                      </td>
                      <td
                        className={cn(
                          'py-3 px-3 text-right font-medium',
                          row.deficitMm > 5
                            ? 'text-red-500'
                            : row.deficitMm > 0
                            ? 'text-amber'
                            : 'text-primary-green'
                        )}
                      >
                        {row.deficitMm > 0 ? `-${row.deficitMm.toFixed(1)} mm` : '0 mm'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
