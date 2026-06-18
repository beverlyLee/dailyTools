import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log(`[BROWSER ${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

  let capturedRequests = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/')) {
      capturedRequests.push({ method: req.method(), url: req.url(), body: req.postData() });
    }
  });

  try {
    await page.goto(`${BASE_URL}/assessment`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // 注入调试：监听form state变化
    await page.addInitScript(() => {
      const origFetch = window.fetch;
      window.fetch = function(...args) {
        console.log('[FETCH CALLED]', args[0], args[1]?.method);
        if (args[1]?.body) {
          console.log('[FETCH BODY]', args[1].body);
        }
        return origFetch.apply(this, args);
      };
    });

    // 刷新页面以应用init脚本
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    capturedRequests = [];

    // 方案：直接点击输入框，聚焦后一个字符一个字符用键盘输入
    console.log('\n=== 用键盘type输入 pH=15 ===');
    const phInput = page.locator('input[name="ph"]');
    await phInput.click();
    await page.waitForTimeout(100);
    await phInput.press('Control+A');
    await page.waitForTimeout(100);
    await phInput.press('Backspace');
    await page.waitForTimeout(100);
    await phInput.type('15', { delay: 200 });
    await page.waitForTimeout(500);

    console.log('pH DOM value:', await phInput.inputValue());
    console.log('pH React value:', await phInput.evaluate(el => el.value));

    // 输入其他正常值
    await page.locator('input[name="organicMatter"]').fill('10');
    await page.locator('input[name="totalNitrogen"]').fill('0.8');
    await page.locator('input[name="availablePhosphorus"]').fill('8');
    await page.locator('input[name="availablePotassium"]').fill('80');
    await page.waitForTimeout(300);

    console.log('\n点击提交按钮...');
    capturedRequests = [];
    await page.getByRole('button', { name: /计算健康指数/ }).click();
    await page.waitForTimeout(2500);

    console.log('\n捕获的API请求数:', capturedRequests.length);
    capturedRequests.forEach((r, i) => {
      console.log(`  [${i}] ${r.method} ${r.url}`);
      if (r.body) console.log(`       BODY: ${r.body}`);
    });

    // 检查错误提示
    console.log('\n=== 检查错误提示 ===');
    const bodyHtml = await page.locator('body').innerHTML();
    console.log('包含"pH值必须在":', bodyHtml.includes('pH值必须在'));
    console.log('包含"text-red":', bodyHtml.includes('text-red'));
    console.log('包含"border-red":', bodyHtml.includes('border-red'));
    
    // 查找所有p标签
    const pTexts = await page.locator('p').allTextContents();
    console.log('\n所有p标签内容:');
    pTexts.forEach((t, i) => { if (t.trim()) console.log(`  p[${i}]: ${t.trim()}`); });

    // 查找所有带red的元素
    const redElements = await page.locator('[class*="red"]').all();
    console.log('\n带red class的元素数:', redElements.length);
    for (let i = 0; i < redElements.length; i++) {
      const cls = await redElements[i].getAttribute('class');
      const txt = await redElements[i].innerText().catch(() => '');
      console.log(`  red[${i}]: class="${cls}" text="${txt}"`);
    }

    await page.screenshot({ path: '/Users/mff/trae/dailyTools/soil-health-analyzer/img/r3_debug_final.png', fullPage: true });
    console.log('\n截图已保存');

  } finally {
    await browser.close();
  }
}

test().catch(console.error);
