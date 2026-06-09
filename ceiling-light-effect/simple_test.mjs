import { chromium } from 'playwright';

console.log('Launching browser...');

const browser = await chromium.launch({ headless: true });
console.log('Browser launched');

const context = await browser.newContext({ viewport: { width: 800, height: 600 } });
console.log('Context created');

const page = await context.newPage();
console.log('Page created');

try {
  console.log('Navigating to about:blank...');
  await page.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 5000 });
  console.log('Navigation success');
  
  await page.setContent('<h1>Test Page</h1>');
  console.log('Content set');
  
  const title = await page.title();
  console.log('Title:', title);
  
  await page.screenshot({ path: '/Users/liboyang/trae/dailyTools/ceiling-light-effect/img/simple_test.png' });
  console.log('Screenshot taken');
  
} catch (e) {
  console.error('Error:', e.message);
}

await browser.close();
console.log('Done');
