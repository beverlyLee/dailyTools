import { Play, Pause, RotateCcw, Info, CheckCircle2 } from 'lucide-react';

type VirusState = 'approaching' | 'attaching' | 'fusing' | 'absorbed';

interface UIPanelProps {
  isPaused: boolean;
  onTogglePause: () => void;
  onReset: () => void;
  activeViruses?: number;
  currentPhase?: VirusState;
}

const phaseLabels: Record<VirusState, { label: string; color: string; bgColor: string }> = {
  approaching: { label: '接近中', color: 'text-orange-400', bgColor: 'bg-orange-400/20' },
  attaching: { label: '附着中', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' },
  fusing: { label: '融合中', color: 'text-purple-400', bgColor: 'bg-purple-400/20' },
  absorbed: { label: '已吸收', color: 'text-cyan-400', bgColor: 'bg-cyan-400/20' },
};

const UIPanel = ({ isPaused, onTogglePause, onReset, activeViruses = 0 }: UIPanelProps) => {
  const phaseDescriptions = [
    { key: 'approaching' as VirusState, label: '接近', desc: '病毒从远处飞向细胞表面', icon: '🚀' },
    { key: 'attaching' as VirusState, label: '附着', desc: '病毒刺突与细胞膜结合', icon: '🔗' },
    { key: 'fusing' as VirusState, label: '融合', desc: '细胞膜凹陷包裹病毒', icon: '🧬' },
    { key: 'absorbed' as VirusState, label: '吸收', desc: '病毒进入细胞内部', icon: '✨' },
  ];

  return (
    <>
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-black/40 backdrop-blur-md rounded-2xl px-8 py-4 border border-purple-500/30 shadow-lg shadow-purple-500/20">
          <h1 className="text-2xl font-bold text-white text-center tracking-wide">
            <span className="text-purple-400">病毒</span>入侵细胞模拟
          </h1>
          <p className="text-gray-400 text-sm text-center mt-1">
            Viral Invasion 3D Simulation
          </p>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1.5 text-gray-300">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>运行中</span>
            </div>
            <div className="w-px h-3 bg-gray-600" />
            <div className="text-gray-300">
              活跃病毒: <span className="text-purple-400 font-medium">{activeViruses}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-black/40 backdrop-blur-md rounded-2xl px-6 py-4 border border-purple-500/30 flex items-center gap-4">
          <button
            onClick={onTogglePause}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 shadow-lg font-medium ${
              isPaused
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-green-500/30 hover:shadow-green-500/50'
                : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-orange-500/30 hover:shadow-orange-500/50'
            }`}
          >
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
            <span>{isPaused ? '开始模拟' : '暂停模拟'}</span>
          </button>
          
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-700/60 hover:bg-gray-600/60 text-white rounded-xl transition-all duration-300 border border-gray-500/30 font-medium hover:border-gray-400/50"
          >
            <RotateCcw size={18} />
            <span>重新开始</span>
          </button>
        </div>
      </div>

      <div className="fixed top-6 right-6 z-10 w-64">
        <div className="bg-black/40 backdrop-blur-md rounded-2xl p-5 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
          <div className="flex items-center gap-2 mb-4">
            <Info size={18} className="text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">入侵流程</h2>
          </div>
          <div className="space-y-3">
            {phaseDescriptions.map((phase, index) => (
              <div key={phase.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${phaseLabels[phase.key].bgColor} border ${phaseLabels[phase.key].color.replace('text-', 'border-')}/50`}>
                    <span className="text-base">{phase.icon}</span>
                  </div>
                  {index < phaseDescriptions.length - 1 && (
                    <div className="w-px h-6 bg-gray-600/50 mt-1" />
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <div className={`font-medium ${phaseLabels[phase.key].color}`}>
                    {index + 1}. {phase.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{phase.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 left-6 z-10">
        <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-purple-500/30 text-xs text-gray-400 space-y-1">
          <p className="flex items-center gap-2">
            <span className="text-purple-400">🖱️</span>
            鼠标拖拽 · 旋转视角
          </p>
          <p className="flex items-center gap-2">
            <span className="text-cyan-400">🔍</span>
            鼠标滚轮 · 缩放场景
          </p>
        </div>
      </div>

      <div className="fixed top-6 left-6 z-10">
        <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-green-500/30 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-green-400" />
          <div className="text-xs text-gray-300">
            <div className="text-green-400 font-medium">实时渲染</div>
            <div className="text-gray-500">WebGL + Three.js</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UIPanel;
