import type { ImpactEvent, VibrationPoint, FloorStructure, SoundPressurePoint } from '../types'

export class VibrationTransmission {
  private gridSize: number
  private gridResolution: number
  private waveSpeed: number = 3500
  private dampingCoeff: number = 0.15
  private structure: FloorStructure

  constructor(structure: FloorStructure, gridSize: number = 10, gridResolution: number = 50) {
    this.structure = structure
    this.gridSize = gridSize
    this.gridResolution = gridResolution
    this.updateWaveParameters()
  }

  updateStructure(structure: FloorStructure): void {
    this.structure = structure
    this.updateWaveParameters()
  }

  private updateWaveParameters(): void {
    const { layers } = this.structure
    let totalYoungs = 0
    let totalDensity = 0
    let totalDamping = 0
    let totalThickness = 0

    for (const layer of layers) {
      totalYoungs += layer.youngsModulus * layer.thickness
      totalDensity += layer.density * layer.thickness
      totalDamping += layer.dampingRatio * layer.thickness
      totalThickness += layer.thickness
    }

    const avgYoungs = totalYoungs / totalThickness
    const avgDensity = totalDensity / totalThickness
    const avgDamping = totalDamping / totalThickness

    this.waveSpeed = Math.sqrt(avgYoungs / avgDensity) * 0.3
    this.dampingCoeff = avgDamping * 2 + 0.05
  }

  calculateVibrationAtPoint(
    impact: ImpactEvent,
    pointX: number,
    pointZ: number,
    currentTime: number
  ): VibrationPoint {
    const dx = pointX - impact.position.x
    const dz = pointZ - impact.position.z
    const distance = Math.sqrt(dx * dx + dz * dz)

    const timeDelay = distance / this.waveSpeed
    const elapsed = currentTime - impact.timestamp - timeDelay

    if (elapsed < 0) {
      return { x: pointX, z: pointZ, amplitude: 0, velocity: 0, acceleration: 0, phase: 0 }
    }

    const { waveform, peakForce, frequencyRange } = impact.source
    const totalDuration = waveform.attack + waveform.decay + waveform.sustain + waveform.release

    if (elapsed > totalDuration + 0.5) {
      return { x: pointX, z: pointZ, amplitude: 0, velocity: 0, acceleration: 0, phase: 0 }
    }

    let forceFactor = 0
    const attackEnd = waveform.attack
    const decayEnd = attackEnd + waveform.decay
    const sustainEnd = decayEnd + waveform.sustain

    if (elapsed < attackEnd) {
      forceFactor = elapsed / waveform.attack
    } else if (elapsed < decayEnd) {
      const decayProgress = (elapsed - attackEnd) / waveform.decay
      forceFactor = 1 - decayProgress * 0.6
    } else if (elapsed < sustainEnd) {
      forceFactor = 0.4
    } else if (elapsed < totalDuration) {
      const releaseProgress = (elapsed - sustainEnd) / waveform.release
      forceFactor = 0.4 * (1 - releaseProgress)
    }

    const spatialDecay = Math.exp(-distance * this.dampingCoeff / 10)
    const geometricDecay = 1 / (1 + distance * 0.3)
    const structuralDamping = this.calculateStructuralDamping(frequencyRange[1])

    const amplitude = peakForce * forceFactor * spatialDecay * geometricDecay * structuralDamping * impact.intensity
    const centerFreq = (frequencyRange[0] + frequencyRange[1]) / 2
    const phase = elapsed * centerFreq * Math.PI * 2

    const velocity = amplitude * centerFreq * 2 * Math.PI * Math.cos(phase) * 0.001
    const acceleration = amplitude * centerFreq * centerFreq * 4 * Math.PI * Math.PI * Math.sin(phase) * 0.00001

    return {
      x: pointX,
      z: pointZ,
      amplitude: amplitude * 0.001,
      velocity: velocity * 0.001,
      acceleration: Math.abs(acceleration * 0.001),
      phase
    }
  }

  private calculateStructuralDamping(frequency: number): number {
    let dampingFactor = 1

    for (const layer of this.structure.layers) {
      if (layer.type === 'elastic' || layer.type === 'resilient') {
        dampingFactor *= Math.max(0.1, 1 - layer.dampingRatio * 2)
      } else if (layer.type === 'structural') {
        const massLawFactor = 1 / (1 + layer.density * layer.thickness * 0.01)
        dampingFactor *= Math.max(0.3, massLawFactor)
      }
    }

    if (this.structure.isFloating) {
      dampingFactor *= 0.5
    }

    const freqFactor = 1 / (1 + Math.pow(frequency / 1000, 0.5) * 0.3)
    dampingFactor *= freqFactor

    return dampingFactor
  }

  calculateVibrationGrid(
    impacts: ImpactEvent[],
    currentTime: number
  ): VibrationPoint[][] {
    const grid: VibrationPoint[][] = []
    const cellSize = this.gridSize / this.gridResolution
    const halfSize = this.gridSize / 2

    for (let i = 0; i < this.gridResolution; i++) {
      grid[i] = []
      for (let j = 0; j < this.gridResolution; j++) {
        const x = -halfSize + i * cellSize + cellSize / 2
        const z = -halfSize + j * cellSize + cellSize / 2

        let totalAmplitude = 0
        let totalVelocity = 0
        let totalAcceleration = 0

        for (const impact of impacts) {
          const vibPoint = this.calculateVibrationAtPoint(impact, x, z, currentTime)
          totalAmplitude += vibPoint.amplitude
          totalVelocity += vibPoint.velocity
          totalAcceleration += vibPoint.acceleration
        }

        grid[i][j] = {
          x,
          z,
          amplitude: totalAmplitude,
          velocity: totalVelocity,
          acceleration: totalAcceleration,
          phase: 0
        }
      }
    }

    return grid
  }

  calculateSoundPressureLevel(vibration: VibrationPoint, frequency: number): number {
    const radiationEfficiency = 0.1
    const airDensity = 1.21
    const soundSpeed = 343

    const surfaceVelocity = Math.abs(vibration.velocity)
    const soundIntensity = airDensity * soundSpeed * surfaceVelocity * surfaceVelocity * radiationEfficiency

    const referenceIntensity = 1e-12
    let spl = 10 * Math.log10(Math.max(soundIntensity, referenceIntensity) / referenceIntensity)

    spl = Math.max(0, spl - 20)

    return Math.min(100, spl)
  }

  calculateSPLGrid(
    impacts: ImpactEvent[],
    currentTime: number,
    frequency: number
  ): SoundPressurePoint[][] {
    const grid: SoundPressurePoint[][] = []
    const cellSize = this.gridSize / this.gridResolution
    const halfSize = this.gridSize / 2

    for (let i = 0; i < this.gridResolution; i++) {
      grid[i] = []
      for (let j = 0; j < this.gridResolution; j++) {
        const x = -halfSize + i * cellSize + cellSize / 2
        const z = -halfSize + j * cellSize + cellSize / 2

        let totalAmplitude = 0
        for (const impact of impacts) {
          const vibPoint = this.calculateVibrationAtPoint(impact, x, z, currentTime)
          totalAmplitude += vibPoint.amplitude
        }

        const vib: VibrationPoint = {
          x, z,
          amplitude: totalAmplitude,
          velocity: totalAmplitude * frequency * 2 * Math.PI * 0.01,
          acceleration: 0,
          phase: 0
        }

        const spl = this.calculateSoundPressureLevel(vib, frequency)

        grid[i][j] = { x, z, spl, frequency }
      }
    }

    return grid
  }

  getAverageSPL(impacts: ImpactEvent[], currentTime: number): number {
    if (impacts.length === 0) return 0

    let totalSPL = 0
    let count = 0
    const sampleStep = Math.max(1, Math.floor(this.gridResolution / 10))

    for (let i = 0; i < this.gridResolution; i += sampleStep) {
      for (let j = 0; j < this.gridResolution; j += sampleStep) {
        const x = -this.gridSize / 2 + (i + 0.5) * (this.gridSize / this.gridResolution)
        const z = -this.gridSize / 2 + (j + 0.5) * (this.gridSize / this.gridResolution)

        let totalAmp = 0
        for (const impact of impacts) {
          const vib = this.calculateVibrationAtPoint(impact, x, z, currentTime)
          totalAmp += vib.amplitude
        }

        const vib: VibrationPoint = {
          x, z,
          amplitude: totalAmp,
          velocity: totalAmp * 500 * 2 * Math.PI * 0.01,
          acceleration: 0,
          phase: 0
        }

        totalSPL += this.calculateSoundPressureLevel(vib, 500)
        count++
      }
    }

    return count > 0 ? totalSPL / count : 0
  }

  getPeakSPL(impacts: ImpactEvent[], currentTime: number): number {
    if (impacts.length === 0) return 0

    let peakSPL = 0
    const centerImpacts = impacts.filter(imp => {
      return Math.abs(imp.position.x) < 1 && Math.abs(imp.position.z) < 1
    })

    const impactsToUse = centerImpacts.length > 0 ? centerImpacts : impacts

    for (const impact of impactsToUse) {
      const vib = this.calculateVibrationAtPoint(impact, impact.position.x, impact.position.z, currentTime)
      const vibPoint: VibrationPoint = {
        ...vib,
        velocity: vib.amplitude * 500 * 2 * Math.PI * 0.01
      }
      const spl = this.calculateSoundPressureLevel(vibPoint, 500)
      peakSPL = Math.max(peakSPL, spl)
    }

    return peakSPL
  }
}
