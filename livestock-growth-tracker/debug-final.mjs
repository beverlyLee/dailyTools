import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:5173'

async function debug() {
  console.log('=== 数据联动深度调试 ===\n')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('dialog', async dialog => { try { await dialog.accept() } catch {} })

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    // 清空旧数据
    await page.click('.tab-btn:nth-child(5)')
    await page.waitForTimeout(2000)
    await page.click('button.btn-danger.btn-large')
    await page.waitForTimeout(4000)

    // 检查 livestockCount 输入框的值
    const countValue = await page.inputValue('#v-count')
    console.log(`livestockCount输入框值: "${countValue}"`)

    // 修改为10条
    await page.fill('#v-count', '10')
    await page.waitForTimeout(500)
    const newCountValue = await page.inputValue('#v-count')
    console.log(`修改后输入框值: "${newCountValue}"`)

    // 生成模拟数据
    await page.click('button.btn-primary.btn-large')
    await page.waitForTimeout(8000)

    // 检查IndexedDB
    const dbData = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.open('livestock_growth_tracker', 1)
        request.onsuccess = () => {
          const db = request.result
          const results = {}
          const stores = ['livestock', 'weight_records', 'feed_records', 'vaccine_records']
          let completed = 0
          stores.forEach(storeName => {
            try {
              const tx = db.transaction(storeName, 'readonly')
              const store = tx.objectStore(storeName)
              const countReq = store.count()
              countReq.onsuccess = () => {
                results[storeName] = countReq.result
                completed++
                if (completed === stores.length) resolve(results)
              }
            } catch (e) {
              results[storeName] = -1
              completed++
              if (completed === stores.length) resolve(results)
            }
          })
        }
        request.onerror = () => resolve({ error: 'DB open failed' })
      })
    })
    console.log(`IndexedDB: ${JSON.stringify(dbData)}`)

    // 检查个体档案页
    await page.click('.tab-btn:nth-child(1)')
    await page.waitForTimeout(3000)

    const cardCount = await page.$$eval('.livestock-card', cards => cards.length)
    console.log(`档案卡片数量: ${cardCount}`)

    if (cardCount > 0 && dbData.livestock > 0) {
      console.log('✓ 数据联动正常')
    } else if (dbData.livestock > 0 && cardCount === 0) {
      console.log('❌ 数据联动失败：IndexedDB有数据但UI不显示')
    } else {
      console.log(`数据量: IndexedDB=${dbData.livestock}, UI=${cardCount}`)
    }

    // 现在重点测试两个修复点

    // 测试1: 疫苗名称下拉框
    console.log('\n=== 测试1: 疫苗名称下拉框 ===')
    await page.click('.tab-btn:nth-child(3)')
    await page.waitForTimeout(2000)
    await page.click('.btn-add')
    await page.waitForTimeout(1500)

    await page.selectOption('#v-livestock', { index: 1 })
    await page.waitForTimeout(2000)

    const vaccineOptions = await page.$$eval('#v-name option', opts =>
      opts.map(o => ({ value: o.value, text: o.textContent }))
    )
    console.log(`疫苗选项: ${JSON.stringify(vaccineOptions)}`)
    if (vaccineOptions.length > 1) {
      console.log('✓ 修复验证通过：疫苗名称下拉框正常')
    } else {
      console.log('❌ 修复未生效：疫苗名称下拉框仍为空')
    }

    // 测试2: 通过率显示
    console.log('\n=== 测试2: 通过率显示 ===')
    await page.click('.tab-btn:nth-child(5)')
    await page.waitForTimeout(2000)
    await page.click('button.btn-success')
    await page.waitForTimeout(3000)

    const passRateText = await page.textContent('.summary-badge')
    const passRateClass = await page.$eval('.summary-badge', el => el.className)
    console.log(`通过率: ${passRateText}`)
    console.log(`样式: ${passRateClass?.includes('pass') ? 'pass(绿色)' : 'fail(红色)'}`)

    const statuses = await page.$$eval('.results-panel .data-table tbody tr td:last-child', els =>
      els.map(e => e.textContent.trim())
    )
    const passCount = statuses.filter(s => s.includes('通过')).length
    console.log(`通过: ${passCount}/${statuses.length}`)

    if (statuses.length > 0 && passCount === statuses.length && passRateText?.includes('100')) {
      console.log('✓ 修复验证通过：通过率显示正确')
    } else if (statuses.length > 0) {
      const expectedRate = (passCount / statuses.length * 100).toFixed(1)
      if (passRateText?.includes(expectedRate)) {
        console.log('✓ 修复验证通过：通过率计算正确')
      } else {
        console.log(`❌ 通过率不一致：期望${expectedRate}%，实际${passRateText}`)
      }
    }

  } catch (e) {
    console.error('调试异常:', e.message)
  } finally {
    await browser.close()
  }
}

debug()
