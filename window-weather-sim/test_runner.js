import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const IMG_DIR = './img';
const BASE_URL = 'http://localhost:3050/';

if (!fs.existsSync(IMG_DIR)) {
  fs.mkdirSync(IMG_DIR, { recursive: true });
}

function log(msg) {
  console.log(`[TEST] ${msg}`);
}

async function screenshot(page, name) {
  const filePath = path.join(IMG_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  log(`Screenshot saved: ${filePath}`);
}

async function getStatus(page) {
  return await page.evaluate(() => {
    const getText = (id) => document.getElementById(id)?.textContent || 'N/A';
    const getWidth = (id) => document.getElementById(id)?.style.width || 'N/A';
    return {
      windowType: getText('windowType'),
      rainIntensity: getText('rainIntensity'),
      windSpeed: getText('windSpeed'),
      waterTightness: getText('waterTightness'),
      airTightness: getText('airTightness'),
      waterAmount: getText('waterAmount'),
      waterMeterWidth: getWidth('waterMeter')
    };
  });
}

async function waitForWaterIncrease(page, timeoutMs = 20000) {
  const startTime = Date.now();
  let initialAmount = null;
  
  while (Date.now() - startTime < timeoutMs) {
    const status = await getStatus(page);
    const amount = parseFloat(status.waterAmount);
    
    if (initialAmount === null) {
      initialAmount = amount;
      log(`  Initial water amount: ${amount} ml`);
    }
    
    if (amount > initialAmount + 0.1) {
      log(`  Water increased to ${amount} ml after ${Date.now() - startTime}ms`);
      return { increased: true, amount, elapsed: Date.now() - startTime };
    }
    
    await page.waitForTimeout(1000);
  }
  
  const finalStatus = await getStatus(page);
  log(`  No water increase after ${timeoutMs}ms`);
  return { increased: false, amount: parseFloat(finalStatus.waterAmount), elapsed: timeoutMs };
}

async function runTests() {
  log('Starting browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  
  let errors = [];
  let consoleErrors = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  page.on('pageerror', (err) => {
    errors.push(err.message);
  });

  log(`Navigating to ${BASE_URL}...`);
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  
  const title = await page.title();
  log(`Page title: ${title}`);
  
  if (!title.includes('窗户天气模拟')) {
    log('ERROR: Wrong page loaded!');
    await browser.close();
    process.exit(1);
  }

  // Test 1: Initial state
  log('\n=== Test 1: Initial State ===');
  const initialStatus = await getStatus(page);
  log(`  Window type: ${initialStatus.windowType}`);
  log(`  Rain intensity: ${initialStatus.rainIntensity}`);
  log(`  Wind speed: ${initialStatus.windSpeed}`);
  log(`  Water tightness: ${initialStatus.waterTightness}`);
  log(`  Air tightness: ${initialStatus.airTightness}`);
  log(`  Water amount: ${initialStatus.waterAmount}`);
  await screenshot(page, 'r2_test_01_initial_state');

  // Test 2: Storm mode with sliding window - verify rain direction fix
  log('\n=== Test 2: Sliding Window + Storm Mode ===');
  await page.click('#stormBtn');
  await page.waitForTimeout(1000);
  
  const stormStatus = await getStatus(page);
  log(`  Rain intensity: ${stormStatus.rainIntensity}`);
  log(`  Wind speed: ${stormStatus.windSpeed}`);
  
  log('  Waiting for water to accumulate (20s max)...');
  const waterResult = await waitForWaterIncrease(page, 20000);
  log(`  Water increased: ${waterResult.increased}`);
  log(`  Final water: ${waterResult.amount} ml`);
  await screenshot(page, 'r2_test_02_sliding_storm');

  // Test 3: Switch to casement window - verify state sync
  log('\n=== Test 3: Switch to Casement Window ===');
  await page.selectOption('#windowTypeSelect', 'casement');
  await page.waitForTimeout(1000);
  
  const casementStatus = await getStatus(page);
  log(`  Window type: ${casementStatus.windowType}`);
  log(`  Air tightness: ${casementStatus.airTightness}`);
  log(`  Water amount: ${casementStatus.waterAmount}`);
  await screenshot(page, 'r2_test_03_casement_window');

  // Test 4: Casement + storm - should stay dry
  log('\n=== Test 4: Casement + Storm Mode (should stay dry) ===');
  const casementWaterBefore = parseFloat(casementStatus.waterAmount);
  await page.waitForTimeout(10000);
  
  const casementStormStatus = await getStatus(page);
  const casementWaterAfter = parseFloat(casementStormStatus.waterAmount);
  log(`  Water before: ${casementWaterBefore} ml`);
  log(`  Water after 10s: ${casementWaterAfter} ml`);
  log(`  Water increase: ${casementWaterAfter - casementWaterBefore} ml`);
  await screenshot(page, 'r2_test_04_casement_storm');

  // Test 5: Reset button
  log('\n=== Test 5: Reset Button ===');
  await page.click('#resetBtn');
  await page.waitForTimeout(1000);
  
  const resetStatus = await getStatus(page);
  log(`  Window type: ${resetStatus.windowType}`);
  log(`  Rain intensity: ${resetStatus.rainIntensity}`);
  log(`  Wind speed: ${resetStatus.windSpeed}`);
  log(`  Water amount: ${resetStatus.waterAmount}`);
  
  const rainValue = await page.evaluate(() => document.getElementById('rainValue')?.textContent || 'N/A');
  const windValue = await page.evaluate(() => document.getElementById('windValue')?.textContent || 'N/A');
  const drainChecked = await page.evaluate(() => document.getElementById('drainToggle')?.checked);
  const curtainChecked = await page.evaluate(() => document.getElementById('curtainToggle')?.checked);
  log(`  Rain slider value: ${rainValue}`);
  log(`  Wind slider value: ${windValue}`);
  log(`  Drain toggle: ${drainChecked}`);
  log(`  Curtain toggle: ${curtainChecked}`);
  await screenshot(page, 'r2_test_05_after_reset');

  // Test 6: Air tightness sync test
  log('\n=== Test 6: Air Tightness State Sync ===');
  await page.selectOption('#windowTypeSelect', 'sliding');
  await page.waitForTimeout(500);
  const slidingAirStatus = await getStatus(page);
  log(`  Sliding window air tightness: ${slidingAirStatus.airTightness}`);
  
  await page.selectOption('#windowTypeSelect', 'casement');
  await page.waitForTimeout(500);
  const casementAirStatus = await getStatus(page);
  log(`  Casement window air tightness: ${casementAirStatus.airTightness}`);
  
  const airStatusChanged = slidingAirStatus.airTightness !== casementAirStatus.airTightness;
  log(`  Air tightness changes with window type: ${airStatusChanged}`);

  // Summary
  log('\n=== Test Summary ===');
  log(`Console errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    consoleErrors.forEach((e, i) => log(`  [${i + 1}] ${e}`));
  }
  
  log(`Page errors: ${errors.length}`);
  if (errors.length > 0) {
    errors.forEach((e, i) => log(`  [${i + 1}] ${e}`));
  }
  
  log(`\nKey results:`);
  log(`  - Sliding window water increase: ${waterResult.increased ? 'YES ✓' : 'NO ✗'}`);
  log(`  - Water amount after storm: ${waterResult.amount} ml`);
  log(`  - Air tightness sync: ${airStatusChanged ? 'YES ✓' : 'NO ✗'}`);
  log(`  - Reset window type: ${resetStatus.windowType === '推拉窗' ? 'OK ✓' : 'FAIL ✗'}`);
  log(`  - Reset water amount: ${resetStatus.waterAmount === '0.0 ml' ? 'OK ✓' : 'FAIL ✗'}`);

  await browser.close();
  log('\nTests completed!');
}

runTests().catch(console.error);
