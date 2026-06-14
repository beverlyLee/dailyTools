import type { FloorLayer, FloorStructure } from '../types'

export const floorLayers: FloorLayer[] = [
  {
    id: 'woodFloor',
    name: '实木地板',
    type: 'surface',
    thickness: 0.018,
    density: 650,
    youngsModulus: 12e9,
    dampingRatio: 0.05,
    soundInsulation: 2,
    color: '#8B4513',
    description: '表面装饰层，对隔音贡献较小'
  },
  {
    id: 'laminateFloor',
    name: '复合地板',
    type: 'surface',
    thickness: 0.012,
    density: 800,
    youngsModulus: 8e9,
    dampingRatio: 0.06,
    soundInsulation: 3,
    color: '#A0522D',
    description: '复合地板，带有一定缓冲效果'
  },
  {
    id: 'woodJoist',
    name: '木龙骨',
    type: 'structural',
    thickness: 0.05,
    density: 500,
    youngsModulus: 10e9,
    dampingRatio: 0.04,
    soundInsulation: 5,
    color: '#DEB887',
    description: '木质龙骨结构，形成空腔'
  },
  {
    id: 'concreteSlab',
    name: '混凝土楼板',
    type: 'structural',
    thickness: 0.12,
    density: 2400,
    youngsModulus: 30e9,
    dampingRatio: 0.02,
    soundInsulation: 25,
    color: '#808080',
    description: '钢筋混凝土结构，质量大但刚性高'
  },
  {
    id: 'elasticPad',
    name: '弹性减震垫',
    type: 'elastic',
    thickness: 0.005,
    density: 200,
    youngsModulus: 5e6,
    dampingRatio: 0.3,
    soundInsulation: 12,
    color: '#32CD32',
    description: '橡胶或泡沫材质，有效阻断固体传声'
  },
  {
    id: 'thickCarpet',
    name: '厚地毯',
    type: 'resilient',
    thickness: 0.015,
    density: 150,
    youngsModulus: 1e6,
    dampingRatio: 0.4,
    soundInsulation: 8,
    color: '#DC143C',
    description: '表面铺设，减少撞击力'
  },
  {
    id: 'floatingScreed',
    name: '浮筑砂浆层',
    type: 'structural',
    thickness: 0.04,
    density: 1800,
    youngsModulus: 15e9,
    dampingRatio: 0.08,
    soundInsulation: 10,
    color: '#696969',
    description: '浮筑结构上层，隔离振动'
  },
  {
    id: 'mineralWool',
    name: '矿棉吸音层',
    type: 'elastic',
    thickness: 0.05,
    density: 80,
    youngsModulus: 1e5,
    dampingRatio: 0.5,
    soundInsulation: 8,
    color: '#DAA520',
    description: '填充空腔，吸收空气声'
  }
]

export const floorStructures: FloorStructure[] = [
  {
    id: 'bareConcrete',
    name: '素混凝土楼板',
    layers: [
      { ...floorLayers.find(l => l.id === 'concreteSlab')! }
    ],
    totalThickness: 0.12,
    totalInsulation: 25,
    isFloating: false,
    description: '最基础的混凝土楼板，无任何隔音处理'
  },
  {
    id: 'woodFloorJoist',
    name: '木地板+龙骨',
    layers: [
      { ...floorLayers.find(l => l.id === 'woodFloor')! },
      { ...floorLayers.find(l => l.id === 'woodJoist')! },
      { ...floorLayers.find(l => l.id === 'concreteSlab')! }
    ],
    totalThickness: 0.188,
    totalInsulation: 30,
    isFloating: false,
    description: '传统木龙骨地板，空腔易放大低频噪声'
  },
  {
    id: 'concreteWithCarpet',
    name: '混凝土+厚地毯',
    layers: [
      { ...floorLayers.find(l => l.id === 'thickCarpet')! },
      { ...floorLayers.find(l => l.id === 'concreteSlab')! }
    ],
    totalThickness: 0.135,
    totalInsulation: 33,
    isFloating: false,
    description: '铺设厚地毯，缓冲撞击力'
  },
  {
    id: 'floatingFloorBasic',
    name: '浮筑地板（基础）',
    layers: [
      { ...floorLayers.find(l => l.id === 'laminateFloor')! },
      { ...floorLayers.find(l => l.id === 'floatingScreed')! },
      { ...floorLayers.find(l => l.id === 'elasticPad')! },
      { ...floorLayers.find(l => l.id === 'concreteSlab')! }
    ],
    totalThickness: 0.177,
    totalInsulation: 48,
    isFloating: true,
    description: '基础浮筑结构，弹性垫有效隔离固体传声'
  },
  {
    id: 'floatingFloorPremium',
    name: '浮筑地板（高级）',
    layers: [
      { ...floorLayers.find(l => l.id === 'woodFloor')! },
      { ...floorLayers.find(l => l.id === 'floatingScreed')! },
      { ...floorLayers.find(l => l.id === 'elasticPad')! },
      { ...floorLayers.find(l => l.id === 'mineralWool')! },
      { ...floorLayers.find(l => l.id === 'concreteSlab')! }
    ],
    totalThickness: 0.233,
    totalInsulation: 58,
    isFloating: true,
    description: '高级浮筑结构，矿棉填充进一步提升隔音'
  },
  {
    id: 'floatingFloorElite',
    name: '浮筑地板（顶配）',
    layers: [
      { ...floorLayers.find(l => l.id === 'thickCarpet')! },
      { ...floorLayers.find(l => l.id === 'woodFloor')! },
      { ...floorLayers.find(l => l.id === 'floatingScreed')! },
      { ...floorLayers.find(l => l.id === 'elasticPad')! },
      { ...floorLayers.find(l => l.id === 'mineralWool')! },
      { ...floorLayers.find(l => l.id === 'concreteSlab')! }
    ],
    totalThickness: 0.248,
    totalInsulation: 68,
    isFloating: true,
    description: '顶配浮筑方案，多重减震隔音'
  }
]

export class FloorStructureManager {
  private currentStructure: FloorStructure
  private customLayers: FloorLayer[] = []

  constructor(initialStructureId: string = 'bareConcrete') {
    const structure = floorStructures.find(s => s.id === initialStructureId)
    this.currentStructure = structure || floorStructures[0]
  }

  getCurrentStructure(): FloorStructure {
    return { ...this.currentStructure }
  }

  getAllStructures(): FloorStructure[] {
    return [...floorStructures]
  }

  getAllLayers(): FloorLayer[] {
    return [...floorLayers]
  }

  setStructure(structureId: string): boolean {
    const structure = floorStructures.find(s => s.id === structureId)
    if (!structure) return false
    this.currentStructure = { ...structure }
    return true
  }

  calculateLayerInsulation(layer: FloorLayer, frequency: number): number {
    const massLaw = 20 * Math.log10(layer.density * layer.thickness * frequency / 1000)
    const dampingFactor = 1 + layer.dampingRatio * 10
    const baseInsulation = massLaw * dampingFactor * 0.3
    return Math.max(0, baseInsulation + layer.soundInsulation * 0.5)
  }

  calculateTotalInsulation(frequency: number): number {
    let totalInsulation = 0

    for (let i = 0; i < this.currentStructure.layers.length; i++) {
      const layer = this.currentStructure.layers[i]
      const layerInsulation = this.calculateLayerInsulation(layer, frequency)

      if (layer.type === 'elastic' || layer.type === 'resilient') {
        totalInsulation += layerInsulation * 1.5
      } else {
        totalInsulation += layerInsulation
      }
    }

    if (this.currentStructure.isFloating) {
      totalInsulation += 8
    }

    return totalInsulation
  }

  getStructureWeight(): number {
    return this.currentStructure.layers.reduce((sum, layer) => {
      return sum + layer.density * layer.thickness
    }, 0)
  }

  addCustomLayer(layer: FloorLayer): void {
    this.customLayers.push(layer)
  }

  getInsulationLevel(impactType: string): 'poor' | 'fair' | 'good' | 'excellent' {
    const total = this.currentStructure.totalInsulation

    if (impactType === 'highHeel') {
      if (total < 30) return 'poor'
      if (total < 45) return 'fair'
      if (total < 60) return 'good'
      return 'excellent'
    } else if (impactType === 'heavyDrop' || impactType === 'jump') {
      if (total < 35) return 'poor'
      if (total < 50) return 'fair'
      if (total < 65) return 'good'
      return 'excellent'
    } else {
      if (total < 25) return 'poor'
      if (total < 40) return 'fair'
      if (total < 55) return 'good'
      return 'excellent'
    }
  }
}
