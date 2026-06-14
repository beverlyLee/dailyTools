import type {
  BayWindowConfig,
  ComfortAnalysis,
  StorageConfig,
  StorageAnalysis,
  StorageConflict,
  StorageDrawer,
  LightingConfig,
  LightingAnalysis
} from '../types'

const STANDARD_SEAT_HEIGHT = 42
const MAX_COMFORT_SILL = 45
const MIN_SILL_HEIGHT = 35
const LOWER_LEG_LENGTH = 48

export function calculateComfortAnalysis(windowConfig: BayWindowConfig): ComfortAnalysis {
  const { sillHeight } = windowConfig
  const cushionHeight = 8
  const seatHeight = sillHeight + cushionHeight

  const heightDiff = seatHeight - STANDARD_SEAT_HEIGHT

  let legBendAngle: number
  let thighAngle: number
  let shinAngle: number

  if (heightDiff <= 0) {
    thighAngle = 0
    shinAngle = 90
    legBendAngle = 90
  } else {
    const elevationRatio = Math.min(heightDiff / LOWER_LEG_LENGTH, 1)
    shinAngle = 90 - elevationRatio * 45
    thighAngle = elevationRatio * 20
    legBendAngle = 180 - (90 - shinAngle) - thighAngle
  }

  const isComfortable = sillHeight <= MAX_COMFORT_SILL && sillHeight >= MIN_SILL_HEIGHT

  let comfortLevel: ComfortAnalysis['comfortLevel']
  if (sillHeight >= 38 && sillHeight <= 43) {
    comfortLevel = 'excellent'
  } else if (sillHeight >= 35 && sillHeight <= 45) {
    comfortLevel = 'good'
  } else if (sillHeight >= 32 && sillHeight <= 48) {
    comfortLevel = 'fair'
  } else {
    comfortLevel = 'poor'
  }

  const warnings: string[] = []
  const suggestions: string[] = []

  if (sillHeight > MAX_COMFORT_SILL) {
    warnings.push(`坐感不适，建议降板`)
    suggestions.push(`窗台高度 ${sillHeight}cm 超过舒适上限 ${MAX_COMFORT_SILL}cm，建议降板至 ${MAX_COMFORT_SILL}cm 以下`)
    suggestions.push(`可考虑增加脚踏板，高度约 ${sillHeight - STANDARD_SEAT_HEIGHT}cm`)
  }

  if (sillHeight < MIN_SILL_HEIGHT) {
    warnings.push('窗台过低，起身困难')
    suggestions.push(`窗台高度 ${sillHeight}cm 低于舒适下限，建议加高至 ${MIN_SILL_HEIGHT}cm 以上`)
  }

  if (heightDiff > 5) {
    suggestions.push('腿部悬空感明显，建议放置脚凳')
  }

  const footSupportNeeded = heightDiff > 6

  return {
    sillHeight,
    seatHeight,
    legBendAngle: Math.round(legBendAngle * 10) / 10,
    thighAngle: Math.round(thighAngle * 10) / 10,
    shinAngle: Math.round(shinAngle * 10) / 10,
    isComfortable,
    comfortLevel,
    warnings,
    suggestions,
    idealSillHeight: STANDARD_SEAT_HEIGHT - cushionHeight,
    footSupportNeeded
  }
}

export function generateDrawers(windowConfig: BayWindowConfig, storageConfig: StorageConfig): StorageDrawer[] {
  const drawers: StorageDrawer[] = []
  const { windowWidth, sillDepth } = windowConfig
  const { drawerCount, drawerHeight, drawerDepth } = storageConfig

  if (!storageConfig.enabled || drawerCount === 0) return drawers

  const totalDrawerWidth = windowWidth - 10
  const drawerWidth = (totalDrawerWidth - (drawerCount - 1) * 2) / drawerCount
  const startX = -windowWidth / 2 + 5

  for (let i = 0; i < drawerCount; i++) {
    drawers.push({
      id: `drawer-${i}`,
      width: drawerWidth,
      height: drawerHeight,
      depth: Math.min(drawerDepth, sillDepth - 5),
      x: startX + i * (drawerWidth + 2) + drawerWidth / 2,
      y: drawerHeight / 2,
      z: 0,
      openDirection: 'front',
      isOpen: false,
      openProgress: 0
    })
  }

  return drawers
}

export function calculateStorageAnalysis(
  windowConfig: BayWindowConfig,
  storageConfig: StorageConfig
): StorageAnalysis {
  const { drawers } = storageConfig
  const conflicts: StorageConflict[] = []

  let totalStorageVolume = 0
  let usableStorageVolume = 0

  drawers.forEach(drawer => {
    const drawerVolume = drawer.width * drawer.height * drawer.depth
    totalStorageVolume += drawerVolume

    let drawerConflicts = 0

    if (windowConfig.hasCurtainBox) {
      const curtainBoxFrontZ = windowConfig.curtainBoxDepth
      const drawerOpenZ = drawer.depth * 0.8

      if (drawer.z + drawerOpenZ > curtainBoxFrontZ - 2) {
        conflicts.push({
          drawerId: drawer.id,
          conflictType: 'curtain',
          conflictObject: '窗帘盒',
          overlapAmount: (drawer.z + drawerOpenZ) - (curtainBoxFrontZ - 2),
          severity: 'critical'
        })
        drawerConflicts++
      }
    }

    if (windowConfig.hasRadiator) {
      const radStartX = windowConfig.radiatorOffsetX - windowConfig.radiatorWidth / 2
      const radEndX = windowConfig.radiatorOffsetX + windowConfig.radiatorWidth / 2
      const radFrontZ = windowConfig.radiatorDepth
      const drawerStartX = drawer.x - drawer.width / 2
      const drawerEndX = drawer.x + drawer.width / 2
      const drawerOpenZ = drawer.depth * 0.8

      const xOverlap = Math.max(0, Math.min(drawerEndX, radEndX) - Math.max(drawerStartX, radStartX))
      const zOverlap = Math.max(0, (drawer.z + drawerOpenZ) - radFrontZ)

      if (xOverlap > 0 && zOverlap > 0) {
        conflicts.push({
          drawerId: drawer.id,
          conflictType: 'radiator',
          conflictObject: '暖气片',
          overlapAmount: xOverlap * zOverlap,
          severity: 'critical'
        })
        drawerConflicts++
      }
    }

    if (drawerConflicts === 0) {
      usableStorageVolume += drawerVolume
    }
  })

  const suggestions: string[] = []

  if (conflicts.length > 0) {
    const hasCurtainConflict = conflicts.some(c => c.conflictType === 'curtain')
    const hasRadiatorConflict = conflicts.some(c => c.conflictType === 'radiator')

    if (hasCurtainConflict || hasRadiatorConflict) {
      suggestions.push('抽屉开启受阻，建议改为侧开式或放弃储物功能')
    }

    if (hasRadiatorConflict) {
      suggestions.push('可考虑将储物改为侧开式，避开暖气片位置')
      suggestions.push('或者将暖气片移至飘窗侧面墙面')
    }

    if (hasCurtainConflict) {
      suggestions.push('可将窗帘改为内装式或百叶窗帘')
      suggestions.push('或者减小抽屉深度，让出窗帘安装空间')
    }
  }

  if (storageConfig.enabled && drawers.length === 0) {
    suggestions.push('请设置至少一个抽屉')
  }

  return {
    totalStorageVolume: Math.round(totalStorageVolume),
    usableStorageVolume: Math.round(usableStorageVolume),
    conflicts,
    hasConflicts: conflicts.length > 0,
    suggestions
  }
}

export function calculateLightingAnalysis(
  windowConfig: BayWindowConfig,
  lightingConfig: LightingConfig
): LightingAnalysis {
  const { windowWidth, windowHeight, sillDepth } = windowConfig
  const { sunAngle, sunElevation, sillElevation, storageElevation, decorElevation } = lightingConfig

  const originalLightArea = windowWidth * windowHeight

  const sunElevationRad = (sunElevation * Math.PI) / 180
  const sunAzimuthRad = (sunAngle * Math.PI) / 180

  const sillShadowDepth = sillElevation > 0
    ? Math.tan(sunElevationRad) * sillDepth * Math.cos(sunAzimuthRad)
    : 0

  const storageHeight = storageElevation
  const storageShadowDepth = storageHeight > 0
    ? Math.tan(sunElevationRad) * storageHeight * 0.3
    : 0

  const decorShadowDepth = decorElevation > 0
    ? Math.tan(sunElevationRad) * decorElevation * 0.15
    : 0

  const totalShadowRatio = Math.min(
    (sillShadowDepth + storageShadowDepth + decorShadowDepth) / windowHeight,
    1
  )

  const blockedLightArea = originalLightArea * totalShadowRatio
  const lightBlockagePercentage = Math.round(totalShadowRatio * 1000) / 10

  let illuminationLevel: LightingAnalysis['illuminationLevel']
  if (lightBlockagePercentage < 15) {
    illuminationLevel = 'excellent'
  } else if (lightBlockagePercentage < 30) {
    illuminationLevel = 'good'
  } else if (lightBlockagePercentage < 50) {
    illuminationLevel = 'fair'
  } else {
    illuminationLevel = 'poor'
  }

  const recommendations: string[] = []

  if (lightBlockagePercentage > 30) {
    recommendations.push(`采光遮挡率 ${lightBlockagePercentage}%，建议优化结构`)
  }

  if (sillElevation > 0 && lightBlockagePercentage > 20) {
    recommendations.push('加高台面明显遮挡采光，建议降低台面高度')
  }

  if (storageElevation > 0 && lightBlockagePercentage > 25) {
    recommendations.push('储物箱体遮挡部分采光，可考虑使用透明材质柜门')
  }

  if (decorElevation > 10) {
    recommendations.push('软装物品较高，建议选择低矮款式以保留采光')
  }

  if (lightBlockagePercentage < 15) {
    recommendations.push('采光状况优秀，可放心进行软装搭配')
  }

  const gridSize = 10
  const windowCoverageMap: number[][] = []
  for (let y = 0; y < gridSize; y++) {
    const row: number[] = []
    for (let x = 0; x < gridSize; x++) {
      const normalizedY = y / gridSize
      let coverage = 0

      if (normalizedY < totalShadowRatio * 0.5) {
        coverage = 1 - (normalizedY / (totalShadowRatio * 0.5)) * 0.3
      } else if (normalizedY < totalShadowRatio) {
        coverage = 0.7 - ((normalizedY - totalShadowRatio * 0.5) / (totalShadowRatio * 0.5)) * 0.4
      } else {
        coverage = 0.1 + Math.random() * 0.1
      }

      row.push(Math.round(coverage * 100) / 100)
    }
    windowCoverageMap.push(row)
  }

  return {
    originalLightArea: Math.round(originalLightArea),
    blockedLightArea: Math.round(blockedLightArea),
    lightBlockagePercentage,
    illuminationLevel,
    sillShadowDepth: Math.round(sillShadowDepth * 10) / 10,
    storageShadowDepth: Math.round(storageShadowDepth * 10) / 10,
    decorShadowDepth: Math.round(decorShadowDepth * 10) / 10,
    recommendations,
    windowCoverageMap
  }
}

export const COMFORT_COLORS = {
  excellent: '#22c55e',
  good: '#84cc16',
  fair: '#eab308',
  poor: '#ef4444'
}

export const ILLUMINATION_COLORS = {
  excellent: '#fbbf24',
  good: '#f59e0b',
  fair: '#d97706',
  poor: '#92400e'
}

export function toMeters(cm: number): number {
  return cm / 100
}
