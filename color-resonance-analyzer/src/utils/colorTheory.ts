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
  
  if (v > 0.82 && s > 0.03 && s < 0.35) {
    return getLightColorName(h, s, v)
  }
  
  if (s < 0.1) {
    if (v > 0.95) return '纯白'
    if (v > 0.88) return '米白'
    if (v > 0.78) return '奶白'
    if (v > 0.65) return '浅灰'
    if (v > 0.45) return '中灰'
    if (v > 0.25) return '深灰'
    return '炭黑'
  }
  
  return getDetailedColorName(h, s, v)
}

function getLightColorName(h: number, s: number, v: number): string {
  const prefix = s < 0.2 ? '浅' : ''
  
  if (h < 15 || h >= 345) return s > 0.25 ? '粉色' : '肉粉'
  if (h < 30) return s > 0.2 ? '杏色' : '米杏'
  if (h < 50) return s > 0.2 ? '鹅黄' : '米黄'
  if (h < 70) return '柠黄'
  if (h < 100) return s > 0.2 ? '嫩绿' : '薄荷'
  if (h < 145) return s > 0.2 ? '翠绿' : '薄荷绿'
  if (h < 175) return '冰青'
  if (h < 200) return '水蓝'
  if (h < 225) return s > 0.2 ? '天蓝' : '淡蓝'
  if (h < 255) return '灰蓝'
  if (h < 275) return '淡紫'
  if (h < 295) return '藕荷'
  if (h < 320) return '粉紫'
  if (h < 345) return s > 0.2 ? '粉色' : '灰粉'
  return '淡彩'
}

function getValueTier(v: number): string {
  if (v < 0.3) return '深'
  if (v < 0.5) return '暗'
  if (v < 0.7) return '中'
  if (v < 0.85) return '明'
  return '亮'
}

function getSaturationTier(s: number): string {
  if (s < 0.25) return '灰'
  if (s < 0.45) return '柔'
  if (s < 0.65) return '正'
  if (s < 0.85) return '浓'
  return '艳'
}

function getDetailedColorName(h: number, s: number, v: number): string {
  const satTier = getSaturationTier(s)
  const valTier = getValueTier(v)
  
  if (h < 15 || h >= 345) {
    if (v < 0.35 && s > 0.5) return '酒红'
    if (v < 0.3 && s < 0.4) return '深灰红'
    if (s < 0.3) return '灰红'
    if (v > 0.85 && s > 0.6) return '正红'
    if (v > 0.8 && s < 0.5) return '粉红'
    if (v > 0.6 && s > 0.5) return '红色'
    return `${valTier}红`
  }
  if (h < 35) {
    if (v < 0.4) return '深棕'
    if (s < 0.3 && v > 0.6) return '驼色'
    if (s < 0.45 && v > 0.5) return '棕黄'
    if (v > 0.8) return '橘色'
    if (s > 0.5 && v > 0.5) return '橙色'
    return `${valTier}橙`
  }
  if (h < 55) {
    if (v < 0.45 && s > 0.4) return '土黄'
    if (s < 0.25 && v > 0.6) return '米黄'
    if (v > 0.85 && s > 0.7) return '明黄'
    if (s > 0.6 && v > 0.5) return '姜黄'
    if (v > 0.6) return '暖黄'
    return `${valTier}黄`
  }
  if (h < 75) {
    if (s < 0.3 && v > 0.7) return '浅黄'
    if (v > 0.85 && s > 0.5) return '柠檬黄'
    if (s > 0.5 && v > 0.5) return '黄色'
    return `${valTier}黄`
  }
  if (h < 100) {
    if (v < 0.35 && s > 0.4) return '墨绿'
    if (s < 0.35 && v > 0.6) return '灰绿'
    if (v > 0.85 && s > 0.6) return '翠绿'
    if (s > 0.5 && v > 0.5) return '草绿'
    if (v > 0.5) return '橄榄绿'
    return `${valTier}绿`
  }
  if (h < 145) {
    if (v < 0.4 && s > 0.4) return '深青绿'
    if (s < 0.4 && v > 0.7) return '薄荷绿'
    if (v > 0.85 && s > 0.5) return '青绿'
    if (s > 0.4 && v > 0.5) return '绿色'
    return `${valTier}青绿`
  }
  if (h < 180) {
    if (v < 0.4 && s > 0.4) return '深青'
    if (s < 0.3 && v > 0.7) return '浅青'
    if (v > 0.8 && s > 0.5) return '青色'
    if (s > 0.4 && v > 0.5) return '湖青'
    return `${valTier}青`
  }
  if (h < 200) {
    if (v < 0.4 && s > 0.4) return '深湖蓝'
    if (s < 0.35 && v > 0.6) return '灰青'
    if (v > 0.8 && s > 0.5) return '水蓝'
    if (s > 0.4 && v > 0.5) return '湖蓝'
    return `${valTier}湖蓝`
  }
  if (h < 225) {
    if (v < 0.25 && s > 0.5) return '藏青'
    if (v < 0.4 && s > 0.55) return '深钴蓝'
    if (v < 0.4 && s > 0.35) return '暗钴蓝'
    if (v < 0.4 && s <= 0.35) return '灰钴蓝'
    if (s < 0.3 && v > 0.6) return '灰蓝'
    if (v > 0.8 && s > 0.6) return '宝蓝'
    if (s > 0.5 && v > 0.6) return '钴蓝'
    if (v > 0.6) return `${satTier}钴蓝`
    if (s > 0.45) return '中钴蓝'
    return `${satTier}钴蓝`
  }
  if (h < 255) {
    if (v < 0.35 && s > 0.5) return '深蓝'
    if (s < 0.4 && v > 0.6) return '灰蓝'
    if (v > 0.8 && s > 0.5) return '浅蓝'
    if (s > 0.4 && v > 0.5) return '蓝色'
    return `${valTier}蓝`
  }
  if (h < 275) {
    if (v < 0.4 && s > 0.4) return '深紫'
    if (s < 0.4 && v > 0.6) return '灰紫'
    if (v > 0.85 && s > 0.5) return '淡紫'
    if (s > 0.4 && v > 0.5) return '紫色'
    return `${valTier}紫`
  }
  if (h < 295) {
    if (v < 0.4 && s > 0.4) return '深紫蓝'
    if (s < 0.35 && v > 0.6) return '藕荷'
    if (s > 0.4 && v > 0.5) return '蓝紫'
    return `${valTier}蓝紫`
  }
  if (h < 320) {
    if (s < 0.4 && v > 0.6) return '灰粉'
    if (v > 0.85 && s > 0.5) return '粉色'
    if (s > 0.4 && v > 0.5) return '品红'
    return `${valTier}品红`
  }
  if (h < 345) {
    if (v < 0.4 && s > 0.4) return '深玫红'
    if (s < 0.4 && v > 0.6) return '灰玫红'
    if (s > 0.4 && v > 0.5) return '玫红'
    return `${valTier}玫红`
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
  const baseName = getColorName(baseHex)
  const base = createColorInfo(baseHex, `${baseName}(主色)`)
  const baseColor = chroma(baseHex)
  const [h, s, v] = baseColor.hsv()
  
  const compH = (h + 180) % 360
  
  const primaryHex = chroma(compH, s, v, 'hsv').hex()
  const primaryName = getColorName(primaryHex)
  const primary = createColorInfo(primaryHex, `撞色·${primaryName}`)
  
  const lightCompHex = chroma(compH, Math.max(s * 0.6, 0.15), Math.min(v * 1.2, 1), 'hsv').hex()
  const lightCompName = getColorName(lightCompHex)
  const lightComp = createColorInfo(lightCompHex, `浅${lightCompName}`)
  
  const darkBaseHex = chroma(h, s, v * 0.7, 'hsv').hex()
  const darkBaseName = getColorName(darkBaseHex)
  const darkBase = createColorInfo(darkBaseHex, `深${darkBaseName}`)
  
  const accentHex = chroma(compH, Math.min(s * 1.2, 1), v * 0.85, 'hsv').hex()
  const accentName = getColorName(accentHex)
  const accent = createColorInfo(accentHex, `艳${accentName}`)
  
  return {
    id: 'complementary',
    name: `${primaryName}撞色`,
    type: 'complementary',
    description: `${baseName}搭配${primaryName}互补色，撞色搭配活力十足`,
    colors: [base, primary, lightComp, darkBase, accent],
    baseColor: base,
  }
}

export function generateAnalogousScheme(baseHex: string): ColorScheme {
  const baseName = getColorName(baseHex)
  const base = createColorInfo(baseHex, `${baseName}(主色)`)
  const baseColor = chroma(baseHex)
  const [h, s, v] = baseColor.hsv()
  
  const h1 = (h - 30 + 360) % 360
  const h2 = (h + 30) % 360
  
  const leftHex = chroma(h1, s, v, 'hsv').hex()
  const leftName = getColorName(leftHex)
  const leftAnalog = createColorInfo(leftHex, `左邻·${leftName}`)
  
  const rightHex = chroma(h2, s, v, 'hsv').hex()
  const rightName = getColorName(rightHex)
  const rightAnalog = createColorInfo(rightHex, `右邻·${rightName}`)
  
  const lightLeftHex = chroma(h1, s * 0.7, Math.min(v * 1.15, 1), 'hsv').hex()
  const lightLeftName = getColorName(lightLeftHex)
  const lightLeft = createColorInfo(lightLeftHex, `浅${lightLeftName}`)
  
  const darkRightHex = chroma(h2, s, v * 0.75, 'hsv').hex()
  const darkRightName = getColorName(darkRightHex)
  const darkRight = createColorInfo(darkRightHex, `深${darkRightName}`)
  
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
  const baseName = getColorName(baseHex)
  const base = createColorInfo(baseHex, `${baseName}(主色)`)
  const baseColor = chroma(baseHex)
  const [h, s, v] = baseColor.hsv()
  
  const veryLightHex = chroma(h, Math.max(s * 0.3, 0.08), Math.min(v * 1.3, 0.95), 'hsv').hex()
  const veryLightName = getColorName(veryLightHex)
  const veryLight = createColorInfo(veryLightHex, `浅${veryLightName}`)
  
  const lightHex = chroma(h, s * 0.6, Math.min(v * 1.15, 0.9), 'hsv').hex()
  const lightName = getColorName(lightHex)
  const light = createColorInfo(lightHex, `亮${lightName}`)
  
  const darkHex = chroma(h, Math.min(s * 1.1, 1), v * 0.65, 'hsv').hex()
  const darkName = getColorName(darkHex)
  const dark = createColorInfo(darkHex, `深${darkName}`)
  
  const veryDarkHex = chroma(h, Math.min(s * 0.9, 1), v * 0.4, 'hsv').hex()
  const veryDarkName = getColorName(veryDarkHex)
  const veryDark = createColorInfo(veryDarkHex, `暗${veryDarkName}`)
  
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

export function getSchemeCurtainColor(scheme: ColorScheme): string {
  switch (scheme.type) {
    case 'complementary':
      return scheme.colors[1].hex
    case 'analogous':
      return scheme.colors[2].hex
    case 'monochromatic':
      return scheme.colors[1].hex
    default:
      return scheme.colors[1].hex
  }
}

export function getSchemePillowColors(scheme: ColorScheme, count: number): string[] {
  const accentColors = scheme.colors.filter(
    c => c.hex.toLowerCase() !== scheme.baseColor.hex.toLowerCase()
  )
  
  const result: string[] = []
  for (let i = 0; i < count; i++) {
    result.push(accentColors[i % accentColors.length].hex)
  }
  return result
}

export { createColorInfo }
