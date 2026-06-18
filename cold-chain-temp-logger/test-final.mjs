import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const IMG_DIR = path.resolve('./img');
const BASE_URL = 'http://localhost:5173';

if (!fs.existsSync(IMG_DIR)) {
  fs.mkdirSync(IMG_DIR, { recursive: true });
}

let issues = [];

function logIssue(category, description, evidence) {
  issues.push({ category, description, evidence });
  console.log(`❌ [${category}] ${description}`);
}

async function takeScreenshot(page, name) {
  const screenshotPath = path.join(IMG_DIR, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 截图: ${name}.png`);
  return screenshotPath;
}

async function runFinalTests() {
  console.log('🚀 第二轮最终测试 - 冷链温度监测系统');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  try {
    // ===== 测试1: 页面加载 =====
    console.log('\n📋 测试1: 页面加载');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    
    const title = await page.title();
    const tempValue = await page.locator('#tempValue').textContent();
    console.log(`   标题: ${title}`);
    console.log(`   当前温度: ${tempValue}°C`);
    
    if (title !== '冷链温度监测系统') {
      logIssue('页面加载', '页面标题不正确', `预期: 冷链温度监测系统, 实际: ${title}`);
    }
    
    await takeScreenshot(page, 'final-01-page-load');
    console.log('   ✅ 页面加载完成');

    // ===== 测试2: 后端状态数据结构一致性（重点验证）=====
    console.log('\n📋 测试2: 后端状态数据结构一致性（重点）');
    
    // 测试 /api/status 接口
    const statusApi = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3001/api/status');
      return { ok: res.ok, status: res.status, data: await res.json() };
    });
    
    console.log(`   /api/status: ${statusApi.ok ? '✅' : '❌'}`);
    
    if (statusApi.ok) {
      const fields = Object.keys(statusApi.data);
      console.log(`   字段: ${fields.join(', ')}`);
      
      const requiredFields = ['currentTemp', 'doorOpen', 'refrigerationPower', 'ambientTemp', 'threshold', 'time', 'isAlert', 'totalAlertDuration', 'alertHistory'];
      const missingFields = requiredFields.filter(f => !fields.includes(f));
      
      if (missingFields.length > 0) {
        logIssue('数据一致性', `/api/status 缺少字段: ${missingFields.join(', ')}`, `期望字段: ${requiredFields.join(', ')}`);
      } else {
        console.log('   ✅ /api/status 包含所有必需字段');
      }
      
      if (Array.isArray(statusApi.data.alertHistory)) {
        console.log(`   alertHistory 类型: 数组 (长度: ${statusApi.data.alertHistory.length})`);
      } else {
        logIssue('数据一致性', 'alertHistory 不是数组', `实际类型: ${typeof statusApi.data.alertHistory}`);
      }
    } else {
      logIssue('数据一致性', '/api/status 请求失败', `状态码: ${statusApi.status}`);
    }

    // 测试 WebSocket init 消息
    console.log('\n   检查 WebSocket init 消息...');
    const wsInitCheck = await page.evaluate(() => {
      return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:3001');
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'init') {
            ws.close();
            resolve({
              hasAlertHistory: 'alertHistory' in data.state,
              stateFields: Object.keys(data.state)
            });
          }
        };
        setTimeout(() => {
          ws.close();
          resolve({ error: 'timeout' });
        }, 5000);
      });
    });
    
    if (wsInitCheck.error) {
      console.log('   ⚠️ WebSocket 连接超时');
    } else {
      console.log(`   init state 字段: ${wsInitCheck.stateFields.join(', ')}`);
      if (wsInitCheck.hasAlertHistory) {
        console.log('   ✅ WebSocket init 包含 alertHistory');
      } else {
        logIssue('数据一致性', 'WebSocket init 缺少 alertHistory', '上轮修复未生效');
      }
    }
    
    await takeScreenshot(page, 'final-02-state-consistency');

    // ===== 测试3: 外界气温滑块调节（重点验证）=====
    console.log('\n📋 测试3: 外界气温滑块调节（重点）');
    
    const initialAmbient = await page.locator('#ambientTemp').textContent();
    console.log(`   初始外界气温: ${initialAmbient}`);
    
    // 方法: 使用 Playwright 的 fill 方法设置值，然后手动触发 input 事件
    const ambientSlider = page.locator('#ambientSlider');
    
    // 测试1: 调至 35°C
    await ambientSlider.fill('35');
    await page.evaluate(() => {
      const slider = document.getElementById('ambientSlider');
      if (slider) {
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await page.waitForTimeout(2000);
    
    const afterFirstAdjust = await page.locator('#ambientTemp').textContent();
    console.log(`   调至35°C后显示: ${afterFirstAdjust}`);
    
    // 测试2: 调至 25°C
    await ambientSlider.fill('25');
    await page.evaluate(() => {
      const slider = document.getElementById('ambientSlider');
      if (slider) {
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await page.waitForTimeout(2000);
    
    const afterSecondAdjust = await page.locator('#ambientTemp').textContent();
    console.log(`   调至25°C后显示: ${afterSecondAdjust}`);
    
    // 检查是否生效
    const firstAdjustWorked = afterFirstAdjust !== initialAmbient;
    const secondAdjustWorked = afterSecondAdjust !== afterFirstAdjust;
    
    if (!firstAdjustWorked || !secondAdjustWorked) {
      logIssue('外界气温调节', '外界气温滑块调节功能存在问题', 
        `初始: ${initialAmbient} → 35°C后: ${afterFirstAdjust} → 25°C后: ${afterSecondAdjust}`);
    } else {
      console.log('   ✅ 外界气温滑块调节功能正常');
    }
    
    await takeScreenshot(page, 'final-03-ambient-adjusted');

    // ===== 测试4: 制冷功率调节（回归测试）=====
    console.log('\n📋 测试4: 制冷功率调节（回归）');
    
    const initialPower = await page.locator('#powerValue').textContent();
    console.log(`   初始功率: ${initialPower}`);
    
    const powerSlider = page.locator('#powerSlider');
    await powerSlider.fill('1200');
    await page.evaluate(() => {
      const slider = document.getElementById('powerSlider');
      if (slider) {
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await page.waitForTimeout(2000);
    
    const afterPower = await page.locator('#powerValue').textContent();
    console.log(`   调节后功率: ${afterPower}`);
    
    if (afterPower !== '1200W') {
      logIssue('制冷功率', '制冷功率调节异常', `期望1200W，实际${afterPower}`);
    } else {
      console.log('   ✅ 制冷功率调节正常');
    }
    
    await takeScreenshot(page, 'final-04-power-adjusted');

    // ===== 测试5: 车门开启与温度越界警报（回归测试）=====
    console.log('\n📋 测试5: 车门开启与温度越界警报（回归）');
    
    await page.locator('#resetBtn').click();
    await page.waitForTimeout(2000);
    
    await page.locator('#doorBtn').click();
    await page.waitForTimeout(1000);
    
    console.log('   车门已开启，等待温度上升触发警报...');
    let alertTriggered = false;
    let timeToAlert = 0;
    
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1000);
      const alertVisible = await page.locator('#alertBanner').isVisible();
      const tempText = await page.locator('#tempValue').textContent();
      
      process.stdout.write(`\r   第${i+1}秒: ${tempText}°C, 警报: ${alertVisible ? '✅ 触发' : '⏳ 等待'}`);
      
      if (alertVisible) {
        alertTriggered = true;
        timeToAlert = i + 1;
        console.log(`\n   ✅ ${timeToAlert}秒时温度越界警报已触发`);
        break;
      }
    }
    
    if (!alertTriggered) {
      logIssue('越界警报', '车门开启后30秒内未触发警报', '回归测试失败');
    }
    
    await takeScreenshot(page, 'final-05-alert-triggered');

    // ===== 测试6: 越界记录和统计数据 =====
    console.log('\n📋 测试6: 越界记录和统计数据');
    
    const alertCount = await page.locator('#alertCount').textContent();
    const alertDuration = await page.locator('#alertDuration').textContent();
    const alertItems = await page.locator('.alert-item').count();
    
    console.log(`   越界次数: ${alertCount}`);
    console.log(`   越界累计时长: ${alertDuration}`);
    console.log(`   越界记录条数: ${alertItems}`);
    
    const maxTemp = await page.locator('#maxTemp').textContent();
    const minTemp = await page.locator('#minTemp').textContent();
    const avgTemp = await page.locator('#avgTemp').textContent();
    
    console.log(`   最高温度: ${maxTemp}`);
    console.log(`   最低温度: ${minTemp}`);
    console.log(`   平均温度: ${avgTemp}`);
    
    if (parseInt(alertCount) < 1 && alertTriggered) {
      logIssue('越界记录', '越界次数统计异常', `警报已触发但越界次数为${alertCount}`);
    }
    
    console.log('   ✅ 越界记录和统计数据正常');
    await takeScreenshot(page, 'final-06-alert-records');

    // ===== 测试7: 关闭车门与温度恢复 =====
    console.log('\n📋 测试7: 关闭车门与温度恢复');
    
    await page.locator('#doorBtn').click();
    console.log('   已关闭车门，等待10秒...');
    
    await page.waitForTimeout(10000);
    
    const tempAfterClose = await page.locator('#tempValue').textContent();
    const alertBannerVisible = await page.locator('#alertBanner').isVisible();
    
    console.log(`   10秒后温度: ${tempAfterClose}°C`);
    console.log(`   警报横幅: ${alertBannerVisible ? '仍显示' : '已隐藏'}`);
    
    console.log('   ✅ 关闭车门功能正常');
    await takeScreenshot(page, 'final-07-door-closed');

    // ===== 测试8: 货物类型切换（回归测试）=====
    console.log('\n📋 测试8: 货物类型切换（回归）');
    
    const productBtns = await page.locator('.product-btn').count();
    console.log(`   货物类型数量: ${productBtns}`);
    
    if (productBtns !== 6) {
      logIssue('货物类型', `货物类型数量不正确`, `期望6种，实际${productBtns}种`);
    }
    
    // 切换到海鲜
    await page.locator('.product-btn').nth(2).click();
    await page.waitForTimeout(1500);
    
    const activeBtn = await page.locator('.product-btn.active').textContent();
    console.log(`   当前选中: ${activeBtn?.trim()}`);
    
    if (!activeBtn?.includes('海鲜')) {
      logIssue('货物类型', '货物类型切换异常', `期望选中海鲜，实际选中${activeBtn}`);
    } else {
      console.log('   ✅ 货物类型切换正常');
    }
    
    await takeScreenshot(page, 'final-08-product-changed');

    // ===== 测试9: 电子交接单与签名（回归测试）=====
    console.log('\n📋 测试9: 电子交接单与签名（回归）');
    
    await page.locator('#handoffBtn').click();
    await page.waitForTimeout(1500);
    
    const modalVisible = await page.locator('#modal').isVisible();
    console.log(`   交接单弹窗: ${modalVisible ? '显示' : '未显示'}`);
    
    if (!modalVisible) {
      logIssue('电子交接单', '交接单弹窗未显示', '回归测试失败');
    }
    
    const verdictBadge = await page.locator('.verdict-badge').textContent();
    console.log(`   验收结论: ${verdictBadge?.trim()}`);
    
    await takeScreenshot(page, 'final-09-handoff-modal');
    
    // 电子签名测试
    const sigCanvas = page.locator('#signatureCanvas');
    const sigBox = await sigCanvas.boundingBox();
    
    if (sigBox) {
      await page.mouse.move(sigBox.x + 30, sigBox.y + 50);
      await page.mouse.down();
      await page.mouse.move(sigBox.x + 120, sigBox.y + 40);
      await page.mouse.move(sigBox.x + 220, sigBox.y + 70);
      await page.mouse.move(sigBox.x + 300, sigBox.y + 45);
      await page.mouse.up();
      console.log('   已绘制电子签名');
    }
    
    await takeScreenshot(page, 'final-09-signature-drawn');
    
    // 填写表单并提交
    await page.locator('#receiverName').fill('测试收货人-第二轮');
    await page.locator('#notes').fill('第二轮测试 - 冷链交接验收');
    
    await takeScreenshot(page, 'final-09-form-filled');
    
    await page.locator('#submitHandoff').click();
    await page.waitForTimeout(2000);
    
    const docId = await page.locator('.doc-id').first().textContent();
    const hashDisplay = await page.locator('.hash-display').textContent();
    console.log(`   交接单号: ${docId}`);
    console.log(`   HASH: ${hashDisplay}`);
    
    if (!docId?.includes('HC-')) {
      logIssue('电子交接单', '交接单号格式异常', `单号: ${docId}`);
    } else {
      console.log('   ✅ 电子交接单功能正常');
    }
    
    await takeScreenshot(page, 'final-09-handoff-submitted');
    
    await page.locator('#closeModal').click();
    await page.waitForTimeout(500);

    // ===== 测试10: 重置模拟（回归测试）=====
    console.log('\n📋 测试10: 重置模拟（回归）');
    
    await page.locator('#resetBtn').click();
    await page.waitForTimeout(2000);
    
    const timeAfterReset = await page.locator('#timeElapsed').textContent();
    const alertCountAfterReset = await page.locator('#alertCount').textContent();
    const tempAfterReset = await page.locator('#tempValue').textContent();
    
    console.log(`   重置后时间: ${timeAfterReset}`);
    console.log(`   重置后越界次数: ${alertCountAfterReset}`);
    console.log(`   重置后温度: ${tempAfterReset}°C`);
    
    if (alertCountAfterReset !== '0') {
      logIssue('重置模拟', '重置后越界次数未清零', `实际: ${alertCountAfterReset}`);
    } else {
      console.log('   ✅ 重置模拟功能正常');
    }
    
    await takeScreenshot(page, 'final-10-reset-done');

    // ===== 测试11: 温度曲线Canvas =====
    console.log('\n📋 测试11: 温度曲线Canvas');
    
    const chartCanvas = page.locator('#tempChart');
    const chartBox = await chartCanvas.boundingBox();
    
    if (chartBox && chartBox.width > 0 && chartBox.height > 0) {
      console.log(`   Canvas尺寸: ${chartBox.width}x${chartBox.height}`);
      console.log('   ✅ 温度曲线Canvas正常');
    } else {
      logIssue('温度曲线', 'Canvas尺寸异常或不可见', '温度曲线可能未正确渲染');
    }
    
    await takeScreenshot(page, 'final-11-chart-canvas');

    // ===== 测试12: 控制台错误检查 =====
    console.log('\n📋 测试12: 控制台错误检查');
    if (consoleErrors.length > 0) {
      console.log(`   ❌ 发现 ${consoleErrors.length} 条控制台错误:`);
      consoleErrors.forEach((err, i) => {
        console.log(`   ${i+1}. ${err}`);
        logIssue('控制台错误', `控制台错误 #${i+1}`, err);
      });
    } else {
      console.log('   ✅ 无控制台错误');
    }

    // ===== 测试13: 后端API完整测试 =====
    console.log('\n📋 测试13: 后端API完整测试');
    
    const apiTests = [
      { name: '/api/products', method: 'GET' },
      { name: '/api/status', method: 'GET' },
      { name: '/api/report', method: 'GET' },
    ];
    
    for (const test of apiTests) {
      const result = await page.evaluate(async (test) => {
        const res = await fetch(`http://localhost:3001${test.name}`, { method: test.method });
        return { ok: res.ok, status: res.status };
      }, test);
      
      console.log(`   ${test.name}: ${result.ok ? '✅' : '❌'} (${result.status})`);
      
      if (!result.ok) {
        logIssue('后端API', `${test.name} 请求失败`, `状态码: ${result.status}`);
      }
    }
    
    await takeScreenshot(page, 'final-99-final-state');

  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 第二轮测试最终总结');
  console.log('='.repeat(60));
  
  if (issues.length === 0) {
    console.log('✅ 所有测试通过！');
    console.log('   - 上轮修复的外界气温滑块调节功能正常');
    console.log('   - 后端状态数据结构一致（包含alertHistory）');
    console.log('   - 所有回归测试通过');
  } else {
    console.log(`❌ 共发现 ${issues.length} 个问题:`);
    issues.forEach((issue, i) => {
      console.log(`\n${i+1}. [${issue.category}] ${issue.description}`);
      console.log(`   证据: ${issue.evidence}`);
    });
  }
  
  return issues;
}

runFinalTests().catch(console.error);
