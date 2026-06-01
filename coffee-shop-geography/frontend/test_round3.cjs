const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const imgDir = path.join(__dirname, '..', 'img');
  
  const consoleErrors = [];
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text() });
    }
  });
  
  const apiRequests = [];
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      apiRequests.push({ url: request.url(), method: request.method() });
    }
  });
  
  const apiResponses = [];
  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      try {
        const body = await response.text();
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          ok: response.ok(),
          body: body.substring(0, 300)
        });
      } catch (e) {}
    }
  });
  
  console.log('1. Navigating to page...');
  await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded', timeout: 60000 });
  
  console.log('2. Waiting for data loading...');
  await page.waitForTimeout(8000);
  
  console.log('3. Taking initial screenshot...');
  await page.screenshot({ path: path.join(imgDir, 'round3_initial.png'), fullPage: true });
  
  console.log('4. Checking page components...');
  const components = await page.evaluate(() => {
    return {
      header: !!document.querySelector('.header'),
      stats: !!document.querySelector('.stats'),
      legend: !!document.querySelector('.legend'),
      canvas: !!document.querySelector('canvas'),
      loading: !!document.querySelector('.loading')
    };
  });
  console.log('   Components:', components);
  
  console.log('5. Testing coffee shop click interaction...');
  const centerX = 640;
  const centerY = 360;
  
  const testPoints = [
    { x: centerX, y: centerY, desc: 'center' },
    { x: centerX - 100, y: centerY - 50, desc: 'left-up' },
    { x: centerX + 100, y: centerY + 50, desc: 'right-down' }
  ];
  
  let clickSuccess = false;
  for (const pt of testPoints) {
    console.log(`   Clicking at ${pt.desc} (${pt.x}, ${pt.y})...`);
    await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(1500);
    
    const hasPopup = await page.evaluate(() => {
      return !!document.querySelector('.info-popup');
    });
    
    if (hasPopup) {
      console.log(`   ✓ Popup detected at ${pt.desc}!`);
      clickSuccess = true;
      await page.screenshot({ path: path.join(imgDir, `round3_click_${pt.desc}.png`) });
      
      const popupInfo = await page.evaluate(() => {
        const popup = document.querySelector('.info-popup');
        if (!popup) return null;
        return {
          hasTitle: !!popup.querySelector('h3'),
          hasDistance: popup.textContent.includes('米') || popup.textContent.includes('distance'),
          text: popup.textContent.substring(0, 100)
        };
      });
      console.log('   Popup info:', popupInfo);
      break;
    }
  }
  
  if (!clickSuccess) {
    console.log('   ✗ No popup detected after clicks');
  }
  
  console.log('\n6. Verifying statistics...');
  const statsText = await page.evaluate(() => {
    const stats = document.querySelector('.stats');
    return stats ? stats.textContent : null;
  });
  console.log('   Statistics text:', statsText?.substring(0, 100));
  
  console.log('\n=== Round 3 Test Report ===');
  console.log('\nConsole Errors:', consoleErrors.length);
  consoleErrors.forEach(e => console.log('  -', e.text));
  
  console.log('\nConsole Logs (last 10):');
  consoleLogs.slice(-10).forEach(l => console.log(`  [${l.type}]`, l.text.substring(0, 80)));
  
  console.log('\nAPI Responses:');
  apiResponses.forEach(r => {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.status} ${r.url.substring(0, 50)}`);
  });
  
  console.log('\nComponent Status:');
  Object.entries(components).forEach(([key, val]) => {
    console.log(`  ${key}: ${val ? '✓' : '✗'}`);
  });
  
  console.log('\nInteraction Test:');
  console.log(`  Coffee shop click popup: ${clickSuccess ? '✓' : '✗'}`);
  
  await page.screenshot({ path: path.join(imgDir, 'round3_final.png') });
  await browser.close();
  
  console.log('\nTest completed! Screenshots saved to img/');
})();
