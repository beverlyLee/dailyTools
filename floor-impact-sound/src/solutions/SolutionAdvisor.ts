import type { SolutionSuggestion, FloorStructure, ImpactSource } from '../types'

export const solutionSuggestions: SolutionSuggestion[] = [
  {
    id: 'thickCarpet',
    title: '铺设厚地毯',
    description: '在楼上地面铺设厚地毯或地垫，有效缓冲撞击力，减少高跟鞋和行走噪音',
    expectedImprovement: 8,
    cost: 'low',
    difficulty: 'easy',
    icon: '🧶'
  },
  {
    id: 'rubberMat',
    title: '放置橡胶减震垫',
    description: '在家具脚下放置橡胶垫，或在常活动区域铺设橡胶地垫',
    expectedImprovement: 5,
    cost: 'low',
    difficulty: 'easy',
    icon: '🔲'
  },
  {
    id: 'slippersOnly',
    title: '软底鞋制度',
    description: '楼上住户换穿软底拖鞋，避免高跟鞋直接接触地面',
    expectedImprovement: 10,
    cost: 'low',
    difficulty: 'easy',
    icon: '🩴'
  },
  {
    id: 'furniturePads',
    title: '家具脚垫',
    description: '所有桌椅腿底部粘贴毛毡脚垫，减少拖动和移动时的噪音',
    expectedImprovement: 6,
    cost: 'low',
    difficulty: 'easy',
    icon: '🪑'
  },
  {
    id: 'elasticUnderlay',
    title: '添加弹性垫层',
    description: '在地板下增加弹性减震垫（如橡胶垫、EVA泡沫），有效阻断固体传声',
    expectedImprovement: 15,
    cost: 'medium',
    difficulty: 'medium',
    icon: '🛡️'
  },
  {
    id: 'floatingFloor',
    title: '浮筑地板改造',
    description: '将现有地板改为浮筑结构，在弹性垫层上铺设新地板面层',
    expectedImprovement: 25,
    cost: 'high',
    difficulty: 'hard',
    icon: '🏗️'
  },
  {
    id: 'mineralWool',
    title: '矿棉填充',
    description: '在地板空腔或龙骨间填充矿棉，吸收振动能量',
    expectedImprovement: 10,
    cost: 'medium',
    difficulty: 'medium',
    icon: '🧱'
  },
  {
    id: 'ceilingSuspended',
    title: '吊顶隔音',
    description: '在楼下天花板安装弹性悬挂式吊顶，配合吸音棉使用',
    expectedImprovement: 12,
    cost: 'high',
    difficulty: 'hard',
    icon: '🔇'
  },
  {
    id: 'rubberJoist',
    title: '龙骨减震',
    description: '在木龙骨与楼板之间加橡胶垫，或更换为弹性龙骨',
    expectedImprovement: 12,
    cost: 'medium',
    difficulty: 'medium',
    icon: '📐'
  },
  {
    id: 'greenGlue',
    title: '阻尼隔音胶',
    description: '在楼板结构层之间涂抹阻尼隔音胶，耗散振动能量',
    expectedImprovement: 8,
    cost: 'medium',
    difficulty: 'medium',
    icon: '🧴'
  }
]

export class SolutionAdvisor {
  private currentStructure: FloorStructure

  constructor(structure: FloorStructure) {
    this.currentStructure = structure
  }

  updateStructure(structure: FloorStructure): void {
    this.currentStructure = structure
  }

  getSuggestions(
    impactType: string,
    currentSPL: number,
    targetSPL: number = 40
  ): SolutionSuggestion[] {
    const suggestions: SolutionSuggestion[] = []
    const needsImprovement = currentSPL > targetSPL

    if (!needsImprovement) {
      return []
    }

    const shortfall = currentSPL - targetSPL
    const existingFeatures = this.getExistingFeatures()

    for (const suggestion of solutionSuggestions) {
      if (this.isApplicable(suggestion, existingFeatures)) {
        suggestions.push(suggestion)
      }
    }

    suggestions.sort((a, b) => {
      const aValue = a.expectedImprovement / this.getCostMultiplier(a.cost)
      const bValue = b.expectedImprovement / this.getCostMultiplier(b.cost)
      return bValue - aValue
    })

    const prioritized = this.prioritizeByImpactType(suggestions, impactType)
    return prioritized
  }

  private getExistingFeatures(): Set<string> {
    const features = new Set<string>()
    const { layers, isFloating } = this.currentStructure

    for (const layer of layers) {
      if (layer.type === 'resilient') features.add('softSurface')
      if (layer.type === 'elastic') features.add('elasticLayer')
      if (layer.type === 'structural' && layer.id.includes('floating')) features.add('floating')
      if (layer.id === 'mineralWool') features.add('mineralWool')
      if (layer.id === 'thickCarpet') features.add('carpet')
    }

    if (isFloating) features.add('floating')

    return features
  }

  private isApplicable(suggestion: SolutionSuggestion, existing: Set<string>): boolean {
    switch (suggestion.id) {
      case 'thickCarpet':
        return !existing.has('carpet') && !existing.has('softSurface')
      case 'floatingFloor':
        return !existing.has('floating')
      case 'mineralWool':
        return !existing.has('mineralWool')
      case 'elasticUnderlay':
        return !existing.has('elasticLayer')
      default:
        return true
    }
  }

  private getCostMultiplier(cost: 'low' | 'medium' | 'high'): number {
    switch (cost) {
      case 'low': return 1
      case 'medium': return 3
      case 'high': return 8
    }
  }

  private prioritizeByImpactType(
    suggestions: SolutionSuggestion[],
    impactType: string
  ): SolutionSuggestion[] {
    const highPriority = new Set<string>()
    const lowPriority = new Set<string>()

    switch (impactType) {
      case 'highHeel':
        highPriority.add('thickCarpet')
        highPriority.add('slippersOnly')
        highPriority.add('elasticUnderlay')
        lowPriority.add('ceilingSuspended')
        break
      case 'slipper':
        highPriority.add('thickCarpet')
        highPriority.add('elasticUnderlay')
        break
      case 'heavyDrop':
      case 'jump':
        highPriority.add('floatingFloor')
        highPriority.add('elasticUnderlay')
        highPriority.add('mineralWool')
        lowPriority.add('slippersOnly')
        lowPriority.add('furniturePads')
        break
      case 'furnitureDrag':
        highPriority.add('furniturePads')
        highPriority.add('thickCarpet')
        lowPriority.add('ceilingSuspended')
        break
    }

    return suggestions.sort((a, b) => {
      const aScore = this.getPriorityScore(a, highPriority, lowPriority)
      const bScore = this.getPriorityScore(b, highPriority, lowPriority)
      if (aScore !== bScore) return bScore - aScore

      const aValue = a.expectedImprovement / this.getCostMultiplier(a.cost)
      const bValue = b.expectedImprovement / this.getCostMultiplier(b.cost)
      return bValue - aValue
    })
  }

  private getPriorityScore(
    suggestion: SolutionSuggestion,
    high: Set<string>,
    low: Set<string>
  ): number {
    if (high.has(suggestion.id)) return 2
    if (low.has(suggestion.id)) return 0
    return 1
  }

  getTopSuggestions(
    impactType: string,
    currentSPL: number,
    count: number = 3
  ): SolutionSuggestion[] {
    return this.getSuggestions(impactType, currentSPL).slice(0, count)
  }

  getQuickTips(): string[] {
    const tips: string[] = []
    const features = this.getExistingFeatures()

    if (!features.has('carpet') && !features.has('softSurface')) {
      tips.push('铺设地毯可快速降低行走噪音')
    }
    if (!features.has('elasticLayer')) {
      tips.push('弹性减震垫是性价比最高的隔音方案')
    }
    if (this.currentStructure.totalInsulation < 40) {
      tips.push('当前楼板隔音不足，建议进行专业隔音改造')
    }
    if (features.has('floating')) {
      tips.push('浮筑结构已就位，可考虑增加表面阻尼处理')
    }

    tips.push('避免在深夜进行重物搬运和剧烈活动')

    return tips.slice(0, 4)
  }

  getInsulationRatingText(level: 'poor' | 'fair' | 'good' | 'excellent'): string {
    switch (level) {
      case 'poor': return '隔音差'
      case 'fair': return '隔音一般'
      case 'good': return '隔音良好'
      case 'excellent': return '隔音优秀'
    }
  }

  getInsulationRatingColor(level: 'poor' | 'fair' | 'good' | 'excellent'): string {
    switch (level) {
      case 'poor': return '#ff4757'
      case 'fair': return '#ffa502'
      case 'good': return '#2ed573'
      case 'excellent': return '#1e90ff'
    }
  }
}
