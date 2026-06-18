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
  const p = path.join(IMG_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`📸 ${name}.png`);
}

async function runTests() {
  console.log('🚀 第三轮测试 - 冷链温度监测系统');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => { consoleErrors.push(err.message); });

  try {
    // ===== 测试1: 页面加载 =====
    console.log('\n📋 测试1: 页面加载');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    console.log(`   标题: ${await page.title()}`);
    console.log(`   温度: ${await page.locator('#tempValue').textContent()}°C`);
    await takeScreenshot(page, 'r3-01-page-load');
    console.log('   ✅ 完成');

    // ===== 测试2: 重点验证 - totalAlertDuration 即时更新 =====
    console.log('\n📋 测试2: totalAlertDuration 即时更新（核心验证）');
    
    await page.locator('#resetBtn').click();
    await page.waitForTimeout(2000);
    
    const initialDuration = await page.locator('#alertDuration').textContent();
    console.log(`   重置后越界时长: ${initialDuration}`);
    
    await page.locator('#doorBtn').click();
    console.log('   已开启车门，等待警报...');
    
    let alertTriggered = false;
    let alertDurationAtTrigger = '';
    let alertDurationOneSecLater = '';
    let triggerTime = 0;
    
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1000);
      const alertVisible = await page.locator('#alertBanner').isVisible();
      const tempText = await page.locator('#tempValue').textContent();
      const alertDuration = await page.locator('#alertDuration').textContent();
      
      process.stdout.write(`\r   第${i+1}秒: ${tempText}°C, 警报: ${alertVisible ? '✅' : '⏳'}, 时长: ${alertDuration}    `);
      
      if (alertVisible && !alertTriggered) {
        alertTriggered = true;
        triggerTime = i + 1;
        alertDurationAtTrigger = alertDuration;
        console.log(`\n   警报触发！触发时越界时长: ${alertDurationAtTrigger}`);
        
        // 再等1秒检查更新
        await page.waitForTimeout(1000);
        alertDurationOneSecLater = await page.locator('#alertDuration').textContent();
        console.log(`   1秒后越界时长: ${alertDurationOneSecLater}`);
        break;
      }
    }
    
    if (!alertTriggered) {
      logIssue('越界警报', '30秒内未触发警报', '回归测试失败');
    } else {
      if (alertDurationAtTrigger === '0秒') {
        logIssue('totalAlertDuration', '警报触发瞬间越界时长仍显示0秒', 
          `触发时: ${alertDurationAtTrigger}, 1秒后: ${alertDurationOneSecLater}`);
      } else {
        console.log(`   ✅ 警报触发时越界时长已即时更新: ${alertDurationAtTrigger}`);
      }
    }
    
    await takeScreenshot(page, 'r3-02-alert-duration');

    // ===== 测试3: 重点验证 - 警报结束时的 state 广播 =====
    console.log('\n📋 测试3: 警报结束时的 state 广播');
    
    // 关闭车门并加大制冷功率让温度降下来
    await page.locator('#doorBtn').click();
    const powerSlider = page.locator('#powerSlider');
    await powerSlider.fill('1500');
    await page.evaluate(() => {
      document.getElementById('powerSlider')?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(500);
    
    console.log('   已关闭车门+最大功率制冷，等待温度降到阈值以下...');
    
    let alertEnded = false;
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1000);
      const alertVisible = await page.locator('#alertBanner').isVisible();
      const tempText = await page.locator('#tempValue').textContent();
      const statusText = await page.locator('#tempStatus').textContent();
      
      process.stdout.write(`\r   第${i+1}秒: ${tempText}°C, 状态: ${statusText}, 警报: ${alertVisible ? '是' : '否'}    `);
      
      if (!alertVisible && alertTriggered) {
        alertEnded = true;
        console.log(`\n   ✅ 温度已降回正常，警报已结束`);
        
        // 检查越界记录中的结束状态
        const alertItems = await page.locator('.alert-item').count();
        if (alertItems > 0) {
          const firstItem = await page.locator('.alert-item').first().textContent();
          console.log(`   第一条记录: ${firstItem?.trim().substring(0, 80)}`);
          
          if (firstItem?.includes('进行中')) {
            logIssue('越界记录', '警报已结束但记录仍显示"进行中"', '警报结束时后端可能未正确更新alertHistory');
          }
        }
        break;
      }
    }
    
    if (!alertEnded && alertTriggered) {
      console.log('\n   ⚠️ 30秒内温度未降回阈值以下（制冷功率可能不够）');
    }
    
    await takeScreenshot(page, 'r3-03-alert-ended');

    // ===== 测试4: 后端 totalAlertDuration 一致性 =====
    console.log('\n📋 测试4: 后端 totalAlertDuration 一致性');
    
    const apiStatus = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3001/api/status');
      return await res.json();
    });
    
    const frontendDuration = await page.locator('#alertDuration').textContent();
    console.log(`   前端显示越界时长: ${frontendDuration}`);
    console.log(`   后端 totalAlertDuration: ${apiStatus.totalAlertDuration}秒`);
    console.log(`   后端 alertHistory: ${JSON.stringify(apiStatus.alertHistory)}`);
    
    if (apiStatus.alertHistory && apiStatus.alertHistory.length > 0) {
      const lastAlert = apiStatus.alertHistory[apiStatus.alertHistory.length - 1];
      console.log(`   最后一条警报: startTime=${lastAlert.startTime}, endTime=${lastAlert.endTime}, ongoing=${lastAlert.ongoing}`);
      
      if (alertEnded && lastAlert.ongoing) {
        logIssue('数据一致性', '警报已结束但后端alertHistory仍标记ongoing=true', 
          `endTime=${lastAlert.endTime}, ongoing=${lastAlert.ongoing}`);
      }
    }
    
    await takeScreenshot(page, 'r3-04-duration-consistency');

    // ===== 测试5: 外界气温滑块调节（回归） =====
    console.log('\n📋 测试5: 外界气温滑块调节（回归）');
    
    const beforeAmbient = await page.locator('#ambientTemp').textContent();
    const ambientSlider = page.locator('#ambientSlider');
    await ambientSlider.fill('35');
    await page.evaluate(() => {
      document.getElementById('ambientSlider')?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(2000);
    
    const afterAmbient = await page.locator('#ambientTemp').textContent();
    console.log(`   ${beforeAmbient} → ${afterAmbient}`);
    
    if (afterAmbient === beforeAmbient) {
      logIssue('外界气温', '外界气温滑块调节失效（回归）', `${beforeAmbient} 无变化`);
    } else {
      console.log('   ✅ 正常');
    }
    
    await takeScreenshot(page, 'r3-05-ambient');

    // ===== 测试6: 制冷功率调节（回归） =====
    console.log('\n📋 测试6: 制冷功率调节（回归）');
    
    const beforePower = await page.locator('#powerValue').textContent();
    await powerSlider.fill('800');
    await page.evaluate(() => {
      document.getElementById('powerSlider')?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(1000);
    
    const afterPower = await page.locator('#powerValue').textContent();
    console.log(`   ${beforePower} → ${afterPower}`);
    
    if (afterPower !== '800W') {
      logIssue('制冷功率', '制冷功率调节异常', `期望800W, 实际${afterPower}`);
    } else {
      console.log('   ✅ 正常');
    }

    // ===== 测试7: 货物类型切换（回归） =====
    console.log('\n📋 测试7: 货物类型切换（回归）');
    
    const productCount = await page.locator('.product-btn').count();
    console.log(`   货物类型数: ${productCount}`);
    
    await page.locator('.product-btn').nth(0).click(); // 荔枝
    await page.waitForTimeout(1000);
    const activeProduct = await page.locator('.product-btn.active').textContent();
    console.log(`   选中: ${activeProduct?.trim()}`);
    
    if (!activeProduct?.includes('荔枝')) {
      logIssue('货物类型', '货物类型切换异常', `期望荔枝, 实际${activeProduct}`);
    } else {
      console.log('   ✅ 正常');
    }
    
    await takeScreenshot(page, 'r3-07-product');

    // ===== 测试8: 重置模拟（回归） =====
    console.log('\n📋 测试8: 重置模拟（回归）');
    
    await page.locator('#resetBtn').click();
    await page.waitForTimeout(2000);
    
    const resetAlertCount = await page.locator('#alertCount').textContent();
    const resetDuration = await page.locator('#alertDuration').textContent();
    console.log(`   越界次数: ${resetAlertCount}, 时长: ${resetDuration}`);
    
    if (resetAlertCount !== '0') {
      logIssue('重置', '重置后越界次数未清零', `实际${resetAlertCount}`);
    }
    if (resetDuration !== '0秒') {
      logIssue('重置', '重置后越界时长未清零', `实际${resetDuration}`);
    } else {
      console.log('   ✅ 正常');
    }
    
    await takeScreenshot(page, 'r3-08-reset');

    // ===== 测试9: 电子交接单全流程（回归） =====
    console.log('\n📋 测试9: 电子交接单全流程（回归）');
    
    await page.locator('#handoffBtn').click();
    await page.waitForTimeout(1500);
    
    const modalVisible = await page.locator('#modal').isVisible();
    console.log(`   弹窗: ${modalVisible ? '显示' : '未显示'}`);
    
    if (!modalVisible) {
      logIssue('交接单', '弹窗未显示', '回归失败');
    }
    
    const verdict = await page.locator('.verdict-badge').textContent();
    console.log(`   验收结论: ${verdict?.trim()}`);
    await takeScreenshot(page, 'r3-09-modal');
    
    // 签名
    const sigBox = await page.locator('#signatureCanvas').boundingBox();
    if (sigBox) {
      await page.mouse.move(sigBox.x + 30, sigBox.y + 50);
      await page.mouse.down();
      await page.mouse.move(sigBox.x + 150, sigBox.y + 35);
      await page.mouse.move(sigBox.x + 250, sigBox.y + 65);
      await page.mouse.up();
      console.log('   已签名');
    }
    
    await page.locator('#receiverName').fill('第三轮测试员');
    await page.locator('#notes').fill('回归测试交接验收');
    
    await takeScreenshot(page, 'r3-09-form');
    
    await page.locator('#submitHandoff').click();
    await page.waitForTimeout(2000);
    
    const docId = await page.locator('.doc-id').first().textContent();
    const hashVal = await page.locator('.hash-display').textContent();
    console.log(`   单号: ${docId}`);
    console.log(`   HASH: ${hashVal}`);
    
    if (!docId?.includes('HC-')) {
      logIssue('交接单', '单号格式异常', `${docId}`);
    } else {
      console.log('   ✅ 正常');
    }
    
    await takeScreenshot(page, 'r3-09-submitted');
    
    await page.locator('#closeModal').click();
    await page.waitForTimeout(500);

    // ===== 测试10: 温度曲线Canvas =====
    console.log('\n📋 测试10: 温度曲线Canvas');
    const chartBox = await page.locator('#tempChart').boundingBox();
    if (chartBox && chartBox.width > 0 && chartBox.height > 0) {
      console.log(`   Canvas: ${chartBox.width}x${chartBox.height} ✅`);
    } else {
      logIssue('Canvas', 'Canvas尺寸异常', '可能未正确渲染');
    }

    // ===== 测试11: 车门开启完整验证（核心需求回归） =====
    console.log('\n📋 测试11: 核心验证 - 模拟车门开启10分钟温度尖峰');
    
    await page.locator('#resetBtn').click();
    await page.waitForTimeout(2000);
    
    // 开启车门
    await page.locator('#doorBtn').click();
    console.log('   车门已开启，观察温度曲线变化...');
    
    let maxTempObserved = -999;
    let alertCountObserved = 0;
    
    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(1000);
      const tempText = await page.locator('#tempValue').textContent();
      const tempNum = parseFloat(tempText);
      const alertVisible = await page.locator('#alertBanner').isVisible();
      
      if (tempNum > maxTempObserved) maxTempObserved = tempNum;
      if (alertVisible) alertCountObserved++;
      
      process.stdout.write(`\r   第${i+1}秒: ${tempText}°C, 警报: ${alertVisible ? '🔴' : '🟢'}    `);
    }
    console.log(`\n   最高温度: ${maxTempObserved.toFixed(1)}°C`);
    console.log(`   警报触发秒数: ${alertCountObserved}`);
    
    const alertBannerVisible = await page.locator('#alertBanner').isVisible();
    if (!alertBannerVisible) {
      logIssue('核心验证', '车门开启后未触发红色越界警报', '需求验证标准未满足');
    }
    
    const tempStatusText = await page.locator('#tempStatus').textContent();
    if (!tempStatusText?.includes('超标')) {
      logIssue('核心验证', '温度状态未显示"超标"', `实际: ${tempStatusText}`);
    } else {
      console.log('   ✅ 核心验证通过：温度尖峰+红色警报');
    }
    
    await takeScreenshot(page, 'r3-11-core-verify');

    // ===== 测试12: 控制台错误检查 =====
    console.log('\n📋 测试12: 控制台错误');
    if (consoleErrors.length > 0) {
      console.log(`   ❌ ${consoleErrors.length} 个错误:`);
      consoleErrors.forEach((e, i) => {
        console.log(`   ${i+1}. ${e}`);
        logIssue('控制台', `错误 #${i+1}`, e);
      });
    } else {
      console.log('   ✅ 无错误');
    }

    // ===== 测试13: 后端API =====
    console.log('\n📋 测试13: 后端API');
    const apiResults = await page.evaluate(async () => {
      const tests = [];
      const apis = [
        { url: '/api/products', method: 'GET' },
        { url: '/api/status', method: 'GET' },
        { url: '/api/report', method: 'GET' },
      ];
      for (const api of apis) {
        const res = await fetch(`http://localhost:3001${api.url}`);
        tests.push({ url: api.url, ok: res.ok, status: res.status });
      }
      return tests;
    });
    
    apiResults.forEach(r => {
      console.log(`   ${r.url}: ${r.ok ? '✅' : '❌'} (${r.status})`);
      if (!r.ok) logIssue('API', `${r.url} 失败`, `状态码 ${r.status}`);
    });

    // ===== 最终截图 =====
    await takeScreenshot(page, 'r3-99-final');

  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 第三轮测试总结');
  console.log('='.repeat(60));
  
  if (issues.length === 0) {
    console.log('✅ 所有测试通过！');
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
