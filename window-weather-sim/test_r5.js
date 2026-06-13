import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const IMG_DIR = './img';
const BASE_URL = 'http://localhost:3003/';

if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

async function test() {
  console.log('=== Round 5 Testing ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  let consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push('PAGE: ' + err.message));

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // ===== Test 1: Initial state =====
  console.log('\n[Test 1] Initial State');
  const s1 = await getStatus(page);
  console.log(`  Rain: ${s1.rainLabel} (${s1.rainSlider}%), Wind: ${s1.windLabel} (${s1.windSlider}%)`);
  console.log(`  Window: ${s1.windowType}, Water: ${s1.waterAmount}, Status: ${s1.waterStatus}`);
  console.log(`  Initial OK: ${s1.rainLabel === '无雨' && s1.waterAmount === 0 ? 'YES' : 'NO'}`);
  await shot(page, 'r5_01_initial');

  // ===== Test 2: Sliding + Storm, measure water intake rate =====
  console.log('\n[Test 2] Sliding Window + Storm Mode');
  await page.click('#stormBtn');
  await page.waitForTimeout(1000);
  
  const measurements = [];
  for (let i = 0; i <= 12; i++) {
    const s = await getStatus(page);
    measurements.push({ time: i, water: s.waterAmount, status: s.waterStatus });
    if (i % 3 === 0) console.log(`  ${i}s: ${s.waterAmount} ml, Status: ${s.waterStatus}`);
    if (i < 12) await page.waitForTimeout(1000);
  }
  
  const totalTime = 12;
  const startW = measurements[0].water;
  const endW = measurements[totalTime].water;
  const rate = (endW - startW) / totalTime;
  console.log(`  Rate: ${rate.toFixed(3)} ml/s`);
  console.log(`  Target rate: ~0.3-0.5 ml/s (to reach 2.5ml warning in ~5-8s)`);
  
  const reachedWarning = measurements.some(m => m.status === '警告');
  const reachedDanger = measurements.some(m => m.status === '严重');
  console.log(`  Reached 警告 in 12s: ${reachedWarning ? 'YES' : 'NO'}`);
  console.log(`  Reached 严重 in 12s: ${reachedDanger ? 'YES' : 'NO'}`);
  
  const warningTime = measurements.findIndex(m => m.status === '警告');
  const dangerTime = measurements.findIndex(m => m.status === '严重');
  if (warningTime >= 0) console.log(`  Time to 警告: ~${warningTime}s (expected ~5s)`);
  if (dangerTime >= 0) console.log(`  Time to 严重: ~${dangerTime}s (expected ~15s)`);
  
  await shot(page, 'r5_02_sliding_storm_12s');

  // ===== Test 3: Check drain path visibility =====
  console.log('\n[Test 3] Drain Path Visibility');
  const drainVisible = await page.evaluate(() => {
    const toggle = document.getElementById('drainToggle');
    return toggle?.checked;
  });
  console.log(`  Drain toggle checked: ${drainVisible ? 'YES' : 'NO'}`);
  await shot(page, 'r5_03_drain_path');

  // ===== Test 4: Switch to casement, verify water resets and stays dry =====
  console.log('\n[Test 4] Casement Window (should stay dry)');
  await page.selectOption('#windowTypeSelect', 'casement');
  await page.waitForTimeout(1000);
  const s4 = await getStatus(page);
  console.log(`  After switch - Water: ${s4.waterAmount} ml, Reset: ${s4.waterAmount === 0 ? 'YES' : 'NO'}`);
  
  // 让暴雨持续 10 秒，检查平开窗是否保持干燥
  await page.waitForTimeout(10000);
  const s4b = await getStatus(page);
  console.log(`  After 10s storm - Water: ${s4b.waterAmount} ml`);
  console.log(`  Casement stays mostly dry (<1ml): ${s4b.waterAmount < 1 ? 'YES' : 'NO'}`);
  const slidingRate = rate;
  const casementIncrease = s4b.waterAmount - s4.waterAmount;
  const casementRate = casementIncrease / 10;
  console.log(`  Casement rate: ${casementRate.toFixed(4)} ml/s`);
  console.log(`  Ratio (sliding/casement): ${slidingRate > 0 && casementRate > 0 ? (slidingRate / casementRate).toFixed(1) : 'N/A'}x (expected >10x)`);
  await shot(page, 'r5_04_casement_storm_10s');

  // ===== Test 5: Reset button =====
  console.log('\n[Test 5] Reset Button');
  await page.click('#resetBtn');
  await page.waitForTimeout(1000);
  const s5 = await getStatus(page);
  console.log(`  Rain: ${s5.rainLabel} (${s5.rainSlider}%), Wind: ${s5.windLabel} (${s5.windSlider}%)`);
  console.log(`  Window: ${s5.windowType}, Water: ${s5.waterAmount}, StormBtn: ${s5.stormBtnText}`);
  const resetOK = s5.rainSlider === '0' && s5.windSlider === '0' && s5.waterAmount === 0 && s5.windowType === '推拉窗';
  console.log(`  Reset OK: ${resetOK ? 'YES' : 'NO'}`);
  await shot(page, 'r5_05_after_reset');

  // ===== Test 6: Water stains visual check (accumulate more water) =====
  console.log('\n[Test 6] Water Stains Visual');
  await page.selectOption('#windowTypeSelect', 'sliding');
  await page.waitForTimeout(500);
  await page.click('#stormBtn');
  await page.waitForTimeout(15000);
  const s6 = await getStatus(page);
  console.log(`  After 15s - Water: ${s6.waterAmount} ml, Status: ${s6.waterStatus}`);
  await shot(page, 'r5_06_water_stains_15s');

  // ===== Summary =====
  console.log('\n=== SUMMARY ===');
  console.log(`Console/Page errors: ${consoleErrors.length}`);
  consoleErrors.forEach((e, i) => console.log(`  [${i+1}] ${e}`));
  
  console.log(`\nKey metrics:`);
  console.log(`  - Initial state correct: ${s1.rainLabel === '无雨' && s1.waterAmount === 0 ? 'PASS' : 'FAIL'}`);
  console.log(`  - Water intake rate: ${rate.toFixed(3)} ml/s (target ~0.3-0.5)`);
  console.log(`  - Reached 警告 in 12s: ${reachedWarning ? 'PASS' : 'FAIL'}`);
  console.log(`  - Reached 严重 in 12s: ${reachedDanger ? 'PASS' : 'FAIL (not required, but nice to have)'}`);
  console.log(`  - Casement stays dry: ${s4b.waterAmount < 1 ? 'PASS' : 'FAIL'}`);
  console.log(`  - Window type difference (sliding/casement rate ratio): ${slidingRate > 0 && casementRate > 0 ? (slidingRate / casementRate).toFixed(1) + 'x' : 'N/A'}`);
  console.log(`  - Reset button works: ${resetOK ? 'PASS' : 'FAIL'}`);

  await browser.close();
  console.log('\nDone!');
}

async function getStatus(page) {
  return await page.evaluate(() => {
    const getText = (id) => document.getElementById(id)?.textContent || 'N/A';
    const getValue = (id) => document.getElementById(id)?.value || 'N/A';
    const waterText = getText('waterAmount');
    return {
      windowType: getText('windowType'),
      rainLabel: getText('rainIntensity'),
      windLabel: getText('windSpeed'),
      waterStatus: getText('waterTightness'),
      airStatus: getText('airTightness'),
      waterAmount: parseFloat(waterText) || 0,
      rainSlider: getValue('rainSlider'),
      windSlider: getValue('windSlider'),
      stormBtnText: document.getElementById('stormBtn')?.textContent || 'N/A'
    };
  });
}

async function shot(page, name) {
  const filePath = path.join(IMG_DIR, `${name}.png`);
  try {
    await page.screenshot({ path: filePath, fullPage: true, timeout: 15000 });
    console.log(`  Screenshot: ${filePath}`);
  } catch (e) {
    console.log(`  Screenshot failed: ${e.message}`);
  }
}

test().catch(e => { console.error(e); process.exit(1); });
