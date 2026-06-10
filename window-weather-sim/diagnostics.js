import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3003/';

async function runDiagnostics() {
  console.log('Starting diagnostics...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  
  let consoleLogs = [];
  page.on('console', (msg) => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    console.log(`PAGE ERROR: ${err.message}`);
  });

  console.log(`Navigating to ${BASE_URL}...`);
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // 注入调试代码，检查雨滴和缝隙参数
  const debugInfo = await page.evaluate(() => {
    // 尝试获取场景实例（通过全局变量）
    const rainSlider = document.getElementById('rainSlider');
    const windSlider = document.getElementById('windSlider');
    const stormBtn = document.getElementById('stormBtn');
    
    return {
      rainSliderValue: rainSlider?.value,
      windSliderValue: windSlider?.value,
      stormBtnText: stormBtn?.textContent
    };
  });
  
  console.log('Initial state:', JSON.stringify(debugInfo, null, 2));

  // 开启暴雨模式
  await page.click('#stormBtn');
  await page.waitForTimeout(2000);
  
  console.log('\nStorm mode activated. Waiting 5 seconds for rain to stabilize...');
  await page.waitForTimeout(5000);

  // 读取一些状态
  const statusAfter5s = await page.evaluate(() => {
    const getText = (id) => document.getElementById(id)?.textContent || 'N/A';
    return {
      waterAmount: getText('waterAmount'),
      waterTightness: getText('waterTightness'),
      airTightness: getText('airTightness'),
      rainIntensity: getText('rainIntensity'),
      windowType: getText('windowType')
    };
  });
  
  console.log('Status after 5s:', JSON.stringify(statusAfter5s, null, 2));

  // 再等 10 秒
  console.log('\nWaiting 10 more seconds...');
  await page.waitForTimeout(10000);
  
  const statusAfter15s = await page.evaluate(() => {
    const getText = (id) => document.getElementById(id)?.textContent || 'N/A';
    return {
      waterAmount: getText('waterAmount'),
      waterTightness: getText('waterTightness')
    };
  });
  
  console.log('Status after 15s:', JSON.stringify(statusAfter15s, null, 2));

  console.log('\n=== Console Logs ===');
  consoleLogs.forEach(log => console.log(log));

  // 截图
  await page.screenshot({ path: './img/r4_diagnostics.png', fullPage: true });
  console.log('\nScreenshot saved to img/r4_diagnostics.png');

  await browser.close();
  console.log('\nDiagnostics completed!');
}

runDiagnostics().catch(console.error);
