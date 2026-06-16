import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:5173'

async function debugTests() {
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

    // 精确调试1: VaccineCenter getLivestockBreed
    console.log('\n--- 精确调试: VaccineCenter getLivestockBreed ---')
    await page.click('.tab-btn:nth-child(3)')
    await page.waitForTimeout(2000)
    await page.click('.btn-add')
    await page.waitForTimeout(1000)

    // 选择牲畜
    await page.selectOption('#v-livestock', { index: 1 })
    await page.waitForTimeout(2000)

    // 直接测试 Svelte 组件中的 getLivestockBreed 是否被正确调用
    // 问题可能是：bind:value 改变了 newVaccine.livestockId，
    // 但 getLivestockBreed() 在模板中不是 reactive 的
    // 它只是一个普通函数调用，Svelte 不追踪函数调用的返回值变化

    const preciseDebug = await page.evaluate(() => {
      const livestockSelect = document.getElementById('v-livestock')
      const nameSelect = document.getElementById('v-name')

      // 检查所有 select 的 option
      const livestockOpts = Array.from(livestockSelect?.options || []).map(o => o.value)
      const nameOpts = Array.from(nameSelect?.options || []).map(o => o.value)

      // 关键：Svelte 的模板渲染中 getLivestockBreed() 是否在 livestockId 变化时重新计算？
      // getLivestockBreed() 是普通函数，不是 reactive 语句
      // Svelte 模板会在依赖变化时重新渲染
      // 但 getLivestockBreed 依赖 newVaccine.livestockId (通过 bind:value)
      // 如果 bind:value 更新了但组件没有触发重渲染，getLivestockBreed 不会重新执行

      return {
        livestockOpts,
        nameOpts,
        livestockValue: livestockSelect?.value,
      }
    })
    console.log(`  牲畜选项values: ${JSON.stringify(preciseDebug.livestockOpts.slice(0, 5))}`)
    console.log(`  疫苗选项values: ${JSON.stringify(preciseDebug.nameOpts)}`)
    console.log(`  当前牲畜选中: ${preciseDebug.livestockValue}`)

    // 尝试选择第二个牲畜看是否有变化
    await page.selectOption('#v-livestock', { index: 2 })
    await page.waitForTimeout(3000)

    const secondTry = await page.$$eval('#v-name option', opts => opts.map(o => ({ value: o.value, text: o.textContent })))
    console.log(`  第二次选择后疫苗选项: ${JSON.stringify(secondTry)}`)

    // 关键发现：getLivestockBreed() 是在模板中直接调用的普通函数
    // Svelte 会追踪模板中的响应式依赖
    // 但是 getLivestockBreed() 内部访问的是 newVaccine.livestockId
    // 而 bind:value={newVaccine.livestockId} 应该会触发重渲染
    // 问题可能是：livestockList 在 VaccineCenter 中是通过 prop 传入的
    // 而 option value={l.id} 中的 l.id 可能是 number 类型
    // 但 bind:value 绑定到 newVaccine.livestockId (初始为字符串 '')
    // select 的 value 始终是字符串
    // 所以 newVaccine.livestockId = "1" (字符串)
    // getLivestockById("1") 中 String(l.id) === String("1")
    // 如果 l.id = 1 (数字), String(1) === String("1") => "1" === "1" => true
    // 应该能找到...
    // 但问题是 getLivestockBreed 是否真的被重新调用了？

    console.log('\n>>> 根因假设验证:')
    console.log('>>> 假设1: getLivestockBreed() 在 bind:value 更新后没有被重新调用')
    console.log('>>> 原因: Svelte 模板中 {#if getLivestockBreed()} 不是标准的 reactive 表达式')
    console.log('>>> 普通函数调用在 Svelte 模板中不会自动追踪依赖变化')
    console.log('>>> 需要改用 reactive 语句预计算 breed')
    console.log('>>>')
    console.log('>>> 假设2: validationPassRate reactive 语句根本没有执行')
    console.log('>>> 原因: runValidation 中先清空 validationResults = []')
    console.log('>>> 然后 push 新数据, 但 Svelte 4 中 array.push() 不触发响应式更新')
    console.log('>>> 需要 validationResults = [...newArray] 重新赋值')

  } catch (e) {
    console.error('调试异常:', e.message)
  } finally {
    await browser.close()
  }
}

debugTests()
