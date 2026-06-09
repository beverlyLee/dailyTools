import { chromium } from 'playwright';

console.log('Step 1: Launching browser...');
const browser = await chromium.launch({ headless: true });
console.log('Step 1: Done');

console.log('Step 2: Creating context...');
const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
console.log('Step 2: Done');

console.log('Step 3: Creating page...');
const page = await context.newPage();
console.log('Step 3: Done');

console.log('Step 4: Setting timeout...');
page.setDefaultTimeout(10000);
console.log('Step 4: Done');

console.log('Step 5: Navigating...');
try {
  await page.goto('http://localhost:3001/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log('Step 5: Done - Page loaded');
} catch (e) {
  console.log('Step 5: Error -', e.message);
  await browser.close();
  process.exit(1);
}

console.log('Step 6: Waiting 2s...');
await page.waitForTimeout(2000);
console.log('Step 6: Done');

console.log('Step 7: Getting title...');
const title = await page.title();
console.log('Step 7: Done - Title:', title);

console.log('Step 8: Checking canvas...');
const hasCanvas = await page.evaluate(() => document.querySelector('canvas') !== null);
console.log('Step 8: Done - Has canvas:', hasCanvas);

console.log('Step 9: Taking screenshot...');
try {
  await page.screenshot({ path: '/Users/liboyang/trae/dailyTools/ceiling-light-effect/img/debug_test.png', timeout: 10000 });
  console.log('Step 9: Done - Screenshot saved');
} catch (e) {
  console.log('Step 9: Error -', e.message);
}

console.log('Step 10: Getting control panel text...');
try {
  const text = await page.evaluate(() => {
    const panel = document.querySelector('.control-panel');
    return panel ? panel.innerText.substring(0, 200) : 'not found';
  });
  console.log('Step 10: Done - Panel text:', text.substring(0, 100));
} catch (e) {
  console.log('Step 10: Error -', e.message);
}

console.log('Step 11: Testing slider...');
try {
  const result = await page.evaluate(() => {
    const slider = document.getElementById('intensity');
    if (!slider) return 'slider not found';
    const initial = document.getElementById('intensityValue')?.textContent;
    slider.value = 1000;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    const after = document.getElementById('intensityValue')?.textContent;
    return { initial, after };
  });
  console.log('Step 11: Done -', JSON.stringify(result));
} catch (e) {
  console.log('Step 11: Error -', e.message);
}

console.log('Step 12: Waiting 1s...');
await page.waitForTimeout(1000);
console.log('Step 12: Done');

console.log('Step 13: Taking second screenshot...');
try {
  await page.screenshot({ path: '/Users/liboyang/trae/dailyTools/ceiling-light-effect/img/debug_test2.png', timeout: 10000 });
  console.log('Step 13: Done');
} catch (e) {
  console.log('Step 13: Error -', e.message);
}

console.log('\nAll steps completed!');
await browser.close();
