import chroma from 'chroma-js'

export interface ColorInfo {
  hex: string
  rgb: { r: number; g: number; b: number }
  hsv: { h: number; s: number; v: number }
  hsl: { h: number; s: number; l: number }
  name: string
}

export interface ColorScheme {
  id: string
  name: string
  type: 'complementary' | 'analogous' | 'monochromatic'
  description: string
  colors: ColorInfo[]
  baseColor: ColorInfo
}

function createColorInfo(hex: string, name: string = ''): ColorInfo {
  const color = chroma(hex)
  const [h, s, v] = color.hsv()
  const [hl, sl, ll] = color.hsl()
  const [r, g, b] = color.rgb()
  
  return {
    hex: color.hex(),
    rgb: { r: Math.round(r), g: Math.round(g), b: Math.round(b) },
    hsv: { h: isNaN(h) ? 0 : h, s, v },
    hsl: { h: isNaN(hl) ? 0 : hl, s: sl, l: ll },
    name: name || getColorName(hex),
  }
}

function getColorName(hex: string): string {
  const color = chroma(hex)
  const [h, s, v] = color.hsv()
  
  if (s < 0.1) {
    if (v > 0.9) return '白色'
    if (v > 0.7) return '浅灰'
    if (v > 0.4) return '中灰'
    return '深灰'
  }
  
  const hueName = getHueName(h)
  
  if (v < 0.3) return `深${hueName}`
  if (v > 0.85 && s < 0.4) return `浅${hueName}`
  if (s < 0.4) return `灰${hueName}`
  
  return hueName
}

function getHueName(h: number): string {
  if (h < 15 || h >= 345) return '红色'
  if (h < 45) return '橙色'
  if (h < 70) return '黄色'
  if (h < 160) return '绿色'
  if (h < 200) return '青色'
  if (h < 255) return '蓝色'
  if (h < 290) return '紫色'
  return '品红'
}

export function generateComplementaryScheme(baseHex: string): ColorScheme {
  const base = createColorInfo(baseHex, '主色调')
  const baseColor = chroma(baseHex)
  const [h, s, v] = baseColor.hsv()
  
  const compH = (h + 180) % 360
  
  const primary = createColorInfo(chroma(compH, s, v, 'hsv').hex(), '互补色')
  
  const lightComp = createColorInfo(
    chroma(compH, Math.max(s * 0.6, 0.15), Math.min(v * 1.2, 1), 'hsv').hex(),
    '浅互补色'
  )
  
  const darkBase = createColorInfo(
    chroma(h, s, v * 0.7, 'hsv').hex(),
    '深主色'
  )
  
  const accent = createColorInfo(
    chroma(compH, Math.min(s * 1.2, 1), v * 0.85, 'hsv').hex(),
    '强调色'
  )
  
  return {
    id: 'complementary',
    name: '互补色方案',
    type: 'complementary',
    description: '使用色轮上相对的颜色，创造强烈的视觉对比和活力',
    colors: [base, primary, lightComp, darkBase, accent],
    baseColor: base,
  }
}

export function generateAnalogousScheme(baseHex: string): ColorScheme {
  const base = createColorInfo(baseHex, '主色调')
  const baseColor = chroma(baseHex)
  const [h, s, v] = baseColor.hsv()
  
  const h1 = (h - 30 + 360) % 360
  const h2 = (h + 30) % 360
  
  const leftAnalog = createColorInfo(
    chroma(h1, s, v, 'hsv').hex(),
    '左邻近色'
  )
  
  const rightAnalog = createColorInfo(
    chroma(h2, s, v, 'hsv').hex(),
    '右邻近色'
  )
  
  const lightLeft = createColorInfo(
    chroma(h1, s * 0.7, Math.min(v * 1.15, 1), 'hsv').hex(),
    '浅左邻近'
  )
  
  const darkRight = createColorInfo(
    chroma(h2, s, v * 0.75, 'hsv').hex(),
    '深右邻近'
  )
  
  return {
    id: 'analogous',
    name: '邻近色方案',
    type: 'analogous',
    description: '使用色轮上相邻的颜色，创造和谐、柔和的视觉效果',
    colors: [leftAnalog, base, rightAnalog, lightLeft, darkRight],
    baseColor: base,
  }
}

export function generateMonochromaticScheme(baseHex: string): ColorScheme {
  const base = createColorInfo(baseHex, '主色调')
  const baseColor = chroma(baseHex)
  const [h, s, v] = baseColor.hsv()
  
  const veryLight = createColorInfo(
    chroma(h, Math.max(s * 0.3, 0.08), Math.min(v * 1.3, 0.95), 'hsv').hex(),
    '极浅色'
  )
  
  const light = createColorInfo(
    chroma(h, s * 0.6, Math.min(v * 1.15, 0.9), 'hsv').hex(),
    '浅色'
  )
  
  const dark = createColorInfo(
    chroma(h, Math.min(s * 1.1, 1), v * 0.65, 'hsv').hex(),
    '深色'
  )
  
  const veryDark = createColorInfo(
    chroma(h, Math.min(s * 0.9, 1), v * 0.4, 'hsv').hex(),
    '极深色'
  )
  
  return {
    id: 'monochromatic',
    name: '同色系方案',
    type: 'monochromatic',
    description: '使用同一色相的不同明度和饱和度，创造统一、高雅的氛围',
    colors: [veryLight, light, base, dark, veryDark],
    baseColor: base,
  }
}

export function generateAllSchemes(baseHex: string): ColorScheme[] {
  return [
    generateMonochromaticScheme(baseHex),
    generateAnalogousScheme(baseHex),
    generateComplementaryScheme(baseHex),
  ]
}

export { createColorInfo }
