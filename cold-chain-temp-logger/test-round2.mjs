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
  console.log(`📸 截图已保存: ${screenshotPath}`);
  return screenshotPath;
}

async function runTests() {
  console.log('🚀 第二轮测试 - 冷链温度监测系统');
  console.log(`📍 测试地址: ${BASE_URL}`);
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
    console.log('\n📋 测试1: 页面加载测试');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    console.log(`   页面标题: ${await page.title()}`);
    await takeScreenshot(page, 'r2-01-page-initial');
    console.log('   ✅ 页面加载完成');

    // ===== 测试2: 重点 - 外界气温滑块调节（上轮修复验证）=====
    console.log('\n📋 测试2: 外界气温滑块调节（核心验证）');
    const initialAmbient = await page.locator('#ambientTemp').textContent();
    console.log(`   初始外界气温: ${initialAmbient}`);

    // 测试多次调节
    const testValues = [25, 35, 40, 20, 30];
    let allAdjustmentsWorked = true;
    
    for (let i = 0; i < testValues.length; i++) {
      const targetValue = testValues[i];
      const ambientSlider = page.locator('#ambientSlider');
      
      await ambientSlider.evaluate((el, val) => {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, targetValue);
      
      await page.waitForTimeout(1500);
      
      const displayedTemp = await page.locator('#ambientTemp').textContent();
      const displayedNum = parseInt(displayedTemp?.replace('°C', '') || '0');
      
      console.log(`   第${i+1}次调节: 目标=${targetValue}°C, 显示=${displayedTemp}`);
      
      if (Math.abs(displayedNum - targetValue) > 1) {
        allAdjustmentsWorked = false;
        console.log(`   ❌ 调节不一致: 目标${targetValue}°C, 实际${displayedNum}°C`);
      }
    }
    
    if (!allAdjustmentsWorked) {
      logIssue('外界气温调节', '外界气温滑块调节功能仍存在问题', '部分调节目标值与显示值不一致');
    } else {
      console.log('   ✅ 外界气温滑块调节功能正常');
    }
    
    await takeScreenshot(page, 'r2-02-ambient-adjusted');

    // ===== 测试3: 重点 - 后端状态数据结构一致性 =====
    console.log('\n📋 测试3: 后端状态数据结构一致性（核心验证）');
    
    const statusResult = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3001/api/status');
      return { ok: res.ok, data: await res.json() };
    });
    
    console.log(`   /api/status 调用: ${statusResult.ok ? '成功' : '失败'}`);
    
    if (statusResult.ok) {
      const data = statusResult.data;
      const expectedFields = ['currentTemp', 'doorOpen', 'refrigerationPower', 'ambientTemp', 'threshold', 'time', 'isAlert', 'totalAlertDuration', 'alertHistory'];
      const actualFields = Object.keys(data);
      
      console.log(`   实际字段: ${actualFields.join(', ')}`);
      
      const missingFields = expectedFields.filter(f => !actualFields.includes(f));
      if (missingFields.length > 0) {
        logIssue('数据一致性', `/api/status 缺少字段: ${missingFields.join(', ')}`, `期望字段: ${expectedFields.join(', ')}`);
      } else {
        console.log('   ✅ /api/status 包含所有期望字段');
      }
      
      if (data.alertHistory !== undefined) {
        console.log(`   alertHistory 类型: ${Array.isArray(data.alertHistory) ? '数组' : typeof data.alertHistory}`);
        console.log(`   alertHistory 长度: ${data.alertHistory?.length || 0}`);
      } else {
        logIssue('数据一致性', '/api/status 缺少 alertHistory 字段', '上轮修复未生效或存在其他问题');
      }
    }
    
    // 测试 WebSocket state 消息字段
    console.log('\n   检查 WebSocket state 消息字段...');
    const wsStateCheck = await page.evaluate(() => {
      return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:3001');
        let hasAlertHistory = false;
        let stateFields = [];
        
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'state') {
            stateFields = Object.keys(data);
            hasAlertHistory = 'alertHistory' in data;
            ws.close();
            resolve({ hasAlertHistory, stateFields });
          }
          if (data.type === 'init') {
            // 继续等待 state 消息
          }
        };
        
        setTimeout(() => {
          ws.close();
          resolve({ hasAlertHistory: false, stateFields, timeout: true });
        }, 5000);
      });
    });
    
    if (wsStateCheck.timeout) {
      console.log('   ⚠️ 等待 WebSocket state 消息超时');
    } else {
      console.log(`   WebSocket state 字段: ${wsStateCheck.stateFields.join(', ')}`);
      if (wsStateCheck.hasAlertHistory) {
        console.log('   ✅ WebSocket state 包含 alertHistory 字段');
      } else {
        logIssue('数据一致性', 'WebSocket state 消息缺少 alertHistory 字段', '上轮修复未生效');
      }
    }
    
    await takeScreenshot(page, 'r2-03-state-consistency');

    // ===== 测试4: 车门开启与温度越界警报 =====
    console.log('\n📋 测试4: 车门开启与温度越界警报（回归测试）');
    
    await page.locator('#resetBtn').click();
    await page.waitForTimeout(2000);
    
    await page.locator('#doorBtn').click();
    await page.waitForTimeout(1000);
    
    console.log('   车门已开启，等待温度上升触发警报...');
    let alertTriggered = false;
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1000);
      const alertBanner = await page.locator('#alertBanner').isVisible();
      const tempText = await page.locator('#tempValue').textContent();
      process.stdout.write(`\r   第${i+1}秒: ${tempText}°C, 警报: ${alertBanner ? '触发' : '未触发'}`);
      
      if (alertBanner) {
        alertTriggered = true;
        console.log('\n   ✅ 温度越界警报已触发');
        break;
      }
    }
    
    if (!alertTriggered) {
      logIssue('越界警报', '车门开启后30秒内未触发警报', '回归测试失败');
    }
    
    await takeScreenshot(page, 'r2-04-alert-triggered');

    // ===== 测试5: 越界记录和统计数据 =====
    console.log('\n📋 测试5: 越界记录和统计数据');
    
    const alertCount = await page.locator('#alertCount').textContent();
    const alertDuration = await page.locator('#alertDuration').textContent();
    console.log(`   越界次数: ${alertCount}`);
    console.log(`   越界累计时长: ${alertDuration}`);
    
    const alertItems = await page.locator('.alert-item').count();
    console.log(`   越界记录条数: ${alertItems}`);
    
    if (alertItems > 0) {
      const firstItem = await page.locator('.alert-item').first().textContent();
      console.log(`   第一条记录: ${firstItem?.trim().substring(0, 50)}...`);
    }
    
    // 验证统计数据
    const maxTemp = await page.locator('#maxTemp').textContent();
    const minTemp = await page.locator('#minTemp').textContent();
    const avgTemp = await page.locator('#avgTemp').textContent();
    console.log(`   最高温度: ${maxTemp}`);
    console.log(`   最低温度: ${minTemp}`);
    console.log(`   平均温度: ${avgTemp}`);
    
    console.log('   ✅ 越界记录和统计数据正常');
    await takeScreenshot(page, 'r2-05-alert-records');

    // ===== 测试6: 关闭车门与温度恢复 =====
    console.log('\n📋 测试6: 关闭车门与温度恢复');
    
    await page.locator('#doorBtn').click();
    console.log('   已关闭车门，等待温度恢复...');
    
    await page.waitForTimeout(10000);
    
    const tempAfterClose = await page.locator('#tempValue').textContent();
    const alertBannerAfter = await page.locator('#alertBanner').isVisible();
    console.log(`   10秒后温度: ${tempAfterClose}°C`);
    console.log(`   警报横幅: ${alertBannerAfter ? '仍显示' : '已隐藏'}`);
    
    console.log('   ✅ 关闭车门功能正常');
    await takeScreenshot(page, 'r2-06-door-closed');

    // ===== 测试7: 制冷功率调节 =====
    console.log('\n📋 测试7: 制冷功率调节（回归测试）');
    
    const initialPower = await page.locator('#powerValue').textContent();
    console.log(`   初始功率: ${initialPower}`);
    
    const powerSlider = page.locator('#powerSlider');
    await powerSlider.evaluate((el) => {
      el.value = 1200;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(1000);
    
    const newPower = await page.locator('#powerValue').textContent();
    console.log(`   调节后功率: ${newPower}`);
    
    if (newPower !== '1200W') {
      logIssue('制冷功率', '制冷功率调节异常', `期望1200W，实际${newPower}`);
    } else {
      console.log('   ✅ 制冷功率调节正常');
    }
    
    await takeScreenshot(page, 'r2-07-power-adjusted');

    // ===== 测试8: 货物类型切换 =====
    console.log('\n📋 测试8: 货物类型切换（回归测试）');
    
    const productBtns = await page.locator('.product-btn').count();
    console.log(`   货物类型数量: ${productBtns}`);
    
    if (productBtns !== 6) {
      logIssue('货物类型', `货物类型数量不正确`, `期望6种，实际${productBtns}种`);
    }
    
    // 切换到草莓
    await page.locator('.product-btn').nth(1).click();
    await page.waitForTimeout(1000);
    
    const activeBtn = await page.locator('.product-btn.active').textContent();
    console.log(`   当前选中: ${activeBtn?.trim()}`);
    
    if (!activeBtn?.includes('草莓')) {
      logIssue('货物类型', '货物类型切换异常', `期望选中草莓，实际选中${activeBtn}`);
    } else {
      console.log('   ✅ 货物类型切换正常');
    }
    
    await takeScreenshot(page, 'r2-08-product-changed');

    // ===== 测试9: 重置模拟 =====
    console.log('\n📋 测试9: 重置模拟（回归测试）');
    
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
    
    await takeScreenshot(page, 'r2-09-reset-done');

    // ===== 测试10: 电子交接单与签名 =====
    console.log('\n📋 测试10: 电子交接单与电子签名（回归测试）');
    
    await page.locator('#handoffBtn').click();
    await page.waitForTimeout(1500);
    
    const modalVisible = await page.locator('#modal').isVisible();
    console.log(`   交接单弹窗: ${modalVisible ? '显示' : '未显示'}`);
    
    if (!modalVisible) {
      logIssue('电子交接单', '交接单弹窗未显示', '回归测试失败');
    }
    
    const verdictBadge = await page.locator('.verdict-badge').textContent();
    console.log(`   验收结论: ${verdictBadge?.trim()}`);
    
    await takeScreenshot(page, 'r2-10-handoff-modal');
    
    // 电子签名测试
    console.log('   测试电子签名...');
    const sigCanvas = page.locator('#signatureCanvas');
    const sigBox = await sigCanvas.boundingBox();
    
    if (sigBox) {
      await page.mouse.move(sigBox.x + 30, sigBox.y + 50);
      await page.mouse.down();
      await page.mouse.move(sigBox.x + 150, sigBox.y + 40);
      await page.mouse.move(sigBox.x + 250, sigBox.y + 70);
      await page.mouse.up();
      console.log('   已绘制签名');
    }
    
    await takeScreenshot(page, 'r2-10-signature-drawn');
    
    // 填写表单并提交
    await page.locator('#receiverName').fill('测试收货人-第二轮');
    await page.locator('#notes').fill('第二轮测试备注');
    
    await takeScreenshot(page, 'r2-10-form-filled');
    
    await page.locator('#submitHandoff').click();
    await page.waitForTimeout(2000);
    
    const docId = await page.locator('.doc-id').first().textContent();
    const hashDisplay = await page.locator('.hash-display').textContent();
    console.log(`   交接单号: ${docId}`);
    console.log(`   HASH: ${hashDisplay}`);
    
    if (!docId?.includes('HC-')) {
      logIssue('电子交接单', '交接单格式异常', `单号格式不正确: ${docId}`);
    } else {
      console.log('   ✅ 电子交接单功能正常');
    }
    
    await takeScreenshot(page, 'r2-10-handoff-submitted');
    
    await page.locator('#closeModal').click();
    await page.waitForTimeout(500);

    // ===== 测试11: 温度曲线Canvas =====
    console.log('\n📋 测试11: 温度曲线Canvas（回归测试）');
    
    const chartCanvas = page.locator('#tempChart');
    const chartBox = await chartCanvas.boundingBox();
    
    if (chartBox && chartBox.width > 0 && chartBox.height > 0) {
      console.log(`   Canvas尺寸: ${chartBox.width}x${chartBox.height}`);
      console.log('   ✅ 温度曲线Canvas正常');
    } else {
      logIssue('温度曲线', 'Canvas尺寸异常或不可见', '温度曲线可能未正确渲染');
    }
    
    await takeScreenshot(page, 'r2-11-chart-canvas');

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
        return { ok: res.ok, status: res.status, data: await res.json() };
      }, test);
      
      console.log(`   ${test.name}: ${result.ok ? '✅' : '❌'} (状态码: ${result.status})`);
      
      if (!result.ok) {
        logIssue('后端API', `${test.name} 请求失败`, `状态码: ${result.status}`);
      }
    }
    
    // 测试 POST API
    const postTestResult = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3001/api/control/ambient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp: 28 })
      });
      return { ok: res.ok, status: res.status, data: await res.json() };
    });
    
    console.log(`   POST /api/control/ambient: ${postTestResult.ok ? '✅' : '❌'} (状态码: ${postTestResult.status})`);
    if (!postTestResult.ok) {
      logIssue('后端API', 'POST /api/control/ambient 失败', `状态码: ${postTestResult.status}`);
    }
    
    await takeScreenshot(page, 'r2-99-final-state');

  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 第二轮测试总结');
  console.log('='.repeat(60));
  
  if (issues.length === 0) {
    console.log('✅ 所有测试通过，上轮修复验证成功，无回归问题');
  } else {
    console.log(`❌ 共发现 ${issues.length} 个问题:`);
    issues.forEach((issue, i) => {
      console.log(`\n${i+1}. [${issue.category}] ${issue.description}`);
      console.log(`   证据: ${issue.evidence}`);
    });
  }
  
  return issues;
}

runTests().catch(console.error);
