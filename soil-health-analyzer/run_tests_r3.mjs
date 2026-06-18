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

  try {
    // ============ 测试1: 首页仪表盘 - latest记录同步 ============
    log('\n=== 测试1: Dashboard数据联动 ===');

    // 先直接API插入一条数据确保有记录
    await page.goto(`${BASE_URL}/assessment`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.locator('input[name="ph"]').fill('5.0');
    await page.locator('input[name="organicMatter"]').fill('10');
    await page.locator('input[name="totalNitrogen"]').fill('0.8');
    await page.locator('input[name="availablePhosphorus"]').fill('8');
    await page.locator('input[name="availablePotassium"]').fill('80');
    await page.getByRole('button', { name: /计算健康指数/ }).click();
    await page.waitForTimeout(2500);
    await safeScreenshot(page, 'r3_01_assessment_ph5_result.png');

    // 立即跳转到Dashboard看是否同步
    log('跳转到Dashboard验证数据联动...');
    await page.getByText('首页仪表盘').first().click();
    await page.waitForTimeout(2500);
    await safeScreenshot(page, 'r3_02_dashboard_after_assessment.png');

    const dashText = await page.locator('body').innerText();

    // 检查SHI值（应该是约54，不是--）
    const shiOnDash = dashText.match(/SHI健康指数\s*([\d.]+)/);
    const hasSHI = shiOnDash && parseFloat(shiOnDash[1]) > 30;
    log(`Dashboard SHI值: ${shiOnDash ? shiOnDash[1] : '未找到'}`);

    if (hasSHI) {
      addPass('Dashboard联动', `返回首页后SHI指数已同步显示: ${shiOnDash[1]}`);
    } else {
      const dashDisplayValue = await page.locator('text=/SHI健康指数/ .. p').allTextContents().catch(() => []);
      addIssue('high', 'Dashboard首页', 
        '完成评价后返回首页，SHI健康指数未同步显示',
        `期望显示约54，实际显示: ${dashDisplayValue.join(',') || '空'}`);
    }

    // 检查退化类型和等级
    const hasGradeOnDash = dashText.includes('差') || dashText.includes('中') || dashText.includes('良') || dashText.includes('优');
    const hasDegradationOnDash = dashText.includes('酸化') || dashText.includes('板结');

    if (hasGradeOnDash) addPass('Dashboard联动', '等级评定已同步显示');
    else addIssue('medium', 'Dashboard首页', '等级评定未同步', '应显示"差/中/良/优"其中之一');

    if (hasDegradationOnDash) addPass('Dashboard联动', '退化类型已同步显示');
    else addIssue('medium', 'Dashboard首页', '退化类型未同步', '应显示"酸化/板结"等退化类型');

    // ============ 测试2: 输入校验 ============
    log('\n=== 测试2: 评价页面输入校验 ===');
    await page.getByText('健康指数评价').first().click();
    await page.waitForTimeout(1500);

    // 测试异常pH
    log('测试pH异常(15)...');
    await page.locator('input[name="ph"]').fill('15');
    await page.locator('input[name="organicMatter"]').fill('10');
    await page.locator('input[name="totalNitrogen"]').fill('0.8');
    await page.locator('input[name="availablePhosphorus"]').fill('8');
    await page.locator('input[name="availablePotassium"]').fill('80');
    await page.getByRole('button', { name: /计算健康指数/ }).click();
    await page.waitForTimeout(800);
    await safeScreenshot(page, 'r3_03_validation_ph_error.png');

    const text1 = await page.locator('body').innerText();
    const hasPhError = text1.includes('pH值必须在 0-14 范围内');
    log(`pH 15是否有错误提示: ${hasPhError}`);

    if (hasPhError) addPass('输入校验', 'pH=15被正确拦截并提示范围错误');
    else addIssue('high', 'Assessment输入校验', 'pH=15无错误提示', '应显示"pH值必须在 0-14 范围内"');

    // 测试负数
    log('测试有机质=-5...');
    await page.locator('input[name="ph"]').fill('7.0');
    await page.locator('input[name="organicMatter"]').fill('-5');
    await page.getByRole('button', { name: /计算健康指数/ }).click();
    await page.waitForTimeout(800);
    await safeScreenshot(page, 'r3_04_validation_negative.png');

    const text2 = await page.locator('body').innerText();
    const hasNegError = text2.includes('有机质不能为负数');
    log(`有机质=-5是否有错误提示: ${hasNegError}`);

    if (hasNegError) addPass('输入校验', '有机质=-5被正确拦截并提示负数错误');
    else addIssue('high', 'Assessment输入校验', '有机质=-5无错误提示', '应显示"有机质不能为负数"');

    // 恢复正常值并计算
    log('恢复正常值并计算...');
    await page.locator('input[name="ph"]').fill('5.0');
    await page.locator('input[name="organicMatter"]').fill('10');
    await page.getByRole('button', { name: /计算健康指数/ }).click();
    await page.waitForTimeout(2500);

    // ============ 测试3: 板结土壤改良处方 ============
    log('\n=== 测试3: 板结土壤(有机质低)改良处方 ===');
    // 先输入一个板结场景的数据: pH正常(6.8), 有机质低(8)
    await page.locator('input[name="ph"]').fill('6.8');
    await page.locator('input[name="organicMatter"]').fill('8');
    await page.locator('input[name="totalNitrogen"]').fill('1.2');
    await page.locator('input[name="availablePhosphorus"]').fill('15');
    await page.locator('input[name="availablePotassium"]').fill('120');
    await page.getByRole('button', { name: /计算健康指数/ }).click();
    await page.waitForTimeout(2500);
    await safeScreenshot(page, 'r3_05_assessment_compaction.png');

    // 验证退化类型中是否包含板结
    const compactionText = await page.locator('body').innerText();
    const hasCompaction = compactionText.includes('板结');
    log(`退化类型是否包含"板结": ${hasCompaction}`);

    // 跳转到处方页
    await page.getByText('改良处方生成').first().click();
    await page.waitForTimeout(3000);
    await safeScreenshot(page, 'r3_06_prescription_compaction.png');

    const presText = await page.locator('body').innerText();

    // 验证板结改良卡片是否显示有机肥
    const compactionSection = presText.includes('有机肥施用量');
    // 检查板结改良是否不是"无需"
    const needCompaction = !presText.includes('无需板结改良');
    const hasOrganicFert = presText.includes('kg/亩') && presText.includes('有机肥');

    log(`处方页是否显示有机肥施用量: ${hasOrganicFert}`);
    log(`处方页是否需要板结改良: ${needCompaction}`);

    if (hasCompaction && needCompaction) {
      addPass('板结处方', '有机质低(8g/kg)正确识别为板结，且处方页给出板结改良方案');
    } else if (!hasCompaction) {
      addIssue('high', 'Assessment诊断', '有机质8g/kg(pH6.8)未识别为板结退化类型',
        '有机质<15g/kg应标记为板结');
    } else if (!needCompaction) {
      addIssue('critical', 'Prescription处方', 
        '有机质低(板结)时仍显示"无需板结改良"，改良方案未生效',
        'SHI约38.1、退化类型=板结时，应显示有机肥施用方案而非"无需板结改良"');
    }

    // 提取有机肥用量
    let compactionDosage = null;
    const lines = presText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('板结改良') || lines[i].includes('有机肥施用量')) {
        const nearby = lines.slice(i, i + 5).join(' ');
        const m = nearby.match(/(\d+)\s*kg\/亩/);
        if (m) { compactionDosage = m[1]; break; }
      }
    }
    if (compactionDosage) {
      log(`检测到板结有机肥用量: ${compactionDosage} kg/亩`);
      if (parseInt(compactionDosage) > 0) {
        addPass('板结处方', `有机肥用量 ${compactionDosage} kg/亩，剂量合理`);
      }
    }

    // ============ 测试4: 酸性土壤石灰推荐 ============
    log('\n=== 测试4: 酸性土壤(pH 5.0)石灰推荐(回归测试) ===');
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
    await safeScreenshot(page, 'r3_07_prescription_acidic.png');

    const acidicPresText = await page.locator('body').innerText();
    const hasLime = acidicPresText.includes('石灰');
    const limeMatch = acidicPresText.match(/(\d+)\s*kg\/亩/);
    let limeDosage = limeMatch ? parseInt(limeMatch[1]) : null;

    if (hasLime && limeDosage >= 50 && limeDosage <= 200) {
      addPass('酸性处方', `pH 5.0推荐石灰 ${limeDosage} kg/亩，核心验证通过`);
    } else {
      addIssue('critical', 'Prescription处方', 
        'pH 5.0酸性土壤石灰推荐异常', 
        `实际: ${hasLime ? `${limeDosage}kg/亩` : '未显示石灰'}`);
    }

    // ============ 测试5: Prescription useEffect无限循环风险验证 ============
    log('\n=== 测试5: Prescription请求次数验证(无限循环风险) ===');
    // 记录API请求次数
    let prescriptionFetchCount = 0;
    page.on('request', req => {
      if (req.url().includes('/api/prescription') && req.method() === 'POST') {
        prescriptionFetchCount++;
        log(`POST /api/prescription 请求次数: ${prescriptionFetchCount}`);
      }
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    log(`刷新处方页后请求次数: ${prescriptionFetchCount}`);

    if (prescriptionFetchCount <= 1) {
      addPass('Prescription性能', `处方页加载仅请求${prescriptionFetchCount}次API，无无限循环`);
    } else {
      addIssue('high', 'Prescription useEffect', 
        `处方页加载请求了${prescriptionFetchCount}次API，存在无限循环风险`,
        '正常应只请求1次');
    }

    // ============ 测试6: API直连验证SHI ============
    log('\n=== 测试6: API直连验证数值正确性 ===');

    log('\n=== 测试完成 ===');

  } catch (err) {
    log(`测试异常: ${err.message}`);
    addIssue('critical', '测试流程', `异常中断: ${err.message}`, err.stack?.substring(0, 500));
    await safeScreenshot(page, 'r3_error_crash.png');
  } finally {
    await browser.close();
  }

  console.log('\n\n========================================');
  console.log('   土壤健康诊断系统 - 第三轮测试报告');
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

  const report = {
    round: 3,
    timestamp: new Date().toISOString(),
    passed,
    issues,
    consoleErrors,
  };
  fs.writeFileSync(path.join(IMG_DIR, 'test-report-r3.json'), JSON.stringify(report, null, 2));
  console.log(`\n报告已保存: ${path.join(IMG_DIR, 'test-report-r3.json')}`);
}

test().catch(err => {
  console.error('测试脚本崩溃:', err);
  process.exit(1);
});
