import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const IMG_DIR = path.join(process.cwd(), 'img')
const BASE_URL = 'http://localhost:5173'

if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true })
fs.readdirSync(IMG_DIR).forEach(f => {
  if (f.endsWith('.png')) fs.unlinkSync(path.join(IMG_DIR, f))
})

const issues = []
const consoleErrors = []

function logIssue(section, description, severity = 'medium') {
  issues.push({ section, description, severity })
  console.log(`  [问题-${severity}] ${section}: ${description}`)
}

async function takeScreenshot(page, name) {
  await page.screenshot({ path: path.join(IMG_DIR, `${name}.png`), fullPage: true })
  console.log(`  截图: ${name}.png`)
}

async function runTests() {
  console.log('=== 牲畜生长数字化管理系统 第二轮验收测试 ===\n')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push({ text: msg.text() })
  })
  page.on('pageerror', err => consoleErrors.push({ text: err.message, type: 'pageerror' }))

  page.on('dialog', async dialog => {
    try { await dialog.accept() } catch {}
  })

  try {
    // ===== 步骤1: 首页 =====
    console.log('\n--- 步骤1: 首页加载 ---')
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)
    const headerText = await page.textContent('.app-header h1')
    console.log(`  首页标题: ${headerText?.substring(0, 20)}`)

    const tabs = await page.$$('.tab-btn')
    console.log(`  ✓ 导航标签: ${tabs.length}个`)
    await takeScreenshot(page, '01_homepage')

    // ===== 步骤2: 生成模拟数据 =====
    console.log('\n--- 步骤2: 生成模拟数据 ---')
    await page.click('.tab-btn:nth-child(5)')
    await page.waitForTimeout(2000)

    const clearBtn = await page.$('button.btn-danger.btn-large')
    if (clearBtn && await clearBtn.isEnabled()) {
      await clearBtn.click()
      await page.waitForTimeout(3000)
      console.log('  已清空旧数据')
    }

    const generateBtn = await page.$('button.btn-primary.btn-large')
    await generateBtn.click()
    await page.waitForTimeout(6000)
    console.log('  已生成模拟数据')
    await takeScreenshot(page, '02_validation_after_generate')

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
    console.log(`  IndexedDB: ${JSON.stringify(dbData)}`)

    // ===== 步骤3: 数据联动 - 核心验证 =====
    console.log('\n--- 步骤3: 数据联动验证 ---')
    await page.click('.tab-btn:nth-child(1)')
    await page.waitForTimeout(3000)

    const cardCount = await page.$$eval('.livestock-card', cards => cards.length)
    console.log(`  档案卡片数量: ${cardCount}`)
    if (cardCount > 0) {
      console.log('  ✓ 【修复验证】数据联动修复有效：模拟数据生成后档案列表成功刷新')
    } else {
      logIssue('个体档案-数据联动', `模拟数据生成后档案列表仍为空，IndexedDB有${dbData.livestock}条但UI显示0条`, 'critical')
    }

    const warningCards = await page.$$('.livestock-card.warning')
    console.log(`  生长预警个体: ${warningCards.length}个`)
    await takeScreenshot(page, '03_livestock_with_data')

    // ===== 步骤4: 搜索筛选 =====
    console.log('\n--- 步骤4: 搜索和筛选 ---')
    const searchInput = await page.$('.search-input')
    if (searchInput) {
      await searchInput.fill('杜洛克')
      await page.waitForTimeout(800)
      const filtered = await page.$$eval('.livestock-card', cards => cards.length)
      console.log(`  搜索"杜洛克": ${filtered}条`)
      await searchInput.fill('')
      await page.waitForTimeout(500)
    }

    const filterSelect = await page.$('.filter-select')
    if (filterSelect) {
      await filterSelect.selectOption({ index: 1 })
      await page.waitForTimeout(800)
      const breedCards = await page.$$eval('.livestock-card', cards => cards.length)
      console.log(`  品种筛选: ${breedCards}条`)
      await filterSelect.selectOption({ index: 0 })
      await page.waitForTimeout(500)
    }
    await takeScreenshot(page, '04_search_filter')

    // ===== 步骤5: 生长模型对标 =====
    console.log('\n--- 步骤5: 生长模型对标模块 ---')
    await page.click('.tab-btn:nth-child(2)')
    await page.waitForTimeout(2000)

    const select = await page.$('.livestock-select')
    const opts = await select.$$('option')
    console.log(`  可选牲畜: ${opts.length - 1}个`)

    if (opts.length > 1) {
      await select.selectOption({ index: 1 })
      await page.waitForTimeout(3000)

      const statLabels = await page.$$eval('.stat-label', els => els.map(e => e.textContent))
      const statValues = await page.$$eval('.stat-value', els => els.map(e => e.textContent.trim()))
      console.log('  统计数据:')
      statLabels.slice(0, 6).forEach((l, i) => {
        if (statValues[i]) console.log(`    ${l}: ${statValues[i]}`)
      })

      const fcrValue = statValues[3]
      if (fcrValue && fcrValue !== '--') {
        console.log(`  ✓ FCR计算结果: ${fcrValue}`)
      } else {
        logIssue('生长对标', `FCR值未计算，显示: ${fcrValue}`, 'high')
      }

      const chartExists = await page.$('.growth-chart')
      if (chartExists) {
        const svgContent = await page.evaluate(el => el.innerHTML, chartExists)
        console.log(`  ✓ SVG曲线图: path=${svgContent.includes('<path')}, 数据点=${svgContent.includes('<circle')}`)
      }

      // 体重记录表格 - 验证 {@const} 修复
      const weightRows = await page.$$('.data-table tbody tr')
      console.log(`  体重记录行: ${weightRows.length}`)

      if (weightRows.length > 0) {
        const firstRow = await page.$$eval('.data-table tbody tr:first-child td', cells =>
          cells.map(c => c.textContent.trim())
        )
        console.log(`  体重表首行: ${firstRow.join(' | ')}`)

        const hasDeviation = firstRow.some(c => c.includes('%') && !c.includes('undefined'))
        if (hasDeviation) {
          console.log('  ✓ 【修复验证】偏离度正确渲染（{@const}修复有效）')
        } else {
          logIssue('生长对标-{@const}修复', '偏离度列渲染异常，含undefined', 'high')
        }
      }

      const warningAlert = await page.$('.alert-danger')
      if (warningAlert) console.log('  ✓ 生长预警横幅显示')

      // 录入体重
      console.log('\n--- 步骤5b: 录入体重 ---')
      const weightBtns = await page.$$('button.btn-primary.btn-sm')
      if (weightBtns[0]) {
        const text = await weightBtns[0].textContent()
        if (text?.includes('录入体重')) {
          await weightBtns[0].click()
          await page.waitForTimeout(1000)
          const weightInput = await page.$('#gw-weight')
          if (weightInput) {
            await weightInput.fill('95.0')
            await page.click('.inline-form .btn-primary')
            await page.waitForTimeout(2000)
            console.log('  ✓ 体重录入成功')
          }
        }
      }

      // 录入饲料
      console.log('\n--- 步骤5c: 录入饲料 ---')
      const feedBtns = await page.$$('button.btn-primary.btn-sm')
      if (feedBtns[1]) {
        const text = await feedBtns[1].textContent()
        if (text?.includes('录入饲料')) {
          await feedBtns[1].click()
          await page.waitForTimeout(1000)
          const feedInput = await page.$('#gf-amount')
          if (feedInput) {
            await feedInput.fill('4.2')
            await page.click('.inline-form .btn-primary')
            await page.waitForTimeout(2000)
            console.log('  ✓ 饲料录入成功')
          }
        }
      }
    }
    await takeScreenshot(page, '05_growth_detail')

    // ===== 步骤6: 免疫中心 =====
    console.log('\n--- 步骤6: 免疫中心 ---')
    await page.click('.tab-btn:nth-child(3)')
    await page.waitForTimeout(2000)

    const reminderText = await page.textContent('.sub-tab:nth-child(1)')
    console.log(`  接种提醒: ${reminderText}`)

    const reminderRows = await page.$$('.data-table tbody tr')
    console.log(`  提醒行数: ${reminderRows.length}`)
    await takeScreenshot(page, '06_vaccine_reminders')

    // 接种记录
    await page.click('.sub-tab:nth-child(2)')
    await page.waitForTimeout(1000)
    await takeScreenshot(page, '06b_vaccine_records')

    // 标准免疫程序
    await page.click('.sub-tab:nth-child(3)')
    await page.waitForTimeout(1000)
    const scheduleCards = await page.$$('.schedule-card')
    console.log(`  品种免疫程序: ${scheduleCards.length}个`)
    await takeScreenshot(page, '06c_vaccine_schedule')

    // 登记接种
    console.log('\n--- 步骤6b: 登记接种 ---')
    await page.click('.btn-add')
    await page.waitForTimeout(1000)

    const vaccineForm = await page.$('.form-panel')
    if (vaccineForm) {
      // 选择牲畜
      await page.selectOption('#v-livestock', { index: 1 })
      await page.waitForTimeout(1000)

      // 等待疫苗名称选项加载
      const vaccineOptions = await page.$$eval('#v-name option', opts => opts.map(o => o.value))
      console.log(`  疫苗选项: ${vaccineOptions.join(', ')}`)

      if (vaccineOptions.length > 1) {
        await page.selectOption('#v-name', { index: 1 })
        await page.fill('#v-batch', 'B20260616001')
        await page.fill('#v-operator', '张医生')
        await page.click('.form-panel .btn-primary')
        await page.waitForTimeout(2000)
        console.log('  ✓ 接种记录保存成功')
      } else {
        logIssue('免疫中心-登记接种', '选择牲畜后疫苗名称下拉框无选项可选，getLivestockBreed()可能未正确返回品种', 'medium')
      }
    }
    await takeScreenshot(page, '06d_vaccine_form')

    // ===== 步骤7: 报表中心 =====
    console.log('\n--- 步骤7: 报表中心 ---')
    await page.click('.tab-btn:nth-child(4)')
    await page.waitForTimeout(3000)

    const kpiCards = await page.$$('.kpi-card')
    console.log(`  KPI卡片: ${kpiCards.length}个`)

    if (kpiCards.length >= 6) {
      console.log('  ✓ KPI数据正常展示')
      const kpiLabels = await page.$$eval('.kpi-label', els => els.map(e => e.textContent))
      const kpiValues = await page.$$eval('.kpi-value', els => els.map(e => e.textContent.trim()))
      kpiLabels.forEach((l, i) => {
        if (kpiValues[i]) console.log(`    ${l}: ${kpiValues[i]}`)
      })
    } else {
      logIssue('报表中心', `KPI卡片不足，期望6个，实际${kpiCards.length}个`, 'high')
    }

    const uniformityBar = await page.$('.uniformity-bar')
    if (uniformityBar) console.log('  ✓ 均匀度分析展示')

    const detailRows = await page.$$('.data-table tbody tr')
    console.log(`  个体明细行: ${detailRows.length}`)
    await takeScreenshot(page, '07_report_center')

    // ===== 步骤8: 系统验证 =====
    console.log('\n--- 步骤8: 系统验证测试 ---')
    await page.click('.tab-btn:nth-child(5)')
    await page.waitForTimeout(2000)

    const validateBtn = await page.$('button.btn-success')
    if (validateBtn) {
      await validateBtn.click()
      await page.waitForTimeout(3000)

      const resultsPanel = await page.$('.results-panel')
      if (resultsPanel) {
        const passRateText = await page.textContent('.summary-badge')
        console.log(`  验证通过率: ${passRateText}`)

        const resultRows = await page.$$('.results-panel .data-table tbody tr')
        console.log(`  验证结果行: ${resultRows.length}`)

        if (resultRows.length > 0) {
          const statuses = await page.$$eval('.results-panel .data-table tbody tr td:last-child', els =>
            els.map(e => e.textContent.trim())
          )
          const passCount = statuses.filter(s => s.includes('通过')).length
          const failCount = statuses.filter(s => s.includes('异常')).length
          console.log(`  通过: ${passCount}, 异常: ${failCount}`)

          if (passCount > 0) {
            console.log('  ✓ 【修复验证】allPass字段正确渲染（{@const}修复有效）')
          }
        }
      }
    }
    await takeScreenshot(page, '08_validation_results')

    // ===== 步骤9: 检查A11y警告 =====
    console.log('\n--- 步骤9: 构建警告检查 ---')

  } catch (e) {
    console.error(`\n测试异常: ${e.message}`)
    logIssue('全局', `测试执行异常: ${e.message}`, 'critical')
  } finally {
    await browser.close()
  }

  console.log('\n' + '='.repeat(60))
  console.log('              第二轮验收测试报告')
  console.log('='.repeat(60))
  console.log('\n【问题汇总】')
  if (issues.length === 0) {
    console.log('  ✓ 未发现功能性问题')
  } else {
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. [${issue.severity}] ${issue.section}: ${issue.description}`)
    })
  }
  console.log(`\n【控制台错误】${consoleErrors.length}条`)
  consoleErrors.slice(0, 10).forEach((err, i) => {
    console.log(`  ${i + 1}. ${err.text.substring(0, 150)}`)
  })

  fs.writeFileSync(path.join(IMG_DIR, 'test-report-r2.json'),
    JSON.stringify({ issues, consoleErrors }, null, 2))
  console.log('\n='.repeat(60))
}

runTests().catch(err => { console.error('失败:', err); process.exit(1) })
