import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5175';
const IMG_DIR = path.resolve('img');
if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const errors = [];
  const warnings = [];
  const logs = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') errors.push(`console: ${text}`);
    if (msg.type() === 'warning') warnings.push(`console: ${text}`);
  });
  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}`);
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(2000);

  console.log('== Step 1: Initial ==');
  await page.screenshot({ path: path.join(IMG_DIR, 'r5-01-initial.png'), fullPage: true });

  const canvasBox = await page.locator('canvas').boundingBox();
  if (!canvasBox) { errors.push('Canvas not found'); await browser.close(); return; }

  const cx = canvasBox.x + canvasBox.width / 2;
  const cy = canvasBox.y + canvasBox.height / 2;

  console.log('== Step 2: Double-click 4 points ==');
  const pts = [
    [cx - 150, cy - 80],
    [cx + 150, cy - 80],
    [cx + 150, cy + 80],
    [cx - 150, cy + 80],
  ];
  for (let i = 0; i < pts.length; i++) {
    await page.mouse.dblclick(pts[i][0], pts[i][1]);
    await sleep(400);
  }
  await page.screenshot({ path: path.join(IMG_DIR, 'r5-02-4-points.png'), fullPage: true });

  const pointsBefore = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('rp3d:points') || '[]'));
  console.log('Points before close:', pointsBefore.length);

  console.log('== Step 3: Double-click within 40px of first point ==');
  await page.mouse.dblclick(pts[0][0] + 20, pts[0][1]);
  await sleep(800);
  await page.screenshot({ path: path.join(IMG_DIR, 'r5-03-close-40px.png'), fullPage: true });

  const wallsAfter = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('rp3d:walls') || '[]'));
  const pointsAfter = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('rp3d:points') || '[]'));
  console.log('Walls after close (40px):', wallsAfter.length);
  console.log('Points after close (40px):', pointsAfter.length);

  if (wallsAfter.length === 0) {
    errors.push('Round5 Req1 FAIL: Room did NOT close when clicking within 40px of first point');
  } else {
    console.log('✅ Room closed successfully');
  }

  console.log('== Step 4: Drag 2 furniture items to test no limit ==');
  const sidebar = page.locator('aside');
  const sofaEl = sidebar.locator('[draggable="true"]').filter({ hasText: '沙发' });
  const chairEl = sidebar.locator('[draggable="true"]').filter({ hasText: '椅子' });

  // Drag sofa to left
  const sofaBox = await sofaEl.boundingBox();
  const tgtX = canvasBox.x + canvasBox.width * 0.3;
  const tgtY = canvasBox.y + canvasBox.height * 0.45;
  await page.mouse.move(sofaBox.x + sofaBox.width / 2, sofaBox.y + sofaBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(tgtX, tgtY, { steps: 20 });
  await sleep(300);
  await page.mouse.up();
  await sleep(800);

  const furnAfterSofa = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('rp3d:furniture') || '[]'));
  console.log('Furniture after sofa drag:', furnAfterSofa.length);
  if (furnAfterSofa.length === 0) errors.push('Sofa drag failed');

  // Drag chair to right (should NOT overlap, should succeed)
  const chairBox = await chairEl.boundingBox();
  const tgt2X = canvasBox.x + canvasBox.width * 0.7;
  const tgt2Y = canvasBox.y + canvasBox.height * 0.45;
  await page.mouse.move(chairBox.x + chairBox.width / 2, chairBox.y + chairBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(tgt2X, tgt2Y, { steps: 20 });
  await sleep(300);
  await page.mouse.up();
  await sleep(800);
  await page.screenshot({ path: path.join(IMG_DIR, 'r5-04-two-furniture.png'), fullPage: true });

  const furnAfterChair = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('rp3d:furniture') || '[]'));
  console.log('Furniture after chair drag:', furnAfterChair.length);
  if (furnAfterChair.length < 2) {
    errors.push('Round5 Req3 FAIL: Cannot place 2+ furniture items (count limit exists?)');
  } else {
    console.log('✅ 2 furniture placed, no count limit');
  }

  // Test overlap prevention
  console.log('== Step 5: Try to place 3rd furniture on top of first (overlap prevention) ==');
  const tgt3X = tgtX + 5;
  const tgt3Y = tgtY;
  await page.mouse.move(chairBox.x + chairBox.width / 2, chairBox.y + chairBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(tgt3X, tgt3Y, { steps: 20 });
  await sleep(300);
  await page.mouse.up();
  await sleep(800);

  const furnAfterOverlap = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('rp3d:furniture') || '[]'));
  console.log('Furniture after overlap attempt:', furnAfterOverlap.length);
  if (furnAfterOverlap.length > furnAfterChair.length) {
    errors.push('Round5 Req3 FAIL: Overlap prevention not working - furniture placed on top of existing');
  } else {
    console.log('✅ Overlap prevention working');
  }

  console.log('== Step 6: Reload persistence ==');
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(1500);
  await page.screenshot({ path: path.join(IMG_DIR, 'r5-05-reload.png'), fullPage: true });

  const afterReload = await page.evaluate(() => ({
    walls: JSON.parse(localStorage.getItem('rp3d:walls') || '[]'),
    furniture: JSON.parse(localStorage.getItem('rp3d:furniture') || '[]'),
  }));
  console.log('Walls after reload:', afterReload.walls.length);
  console.log('Furniture after reload:', afterReload.furniture.length);

  console.log('== Step 7: Check deprecation warnings ==');
  const pcW = warnings.filter(w => w.includes('PCFSoftShadowMap') || w.includes('Clock'));
  console.log('Deprecation warnings:', pcW.length);
  if (pcW.length > 0) {
    warnings.push(`Total deprecation warnings: ${pcW.length}`);
  }

  console.log('== Step 8: Check GLB model warnings ==');
  const glbW = warnings.filter(w => w.includes('GLTFLoader') || w.includes('min/max'));
  console.log('GLB model warnings:', glbW.length);

  await browser.close();

  console.log('\n=== TEST RESULTS ===');
  console.log('Errors:');
  errors.forEach(e => console.log(' -', e));
  console.log('\nWarnings:');
  warnings.forEach(w => console.log(' -', w));

  if (errors.length > 0) process.exitCode = 1;
}

main().catch(e => { console.error(e); process.exit(2); });
