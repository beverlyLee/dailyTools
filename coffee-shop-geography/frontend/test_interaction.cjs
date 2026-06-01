const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const imgDir = path.join(__dirname, '..', 'img');
  
  console.log('Navigate to page...');
  await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  
  console.log('Grid testing coffee shop clicks...');
  const centerX = 640;
  const centerY = 360;
  
  const clickResults = [];
  
  for (let dx = -3; dx <= 3; dx++) {
    for (let dy = -3; dy <= 3; dy++) {
      const x = centerX + dx * 60;
      const y = centerY + dy * 60;
      
      console.log(`  Clicking (${x}, ${y})...`);
      await page.mouse.click(x, y);
      await page.waitForTimeout(500);
      
      const hasPopup = await page.evaluate(() => !!document.querySelector('.info-popup'));
      
      if (hasPopup) {
        console.log(`  ✓ POPUP FOUND at (${x}, ${y})!`);
        clickResults.push({ x, y, success: true });
        await page.screenshot({ path: path.join(imgDir, `round3_popup_${dx}_${dy}.png`) });
        
        const popupContent = await page.evaluate(() => {
          const popup = document.querySelector('.info-popup');
          return popup ? popup.textContent : null;
        });
        console.log('    Popup content:', popupContent?.substring(0, 80));
        
        await page.mouse.click(20, 20);
        await page.waitForTimeout(500);
      } else {
        clickResults.push({ x, y, success: false });
      }
    }
  }
  
  const successCount = clickResults.filter(r => r.success).length;
  console.log(`\nClick Test Results: ${successCount}/${clickResults.length} successful`);
  
  console.log('\nChecking if nearest-office API was called...');
  const apiLogs = await page.evaluate(() => {
    return window.performance.getEntriesByType('resource')
      .filter(e => e.name.includes('nearest-office'))
      .map(e => ({ name: e.name, duration: e.duration }));
  });
  console.log('nearest-office API calls:', apiLogs.length);
  apiLogs.forEach(l => console.log('  -', l.name.substring(0, 60)));
  
  await page.screenshot({ path: path.join(imgDir, 'round3_interaction_final.png') });
  await browser.close();
  
  console.log('\nTest complete!');
})();
