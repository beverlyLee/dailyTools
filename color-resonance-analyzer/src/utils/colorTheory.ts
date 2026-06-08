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
  
  if (v < 0.1) return '炭黑'
  
  if (s < 0.08) {
    if (v > 0.95) return '纯白'
    if (v > 0.88) return '米白'
    if (v > 0.78) return '奶白'
    if (v > 0.65) return '浅灰'
    if (v > 0.45) return '中灰'
    if (v > 0.25) return '深灰'
    return '炭黑'
  }
  
  if (v > 0.82 && s < 0.3) {
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

function getValueModifier(v: number): string {
  if (v < 0.25) return '深墨'
  if (v < 0.4) return '深'
  if (v < 0.55) return '暗'
  if (v < 0.7) return '中'
  if (v < 0.85) return '浅'
  return '明亮'
}

function getDetailedColorName(h: number, s: number, v: number): string {
  if (h < 15 || h >= 345) {
    if (v < 0.25) return '酒红'
    if (v < 0.4) return '深红'
    if (v < 0.55) return '暗红'
    if (s < 0.35) return '灰红'
    if (v > 0.85 && s > 0.6) return '正红'
    if (v > 0.75 && s < 0.5) return '豆沙红'
    if (v > 0.8) return '粉红'
    return '红色'
  }
  if (h < 35) {
    if (v < 0.25) return '深褐'
    if (v < 0.45) return '深棕'
    if (v < 0.6 && s > 0.5) return '棕色'
    if (s < 0.25) return '驼色'
    if (s < 0.4 && v > 0.6) return '卡其'
    if (v > 0.75 && s > 0.55) return '橘色'
    if (v < 0.65) return '棕橙'
    return '橙色'
  }
  if (h < 55) {
    if (s < 0.2) return '米黄'
    if (v < 0.4) return '土黄'
    if (v > 0.85 && s > 0.65) return '明黄'
    if (s > 0.55) return '姜黄'
    if (v > 0.7 && s < 0.4) return '奶黄'
    return '暖黄'
  }
  if (h < 75) {
    if (s < 0.25) return '浅黄'
    if (v > 0.85) return '柠檬黄'
    if (v < 0.5) return '暗黄'
    return '黄色'
  }
  if (h < 100) {
    if (v < 0.3) return '墨绿'
    if (v < 0.5) return '深绿'
    if (s < 0.3) return '灰绿'
    if (v > 0.85 && s > 0.55) return '翠绿'
    if (s > 0.45) return '草绿'
    if (v > 0.7) return '浅绿'
    return '橄榄绿'
  }
  if (h < 145) {
    if (v < 0.35) return '深青绿'
    if (s < 0.35) return '薄荷绿'
    if (v > 0.85) return '青绿'
    if (v > 0.7 && s < 0.45) return '豆绿'
    return '绿色'
  }
  if (h < 180) {
    if (s < 0.25) return '浅青'
    if (v < 0.35) return '深青'
    if (v > 0.8) return '青色'
    if (v > 0.6 && s < 0.4) return '豆青'
    return '湖青'
  }
  if (h < 200) {
    if (v < 0.35) return '深湖蓝'
    if (s < 0.3) return '灰青'
    if (v > 0.8) return '水蓝'
    return '湖蓝'
  }
  if (h < 225) {
    if (v < 0.3) return '藏青'
    if (s < 0.28) return '灰蓝'
    if (v > 0.8) return '宝蓝'
    if (v > 0.6 && s < 0.45) return '灰蓝色'
    return '钴蓝'
  }
  if (h < 255) {
    if (v < 0.3) return '深蓝'
    if (s < 0.35) return '灰蓝'
    if (v > 0.8) return '浅蓝'
    if (v > 0.65 && s < 0.5) return '天蓝色'
    return '蓝色'
  }
  if (h < 275) {
    if (v < 0.35) return '深紫'
    if (s < 0.35) return '灰紫'
    if (v > 0.85) return '淡紫'
    if (v > 0.65 && s < 0.5) return '薰衣草紫'
    return '紫色'
  }
  if (h < 295) {
    if (v < 0.35) return '深紫蓝'
    if (s < 0.3) return '藕荷'
    if (v > 0.75) return '蓝紫'
    return '蓝紫色'
  }
  if (h < 320) {
    if (s < 0.35) return '灰粉'
    if (v > 0.85) return '粉色'
    if (v < 0.5) return '深玫红'
    return '品红'
  }
  if (h < 345) {
    if (v < 0.35) return '深玫红'
    if (s < 0.35) return '灰玫红'
    if (v > 0.75) return '玫红'
    return '玫瑰红'
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

function createColorInfoWithName(hex: string, customName: string): ColorInfo {
  const info = createColorInfo(hex)
  return { ...info, name: customName }
}

export function generateComplementaryScheme(baseHex: string): ColorScheme {
  const base = createColorInfo(baseHex)
  const baseColor = chroma(baseHex)
  const [h, s, v] = baseColor.hsv()
  
  const compH = (h + 180) % 360
  
  const primaryHex = chroma(compH, s, v, 'hsv').hex()
  const primaryName = getColorName(primaryHex)
  const primary = createColorInfoWithName(primaryHex, primaryName)
  
  const lightCompHex = chroma(compH, Math.max(s * 0.55, 0.18), Math.min(v * 1.25, 0.95), 'hsv').hex()
  const lightCompName = getColorName(lightCompHex)
  const lightComp = createColorInfoWithName(lightCompHex, `浅${primaryName}`)
  
  const darkBaseHex = chroma(h, Math.min(s * 1.1, 1), v * 0.7, 'hsv').hex()
  const darkBaseName = getColorName(darkBaseHex)
  const darkBase = createColorInfoWithName(darkBaseHex, `深${base.name}`)
  
  const accentHex = chroma(compH, Math.min(s * 1.25, 1), v * 0.82, 'hsv').hex()
  const accentName = getColorName(accentHex)
  const accent = createColorInfoWithName(accentHex, `艳${primaryName}`)
  
  const baseColorName = getColorName(baseHex)
  
  return {
    id: 'complementary',
    name: `${primaryName}撞色`,
    type: 'complementary',
    description: `${baseColorName}搭配${primaryName}互补色，撞色搭配活力十足`,
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
  const leftName = getColorName(leftHex)
  const leftAnalog = createColorInfoWithName(leftHex, leftName)
  
  const rightHex = chroma(h2, s, v, 'hsv').hex()
  const rightName = getColorName(rightHex)
  const rightAnalog = createColorInfoWithName(rightHex, rightName)
  
  const lightLeftHex = chroma(h1, s * 0.65, Math.min(v * 1.2, 0.93), 'hsv').hex()
  const lightLeftName = getColorName(lightLeftHex)
  const lightLeft = createColorInfoWithName(lightLeftHex, `浅${leftName}`)
  
  const darkRightHex = chroma(h2, Math.min(s * 1.1, 1), v * 0.72, 'hsv').hex()
  const darkRightName = getColorName(darkRightHex)
  const darkRight = createColorInfoWithName(darkRightHex, `深${rightName}`)
  
  const baseName = getColorName(baseHex)
  const styleName = getSchemeStyleName(h)
  
  const schemeName = `${styleName}谐调`
  
  return {
    id: 'analogous',
    name: schemeName,
    type: 'analogous',
    description: `${baseName}为主调，${leftName}与${rightName}邻近色柔和过渡，层次丰富`,
    colors: [leftAnalog, base, rightAnalog, lightLeft, darkRight],
    baseColor: base,
  }
}

export function generateMonochromaticScheme(baseHex: string): ColorScheme {
  const base = createColorInfo(baseHex)
  const baseColor = chroma(baseHex)
  const [h, s, v] = baseColor.hsv()
  
  const veryLightHex = chroma(h, Math.max(s * 0.28, 0.08), Math.min(v * 1.35, 0.95), 'hsv').hex()
  const veryLightName = getColorName(veryLightHex)
  const veryLight = createColorInfoWithName(veryLightHex, `亮${base.name}`)
  
  const lightHex = chroma(h, s * 0.55, Math.min(v * 1.2, 0.88), 'hsv').hex()
  const lightName = getColorName(lightHex)
  const light = createColorInfoWithName(lightHex, `浅${base.name}`)
  
  const darkHex = chroma(h, Math.min(s * 1.15, 1), v * 0.68, 'hsv').hex()
  const darkName = getColorName(darkHex)
  const dark = createColorInfoWithName(darkHex, `深${base.name}`)
  
  const veryDarkHex = chroma(h, Math.min(s * 0.95, 1), v * 0.42, 'hsv').hex()
  const veryDarkName = getColorName(veryDarkHex)
  const veryDark = createColorInfoWithName(veryDarkHex, `暗${base.name}`)
  
  return {
    id: 'monochromatic',
    name: `${base.name}同调`,
    type: 'monochromatic',
    description: `${base.name}色系五档明暗渐变，统一和谐，高级有质感`,
    colors: [veryLight, light, base, dark, veryDark],
    baseColor: base,
  }
}

export function getSchemeAccentColor(scheme: ColorScheme): ColorInfo {
  switch (scheme.type) {
    case 'complementary':
      return scheme.colors[1] || scheme.baseColor
    case 'analogous':
      return scheme.colors[2] || scheme.baseColor
    case 'monochromatic':
      return scheme.colors[1] || scheme.baseColor
    default:
      return scheme.baseColor
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
