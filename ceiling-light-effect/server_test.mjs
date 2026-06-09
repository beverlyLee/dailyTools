import { chromium } from 'playwright';
import http from 'http';

function checkServer(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve({ status: res.statusCode, ok: res.statusCode === 200 });
    });
    req.on('error', (e) => {
      resolve({ status: 'error', ok: false, message: e.message });
    });
    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ status: 'timeout', ok: false });
    });
  });
}

console.log('Checking server at http://localhost:3001/...');
const serverStatus = await checkServer('http://localhost:3001/');
console.log('Server status:', JSON.stringify(serverStatus, null, 2));

if (serverStatus.ok) {
  console.log('\nLaunching browser to test page...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const page = await context.newPage();
  
  let consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('[Console Error]', msg.text());
    }
  });
  
  page.on('pageerror', err => {
    console.error('[Page Error]', err.message);
    consoleErrors.push(err.message);
  });
  
  try {
    console.log('Navigating to page...');
    await page.goto('http://localhost:3001/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    console.log('Page loaded!');
    
    await page.waitForTimeout(2000);
    
    const title = await page.title();
    console.log('Page title:', title);
    
    const hasCanvas = await page.evaluate(() => document.querySelector('canvas') !== null);
    console.log('Has canvas:', hasCanvas);
    
    const hasControlPanel = await page.evaluate(() => document.querySelector('.control-panel') !== null);
    console.log('Has control panel:', hasControlPanel);
    
    await page.screenshot({ path: '/Users/liboyang/trae/dailyTools/ceiling-light-effect/img/server_test.png' });
    console.log('Screenshot saved');
    
    console.log('Console errors count:', consoleErrors.length);
    
  } catch (e) {
    console.error('Navigation error:', e.message);
  }
  
  await browser.close();
}

console.log('\nDone');
