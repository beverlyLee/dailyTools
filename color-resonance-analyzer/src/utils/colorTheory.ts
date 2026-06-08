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
  
  if (s < 0.08) {
    if (v > 0.95) return '白色'
    if (v > 0.85) return '米白'
    if (v > 0.7) return '浅灰'
    if (v > 0.5) return '中灰'
    if (v > 0.3) return '深灰'
    return '炭黑'
  }
  
  if (v < 0.2) return '黑色'
  
  return getDetailedColorName(h, s, v)
}

function getDetailedColorName(h: number, s: number, v: number): string {
  if (h < 15 || h >= 345) {
    if (v < 0.3) return '酒红'
    if (v < 0.5) return '深红'
    if (s < 0.25) return '灰粉'
    if (v > 0.88 && s < 0.5) return '樱花粉'
    if (v > 0.85) return '蜜桃粉'
    if (s < 0.5) return '豆沙'
    return '红色'
  }
  if (h < 35) {
    if (v < 0.35) return '焦糖'
    if (s < 0.25) return '驼色'
    if (v > 0.85 && s < 0.4) return '杏色'
    if (v > 0.8) return '南瓜橙'
    if (s < 0.5) return '暖棕'
    return '橙色'
  }
  if (h < 55) {
    if (s < 0.2) return '奶油白'
    if (v < 0.4) return '土黄'
    if (v > 0.9 && s < 0.3) return '米黄'
    if (v > 0.85) return '鹅黄'
    if (s > 0.7) return '金黄'
    return '姜黄'
  }
  if (h < 75) {
    if (s < 0.2) return '象牙白'
    if (v > 0.85) return '柠檬黄'
    if (s < 0.4) return '浅黄'
    return '黄色'
  }
  if (h < 100) {
    if (v < 0.3) return '墨绿'
    if (v < 0.5) return '深绿'
    if (s < 0.25) return '灰绿'
    if (v > 0.85 && s < 0.4) return '薄荷绿'
    if (v > 0.8) return '嫩绿'
    if (s < 0.5) return '抹茶绿'
    return '草绿'
  }
  if (h < 145) {
    if (v < 0.35) return '翡翠绿'
    if (s < 0.3) return '薄荷绿'
    if (v > 0.85) return '翠绿'
    return '绿色'
  }
  if (h < 170) {
    if (s < 0.25) return '薄荷青'
    if (v < 0.35) return '深青'
    if (v > 0.85) return '水青绿'
    return '青色'
  }
  if (h < 200) {
    if (v < 0.35) return '藏青'
    if (s < 0.3) return '雾霾蓝'
    if (v > 0.85) return '天空蓝'
    return '湖蓝'
  }
  if (h < 225) {
    if (v < 0.3) return '藏蓝'
    if (s < 0.25) return '灰蓝'
    if (v > 0.85) return '天蓝'
    return '宝蓝'
  }
  if (h < 250) {
    if (v < 0.3) return '深蓝'
    if (s < 0.3) return '灰蓝'
    if (v > 0.85) return '淡蓝'
    return '蓝色'
  }
  if (h < 275) {
    if (v < 0.35) return '深紫'
    if (s < 0.3) return '灰紫'
    if (v > 0.85) return '薰衣草'
    if (s < 0.5) return '淡紫'
    return '紫色'
  }
  if (h < 295) {
    if (v < 0.35) return '深紫'
    if (s < 0.35) return '藕荷'
    if (v > 0.85) return '丁香紫'
    return '蓝紫'
  }
  if (h < 320) {
    if (s < 0.3) return '灰粉'
    if (v > 0.85) return '樱花粉'
    if (s < 0.5) return '豆沙粉'
    return '品红'
  }
  if (h < 345) {
    if (v < 0.35) return '深玫红'
    if (s < 0.35) return '灰玫红'
    if (v > 0.85) return '玫瑰粉'
    return '玫红'
  }
  return '彩色'
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

function isWarmTone(h: number): boolean {
  return h < 60 || h >= 330
}

function getToneLabel(h: number): string {
  if (h < 30 || h >= 345) return '暖红'
  if (h < 60) return '暖黄'
  if (h < 90) return '暖绿'
  if (h < 180) return '冷绿'
  if (h < 210) return '冷青'
  if (h < 260) return '冷蓝'
  if (h < 290) return '冷紫'
  if (h < 330) return '暖紫'
  return '暖红'
}

export function generateComplementaryScheme(baseHex: string): ColorScheme {
  const base = createColorInfo(baseHex)
  const baseColor = chroma(baseHex)
  const [h, s, v] = baseColor.hsv()
  
  const compH = (h + 180) % 360
  
  const primaryHex = chroma(compH, s, v, 'hsv').hex()
  const primary = createColorInfo(primaryHex)
  
  const lightCompHex = chroma(compH, Math.max(s * 0.6, 0.15), Math.min(v * 1.2, 1), 'hsv').hex()
  const lightComp = createColorInfo(lightCompHex)
  
  const darkBaseHex = chroma(h, s, v * 0.7, 'hsv').hex()
  const darkBase = createColorInfo(darkBaseHex)
  
  const accentHex = chroma(compH, Math.min(s * 1.2, 1), v * 0.85, 'hsv').hex()
  const accent = createColorInfo(accentHex)
  
  const compColorName = getColorName(primaryHex)
  const baseColorName = getColorName(baseHex)
  
  const warmBase = isWarmTone(h)
  const warmComp = isWarmTone(compH)
  let styleDesc = ''
  if (warmBase && !warmComp) {
    styleDesc = '冷暖碰撞'
  } else if (!warmBase && warmComp) {
    styleDesc = '冷暖碰撞'
  } else {
    styleDesc = '强烈对比'
  }
  
  return {
    id: 'complementary',
    name: `${compColorName}撞色`,
    type: 'complementary',
    description: `${baseColorName}搭配${compColorName}互补色，${styleDesc}，活力十足`,
    colors: [base, primary, lightComp, darkBase, accent],
    baseColor: base,
  }
}

export function generateAnalogousScheme(baseHex: string): ColorScheme {
  const base = createColorInfo(baseHex)
  const baseColor = chroma(baseHex)
  const [h, s, v] = baseColor.hsv()
  
  const h1 = (h - 30 + 360) % 360
  const h2 = (h + 30) % 360
  
  const leftHex = chroma(h1, s, v, 'hsv').hex()
  const leftAnalog = createColorInfo(leftHex)
  
  const rightHex = chroma(h2, s, v, 'hsv').hex()
  const rightAnalog = createColorInfo(rightHex)
  
  const lightLeftHex = chroma(h1, s * 0.7, Math.min(v * 1.15, 1), 'hsv').hex()
  const lightLeft = createColorInfo(lightLeftHex)
  
  const darkRightHex = chroma(h2, s, v * 0.75, 'hsv').hex()
  const darkRight = createColorInfo(darkRightHex)
  
  const leftName = getColorName(leftHex)
  const rightName = getColorName(rightHex)
  const baseName = getColorName(baseHex)
  
  const toneLabel = getToneLabel(h)
  const schemeName = `${toneLabel}搭配`
  
  return {
    id: 'analogous',
    name: schemeName,
    type: 'analogous',
    description: `${baseName}为中心，融合${leftName}与${rightName}邻近色调，柔和过渡富有层次感`,
    colors: [leftAnalog, base, rightAnalog, lightLeft, darkRight],
    baseColor: base,
  }
}

export function generateMonochromaticScheme(baseHex: string): ColorScheme {
  const base = createColorInfo(baseHex)
  const baseColor = chroma(baseHex)
  const [h, s, v] = baseColor.hsv()
  
  const veryLightHex = chroma(h, Math.max(s * 0.3, 0.08), Math.min(v * 1.3, 0.95), 'hsv').hex()
  const veryLight = createColorInfo(veryLightHex)
  
  const lightHex = chroma(h, s * 0.6, Math.min(v * 1.15, 0.9), 'hsv').hex()
  const light = createColorInfo(lightHex)
  
  const darkHex = chroma(h, Math.min(s * 1.1, 1), v * 0.65, 'hsv').hex()
  const dark = createColorInfo(darkHex)
  
  const veryDarkHex = chroma(h, Math.min(s * 0.9, 1), v * 0.4, 'hsv').hex()
  const veryDark = createColorInfo(veryDarkHex)
  
  const baseName = getColorName(baseHex)
  
  return {
    id: 'monochromatic',
    name: `${baseName}同色系`,
    type: 'monochromatic',
    description: `${baseName}色系的明暗层次变化，统一和谐，高雅有质感`,
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
