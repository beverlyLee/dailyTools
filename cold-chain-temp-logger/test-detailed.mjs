import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function runDetailedTests() {
  console.log('🔍 详细问题验证测试...');
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
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    // ===== 问题1: 外界气温调节验证 =====
    console.log('\n📋 问题验证1: 外界气温滑块调节');
    const initialAmbient = await page.locator('#ambientTemp').textContent();
    console.log(`   初始外界气温: ${initialAmbient}`);

    const ambientSlider = page.locator('#ambientSlider');
    await ambientSlider.evaluate((el) => {
      el.value = 40;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(1000);

    const afterSliderAmbient = await page.locator('#ambientTemp').textContent();
    console.log(`   滑块调节后气温显示: ${afterSliderAmbient}`);
    
    const sliderValue = await ambientSlider.inputValue();
    console.log(`   滑块当前值: ${sliderValue}`);

    if (afterSliderAmbient === initialAmbient) {
      console.log('   ❌ 问题确认: 外界气温滑块调节无效');
      console.log('      原因: 前端通过WebSocket发送ambient动作，但后端WebSocket未处理该动作');
    } else {
      console.log('   ✅ 外界气温调节正常');
    }

    // 测试HTTP API是否可用
    const httpTestResult = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3001/api/control/ambient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp: 35 })
      });
      return { ok: res.ok, data: await res.json() };
    });
    console.log(`   HTTP API /api/control/ambient 测试: ${httpTestResult.ok ? '成功' : '失败'}`);
    if (httpTestResult.ok) {
      console.log(`   返回数据: ${JSON.stringify(httpTestResult.data)}`);
    }

    await page.waitForTimeout(1000);
    const afterApiAmbient = await page.locator('#ambientTemp').textContent();
    console.log(`   HTTP API调用后气温显示: ${afterApiAmbient}`);

    // ===== 问题2: 越界累计时长验证 =====
    console.log('\n📋 问题验证2: 越界累计时长显示');
    
    await page.locator('#resetBtn').click();
    await page.waitForTimeout(1500);
    
    await page.locator('#doorBtn').click();
    console.log('   已开启车门，等待温度上升...');
    
    let alertTriggered = false;
    let alertDurationAtTrigger = '';
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1000);
      const isAlertVisible = await page.locator('#alertBanner').isVisible();
      if (isAlertVisible && !alertTriggered) {
        alertTriggered = true;
        alertDurationAtTrigger = await page.locator('#alertDuration').textContent();
        console.log(`   第${i+1}秒警报触发时，越界累计时长: ${alertDurationAtTrigger}`);
        break;
      }
    }

    await page.waitForTimeout(5000);
    const alertDurationAfter = await page.locator('#alertDuration').textContent();
    console.log(`   警报触发5秒后，越界累计时长: ${alertDurationAfter}`);

    const alertCount = await page.locator('#alertCount').textContent();
    console.log(`   越界次数: ${alertCount}`);

    // ===== 问题3: 检查越界记录列表 =====
    console.log('\n📋 问题验证3: 越界记录列表');
    const alertItems = await page.locator('.alert-item').count();
    console.log(`   越界记录条数: ${alertItems}`);
    
    if (alertItems > 0) {
      const firstItemText = await page.locator('.alert-item').first().textContent();
      console.log(`   第一条记录: ${firstItemText?.trim()}`);
    }

    // ===== 问题4: 检查state中的alertHistory =====
    console.log('\n📋 问题验证4: 状态数据检查');
    const stateCheck = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3001/api/status');
      return await res.json();
    });
    console.log(`   后端状态 - totalAlertDuration: ${stateCheck.totalAlertDuration}秒`);
    console.log(`   后端状态 - alertHistory数量: ${stateCheck.alertHistory?.length || 0}`);
    console.log(`   后端状态 - isAlert: ${stateCheck.isAlert}`);

    // ===== 控制台错误汇总 =====
    console.log('\n📋 控制台错误汇总');
    if (consoleErrors.length > 0) {
      console.log(`   共 ${consoleErrors.length} 个错误:`);
      consoleErrors.forEach((err, i) => {
        console.log(`   ${i+1}. ${err}`);
      });
    } else {
      console.log('   ✅ 无控制台错误');
    }

  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 详细验证测试完成');
}

runDetailedTests().catch(console.error);
