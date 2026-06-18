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

async function waitForConsoleErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    errors.push(err.message);
  });
  return errors;
}

async function runTests() {
  console.log('🚀 开始测试冷链温度监测系统...');
  console.log(`📍 测试地址: ${BASE_URL}`);
  console.log('=' .repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const consoleErrors = await waitForConsoleErrors(page);

  try {
    // ===== 测试1: 页面加载 =====
    console.log('\n📋 测试1: 页面加载测试');
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      
      const title = await page.title();
      console.log(`   页面标题: ${title}`);
      
      if (title !== '冷链温度监测系统') {
        logIssue('页面加载', '页面标题不正确', `预期: 冷链温度监测系统, 实际: ${title}`);
      }
      
      const tempValue = await page.locator('#tempValue').textContent();
      console.log(`   当前温度显示: ${tempValue}`);
      
      if (!tempValue || tempValue === '--') {
        logIssue('页面加载', '温度数据未正确加载', '温度值显示为 --');
      }
      
      await takeScreenshot(page, '01-page-initial-load');
      console.log('   ✅ 页面加载完成');
    } catch (e) {
      logIssue('页面加载', '页面加载失败', e.message);
      await takeScreenshot(page, '01-page-load-error');
    }

    // ===== 测试2: WebSocket连接状态 =====
    console.log('\n📋 测试2: WebSocket连接测试');
    try {
      const connectionStatus = await page.locator('#connectionStatus').textContent();
      console.log(`   连接状态: ${connectionStatus}`);
      
      if (connectionStatus?.includes('连接中') || connectionStatus?.includes('中断')) {
        logIssue('WebSocket连接', 'WebSocket未成功连接', `状态: ${connectionStatus}`);
      }
      
      await page.waitForTimeout(2000);
      const newStatus = await page.locator('#connectionStatus').textContent();
      console.log(`   2秒后状态: ${newStatus}`);
    } catch (e) {
      logIssue('WebSocket连接', '连接状态检查失败', e.message);
    }

    // ===== 测试3: 货物类型切换 =====
    console.log('\n📋 测试3: 货物类型切换测试');
    try {
      const productBtns = await page.locator('.product-btn').count();
      console.log(`   货物类型数量: ${productBtns}`);
      
      if (productBtns === 0) {
        logIssue('货物类型', '没有货物类型选项', 'product-btn 元素数量为 0');
      }
      
      const products = ['荔枝', '草莓', '海鲜', '冷鲜肉', '叶菜', '乳制品'];
      for (let i = 0; i < Math.min(productBtns, products.length); i++) {
        const btnText = await page.locator('.product-btn').nth(i).textContent();
        console.log(`   货物 ${i+1}: ${btnText?.trim()}`);
      }
      
      await page.locator('.product-btn').nth(2).click();
      await page.waitForTimeout(500);
      const activeBtn = await page.locator('.product-btn.active').textContent();
      console.log(`   当前选中: ${activeBtn?.trim()}`);
      
      await takeScreenshot(page, '03-product-selection');
      console.log('   ✅ 货物类型切换完成');
    } catch (e) {
      logIssue('货物类型', '货物类型切换失败', e.message);
    }

    // ===== 测试4: 车门开启测试（核心验证） =====
    console.log('\n📋 测试4: 车门开启与温度越界警报测试');
    try {
      const doorBtn = page.locator('#doorBtn');
      const initialDoorText = await doorBtn.textContent();
      console.log(`   初始车门状态按钮: ${initialDoorText}`);
      
      await doorBtn.click();
      await page.waitForTimeout(500);
      
      const doorIndicator = await page.locator('#doorIndicator').textContent();
      console.log(`   车门指示器: ${doorIndicator}`);
      
      await takeScreenshot(page, '04-door-opened');
      
      console.log('   ⏳ 等待温度上升和警报触发（约15秒模拟时间）...');
      
      let alertTriggered = false;
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(1000);
        const tempText = await page.locator('#tempValue').textContent();
        const tempStatus = await page.locator('#tempStatus').textContent();
        const alertBanner = await page.locator('#alertBanner').isVisible();
        
        process.stdout.write(`\r   第${i+1}秒: 温度=${tempText}°C, 状态=${tempStatus}, 警报=${alertBanner ? '触发' : '未触发'}`);
        
        if (alertBanner && tempStatus?.includes('超标')) {
          alertTriggered = true;
          console.log('\n   ✅ 温度越界警报已触发！');
          break;
        }
      }
      
      console.log();
      
      if (!alertTriggered) {
        logIssue('越界警报', '车门开启后温度越界警报未在30秒内触发', '需要验证温度上升是否足够快以触发警报');
      }
      
      await takeScreenshot(page, '04-temperature-alert');
      
      const alertCount = await page.locator('#alertCount').textContent();
      const alertDuration = await page.locator('#alertDuration').textContent();
      console.log(`   越界次数: ${alertCount}`);
      console.log(`   越界累计时长: ${alertDuration}`);
      
      const alertListItems = await page.locator('.alert-item').count();
      console.log(`   越界记录条数: ${alertListItems}`);
      
      console.log('   ✅ 车门开启测试完成');
    } catch (e) {
      logIssue('越界警报', '车门开启测试失败', e.message);
      await takeScreenshot(page, '04-door-test-error');
    }

    // ===== 测试5: 关闭车门测试 =====
    console.log('\n📋 测试5: 关闭车门与温度恢复测试');
    try {
      await page.locator('#doorBtn').click();
      console.log('   已关闭车门');
      
      console.log('   ⏳ 等待温度恢复（约10秒）...');
      await page.waitForTimeout(10000);
      
      const tempAfter = await page.locator('#tempValue').textContent();
      const alertBannerVisible = await page.locator('#alertBanner').isVisible();
      console.log(`   10秒后温度: ${tempAfter}°C`);
      console.log(`   警报横幅状态: ${alertBannerVisible ? '仍显示' : '已隐藏'}`);
      
      await takeScreenshot(page, '05-door-closed-recovery');
      console.log('   ✅ 关闭车门测试完成');
    } catch (e) {
      logIssue('温度恢复', '关闭车门测试失败', e.message);
    }

    // ===== 测试6: 制冷功率调节 =====
    console.log('\n📋 测试6: 制冷功率调节测试');
    try {
      const powerSlider = page.locator('#powerSlider');
      const initialPower = await page.locator('#powerValue').textContent();
      console.log(`   初始制冷功率: ${initialPower}`);
      
      await powerSlider.fill('1200');
      await page.waitForTimeout(500);
      
      const newPower = await page.locator('#powerValue').textContent();
      console.log(`   调节后功率: ${newPower}`);
      
      await takeScreenshot(page, '06-power-adjustment');
      console.log('   ✅ 制冷功率调节测试完成');
    } catch (e) {
      logIssue('制冷功率', '功率调节测试失败', e.message);
    }

    // ===== 测试7: 外界气温调节 =====
    console.log('\n📋 测试7: 外界气温调节测试');
    try {
      const ambientSlider = page.locator('#ambientSlider');
      const initialAmbient = await page.locator('#ambientTemp').textContent();
      console.log(`   初始外界气温: ${initialAmbient}`);
      
      await ambientSlider.fill('35');
      await page.waitForTimeout(500);
      
      const newAmbient = await page.locator('#ambientTemp').textContent();
      console.log(`   调节后气温: ${newAmbient}`);
      
      await takeScreenshot(page, '07-ambient-adjustment');
      console.log('   ✅ 外界气温调节测试完成');
    } catch (e) {
      logIssue('外界气温', '气温调节测试失败', e.message);
    }

    // ===== 测试8: 重置模拟 =====
    console.log('\n📋 测试8: 重置模拟测试');
    try {
      await page.locator('#resetBtn').click();
      await page.waitForTimeout(1000);
      
      const timeElapsed = await page.locator('#timeElapsed').textContent();
      const alertCount = await page.locator('#alertCount').textContent();
      console.log(`   重置后运输时长: ${timeElapsed}`);
      console.log(`   重置后越界次数: ${alertCount}`);
      
      const tempValue = await page.locator('#tempValue').textContent();
      console.log(`   重置后温度: ${tempValue}°C`);
      
      await takeScreenshot(page, '08-reset-simulation');
      console.log('   ✅ 重置模拟测试完成');
    } catch (e) {
      logIssue('重置模拟', '重置功能测试失败', e.message);
    }

    // ===== 测试9: 电子交接单 =====
    console.log('\n📋 测试9: 电子交接单测试');
    try {
      await page.locator('#handoffBtn').click();
      await page.waitForTimeout(1000);
      
      const modalVisible = await page.locator('#modal').isVisible();
      console.log(`   交接单弹窗显示: ${modalVisible}`);
      
      if (!modalVisible) {
        logIssue('电子交接单', '交接单弹窗未显示', '点击生成交接单按钮后弹窗未出现');
      }
      
      const verdictBadge = await page.locator('.verdict-badge').textContent();
      console.log(`   验收结论: ${verdictBadge?.trim()}`);
      
      await takeScreenshot(page, '09-handoff-modal');
      console.log('   ✅ 交接单弹窗测试完成');
    } catch (e) {
      logIssue('电子交接单', '交接单弹窗测试失败', e.message);
    }

    // ===== 测试10: 电子签名 =====
    console.log('\n📋 测试10: 电子签名测试');
    try {
      const sigCanvas = page.locator('#signatureCanvas');
      const sigCanvasBox = await sigCanvas.boundingBox();
      
      if (sigCanvasBox) {
        await page.mouse.move(sigCanvasBox.x + 20, sigCanvasBox.y + 40);
        await page.mouse.down();
        await page.mouse.move(sigCanvasBox.x + 100, sigCanvasBox.y + 60);
        await page.mouse.move(sigCanvasBox.x + 180, sigCanvasBox.y + 30);
        await page.mouse.move(sigCanvasBox.x + 260, sigCanvasBox.y + 70);
        await page.mouse.up();
        console.log('   已绘制签名');
      }
      
      await takeScreenshot(page, '10-signature-drawn');
      
      await page.locator('#clearSignature').click();
      await page.waitForTimeout(300);
      console.log('   已清除签名');
      
      if (sigCanvasBox) {
        await page.mouse.move(sigCanvasBox.x + 30, sigCanvasBox.y + 50);
        await page.mouse.down();
        await page.mouse.move(sigCanvasBox.x + 120, sigCanvasBox.y + 40);
        await page.mouse.move(sigCanvasBox.x + 200, sigCanvasBox.y + 70);
        await page.mouse.move(sigCanvasBox.x + 280, sigCanvasBox.y + 45);
        await page.mouse.up();
        console.log('   已重新绘制签名');
      }
      
      await takeScreenshot(page, '10-signature-redrawn');
      console.log('   ✅ 电子签名测试完成');
    } catch (e) {
      logIssue('电子签名', '签名功能测试失败', e.message);
    }

    // ===== 测试11: 提交签收 =====
    console.log('\n📋 测试11: 提交签收测试');
    try {
      await page.locator('#receiverName').fill('测试收货人');
      await page.locator('#notes').fill('测试备注：货物状态良好');
      
      await takeScreenshot(page, '11-handoff-form-filled');
      
      await page.locator('#submitHandoff').click();
      await page.waitForTimeout(1500);
      
      const docId = await page.locator('.doc-id').first().textContent();
      const hashDisplay = await page.locator('.hash-display').textContent();
      console.log(`   交接单号: ${docId}`);
      console.log(`   HASH校验码: ${hashDisplay}`);
      
      const submitBtnVisible = await page.locator('#submitHandoff').isVisible();
      console.log(`   提交按钮状态: ${submitBtnVisible ? '仍显示' : '已隐藏'}`);
      
      await takeScreenshot(page, '11-handoff-submitted');
      
      await page.locator('#closeModal').click();
      await page.waitForTimeout(500);
      const modalClosed = !(await page.locator('#modal').isVisible());
      console.log(`   弹窗已关闭: ${modalClosed}`);
      
      console.log('   ✅ 提交签收测试完成');
    } catch (e) {
      logIssue('提交签收', '签收提交测试失败', e.message);
    }

    // ===== 测试12: 温度曲线Canvas =====
    console.log('\n📋 测试12: 温度曲线Canvas测试');
    try {
      const chartCanvas = page.locator('#tempChart');
      const canvasExists = await chartCanvas.count() > 0;
      console.log(`   温度曲线Canvas存在: ${canvasExists}`);
      
      if (canvasExists) {
        const box = await chartCanvas.boundingBox();
        if (box && box.width > 0 && box.height > 0) {
          console.log(`   Canvas尺寸: ${box.width}x${box.height}`);
        } else {
          logIssue('温度曲线', 'Canvas尺寸为0或不可见', '温度曲线Canvas可能未正确渲染');
        }
      }
      console.log('   ✅ 温度曲线Canvas测试完成');
    } catch (e) {
      logIssue('温度曲线', 'Canvas测试失败', e.message);
    }

    // ===== 测试13: 控制台错误检查 =====
    console.log('\n📋 测试13: 控制台错误检查');
    await page.waitForTimeout(2000);
    if (consoleErrors.length > 0) {
      console.log(`   发现 ${consoleErrors.length} 条控制台错误:`);
      consoleErrors.forEach((err, i) => {
        console.log(`   ${i+1}. ${err}`);
        logIssue('控制台错误', `控制台错误 #${i+1}`, err);
      });
    } else {
      console.log('   ✅ 未发现控制台错误');
    }

    // ===== 测试14: 后端API测试 =====
    console.log('\n📋 测试14: 后端API测试');
    try {
      const statusResponse = await page.evaluate(async () => {
        const res = await fetch('http://localhost:3001/api/status');
        return { ok: res.ok, status: res.status, data: await res.json() };
      });
      console.log(`   /api/status: ${statusResponse.ok ? '正常' : '失败'} (状态码: ${statusResponse.status})`);
      console.log(`   当前温度: ${statusResponse.data?.currentTemp?.toFixed(2)}°C`);
      console.log(`   车门状态: ${statusResponse.data?.doorOpen ? '开启' : '关闭'}`);
      
      if (!statusResponse.ok) {
        logIssue('后端API', '/api/status 请求失败', `状态码: ${statusResponse.status}`);
      }
      
      const reportResponse = await page.evaluate(async () => {
        const res = await fetch('http://localhost:3001/api/report');
        return { ok: res.ok, status: res.status, data: await res.json() };
      });
      console.log(`   /api/report: ${reportResponse.ok ? '正常' : '失败'} (状态码: ${reportResponse.status})`);
      console.log(`   验收结论: ${reportResponse.data?.isQualified ? '合格' : '不合格'}`);
      
      if (!reportResponse.ok) {
        logIssue('后端API', '/api/report 请求失败', `状态码: ${reportResponse.status}`);
      }
      
      console.log('   ✅ 后端API测试完成');
    } catch (e) {
      logIssue('后端API', 'API测试失败', e.message);
    }

    // ===== 最终截图 =====
    await takeScreenshot(page, '99-final-state');

  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 测试总结');
  console.log('='.repeat(60));
  
  if (issues.length === 0) {
    console.log('✅ 所有测试通过，未发现问题');
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
