import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 监听console
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });

  try {
    await page.goto(`${BASE_URL}/assessment`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // 注入调试脚本，直接观察React state变化
    await page.evaluate(() => {
      // 拦截window错误
      window.addEventListener('error', (e) => {
        console.log('WINDOW ERROR:', e.message);
      });
    });

    // 测试1: 点击输入框，先清空再输入，最后回车确认
    console.log('\n=== 测试pH=15 (使用键盘输入) ===');
    const phInput = page.locator('input[name="ph"]');
    await phInput.click();
    await phInput.press('Meta+A'); // select all
    await phInput.press('Backspace');
    await page.waitForTimeout(100);
    // 一个字符一个字符输入
    await phInput.type('15', { delay: 100 });
    await page.waitForTimeout(300);

    console.log('输入后 pH input值:', await phInput.inputValue());

    // 触发blur
    await phInput.press('Tab');
    await page.waitForTimeout(500);

    // 查看页面上所有错误提示
    const allElements = await page.locator('.text-red-500, .text-red-400, [class*="red"]').all();
    console.log('红色元素数量:', allElements.length);
    for (let i = 0; i < allElements.length; i++) {
      const text = await allElements[i].innerText().catch(() => '');
      const cls = await allElements[i].getAttribute('class').catch(() => '');
      if (text) console.log(`  红色元素[${i}]: text="${text}", class="${cls}"`);
    }

    // 点击提交按钮
    console.log('\n点击计算按钮...');
    await page.getByRole('button', { name: /计算健康指数/ }).click();
    await page.waitForTimeout(2000);

    // 再次检查错误提示
    const allErrors = await page.locator('.text-red-500, .text-red-400, [class*="red"]').all();
    console.log('提交后红色元素数量:', allErrors.length);
    for (let i = 0; i < allErrors.length; i++) {
      const text = await allErrors[i].innerText().catch(() => '');
      if (text) console.log(`  错误[${i}]: ${text}`);
    }

    // 查看所有段落
    const paragraphs = await page.locator('p').allTextContents();
    console.log('\n所有p元素内容:');
    paragraphs.forEach((p, i) => {
      if (p.trim()) console.log(`  [${i}] ${p.trim()}`);
    });

    // 检查输入框class
    console.log('\npH input class:', await phInput.getAttribute('class'));
    console.log('pH input style.borderColor:', await phInput.evaluate(el => getComputedStyle(el).borderColor));

    // 保存调试截图
    await page.screenshot({ path: '/Users/mff/trae/dailyTools/soil-health-analyzer/img/r3_debug2_validation.png', fullPage: true });
    console.log('\n调试截图已保存');

    // 直接调用页面的validate函数（如果能访问到）
    console.log('\n=== 直接调试form值 ===');
    await page.evaluate(() => {
      // 寻找input并打印其真实值
      const inputs = document.querySelectorAll('input');
      inputs.forEach(inp => {
        console.log(`DOM input name=${inp.name}, value=${inp.value}, type=${inp.type}`);
      });
    });

  } finally {
    await browser.close();
  }
}

test().catch(console.error);
