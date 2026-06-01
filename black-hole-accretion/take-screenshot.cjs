const { chromium } = require('playwright');
const path = require('path');

async function takeScreenshots() {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: true
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  
  const page = await context.newPage();
  
  const messages = [];
  page.on('console', msg => {
    messages.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', err => {
    messages.push({ type: 'error', text: 'Page error: ' + err.message, stack: err.stack });
  });
  
  console.log('Navigating to http://localhost:5175/...');
  await page.goto('http://localhost:5175/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  
  console.log('Waiting for 4 seconds for WebGL to render...');
  await page.waitForTimeout(4000);
  
  console.log('Taking screenshot 1 (initial view)...');
  await page.screenshot({ 
    path: path.join(__dirname, 'img', 'screenshot_round5_1.png'),
    fullPage: false,
    timeout: 60000
  });
  
  console.log('Waiting for 3 seconds for animation...');
  await page.waitForTimeout(3000);
  
  console.log('Taking screenshot 2 (after animation)...');
  await page.screenshot({ 
    path: path.join(__dirname, 'img', 'screenshot_round5_2.png'),
    fullPage: false,
    timeout: 60000
  });
  
  console.log('Waiting for 3 seconds...');
  await page.waitForTimeout(3000);
  
  console.log('Taking screenshot 3 (different time)...');
  await page.screenshot({ 
    path: path.join(__dirname, 'img', 'screenshot_round5_3.png'),
    fullPage: false,
    timeout: 60000
  });
  
  console.log('\nConsole messages:');
  if (messages.length === 0) {
    console.log('  (No console messages)');
  } else {
    messages.forEach(m => console.log(`  [${m.type}] ${m.text}`));
  }
  
  await browser.close();
  console.log('Done!');
}

takeScreenshots().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
