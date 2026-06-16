import { CloudRain, Thermometer, Wind, Droplets } from 'lucide-react';
import type { WeatherResponse } from '../../shared/types';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';

interface WeatherCardProps {
  weather: WeatherResponse | null;
  loading?: boolean;
  compact?: boolean;
}

function getWeatherIcon(weather: string): string {
  const w = weather.toLowerCase();
  if (w.includes('雷') || w.includes('暴')) return '⛈️';
  if (w.includes('雪')) return '❄️';
  if (w.includes('雨') || w.includes('rain')) return '🌧️';
  if (w.includes('阴') || w.includes('overcast') || w.includes('cloud')) return '☁️';
  if (w.includes('多云') || w.includes('partly')) return '🌤️';
  return '☀️';
}

export default function WeatherCard({ weather, loading, compact }: WeatherCardProps) {
  if (loading || !weather) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 skeleton rounded-xl w-1/2" />
          <div className="flex items-center justify-between">
            <div className="h-20 skeleton rounded-2xl w-24" />
            <div className="space-y-2 flex-1 ml-6">
              <div className="h-5 skeleton rounded-lg w-3/4" />
              <div className="h-4 skeleton rounded-lg w-1/2" />
              <div className="h-4 skeleton rounded-lg w-2/3" />
            </div>
          </div>
          {!compact && <div className="grid grid-cols-3 gap-3 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 skeleton rounded-xl" />
            ))}
          </div>}
        </div>
      </div>
    );
  }

  const today = weather.daily[0];
  const icon = getWeatherIcon(weather.current.weather);
  const highRain = Math.max(...weather.hourly.slice(0, 24).map((h) => h.precipitationProb));

  return (
    <div className="glass-card p-6 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-sky-blue/10 to-primary-green/10 rounded-full -translate-y-1/3 translate-x-1/3 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-serif font-bold text-gray-800 dark:text-gray-100">
                {weather.city}
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {dayjs(weather.current.updateTime).format('HH:mm 更新')}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {weather.current.weather}
            </p>
          </div>

          {highRain > 60 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-blue/15 border border-sky-blue/30 text-sky-blue-dark dark:text-sky-blue-light text-xs font-medium">
              <CloudRain className="w-3.5 h-3.5" />
              <span>降水概率 {highRain}%</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-7xl leading-none select-none">{icon}</span>
            <div>
              <div className="text-5xl font-bold text-gray-800 dark:text-gray-100 font-serif">
                {weather.current.temperature}
                <span className="text-2xl ml-1">°C</span>
              </div>
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {today?.tempMin}° / {today?.tempMax}°
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl',
              'bg-blue-50/80 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30'
            )}>
              <Droplets className="w-5 h-5 text-sky-blue" />
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">湿度</div>
                <div className="font-semibold text-gray-800 dark:text-gray-100">
                  {weather.current.humidity}%
                </div>
              </div>
            </div>
            <div className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl',
              'bg-green-50/80 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30'
            )}>
              <Wind className="w-5 h-5 text-primary-green" />
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">风速</div>
                <div className="font-semibold text-gray-800 dark:text-gray-100">
                  {weather.current.windSpeed} m/s
                </div>
              </div>
            </div>
          </div>
        </div>

        {!compact && weather.daily.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
            {weather.daily.slice(0, 3).map((day, idx) => {
              const dayIcon = getWeatherIcon(day.dayWeather);
              const isRainy = day.precipitationProb > 60;
              return (
                <div
                  key={idx}
                  className={cn(
                    'p-4 rounded-xl text-center transition-all hover:scale-[1.02]',
                    'bg-white/50 dark:bg-slate-700/30 border border-white/60 dark:border-slate-600/30',
                    isRainy && 'ring-2 ring-sky-blue/30 bg-sky-blue/5'
                  )}
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {idx === 0
                      ? '今天'
                      : idx === 1
                      ? '明天'
                      : dayjs(day.date).format('M月D日')}
                  </div>
                  <span className="text-3xl select-none">{dayIcon}</span>
                  <div className="mt-2 font-medium text-gray-800 dark:text-gray-100">
                    {day.tempMin}° ~ {day.tempMax}°
                  </div>
                  {day.precipitationProb > 30 && (
                    <div
                      className={cn(
                        'mt-1 text-xs flex items-center justify-center gap-1',
                        isRainy ? 'text-sky-blue font-medium' : 'text-gray-500'
                      )}
                    >
                      <CloudRain className="w-3 h-3" />
                      {day.precipitationProb}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
