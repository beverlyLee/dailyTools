import { chromium } from 'playwright';
import path from 'path';

const BASE_URL = 'http://localhost:5175';
const IMG_DIR = '/Users/liboyang/trae/dailyTools/room-planner-3d/img';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(2000);

  const sidebar = page.locator('aside');
  const canvas = page.locator('canvas');
  const cb = await canvas.boundingBox();

  const items = [
    { text: '沙发', x: 0.25, y: 0.55 },
    { text: '床', x: 0.40, y: 0.55 },
    { text: '桌子', x: 0.58, y: 0.55 },
    { text: '椅子', x: 0.75, y: 0.55 },
  ];

  for (const it of items) {
    const el = sidebar.locator('[draggable="true"]').filter({ hasText: it.text }).first();
    const box = await el.boundingBox();
    const sx = box.x + box.width / 2;
    const sy = box.y + box.height / 2;
    const tx = cb.x + cb.width * it.x;
    const ty = cb.y + cb.height * it.y;

    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await sleep(200);
    await page.mouse.move(tx, ty, { steps: 20 });
    await sleep(300);
    await page.mouse.up();
    await sleep(500);
  }

  // OrbitControls: right-click drag to rotate view
  // Select chair to see its detail
  await page.mouse.move(cb.x + cb.width * 0.75, cb.y + cb.height * 0.55);
  await sleep(300);
  await page.mouse.click(cb.x + cb.width * 0.75, cb.y + cb.height * 0.55, { button: 'left' });
  await sleep(500);

  // OrbitControls rotate - right-click drag
  await page.mouse.move(cb.x + cb.width * 0.5, cb.y + cb.height * 0.6);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(cb.x + cb.width * 0.3, cb.y + cb.height * 0.6, { steps: 10 });
  await page.mouse.up({ button: 'right' });
  await sleep(500);
  await page.screenshot({ path: path.join(IMG_DIR, 'r5-08-chair-rotated.png'), fullPage: true });

  // Table
  await page.mouse.move(cb.x + cb.width * 0.58, cb.y + cb.height * 0.55);
  await page.mouse.click(cb.x + cb.width * 0.58, cb.y + cb.height * 0.55, { button: 'left' });
  await sleep(300);
  await page.mouse.move(cb.x + cb.width * 0.5, cb.y + cb.height * 0.6);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(cb.x + cb.width * 0.7, cb.y + cb.height * 0.6, { steps: 10 });
  await page.mouse.up({ button: 'right' });
  await sleep(500);
  await page.screenshot({ path: path.join(IMG_DIR, 'r5-09-table-rotated.png'), fullPage: true });

  // Bed
  await page.mouse.move(cb.x + cb.width * 0.4, cb.y + cb.height * 0.55);
  await page.mouse.click(cb.x + cb.width * 0.4, cb.y + cb.height * 0.55, { button: 'left' });
  await sleep(300);
  await page.mouse.move(cb.x + cb.width * 0.5, cb.y + cb.height * 0.6);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(cb.x + cb.width * 0.2, cb.y + cb.height * 0.4, { steps: 10 });
  await page.mouse.up({ button: 'right' });
  await sleep(500);
  await page.screenshot({ path: path.join(IMG_DIR, 'r5-10-bed-rotated.png'), fullPage: true });

  const furn = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('rp3d:furniture') || '[]'));
  console.log('Furniture count:', furn.length);

  await browser.close();
}
main().catch(console.error);
