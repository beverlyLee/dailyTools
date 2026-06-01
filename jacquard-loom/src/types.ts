export interface PatternData {
  name: string
  width: number
  height: number
  data: boolean[][]
}

export interface LoomConfig {
  warpCount: number
  warpHeight: number
  warpSpacing: number
  weftMaxRows: number
  shuttleSpeed: number
  animationSpeed: number
}

export interface LoomState {
  currentRow: number
  isWeaving: boolean
  shuttleDirection: 1 | -1
  phase: 'idle' | 'warp-lifting' | 'shuttle-moving' | 'weft-setting' | 'complete'
  phaseProgress: number
}

export const COLORS = {
  warp: '#FFFFF0',
  warpLifted: '#FFE4B5',
  weft: '#0D1B5E',
  weftPattern: '#CC2200',
  wood: '#5D4037',
  metal: '#708090',
  brass: '#B8860B',
  fabricBg: '#F5F5DC',
} as const
