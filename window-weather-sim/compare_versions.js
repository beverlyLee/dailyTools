import { chromium } from 'playwright';

async function compareVersions() {
  console.log('Comparing water intake between versions...');
  const browser = await chromium.launch({ headless: true });
  
  // 测试 3003 端口（新版本）
  console.log('\n=== Port 3003 (new version) ===');
  const page3 = await (await browser.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
  await page3.goto('http://localhost:3003/', { waitUntil: 'networkidle' });
  await page3.click('#stormBtn');
  await page3.waitForTimeout(5000);
  
  const w3_0s = parseFloat(await page3.evaluate(() => document.getElementById('waterAmount')?.textContent || '0'));
  console.log(`  0s: ${w3_0s} ml`);
  
  await page3.waitForTimeout(10000);
  const w3_10s = parseFloat(await page3.evaluate(() => document.getElementById('waterAmount')?.textContent || '0'));
  console.log(`  10s: ${w3_10s} ml`);
  
  const rate3 = (w3_10s - w3_0s) / 10;
  console.log(`  Rate: ${rate3.toFixed(4)} ml/s`);
  
  await page3.close();
  
  // 测试 3000 端口（旧版本）
  console.log('\n=== Port 3000 (old version) ===');
  const page0 = await (await browser.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
  await page0.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  
  // 先看看初始状态
  const initWater0 = parseFloat(await page0.evaluate(() => document.getElementById('waterAmount')?.textContent || '0'));
  const initRain0 = await page0.evaluate(() => document.getElementById('rainIntensity')?.textContent);
  console.log(`  Initial water: ${initWater0} ml`);
  console.log(`  Initial rain label: ${initRain0}`);
  
  await page0.click('#stormBtn');
  await page0.waitForTimeout(5000);
  
  const w0_0s = parseFloat(await page0.evaluate(() => document.getElementById('waterAmount')?.textContent || '0'));
  console.log(`  0s (after storm mode): ${w0_0s} ml`);
  
  await page0.waitForTimeout(10000);
  const w0_10s = parseFloat(await page0.evaluate(() => document.getElementById('waterAmount')?.textContent || '0'));
  console.log(`  10s: ${w0_10s} ml`);
  
  const rate0 = (w0_10s - w0_0s) / 10;
  console.log(`  Rate: ${rate0.toFixed(4)} ml/s`);
  
  console.log('\n=== Comparison ===');
  console.log(`  Old version rate: ${rate0.toFixed(4)} ml/s`);
  console.log(`  New version rate: ${rate3.toFixed(4)} ml/s`);
  console.log(`  Ratio (old/new): ${(rate0 / rate3).toFixed(1)}x`);
  
  await browser.close();
}

compareVersions().catch(console.error);
