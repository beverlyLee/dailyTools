const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const imgDir = path.join(__dirname, '..', 'img');
  if (!fs.existsSync(imgDir)) {
    fs.mkdirSync(imgDir, { recursive: true });
  }
  
  const consoleErrors = [];
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text(), location: msg.location() });
    if (msg.type() === 'error') {
      consoleErrors.push({
        text: msg.text(),
        location: msg.location()
      });
    }
  });
  
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push({
      message: error.message,
      stack: error.stack
    });
  });
  
  const networkRequests = [];
  page.on('request', request => {
    networkRequests.push({ url: request.url(), method: request.method() });
  });
  
  console.log('Navigating to http://localhost:5174...');
  try {
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle', timeout: 60000 });
    console.log('Page loaded');
  } catch (e) {
    console.log('Navigation error:', e.message);
    await page.screenshot({ path: path.join(imgDir, 'round2_error_navigation.png') });
  }
  
  await page.waitForTimeout(8000);
  
  console.log('Taking initial screenshot...');
  await page.screenshot({ path: path.join(imgDir, 'round2_initial_load.png'), fullPage: true });
  
  console.log('Testing coffee shop click...');
  try {
    await page.mouse.click(400, 300);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(imgDir, 'round2_after_click.png') });
  } catch (e) {
    console.log('Click test error:', e.message);
  }
  
  const htmlContent = await page.content();
  fs.writeFileSync(path.join(imgDir, 'round2_page_content.html'), htmlContent);
  
  await browser.close();
  
  console.log('\n=== Round 2 Test Report ===');
  console.log('Console errors:', consoleErrors.length);
  consoleErrors.forEach((e, i) => console.log(`  ${i+1}.`, e.text, JSON.stringify(e.location)));
  console.log('\nPage errors:', pageErrors.length);
  pageErrors.forEach((e, i) => console.log(`  ${i+1}.`, e.message));
  console.log('\nConsole logs:', consoleLogs.length);
  consoleLogs.slice(0, 10).forEach((l, i) => console.log(`  ${i+1}. [${l.type}]`, l.text.substring(0, 100)));
  console.log('\nNetwork requests:', networkRequests.length);
  networkRequests.slice(0, 10).forEach((r, i) => console.log(`  ${i+1}.`, r.method, r.url.substring(0, 80)));
})();
