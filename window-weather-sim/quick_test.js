import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const IMG_DIR = './img';
const BASE_URL = 'http://localhost:3003/';

if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

async function quickTest() {
  console.log('Quick verification test...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  let consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  
  // Test 1: Initial state
  console.log('\n=== Test 1: Initial State ===');
  const s0 = await getStatus(page);
  console.log(`  Rain label: ${s0.rain} (slider: ${s0.rainSlider}%)`);
  console.log(`  Wind label: ${s0.wind} (slider: ${s0.windSlider}%)`);
  console.log(`  Water: ${s0.waterAmount}`);
  console.log(`  Window type: ${s0.windowType}`);
  console.log(`  Rain label matches: ${s0.rain === '无雨' ? 'YES' : 'NO'}`);
  console.log(`  Water is 0: ${parseFloat(s0.waterAmount) === 0 ? 'YES' : 'NO'}`);
  await screenshot(page, 'r4_final_01_initial');

  // Test 2: Storm mode, wait for water
  console.log('\n=== Test 2: Storm Mode Water Intake ===');
  await page.click('#stormBtn');
  await page.waitForTimeout(1000);
  
  const startWater = parseFloat((await getStatus(page)).waterAmount);
  console.log(`  Start water: ${startWater} ml`);
  
  console.log('  Waiting 20 seconds...');
  await page.waitForTimeout(20000);
  
  const endWater = parseFloat((await getStatus(page)).waterAmount);
  const waterStatus = (await getStatus(page)).waterTightness;
  const rate = (endWater - startWater) / 20;
  console.log(`  End water: ${endWater} ml`);
  console.log(`  Water status: ${waterStatus}`);
  console.log(`  Rate: ${rate.toFixed(4)} ml/s`);
  console.log(`  Expected warning threshold: ~2.5 ml`);
  console.log(`  Reached warning in 20s: ${waterStatus !== '良好' ? 'YES' : 'NO'}`);
  await screenshot(page, 'r4_final_02_storm_20s');

  // Test 3: Switch to casement
  console.log('\n=== Test 3: Switch to Casement ===');
  await page.selectOption('#windowTypeSelect', 'casement');
  await page.waitForTimeout(1000);
  const s3 = await getStatus(page);
  console.log(`  Window type: ${s3.windowType}`);
  console.log(`  Water after switch: ${s3.waterAmount}`);
  console.log(`  Water reset: ${parseFloat(s3.waterAmount) === 0 ? 'YES' : 'NO'}`);
  await screenshot(page, 'r4_final_03_casement');

  // Test 4: Reset button
  console.log('\n=== Test 4: Reset Button ===');
  await page.click('#resetBtn');
  await page.waitForTimeout(1000);
  const s4 = await getStatus(page);
  console.log(`  Rain slider: ${s4.rainSlider}%`);
  console.log(`  Wind slider: ${s4.windSlider}%`);
  console.log(`  Water: ${s4.waterAmount}`);
  console.log(`  Window type: ${s4.windowType}`);
  console.log(`  Storm button text: ${s4.stormBtnText}`);
  console.log(`  Reset OK: ${s4.rainSlider === '0' && s4.windSlider === '0' && parseFloat(s4.waterAmount) === 0 ? 'YES' : 'NO'}`);
  await screenshot(page, 'r4_final_04_reset');

  // Test 5: Casement + storm (should stay dry)
  console.log('\n=== Test 5: Casement + Storm (should stay dry) ===');
  await page.selectOption('#windowTypeSelect', 'casement');
  await page.waitForTimeout(500);
  await page.click('#stormBtn');
  await page.waitForTimeout(15000);
  const s5 = await getStatus(page);
  console.log(`  Water after 15s: ${s5.waterAmount} ml`);
  console.log(`  Water status: ${s5.waterTightness}`);
  console.log(`  Stays dry (<0.5ml): ${parseFloat(s5.waterAmount) < 0.5 ? 'YES' : 'NO'}`);
  await screenshot(page, 'r4_final_05_casement_storm');

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Console errors: ${consoleErrors.length}`);
  consoleErrors.forEach((e, i) => console.log(`  [${i+1}] ${e}`));
  
  console.log(`\nKey findings:`);
  console.log(`  - Initial state correct: ${s0.rain === '无雨' && parseFloat(s0.waterAmount) === 0 ? 'YES' : 'NO'}`);
  console.log(`  - Water intake rate: ${rate.toFixed(4)} ml/s (very slow)`);
  console.log(`  - Warning reached in 20s: ${waterStatus !== '良好' ? 'YES' : 'NO'}`);
  console.log(`  - Reset works: ${s4.rainSlider === '0' && s4.windSlider === '0' ? 'YES' : 'NO'}`);
  console.log(`  - Casement stays dry: ${parseFloat(s5.waterAmount) < 0.5 ? 'YES' : 'NO'}`);

  await browser.close();
  console.log('\nTest complete!');
}

async function getStatus(page) {
  return await page.evaluate(() => {
    const getText = (id) => document.getElementById(id)?.textContent || 'N/A';
    const getValue = (id) => document.getElementById(id)?.value || 'N/A';
    return {
      windowType: getText('windowType'),
      rain: getText('rainIntensity'),
      wind: getText('windSpeed'),
      waterTightness: getText('waterTightness'),
      airTightness: getText('airTightness'),
      waterAmount: getText('waterAmount'),
      rainSlider: getValue('rainSlider'),
      windSlider: getValue('windSlider'),
      stormBtnText: document.getElementById('stormBtn')?.textContent || 'N/A'
    };
  });
}

async function screenshot(page, name) {
  const filePath = path.join(IMG_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`  Screenshot: ${filePath}`);
}

quickTest().catch(console.error);
