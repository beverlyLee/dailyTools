import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const IMG_DIR = path.join(import.meta.dirname, 'img');

if (!fs.existsSync(IMG_DIR)) {
  fs.mkdirSync(IMG_DIR, { recursive: true });
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(IMG_DIR, `${name}.png`), fullPage: true });
  console.log(`Screenshot saved: ${name}.png`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });

  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(`[PAGE ERROR] ${error.message}`);
  });

  console.log('\n=== Test 1: Homepage / ScanPage ===');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await screenshot(page, '01-homepage-scanpage');

  const homeTitle = await page.locator('h1').textContent();
  console.log(`Page title: ${homeTitle}`);

  const navItems = await page.locator('nav button').count();
  console.log(`Navigation items: ${navItems}`);

  console.log('\n=== Test 2: Manual input - fake QR code ===');
  const manualBtn = page.locator('button:has-text("手动输入")');
  if (await manualBtn.isVisible()) {
    await manualBtn.click();
    await page.waitForTimeout(500);
    await screenshot(page, '02-manual-input-visible');

    const input = page.locator('input[placeholder*="二维码内容"]').first();
    await input.fill('fake-seed-999');
    await screenshot(page, '03-fake-seed-input');

    const verifyBtn = page.locator('button:has-text("查询验证")');
    await verifyBtn.click();
    await page.waitForTimeout(2000);
    await screenshot(page, '04-fake-seed-result');

    const warningText = await page.locator('text=未查询到备案信息').first().textContent().catch(() => null);
    console.log(`Warning text found: ${warningText}`);

    const redAlert = await page.locator('.bg-gradient-to-br.from-red-500').isVisible().catch(() => false);
    console.log(`Red alert visible: ${redAlert}`);

    const resetBtn = page.locator('button:has-text("重新扫描")');
    await resetBtn.click();
    await page.waitForTimeout(500);
  }

  console.log('\n=== Test 3: Manual input - valid QR code ===');
  const manualBtn2 = page.locator('button:has-text("手动输入")');
  if (await manualBtn2.isVisible()) {
    await manualBtn2.click();
    await page.waitForTimeout(500);

    const input2 = page.locator('input[placeholder*="二维码内容"]').first();
    await input2.fill('valid-seed-001');
    await screenshot(page, '05-valid-seed-input');

    const verifyBtn2 = page.locator('button:has-text("查询验证")');
    await verifyBtn2.click();
    await page.waitForTimeout(2000);
    await screenshot(page, '06-valid-seed-result');

    const successText = await page.locator('text=验证通过').first().textContent().catch(() => null);
    console.log(`Success text found: ${successText}`);

    const seedDetail = await page.locator('text=种子详情').isVisible().catch(() => false);
    console.log(`Seed detail visible: ${seedDetail}`);

    const resetBtn2 = page.locator('button:has-text("重新扫描")');
    await resetBtn2.click();
    await page.waitForTimeout(500);
  }

  console.log('\n=== Test 4: Test valid-seed-002 (blacklisted claim) ===');
  const manualBtn3 = page.locator('button:has-text("手动输入")');
  if (await manualBtn3.isVisible()) {
    await manualBtn3.click();
    await page.waitForTimeout(500);

    const input3 = page.locator('input[placeholder*="二维码内容"]').first();
    await input3.fill('valid-seed-002');
    await screenshot(page, '07-valid-seed-002-input');

    const verifyBtn3 = page.locator('button:has-text("查询验证")');
    await verifyBtn3.click();
    await page.waitForTimeout(2000);
    await screenshot(page, '08-valid-seed-002-result');

    const resultText = await page.locator('h3').first().textContent().catch(() => '');
    console.log(`Result heading: ${resultText}`);
  }

  console.log('\n=== Test 5: Navigate to Label Check Page ===');
  await page.goto(`${BASE_URL}/label-check`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await screenshot(page, '09-label-check-page');

  const labelInput = page.locator('input[placeholder*="二维码内容"]');
  await labelInput.fill('valid-seed-001');
  await screenshot(page, '10-label-check-input');

  const checkBtn = page.locator('button:has-text("开始审查")');
  await checkBtn.click();
  await page.waitForTimeout(2000);
  await screenshot(page, '11-label-check-result-valid');

  const compliantText = await page.locator('text=标签合规').first().textContent().catch(() => null);
  console.log(`Compliant text: ${compliantText}`);

  const resetBtn4 = page.locator('button:has-text("重新审查")');
  await resetBtn4.click();
  await page.waitForTimeout(500);

  console.log('\n=== Test 6: Label check with fake QR code ===');
  const labelInput2 = page.locator('input[placeholder*="二维码内容"]');
  await labelInput2.fill('fake-seed-999');
  await screenshot(page, '12-label-check-fake-input');

  const checkBtn2 = page.locator('button:has-text("开始审查")');
  await checkBtn2.click();
  await page.waitForTimeout(2000);
  await screenshot(page, '13-label-check-result-fake');

  const nonCompliantText = await page.locator('text=标签不合规').first().textContent().catch(() => null);
  console.log(`Non-compliant text: ${nonCompliantText}`);

  console.log('\n=== Test 7: Navigate to Report Page ===');
  await page.goto(`${BASE_URL}/report`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await screenshot(page, '14-report-page');

  const loadExampleBtn = page.locator('button:has-text("加载示例数据")');
  if (await loadExampleBtn.isVisible()) {
    await loadExampleBtn.click();
    await page.waitForTimeout(500);
    await screenshot(page, '15-report-example-loaded');
  }

  const generateBtn = page.locator('button:has-text("生成举报信")');
  await generateBtn.click();
  await page.waitForTimeout(2000);
  await screenshot(page, '16-report-generated');

  const reportContent = await page.locator('pre').first().textContent().catch(() => '');
  console.log(`Report content length: ${reportContent.length}`);
  console.log(`Report contains '未查询到备案信息': ${reportContent.includes('未查询到备案信息')}`);

  const copyBtn = page.locator('button:has-text("复制内容")');
  if (await copyBtn.isVisible()) {
    await copyBtn.click();
    await page.waitForTimeout(1000);
    await screenshot(page, '17-report-copied');
    const copiedText = await page.locator('button:has-text("已复制")').isVisible().catch(() => false);
    console.log(`Copy button state changed: ${copiedText}`);
  }

  const screenshotBtn = page.locator('button:has-text("生成证据截图")');
  if (await screenshotBtn.isVisible()) {
    await screenshotBtn.click();
    await page.waitForTimeout(3000);
    await screenshot(page, '18-report-screenshot');

    const screenshotImg = await page.locator('img[alt="证据截图"]').isVisible().catch(() => false);
    console.log(`Screenshot image visible: ${screenshotImg}`);
  }

  console.log('\n=== Test 8: Navigate to Blacklist Page ===');
  await page.goto(`${BASE_URL}/blacklist`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await screenshot(page, '19-blacklist-page');

  const blacklistItems = await page.locator('.border-l-4').count();
  console.log(`Blacklist items count: ${blacklistItems}`);

  const companyName = await page.locator('h3').first().textContent().catch(() => '');
  console.log(`First blacklisted company: ${companyName}`);

  console.log('\n=== Test 9: Search blacklist ===');
  const searchInput = page.locator('input[placeholder*="搜索"]');
  await searchInput.fill('金种子');
  await page.locator('button:has-text("Search"), button:has(svg.lucide-search)').last().click();
  await page.waitForTimeout(2000);
  await screenshot(page, '20-blacklist-search');

  console.log('\n=== Test 10: Select company and subscribe ===');
  const selectBtn = page.locator('.border-l-4 button').first();
  if (await selectBtn.isVisible()) {
    await selectBtn.click();
    await page.waitForTimeout(500);
    await screenshot(page, '21-blacklist-selected');

    const subscribeBtn = page.locator('button:has-text("订阅通知")');
    if (await subscribeBtn.isVisible()) {
      await subscribeBtn.click();
      await page.waitForTimeout(500);
      await screenshot(page, '22-subscribe-form');

      const emailInput = page.locator('input[type="email"]');
      await emailInput.fill('test@example.com');

      const confirmBtn = page.locator('button:has-text("确认订阅")');
      await confirmBtn.click();
      await page.waitForTimeout(2000);
      await screenshot(page, '23-subscribe-result');

      const subscribeMsg = await page.locator('.bg-green-50').last().textContent().catch(() => '');
      console.log(`Subscribe message: ${subscribeMsg}`);
    }
  }

  console.log('\n=== Test 11: Navigation between pages ===');
  const navButtons = await page.locator('nav button').all();
  for (let i = 0; i < navButtons.length; i++) {
    await navButtons[i].click();
    await page.waitForTimeout(1500);
    await screenshot(page, `24-nav-${i}`);
  }

  console.log('\n=== Test 12: Empty blacklist search ===');
  await page.goto(`${BASE_URL}/blacklist`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const searchInput2 = page.locator('input[placeholder*="搜索"]');
  await searchInput2.fill('不存在的公司');
  const searchBtn = page.locator('.flex.gap-2 button').last();
  await searchBtn.click();
  await page.waitForTimeout(2000);
  await screenshot(page, '25-blacklist-empty-search');

  const noResult = await page.locator('text=未找到相关企业').isVisible().catch(() => false);
  console.log(`No result visible: ${noResult}`);

  console.log('\n=== Console Errors ===');
  consoleErrors.forEach(e => console.log(e));

  console.log('\n=== Page Errors ===');
  pageErrors.forEach(e => console.log(e));

  await browser.close();

  console.log('\n=== Test Summary ===');
  console.log('All screenshots saved to img/ directory');
  if (consoleErrors.length > 0) {
    console.log(`Found ${consoleErrors.length} console errors`);
  }
  if (pageErrors.length > 0) {
    console.log(`Found ${pageErrors.length} page errors`);
  }
}

main().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
