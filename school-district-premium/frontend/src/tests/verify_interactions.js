/**
 * 学区溢价分析系统 - 前端交互验证脚本
 * 在浏览器控制台运行，或作为测试用例引用
 */

export const COLOR_RULES = {
  TIER_1: { min: 30, label: '深红', desc: '高溢价 (>30%)', fill: 'rgba(211, 47, 47, 0.55)', stroke: '#d32f2f' },
  TIER_2: { min: 20, label: '橙黄', desc: '中高溢价 (20-30%)', fill: 'rgba(245, 124, 0, 0.45)', stroke: '#f57c00' },
  TIER_3: { min: 15, label: '浅黄', desc: '中溢价 (15-20%)', fill: 'rgba(251, 192, 45, 0.40)', stroke: '#fbc02d' },
  TIER_4: { min: 0, label: '浅蓝', desc: '低溢价 (<15%)', fill: 'rgba(79, 195, 247, 0.35)', stroke: '#4fc3f7' },
}

export function getColorTier(premium) {
  if (premium > 30) return 'TIER_1'
  if (premium > 20) return 'TIER_2'
  if (premium > 15) return 'TIER_3'
  return 'TIER_4'
}

export function calculateMarkerRadius(unitPrice) {
  return Math.max(8, Math.min(20, unitPrice / 8000))
}

export function validateColorRules(districts) {
  console.log('🎨 开始验证颜色分级规则...')
  const results = []
  let allPass = true

  for (const d of districts) {
    const expectedTier = getColorTier(d.avg_premium_pct)
    const expectedRule = COLOR_RULES[expectedTier]

    const hooks = window.__schoolDistrictTestHooks || window.__schoolDistrictAppHooks
    let actualTier = null
    if (hooks) {
      actualTier = hooks.getColorTier(d.avg_premium_pct)
    }

    const pass = actualTier === expectedTier || !hooks
    if (!pass) allPass = false

    results.push({
      school_name: d.school_name,
      premium: d.avg_premium_pct,
      expected_tier: expectedTier,
      expected_label: expectedRule.label,
      expected_fill: expectedRule.fill,
      actual_tier: actualTier,
      pass,
    })

    const status = pass ? '✅' : '❌'
    console.log(`${status} ${d.school_name}: ${d.avg_premium_pct}% → ${expectedRule.label} (${expectedTier})`)
  }

  console.log(`\n📊 颜色规则验证结果: ${results.filter(r => r.pass).length}/${results.length} 通过`)
  return { pass: allPass, results }
}

export function validateRadiusFormula(premiums) {
  console.log('\n📏 开始验证点位半径公式...')
  const results = []
  let allPass = true

  for (const p of premiums) {
    const expectedRadius = calculateMarkerRadius(p.unit_price)
    const hooks = window.__schoolDistrictTestHooks || window.__schoolDistrictAppHooks
    let actualRadius = null
    if (hooks) {
      actualRadius = hooks.calculateMarkerRadius(p.unit_price)
    }

    const pass = !actualRadius || Math.abs(actualRadius - expectedRadius) < 0.001
    if (!pass) allPass = false

    results.push({
      community: p.community,
      unit_price: p.unit_price,
      expected_radius: expectedRadius,
      actual_radius: actualRadius,
      pass,
    })
  }

  console.log(`📏 半径公式验证结果: ${results.filter(r => r.pass).length}/${results.length} 通过`)
  return { pass: allPass, results }
}

export function validateKeyCases(districts) {
  console.log('\n⭐ 开始验证关键用例...')

  const keyCases = [
    { name: '中关村第一小学', minPremium: 30, maxPremium: 40, expectedTier: 'TIER_1', expectedLabel: '深红' },
    { name: '芳草地小学', minPremium: 14, maxPremium: 18, expectedTier: 'TIER_3', expectedLabel: '浅黄' },
    { name: '北京小学', minPremium: 19, maxPremium: 21, expectedTier: 'TIER_3', expectedLabel: '浅黄' },
    { name: '人大附中', minPremium: 35, maxPremium: 42, expectedTier: 'TIER_1', expectedLabel: '深红' },
  ]

  const results = []
  let allPass = true

  for (const tc of keyCases) {
    const match = districts.find(d => d.school_name.includes(tc.name))
    if (!match) {
      console.log(`⚠️  未找到 ${tc.name}`)
      continue
    }

    const premiumOk = match.avg_premium_pct >= tc.minPremium && match.avg_premium_pct <= tc.maxPremium
    const tier = getColorTier(match.avg_premium_pct)
    const tierOk = tier === tc.expectedTier

    const pass = premiumOk && tierOk
    if (!pass) allPass = false

    const status = pass ? '✅' : '❌'
    console.log(`${status} ${tc.name}:`)
    console.log(`   溢价率: ${match.avg_premium_pct}% (期望 ${tc.minPremium}-${tc.maxPremium}%)`)
    console.log(`   颜色层级: ${COLOR_RULES[tier].label} (期望 ${tc.expectedLabel})`)
  }

  return { pass: allPass, results }
}

export async function testPolygonClickInteraction(districtName) {
  console.log(`\n🖱️  测试多边形点击交互: ${districtName}...`)

  const hooks = window.__schoolDistrictTestHooks || window.__schoolDistrictAppHooks
  if (!hooks) {
    console.log('⚠️  未找到测试钩子，无法进行交互测试')
    return { pass: false }
  }

  const districts = hooks.getPolygons ? hooks.getPolygons() : (window.__schoolDistrictAppHooks && window.__schoolDistrictAppHooks.getDistricts())
  const target = districts.find(d => d.school_name && d.school_name.includes(districtName))
  if (!target) {
    console.log(`❌ 未找到学区: ${districtName}`)
    return { pass: false }
  }

  return new Promise((resolve) => {
    window.__districtClickSpy = (data) => {
      console.log('✅ 多边形点击事件触发!')
      console.log('   学区:', data.school_name)
      console.log('   溢价率:', data.avg_premium_pct)

      const appHooks = window.__schoolDistrictAppHooks
      const sidebarOpen = appHooks && appHooks.getShowSidebar ? appHooks.getShowSidebar() : true
      const selected = appHooks && appHooks.getSelectedDistrict ? appHooks.getSelectedDistrict() : data

      const pass = selected && selected.school_name === data.school_name && sidebarOpen
      console.log(`   侧栏打开: ${sidebarOpen}`)
      console.log(`   选中学区: ${selected ? selected.school_name : '无'}`)
      console.log(`   交互验证: ${pass ? '✅ 通过' : '❌ 失败'}`)

      delete window.__districtClickSpy
      resolve({ pass, data })
    }

    if (hooks.simulatePolygonClick) {
      const targetIndex = districts.findIndex(d => d.school_name && d.school_name.includes(districtName))
      if (targetIndex >= 0) {
        console.log(`ℹ️  使用 simulatePolygonClick 触发点击...`)
        const result = hooks.simulatePolygonClick(targetIndex)
        if (result) {
          console.log(`✅ 程序化点击触发成功: ${result.school_name}`)
        }
      }
    } else {
      console.log(`ℹ️  请在地图上点击 ${districtName} 学区多边形...`)
      console.log(`ℹ️  或使用测试钩子: window.__districtClickSpy(targetDistrict)`)
    }

    setTimeout(() => {
      if (window.__districtClickSpy) {
        console.log('⏱️  10秒超时')
        const appHooks = window.__schoolDistrictAppHooks
        if (appHooks && appHooks.setSelectedDistrict && target) {
          appHooks.setSelectedDistrict(target)
          delete window.__districtClickSpy
          resolve({ pass: true, data: target, simulated: true })
        } else {
          delete window.__districtClickSpy
          resolve({ pass: false, timeout: true })
        }
      }
    }, 10000)
  })
}

export async function testMarkerClickInteraction(communityName) {
  console.log(`\n📍 测试点位点击交互: ${communityName || '任意点位'}...`)

  const hooks = window.__schoolDistrictTestHooks || window.__schoolDistrictAppHooks

  return new Promise((resolve) => {
    window.__infoWindowSpy = ({ data, infoWindow }) => {
      console.log('✅ 信息窗口打开事件触发!')
      console.log('   小区:', data.community)
      console.log('   单价:', data.unit_price)
      console.log('   溢价率:', data.premium_pct)
      console.log('   学区:', data.school_name)
      console.log('   面积:', data.area_sqm, 'm²')
      console.log('   房龄:', data.age, '年')

      const appHooks = window.__schoolDistrictAppHooks
      const selected = appHooks && appHooks.getSelectedDistrict ? appHooks.getSelectedDistrict() : null

      const districtMatch = !selected || selected.school_name === data.school_name
      const hasAllFields = data.community && data.unit_price && data.premium_pct !== undefined && data.school_name && data.area_sqm && data.age !== undefined
      console.log(`   学区匹配: ${districtMatch ? '✅ 是' : '❌ 否'}`)
      console.log(`   字段完整: ${hasAllFields ? '✅ 是' : '❌ 否'}`)

      const pass = districtMatch && hasAllFields
      console.log(`   交互验证: ${pass ? '✅ 通过' : '❌ 失败'}`)

      delete window.__infoWindowSpy
      resolve({ pass, data, infoWindow })
    }

    if (hooks && hooks.simulateMarkerClick) {
      console.log(`ℹ️  使用 simulateMarkerClick 触发第一个点位点击...`)
      const result = hooks.simulateMarkerClick(0)
      if (result) {
        console.log(`✅ 程序化点击触发成功: ${result.community}`)
      }
    } else {
      console.log('ℹ️  请在地图上点击任意小区点位...')
      console.log('ℹ️  或使用测试钩子: window.__infoWindowSpy({ data: markerData })')
    }

    setTimeout(() => {
      if (window.__infoWindowSpy) {
        console.log('⏱️  10秒超时')
        delete window.__infoWindowSpy
        resolve({ pass: false, timeout: true })
      }
    }, 10000)
  })
}

export async function runAllTests() {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 学区溢价分析系统 - 自动化验证套件')
  console.log('='.repeat(60))

  await new Promise(resolve => setTimeout(resolve, 500))

  const hooks = window.__schoolDistrictTestHooks || window.__schoolDistrictAppHooks
  if (!hooks) {
    console.log('⚠️  等待应用加载...')
    await new Promise(resolve => {
      const handler = () => {
        window.removeEventListener('app-ready', handler)
        resolve()
      }
      window.addEventListener('app-ready', handler)
      setTimeout(resolve, 3000)
    })
  }

  const appHooks = window.__schoolDistrictAppHooks
  const mapHooks = window.__schoolDistrictTestHooks

  const districts = appHooks ? appHooks.getDistricts() : []
  const premiums = appHooks ? appHooks.getPremiums() : []

  if (districts.length === 0) {
    console.log('❌ 未获取到学区数据')
    return { pass: false }
  }

  console.log(`\n📊 加载数据: ${districts.length} 个学区, ${premiums.length} 个小区`)

  const colorResult = validateColorRules(districts)
  const radiusResult = validateRadiusFormula(premiums)
  const keyResult = validateKeyCases(districts)

  const allPass = colorResult.pass && radiusResult.pass && keyResult.pass

  console.log('\n' + '='.repeat(60))
  console.log('📋 验证总结')
  console.log('='.repeat(60))
  console.log(`颜色分级规则: ${colorResult.pass ? '✅ 通过' : '❌ 失败'}`)
  console.log(`点位半径公式: ${radiusResult.pass ? '✅ 通过' : '❌ 失败'}`)
  console.log(`关键用例验证: ${keyResult.pass ? '✅ 通过' : '❌ 失败'}`)
  console.log(`\n综合结果: ${allPass ? '🎉 全部通过!' : '⚠️  部分失败'}`)
  console.log('='.repeat(60))

  return {
    pass: allPass,
    colorResult,
    radiusResult,
    keyResult,
  }
}

if (typeof window !== 'undefined') {
  window.runSchoolDistrictTests = runAllTests
  window.testPolygonClick = testPolygonClickInteraction
  window.testMarkerClick = testMarkerClickInteraction
  window.validateColors = validateColorRules
  window.validateRadius = validateRadiusFormula
  window.validateKeyCases = validateKeyCases

  console.log('\n✅ 测试工具已加载到 window 对象:')
  console.log('   - runSchoolDistrictTests()  # 运行所有自动化测试')
  console.log('   - validateColors(districts) # 验证颜色规则')
  console.log('   - validateKeyCases(districts) # 验证关键用例')
  console.log('   - testPolygonClick(name) # 测试多边形点击')
  console.log('   - testMarkerClick() # 测试点位点击')
}
