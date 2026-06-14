import type { Projector } from '../types'

export const projectors: Projector[] = [
  {
    id: 'epson-tw7000',
    name: 'EH-TW7000',
    brand: 'Epson 爱普生',
    throwRatio: 1.32,
    throwRatioMin: 1.32,
    throwRatioMax: 2.15,
    zoomType: 'optical',
    offset: 0.63,
    maxKeystoneAngle: 30,
    nativeResolution: { width: 3840, height: 2160 },
    brightness: 3000,
    category: 'standard'
  },
  {
    id: 'benq-w1130',
    name: 'W1130',
    brand: 'BenQ 明基',
    throwRatio: 1.49,
    throwRatioMin: 1.49,
    throwRatioMax: 1.64,
    zoomType: 'optical',
    offset: 0.55,
    maxKeystoneAngle: 40,
    nativeResolution: { width: 1920, height: 1080 },
    brightness: 2300,
    category: 'standard'
  },
  {
    id: 'xgimi-horizon-pro',
    name: 'Horizon Pro',
    brand: 'XGIMI 极米',
    throwRatio: 1.2,
    zoomType: 'fixed',
    offset: 1.0,
    maxKeystoneAngle: 45,
    nativeResolution: { width: 1920, height: 1080 },
    brightness: 2200,
    category: 'standard'
  },
  {
    id: 'jmgo-n1-ultra',
    name: 'N1 Ultra',
    brand: 'JMGO 坚果',
    throwRatio: 0.9,
    throwRatioMin: 0.9,
    throwRatioMax: 1.2,
    zoomType: 'optical',
    offset: 1.05,
    maxKeystoneAngle: 45,
    nativeResolution: { width: 1920, height: 1080 },
    brightness: 4000,
    category: 'shortThrow'
  },
  {
    id: 'dangbei-x3',
    name: 'X3 Pro',
    brand: 'Dangbei 当贝',
    throwRatio: 0.87,
    zoomType: 'fixed',
    offset: 1.0,
    maxKeystoneAngle: 45,
    nativeResolution: { width: 1920, height: 1080 },
    brightness: 3200,
    category: 'shortThrow'
  },
  {
    id: 'optoma-uhd35st',
    name: 'UHD35ST',
    brand: 'Optoma 奥图码',
    throwRatio: 0.5,
    zoomType: 'fixed',
    offset: 1.0,
    maxKeystoneAngle: 40,
    nativeResolution: { width: 3840, height: 2160 },
    brightness: 3600,
    category: 'shortThrow'
  },
  {
    id: 'viewsonic-px701',
    name: 'PX701-4K',
    brand: 'ViewSonic 优派',
    throwRatio: 1.13,
    throwRatioMin: 1.13,
    throwRatioMax: 1.47,
    zoomType: 'optical',
    offset: 0.6,
    maxKeystoneAngle: 40,
    nativeResolution: { width: 3840, height: 2160 },
    brightness: 3200,
    category: 'standard'
  },
  {
    id: 'hisense-c1-pro',
    name: 'C1 Pro',
    brand: 'Hisense 海信',
    throwRatio: 0.22,
    zoomType: 'fixed',
    offset: 1.0,
    maxKeystoneAngle: 40,
    nativeResolution: { width: 3840, height: 2160 },
    brightness: 2800,
    category: 'ultraShortThrow'
  },
  {
    id: 'fengmi-t1',
    name: 'T1 激光电视',
    brand: 'Fengmi 峰米',
    throwRatio: 0.25,
    zoomType: 'fixed',
    offset: 1.0,
    maxKeystoneAngle: 45,
    nativeResolution: { width: 1920, height: 1080 },
    brightness: 2400,
    category: 'ultraShortThrow'
  },
  {
    id: 'xiaomi-mijia-2pro',
    name: '米家2 Pro',
    brand: 'Xiaomi 小米',
    throwRatio: 1.4,
    zoomType: 'fixed',
    offset: 1.0,
    maxKeystoneAngle: 45,
    nativeResolution: { width: 1920, height: 1080 },
    brightness: 1300,
    category: 'standard'
  }
]

export function getProjectorById(id: string): Projector | undefined {
  return projectors.find(p => p.id === id)
}

export function getProjectorsByCategory(category: Projector['category']): Projector[] {
  return projectors.filter(p => p.category === category)
}

export const categoryLabels: Record<Projector['category'], string> = {
  standard: '标准焦投影仪',
  shortThrow: '短焦投影仪',
  ultraShortThrow: '超短焦激光电视'
}
