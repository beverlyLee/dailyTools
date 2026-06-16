import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:5173'

async function debugTests() {
  console.log('=== 精确根因调试 ===\n')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('dialog', async dialog => { try { await dialog.accept() } catch {} })

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    // 生成数据
    await page.click('.tab-btn:nth-child(5)')
    await page.waitForTimeout(2000)
    await page.click('button.btn-danger.btn-large')
    await page.waitForTimeout(3000)
    await page.click('button.btn-primary.btn-large')
    await page.waitForTimeout(6000)

    // 调试1: VaccineCenter - 检查 livestockList prop 和 getLivestockBreed 调用
    console.log('\n--- 调试1: VaccineCenter livestockList prop ---')
    await page.click('.tab-btn:nth-child(3)')
    await page.waitForTimeout(2000)

    // 检查接种提醒表格中有牲畜品种信息（证明livestockList有数据）
    const reminderRows = await page.$$('.data-table tbody tr')
    console.log(`接种提醒行数: ${reminderRows.length}`)

    if (reminderRows.length > 0) {
      const firstRow = await page.$$eval('.data-table tbody tr:first-child td', cells =>
        cells.map(c => c.textContent.trim())
      )
      console.log(`提醒首行: ${firstRow.join(' | ')}`)
    }

    // 点击登记接种
    await page.click('.btn-add')
    await page.waitForTimeout(1000)

    // 选择牲畜后，注入调试代码到浏览器中
    await page.selectOption('#v-livestock', { index: 1 })
    await page.waitForTimeout(1500)

    // 核心调试：在浏览器中直接测试 getLivestockById 和 getLivestockBreed 的行为
    const debugResult = await page.evaluate(() => {
      const livestockSelect = document.getElementById('v-livestock')
      const selectedValue = livestockSelect?.value

      const nameSelect = document.getElementById('v-name')
      const nameOptions = nameSelect ? Array.from(nameSelect.options).map(o => o.value) : []

      // 关键：检查 getLivestockBreed 是否因为 newVaccine.livestockId 更新延迟
      // 在 Svelte 中 bind:value 更新可能不会立即触发 reactive
      // 检查 #v-name 的 innerHTML 来看模板渲染结果
      const nameInnerHtml = nameSelect?.innerHTML?.substring(0, 200)

      return {
        selectedLivestockValue: selectedValue,
        vaccineNameOptions: nameOptions,
        vaccineNameInnerHTML: nameInnerHtml,
      }
    })
    console.log(`\n调试结果:`)
    console.log(`  选中牲畜值: "${debugResult.selectedLivestockValue}"`)
    console.log(`  疫苗选项values: ${JSON.stringify(debugResult.vaccineNameOptions)}`)
    console.log(`  疫苗select innerHTML: ${debugResult.vaccineNameInnerHTML}`)

    // 等待更长时间看是否reactive最终触发
    console.log('\n  等待5秒后重新检查...')
    await page.waitForTimeout(5000)
    const delayedResult = await page.$$eval('#v-name option', opts => opts.map(o => ({ value: o.value, text: o.textContent })))
    console.log(`  延迟5秒后疫苗选项: ${JSON.stringify(delayedResult)}`)

    // 尝试用键盘事件触发
    await page.selectOption('#v-livestock', { index: 2 })
    await page.dispatchEvent('#v-livestock', 'change')
    await page.waitForTimeout(2000)
    const afterDispatch = await page.$$eval('#v-name option', opts => opts.map(o => ({ value: o.value, text: o.textContent })))
    console.log(`  手动change后疫苗选项: ${JSON.stringify(afterDispatch)}`)

    // 调试2: 验证通过率 - .toFixed(1) 返回字符串
    console.log('\n--- 调试2: 验证通过率 - 类型问题 ---')
    await page.click('.tab-btn:nth-child(5)')
    await page.waitForTimeout(2000)
    await page.click('button.btn-success')
    await page.waitForTimeout(3000)

    // 检查 validationPassRate 的实际值
    const rateDebug = await page.evaluate(() => {
      // 尝试直接读取 .summary-badge 中的文本
      const badge = document.querySelector('.summary-badge')
      const text = badge?.textContent || ''

      // 检查class来判断pass/fail
      const isPass = badge?.classList.contains('pass')
      const isFail = badge?.classList.contains('fail')

      // 模拟 Svelte reactive 计算
      const passed = 10
      const total = 10
      const computed = (passed / total * 100).toFixed(1)
      const compareResult = computed >= 80
      const typeOfComputed = typeof computed

      return {
        badgeText: text,
        isPassClass: isPass,
        isFailClass: isFail,
        computedValue: computed,
        computedType: typeOfComputed,
        compareResult: compareResult,
        stringCompare: `"${computed}" >= 80 = ${computed >= 80}`,
        numberCompare: `Number("${computed}") >= 80 = ${Number(computed) >= 80}`,
      }
    })
    console.log(`  通过率badge: ${JSON.stringify(rateDebug, null, 2)}`)

    // 核心问题确认：.toFixed(1) 返回字符串 "100.0"
    // Svelte 模板中 {validationPassRate >= 80 ? 'pass' : 'fail'}
    // 当 validationPassRate = "100.0" (字符串)
    // "100.0" >= 80 在JS中是 true（字符串与数字比较时字符串会被转换）
    // 所以 class 应该是 pass
    // 但实际 class 是 fail，说明 validationPassRate 的值仍然是 0

    console.log('\n>>> 分析结论:')
    console.log('>>> validationPassRate 始终为 0 的真正原因:')
    console.log('>>> 虽然 let 声明移到了 reactive 语句之前，')
    console.log('>>> 但 Svelte 4 的 reactive 语句($:) 在组件初始化时，')
    console.log('>>> 只有当其依赖项(validationResults)发生变化时才会重新执行。')
    console.log('>>> runValidation() 是异步函数，设置 showResults=true 后，')
    console.log('>>> reactive 语句可能在 Svelte 更新周期之前读取到旧的 validationResults')
    console.log('>>> 或 validationResults=[] (被 runValidation 开头清空了)')
    console.log('>>> 然后 push 进新数据后，reactive 没有被正确触发')

  } catch (e) {
    console.error('调试异常:', e.message)
  } finally {
    await browser.close()
  }
}

debugTests()
