import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CloudRain,
  Droplets,
  FileText,
  CircleDollarSign,
  Calendar,
  Play,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import WeatherCard from '@/components/WeatherCard';
import MoistureChart from '@/components/MoistureChart';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import type { MoistureStatus, TaskStatus } from '../../shared/types';

const STATUS_LABEL: Record<MoistureStatus, string> = {
  sufficient: '充足 (>70%)',
  moderate: '适中 (60-70%)',
  deficit: '亏缺 (40-60%)',
  severe: '严重 (<40%)',
};

const STATUS_CLASS: Record<MoistureStatus, string> = {
  sufficient: 'badge-success',
  moderate: 'badge-warning',
  deficit: 'badge-warning',
  severe: 'badge-danger',
};

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: '待执行',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

const TASK_STATUS_CLASS: Record<TaskStatus, string> = {
  pending: 'badge-info',
  in_progress: 'badge-warning',
  completed: 'badge-success',
  cancelled: 'badge-danger',
};

const quickActions = [
  {
    path: '/weather',
    label: '气象融合',
    desc: '72小时降水预报与蒸发分析',
    icon: CloudRain,
    gradient: 'from-sky-blue/20 to-sky-blue/5',
    iconBg: 'bg-sky-blue/20 text-sky-blue',
  },
  {
    path: '/soil',
    label: '墒情模拟',
    desc: '土壤含水量预测与亏缺预警',
    icon: Droplets,
    gradient: 'from-primary-green/20 to-primary-green/5',
    iconBg: 'bg-primary-green/20 text-primary-green',
  },
  {
    path: '/prescription',
    label: '灌溉处方',
    desc: '智能生成精准灌溉方案',
    icon: FileText,
    gradient: 'from-amber/20 to-amber/5',
    iconBg: 'bg-amber/20 text-amber-dark',
  },
  {
    path: '/cost',
    label: '成本分析',
    desc: '灌溉成本核算与节水对比',
    icon: CircleDollarSign,
    gradient: 'from-soil-brown/20 to-soil-brown/5',
    iconBg: 'bg-soil-brown/20 text-soil-brown',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    weather,
    weatherLoading,
    soilSim,
    soilSimLoading,
    tasks,
    updateTask,
    fetchWeather,
    fetchSoilSimulation,
    userConfig,
    cropParams,
  } = useAppStore();

  useEffect(() => {
    const init = async () => {
      if (!weather) await fetchWeather(userConfig.defaultCity);
      if (!soilSim) await fetchSoilSimulation();
    };
    init();
  }, []);

  const todayTasks = tasks
    .filter((t) => dayjs(t.start).isSame(dayjs(), 'day'))
    .sort((a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf());

  const currentMoisture = soilSim?.moistureCurve[0];
  const deficitDays = soilSim?.deficitDays?.length || 0;
  const hasDeficitWarning =
    currentMoisture &&
    (currentMoisture.moistureStatus === 'deficit' ||
      currentMoisture.moistureStatus === 'severe');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-800 dark:text-gray-100 mb-1">
          仪表盘
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {cropParams.cropName} · {userConfig.defaultCity} · {dayjs().format('YYYY年第W周')}
        </p>
      </div>

      <WeatherCard weather={weather} loading={weatherLoading} compact />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif font-bold text-gray-800 dark:text-gray-100">
                墒情趋势
              </h3>
              <button
                onClick={() => navigate('/soil')}
                className="text-sm text-primary-green hover:underline"
              >
                查看详情 →
              </button>
            </div>
            <MoistureChart data={soilSim} loading={soilSimLoading} compact height={220} />

            {soilSim && currentMoisture && (
              <div className="mt-5 p-4 rounded-xl bg-white/60 dark:bg-slate-700/40 border border-white/60 dark:border-slate-600/30">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      当前墒情状态：
                    </span>
                    <span className={cn('badge', STATUS_CLASS[currentMoisture.moistureStatus])}>
                      {STATUS_LABEL[currentMoisture.moistureStatus]}
                    </span>
                  </div>
                  {hasDeficitWarning && (
                    <div className="flex items-center gap-1.5 text-sm text-amber-dark dark:text-amber-light">
                      <AlertTriangle className="w-4 h-4" />
                      <span>需关注灌溉时机</span>
                    </div>
                  )}
                </div>

                <div className="h-3 rounded-full bg-gray-200 dark:bg-slate-600 overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(Math.min((currentMoisture.moisture / (soilSim.fieldCapacity || 40)) * 100, 100), 0)}%`,
                      background:
                        currentMoisture.moistureStatus === 'sufficient'
                          ? 'linear-gradient(90deg, #5A9E78, #2D5A3D)'
                          : currentMoisture.moistureStatus === 'moderate'
                          ? 'linear-gradient(90deg, #F0C36A, #E8A838)'
                          : currentMoisture.moistureStatus === 'deficit'
                          ? 'linear-gradient(90deg, #FB923C, #F97316)'
                          : 'linear-gradient(90deg, #F87171, #DC2626)',
                    }}
                  />
                  <div
                    className="absolute top-0 h-full w-0.5 bg-primary-green/60"
                    style={{ left: `${(soilSim.criticalMoisture / (soilSim.fieldCapacity || 40)) * 100}%` }}
                    title="临界线"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                  <span>含水量 {currentMoisture.moisture.toFixed(1)}%</span>
                  <span>
                    亏缺 {currentMoisture.deficitMm.toFixed(1)}mm · 未来{deficitDays}天风险
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="glass-card p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-green" />
                <h3 className="text-lg font-serif font-bold text-gray-800 dark:text-gray-100">
                  今日灌溉任务
                </h3>
              </div>
              <button
                onClick={() => navigate('/calendar')}
                className="text-sm text-primary-green hover:underline"
              >
                日历 →
              </button>
            </div>

            {todayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-700/50 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 dark:text-gray-300 font-medium">今日暂无任务</p>
                <p className="text-sm text-gray-400 mt-1">
                  灌溉处方生成后可添加到日历
                </p>
                <button
                  onClick={() => navigate('/prescription')}
                  className="btn-outline mt-5 text-sm"
                >
                  生成灌溉处方
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin pr-1">
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      'p-4 rounded-xl border transition-all hover:shadow-md',
                      'bg-white/70 dark:bg-slate-700/40',
                      task.status === 'completed'
                        ? 'border-green-200 dark:border-green-800/30'
                        : task.status === 'in_progress'
                        ? 'border-amber/30 bg-amber/5'
                        : task.status === 'cancelled'
                        ? 'border-gray-200 dark:border-slate-600 opacity-60'
                        : 'border-gray-100 dark:border-slate-600/50'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1 pr-2">
                        <h4 className="font-medium text-gray-800 dark:text-gray-100 truncate">
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          {dayjs(task.start).format('HH:mm')} -{' '}
                          {dayjs(task.end).format('HH:mm')}
                        </div>
                      </div>
                      <span className={cn('badge flex-shrink-0', TASK_STATUS_CLASS[task.status])}>
                        {TASK_STATUS_LABEL[task.status]}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                      <span className="flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-sky-blue" />
                        {task.extendedProps.waterAmount}m³
                      </span>
                      <span>{task.extendedProps.durationMinutes}分钟</span>
                      <span>¥{task.extendedProps.estimatedCost}</span>
                    </div>

                    {task.status === 'pending' && (
                      <button
                        onClick={() => updateTask(task.id, { status: 'in_progress' })}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary-green text-white text-sm font-medium hover:bg-primary-green-dark transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        开始执行
                      </button>
                    )}
                    {task.status === 'in_progress' && (
                      <button
                        onClick={() => updateTask(task.id, { status: 'completed' })}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        标记完成
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map(({ path, label, desc, icon: Icon, gradient, iconBg }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={cn(
              'glass-card p-5 text-left group transition-all hover:-translate-y-1',
              'bg-gradient-to-br',
              gradient
            )}
          >
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110',
                iconBg
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <h4 className="font-serif font-bold text-gray-800 dark:text-gray-100 mb-1">
              {label}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
