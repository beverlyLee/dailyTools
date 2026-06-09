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
  accentColor: ColorInfo
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
    if (v > 0.5) return '中灰'
    if (v > 0.35) return '深灰'
    if (v > 0.2) return '炭灰'
    return '炭黑'
  }
  
  if (v > 0.82 && s < 0.35) {
    return getLightColorName(h, v, s)
  }
  
  return getCoreColorName(h, s, v)
}

function getColorNameWithShade(hex: string, shade: 'light' | 'medium' | 'dark' | 'veryLight' | 'veryDark' = 'medium'): string {
  const baseName = getColorName(hex)
  
  if (shade === 'veryLight') return `亮${baseName}`
  if (shade === 'light') return `浅${baseName}`
  if (shade === 'dark') return `深${baseName}`
  if (shade === 'veryDark') return `暗${baseName}`
  return baseName
}

function getLightColorName(h: number, v: number, s: number = 0.2): string {
  const isVeryLight = v > 0.9
  const isPale = s < 0.15
  
  if (h < 12 || h >= 348) {
    if (isVeryLight && isPale) return '粉白'
    if (isPale) return '淡粉'
    return '粉色'
  }
  if (h < 30) {
    if (isVeryLight && isPale) return '米杏'
    if (isPale) return '杏色'
    return '浅橙'
  }
  if (h < 50) {
    if (isVeryLight && isPale) return '奶黄'
    if (isPale) return '米黄'
    return '浅黄'
  }
  if (h < 72) {
    if (isVeryLight && s > 0.2) return '鹅黄'
    if (isPale) return '浅黄'
    return '嫩黄'
  }
  if (h < 100) {
    if (isVeryLight && isPale) return '嫩绿'
    if (isPale) return '浅绿'
    return '粉绿'
  }
  if (h < 150) {
    if (isVeryLight && isPale) return '薄荷'
    if (isPale) return '薄荷绿'
    return '浅青绿'
  }
  if (h < 185) {
    if (isVeryLight && isPale) return '冰青'
    if (isPale) return '浅青'
    return '水青色'
  }
  if (h < 205) {
    if (isVeryLight && isPale) return '水蓝'
    if (isPale) return '浅蓝'
    return '粉蓝'
  }
  if (h < 230) {
    if (isVeryLight && isPale) return '天蓝'
    if (isPale) return '淡蓝'
    return '浅天蓝'
  }
  if (h < 260) {
    if (isVeryLight && isPale) return '淡蓝紫'
    if (isPale) return '浅蓝紫'
    return '蓝紫'
  }
  if (h < 285) {
    if (isVeryLight && isPale) return '淡紫'
    if (isPale) return '浅紫'
    return '粉紫'
  }
  if (h < 310) {
    if (isVeryLight && isPale) return '藕荷'
    if (isPale) return '藕粉色'
    return '粉紫'
  }
  if (h < 340) {
    if (isVeryLight && isPale) return '粉白'
    if (isPale) return '粉色'
    return '桃粉'
  }
  return '淡彩'
}

function getCoreColorName(h: number, s: number, v: number): string {
  if (h < 12 || h >= 348) {
    if (s < 0.3 && v < 0.5) return '棕红'
    if (s < 0.4) return '灰红'
    if (v < 0.35) return '酒红'
    if (v > 0.8 && s > 0.6) return '正红'
    return '红色'
  }
  if (h < 32) {
    if (s < 0.3 && v > 0.5) return '驼色'
    if (v < 0.4) return '棕褐'
    if (v < 0.55) return '深棕'
    if (v > 0.8) return '橘色'
    return '橙色'
  }
  if (h < 52) {
    if (s < 0.25) return '米黄'
    if (v < 0.45) return '土黄'
    if (s > 0.65 && v > 0.8) return '明黄'
    if (s > 0.5) return '姜黄'
    return '暖黄'
  }
  if (h < 75) {
    if (s < 0.3) return '浅黄'
    if (v > 0.85) return '柠黄'
    return '黄色'
  }
  if (h < 100) {
    if (v < 0.35) return '墨绿'
    if (s < 0.35) return '灰绿'
    if (v > 0.8 && s > 0.55) return '翠绿'
    if (s > 0.45) return '草绿'
    return '橄榄'
  }
  if (h < 145) {
    if (v < 0.4) return '深绿'
    if (s < 0.4) return '薄荷'
    if (v > 0.8) return '青绿'
    return '绿色'
  }
  if (h < 180) {
    if (s < 0.3) return '浅青'
    if (v < 0.4) return '深青'
    if (v > 0.8) return '青色'
    return '湖青'
  }
  if (h < 200) {
    if (v < 0.4) return '湖蓝'
    if (s < 0.35) return '灰蓝'
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
    if (v > 0.8) return '天蓝'
    return '蓝色'
  }
  if (h < 280) {
    if (v < 0.4) return '深紫'
    if (s < 0.4) return '灰紫'
    if (v > 0.85) return '淡紫'
    return '紫色'
  }
  if (h < 305) {
    if (v < 0.4) return '深紫'
    if (s < 0.35) return '藕荷'
    return '蓝紫'
  }
  if (h < 325) {
    if (s < 0.4) return '灰粉'
    if (v > 0.85) return '粉色'
    return '品红'
  }
  if (h < 348) {
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
  const primaryName = getColorName(primaryHex)
  const primary = { ...createColorInfo(primaryHex), name: primaryName }
  
  const lightCompHex = chroma(compH, Math.max(s * 0.5, 0.15), Math.min(v * 1.25, 1), 'hsv').hex()
  const lightComp = { ...createColorInfo(lightCompHex), name: `浅${primaryName}` }
  
  const darkCompHex = chroma(compH, Math.min(s * 1.1, 1), v * 0.6, 'hsv').hex()
  const darkComp = { ...createColorInfo(darkCompHex), name: `深${primaryName}` }
  
  const darkBaseHex = chroma(h, s, v * 0.65, 'hsv').hex()
  const baseName = getColorName(baseHex)
  const darkBase = { ...createColorInfo(darkBaseHex), name: `深${baseName}` }
  
  const compColorName = primaryName
  const baseColorName = baseName
  
  return {
    id: 'complementary',
    name: `${compColorName}撞色`,
    type: 'complementary',
    description: `${baseColorName}搭配${compColorName}互补色，撞色搭配活力十足`,
    colors: [base, primary, lightComp, darkBase, darkComp],
    baseColor: base,
    accentColor: primary,
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
  const leftAnalog = { ...createColorInfo(leftHex), name: leftName }
  
  const rightHex = chroma(h2, s, v, 'hsv').hex()
  const rightName = getColorName(rightHex)
  const rightAnalog = { ...createColorInfo(rightHex), name: rightName }
  
  const lightLeftHex = chroma(h1, s * 0.6, Math.min(v * 1.2, 1), 'hsv').hex()
  const lightLeft = { ...createColorInfo(lightLeftHex), name: `浅${leftName}` }
  
  const darkRightHex = chroma(h2, s, v * 0.7, 'hsv').hex()
  const darkRight = { ...createColorInfo(darkRightHex), name: `深${rightName}` }
  
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
    accentColor: rightAnalog,
  }
}

export function generateMonochromaticScheme(baseHex: string): ColorScheme {
  const base = createColorInfo(baseHex)
  const baseColor = chroma(baseHex)
  const [h, s, v] = baseColor.hsv()
  
  const baseName = getColorName(baseHex)
  
  const veryLightHex = chroma(h, Math.max(s * 0.3, 0.1), Math.min(v * 1.4, 0.95), 'hsv').hex()
  const lightHex = chroma(h, s * 0.6, Math.min(v * 1.2, 0.85), 'hsv').hex()
  const darkHex = chroma(h, Math.min(s * 1.1, 1), v * 0.7, 'hsv').hex()
  const veryDarkHex = chroma(h, Math.min(s * 0.9, 1), v * 0.45, 'hsv').hex()
  
  const vLightName = getColorName(veryLightHex)
  const lightName = getColorName(lightHex)
  const darkName = getColorName(darkHex)
  const vDarkName = getColorName(veryDarkHex)
  
  const veryLight = { ...createColorInfo(veryLightHex), name: vLightName }
  const light = { ...createColorInfo(lightHex), name: lightName }
  const dark = { ...createColorInfo(darkHex), name: darkName }
  const veryDark = { ...createColorInfo(veryDarkHex), name: vDarkName }
  
  const usedNames = new Set([baseName])
  const colorItems = [
    { color: veryLight, shade: 'veryLight' },
    { color: light, shade: 'light' },
    { color: base, shade: 'medium' },
    { color: dark, shade: 'dark' },
    { color: veryDark, shade: 'veryDark' },
  ]
  
  for (const item of colorItems) {
    if (item.shade === 'medium') continue
    const name = item.color.name
    if (usedNames.has(name)) {
      if (item.shade === 'veryLight') item.color.name = `亮${baseName}`
      else if (item.shade === 'light') item.color.name = `浅${baseName}`
      else if (item.shade === 'dark') item.color.name = `深${baseName}`
      else if (item.shade === 'veryDark') item.color.name = `暗${baseName}`
    }
    usedNames.add(item.color.name)
  }
  
  const midLightHex = chroma(h, s * 0.8, v * 0.9, 'hsv').hex()
  const midLightName = getColorName(midLightHex)
  const midLight = { 
    ...createColorInfo(midLightHex), 
    name: usedNames.has(midLightName) ? `浅${baseName}` : midLightName 
  }
  
  return {
    id: 'monochromatic',
    name: `${baseName}同调`,
    type: 'monochromatic',
    description: `${baseName}色系明暗渐变，统一和谐，高级有质感`,
    colors: [veryLight, light, base, dark, veryDark],
    baseColor: base,
    accentColor: midLight,
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
