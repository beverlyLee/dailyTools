import { useState, useMemo } from 'react'
import type {
  BayWindowConfig,
  ComfortAnalysis,
  StorageConfig,
  LightingConfig,
  LightingAnalysis,
  DecorConfig
} from './types'
import { DEFAULT_BAY_WINDOW, DEFAULT_MATERIALS } from './types'
import {
  calculateComfortAnalysis,
  generateDrawers,
  calculateStorageAnalysis,
  calculateLightingAnalysis
} from './utils/calculations'
import { getDefaultDecorItems } from './components/decor/DecorVisualization'
import { Scene3D } from './Scene3D'
import { ControlPanel } from './ControlPanel'

function App() {
  const [bayConfig, setBayConfig] = useState<BayWindowConfig>(DEFAULT_BAY_WINDOW)

  const [storageConfig, setStorageConfig] = useState<StorageConfig>({
    enabled: true,
    drawerCount: 2,
    drawerHeight: 20,
    drawerDepth: 45,
    material: 'drawer-oak',
    drawers: []
  })

  const [lightingConfig, setLightingConfig] = useState<LightingConfig>({
    sunAngle: 0,
    sunElevation: 45,
    windowTransmittance: 0.85,
    sillElevation: 0,
    storageElevation: 40,
    decorElevation: 20
  })

  const [decorConfig, setDecorConfig] = useState<DecorConfig>({
    cushionColor: DEFAULT_MATERIALS.find(m => m.id === 'cushion-cotton-white')?.color || '#f5f0e6',
    cushionMaterial: 'cotton',
    items: getDefaultDecorItems(DEFAULT_BAY_WINDOW.windowWidth),
    frameColor: DEFAULT_MATERIALS.find(m => m.id === 'frame-aluminum')?.color || '#8b9094'
  })

  const [showPerson, setShowPerson] = useState(true)
  const [animateDrawers, setAnimateDrawers] = useState(false)
  const [showLightRays, setShowLightRays] = useState(false)
  const [showCoverageMap, setShowCoverageMap] = useState(false)
  const [drawerMaterialColor, setDrawerMaterialColor] = useState(
    DEFAULT_MATERIALS.find(m => m.id === 'drawer-oak')?.color || '#c9a066'
  )

  const currentStorageConfig = useMemo(() => {
    const drawers = generateDrawers(bayConfig, storageConfig)
    return { ...storageConfig, drawers }
  }, [bayConfig, storageConfig])

  const comfortAnalysis: ComfortAnalysis = useMemo(
    () => calculateComfortAnalysis(bayConfig),
    [bayConfig]
  )

  const storageAnalysis = useMemo(
    () => calculateStorageAnalysis(bayConfig, currentStorageConfig),
    [bayConfig, currentStorageConfig]
  )

  const lightingAnalysis: LightingAnalysis = useMemo(
    () => calculateLightingAnalysis(bayConfig, lightingConfig),
    [bayConfig, lightingConfig]
  )

  const totalWarnings = [
    ...comfortAnalysis.warnings,
    ...(storageAnalysis.conflicts.length > 0 ? ['存在储物空间冲突'] : []),
    ...(lightingAnalysis.lightBlockagePercentage > 30 ? ['采光遮挡率过高'] : [])
  ]

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden">
      <header className="flex-shrink-0 h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xl font-bold shadow-md">
            窗
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">飘窗优化系统</h1>
            <p className="text-xs text-gray-500">Bay Window Optimizer · 建筑结构与软装功能平衡设计</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {totalWarnings.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
              <span className="text-amber-600">⚠️</span>
              <span className="text-sm text-amber-700 font-medium">
                {totalWarnings.length} 项待优化
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            实时计算中
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <Scene3D
            bayConfig={bayConfig}
            comfortAnalysis={comfortAnalysis}
            storageConfig={currentStorageConfig}
            storageAnalysis={storageAnalysis}
            lightingAnalysis={lightingAnalysis}
            decorConfig={decorConfig}
            showPerson={showPerson}
            animateDrawers={animateDrawers}
            showLightRays={showLightRays}
            showCoverageMap={showCoverageMap}
            drawerMaterialColor={drawerMaterialColor}
          />

          <div className="absolute top-4 left-4 space-y-2 pointer-events-none">
            <StatusBadge
              label="舒适度"
              value={comfortAnalysis.comfortLevel === 'excellent' ? '优秀' : comfortAnalysis.comfortLevel === 'good' ? '良好' : comfortAnalysis.comfortLevel === 'fair' ? '一般' : '较差'}
              status={comfortAnalysis.comfortLevel}
            />
            <StatusBadge
              label="采光"
              value={lightingAnalysis.illuminationLevel === 'excellent' ? '优秀' : lightingAnalysis.illuminationLevel === 'good' ? '良好' : lightingAnalysis.illuminationLevel === 'fair' ? '一般' : '较差'}
              status={lightingAnalysis.illuminationLevel}
              icon="☀️"
            />
            {storageConfig.enabled && (
              <StatusBadge
                label="储物"
                value={storageAnalysis.hasConflicts ? '冲突' : `${storageAnalysis.usableStorageVolume}L`}
                status={storageAnalysis.hasConflicts ? 'poor' : 'good'}
                icon={storageAnalysis.hasConflicts ? '⚠️' : '📦'}
              />
            )}
          </div>

          <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 backdrop-blur rounded-xl px-4 py-3 shadow-lg text-xs text-gray-600 space-y-1 max-w-sm">
            <div className="font-medium text-gray-800 mb-1">操作说明</div>
            <div>🖱️ 左键拖动：旋转视角</div>
            <div>🖱️ 右键拖动：平移场景</div>
            <div>🖱️ 滚轮：缩放视图</div>
          </div>
        </div>

        <div className="w-96 flex-shrink-0">
          <ControlPanel
            bayConfig={bayConfig}
            setBayConfig={setBayConfig}
            comfortAnalysis={comfortAnalysis}
            storageConfig={currentStorageConfig}
            setStorageConfig={setStorageConfig}
            storageAnalysis={storageAnalysis}
            lightingConfig={lightingConfig}
            setLightingConfig={setLightingConfig}
            lightingAnalysis={lightingAnalysis}
            decorConfig={decorConfig}
            setDecorConfig={setDecorConfig}
            showPerson={showPerson}
            setShowPerson={setShowPerson}
            animateDrawers={animateDrawers}
            setAnimateDrawers={setAnimateDrawers}
            showLightRays={showLightRays}
            setShowLightRays={setShowLightRays}
            showCoverageMap={showCoverageMap}
            setShowCoverageMap={setShowCoverageMap}
            drawerMaterialColor={drawerMaterialColor}
            setDrawerMaterialColor={setDrawerMaterialColor}
          />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({
  label,
  value,
  status,
  icon
}: {
  label: string
  value: string
  status: 'excellent' | 'good' | 'fair' | 'poor'
  icon?: string
}) {
  const colors = {
    excellent: 'bg-green-50 text-green-700 border-green-200',
    good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    fair: 'bg-amber-50 text-amber-700 border-amber-200',
    poor: 'bg-red-50 text-red-700 border-red-200'
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm bg-white bg-opacity-95 ${colors[status]}`}>
      {icon && <span>{icon}</span>}
      <span className="font-medium">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  )
}

export default App
