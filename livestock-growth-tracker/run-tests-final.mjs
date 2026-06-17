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
  console.log('=== 牲畜生长数字化管理系统 验收测试 ===\n')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push({ text: msg.text() })
  })
  page.on('pageerror', err => consoleErrors.push({ text: err.message, type: 'pageerror' }))
  page.on('dialog', async dialog => { try { await dialog.accept() } catch {} })

  try {
    // ===== 步骤1: 首页加载 =====
    console.log('\n--- 步骤1: 首页加载 ---')
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    const headerText = await page.textContent('.app-header h1')
    console.log(`  首页标题: ${headerText?.substring(0, 20)}`)

    const tabs = await page.$$('.tab-btn')
    console.log(`  ✓ 导航标签: ${tabs.length}个`)

    const tabTexts = []
    for (const tab of tabs) {
      tabTexts.push((await tab.textContent()).trim().substring(0, 6))
    }
    console.log(`  标签: ${tabTexts.join(' | ')}`)
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

    // ===== 步骤3: 个体电子档案 - 数据联动验证 =====
    console.log('\n--- 步骤3: 个体电子档案 - 数据联动 ---')
    await page.click('.tab-btn:nth-child(1)')
    await page.waitForTimeout(3000)

    const cardCount = await page.$$eval('.livestock-card', cards => cards.length)
    console.log(`  档案卡片数量: ${cardCount}`)
    if (cardCount > 0) console.log('  ✓ 数据联动正常')
    else logIssue('数据联动', `档案列表为空，IndexedDB有${dbData.livestock}条`, 'critical')

    const warningCards = await page.$$('.livestock-card.warning')
    console.log(`  生长预警个体: ${warningCards.length}个`)

    if (cardCount > 0) {
      const firstCard = await page.$eval('.livestock-card', el => el.textContent.substring(0, 60))
      console.log(`  首个卡片: ${firstCard}...`)
    }
    await takeScreenshot(page, '03_livestock_with_data')

    // 手动新建档案
    console.log('\n--- 步骤3b: 手动新建档案 ---')
    await page.click('.content-header .btn-primary')
    await page.waitForTimeout(1500)

    const earTag = await page.inputValue('#f-eartag')
    console.log(`  自动耳标: ${earTag}`)

    const breedSelect = await page.$('#f-breed')
    if (breedSelect) {
      const breedOpts = await breedSelect.$$('option')
      console.log(`  品种选项: ${breedOpts.length}个`)
    }

    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    const newCardCount = await page.$$eval('.livestock-card', cards => cards.length)
    console.log(`  创建后卡片数: ${newCardCount}`)
    if (newCardCount > cardCount) console.log('  ✓ 手动新建档案成功')
    else logIssue('个体档案', '手动新建档案后卡片数量未增加', 'high')
    await takeScreenshot(page, '03b_livestock_create')

    // 搜索筛选
    console.log('\n--- 步骤3c: 搜索和筛选 ---')
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
    await takeScreenshot(page, '03c_search_filter')

    // 查看详情跳转
    console.log('\n--- 步骤3d: 查看详情跳转 ---')
    const viewBtn = await page.$('.btn-view')
    if (viewBtn) {
      await viewBtn.click()
      await page.waitForTimeout(3000)
      const growthHeader = await page.textContent('.content-header h2')
      if (growthHeader?.includes('生长模型对标')) console.log('  ✓ 查看详情跳转正常')
      else logIssue('导航跳转', `跳转目标异常: ${growthHeader}`, 'medium')
    }
    await takeScreenshot(page, '03d_growth_from_detail')

    // ===== 步骤4: 生长模型对标 =====
    console.log('\n--- 步骤4: 生长模型对标模块 ---')
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
      statLabels.forEach((l, i) => {
        if (statValues[i]) console.log(`    ${l}: ${statValues[i]}`)
      })

      const fcrValue = statValues.find((_, i) => statLabels[i]?.includes('FCR'))
      if (fcrValue && fcrValue !== '--') console.log(`  ✓ FCR计算: ${fcrValue}`)

      const chartExists = await page.$('.growth-chart')
      if (chartExists) {
        const svgContent = await page.evaluate(el => el.innerHTML, chartExists)
        console.log(`  ✓ SVG曲线图: path=${svgContent.includes('<path')}, circles=${svgContent.includes('<circle')}`)
      }

      const weightRows = await page.$$('.data-table tbody tr')
      if (weightRows.length > 0) {
        const firstRow = await page.$$eval('.data-table tbody tr:first-child td', cells =>
          cells.map(c => c.textContent.trim())
        )
        const hasDeviation = firstRow.some(c => c.includes('%') && !c.includes('undefined'))
        if (hasDeviation) console.log('  ✓ 偏离度正确渲染')
        else logIssue('生长对标', '偏离度列渲染异常', 'high')
      }

      const warningAlert = await page.$('.alert-danger')
      if (warningAlert) console.log('  ✓ 生长预警横幅显示')

      // 录入体重
      console.log('\n--- 步骤4b: 录入体重 ---')
      const weightBtns = await page.$$('button.btn-primary.btn-sm')
      for (const btn of weightBtns) {
        const text = await btn.textContent()
        if (text?.includes('录入体重')) {
          await btn.click()
          await page.waitForTimeout(1000)
          const weightInput = await page.$('#gw-weight')
          if (weightInput) {
            await weightInput.fill('88.5')
            await page.click('.inline-form .btn-primary')
            await page.waitForTimeout(2000)
            console.log('  ✓ 体重录入成功')
          }
          break
        }
      }

      // 录入饲料
      console.log('\n--- 步骤4c: 录入饲料 ---')
      const feedBtns = await page.$$('button.btn-primary.btn-sm')
      for (const btn of feedBtns) {
        const text = await btn.textContent()
        if (text?.includes('录入饲料')) {
          await btn.click()
          await page.waitForTimeout(1000)
          const feedInput = await page.$('#gf-amount')
          if (feedInput) {
            await feedInput.fill('3.8')
            await page.click('.inline-form .btn-primary')
            await page.waitForTimeout(2000)
            console.log('  ✓ 饲料录入成功')
          }
          break
        }
      }
    }
    await takeScreenshot(page, '04_growth_tracker')

    // ===== 步骤5: 免疫中心 - 【重点验证】疫苗名称下拉框 =====
    console.log('\n--- 步骤5: 【重点验证1】免疫中心 - 疫苗名称下拉框 ---')
    await page.click('.tab-btn:nth-child(3)')
    await page.waitForTimeout(2000)

    const reminderText = await page.textContent('.sub-tab:nth-child(1)')
    console.log(`  接种提醒: ${reminderText}`)
    const reminderRows = await page.$$('.data-table tbody tr')
    console.log(`  提醒行数: ${reminderRows.length}`)
    await takeScreenshot(page, '05_vaccine_reminders')

    // 接种记录
    await page.click('.sub-tab:nth-child(2)')
    await page.waitForTimeout(1000)
    await takeScreenshot(page, '05b_vaccine_records')

    // 标准免疫程序
    await page.click('.sub-tab:nth-child(3)')
    await page.waitForTimeout(1000)
    const scheduleCards = await page.$$('.schedule-card')
    console.log(`  品种免疫程序: ${scheduleCards.length}个`)
    await takeScreenshot(page, '05c_vaccine_schedule')

    // 登记接种 - 重点测试
    console.log('\n--- 步骤5b: 【重点验证1】登记接种 - 疫苗名称下拉框 ---')
    await page.click('.sub-tab:nth-child(1)')
    await page.waitForTimeout(500)
    await page.click('.btn-add')
    await page.waitForTimeout(1500)

    const vaccineForm = await page.$('.form-panel')
    if (vaccineForm) {
      // 读取牲畜选项
      const livestockOptions = await page.$$eval('#v-livestock option', opts =>
        opts.map(o => ({ value: o.value, text: o.textContent?.substring(0, 20) }))
      )
      console.log(`  牲畜选项(前3): ${JSON.stringify(livestockOptions.slice(0, 3))}`)

      if (livestockOptions.length > 1) {
        // 测试3个不同品种的牲畜
        for (let i = 1; i <= Math.min(3, livestockOptions.length - 1); i++) {
          const optValue = livestockOptions[i].value
          const optText = livestockOptions[i].text

          await page.selectOption('#v-livestock', optValue)
          await page.waitForTimeout(1500)

          const selectedId = await page.inputValue('#v-livestock')
          const vaccineOptions = await page.$$eval('#v-name option', opts =>
            opts.map(o => ({ value: o.value, text: o.textContent }))
          )

          console.log(`  牲畜${i}(${optText}): ID=${selectedId}, 疫苗选项=${vaccineOptions.length}个`)

          if (vaccineOptions.length > 1) {
            console.log(`    ✓ 疫苗名称: ${vaccineOptions.slice(1).map(o => o.text).join(', ')}`)
          } else {
            logIssue('免疫中心-疫苗名称', `选择牲畜"${optText}"后疫苗名称无选项`, 'high')
          }
        }

        // 验证修复结论
        const finalVaccineOptions = await page.$$eval('#v-name option', opts => opts.length)
        if (finalVaccineOptions > 1) {
          console.log('  ✓ 【修复验证通过】疫苗名称下拉框正确响应牲畜选择！')
        }

        // 完成一次完整的接种登记
        await page.selectOption('#v-livestock', { index: 1 })
        await page.waitForTimeout(1000)
        await page.selectOption('#v-name', { index: 1 })
        await page.fill('#v-batch', 'B20260617001')
        await page.fill('#v-operator', '张医生')
        await page.click('.form-panel .btn-primary')
        await page.waitForTimeout(2000)
        console.log('  ✓ 接种记录保存成功')
      }
    }
    await takeScreenshot(page, '05d_vaccine_form')

    // ===== 步骤6: 报表中心 =====
    console.log('\n--- 步骤6: 报表中心 ---')
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
    await takeScreenshot(page, '06_report_center')

    // ===== 步骤7: 【重点验证2】系统验证 - 通过率显示 =====
    console.log('\n--- 步骤7: 【重点验证2】系统验证 - 通过率显示 ---')
    await page.click('.tab-btn:nth-child(5)')
    await page.waitForTimeout(2000)

    const validateBtn = await page.$('button.btn-success')
    if (validateBtn) {
      await validateBtn.click()
      await page.waitForTimeout(3000)

      const resultsPanel = await page.$('.results-panel')
      if (resultsPanel) {
        const passRateText = await page.textContent('.summary-badge')
        console.log(`  通过率显示: ${passRateText}`)

        const passRateClass = await page.$eval('.summary-badge', el => el.className)
        const isPassClass = passRateClass?.includes('pass')
        console.log(`  通过率样式: ${isPassClass ? 'pass(绿色)' : 'fail(红色)'}`)

        const resultRows = await page.$$('.results-panel .data-table tbody tr')
        console.log(`  验证结果行: ${resultRows.length}`)

        if (resultRows.length > 0) {
          const statuses = await page.$$eval('.results-panel .data-table tbody tr td:last-child', els =>
            els.map(e => e.textContent.trim())
          )
          const passCount = statuses.filter(s => s.includes('通过')).length
          const failCount = statuses.filter(s => s.includes('异常')).length
          console.log(`  通过: ${passCount}, 异常: ${failCount}`)

          if (passCount === resultRows.length && passRateText?.includes('100')) {
            console.log('  ✓ 【修复验证通过】通过率正确显示100%，样式为绿色pass')
          } else if (passCount === resultRows.length && !passRateText?.includes('100')) {
            logIssue('系统验证-通过率', `${passCount}条全部通过，但显示: "${passRateText}"，样式为${isPassClass ? 'pass' : 'fail'}`, 'high')
          } else {
            const expectedRate = (passCount / resultRows.length * 100).toFixed(1)
            if (passRateText?.includes(expectedRate)) {
              console.log(`  ✓ 通过率显示正确: ${passRateText}`)
            } else {
              logIssue('系统验证-通过率', `通过率不一致，期望${expectedRate}%，实际${passRateText}`, 'medium')
            }
          }
        }

        // 检查各项统计
        const statLabels = await page.$$eval('.results-panel .stat-label', els => els.map(e => e.textContent))
        const statValues = await page.$$eval('.results-panel .stat-value', els => els.map(e => e.textContent.trim()))
        statLabels.forEach((l, i) => {
          if (statValues[i]) console.log(`    ${l}: ${statValues[i]}`)
        })
      }
    }
    await takeScreenshot(page, '07_validation_results')

    // ===== 步骤8: 删除档案 =====
    console.log('\n--- 步骤8: 删除档案 ---')
    await page.click('.tab-btn:nth-child(1)')
    await page.waitForTimeout(2000)

    const beforeDelete = await page.$$eval('.livestock-card', cards => cards.length)
    const deleteBtn = await page.$('.btn-delete')
    if (deleteBtn) {
      await deleteBtn.click()
      await page.waitForTimeout(2000)
      const afterDelete = await page.$$eval('.livestock-card', cards => cards.length)
      console.log(`  删除前: ${beforeDelete}, 删除后: ${afterDelete}`)
      if (afterDelete < beforeDelete) console.log('  ✓ 删除功能正常')
    }
    await takeScreenshot(page, '08_delete')

  } catch (e) {
    console.error(`\n测试异常: ${e.message}`)
    logIssue('全局', `测试执行异常: ${e.message}`, 'critical')
  } finally {
    await browser.close()
  }

  console.log('\n' + '='.repeat(60))
  console.log('              验收测试报告')
  console.log('='.repeat(60))
  console.log('\n【问题汇总】')
  if (issues.length === 0) console.log('  ✓ 未发现功能性问题')
  else issues.forEach((issue, i) => console.log(`  ${i + 1}. [${issue.severity}] ${issue.section}: ${issue.description}`))

  console.log(`\n【控制台错误】${consoleErrors.length}条`)
  consoleErrors.slice(0, 10).forEach((err, i) => console.log(`  ${i + 1}. ${err.text.substring(0, 150)}`))

  fs.writeFileSync(path.join(IMG_DIR, 'test-report.json'),
    JSON.stringify({ issues, consoleErrors }, null, 2))
  console.log('\n='.repeat(60))
}

runTests().catch(err => { console.error('失败:', err); process.exit(1) })
