export interface ImpactSource {
  id: string
  name: string
  type: 'highHeel' | 'slipper' | 'heavyDrop' | 'jump' | 'furnitureDrag'
  description: string
  peakForce: number
  frequencyRange: [number, number]
  duration: number
  waveform: ImpactWaveform
  color: string
  icon: string
}

export interface ImpactWaveform {
  type: 'impulse' | 'burst' | 'sustained'
  attack: number
  decay: number
  sustain: number
  release: number
}

export interface FloorLayer {
  id: string
  name: string
  type: 'surface' | 'elastic' | 'structural' | 'resilient'
  thickness: number
  density: number
  youngsModulus: number
  dampingRatio: number
  soundInsulation: number
  color: string
  description: string
}

export interface FloorStructure {
  id: string
  name: string
  layers: FloorLayer[]
  totalThickness: number
  totalInsulation: number
  isFloating: boolean
  description: string
}

export interface VibrationPoint {
  x: number
  z: number
  amplitude: number
  velocity: number
  acceleration: number
  phase: number
}

export interface SoundPressurePoint {
  x: number
  z: number
  spl: number
  frequency: number
}

export interface ImpactEvent {
  id: string
  source: ImpactSource
  position: { x: number; z: number }
  timestamp: number
  intensity: number
}

export interface SolutionSuggestion {
  id: string
  title: string
  description: string
  expectedImprovement: number
  cost: 'low' | 'medium' | 'high'
  difficulty: 'easy' | 'medium' | 'hard'
  icon: string
}

export type InsulationLevel = 'poor' | 'fair' | 'good' | 'excellent'
