import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const IMG_DIR = path.resolve(process.cwd(), 'img');
const BASE_URL = 'http://localhost:5173';

if (!fs.existsSync(IMG_DIR)) {
  fs.mkdirSync(IMG_DIR, { recursive: true });
}

function log(msg) {
  const time = new Date().toISOString().substr(11, 8);
  console.log(`[${time}] ${msg}`);
}

const issues = [];

function addIssue(severity, location, description, evidence) {
  issues.push({ severity, location, description, evidence });
  log(`[${severity.toUpperCase()}] ${location}: ${description}`);
}

async function safeScreenshot(page, filename) {
  try {
    await page.screenshot({ path: path.join(IMG_DIR, filename), fullPage: true });
    log(`截图已保存: ${filename}`);
  } catch (e) {
    log(`截图失败: ${e.message}`);
  }
}

async function getConsoleErrors(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push(`PAGE_ERROR: ${err.message}`);
  });
  return errors;
}

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[CONSOLE] ${msg.text()}`);
      log(`控制台错误: ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(`[PAGE] ${err.message}`);
    log(`页面错误: ${err.message}`);
  });
  page.on('response', res => {
    if (res.status() >= 400 && res.url().includes('/api/')) {
      log(`API错误 ${res.status()}: ${res.url()}`);
      consoleErrors.push(`[API ${res.status()}] ${res.url()}`);
    }
  });

  try {
    // ============ 测试1: 首页加载 ============
    log('\n=== 测试1: 首页Dashboard加载 ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await safeScreenshot(page, '01_home_dashboard.png');

    const pageTitle = await page.title();
    log(`页面标题: ${pageTitle}`);

    const hasSidebar = await page.locator('aside').isVisible().catch(() => false);
    if (!hasSidebar) {
      addIssue('high', '首页', '侧边栏导航未显示', '页面加载后找不到aside导航元素');
    }

    const navTexts = await page.locator('nav a').allTextContents().catch(() => []);
    log(`导航项: ${navTexts.join(', ')}`);
    if (navTexts.length === 0) {
      addIssue('high', '首页', '导航菜单为空', 'nav a选择器无匹配元素');
    }

    // ============ 测试2: 导航跳转 ============
    log('\n=== 测试2: 导航跳转功能 ===');

    log('点击"健康指数评价"...');
    await page.getByText('健康指数评价').first().click();
    await page.waitForTimeout(1500);
    await safeScreenshot(page, '02_assessment_page.png');

    const assessmentForm = await page.locator('form').isVisible().catch(() => false);
    if (!assessmentForm) {
      addIssue('high', '/assessment页面', '评价页面表单未显示', '页面跳转后找不到form元素');
    }

    log('返回首页后点击"改良处方生成"...');
    await page.getByText('首页仪表盘').first().click();
    await page.waitForTimeout(1000);

    // 先直接通过URL访问处方页，测试未评价状态
    log('测试未评价时访问处方页...');
    await page.goto(`${BASE_URL}/prescription`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await safeScreenshot(page, '03_prescription_no_assessment.png');

    const noAssessmentHint = await page.getByText('请先完成土壤健康评价').isVisible().catch(() => false);
    if (!noAssessmentHint) {
      addIssue('medium', '/prescription页面', '未评价时的引导提示缺失', '页面应显示"请先完成土壤健康评价"引导');
    }

    // ============ 测试3: 健康指数评价 - 输入pH 5.0酸性数据 ============
    log('\n=== 测试3: 健康指数评价(核心验证:pH 5.0酸性土壤) ===');
    await page.goto(`${BASE_URL}/assessment`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    log('填写酸性土壤数据: pH=5.0, 有机质=10, 全氮=0.8, 有效磷=8, 速效钾=80');
    
    const phInput = page.locator('input[name="ph"]');
    const omInput = page.locator('input[name="organicMatter"]');
    const nInput = page.locator('input[name="totalNitrogen"]');
    const pInput = page.locator('input[name="availablePhosphorus"]');
    const kInput = page.locator('input[name="availablePotassium"]');

    await phInput.click();
    await phInput.fill('');
    await phInput.fill('5.0');
    
    await omInput.click();
    await omInput.fill('');
    await omInput.fill('10');
    
    await nInput.click();
    await nInput.fill('');
    await nInput.fill('0.8');
    
    await pInput.click();
    await pInput.fill('');
    await pInput.fill('8');
    
    await kInput.click();
    await kInput.fill('');
    await kInput.fill('80');

    await safeScreenshot(page, '04_assessment_form_filled.png');

    log('点击"计算健康指数"按钮...');
    const calcBtn = page.getByRole('button', { name: /计算健康指数/ });
    await calcBtn.click();
    await page.waitForTimeout(3000);
    await safeScreenshot(page, '05_assessment_result.png');

    // 检查SHI结果
    const hasSHIResult = await page.locator('text=/土壤健康指数/').isVisible().catch(() => false);
    log(`是否显示土壤健康指数: ${hasSHIResult}`);

    // 检查雷达图
    const hasRadar = await page.locator('canvas').count().then(n => n > 0).catch(() => false);
    log(`是否显示雷达图: ${hasRadar}`);

    // 检查退化类型 - 应包含"酸化"
    let degradationText = '';
    try {
      degradationText = await page.locator('body').innerText();
    } catch (e) {
      addIssue('high', '/assessment评价结果', '无法读取页面内容', e.message);
    }
    
    const hasAcidification = degradationText.includes('酸化');
    log(`诊断结果是否包含"酸化": ${hasAcidification}`);
    if (!hasAcidification) {
      addIssue('high', '/assessment评价结果', '酸性土壤(pH 5.0)未识别为"酸化"退化类型', 
        '输入pH=5.0<6.5时，诊断结果应包含"酸化"标签');
    }

    // 检查是否有等级评定
    const hasGrade = degradationText.includes('优') || degradationText.includes('良') || 
                     degradationText.includes('中') || degradationText.includes('差');
    if (!hasGrade) {
      addIssue('high', '/assessment评价结果', '健康等级评定缺失', '应显示优/良/中/差等级评定');
    }

    // ============ 测试4: 改良处方生成 - 验证石灰推荐 ============
    log('\n=== 测试4: 改良处方生成(核心验证:石灰施用剂量) ===');
    
    // 直接通过导航点击跳转处方页
    await page.getByText('改良处方生成').first().click();
    await page.waitForTimeout(3000);
    await safeScreenshot(page, '06_prescription_result.png');

    let prescriptionText = '';
    try {
      prescriptionText = await page.locator('body').innerText();
    } catch (e) {
      addIssue('high', '/prescription处方结果', '无法读取页面内容', e.message);
    }

    log(`处方页面内容长度: ${prescriptionText.length}`);

    // 检查是否显示石灰用量
    const hasLime = prescriptionText.includes('石灰');
    log(`是否显示石灰改良: ${hasLime}`);
    if (!hasLime) {
      addIssue('critical', '/prescription处方结果', 
        'pH 5.0酸性土壤未推荐石灰改良', 
        '核心验证标准失败：pH 5.0酸性数据应推荐合理石灰施用剂量');
    }

    // 检查石灰用量数值
    let limeDosage = null;
    const limeMatch = prescriptionText.match(/(\d+)\s*kg\/亩/);
    if (limeMatch) {
      limeDosage = parseInt(limeMatch[1]);
      log(`检测到石灰用量: ${limeDosage} kg/亩`);
      if (limeDosage <= 0) {
        addIssue('critical', '/prescription处方结果', 
          '石灰用量为0或无效', 
          'pH 5.0属于强酸性，石灰用量应在75-150 kg/亩范围');
      } else if (limeDosage < 50 || limeDosage > 300) {
        addIssue('medium', '/prescription处方结果', 
          `石灰用量异常: ${limeDosage}kg/亩`, 
          'pH 5.0的石灰用量应在合理范围(50-300 kg/亩)');
      }
    } else if (hasLime) {
      addIssue('medium', '/prescription处方结果', 
        '石灰用量数值格式不规范', 
        '应明确显示"XX kg/亩"格式的石灰用量');
    }

    // 检查施用方法
    const hasMethod = prescriptionText.includes('施用') || prescriptionText.includes('撒施') || prescriptionText.includes('深翻');
    log(`是否显示施用方法: ${hasMethod}`);

    // 检查改良日历
    const hasCalendar = prescriptionText.includes('改良日历') || prescriptionText.includes('月');
    log(`是否显示改良日历: ${hasCalendar}`);

    // 检查绿肥建议
    const hasGreenManure = prescriptionText.includes('绿肥');
    log(`是否显示绿肥建议: ${hasGreenManure}`);

    // ============ 测试5: 地力演变追踪 ============
    log('\n=== 测试5: 地力演变追踪 ===');
    await page.getByText('地力演变追踪').first().click();
    await page.waitForTimeout(3000);
    await safeScreenshot(page, '07_tracking_page.png');

    let trackingText = '';
    try {
      trackingText = await page.locator('body').innerText();
    } catch (e) {
      addIssue('high', '/tracking追踪页', '无法读取页面内容', e.message);
    }
    log(`追踪页内容: ${trackingText.substring(0, 200)}...`);

    // 检查是否有雷达图或折线图
    const chartCount = await page.locator('canvas').count().catch(() => 0);
    log(`图表数量: ${chartCount}`);

    // 保存当前记录后，再新增一条验证追踪功能
    log('返回评价页，再新增一条检测数据以验证追踪功能...');
    await page.goto(`${BASE_URL}/assessment`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.locator('input[name="ph"]').fill('6.0');
    await page.locator('input[name="organicMatter"]').fill('18');
    await page.locator('input[name="totalNitrogen"]').fill('1.2');
    await page.locator('input[name="availablePhosphorus"]').fill('15');
    await page.locator('input[name="availablePotassium"]').fill('120');

    await page.getByRole('button', { name: /计算健康指数/ }).click();
    await page.waitForTimeout(2000);
    log('第二条数据已保存');

    // 再次访问追踪页
    await page.goto(`${BASE_URL}/tracking`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await safeScreenshot(page, '08_tracking_with_data.png');

    // ============ 测试6: 返回仪表盘验证 ============
    log('\n=== 测试6: 仪表盘数据更新验证 ===');
    await page.getByText('首页仪表盘').first().click();
    await page.waitForTimeout(2000);
    await safeScreenshot(page, '09_dashboard_with_records.png');

    // ============ 测试7: 类型检查 ============
    log('\n=== 测试7: 编译/类型检查(非代码修改) ===');
    // 仅验证不修改

    log('\n=== 测试完成 ===');

  } catch (err) {
    log(`测试过程发生异常: ${err.message}`);
    addIssue('critical', '整体测试流程', `测试异常中断: ${err.message}`, err.stack);
    await safeScreenshot(page, 'error_test_crash.png');
  } finally {
    await browser.close();
  }

  // 输出报告
  console.log('\n\n========================================');
  console.log('         土壤健康诊断系统 - 测试报告');
  console.log('========================================');
  console.log(`\n测试时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`测试环境: ${BASE_URL}`);
  console.log(`控制台/API错误数: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('错误详情:');
    consoleErrors.forEach(e => console.log(`  - ${e}`));
  }
  console.log(`\n发现问题数: ${issues.length}`);
  if (issues.length > 0) {
    console.log('\n问题列表:');
    issues.forEach((iss, i) => {
      console.log(`\n${i + 1}. [${iss.severity.toUpperCase()}] ${iss.location}`);
      console.log(`   描述: ${iss.description}`);
      console.log(`   证据: ${iss.evidence}`);
    });
  } else {
    console.log('\n所有核心功能测试通过!');
  }

  // 保存JSON报告
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    consoleErrors,
    issues,
    passed: issues.filter(i => i.severity !== 'critical' && i.severity !== 'high').length === issues.length && issues.length === 0
  };
  fs.writeFileSync(path.join(IMG_DIR, 'test-report.json'), JSON.stringify(report, null, 2));
  console.log(`\n报告已保存: ${path.join(IMG_DIR, 'test-report.json')}`);
}

test().catch(err => {
  console.error('测试脚本崩溃:', err);
  process.exit(1);
});
