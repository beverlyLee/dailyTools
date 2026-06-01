import puppeteer from 'puppeteer';
import fs from 'fs';

async function testDivergence() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  const divergenceData = [];
  
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[Milestone]')) {
      console.log(text);
      divergenceData.push(text);
    }
  });

  console.log('Loading page...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  console.log('Page loaded. Starting divergence test...\n');

  await page.waitForFunction(() => {
    return window.elapsedTime >= 32;
  }, { timeout: 40000 });

  await new Promise(resolve => setTimeout(resolve, 1000));

  const screenshotPath = '/Users/liboyang/trae/dailyTools/chaotic-pendulum/test-result-30s.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\nScreenshot saved to: ${screenshotPath}`);

  const dataPath = '/Users/liboyang/trae/dailyTools/chaotic-pendulum/divergence-log.txt';
  fs.writeFileSync(dataPath, divergenceData.join('\n'));
  console.log(`Divergence log saved to: ${dataPath}`);

  await browser.close();
  console.log('\nTest completed!');
}

testDivergence().catch(console.error);
