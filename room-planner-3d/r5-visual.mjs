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

  // Use drag-and-drop from sidebar to canvas
  const sidebar = page.locator('aside');
  const canvas = page.locator('canvas');
  const cb = await canvas.boundingBox();

  const items = [
    { text: '沙发', x: 0.25, y: 0.55, name: 'sofa' },
    { text: '床', x: 0.40, y: 0.55, name: 'bed' },
    { text: '桌子', x: 0.58, y: 0.55, name: 'table' },
    { text: '椅子', x: 0.75, y: 0.55, name: 'chair' },
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

  // Zoom in: move mouse to canvas and scroll
  await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, -100);
    await sleep(100);
  }
  await sleep(500);
  await page.screenshot({ path: path.join(IMG_DIR, 'r5-07-furniture-zoom.png'), fullPage: true });

  const furn = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('rp3d:furniture') || '[]'));
  console.log('Furniture count:', furn.length, furn.map(f => f.type));

  await browser.close();
}
main().catch(console.error);
