import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let requestCount = 0;
  page.on('request', (req) => {
    if (req.url().includes('/api/assessment') && req.method() === 'POST') {
      requestCount++;
      console.log(`[REQUEST CAPTURED] POST /api/assessment`);
      console.log(`  请求体: ${req.postData()}`);
    }
  });

  try {
    await page.goto(`${BASE_URL}/assessment`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    console.log('初始form状态:');
    const inputs = await page.locator('input').all();
    for (const inp of inputs) {
      console.log(`  ${await inp.getAttribute('name')}: ${await inp.inputValue()}`);
    }

    // 用 evaluate 直接设置值并触发 change
    console.log('\n=== 设置异常值 pH=15, 有机质=-5 ===');
    await page.evaluate(() => {
      const ph = document.querySelector('input[name="ph"]');
      const om = document.querySelector('input[name="organicMatter"]');
      const tn = document.querySelector('input[name="totalNitrogen"]');
      const ap = document.querySelector('input[name="availablePhosphorus"]');
      const ak = document.querySelector('input[name="availablePotassium"]');
      ph.value = '15';
      om.value = '-5';
      tn.value = '0.8';
      ap.value = '8';
      ak.value = '80';
      // 触发input事件让React捕获
      [ph, om, tn, ap, ak].forEach(el => {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
    await page.waitForTimeout(500);

    console.log('设置值后:');
    for (const inp of inputs) {
      console.log(`  ${await inp.getAttribute('name')}: ${await inp.inputValue()}`);
    }

    console.log('\n点击计算按钮...');
    requestCount = 0;
    await page.getByRole('button', { name: /计算健康指数/ }).click();
    await page.waitForTimeout(2000);

    console.log(`\nPOST请求次数: ${requestCount}`);
    if (requestCount > 0) {
      console.log('问题: validate() 没有拦截异常值，请求被发送到后端了！');
    } else {
      console.log('好的: validate() 拦截了请求，没有发送');
      // 检查是否显示了错误提示
      const allText = await page.locator('body').innerText();
      const hasErrorKeyword = allText.includes('必须') || allText.includes('负数') || allText.includes('范围');
      console.log(`页面是否包含错误关键字: ${hasErrorKeyword}`);
      console.log(`页面是否包含pH值必须: ${allText.includes('pH值必须')}`);
      console.log(`页面是否包含有机质不能为负数: ${allText.includes('有机质不能为负数')}`);
      
      // 查找所有红色元素
      const redTexts = await page.locator('.text-red-500').allTextContents();
      console.log(`红色错误文字: ${redTexts.join(' | ')}`);
    }

    await page.screenshot({ path: '/Users/mff/trae/dailyTools/soil-health-analyzer/img/r3_debug3.png', fullPage: true });
    console.log('\n截图已保存');

  } finally {
    await browser.close();
  }
}

test().catch(console.error);
