import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3003/';

async function runDeepDiagnostics() {
  console.log('Starting deep diagnostics...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // 等一下让场景初始化
  await page.waitForTimeout(2000);

  // 开启暴雨模式
  await page.click('#stormBtn');
  await page.waitForTimeout(3000);

  // 注入调试代码，直接访问场景
  const debugResult = await page.evaluate(() => {
    // 尝试通过 canvas 和 Three.js 场景来获取信息
    // 由于场景是封装的，我们需要换个方式
    // 让我们通过 DOM 和一些基本检测来推断

    const canvas = document.querySelector('canvas');
    const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
    
    return {
      canvasWidth: canvas?.width,
      canvasHeight: canvas?.height,
      hasGL: !!gl,
      hasWebGL2: !!(canvas?.getContext('webgl2'))
    };
  });

  console.log('Canvas info:', JSON.stringify(debugResult, null, 2));

  // 让我们换个方式：统计一段时间内的进水量变化，计算进水速率
  console.log('\n=== Measuring water intake rate ===');
  
  const results = [];
  for (let i = 0; i < 10; i++) {
    const waterText = await page.evaluate(() => document.getElementById('waterAmount')?.textContent);
    const waterAmt = parseFloat(waterText || '0');
    results.push({ time: i * 2, water: waterAmt });
    console.log(`  ${i * 2}s: ${waterAmt} ml`);
    await page.waitForTimeout(2000);
  }

  const totalTime = 18; // 秒
  const totalIncrease = results[results.length - 1].water - results[0].water;
  const ratePerSecond = totalIncrease / totalTime;
  
  console.log(`\nWater intake rate: ${ratePerSecond.toFixed(4)} ml/s`);
  console.log(`Total increase in ${totalTime}s: ${totalIncrease.toFixed(2)} ml`);

  // 检查窗户类型
  const windowType = await page.evaluate(() => document.getElementById('windowType')?.textContent);
  console.log(`\nWindow type: ${windowType}`);

  // 检查风速和雨强
  const rainIntensity = await page.evaluate(() => document.getElementById('rainIntensity')?.textContent);
  const windSpeed = await page.evaluate(() => document.getElementById('windSpeed')?.textContent);
  console.log(`Rain intensity: ${rainIntensity}`);
  console.log(`Wind speed: ${windSpeed}`);

  // 检查水密性状态的阈值
  console.log('\n=== Checking water tightness thresholds ===');
  console.log('  Warning threshold should be ~2.5ml');
  console.log('  Danger threshold should be ~12ml');
  console.log(`  Current status: ${await page.evaluate(() => document.getElementById('waterTightness')?.textContent)}`);
  console.log(`  Current water: ${await page.evaluate(() => document.getElementById('waterAmount')?.textContent)}`);

  // 截图
  await page.screenshot({ path: './img/r4_deep_diagnostics.png', fullPage: true });
  console.log('\nScreenshot saved to img/r4_deep_diagnostics.png');

  await browser.close();
  console.log('\nDeep diagnostics completed!');
}

runDeepDiagnostics().catch(console.error);
