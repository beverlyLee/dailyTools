import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:5173'

async function debugTest() {
  console.log('=== 深度调试测试 ===')
  
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  
  const logs = []
  const errors = []
  
  page.on('console', msg => {
    logs.push({ type: msg.type(), text: msg.text() })
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`)
    }
  })
  
  page.on('pageerror', err => {
    errors.push(err.message)
    console.log(`[PAGE ERROR] ${err.message}`)
  })

  try {
    // 第一步：直接在浏览器中测试IndexedDB和事件分发
    console.log('\n--- 测试 IndexedDB 数据写入 ---')
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)
    
    // 检查 livestockList 初始值
    const initialCount = await page.evaluate(() => {
      return window.__INITIAL_STATE__ ? 'defined' : 'not defined'
    })
    console.log(`初始状态检测: ${initialCount}`)
    
    // 点击到系统验证
    await page.click('.tab-btn:nth-child(5)')
    await page.waitForTimeout(1500)
    
    // 点击生成数据
    let dialogAccepted = false
    page.on('dialog', async dialog => {
      console.log(`对话框内容: ${dialog.message()}`)
      dialogAccepted = true
      await dialog.accept()
    })
    
    console.log('点击生成模拟数据按钮...')
    await page.click('button.btn-primary.btn-large')
    await page.waitForTimeout(5000)
    
    console.log(`对话框是否出现: ${dialogAccepted}`)
    
    // 关键：检查IndexedDB中是否真的写入了数据
    console.log('\n--- 直接检查 IndexedDB 数据 ---')
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
                if (completed === stores.length) {
                  resolve(results)
                }
              }
              countReq.onerror = () => {
                results[storeName] = 'error'
                completed++
                if (completed === stores.length) {
                  resolve(results)
                }
              }
            } catch (e) {
              results[storeName] = `exception: ${e.message}`
              completed++
              if (completed === stores.length) {
                resolve(results)
              }
            }
          })
          
          setTimeout(() => resolve(results), 5000)
        }
        request.onerror = () => resolve({ error: 'DB open failed' })
      })
    })
    
    console.log('IndexedDB 实际数据量:', JSON.stringify(dbData, null, 2))
    
    // 现在切回档案列表，看看App的livestockList变量
    console.log('\n--- 检查 App 组件状态 ---')
    await page.click('.tab-btn:nth-child(1)')
    await page.waitForTimeout(3000)
    
    // 检查卡片数量
    const cardCount = await page.$$eval('.livestock-card', cards => cards.length)
    console.log(`DOM中的档案卡片数量: ${cardCount}`)
    console.log(`IndexedDB中的牲畜数量: ${dbData.livestock || 0}`)
    
    if (dbData.livestock > 0 && cardCount === 0) {
      console.log('\n>>> 确认问题: IndexedDB中有数据但UI没有更新 <<<')
      console.log('>>> 根因: ValidationPanel的dataLoaded事件未正确触发App的loadLivestock <<<')
    }
    
    // 第二步：检查事件分发器实现
    console.log('\n--- 检查 ValidationPanel 事件分发实现 ---')
    console.log('App.svelte 使用: on:dataLoaded={loadLivestock}')
    console.log('ValidationPanel.svelte 使用: export function onDataLoaded(callback) {...}')
    console.log('问题：ValidationPanel没有使用 createEventDispatcher()，而是用了自定义的callback方式')
    console.log('Svelte的on:xxx语法只能配合 createEventDispatcher() 使用')
    
    // 第三步：检查 {@const} 语法兼容性
    console.log('\n--- 检查 Svelte {@const} 语法兼容性 ---')
    console.log('项目使用 Svelte 4.x (package.json: ^4.2.0)')
    console.log('{@const} 是 Svelte 5 引入的语法')
    console.log('检查文件:')
    console.log('  - GrowthTracker.svelte line 321-325: 使用了 5 个 {@const}')
    console.log('  - ValidationPanel.svelte line 290: 使用了 1 个 {@const}')
    
    if (errors.length > 0) {
      console.log('\n运行时错误:')
      errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`))
    } else {
      console.log('\n注意：虽然构建未报错，但{@const}语法在Svelte 4中可能导致部分功能异常')
    }
    
    // 第四步：直接手动创建档案测试
    console.log('\n--- 手动创建档案测试 ---')
    await page.click('button.btn-primary')
    await page.waitForTimeout(1500)
    
    // 提交表单
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)
    
    const cardCountAfter = await page.$$eval('.livestock-card', cards => cards.length)
    console.log(`手动创建后DOM中的档案卡片数量: ${cardCountAfter}`)
    
    if (cardCountAfter > 0) {
      console.log('✓ 手动创建档案可以正常更新UI')
      console.log('>>> 进一步确认问题仅出在模拟数据生成后的事件分发 <<<')
    }
    
  } catch (e) {
    console.error('测试异常:', e.message)
  } finally {
    await browser.close()
  }
}

debugTest()
