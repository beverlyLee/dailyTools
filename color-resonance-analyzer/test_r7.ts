import { 
  generateAllSchemes,
  createColorInfo,
  getSchemeCurtainColor,
  getSchemePillowColors,
} from './src/utils/colorTheory'

console.log('=== 第七轮功能验证测试 ===\n')

console.log('--- 1. 颜色信息面板验证 ---')
const testHex = '#1E3A5F'
const colorInfo = createColorInfo(testHex)
console.log(`输入颜色: ${testHex}`)
console.log(`HEX: ${colorInfo.hex}`)
console.log(`name 字段: ${colorInfo.name}`)
console.log(`RGB: ${colorInfo.rgb.r}, ${colorInfo.rgb.g}, ${colorInfo.rgb.b}`)
console.log(`HSV: ${Math.round(colorInfo.hsv.h)}, ${Math.round(colorInfo.hsv.s*100)}%, ${Math.round(colorInfo.hsv.v*100)}%`)
console.log(`注意: 本轮要求所有颜色用代码展示，中文名称仅作为 tooltip 使用`)

console.log('\n--- 2. 沙发颜色预设数量验证 ---')
console.log(`(此为 UI 组件数据，需浏览器验证)`)

console.log('\n--- 3. 方案生成验证 ---')
const schemes = generateAllSchemes(testHex)
console.log(`生成方案数量: ${schemes.length}`)
for (const scheme of schemes) {
  console.log(`\n  方案: ${scheme.name}`)
  console.log(`  类型: ${scheme.type}`)
  console.log(`  色块数量: ${scheme.colors.length}`)
  for (let i = 0; i < scheme.colors.length; i++) {
    const c = scheme.colors[i]
    console.log(`    ${i + 1}. ${c.name.padEnd(18)} ${c.hex}`)
  }
  
  const curtainHex = getSchemeCurtainColor(scheme)
  const curtainInfo = createColorInfo(curtainHex)
  console.log(`  窗帘代表色: ${curtainHex} (${curtainInfo.name})`)
}

console.log('\n--- 4. 抱枕颜色验证 ---')
const testScheme = schemes[0]
const pillowColors = getSchemePillowColors(testScheme, 4)
console.log(`方案「${testScheme.name}」抱枕配色 (4个):`)
for (let i = 0; i < pillowColors.length; i++) {
  console.log(`  抱枕${i + 1}: ${pillowColors[i]}`)
}

console.log('\n=== 测试完成 ===')
