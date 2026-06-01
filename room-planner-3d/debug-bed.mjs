import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5175';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const messages = [];
  page.on('console', (m) => messages.push(`[${m.type()}] ${m.text()}`));

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(2000);

  const sidebar = page.locator('aside');
  const canvas = page.locator('canvas');
  const cb = await canvas.boundingBox();

  const items = [
    { text: '床', x: 0.40, y: 0.55 },
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
    await sleep(800);
  }

  // Check if bed was placed and if fallback or GLB was used
  const consoleOut = messages.filter(m =>
    m.includes('fallback') || m.includes('Fallback') || m.includes('ModelError') || m.includes('GLB') || m.includes('load')
  );
  console.log('Relevant console messages:');
  consoleOut.forEach(m => console.log(' ', m));

  // Check window errors
  const errors = messages.filter(m => m.includes('[error]') || m.includes('GLTFLoader'));
  console.log('\nErrors/GLB warnings:');
  errors.forEach(m => console.log(' ', m));

  await browser.close();
}
main().catch(console.error);
