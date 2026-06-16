import { useState, useEffect } from 'react';
import {
  Clock,
  Droplets,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Plus,
  CloudRain,
} from 'lucide-react';
import type { PrescriptionResponse } from '../../shared/types';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';

interface PrescriptionCardProps {
  prescription: PrescriptionResponse | null;
  loading?: boolean;
  onAddToCalendar?: () => void;
}

export default function PrescriptionCard({ prescription, loading, onAddToCalendar }: PrescriptionCardProps) {
  const { createTask, cropParams, userConfig } = useAppStore();
  const [adjustedWater, setAdjustedWater] = useState<number>(0);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (prescription?.waterAmount) {
      setAdjustedWater(prescription.waterAmount);
    }
  }, [prescription?.waterAmount]);

  if (loading || !prescription) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-7 skeleton rounded-lg w-48" />
            <div className="h-5 skeleton rounded-lg w-28" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 skeleton rounded-2xl" />
            ))}
          </div>
          <div className="h-40 skeleton rounded-2xl" />
          <div className="h-11 skeleton rounded-xl w-40" />
        </div>
      </div>
    );
  }

  const adj = prescription.adjustments;
  const minWater = adj?.waterAmountMin || prescription.waterAmount * 0.8;
  const maxWater = adj?.waterAmountMax || prescription.waterAmount * 1.2;
  const waterRatio = adjustedWater / prescription.waterAmount;
  const adjustedDuration = Math.round(prescription.durationMinutes * waterRatio);
  const adjustedCost = Math.round(prescription.estimatedCost * waterRatio * 100) / 100;

  const handleAddToCalendar = async () => {
    const start = dayjs(`${prescription.recommendedDate} ${prescription.recommendedTime}`);
    const end = start.add(adjustedDuration, 'minute');

    const task = await createTask({
      title: `${cropParams.cropName}灌溉 - ${prescription.prescriptionId}`,
      start: start.toISOString(),
      end: end.toISOString(),
      status: 'pending',
      extendedProps: {
        prescriptionId: prescription.prescriptionId,
        waterAmount: adjustedWater,
        durationMinutes: adjustedDuration,
        estimatedCost: adjustedCost,
        cropType: cropParams.cropType,
        cropName: cropParams.cropName,
        area: cropParams.plantingArea || userConfig.plantingArea,
        notes: prescription.rainfallBackupPlan,
      },
    });

    if (task) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
      onAddToCalendar?.();
    }
  };

  return (
    <div className="glass-card p-6 space-y-6 overflow-hidden relative">
      {showSuccess && (
        <div className="absolute top-6 right-6 z-10 flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white shadow-lg animate-slide-up">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">已添加到日历</span>
        </div>
      )}

      {!prescription.isValid && prescription.delayReason && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-red-700 dark:text-red-400 mb-1">
              灌溉处方已调整
            </p>
            <p className="text-red-600 dark:text-red-300">{prescription.delayReason}</p>
            {prescription.suggestedAlternativeDate && (
              <p className="mt-1.5 text-red-600 dark:text-red-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                建议延后至 {dayjs(prescription.suggestedAlternativeDate).format('M月D日')} 进行灌溉
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-serif font-bold text-gray-800 dark:text-gray-100">
              灌溉处方
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-primary-green/10 text-primary-green-dark dark:text-primary-green-light">
              #{prescription.prescriptionId}
            </span>
            {prescription.isValid ? (
              <span className="badge badge-success">
                <CheckCircle2 className="w-3 h-3 mr-1" /> 有效
              </span>
            ) : (
              <span className="badge badge-warning">
                <CloudRain className="w-3 h-3 mr-1" /> 遇雨调整
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            建议时间：{dayjs(prescription.recommendedDate).format('M月D日')}{' '}
            {prescription.recommendedTime}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className={cn(
            'p-5 rounded-2xl border transition-all data-card',
            'bg-gradient-to-br from-sky-blue/10 to-sky-blue/5 border-sky-blue/20',
            'hover:border-sky-blue/40 hover:shadow-lg hover:shadow-sky-blue/10'
          )}
        >
          <div className="flex items-center gap-2 mb-3 text-sky-blue-dark dark:text-sky-blue-light">
            <div className="w-9 h-9 rounded-xl bg-sky-blue/20 flex items-center justify-center">
              <Droplets className="w-5 h-5 text-sky-blue" />
            </div>
            <span className="text-sm font-medium">灌水量</span>
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            {adjustedWater.toFixed(0)}
            <span className="text-base font-normal text-gray-500 ml-1">m³</span>
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            约 {prescription.waterDepth?.toFixed(1) || (adjustedWater / (cropParams.plantingArea || userConfig.plantingArea) * 666.67 / 1000).toFixed(1)} mm 水深
          </div>
        </div>

        <div
          className={cn(
            'p-5 rounded-2xl border transition-all data-card',
            'bg-gradient-to-br from-amber/10 to-amber/5 border-amber/20',
            'hover:border-amber/40 hover:shadow-lg hover:shadow-amber/10'
          )}
          style={{ animationDelay: '0.1s' }}
        >
          <div className="flex items-center gap-2 mb-3 text-amber-dark dark:text-amber-light">
            <div className="w-9 h-9 rounded-xl bg-amber/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber" />
            </div>
            <span className="text-sm font-medium">灌溉时长</span>
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            {Math.floor(adjustedDuration / 60) > 0 && (
              <>
                {Math.floor(adjustedDuration / 60)}
                <span className="text-base font-normal text-gray-500 mx-0.5">时</span>
              </>
            )}
            {adjustedDuration % 60}
            <span className="text-base font-normal text-gray-500 ml-1">分</span>
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            流量 {userConfig.pumpFlow} m³/h
          </div>
        </div>

        <div
          className={cn(
            'p-5 rounded-2xl border transition-all data-card',
            'bg-gradient-to-br from-primary-green/10 to-primary-green/5 border-primary-green/20',
            'hover:border-primary-green/40 hover:shadow-lg hover:shadow-primary-green/10'
          )}
          style={{ animationDelay: '0.2s' }}
        >
          <div className="flex items-center gap-2 mb-3 text-primary-green-dark dark:text-primary-green-light">
            <div className="w-9 h-9 rounded-xl bg-primary-green/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary-green" />
            </div>
            <span className="text-sm font-medium">预计成本</span>
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            ¥{adjustedCost.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            约 ¥{(adjustedCost / (cropParams.plantingArea || userConfig.plantingArea)).toFixed(2)}/亩
          </div>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-white/60 dark:bg-slate-700/40 border border-white/60 dark:border-slate-600/30">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            调整灌水量（±20%）
          </span>
          <span className="text-sm font-semibold text-primary-green">
            {((waterRatio - 1) * 100) > 0 ? '+' : ''}
            {((waterRatio - 1) * 100).toFixed(0)}%
          </span>
        </div>
        <div className="space-y-3">
          <input
            type="range"
            min={minWater}
            max={maxWater}
            step={Math.max((maxWater - minWater) / 100, 0.5)}
            value={adjustedWater}
            onChange={(e) => setAdjustedWater(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-200 dark:bg-slate-600 accent-primary-green"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{minWater.toFixed(0)} m³（-20%）</span>
            <span className="font-medium text-gray-600 dark:text-gray-300">
              推荐：{prescription.waterAmount.toFixed(0)} m³
            </span>
            <span>{maxWater.toFixed(0)} m³（+20%）</span>
          </div>
        </div>
      </div>

      {prescription.warnings?.length > 0 && (
        <div className="p-4 rounded-xl bg-amber/10 border border-amber/20">
          <p className="text-sm font-medium text-amber-dark dark:text-amber-light mb-2">
            ⚠️ 注意事项
          </p>
          <ul className="space-y-1 text-sm text-amber-dark/90 dark:text-amber-light/90">
            {prescription.warnings.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span>•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
        <div className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
          <p className="font-medium mb-0.5">☂️ 降雨应急预案：</p>
          <p>{prescription.rainfallBackupPlan}</p>
        </div>
        <button
          onClick={handleAddToCalendar}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          添加到日历
        </button>
      </div>
    </div>
  );
}
