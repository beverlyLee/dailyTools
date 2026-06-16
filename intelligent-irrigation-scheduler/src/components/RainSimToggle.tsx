import { CloudRain, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

export default function RainSimToggle({ className }: { className?: string }) {
  const { forceRainMode, setForceRainMode, fetchWeather, userConfig } = useAppStore();

  const handleToggle = async (enabled: boolean) => {
    setForceRainMode(enabled);
    try {
      await fetchWeather(userConfig.defaultCity, enabled);
    } catch (e) {
      console.error('切换降雨模拟失败:', e);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {forceRainMode && (
        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-sky-blue/20 to-sky-blue/5 border border-sky-blue/30 flex items-center gap-3">
          <CloudRain className="w-5 h-5 text-sky-blue flex-shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-sky-blue-dark">
              🌧️ 当前为降雨模拟场景
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              未来两天将有中雨，系统会自动取消原定灌溉任务
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-blue/10">
            <CloudRain className="w-4 h-4 text-sky-blue" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              模拟降雨场景
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              开启后强制生成"未来两天中雨"的气象数据，用于验证降雨延后逻辑
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleToggle(!forceRainMode)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300',
            forceRainMode
              ? 'bg-sky-blue text-white shadow-lg shadow-sky-blue/30'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
          )}
        >
          {forceRainMode ? (
            <>
              <ToggleRight className="w-5 h-5" />
              <span className="text-sm font-medium">已开启</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-5 h-5" />
              <span className="text-sm font-medium">已关闭</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
