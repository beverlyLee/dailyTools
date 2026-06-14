import type { ImpactSource, ImpactEvent } from '../types'

export const impactSources: ImpactSource[] = [
  {
    id: 'highHeel',
    name: '高跟鞋行走',
    type: 'highHeel',
    description: '女性高跟鞋敲击地面，产生高频"哒哒"声',
    peakForce: 800,
    frequencyRange: [500, 3000],
    duration: 0.08,
    waveform: {
      type: 'impulse',
      attack: 0.005,
      decay: 0.03,
      sustain: 0.01,
      release: 0.035
    },
    color: '#ff6b6b',
    icon: '👠'
  },
  {
    id: 'slipper',
    name: '拖鞋行走',
    type: 'slipper',
    description: '软底拖鞋拍打地面，低频"啪啪"声',
    peakForce: 500,
    frequencyRange: [100, 800],
    duration: 0.15,
    waveform: {
      type: 'impulse',
      attack: 0.02,
      decay: 0.05,
      sustain: 0.03,
      release: 0.05
    },
    color: '#4ecdc4',
    icon: '🩴'
  },
  {
    id: 'heavyDrop',
    name: '重物掉落',
    type: 'heavyDrop',
    description: '哑铃或重物落地，产生强烈低频冲击',
    peakForce: 3000,
    frequencyRange: [20, 500],
    duration: 0.3,
    waveform: {
      type: 'burst',
      attack: 0.01,
      decay: 0.1,
      sustain: 0.05,
      release: 0.14
    },
    color: '#ff4757',
    icon: '🏋️'
  },
  {
    id: 'jump',
    name: '跳跃落地',
    type: 'jump',
    description: '人体跳跃落地，全身重量冲击',
    peakForce: 2000,
    frequencyRange: [50, 300],
    duration: 0.2,
    waveform: {
      type: 'burst',
      attack: 0.015,
      decay: 0.08,
      sustain: 0.02,
      release: 0.085
    },
    color: '#ffa502',
    icon: '🦘'
  },
  {
    id: 'furnitureDrag',
    name: '拖动家具',
    type: 'furnitureDrag',
    description: '椅子或桌子在地面拖动，持续摩擦振动',
    peakForce: 300,
    frequencyRange: [150, 1200],
    duration: 2.0,
    waveform: {
      type: 'sustained',
      attack: 0.3,
      decay: 0.5,
      sustain: 1.0,
      release: 0.2
    },
    color: '#a55eea',
    icon: '🪑'
  }
]

export class ImpactSourceGenerator {
  private activeImpacts: ImpactEvent[] = []
  private impactIdCounter = 0

  getSourceById(id: string): ImpactSource | undefined {
    return impactSources.find(s => s.id === id)
  }

  getAllSources(): ImpactSource[] {
    return [...impactSources]
  }

  createImpact(
    sourceId: string,
    position: { x: number; z: number },
    intensity: number = 1.0
  ): ImpactEvent | null {
    const source = this.getSourceById(sourceId)
    if (!source) return null

    const event: ImpactEvent = {
      id: `impact_${this.impactIdCounter++}`,
      source,
      position: { ...position },
      timestamp: performance.now() / 1000,
      intensity
    }

    this.activeImpacts.push(event)
    return event
  }

  calculateForceAtTime(impact: ImpactEvent, time: number): number {
    const elapsed = time - impact.timestamp
    const { waveform, peakForce } = impact.source
    const totalDuration = waveform.attack + waveform.decay + waveform.sustain + waveform.release

    if (elapsed < 0 || elapsed > totalDuration) return 0

    let force = 0
    const attackEnd = waveform.attack
    const decayEnd = attackEnd + waveform.decay
    const sustainEnd = decayEnd + waveform.sustain

    if (elapsed < attackEnd) {
      force = (elapsed / waveform.attack) * peakForce
    } else if (elapsed < decayEnd) {
      const decayProgress = (elapsed - attackEnd) / waveform.decay
      force = peakForce * (1 - decayProgress * 0.6)
    } else if (elapsed < sustainEnd) {
      force = peakForce * 0.4
    } else {
      const releaseProgress = (elapsed - sustainEnd) / waveform.release
      force = peakForce * 0.4 * (1 - releaseProgress)
    }

    return force * impact.intensity
  }

  getActiveImpacts(currentTime: number): ImpactEvent[] {
    this.activeImpacts = this.activeImpacts.filter(impact => {
      const { waveform } = impact.source
      const totalDuration = waveform.attack + waveform.decay + waveform.sustain + waveform.release
      return currentTime - impact.timestamp < totalDuration + 0.5
    })
    return this.activeImpacts
  }

  clearAll(): void {
    this.activeImpacts = []
  }
}
