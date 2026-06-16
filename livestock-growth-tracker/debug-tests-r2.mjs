import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:5173'

async function debugTests() {
  console.log('=== 深度调试测试 ===\n')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  page.on('dialog', async dialog => {
    try { await dialog.accept() } catch {}
  })

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    // 生成数据
    await page.click('.tab-btn:nth-child(5)')
    await page.waitForTimeout(2000)
    await page.click('button.btn-primary.btn-large')
    await page.waitForTimeout(6000)

    // 调试1: 免疫中心 - 疫苗名称选项
    console.log('\n--- 调试1: 免疫中心登记接种 ---')
    await page.click('.tab-btn:nth-child(3)')
    await page.waitForTimeout(2000)
    await page.click('.btn-add')
    await page.waitForTimeout(1000)

    // 选择牲畜
    const livestockOptions = await page.$$eval('#v-livestock option', opts => opts.map(o => ({ value: o.value, text: o.textContent })))
    console.log(`牲畜选项: ${JSON.stringify(livestockOptions.slice(0, 3))}`)

    await page.selectOption('#v-livestock', { index: 1 })
    await page.waitForTimeout(1500)

    // 读取选择后的牲畜值
    const selectedLivestockId = await page.inputValue('#v-livestock')
    console.log(`选中的牲畜ID: ${selectedLivestockId} (type: ${typeof selectedLivestockId})`)

    // 读取疫苗选项
    const vaccineOptions = await page.$$eval('#v-name option', opts => opts.map(o => ({ value: o.value, text: o.textContent })))
    console.log(`疫苗选项: ${JSON.stringify(vaccineOptions)}`)

    // 检查 getLivestockBreed 是否能找到牲畜
    const breedCheck = await page.evaluate((id) => {
      const livestockId = id
      const parsed = parseInt(livestockId)
      return { original: livestockId, parsed, isNaN: isNaN(parsed), type: typeof parsed }
    }, selectedLivestockId)
    console.log(`ID解析: ${JSON.stringify(breedCheck)}`)

    // 手动在浏览器中查找
    const findResult = await page.evaluate((id) => {
      const parsed = parseInt(id)
      const livestock = window.__SVELTE_LIVESTOCK__ || 'not available'
      return { parsedId: parsed, livestockVar: livestock }
    }, selectedLivestockId)
    console.log(`查找结果: ${JSON.stringify(findResult)}`)

    // 调试2: 验证通过率显示
    console.log('\n--- 调试2: 系统验证通过率显示 ---')
    await page.click('.tab-btn:nth-child(5)')
    await page.waitForTimeout(2000)
    await page.click('button.btn-success')
    await page.waitForTimeout(3000)

    const passRateEl = await page.$('.summary-badge')
    const passRateText = await passRateEl?.textContent()
    console.log(`通过率元素文本: "${passRateText}"`)

    const passRateClass = await passRateEl?.getAttribute('class')
    console.log(`通过率元素class: "${passRateClass}"`)

    // 检查validationPassRate值
    const passRateValue = await page.evaluate(() => {
      return document.querySelector('.summary-badge')?.textContent
    })
    console.log(`通过率: "${passRateValue}"`)

    // 检查验证结果状态
    const resultStatuses = await page.$$eval('.results-panel .data-table tbody tr td:last-child', els =>
      els.map(e => e.textContent.trim())
    )
    console.log(`所有状态: ${resultStatuses.join(', ')}`)

    // 分析通过率0%但所有状态都是"通过"的矛盾
    const passCount = resultStatuses.filter(s => s.includes('通过')).length
    const failCount = resultStatuses.filter(s => s.includes('异常')).length
    console.log(`通过: ${passCount}, 异常: ${failCount}, 总数: ${resultStatuses.length}`)
    console.log(`预期通过率: ${(passCount / resultStatuses.length * 100).toFixed(1)}%`)

    if (passCount > 0 && passRateText?.includes('0%')) {
      console.log('\n>>> 发现问题: 通过率显示0%但所有测试实际通过')
      console.log('>>> 根因: ValidationPanel.svelte 中 reactive 计算的 validationPassRate 初始值为0')
      console.log('>>> 第163-167行: $: if (validationResults.length > 0) { ... } 是reactive语句')
      console.log('>>> 但第169行: let validationPassRate = 0 在 reactive 语句之后')
      console.log('>>> Svelte 4 的 reactive 语句可能因为变量声明顺序导致计算异常')
    }

  } catch (e) {
    console.error('调试异常:', e.message)
  } finally {
    await browser.close()
  }
}

debugTests()
