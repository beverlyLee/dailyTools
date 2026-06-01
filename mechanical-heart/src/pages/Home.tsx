import { useState, useEffect } from 'react';
import MechanicalHeart from '@/components/MechanicalHeart';
import { hydraulicSystem, type HydraulicState } from '@/systems/Hydraulics';
import { Play, Pause, Heart, Activity, Gauge, Settings } from 'lucide-react';

export default function Home() {
  const [isBeating, setIsBeating] = useState(false);
  const [heartRate, setHeartRate] = useState(75);
  const [hydraulicState, setHydraulicState] = useState<HydraulicState>(
    hydraulicSystem.getState()
  );

  useEffect(() => {
    const unsubscribe = hydraulicSystem.subscribe(setHydraulicState);
    return () => {
      unsubscribe();
    };
  }, []);

  const toggleBeat = () => {
    setIsBeating(!isBeating);
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'filling':
        return 'text-blue-400';
      case 'contracting':
        return 'text-yellow-400';
      case 'ejecting':
        return 'text-red-400';
      case 'resting':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'filling':
        return '充盈期';
      case 'contracting':
        return '收缩期';
      case 'ejecting':
        return '射血期';
      case 'resting':
        return '舒张期';
      default:
        return '未知';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900">
      <header className="p-6 border-b border-gray-200/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/30">
              <Heart className="w-6 h-6 text-white fill-current" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
                Mechanical Heart
              </h1>
              <p className="text-sm text-gray-400">液压机械心脏模拟系统</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className={`w-5 h-5 ${isBeating ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
            <span className="text-sm text-gray-500">
              {isBeating ? '运行中' : '已停止'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white backdrop-blur-sm rounded-2xl border border-gray-200 overflow-hidden shadow-xl">
              <div className="h-[500px] relative">
                <MechanicalHeart isBeating={isBeating} heartRate={heartRate} />
                
                {isBeating && (
                  <div className="absolute top-4 left-4 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-full text-red-400 text-sm font-medium animate-pulse">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2" />
                    正在跳动
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white backdrop-blur-sm rounded-2xl border border-gray-200 p-5 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
                <Settings className="w-5 h-5 text-gray-500" />
                控制面板
              </h3>
              
              <div className="space-y-4">
                <button
                  onClick={toggleBeat}
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-3 ${
                    isBeating
                      ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white'
                      : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50'
                  }`}
                >
                  {isBeating ? (
                    <>
                      <Pause className="w-5 h-5" />
                      停止跳动
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      开始跳动
                    </>
                  )}
                </button>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">心率调节</span>
                    <span className="text-xl font-bold text-red-500">{heartRate} <span className="text-sm text-gray-400">BPM</span></span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="180"
                    value={heartRate}
                    onChange={(e) => setHeartRate(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${((heartRate - 40) / 140) * 100}%, #e5e7eb ${((heartRate - 40) / 140) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>40</span>
                    <span>180</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white backdrop-blur-sm rounded-2xl border border-gray-200 p-5 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
                <Gauge className="w-5 h-5 text-gray-500" />
                实时状态
              </h3>
              
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-red-50 to-transparent rounded-xl p-4 border border-red-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-red-600">左心室</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-100 ${getPhaseColor(hydraulicState.leftVentricle.phase)}`}>
                      {getPhaseLabel(hydraulicState.leftVentricle.phase)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">压力</div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-pink-500 transition-all duration-100"
                          style={{ width: `${(hydraulicState.leftVentricle.pressure / 120) * 100}%` }}
                        />
                      </div>
                      <div className="text-right text-sm text-gray-600 mt-1">
                        {hydraulicState.leftVentricle.pressure} mmHg
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-gray-500">阀门</span>
                    <span className={hydraulicState.leftVentricle.valveOpen ? 'text-green-600' : 'text-red-600'}>
                      {hydraulicState.leftVentricle.valveOpen ? '开启' : '关闭'}
                    </span>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-transparent rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-600">右心室</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-100 ${getPhaseColor(hydraulicState.rightVentricle.phase)}`}>
                      {getPhaseLabel(hydraulicState.rightVentricle.phase)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">压力</div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-100"
                          style={{ width: `${(hydraulicState.rightVentricle.pressure / 35) * 100}%` }}
                        />
                      </div>
                      <div className="text-right text-sm text-gray-600 mt-1">
                        {hydraulicState.rightVentricle.pressure} mmHg
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-gray-500">阀门</span>
                    <span className={hydraulicState.rightVentricle.valveOpen ? 'text-green-600' : 'text-red-600'}>
                      {hydraulicState.rightVentricle.valveOpen ? '开启' : '关闭'}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">心房压力</div>
                      <div className="text-lg font-bold text-yellow-600">
                        {hydraulicState.atriumPressure} <span className="text-xs text-gray-400">mmHg</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">血液粒子</div>
                      <div className="text-lg font-bold text-pink-600">
                        {hydraulicState.bloodParticles.length} <span className="text-xs text-gray-400">个</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white backdrop-blur-sm rounded-2xl border border-gray-200 p-5 shadow-lg">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">工作原理</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                  <p><span className="text-blue-600 font-medium">充盈期</span>：心房压力升高，阀门打开，活塞下降</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5" />
                  <p><span className="text-yellow-600 font-medium">收缩期</span>：阀门关闭，气缸内压力急剧上升</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5" />
                  <p><span className="text-red-600 font-medium">射血期</span>：活塞向上推动，血液流入主动脉</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mt-1.5" />
                  <p><span className="text-gray-500 font-medium">舒张期</span>：弹簧复位，准备下一次循环</p>
                </div>
              </div>
            </div>

            <div className="bg-white backdrop-blur-sm rounded-2xl border border-gray-200 p-5 shadow-lg">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">组件说明</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">⚙</span>
                  </div>
                  <div>
                    <p className="font-medium text-blue-700">液压动力基座</p>
                    <p className="text-xs text-gray-500 mt-1">心脏底部的蓝色圆形装置，通过液压传动杆连接并推动两个心室的活塞，产生泵血动力。</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-cyan-50 rounded-lg border border-cyan-100">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">↕</span>
                  </div>
                  <div>
                    <p className="font-medium text-cyan-700">液压传动杆</p>
                    <p className="text-xs text-gray-500 mt-1">连接动力基座与心室活塞的蓝色连杆，活塞运动时杆长随之变化，通过液压油管同步传递动力。</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">→</span>
                  </div>
                  <div>
                    <p className="font-medium text-red-700">血液流动路径</p>
                    <p className="text-xs text-gray-500 mt-1">左心房 → 左心室 → 主动脉 → 体循环管道 → 右心房 → 右心室 → 肺动脉</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 py-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
          <p>Mechanical Heart Simulator · React + Three.js + GSAP</p>
        </div>
      </footer>
    </div>
  );
}
