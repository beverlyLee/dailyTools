import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/assessment`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // 先看表单结构
    console.log('页面表单元素:');
    const inputs = await page.locator('input').all();
    for (const input of inputs) {
      const name = await input.getAttribute('name');
      const type = await input.getAttribute('type');
      const value = await input.inputValue();
      console.log(`  name=${name}, type=${type}, value=${value}`);
    }

    // 测试pH=15
    console.log('\n=== 测试pH=15 ===');
    const phInput = page.locator('input[name="ph"]');
    await phInput.click();
    await phInput.fill('');
    await page.waitForTimeout(200);
    await phInput.fill('15');
    await page.waitForTimeout(500);
    console.log('pH input value:', await phInput.inputValue());

    // 触发 blur 事件
    await phInput.evaluate(el => el.blur());
    await page.waitForTimeout(500);

    // 点击提交按钮
    await page.getByRole('button', { name: /计算健康指数/ }).click();
    await page.waitForTimeout(2000);

    // 看看页面上所有文字
    const fullText = await page.locator('body').innerText();
    console.log('页面是否包含错误提示文字:');
    console.log('  "pH值必须在 0-14 范围内":', fullText.includes('pH值必须在 0-14 范围内'));
    console.log('  "必须":', fullText.includes('必须'));
    console.log('  "pH":', fullText.includes('pH'));
    console.log('  "错误":', fullText.includes('错误'));
    console.log('  "无效":', fullText.includes('无效'));
    console.log('  "out of range":', fullText.includes('out of range'));

    // 看看所有 p 元素的文字
    const paragraphs = await page.locator('p').allTextContents();
    console.log('\n所有p元素文字:');
    paragraphs.forEach((p, i) => {
      if (p.trim()) console.log(`  [${i}] ${p.trim()}`);
    });

    // 看看输入框的class是否有错误样式
    console.log('\npH input class:', await phInput.getAttribute('class'));
    console.log('pH input aria-invalid:', await phInput.getAttribute('aria-invalid'));

    // 用 page.screenshot 保存更细节
    await page.screenshot({ path: '/Users/mff/trae/dailyTools/soil-health-analyzer/img/r3_debug_validation.png', fullPage: true });
    console.log('\n调试截图已保存');

  } finally {
    await browser.close();
  }
}

test().catch(console.error);
