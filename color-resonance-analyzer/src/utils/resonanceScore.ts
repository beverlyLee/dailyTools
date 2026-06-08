import chroma from 'chroma-js'
import type { ColorInfo, ColorScheme } from './colorTheory'

export interface ResonanceScore {
  overall: number
  saturationDiff: number
  valueDiff: number
  hueDiff: number
  contrastRatio: number
  label: '和谐' | '平庸' | '冲突'
  description: string
  details: string[]
}

function normalizeHueDiff(h1: number, h2: number): number {
  let diff = Math.abs(h1 - h2)
  if (diff > 180) diff = 360 - diff
  return diff
}

export function calculateResonance(
  baseColor: ColorInfo,
  accentColor: ColorInfo
): ResonanceScore {
  const base = chroma(baseColor.hex)
  const accent = chroma(accentColor.hex)
  
  const [baseH, baseS, baseV] = base.hsv()
  const [accentH, accentS, accentV] = accent.hsv()
  
  const hueDiff = normalizeHueDiff(baseH, accentH)
  const saturationDiff = Math.abs(baseS - accentS)
  const valueDiff = Math.abs(baseV - accentV)
  
  const contrastRatio = chroma.contrast(base, accent)
  
  const hueHarmony = calculateHueHarmony(hueDiff)
  const saturationHarmony = calculateSaturationHarmony(saturationDiff)
  const valueHarmony = calculateValueHarmony(valueDiff)
  
  const overall = Math.round(
    hueHarmony * 0.4 + saturationHarmony * 0.25 + valueHarmony * 0.35
  )
  
  const { label, description, details } = generateScoreDescription(
    overall,
    hueDiff,
    saturationDiff,
    valueDiff,
    contrastRatio
  )
  
  return {
    overall,
    saturationDiff: Math.round(saturationDiff * 100),
    valueDiff: Math.round(valueDiff * 100),
    hueDiff: Math.round(hueDiff),
    contrastRatio: Math.round(contrastRatio * 100) / 100,
    label,
    description,
    details,
  }
}

function calculateHueHarmony(hueDiff: number): number {
  if (hueDiff <= 15) return 95
  if (hueDiff <= 30) return 90
  if (hueDiff <= 45) return 80
  if (hueDiff <= 60) return 70
  if (hueDiff <= 90) return 55
  if (hueDiff <= 120) return 45
  if (hueDiff <= 150) return 50
  if (hueDiff <= 170) return 65
  if (hueDiff <= 180) return 75
  return 70
}

function calculateSaturationHarmony(satDiff: number): number {
  if (satDiff <= 0.1) return 95
  if (satDiff <= 0.2) return 85
  if (satDiff <= 0.35) return 75
  if (satDiff <= 0.5) return 60
  if (satDiff <= 0.65) return 50
  return 40
}

function calculateValueHarmony(valDiff: number): number {
  if (valDiff <= 0.1) return 80
  if (valDiff <= 0.2) return 90
  if (valDiff <= 0.35) return 95
  if (valDiff <= 0.5) return 85
  if (valDiff <= 0.65) return 70
  if (valDiff <= 0.8) return 55
  return 45
}

function generateScoreDescription(
  overall: number,
  hueDiff: number,
  satDiff: number,
  valDiff: number,
  contrast: number
): { label: '和谐' | '平庸' | '冲突'; description: string; details: string[] } {
  const details: string[] = []
  
  if (hueDiff <= 30) {
    details.push('色相接近，属于同色系搭配，视觉统一')
  } else if (hueDiff <= 90) {
    details.push('色相差适中，属于邻近色搭配，柔和协调')
  } else if (hueDiff <= 150) {
    details.push('色相差较大，对比感较强')
  } else {
    details.push('色相接近互补色，对比强烈，视觉冲击力大')
  }
  
  if (satDiff <= 0.2) {
    details.push('饱和度相近，质感统一')
  } else if (satDiff <= 0.4) {
    details.push('饱和度有一定差异，层次分明')
  } else {
    details.push('饱和度差异大，视觉张力强')
  }
  
  if (valDiff <= 0.2) {
    details.push('明度接近，需注意区分度')
  } else if (valDiff <= 0.4) {
    details.push('明度差异适中，舒适耐看')
  } else {
    details.push('明度对比强烈，立体感强')
  }
  
  if (contrast >= 4.5) {
    details.push(`对比度 ${contrast.toFixed(2)}:1，符合 WCAG AA 标准`)
  } else if (contrast >= 3) {
    details.push(`对比度 ${contrast.toFixed(2)}:1，大文本可读性良好`)
  } else {
    details.push(`对比度 ${contrast.toFixed(2)}:1，可读性稍弱`)
  }
  
  let label: '和谐' | '平庸' | '冲突'
  let description: string
  
  if (overall >= 80) {
    label = '和谐'
    description = '色彩搭配和谐舒适，视觉感受愉悦，适合长期共处'
  } else if (overall >= 60) {
    label = '平庸'
    description = '色彩搭配中规中矩，缺乏亮点但也不会出错'
  } else {
    label = '冲突'
    description = '色彩对比过于强烈或搭配不协调，容易产生视觉疲劳'
  }
  
  return { label, description, details }
}

export function calculateSchemeResonance(
  baseColor: ColorInfo,
  scheme: ColorScheme
): ResonanceScore {
  let totalScore = 0
  let count = 0
  
  for (const color of scheme.colors) {
    if (color.hex.toLowerCase() === baseColor.hex.toLowerCase()) continue
    const score = calculateResonance(baseColor, color)
    totalScore += score.overall
    count++
  }
  
  const avgScore = count > 0 ? totalScore / count : 0
  
  let label: '和谐' | '平庸' | '冲突'
  let description: string
  
  if (avgScore >= 80) {
    label = '和谐'
    description = '整体方案和谐统一，各色彩搭配舒适'
  } else if (avgScore >= 60) {
    label = '平庸'
    description = '整体方案中规中矩，部分搭配可优化'
  } else {
    label = '冲突'
    description = '整体方案冲突感较强，建议调整'
  }
  
  return {
    overall: Math.round(avgScore),
    saturationDiff: 0,
    valueDiff: 0,
    hueDiff: 0,
    contrastRatio: 0,
    label,
    description,
    details: [`方案平均共振度: ${Math.round(avgScore)} 分`],
  }
}
