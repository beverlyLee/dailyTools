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
  
  if (v < 0.12) return '炭黑'
  
  if (s < 0.08) {
    if (v > 0.95) return '纯白'
    if (v > 0.88) return '米白'
    if (v > 0.78) return '奶白'
    if (v > 0.65) return '浅灰'
    if (v > 0.45) return '中灰'
    if (v > 0.25) return '深灰'
    return '炭黑'
  }
  
  if (v > 0.88 && s < 0.25) {
    return getLightColorName(h)
  }
  
  return getDetailedColorName(h, s, v)
}

function getLightColorName(h: number): string {
  if (h < 15 || h >= 345) return '淡粉'
  if (h < 35) return '杏色'
  if (h < 55) return '米黄'
  if (h < 75) return '鹅黄'
  if (h < 100) return '嫩绿'
  if (h < 145) return '薄荷绿'
  if (h < 180) return '冰青'
  if (h < 200) return '水蓝'
  if (h < 225) return '天蓝'
  if (h < 255) return '淡蓝'
  if (h < 275) return '淡紫'
  if (h < 295) return '藕荷'
  if (h < 320) return '粉紫'
  if (h < 345) return '粉色'
  return '淡彩'
}

function getDetailedColorName(h: number, s: number, v: number): string {
  if (h < 15 || h >= 345) {
    if (v < 0.35) return '酒红'
    if (v < 0.55) return '深红'
    if (s < 0.4) return '灰红'
    if (v > 0.85 && s > 0.6) return '正红'
    if (v > 0.8) return '粉红'
    return '红色'
  }
  if (h < 35) {
    if (v < 0.35) return '棕褐'
    if (v < 0.55) return '深棕'
    if (s < 0.35) return '驼色'
    if (s < 0.5 && v > 0.6) return '卡其'
    if (v > 0.8) return '橘色'
    return '橙色'
  }
  if (h < 55) {
    if (s < 0.25) return '米黄'
    if (v < 0.45) return '土黄'
    if (v > 0.85 && s > 0.7) return '明黄'
    if (s > 0.6) return '姜黄'
    return '暖黄'
  }
  if (h < 75) {
    if (s < 0.3) return '浅黄'
    if (v > 0.85) return '柠檬黄'
    return '黄色'
  }
  if (h < 100) {
    if (v < 0.35) return '墨绿'
    if (v < 0.55) return '深绿'
    if (s < 0.35) return '灰绿'
    if (v > 0.85 && s > 0.6) return '翠绿'
    if (s > 0.5) return '草绿'
    return '橄榄绿'
  }
  if (h < 145) {
    if (v < 0.4) return '深青绿'
    if (s < 0.4) return '薄荷绿'
    if (v > 0.85) return '青绿'
    return '绿色'
  }
  if (h < 180) {
    if (s < 0.3) return '浅青'
    if (v < 0.4) return '深青'
    if (v > 0.8) return '青色'
    return '湖青'
  }
  if (h < 200) {
    if (v < 0.4) return '深湖蓝'
    if (s < 0.35) return '灰青'
    if (v > 0.8) return '水蓝'
    return '湖蓝'
  }
  if (h < 225) {
    if (v < 0.35) return '藏青'
    if (s < 0.3) return '灰蓝'
    if (v > 0.8) return '宝蓝'
    return '钴蓝'
  }
  if (h < 255) {
    if (v < 0.35) return '深蓝'
    if (s < 0.4) return '灰蓝'
    if (v > 0.8) return '浅蓝'
    return '蓝色'
  }
  if (h < 275) {
    if (v < 0.4) return '深紫'
    if (s < 0.4) return '灰紫'
    if (v > 0.85) return '淡紫'
    return '紫色'
  }
  if (h < 295) {
    if (v < 0.4) return '深紫'
    if (s < 0.35) return '藕荷'
    return '蓝紫'
  }
  if (h < 320) {
    if (s < 0.4) return '灰粉'
    if (v > 0.85) return '粉色'
    return '品红'
  }
  if (h < 345) {
    if (v < 0.4) return '深玫红'
    if (s < 0.4) return '灰玫红'
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

function isWarmHue(h: number): boolean {
  return h < 70 || h >= 340
}

function getSchemeStyleName(h: number): string {
  if (h < 20 || h >= 340) return '暖红'
  if (h < 50) return '暖橙'
  if (h < 75) return '暖黄'
  if (h < 145) return '清新绿'
  if (h < 190) return '清凉青'
  if (h < 245) return '冷调蓝'
  if (h < 285) return '梦幻紫'
  if (h < 325) return '浪漫粉'
  return '暖玫红'
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
  
  return {
    id: 'complementary',
    name: `${compColorName}撞色`,
    type: 'complementary',
    description: `${baseColorName}搭配${compColorName}互补色，撞色搭配活力十足`,
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
  
  const baseName = getColorName(baseHex)
  const styleName = getSchemeStyleName(h)
  
  const schemeName = `${styleName}谐调`
  
  return {
    id: 'analogous',
    name: schemeName,
    type: 'analogous',
    description: `${baseName}为主调，邻近色柔和过渡，层次丰富不单调`,
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
    name: `${baseName}同调`,
    type: 'monochromatic',
    description: `${baseName}色系明暗渐变，统一和谐，高级有质感`,
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
