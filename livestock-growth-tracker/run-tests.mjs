import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const IMG_DIR = path.join(process.cwd(), 'img')
const BASE_URL = 'http://localhost:5173'

if (!fs.existsSync(IMG_DIR)) {
  fs.mkdirSync(IMG_DIR, { recursive: true })
}

const issues = []
const consoleErrors = []

function logIssue(section, description, severity = 'medium') {
  const issue = { section, description, severity, timestamp: new Date().toISOString() }
  issues.push(issue)
  console.log(`[问题-${severity}] ${section}: ${description}`)
}

async function takeScreenshot(page, name) {
  const filePath = path.join(IMG_DIR, `${name}.png`)
  await page.screenshot({ path: filePath, fullPage: true })
  console.log(`截图已保存: ${filePath}`)
  return filePath
}

async function runTests() {
  console.log('=== 牲畜生长数字化管理系统 测试开始 ===')
  console.log(`测试URL: ${BASE_URL}`)
  console.log('')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), location: msg.location() })
      console.log(`[控制台错误] ${msg.text()}`)
    }
  })

  page.on('pageerror', err => {
    consoleErrors.push({ text: err.message, type: 'pageerror' })
    console.log(`[页面错误] ${err.message}`)
  })

  try {
    // ========== 测试1: 首页加载 ==========
    console.log('\n--- 测试1: 首页加载 ---')
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(2000)
      
      const title = await page.title()
      console.log(`页面标题: ${title}`)
      
      const headerText = await page.textContent('.app-header h1')
      if (headerText && headerText.includes('牲畜生长数字化管理系统')) {
        console.log('✓ 首页标题正确')
      } else {
        logIssue('首页', `标题不符合预期，实际内容: "${headerText}"`, 'high')
      }
      
      const tabs = await page.$$('.tab-btn')
      console.log(`导航标签数量: ${tabs.length}`)
      if (tabs.length >= 5) {
        console.log('✓ 导航标签完整')
      } else {
        logIssue('首页', `导航标签数量不足，期望至少5个，实际${tabs.length}个`, 'high')
      }
      
      await takeScreenshot(page, '01_homepage')
    } catch (e) {
      logIssue('首页', `加载失败: ${e.message}`, 'critical')
      await takeScreenshot(page, '01_homepage_error')
    }

    // ========== 测试2: 个体电子档案模块 ==========
    console.log('\n--- 测试2: 个体电子档案模块 ---')
    try {
      await page.click('.tab-btn:nth-child(1)')
      await page.waitForTimeout(1500)
      
      const contentHeader = await page.textContent('.content-header h2')
      console.log(`当前模块: ${contentHeader}`)
      
      // 检查空状态
      const emptyState = await page.$('.empty-state')
      if (emptyState) {
        console.log('✓ 空状态正常显示')
      }
      
      // 点击新建档案
      await page.click('button.btn-primary')
      await page.waitForTimeout(1500)
      
      const formExists = await page.$('.form-panel')
      if (formExists) {
        console.log('✓ 新建档案表单已打开')
        
        const earTagValue = await page.inputValue('#f-eartag')
        console.log(`自动生成耳标: ${earTagValue}`)
        
        if (earTagValue && earTagValue.startsWith('ET')) {
          console.log('✓ 耳标格式正确')
        } else {
          logIssue('个体档案', `耳标格式不正确，实际: "${earTagValue}"`, 'medium')
        }
        
        await takeScreenshot(page, '02_livestock_form')
        
        // 取消返回
        await page.click('button.btn-secondary')
        await page.waitForTimeout(1000)
      } else {
        logIssue('个体档案', '新建档案表单无法打开', 'high')
      }
      
      await takeScreenshot(page, '02_livestock_list')
    } catch (e) {
      logIssue('个体档案', `测试异常: ${e.message}`, 'high')
      await takeScreenshot(page, '02_livestock_error')
    }

    // ========== 测试3: 系统验证模块 - 生成模拟数据 ==========
    console.log('\n--- 测试3: 系统验证模块 - 生成模拟数据 ---')
    try {
      await page.click('.tab-btn:nth-child(5)')
      await page.waitForTimeout(1500)
      
      const validationHeader = await page.textContent('.content-header h2')
      console.log(`当前模块: ${validationHeader}`)
      
      const panels = await page.$$('.panel')
      console.log(`功能面板数量: ${panels.length}`)
      
      // 清空旧数据（如果有的话）
      const clearBtn = await page.$('button.btn-danger')
      if (clearBtn) {
        console.log('检测到清空按钮，准备清空旧数据...')
      }
      
      // 生成模拟数据
      await takeScreenshot(page, '03_validation_before')
      
      page.once('dialog', async dialog => {
        console.log(`对话框消息: ${dialog.message()}`)
        await dialog.accept()
      })
      
      const generateBtn = await page.$('button.btn-primary.btn-large')
      if (generateBtn) {
        await generateBtn.click()
        await page.waitForTimeout(5000)
        console.log('✓ 模拟数据生成按钮已点击')
      } else {
        logIssue('系统验证', '找不到生成模拟数据按钮', 'high')
      }
      
      await takeScreenshot(page, '03_validation_after_generate')
    } catch (e) {
      logIssue('系统验证', `生成模拟数据异常: ${e.message}`, 'high')
      await takeScreenshot(page, '03_validation_error')
    }

    // ========== 测试4: 生成数据后检查个体档案 ==========
    console.log('\n--- 测试4: 生成数据后检查个体档案 ---')
    try {
      await page.click('.tab-btn:nth-child(1)')
      await page.waitForTimeout(3000)
      
      const cards = await page.$$('.livestock-card')
      console.log(`档案卡片数量: ${cards.length}`)
      
      if (cards.length > 0) {
        console.log(`✓ 成功生成 ${cards.length} 条档案`)
        
        const warningCards = await page.$$('.livestock-card.warning')
        console.log(`生长预警个体数量: ${warningCards.length}`)
        
        if (warningCards.length > 0) {
          console.log('✓ 生长预警功能正常显示')
        }
      } else {
        logIssue('个体档案', '模拟数据生成后没有档案记录', 'high')
      }
      
      await takeScreenshot(page, '04_livestock_with_data')
    } catch (e) {
      logIssue('个体档案', `数据展示异常: ${e.message}`, 'high')
      await takeScreenshot(page, '04_livestock_data_error')
    }

    // ========== 测试5: 生长模型对标模块 ==========
    console.log('\n--- 测试5: 生长模型对标模块 ---')
    try {
      await page.click('.tab-btn:nth-child(2)')
      await page.waitForTimeout(1500)
      
      // 选择第一只牲畜
      const select = await page.$('.livestock-select')
      if (select) {
        const options = await select.$$('option')
        console.log(`可选牲畜数量: ${options.length - 1}`)
        
        if (options.length > 1) {
          await select.selectOption({ index: 1 })
          await page.waitForTimeout(3000)
          
          const statCards = await page.$$('.stat-card')
          console.log(`数据卡片数量: ${statCards.length}`)
          
          if (statCards.length >= 4) {
            console.log('✓ 生长统计数据正常展示')
          } else {
            logIssue('生长对标', `统计数据卡片数量不足，期望至少4个，实际${statCards.length}个`, 'medium')
          }
          
          const chartExists = await page.$('.growth-chart')
          if (chartExists) {
            console.log('✓ 生长曲线图正常渲染')
          } else {
            logIssue('生长对标', '生长曲线图未渲染', 'high')
          }
          
          const tables = await page.$$('.data-table')
          console.log(`数据表格数量: ${tables.length}`)
          
          await takeScreenshot(page, '05_growth_tracker')
        } else {
          logIssue('生长对标', '下拉选择中没有牲畜可选', 'medium')
        }
      } else {
        logIssue('生长对标', '找不到牲畜选择下拉框', 'high')
      }
    } catch (e) {
      logIssue('生长对标', `模块测试异常: ${e.message}`, 'high')
      await takeScreenshot(page, '05_growth_error')
    }

    // ========== 测试6: 免疫中心模块 ==========
    console.log('\n--- 测试6: 免疫中心模块 ---')
    try {
      await page.click('.tab-btn:nth-child(3)')
      await page.waitForTimeout(2000)
      
      const subTabs = await page.$$('.sub-tab')
      console.log(`子标签数量: ${subTabs.length}`)
      
      if (subTabs.length >= 3) {
        console.log('✓ 免疫中心子标签完整')
      } else {
        logIssue('免疫中心', `子标签数量不足，期望至少3个，实际${subTabs.length}个`, 'medium')
      }
      
      // 检查接种提醒
      const reminderCount = await page.textContent('.sub-tab:nth-child(1)')
      console.log(`提醒标签内容: ${reminderCount}`)
      
      // 切换到接种记录
      await page.click('.sub-tab:nth-child(2)')
      await page.waitForTimeout(1000)
      
      // 切换到标准免疫程序
      await page.click('.sub-tab:nth-child(3)')
      await page.waitForTimeout(1000)
      
      const scheduleCards = await page.$$('.schedule-card')
      console.log(`品种免疫程序卡片: ${scheduleCards.length}`)
      
      if (scheduleCards.length >= 4) {
        console.log('✓ 标准免疫程序完整')
      }
      
      await takeScreenshot(page, '06_vaccine_center')
    } catch (e) {
      logIssue('免疫中心', `模块测试异常: ${e.message}`, 'high')
      await takeScreenshot(page, '06_vaccine_error')
    }

    // ========== 测试7: 报表中心模块 ==========
    console.log('\n--- 测试7: 报表中心模块 ---')
    try {
      await page.click('.tab-btn:nth-child(4)')
      await page.waitForTimeout(3000)
      
      const kpiCards = await page.$$('.kpi-card')
      console.log(`KPI卡片数量: ${kpiCards.length}`)
      
      if (kpiCards.length >= 6) {
        console.log('✓ KPI统计卡片完整')
      } else {
        logIssue('报表中心', `KPI卡片数量不足，期望至少6个，实际${kpiCards.length}个`, 'medium')
      }
      
      const tables = await page.$$('.data-table')
      if (tables.length >= 1) {
        console.log('✓ 个体明细表格正常渲染')
      }
      
      // 检查均匀度分析
      const uniformityBar = await page.$('.uniformity-bar')
      if (uniformityBar) {
        console.log('✓ 群体均匀度分析正常展示')
      }
      
      await takeScreenshot(page, '07_report_center')
    } catch (e) {
      logIssue('报表中心', `模块测试异常: ${e.message}`, 'high')
      await takeScreenshot(page, '07_report_error')
    }

    // ========== 测试8: 系统验证运行验证测试 ==========
    console.log('\n--- 测试8: 系统验证 - 运行验证测试 ---')
    try {
      await page.click('.tab-btn:nth-child(5)')
      await page.waitForTimeout(2000)
      
      // 运行验证测试
      const validateBtn = await page.$('button.btn-success')
      if (validateBtn) {
        await validateBtn.click()
        await page.waitForTimeout(3000)
        
        const resultsPanel = await page.$('.results-panel')
        if (resultsPanel) {
          console.log('✓ 验证测试结果面板正常展示')
          
          const passRateText = await page.textContent('.summary-badge')
          console.log(`验证通过率: ${passRateText}`)
        } else {
          logIssue('系统验证', '运行验证测试后无结果面板展示', 'medium')
        }
        
        await takeScreenshot(page, '08_validation_results')
      } else {
        logIssue('系统验证', '找不到运行验证测试按钮', 'high')
      }
    } catch (e) {
      logIssue('系统验证', `验证测试异常: ${e.message}`, 'high')
      await takeScreenshot(page, '08_validation_error')
    }

    // ========== 测试9: 检查控制台错误 ==========
    console.log('\n--- 测试9: 控制台错误检查 ---')
    console.log(`收集到控制台错误数量: ${consoleErrors.length}`)
    if (consoleErrors.length > 0) {
      consoleErrors.slice(0, 10).forEach((err, i) => {
        console.log(`  错误${i + 1}: ${err.text}`)
      })
    }

  } catch (e) {
    console.error(`测试执行异常: ${e.message}`)
    logIssue('全局', `测试执行异常: ${e.message}`, 'critical')
  } finally {
    await browser.close()
  }

  // 输出测试报告
  console.log('\n' + '='.repeat(60))
  console.log('                    测试报告')
  console.log('='.repeat(60))
  
  console.log(`\n【问题汇总】`)
  if (issues.length === 0) {
    console.log('  ✓ 未发现功能性问题')
  } else {
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. [${issue.severity}] ${issue.section}: ${issue.description}`)
    })
  }
  
  console.log(`\n【控制台错误】`)
  if (consoleErrors.length === 0) {
    console.log('  ✓ 无控制台错误')
  } else {
    console.log(`  共 ${consoleErrors.length} 条错误`)
  }
  
  console.log(`\n【截图目录】: ${IMG_DIR}`)
  console.log('='.repeat(60))
  
  // 保存报告JSON
  const reportPath = path.join(IMG_DIR, 'test-report.json')
  fs.writeFileSync(reportPath, JSON.stringify({ issues, consoleErrors }, null, 2))
  console.log(`详细报告已保存至: ${reportPath}`)
  
  return { issues, consoleErrors }
}

runTests().catch(err => {
  console.error('测试脚本执行失败:', err)
  process.exit(1)
})
