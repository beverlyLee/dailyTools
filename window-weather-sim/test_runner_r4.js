import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const IMG_DIR = './img';
const BASE_URL = 'http://localhost:3003/';

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
    const getValue = (id) => document.getElementById(id)?.value || 'N/A';
    return {
      windowType: getText('windowType'),
      rainIntensity: getText('rainIntensity'),
      windSpeed: getText('windSpeed'),
      waterTightness: getText('waterTightness'),
      airTightness: getText('airTightness'),
      waterAmount: getText('waterAmount'),
      waterMeterWidth: getWidth('waterMeter'),
      rainSliderValue: getValue('rainSlider'),
      windSliderValue: getValue('windSlider'),
      rainValueText: getText('rainValue'),
      windValueText: getText('windValue')
    };
  });
}

async function waitForStatusChange(page, statusId, targetStatus, timeoutMs = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const current = await page.evaluate((id) => document.getElementById(id)?.textContent, statusId);
    if (current === targetStatus) {
      log(`  Status ${statusId} changed to '${targetStatus}' after ${Date.now() - startTime}ms`);
      return true;
    }
    await page.waitForTimeout(200);
  }
  const finalStatus = await page.evaluate((id) => document.getElementById(id)?.textContent, statusId);
  log(`  Status ${statusId} did not change to '${targetStatus}' (current: '${finalStatus}') after ${timeoutMs}ms`);
  return false;
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
  log('\n=== Test 1: Initial State (Dry & Consistent) ===');
  const initialStatus = await getStatus(page);
  log(`  Window type: ${initialStatus.windowType}`);
  log(`  Rain intensity label: ${initialStatus.rainIntensity}`);
  log(`  Wind speed label: ${initialStatus.windSpeed}`);
  log(`  Rain slider value: ${initialStatus.rainSliderValue}%`);
  log(`  Wind slider value: ${initialStatus.windSliderValue}%`);
  log(`  Water tightness: ${initialStatus.waterTightness}`);
  log(`  Water amount: ${initialStatus.waterAmount}`);
  
  const rainSliderPercent = parseInt(initialStatus.rainSliderValue);
  const expectedRainLabel = rainSliderPercent < 10 ? '无雨' : 
                           rainSliderPercent < 30 ? '小雨' :
                           rainSliderPercent < 50 ? '中雨' :
                           rainSliderPercent < 70 ? '大雨' :
                           rainSliderPercent < 90 ? '暴雨' : '大暴雨';
  const rainLabelConsistent = initialStatus.rainIntensity === expectedRainLabel;
  log(`  Rain label consistent: ${rainLabelConsistent ? 'YES ✓' : 'NO ✗'}`);
  
  const isDry = parseFloat(initialStatus.waterAmount) === 0;
  log(`  Initial water is 0: ${isDry ? 'YES ✓' : 'NO ✗'}`);
  
  await screenshot(page, 'r4_test_01_initial_state');

  // Test 2: Storm mode with sliding window
  log('\n=== Test 2: Sliding Window + Storm Mode ===');
  await page.click('#stormBtn');
  await page.waitForTimeout(1000);
  
  // 等待警告状态
  log('  Waiting for water tightness 警告...');
  const warningChanged = await waitForStatusChange(page, 'waterTightness', '警告', 20000);
  const warningAmount = parseFloat((await getStatus(page)).waterAmount);
  log(`  Water at warning: ${warningAmount} ml`);
  
  // 等待严重状态
  log('  Waiting for water tightness 严重...');
  const dangerChanged = await waitForStatusChange(page, 'waterTightness', '严重', 40000);
  const dangerAmount = parseFloat((await getStatus(page)).waterAmount);
  log(`  Water at danger: ${dangerAmount} ml`);
  
  await screenshot(page, 'r4_test_02_sliding_storm_danger');

  // Test 3: Switch to casement
  log('\n=== Test 3: Switch to Casement Window ===');
  await page.selectOption('#windowTypeSelect', 'casement');
  await page.waitForTimeout(1000);
  
  const casementStatus = await getStatus(page);
  log(`  Window type: ${casementStatus.windowType}`);
  log(`  Water amount: ${casementStatus.waterAmount}`);
  log(`  Air tightness: ${casementStatus.airTightness}`);
  
  const waterReset = parseFloat(casementStatus.waterAmount) === 0;
  log(`  Water reset after switch: ${waterReset ? 'YES ✓' : 'NO ✗'}`);
  
  await screenshot(page, 'r4_test_03_casement_window');

  // Test 4: Casement + storm
  log('\n=== Test 4: Casement + Storm (should stay dry) ===');
  await page.click('#resetBtn');
  await page.waitForTimeout(500);
  await page.selectOption('#windowTypeSelect', 'casement');
  await page.waitForTimeout(500);
  await page.click('#stormBtn');
  await page.waitForTimeout(500);
  
  const beforeAmt = parseFloat((await getStatus(page)).waterAmount);
  log(`  Water before: ${beforeAmt} ml`);
  
  log('  Waiting 15 seconds...');
  await page.waitForTimeout(15000);
  
  const afterStatus = await getStatus(page);
  const afterAmt = parseFloat(afterStatus.waterAmount);
  log(`  Water after 15s: ${afterAmt} ml`);
  log(`  Water increase: ${(afterAmt - beforeAmt).toFixed(2)} ml`);
  
  const staysDry = afterAmt < 1.0;
  log(`  Casement stays dry: ${staysDry ? 'YES ✓' : 'NO ✗'}`);
  
  await screenshot(page, 'r4_test_04_casement_storm');

  // Test 5: Reset button
  log('\n=== Test 5: Reset Button ===');
  await page.click('#resetBtn');
  await page.waitForTimeout(1000);
  
  const resetStatus = await getStatus(page);
  log(`  Rain slider: ${resetStatus.rainSliderValue}%`);
  log(`  Wind slider: ${resetStatus.windSliderValue}%`);
  log(`  Water amount: ${resetStatus.waterAmount}`);
  
  const resetOK = resetStatus.rainSliderValue === '0' && 
                   resetStatus.windSliderValue === '0' &&
                   parseFloat(resetStatus.waterAmount) === 0;
  log(`  Reset works correctly: ${resetOK ? 'YES ✓' : 'NO ✗'}`);
  
  await screenshot(page, 'r4_test_05_after_reset');

  // Test 6: Water stains accumulation
  log('\n=== Test 6: Water Stains Visual ===');
  await page.selectOption('#windowTypeSelect', 'sliding');
  await page.waitForTimeout(500);
  await page.click('#stormBtn');
  await page.waitForTimeout(12000);
  
  const stainsStatus = await getStatus(page);
  log(`  Water after 12s: ${stainsStatus.waterAmount} ml`);
  log(`  Water tightness: ${stainsStatus.waterTightness}`);
  
  await screenshot(page, 'r4_test_06_water_stains');

  // Summary
  log('\n=== Test Summary ===');
  log(`Console errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) consoleErrors.forEach((e, i) => log(`  [${i + 1}] ${e}`));
  
  log(`Page errors: ${errors.length}`);
  if (errors.length > 0) errors.forEach((e, i) => log(`  [${i + 1}] ${e}`));
  
  log(`\nKey results:`);
  log(`  - Rain label consistent: ${rainLabelConsistent ? 'YES ✓' : 'NO ✗'}`);
  log(`  - Initial water = 0: ${isDry ? 'YES ✓' : 'NO ✗'}`);
  log(`  - Warning status reached: ${warningChanged ? 'YES ✓' : 'NO ✗'}`);
  log(`  - Danger status reached: ${dangerChanged ? 'YES ✓' : 'NO ✗'}`);
  log(`  - Water at warning: ${warningAmount} ml (target ~2.5ml)`);
  log(`  - Water at danger: ${dangerAmount} ml (target ~12ml)`);
  log(`  - Casement stays dry: ${staysDry ? 'YES ✓' : 'NO ✗'}`);
  log(`  - Reset works: ${resetOK ? 'YES ✓' : 'NO ✗'}`);

  await browser.close();
  log('\nTests completed!');
}

runTests().catch(console.error);
