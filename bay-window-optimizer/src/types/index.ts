export interface BayWindowConfig {
  id: string
  windowWidth: number
  windowHeight: number
  windowDepth: number
  sillHeight: number
  sillDepth: number
  wallThickness: number
  windowType: 'flat' | 'bay' | 'corner'
  paneCount: number
  hasCurtainBox: boolean
  curtainBoxDepth: number
  curtainBoxHeight: number
  hasRadiator: boolean
  radiatorWidth: number
  radiatorHeight: number
  radiatorDepth: number
  radiatorOffsetX: number
}

export interface ComfortAnalysis {
  sillHeight: number
  seatHeight: number
  legBendAngle: number
  thighAngle: number
  shinAngle: number
  isComfortable: boolean
  comfortLevel: 'excellent' | 'good' | 'fair' | 'poor'
  warnings: string[]
  suggestions: string[]
  idealSillHeight: number
  footSupportNeeded: boolean
}

export interface StorageDrawer {
  id: string
  width: number
  height: number
  depth: number
  x: number
  y: number
  z: number
  openDirection: 'front' | 'side' | 'down'
  isOpen: boolean
  openProgress: number
}

export interface StorageConfig {
  enabled: boolean
  drawerCount: number
  drawerHeight: number
  drawerDepth: number
  material: string
  drawers: StorageDrawer[]
}

export interface StorageConflict {
  drawerId: string
  conflictType: 'curtain' | 'radiator' | 'wall' | 'other'
  conflictObject: string
  overlapAmount: number
  severity: 'warning' | 'critical'
}

export interface StorageAnalysis {
  totalStorageVolume: number
  usableStorageVolume: number
  conflicts: StorageConflict[]
  hasConflicts: boolean
  suggestions: string[]
}

export interface LightingConfig {
  sunAngle: number
  sunElevation: number
  windowTransmittance: number
  sillElevation: number
  storageElevation: number
  decorElevation: number
}

export interface LightingAnalysis {
  originalLightArea: number
  blockedLightArea: number
  lightBlockagePercentage: number
  illuminationLevel: 'excellent' | 'good' | 'fair' | 'poor'
  sillShadowDepth: number
  storageShadowDepth: number
  decorShadowDepth: number
  recommendations: string[]
  windowCoverageMap: number[][]
}

export interface DecorItem {
  id: string
  type: 'pillow' | 'table' | 'blanket' | 'plant' | 'lamp'
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: { x: number; y: number; z: number }
  color: string
  material: 'cotton' | 'linen' | 'velvet' | 'wood' | 'ceramic' | 'metal'
  properties?: Record<string, number | string>
}

export interface MaterialOption {
  id: string
  name: string
  type: 'cushion' | 'drawer' | 'frame' | 'decor'
  color: string
  texture?: string
  roughness: number
  metalness: number
}

export interface DecorConfig {
  cushionColor: string
  cushionMaterial: 'cotton' | 'linen' | 'velvet'
  items: DecorItem[]
  frameColor: string
}

export interface AppState {
  bayWindow: BayWindowConfig
  comfort: ComfortAnalysis
  storage: StorageConfig
  storageAnalysis: StorageAnalysis
  lighting: LightingConfig
  lightingAnalysis: LightingAnalysis
  decor: DecorConfig
  activeTab: 'structure' | 'comfort' | 'storage' | 'lighting' | 'decor'
  showWarnings: boolean
}

export const DEFAULT_BAY_WINDOW: BayWindowConfig = {
  id: 'default',
  windowWidth: 240,
  windowHeight: 180,
  windowDepth: 70,
  sillHeight: 50,
  sillDepth: 65,
  wallThickness: 20,
  windowType: 'bay',
  paneCount: 3,
  hasCurtainBox: true,
  curtainBoxDepth: 15,
  curtainBoxHeight: 20,
  hasRadiator: true,
  radiatorWidth: 120,
  radiatorHeight: 60,
  radiatorDepth: 10,
  radiatorOffsetX: 0
}

export const DEFAULT_MATERIALS: MaterialOption[] = [
  { id: 'cushion-cotton-white', name: '米白棉麻', type: 'cushion', color: '#f5f0e6', roughness: 0.8, metalness: 0 },
  { id: 'cushion-linen-gray', name: '亚麻灰', type: 'cushion', color: '#b8b5ad', roughness: 0.9, metalness: 0 },
  { id: 'cushion-velvet-green', name: '墨绿丝绒', type: 'cushion', color: '#2d4a3e', roughness: 0.6, metalness: 0 },
  { id: 'cushion-cotton-blue', name: '雾霾蓝', type: 'cushion', color: '#6b8e9e', roughness: 0.85, metalness: 0 },
  { id: 'cushion-linen-beige', name: '浅驼色', type: 'cushion', color: '#c9b896', roughness: 0.88, metalness: 0 },
  { id: 'drawer-oak', name: '橡木原色', type: 'drawer', color: '#c9a066', roughness: 0.7, metalness: 0 },
  { id: 'drawer-walnut', name: '胡桃木', type: 'drawer', color: '#5c4033', roughness: 0.65, metalness: 0 },
  { id: 'drawer-white', name: '哑光白', type: 'drawer', color: '#fafaf7', roughness: 0.5, metalness: 0 },
  { id: 'frame-aluminum', name: '铝合金', type: 'frame', color: '#8b9094', roughness: 0.3, metalness: 0.7 },
  { id: 'frame-wood-dark', name: '深棕木框', type: 'frame', color: '#4a3728', roughness: 0.6, metalness: 0 },
  { id: 'frame-wood-light', name: '浅木色', type: 'frame', color: '#d4a574', roughness: 0.7, metalness: 0 }
]
