export interface FamilyData {
  adults: number
  children: number
  familyType: 'normal' | 'sports' | 'fashion' | 'multi-season'
}

export interface ShoeCabinet {
  mode: 'deep-shallow' | 'thin' | 'rotating'
  width: number
  depth: number
  height: number
  compartments: number
  compartmentHeights: number[]
}

export interface ErgonomicsResult {
  isFeasible: boolean
  minAisleWidth: number
  kickClearance: number
  warnings: string[]
}

export interface StorageAnalysis {
  currentCapacity: number
  requiredCapacity: number
  utilization: number
  deficit: number
  suggestions: string[]
}

export interface DustSimulation {
  doorWidth: number
  trafficFrequency: 'low' | 'medium' | 'high'
  location: 'urban' | 'suburban'
  season: 'spring' | 'summer' | 'autumn' | 'winter'
}

export interface DustResult {
  spreadX: number
  spreadY: number
  intensity: number
  recommendedMat: {
    width: number
    length: number
  }
}

export interface GapAnalysis {
  hasGap: boolean
  gapCount: number
  gapPercentage: number
  suggestion: string
}

export interface CompartmentConfig {
  height: number
  items: number
  type: 'boots' | 'regular' | 'sandals'
}
