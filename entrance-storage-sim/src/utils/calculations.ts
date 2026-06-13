import type {
  FamilyData,
  ShoeCabinet,
  ErgonomicsResult,
  StorageAnalysis,
  DustSimulation,
  DustResult,
  GapAnalysis,
  CompartmentConfig
} from '../types'

export const ADULT_SHOES = 5
export const CHILD_SHOES = 3
export const SEASONAL_FACTOR = 0.2

export function calculateShoeNeeds(adults: number, children: number): number {
  const baseCount = adults * ADULT_SHOES + children * CHILD_SHOES
  const seasonalAdjust = baseCount * SEASONAL_FACTOR
  return Math.ceil(baseCount + seasonalAdjust)
}

export function calculateCabinetCapacity(config: ShoeCabinet): number {
  const averagePerCompartment = config.mode === 'thin' ? 1.5 : 2
  return config.compartments * averagePerCompartment
}

export function detectCapacityGap(
  familyData: FamilyData,
  cabinetConfig: ShoeCabinet
): GapAnalysis {
  const needs = calculateShoeNeeds(familyData.adults, familyData.children)
  const capacity = calculateCabinetCapacity(cabinetConfig)

  const gap = needs - capacity
  const gapRatio = gap / capacity

  return {
    hasGap: gap > 0,
    gapCount: Math.max(0, gap),
    gapPercentage: Math.round(gapRatio * 100),
    suggestion: generateSuggestion(gapRatio)
  }
}

export function generateSuggestion(gapRatio: number): string {
  if (gapRatio <= 0) {
    return '当前配置可满足收纳需求'
  } else if (gapRatio <= 0.2) {
    return '建议增加旋转鞋架或抽拉层板'
  } else if (gapRatio <= 0.4) {
    return '建议增加 30% 的旋转鞋架空间'
  } else {
    return '建议考虑独立的鞋柜或鞋墙解决方案'
  }
}

export function generateLayout(
  totalHeight: number,
  mode: ShoeCabinet['mode'],
  bootRatio: number
): CompartmentConfig[] {
  const layouts: CompartmentConfig[] = []
  const compartmentCount = mode === 'rotating' ? 4 : 3

  for (let i = 0; i < compartmentCount; i++) {
    const heightPercent = i === 0 ? 0.35 : (1 - 0.35) / (compartmentCount - 1)
    const height = totalHeight * heightPercent

    let type: 'boots' | 'regular' | 'sandals' = 'regular'
    let items = Math.floor(height / 15) * 2

    if (i === 0 && bootRatio > 0.3) {
      type = 'boots'
      items = Math.floor(height / 25)
    } else if (i === compartmentCount - 1) {
      type = 'sandals'
      items = Math.floor(height / 10) * 3
    }

    layouts.push({ height, items, type })
  }

  return layouts
}

export function checkErgonomics(
  cabinetDepth: number,
  availableAisle: number
): ErgonomicsResult {
  const minDepth = cabinetDepth + 30
  const minAisle = cabinetDepth + 50
  const warnings: string[] = []

  if (minAisle > availableAisle) {
    warnings.push('走道宽度不足，建议保持至少 80cm 的通行空间')
  }

  if (cabinetDepth < 35) {
    warnings.push('鞋柜深度较浅，长靴可能无法平放')
  }

  if (cabinetDepth > 40) {
    warnings.push('鞋柜深度较深，需要更大的弯腰幅度')
  }

  return {
    isFeasible: minAisle <= availableAisle,
    minAisleWidth: minAisle,
    kickClearance: 30,
    warnings
  }
}

export function analyzeStorage(
  shoeCount: number,
  cabinetConfig: ShoeCabinet
): StorageAnalysis {
  const capacity = calculateCabinetCapacity(cabinetConfig)
  const utilization = Math.min(100, Math.round((shoeCount / capacity) * 100))
  const deficit = Math.max(0, shoeCount - capacity)

  const suggestions: string[] = []

  if (utilization > 90) {
    suggestions.push('容量接近饱和，建议增加收纳空间')
  }

  if (deficit > 0) {
    suggestions.push(`缺少约 ${deficit} 双鞋的收纳空间`)
  }

  return {
    currentCapacity: capacity,
    requiredCapacity: shoeCount,
    utilization,
    deficit,
    suggestions
  }
}

export function calculateDustArea(params: DustSimulation): DustResult {
  const baseSpreadX = params.doorWidth * 1.5
  const baseSpreadY = params.doorWidth * 2

  const trafficMultiplier = {
    low: 0.7,
    medium: 1.0,
    high: 1.3
  }[params.trafficFrequency]

  const locationMultiplier = {
    urban: 1.0,
    suburban: 1.2
  }[params.location]

  const seasonMultiplier = {
    spring: 1.3,
    summer: 1.1,
    autumn: 0.9,
    winter: 0.8
  }[params.season]

  const spreadX = Math.round(baseSpreadX * trafficMultiplier * locationMultiplier)
  const spreadY = Math.round(baseSpreadY * trafficMultiplier * seasonMultiplier)

  const intensity = Math.round(trafficMultiplier * locationMultiplier * 100)

  return {
    spreadX,
    spreadY,
    intensity,
    recommendedMat: {
      width: spreadX + 40,
      length: spreadY + 60
    }
  }
}
