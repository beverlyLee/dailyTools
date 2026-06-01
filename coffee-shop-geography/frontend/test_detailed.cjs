const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const imgDir = path.join(__dirname, '..', 'img');
  
  const apiResponses = [];
  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      try {
        const body = await response.text();
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          ok: response.ok(),
          bodyPreview: body.substring(0, 200)
        });
      } catch (e) {}
    }
  });
  
  console.log('Navigate to page...');
  await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded', timeout: 60000 });
  
  console.log('Wait for data loading...');
  await page.waitForTimeout(5000);
  
  console.log('Check page content...');
  const hasHeader = await page.evaluate(() => {
    return document.querySelector('.header') !== null;
  });
  console.log('Header found:', hasHeader);
  
  const hasStats = await page.evaluate(() => {
    return document.querySelector('.stats') !== null;
  });
  console.log('Stats panel found:', hasStats);
  
  const hasLegend = await page.evaluate(() => {
    return document.querySelector('.legend') !== null;
  });
  console.log('Legend found:', hasLegend);
  
  const deckCanvas = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return canvas ? { found: true, width: canvas.width, height: canvas.height } : { found: false };
  });
  console.log('Deck.gl canvas:', deckCanvas);
  
  console.log('\n=== Detailed Test Report ===');
  console.log('Page Components:');
  console.log('  Header panel:', hasHeader ? '✓' : '✗');
  console.log('  Statistics panel:', hasStats ? '✓' : '✗');
  console.log('  Legend panel:', hasLegend ? '✓' : '✗');
  console.log('  Deck.gl canvas:', deckCanvas.found ? `✓ (${deckCanvas.width}x${deckCanvas.height})` : '✗');
  
  console.log('\nAPI Responses:');
  apiResponses.forEach(r => {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.status} ${r.url.substring(0, 60)}`);
  });
  
  await page.screenshot({ path: path.join(imgDir, 'round2_detailed.png') });
  
  await browser.close();
  
  console.log('\nTest completed!');
})();
