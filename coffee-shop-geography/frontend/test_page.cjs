const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const imgDir = path.join(__dirname, 'img');
  if (!fs.existsSync(imgDir)) {
    fs.mkdirSync(imgDir, { recursive: true });
  }
  
  const consoleErrors = [];
  page.on('console', msg => {
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
  
  console.log('Navigating to http://localhost:3000...');
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Page loaded');
  } catch (e) {
    console.log('Navigation error:', e.message);
    await page.screenshot({ path: path.join(imgDir, 'error_navigation.png') });
  }
  
  await page.waitForTimeout(5000);
  
  console.log('Taking initial screenshot...');
  await page.screenshot({ path: path.join(imgDir, 'initial_load.png'), fullPage: true });
  
  console.log('Console errors:', consoleErrors);
  console.log('Page errors:', pageErrors);
  
  console.log('Testing coffee shop click...');
  try {
    await page.evaluate(() => {
      window.clickTest = 'test';
    });
    await page.screenshot({ path: path.join(imgDir, 'after_click_test.png') });
  } catch (e) {
    console.log('Click test error:', e.message);
  }
  
  const htmlContent = await page.content();
  fs.writeFileSync(path.join(imgDir, 'page_content.html'), htmlContent);
  
  await browser.close();
  
  console.log('\n=== Test Report ===');
  console.log('Console errors:', consoleErrors.length);
  consoleErrors.forEach((e, i) => console.log(`  ${i+1}.`, e.text));
  console.log('Page errors:', pageErrors.length);
  pageErrors.forEach((e, i) => console.log(`  ${i+1}.`, e.message, e.stack?.split('\n')[0]));
})();
