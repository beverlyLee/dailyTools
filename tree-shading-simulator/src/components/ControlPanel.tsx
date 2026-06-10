import { Sun, Snowflake, TreeDeciduous, TreePine, Calendar } from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { getSpeciesName, getSpeciesDescription } from '../utils/growth';
import { getSeasonName, getSeasonDescription } from '../utils/solar';
import type { Season, GrowthYear, TreeSpecies } from '../types';

export function ControlPanel() {
  const season = useSimulationStore((s) => s.season);
  const year = useSimulationStore((s) => s.year);
  const tree = useSimulationStore((s) => s.tree);
  const latitude = useSimulationStore((s) => s.latitude);
  const setSeason = useSimulationStore((s) => s.setSeason);
  const setYear = useSimulationStore((s) => s.setYear);
  const setTreeSpecies = useSimulationStore((s) => s.setTreeSpecies);

  const seasons: { value: Season; label: string; icon: typeof Sun; color: string }[] = [
    { value: 'summer', label: '夏季', icon: Sun, color: 'bg-amber-500' },
    { value: 'winter', label: '冬季', icon: Snowflake, color: 'bg-sky-500' },
  ];

  const years: { value: GrowthYear; label: string }[] = [
    { value: 5, label: '5年' },
    { value: 10, label: '10年' },
  ];

  const species: { value: TreeSpecies; label: string; icon: typeof TreeDeciduous }[] = [
    { value: 'deciduous', label: '落叶乔木', icon: TreeDeciduous },
    { value: 'evergreen', label: '常绿乔木', icon: TreePine },
  ];

  return (
    <div className="absolute top-4 right-4 z-10 w-80 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-5 border border-white/50">
      <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
        <TreeDeciduous size={24} className="text-green-700" />
        庭院遮阴模拟器
      </h2>

      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-stone-600">
            <Sun size={16} />
            季节选择
          </div>
          <div className="grid grid-cols-2 gap-2">
            {seasons.map((s) => {
              const Icon = s.icon;
              const isActive = season === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setSeason(s.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-300 ${
                    isActive
                      ? `${s.color} text-white shadow-lg scale-105`
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-sm font-medium">{s.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {getSeasonDescription(season, latitude)}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-stone-600">
            <Calendar size={16} />
            树木生长年份
          </div>
          <div className="grid grid-cols-2 gap-2">
            {years.map((y) => {
              const isActive = year === y.value;
              return (
                <button
                  key={y.value}
                  onClick={() => setYear(y.value)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-all duration-300 font-medium ${
                    isActive
                      ? 'bg-green-600 text-white shadow-lg scale-105'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <span className="text-lg font-bold">{y.value}</span>
                  <span className="text-sm">年</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-stone-600">
            <TreeDeciduous size={16} />
            树种选择
          </div>
          <div className="space-y-2">
            {species.map((sp) => {
              const Icon = sp.icon;
              const isActive = tree.species === sp.value;
              return (
                <button
                  key={sp.value}
                  onClick={() => setTreeSpecies(sp.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 text-left ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-lg'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <Icon size={20} />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{getSpeciesName(sp.value)}</div>
                    <div className={`text-xs ${isActive ? 'text-emerald-100' : 'text-stone-400'}`}>
                      {getSpeciesDescription(sp.value)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2 border-t border-stone-200">
          <div className="text-xs text-stone-500 space-y-1">
            <p>📍 默认纬度：{latitude}°N（北京）</p>
            <p>🌳 树木位置：窗前约 5 米处</p>
          </div>
        </div>
      </div>
    </div>
  );
}
