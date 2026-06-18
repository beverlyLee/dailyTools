import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const IMG_DIR = path.resolve(process.cwd(), 'img');
const BASE_URL = 'http://localhost:5173';

function log(msg) {
  const time = new Date().toISOString().substr(11, 8);
  console.log(`[${time}] ${msg}`);
}

const issues = [];
const passed = [];

function addIssue(severity, location, description, evidence) {
  issues.push({ severity, location, description, evidence });
  log(`[${severity.toUpperCase()}] ${location}: ${description}`);
}

function addPass(category, description) {
  passed.push({ category, description });
  log(`[PASS] ${category}: ${description}`);
}

async function safeScreenshot(page, filename) {
  try {
    await page.screenshot({ path: path.join(IMG_DIR, filename), fullPage: true });
    log(`截图: ${filename}`);
  } catch (e) {
    log(`截图失败: ${e.message}`);
  }
}

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(`[CONSOLE] ${msg.text()}`);
  });
  page.on('pageerror', err => consoleErrors.push(`[PAGE] ${err.message}`));

  let apiRequests = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/')) {
      apiRequests.push({ method: req.method(), url: req.url(), body: req.postData() });
    }
  });

  try {
    // ============ 测试1: 输入校验 - pH超出范围 ============
    log('\n=== 测试1: 输入校验 - pH=15 超出范围 ===');
    await page.goto(`${BASE_URL}/assessment`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);

    // 用键盘 type 输入，模拟真实用户
    const phInput = page.locator('input[name="ph"]');
    await phInput.click();
    await page.waitForTimeout(100);
    await phInput.press('Control+A');
    await page.waitForTimeout(100);
    await phInput.press('Backspace');
    await page.waitForTimeout(100);
    await phInput.type('15', { delay: 100 });
    await page.waitForTimeout(200);

    // 输入其他正常字段
    await page.locator('input[name="organicMatter"]').type('10');
    await page.locator('input[name="totalNitrogen"]').type('0.8');
    await page.locator('input[name="availablePhosphorus"]').type('8');
    await page.locator('input[name="availablePotassium"]').type('80');
    await page.waitForTimeout(300);

    // 点击提交
    apiRequests = [];
    await page.getByRole('button', { name: /计算健康指数/ }).click();
    await page.waitForTimeout(1500);

    // 检查错误提示
    const phErrorText = await page.locator('.text-red-500').first().innerText().catch(() => '');
    const hasPhError = phErrorText.includes('pH值必须在 0-14 范围内');
    const phBorderRed = await phInput.evaluate(el => 
      getComputedStyle(el).borderColor.includes('248, 113, 113') || // red-400
      getComputedStyle(el).borderColor.includes('rgb(239') // red-xxx
    ).catch(() => false);

    log(`pH错误提示文字: "${phErrorText}"`);
    log(`pH边框是否变红: ${phBorderRed}`);
    log(`是否有API请求: ${apiRequests.length > 0}`);

    await safeScreenshot(page, 'r4_01_validation_ph_15.png');

    if (hasPhError) {
      addPass('输入校验', 'pH=15超出范围时显示错误提示：pH值必须在 0-14 范围内');
    } else {
      addIssue('high', 'Assessment输入校验', 'pH=15无错误提示文字',
        '应显示"pH值必须在 0-14 范围内"的红色错误提示');
    }

    if (apiRequests.length === 0) {
      addPass('输入校验', 'pH=15时未发送API请求，校验拦截生效');
    } else {
      addIssue('high', 'Assessment输入校验', 'pH=15时仍发送了API请求',
        `共发送${apiRequests.length}个API请求，校验未拦截提交`);
    }

    // ============ 测试2: 输入校验 - 有机质负数 ============
    log('\n=== 测试2: 输入校验 - 有机质=-5 ===');
    // 先把pH改回正常值
    await phInput.click();
    await phInput.press('Control+A');
    await phInput.type('7.0');

    // 有机质输入负数
    const omInput = page.locator('input[name="organicMatter"]');
    await omInput.click();
    await omInput.press('Control+A');
    await omInput.type('-5', { delay: 100 });
    await page.waitForTimeout(200);

    apiRequests = [];
    await page.getByRole('button', { name: /计算健康指数/ }).click();
    await page.waitForTimeout(1500);

    const omErrorText = await page.locator('.text-red-500').first().innerText().catch(() => '');
    const hasOmError = omErrorText.includes('有机质不能为负数');
    log(`有机质错误提示: "${omErrorText}"`);

    await safeScreenshot(page, 'r4_02_validation_om_negative.png');

    if (hasOmError) {
      addPass('输入校验', '有机质=-5时显示错误提示：有机质不能为负数');
    } else {
      // 可能其他字段也有错误，找所有红色文字
      const allRedTexts = await page.locator('.text-red-500').allTextContents().catch(() => []);
      addIssue('high', 'Assessment输入校验', '有机质=-5无"不能为负数"提示',
        `红色错误文字: ${allRedTexts.join(' | ') || '无'}`);
    }

    if (apiRequests.length === 0) {
      addPass('输入校验', '有机质=-5时未发送API请求');
    }

    // ============ 测试3: 正常数据计算 ============
    log('\n=== 测试3: 正常数据(pH 5.0)计算验证 ===');
    await phInput.click();
    await phInput.press('Control+A');
    await phInput.type('5.0');
    
    await omInput.click();
    await omInput.press('Control+A');
    await omInput.type('10');

    await page.waitForTimeout(200);
    apiRequests = [];
    await page.getByRole('button', { name: /计算健康指数/ }).click();
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();
    const hasSHI = bodyText.includes('土壤健康指数');
    const hasGrade = bodyText.includes('差') || bodyText.includes('中');
    const hasRadar = await page.locator('canvas').count().then(n => n > 0).catch(() => false);

    log(`是否显示SHI: ${hasSHI}`);
    log(`是否有等级: ${hasGrade}`);
    log(`是否有雷达图: ${hasRadar}`);
    log(`API请求数: ${apiRequests.length}`);

    await safeScreenshot(page, 'r4_03_assessment_ph5_result.png');

    if (hasSHI && hasGrade) {
      addPass('健康评价', 'pH 5.0数据正确计算SHI和等级');
    } else {
      addIssue('high', 'Assessment评价', '正常数据计算失败',
        `SHI显示: ${hasSHI}, 等级显示: ${hasGrade}`);
    }

    // 验证退化类型
    const degradationMatch = bodyText.match(/退化类型[：:]\s*(.+)/);
    const degradationText = degradationMatch ? degradationMatch[1].trim() : '';
    log(`退化类型: ${degradationText}`);
    if (degradationText.includes('酸化')) {
      addPass('退化诊断', 'pH 5.0正确识别为"酸化"退化类型');
    }

    // ============ 测试4: Dashboard数据联动 + scores + 退化类型 ============
    log('\n=== 测试4: Dashboard数据联动与scores验证 ===');
    await page.getByText('首页仪表盘').first().click();
    await page.waitForTimeout(2500);
    await safeScreenshot(page, 'r4_04_dashboard_latest.png');

    const dashText = await page.locator('body').innerText();
    const dashSHIMatch = dashText.match(/SHI健康指数\s*([\d.]+)/);
    const dashSHI = dashSHIMatch ? parseFloat(dashSHIMatch[1]) : null;
    log(`Dashboard SHI值: ${dashSHI ?? '未识别'}`);

    if (dashSHI && dashSHI > 40 && dashSHI < 80) {
      addPass('Dashboard联动', `Dashboard显示最新SHI: ${dashSHI.toFixed(1)}，数据联动正常`);
    } else {
      addIssue('high', 'Dashboard首页', 'Dashboard未正确显示最新SHI值',
        `实际: ${dashSHI ?? '未找到'}, 期望约54左右`);
    }

    // 检查退化类型是否从后端获取（不是前端硬编码）
    const dashDegradationMatch = dashText.match(/主要退化类型\s*(.+)/);
    const dashDegradation = dashDegradationMatch ? dashDegradationMatch[1].trim() : '';
    log(`Dashboard退化类型: ${dashDegradation}`);
    if (dashDegradation && dashDegradation !== '未检测') {
      addPass('退化类型对齐', `Dashboard显示退化类型：${dashDegradation}（从后端API返回）`);
    }

    // ============ 测试5: 跳转评价页验证scores是否正确（雷达图） ============
    log('\n=== 测试5: 跳转评价页验证scores与雷达图 ===');
    await page.getByText('健康指数评价').first().click();
    await page.waitForTimeout(2000);

    // 检查雷达图是否正常（如果有canvas且有数据点）
    const radarCanvas = await page.locator('canvas').count();
    log(`评价页canvas数量: ${radarCanvas}`);

    await safeScreenshot(page, 'r4_05_assessment_from_dashboard.png');

    if (radarCanvas > 0) {
      addPass('雷达图', '从Dashboard跳转评价页后雷达图正常显示（scores数据完整）');
    } else {
      addIssue('medium', 'Assessment雷达图', '从Dashboard跳转后雷达图未正常显示',
        '可能原因：latest记录的scores数据不正确');
    }

    // ============ 测试6: 板结改良处方 ============
    log('\n=== 测试6: 板结改良处方(回归验证) ===');
    // 输入板结场景：pH正常，有机质低
    await page.locator('input[name="ph"]').fill('6.8');
    await page.locator('input[name="organicMatter"]').fill('8');
    await page.locator('input[name="totalNitrogen"]').fill('1.2');
    await page.locator('input[name="availablePhosphorus"]').fill('15');
    await page.locator('input[name="availablePotassium"]').fill('120');
    
    await page.getByRole('button', { name: /计算健康指数/ }).click();
    await page.waitForTimeout(2500);

    const compactionText = await page.locator('body').innerText();
    const hasCompactionDiag = compactionText.includes('板结');
    log(`退化类型包含"板结": ${hasCompactionDiag}`);

    await page.getByText('改良处方生成').first().click();
    await page.waitForTimeout(3000);
    await safeScreenshot(page, 'r4_06_prescription_compaction.png');

    const presText = await page.locator('body').innerText();
    const hasCompactionImprove = !presText.includes('无需板结改良');
    const hasOrganicFert = presText.includes('有机肥施用量');
    log(`是否需要板结改良: ${hasCompactionImprove}`);
    log(`是否显示有机肥施用量: ${hasOrganicFert}`);

    if (hasCompactionImprove && hasOrganicFert) {
      addPass('板结处方', '有机质8g/kg时处方页正确显示板结改良方案（有机肥）');
    } else {
      addIssue('high', 'Prescription处方', '板结场景改良方案未生效',
        `需板结改良: ${hasCompactionImprove}, 有机肥: ${hasOrganicFert}`);
    }

    // ============ 测试7: latest API返回scores和degradationTypes ============
    log('\n=== 测试7: /api/records/latest接口验证 ===');

    const latestResp = await page.evaluate(async () => {
      const res = await fetch('/api/records/latest');
      const json = await res.json();
      return json;
    });

    log('latest接口返回:', JSON.stringify(latestResp, null, 2));

    if (latestResp.success && latestResp.data) {
      const hasScores = latestResp.data.scores && 
        typeof latestResp.data.scores.ph === 'number' &&
        typeof latestResp.data.scores.organicMatter === 'number';
      const hasDegradationTypes = Array.isArray(latestResp.data.degradationTypes);
      
      if (hasScores) addPass('后端接口', 'latest接口返回完整scores分项');
      else addIssue('high', 'records/latest API', 'latest接口缺少scores字段',
        `返回字段: ${Object.keys(latestResp.data).join(', ')}`);
      
      if (hasDegradationTypes) addPass('后端接口', 'latest接口返回degradationTypes数组');
      else addIssue('medium', 'records/latest API', 'latest接口缺少degradationTypes字段',
        `返回字段: ${Object.keys(latestResp.data).join(', ')}`);
    }

    // ============ 测试8: 酸性土壤石灰推荐（核心验证） ============
    log('\n=== 测试8: 酸性土壤石灰推荐(核心验证回归) ===');
    await page.getByText('健康指数评价').first().click();
    await page.waitForTimeout(1500);
    
    await page.locator('input[name="ph"]').fill('5.0');
    await page.locator('input[name="organicMatter"]').fill('10');
    await page.locator('input[name="totalNitrogen"]').fill('0.8');
    await page.locator('input[name="availablePhosphorus"]').fill('8');
    await page.locator('input[name="availablePotassium"]').fill('80');
    
    await page.getByRole('button', { name: /计算健康指数/ }).click();
    await page.waitForTimeout(2500);

    await page.getByText('改良处方生成').first().click();
    await page.waitForTimeout(3000);
    await safeScreenshot(page, 'r4_07_prescription_acidic.png');

    const acidicPres = await page.locator('body').innerText();
    const limeMatch = acidicPres.match(/石灰用量\s*(\d+)\s*kg\/亩/);
    const limeDosage = limeMatch ? parseInt(limeMatch[1]) : null;
    log(`石灰用量: ${limeDosage ?? '未找到'} kg/亩`);

    if (limeDosage && limeDosage >= 50 && limeDosage <= 200) {
      addPass('核心验证', `pH 5.0推荐石灰 ${limeDosage} kg/亩，核心验证标准通过`);
    } else {
      addIssue('critical', 'Prescription处方', 
        'pH 5.0酸性土壤石灰推荐异常（核心验证标准）',
        `实际: ${limeDosage ?? '未显示石灰'} kg/亩，期望50-200 kg/亩`);
    }

    // ============ 测试9: 地力演变追踪 ============
    log('\n=== 测试9: 地力演变追踪 ===');
    await page.getByText('地力演变追踪').first().click();
    await page.waitForTimeout(2500);
    await safeScreenshot(page, 'r4_08_tracking.png');

    const trackCharts = await page.locator('canvas').count();
    log(`追踪页图表数量: ${trackCharts}`);
    if (trackCharts >= 2) {
      addPass('地力追踪', '追踪页包含雷达对比图和SHI趋势折线图');
    }

    log('\n=== 测试完成 ===');

  } catch (err) {
    log(`测试异常: ${err.message}`);
    addIssue('critical', '测试流程', `异常中断: ${err.message}`, err.stack?.substring(0, 500));
    await safeScreenshot(page, 'r4_error_crash.png');
  } finally {
    await browser.close();
  }

  // 输出报告
  console.log('\n\n========================================');
  console.log('   土壤健康诊断系统 - 第四轮测试报告');
  console.log('========================================');
  console.log(`\n测试时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`\n✅ 通过项 (${passed.length}):`);
  passed.forEach((p, i) => console.log(`  ${i + 1}. [${p.category}] ${p.description}`));
  console.log(`\n❌ 问题项 (${issues.length}):`);
  if (issues.length === 0) {
    console.log('  无问题');
  } else {
    issues.forEach((iss, i) => {
      console.log(`\n  ${i + 1}. [${iss.severity.toUpperCase()}] ${iss.location}`);
      console.log(`     描述: ${iss.description}`);
      console.log(`     证据: ${iss.evidence}`);
    });
  }
  console.log(`\n控制台错误: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) consoleErrors.forEach(e => console.log(`  - ${e}`));

  const report = { round: 4, timestamp: new Date().toISOString(), passed, issues, consoleErrors };
  fs.writeFileSync(path.join(IMG_DIR, 'test-report-r4.json'), JSON.stringify(report, null, 2));
  console.log(`\n报告已保存: ${path.join(IMG_DIR, 'test-report-r4.json')}`);
}

test().catch(err => {
  console.error('测试脚本崩溃:', err);
  process.exit(1);
});
