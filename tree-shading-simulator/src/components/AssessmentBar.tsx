import { AlertTriangle, Sun, LayoutGrid } from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';

export function AssessmentBar() {
  const assessment = useSimulationStore((s) => s.assessment);
  const season = useSimulationStore((s) => s.season);
  const tree = useSimulationStore((s) => s.tree);
  const year = useSimulationStore((s) => s.year);

  const coveragePercent = Math.round(assessment.averageCoverage * 100);
  const coverageColor =
    coveragePercent > 70
      ? 'bg-red-500'
      : coveragePercent > 40
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  const coverageTextColor =
    coveragePercent > 70
      ? 'text-red-600'
      : coveragePercent > 40
      ? 'text-amber-600'
      : 'text-emerald-600';

  const hasWarning = assessment.warnings.length > 0;

  return (
    <div className="absolute bottom-4 left-4 right-4 z-10">
      <div className="bg-white/85 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
        <div className="flex items-stretch">
          <div className="flex-1 p-4 flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${coverageColor} flex items-center justify-center text-white`}>
                <Sun size={24} />
              </div>
              <div>
                <div className="text-xs text-stone-500 font-medium">窗户平均遮挡率</div>
                <div className={`text-2xl font-bold ${coverageTextColor}`}>
                  {coveragePercent}%
                </div>
              </div>
            </div>

            <div className="h-10 w-px bg-stone-200" />

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
                <LayoutGrid size={24} />
              </div>
              <div>
                <div className="text-xs text-stone-500 font-medium">受影响窗户</div>
                <div className="text-2xl font-bold text-stone-700">
                  {assessment.blockedWindows}
                  <span className="text-sm font-normal text-stone-400"> / {assessment.totalWindows}</span>
                </div>
              </div>
            </div>

            <div className="h-10 w-px bg-stone-200" />

            <div className="flex items-center gap-2 text-sm text-stone-600">
              <span className="px-2 py-1 rounded-lg bg-stone-100 font-medium">
                {season === 'summer' ? '☀️ 夏季' : '❄️ 冬季'}
              </span>
              <span className="px-2 py-1 rounded-lg bg-stone-100 font-medium">
                🌳 {year}年生
              </span>
              <span className="px-2 py-1 rounded-lg bg-stone-100 font-medium">
                {tree.species === 'deciduous' ? '🍃 落叶' : '🌲 常绿'}
              </span>
            </div>
          </div>
        </div>

        {hasWarning && (
          <div className="border-t border-stone-200 bg-gradient-to-r from-red-50 to-amber-50 p-3">
            <div className="flex flex-wrap gap-3">
              {assessment.warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-2 bg-white/80 rounded-lg border border-red-200"
                >
                  <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-700 font-medium">{warning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasWarning && coveragePercent < 20 && (
          <div className="border-t border-stone-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-3">
            <div className="flex items-center gap-2 px-1">
              <Sun size={18} className="text-emerald-500" />
              <span className="text-sm text-emerald-700 font-medium">
                采光良好，阳光可以充分射入室内 ✨
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
