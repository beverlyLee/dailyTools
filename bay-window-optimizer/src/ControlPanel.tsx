import { useState } from 'react'
import type {
  BayWindowConfig,
  ComfortAnalysis,
  StorageConfig,
  StorageAnalysis,
  LightingConfig,
  LightingAnalysis,
  DecorConfig
} from './types'
import { DEFAULT_MATERIALS, DEFAULT_BAY_WINDOW } from './types'
import { COMFORT_COLORS, ILLUMINATION_COLORS } from './utils/calculations'

type TabType = 'structure' | 'comfort' | 'storage' | 'lighting' | 'decor'

interface ControlPanelProps {
  bayConfig: BayWindowConfig
  setBayConfig: React.Dispatch<React.SetStateAction<BayWindowConfig>>
  comfortAnalysis: ComfortAnalysis
  storageConfig: StorageConfig
  setStorageConfig: React.Dispatch<React.SetStateAction<StorageConfig>>
  storageAnalysis: StorageAnalysis
  lightingConfig: LightingConfig
  setLightingConfig: React.Dispatch<React.SetStateAction<LightingConfig>>
  lightingAnalysis: LightingAnalysis
  decorConfig: DecorConfig
  setDecorConfig: React.Dispatch<React.SetStateAction<DecorConfig>>
  showPerson: boolean
  setShowPerson: React.Dispatch<React.SetStateAction<boolean>>
  animateDrawers: boolean
  setAnimateDrawers: React.Dispatch<React.SetStateAction<boolean>>
  showLightRays: boolean
  setShowLightRays: React.Dispatch<React.SetStateAction<boolean>>
  showCoverageMap: boolean
  setShowCoverageMap: React.Dispatch<React.SetStateAction<boolean>>
  drawerMaterialColor: string
  setDrawerMaterialColor: React.Dispatch<React.SetStateAction<string>>
}

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'structure', label: '结构生成', icon: '🏗️' },
  { key: 'comfort', label: '舒适分析', icon: '🛋️' },
  { key: 'storage', label: '储物箱体', icon: '📦' },
  { key: 'lighting', label: '采光检测', icon: '☀️' },
  { key: 'decor', label: '软装搭配', icon: '🎨' }
]

export function ControlPanel(props: ControlPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('structure')

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-max px-3 py-3 text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {activeTab === 'structure' && <StructurePanel {...props} />}
        {activeTab === 'comfort' && <ComfortPanel {...props} />}
        {activeTab === 'storage' && <StoragePanel {...props} />}
        {activeTab === 'lighting' && <LightingPanel {...props} />}
        {activeTab === 'decor' && <DecorPanel {...props} />}
      </div>
    </div>
  )
}

function SectionCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-gray-50 rounded-xl p-4 space-y-3 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2">{title}</h3>
      {children}
    </div>
  )
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = 'cm'
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  unit?: string
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-gray-600">{label}</label>
        <span className="text-xs font-medium text-primary-600">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
      />
    </div>
  )
}

function ToggleInput({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-gray-700">{label}</label>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          value ? 'bg-primary-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            value ? 'translate-x-5.5 left-0.5' : 'left-0.5'
          }`}
          style={{ transform: value ? 'translateX(22px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}

function StructurePanel({ bayConfig, setBayConfig }: Pick<ControlPanelProps, 'bayConfig' | 'setBayConfig'>) {
  return (
    <>
      <SectionCard title="飘窗尺寸参数">
        <NumberInput label="窗户宽度" value={bayConfig.windowWidth} onChange={v => setBayConfig(p => ({ ...p, windowWidth: v }))} min={120} max={400} />
        <NumberInput label="窗户高度" value={bayConfig.windowHeight} onChange={v => setBayConfig(p => ({ ...p, windowHeight: v }))} min={100} max={250} />
        <NumberInput label="窗台高度" value={bayConfig.sillHeight} onChange={v => setBayConfig(p => ({ ...p, sillHeight: v }))} min={20} max={90} />
        <NumberInput label="窗台深度" value={bayConfig.sillDepth} onChange={v => setBayConfig(p => ({ ...p, sillDepth: v }))} min={40} max={100} />
      </SectionCard>

      <SectionCard title="窗户结构">
        <div>
          <label className="text-xs text-gray-600 block mb-1">窗户类型</label>
          <div className="grid grid-cols-3 gap-2">
            {(['flat', 'bay', 'corner'] as const).map(type => (
              <button
                key={type}
                onClick={() => setBayConfig(p => ({ ...p, windowType: type, paneCount: type === 'bay' ? 3 : type === 'corner' ? 2 : 1 }))}
                className={`px-2 py-2 text-xs rounded-lg border transition-all ${
                  bayConfig.windowType === type
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300'
                }`}
              >
                {type === 'flat' ? '平窗' : type === 'bay' ? '凸飘窗' : '角窗'}
              </button>
            ))}
          </div>
        </div>
        <NumberInput label="窗扇数量" value={bayConfig.paneCount} onChange={v => setBayConfig(p => ({ ...p, paneCount: v }))} min={1} max={5} step={1} unit="扇" />
        <NumberInput label="墙体厚度" value={bayConfig.wallThickness} onChange={v => setBayConfig(p => ({ ...p, wallThickness: v }))} min={15} max={40} />
      </SectionCard>

      <SectionCard title="周边设施">
        <ToggleInput
          label="包含窗帘盒"
          value={bayConfig.hasCurtainBox}
          onChange={v => setBayConfig(p => ({ ...p, hasCurtainBox: v }))}
        />
        {bayConfig.hasCurtainBox && (
          <>
            <NumberInput label="窗帘盒深度" value={bayConfig.curtainBoxDepth} onChange={v => setBayConfig(p => ({ ...p, curtainBoxDepth: v }))} min={8} max={30} />
            <NumberInput label="窗帘盒高度" value={bayConfig.curtainBoxHeight} onChange={v => setBayConfig(p => ({ ...p, curtainBoxHeight: v }))} min={10} max={35} />
          </>
        )}
        <ToggleInput
          label="包含暖气片"
          value={bayConfig.hasRadiator}
          onChange={v => setBayConfig(p => ({ ...p, hasRadiator: v }))}
        />
        {bayConfig.hasRadiator && (
          <>
            <NumberInput label="暖气片宽度" value={bayConfig.radiatorWidth} onChange={v => setBayConfig(p => ({ ...p, radiatorWidth: v }))} min={40} max={200} />
            <NumberInput label="暖气片高度" value={bayConfig.radiatorHeight} onChange={v => setBayConfig(p => ({ ...p, radiatorHeight: v }))} min={30} max={100} />
            <NumberInput label="暖气片深度" value={bayConfig.radiatorDepth} onChange={v => setBayConfig(p => ({ ...p, radiatorDepth: v }))} min={5} max={20} />
          </>
        )}
      </SectionCard>

      <div className="pt-2">
        <button
          onClick={() => setBayConfig(DEFAULT_BAY_WINDOW)}
          className="w-full py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          重置为默认参数
        </button>
      </div>
    </>
  )
}

function ComfortPanel({
  bayConfig,
  comfortAnalysis,
  showPerson,
  setShowPerson
}: Pick<ControlPanelProps, 'bayConfig' | 'comfortAnalysis' | 'showPerson' | 'setShowPerson'>) {
  void bayConfig
  const comfortLabels = {
    excellent: '优秀',
    good: '良好',
    fair: '一般',
    poor: '较差'
  }

  return (
    <>
      <SectionCard title="坐卧舒适度评估">
        <div className="text-center py-3">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full text-white text-2xl font-bold mb-2"
            style={{ backgroundColor: COMFORT_COLORS[comfortAnalysis.comfortLevel] }}
          >
            {comfortAnalysis.legBendAngle}°
          </div>
          <div className="text-lg font-semibold" style={{ color: COMFORT_COLORS[comfortAnalysis.comfortLevel] }}>
            {comfortLabels[comfortAnalysis.comfortLevel]}
          </div>
          <div className="text-xs text-gray-500 mt-1">腿部弯曲角度</div>
        </div>
      </SectionCard>

      <SectionCard title="人体工学数据">
        <div className="grid grid-cols-2 gap-3">
          <DataItem label="窗台高度" value={`${comfortAnalysis.sillHeight}cm`} />
          <DataItem label="坐垫高度" value={`${comfortAnalysis.seatHeight}cm`} />
          <DataItem label="大腿角度" value={`${comfortAnalysis.thighAngle}°`} />
          <DataItem label="小腿角度" value={`${comfortAnalysis.shinAngle}°`} />
          <DataItem label="理想高度" value={`${comfortAnalysis.idealSillHeight}cm`} highlight />
          <DataItem label="需脚踏板" value={comfortAnalysis.footSupportNeeded ? '是' : '否'} highlight={comfortAnalysis.footSupportNeeded} />
        </div>
      </SectionCard>

      <SectionCard title="坐姿模拟">
        <ToggleInput
          label="显示人体坐姿模型"
          value={showPerson}
          onChange={setShowPerson}
        />
      </SectionCard>

      {comfortAnalysis.warnings.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <h4 className="text-sm font-semibold text-red-700 flex items-center">
            <span className="mr-2">⚠️</span>问题提示
          </h4>
          {comfortAnalysis.warnings.map((w, i) => (
            <div key={i} className="text-sm text-red-600 bg-white bg-opacity-60 rounded-lg p-2">
              {w}
            </div>
          ))}
        </div>
      )}

      {comfortAnalysis.suggestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
          <h4 className="text-sm font-semibold text-blue-700 flex items-center">
            <span className="mr-2">💡</span>优化建议
          </h4>
          {comfortAnalysis.suggestions.map((s, i) => (
            <div key={i} className="text-sm text-blue-600 bg-white bg-opacity-60 rounded-lg p-2">
              {i + 1}. {s}
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-400 text-center pt-2">
        舒适窗台高度范围：38-43cm（优秀）/ 35-45cm（良好）
      </div>
    </>
  )
}

function DataItem({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-2 text-center ${highlight ? 'bg-primary-50' : 'bg-white'}`}>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className={`text-sm font-semibold ${highlight ? 'text-primary-600' : 'text-gray-800'}`}>{value}</div>
    </div>
  )
}

function StoragePanel({
  bayConfig,
  storageConfig,
  setStorageConfig,
  storageAnalysis,
  animateDrawers,
  setAnimateDrawers,
  drawerMaterialColor,
  setDrawerMaterialColor
}: ControlPanelProps) {
  const drawerMaterials = DEFAULT_MATERIALS.filter(m => m.type === 'drawer')

  return (
    <>
      <SectionCard title="储物功能开关">
        <ToggleInput
          label="启用窗台下方储物"
          value={storageConfig.enabled}
          onChange={v => setStorageConfig(p => ({ ...p, enabled: v }))}
        />
      </SectionCard>

      {storageConfig.enabled && (
        <>
          <SectionCard title="抽屉参数设置">
            <NumberInput label="抽屉数量" value={storageConfig.drawerCount} onChange={v => setStorageConfig(p => ({ ...p, drawerCount: v, drawers: generateTempDrawers(bayConfig, { ...p, drawerCount: v }) }))} min={1} max={5} step={1} unit="个" />
            <NumberInput label="抽屉高度" value={storageConfig.drawerHeight} onChange={v => setStorageConfig(p => ({ ...p, drawerHeight: v, drawers: generateTempDrawers(bayConfig, { ...p, drawerHeight: v }) }))} min={10} max={30} />
            <NumberInput label="抽屉深度" value={storageConfig.drawerDepth} onChange={v => setStorageConfig(p => ({ ...p, drawerDepth: v, drawers: generateTempDrawers(bayConfig, { ...p, drawerDepth: v }) }))} min={20} max={bayConfig.sillDepth - 3} />
          </SectionCard>

          <SectionCard title="材质选择">
            <div className="grid grid-cols-3 gap-2">
              {drawerMaterials.map(mat => (
                <button
                  key={mat.id}
                  onClick={() => setDrawerMaterialColor(mat.color)}
                  className={`p-2 rounded-lg border-2 transition-all ${
                    drawerMaterialColor.toLowerCase() === mat.color.toLowerCase()
                      ? 'border-primary-500 ring-2 ring-primary-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-full h-8 rounded-md mb-1" style={{ backgroundColor: mat.color }} />
                  <div className="text-xs text-gray-600">{mat.name}</div>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="交互动画">
            <ToggleInput
              label="演示抽屉开启"
              value={animateDrawers}
              onChange={setAnimateDrawers}
            />
          </SectionCard>

          <SectionCard title="储物容量">
            <div className="grid grid-cols-2 gap-3">
              <DataItem label="总容量" value={`${storageAnalysis.totalStorageVolume}L`} highlight />
              <DataItem label="可用容量" value={`${storageAnalysis.usableStorageVolume}L`} highlight={!storageAnalysis.hasConflicts} />
            </div>
            <div className="text-xs text-gray-500 mt-2">
              可用率：{storageAnalysis.totalStorageVolume > 0
                ? Math.round((storageAnalysis.usableStorageVolume / storageAnalysis.totalStorageVolume) * 100)
                : 0}%
            </div>
          </SectionCard>
        </>
      )}

      {storageAnalysis.conflicts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <h4 className="text-sm font-semibold text-red-700 flex items-center">
            <span className="mr-2">⛔</span>冲突检测报告
          </h4>
          {storageAnalysis.conflicts.map((c, i) => (
            <div key={i} className="text-sm text-red-600 bg-white bg-opacity-60 rounded-lg p-2 flex items-start">
              <span className="mr-2">•</span>
              <span>
                抽屉与<b>{c.conflictObject}</b>存在空间冲突
                {c.conflictType === 'curtain' && '，抽屉开启会被窗帘盒阻挡'}
                {c.conflictType === 'radiator' && '，抽屉开启会撞到暖气片'}
              </span>
            </div>
          ))}
        </div>
      )}

      {storageAnalysis.suggestions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <h4 className="text-sm font-semibold text-amber-700 flex items-center">
            <span className="mr-2">🔧</span>解决方案
          </h4>
          {storageAnalysis.suggestions.map((s, i) => (
            <div key={i} className="text-sm text-amber-700 bg-white bg-opacity-60 rounded-lg p-2">
              {i + 1}. {s}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function generateTempDrawers(bayConfig: BayWindowConfig, storageConfig: Partial<StorageConfig>) {
  const count = storageConfig.drawerCount ?? 1
  const height = storageConfig.drawerHeight ?? 20
  const depth = storageConfig.drawerDepth ?? 40
  const totalWidth = bayConfig.windowWidth - 10
  const drawerWidth = (totalWidth - (count - 1) * 2) / count
  const startX = -bayConfig.windowWidth / 2 + 5

  return Array.from({ length: count }).map((_, i) => ({
    id: `drawer-${i}`,
    width: drawerWidth,
    height: height,
    depth: Math.min(depth, bayConfig.sillDepth - 5),
    x: startX + i * (drawerWidth + 2) + drawerWidth / 2,
    y: height / 2,
    z: 0,
    openDirection: 'front' as const,
    isOpen: false,
    openProgress: 0
  }))
}

function LightingPanel({
  lightingConfig,
  setLightingConfig,
  lightingAnalysis,
  showLightRays,
  setShowLightRays,
  showCoverageMap,
  setShowCoverageMap
}: ControlPanelProps) {
  const illumLabels = {
    excellent: '优秀',
    good: '良好',
    fair: '一般',
    poor: '较差'
  }

  return (
    <>
      <SectionCard title="采光状况总览">
        <div className="text-center py-3">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full text-white text-2xl font-bold mb-2"
            style={{ backgroundColor: ILLUMINATION_COLORS[lightingAnalysis.illuminationLevel] }}
          >
            {100 - lightingAnalysis.lightBlockagePercentage}%
          </div>
          <div className="text-lg font-semibold" style={{ color: ILLUMINATION_COLORS[lightingAnalysis.illuminationLevel] }}>
            {illumLabels[lightingAnalysis.illuminationLevel]}
          </div>
          <div className="text-xs text-gray-500 mt-1">采光有效率</div>
        </div>
      </SectionCard>

      <SectionCard title="太阳位置参数">
        <NumberInput label="太阳方位角" value={lightingConfig.sunAngle} onChange={v => setLightingConfig(p => ({ ...p, sunAngle: v }))} min={-90} max={90} unit="°" />
        <NumberInput label="太阳高度角" value={lightingConfig.sunElevation} onChange={v => setLightingConfig(p => ({ ...p, sunElevation: v }))} min={10} max={85} unit="°" />
      </SectionCard>

      <SectionCard title="遮挡物高度">
        <NumberInput label="加高台面" value={lightingConfig.sillElevation} onChange={v => setLightingConfig(p => ({ ...p, sillElevation: v }))} min={0} max={30} />
        <NumberInput label="储物箱体" value={lightingConfig.storageElevation} onChange={v => setLightingConfig(p => ({ ...p, storageElevation: v }))} min={0} max={60} />
        <NumberInput label="软装物品" value={lightingConfig.decorElevation} onChange={v => setLightingConfig(p => ({ ...p, decorElevation: v }))} min={0} max={50} />
      </SectionCard>

      <SectionCard title="可视化选项">
        <ToggleInput label="显示光线追踪" value={showLightRays} onChange={setShowLightRays} />
        <ToggleInput label="显示采光热力图" value={showCoverageMap} onChange={setShowCoverageMap} />
      </SectionCard>

      <SectionCard title="详细数据">
        <div className="grid grid-cols-2 gap-3">
          <DataItem label="原始进光" value={`${lightingAnalysis.originalLightArea}dm²`} />
          <DataItem label="遮挡面积" value={`${lightingAnalysis.blockedLightArea}dm²`} highlight={lightingAnalysis.blockedLightArea > lightingAnalysis.originalLightArea * 0.3} />
          <DataItem label="遮挡率" value={`${lightingAnalysis.lightBlockagePercentage}%`} highlight={lightingAnalysis.lightBlockagePercentage > 30} />
          <DataItem label="窗台阴影" value={`${lightingAnalysis.sillShadowDepth}cm`} />
        </div>
      </SectionCard>

      {lightingAnalysis.recommendations.length > 0 && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-2">
          <h4 className="text-sm font-semibold text-sky-700 flex items-center">
            <span className="mr-2">☀️</span>采光建议
          </h4>
          {lightingAnalysis.recommendations.map((r, i) => (
            <div key={i} className="text-sm text-sky-700 bg-white bg-opacity-60 rounded-lg p-2">
              {i + 1}. {r}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function DecorPanel({
  decorConfig,
  setDecorConfig
}: ControlPanelProps) {
  const cushionMaterials = DEFAULT_MATERIALS.filter(m => m.type === 'cushion')
  const frameMaterials = DEFAULT_MATERIALS.filter(m => m.type === 'frame')

  const decorTypes = [
    { type: 'pillow', label: '抱枕', icon: '🛏️', defaultColor: '#f5f0e6' },
    { type: 'table', label: '小桌', icon: '🪑', defaultColor: '#c9a066' },
    { type: 'blanket', label: '毛毯', icon: '🧶', defaultColor: '#d4a574' },
    { type: 'plant', label: '绿植', icon: '🌿', defaultColor: '#16a34a' },
    { type: 'lamp', label: '台灯', icon: '💡', defaultColor: '#fef3c7' }
  ] as const

  const addDecorItem = (type: typeof decorTypes[number]['type'], color: string) => {
    const itemCount = decorConfig.items.filter(i => i.type === type).length
    const newItem = {
      id: `${type}-${Date.now()}`,
      type,
      position: {
        x: (Math.random() - 0.5) * 150,
        y: 0,
        z: 15 + Math.random() * 20
      },
      rotation: { x: 0, y: (Math.random() - 0.5) * 30, z: (Math.random() - 0.5) * 10 },
      scale: { x: 0.85 + Math.random() * 0.3, y: 0.85 + Math.random() * 0.3, z: 0.85 + Math.random() * 0.3 },
      color,
      material: (type === 'table' ? 'wood' : type === 'lamp' ? 'ceramic' : 'cotton') as DecorConfig['items'][number]['material']
    }
    setDecorConfig(p => ({ ...p, items: [...p.items, newItem] }))
    void itemCount
  }

  const removeItem = (id: string) => {
    setDecorConfig(p => ({ ...p, items: p.items.filter(i => i.id !== id) }))
  }

  const selectedItem = decorConfig.items[decorConfig.items.length - 1]

  return (
    <>
      <SectionCard title="坐垫材质">
        <div className="grid grid-cols-3 gap-2">
          {cushionMaterials.map(mat => (
            <button
              key={mat.id}
              onClick={() => setDecorConfig(p => ({ ...p, cushionColor: mat.color, cushionMaterial: (mat.id.includes('velvet') ? 'velvet' : mat.id.includes('linen') ? 'linen' : 'cotton') }))}
              className={`p-2 rounded-lg border-2 transition-all ${
                decorConfig.cushionColor.toLowerCase() === mat.color.toLowerCase()
                  ? 'border-primary-500 ring-2 ring-primary-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="w-full h-8 rounded-md mb-1" style={{ backgroundColor: mat.color }} />
              <div className="text-xs text-gray-600">{mat.name}</div>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="窗框材质">
        <div className="grid grid-cols-3 gap-2">
          {frameMaterials.map(mat => (
            <button
              key={mat.id}
              onClick={() => setDecorConfig(p => ({ ...p, frameColor: mat.color }))}
              className={`p-2 rounded-lg border-2 transition-all ${
                decorConfig.frameColor.toLowerCase() === mat.color.toLowerCase()
                  ? 'border-primary-500 ring-2 ring-primary-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="w-full h-8 rounded-md mb-1" style={{ backgroundColor: mat.color }} />
              <div className="text-xs text-gray-600">{mat.name}</div>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="添加软装">
        <div className="grid grid-cols-5 gap-1">
          {decorTypes.map(d => (
            <button
              key={d.type}
              onClick={() => addDecorItem(d.type, d.defaultColor)}
              className="flex flex-col items-center p-2 rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition-all"
            >
              <span className="text-xl">{d.icon}</span>
              <span className="text-xs text-gray-600 mt-1">{d.label}</span>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="已放置物品">
        {decorConfig.items.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-4">暂无软装物品</div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {decorConfig.items.map((item, idx) => {
              const typeInfo = decorTypes.find(t => t.type === item.type)
              return (
                <div key={item.id} className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <span>{typeInfo?.icon}</span>
                    <div>
                      <div className="text-xs font-medium text-gray-700">
                        {typeInfo?.label} #{idx + 1}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-gray-400">{item.material}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      {selectedItem && (
        <SectionCard title="调整选中物品">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">颜色</label>
              <input
                type="color"
                value={selectedItem.color}
                onChange={e => {
                  const newColor = e.target.value
                  setDecorConfig(p => ({
                    ...p,
                    items: p.items.map((it, i) =>
                      i === p.items.length - 1 ? { ...it, color: newColor } : it
                    )
                  }))
                }}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">缩放</label>
              <input
                type="range"
                min={50}
                max={150}
                value={Math.round(selectedItem.scale.x * 100)}
                onChange={e => {
                  const s = Number(e.target.value) / 100
                  setDecorConfig(p => ({
                    ...p,
                    items: p.items.map((it, i) =>
                      i === p.items.length - 1 ? { ...it, scale: { x: s, y: s, z: s } } : it
                    )
                  }))
                }}
                className="w-full accent-primary-500"
              />
            </div>
          </div>
          <button
            onClick={() => setDecorConfig(p => ({ ...p, items: [] }))}
            className="w-full mt-3 py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
          >
            清空所有软装
          </button>
        </SectionCard>
      )}
    </>
  )
}
