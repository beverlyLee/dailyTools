import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const IMG_DIR = path.join(process.cwd(), 'img');
if (!fs.existsSync(IMG_DIR)) {
  fs.mkdirSync(IMG_DIR, { recursive: true });
}

const oldFiles = fs.readdirSync(IMG_DIR).filter(f => f.endsWith('.png'));
oldFiles.forEach(f => {
  fs.unlinkSync(path.join(IMG_DIR, f));
});

const issues = [];

function logIssue(description, evidence, screenshotPath = null) {
  issues.push({
    description,
    evidence,
    screenshot: screenshotPath ? path.basename(screenshotPath) : null,
    timestamp: new Date().toISOString()
  });
  console.log('❌ ' + description);
  console.log('   证据: ' + evidence);
  if (screenshotPath) console.log('   截图: ' + screenshotPath);
}

async function saveScreenshot(page, name) {
  const filePath = path.join(IMG_DIR, Date.now() + '_' + name + '.png');
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

function checkConsoleErrors(page, errors) {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', error => {
    errors.push(error.message);
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  
  const consoleErrors = [];
  checkConsoleErrors(page, consoleErrors);

  try {
    console.log('📱 正在访问页面: http://localhost:5173/');
    
    const response = await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 10000 });
    
    if (!response || !response.ok()) {
      const status = response ? response.status() : 'no response';
      const screenshot = await saveScreenshot(page, 'page_load_error');
      logIssue(
        '页面加载失败',
        'HTTP状态码: ' + status + '，页面无法正常访问',
        screenshot
      );
      await browser.close();
      return;
    }

    await page.waitForTimeout(2000);

    if (consoleErrors.length > 0) {
      const screenshot = await saveScreenshot(page, 'console_errors_initial');
      logIssue(
        '页面控制台报错',
        '控制台存在报错信息: ' + consoleErrors.join('; '),
        screenshot
      );
    }

    console.log('✅ 页面加载完成，检查初始状态...');
    
    const initialScreenshot = await saveScreenshot(page, 'initial_state');
    console.log('📷 初始状态截图已保存: ' + initialScreenshot);

    const title = await page.title();
    console.log('页面标题: ' + title);

    if (title !== 'Cell Division Simulation') {
      logIssue(
        '页面标题不正确',
        '页面标题为: ' + title + '，预期为: Cell Division Simulation',
        initialScreenshot
      );
    }

    const splitButton = await page.getByRole('button', { name: /开始分裂|分裂|split/i }).first();
    if (!splitButton || !(await splitButton.isVisible())) {
      const screenshot = await saveScreenshot(page, 'no_split_button');
      logIssue(
        '功能按钮缺失',
        '未找到"开始分裂"按钮，按钮元素不存在或选择器错误',
        screenshot
      );
    } else {
      console.log('✅ 找到"开始分裂"按钮');

      console.log('🎬 点击开始分裂按钮...');
      await splitButton.click();
      await page.waitForTimeout(500);

      const playingScreenshot = await saveScreenshot(page, 'animation_playing_0.5s');
      console.log('📷 动画播放0.5秒截图已保存: ' + playingScreenshot);

      console.log('⏳ 等待动画进行到阶段1（1.5秒，横向拉长）...');
      await page.waitForTimeout(1000);

      const stage1Screenshot = await saveScreenshot(page, 'animation_stage1_elongation');
      console.log('📷 阶段1截图已保存: ' + stage1Screenshot);

      console.log('⏳ 等待动画进行到阶段2（3.3秒，中间挤压）...');
      await page.waitForTimeout(1800);

      const stage2Screenshot = await saveScreenshot(page, 'animation_stage2_pinching');
      console.log('📷 阶段2截图已保存: ' + stage2Screenshot);

      const pauseButton = await page.getByRole('button', { name: /暂停|pause/i }).first();
      if (pauseButton && await pauseButton.isVisible()) {
        console.log('⏸️ 点击暂停按钮...');
        await pauseButton.click();
        await page.waitForTimeout(1000);
        const pausedScreenshot = await saveScreenshot(page, 'animation_paused');
        console.log('📷 暂停状态截图已保存: ' + pausedScreenshot);

        const resumeButton = await page.getByRole('button', { name: /继续|resume/i }).first();
        if (resumeButton && await resumeButton.isVisible()) {
          console.log('▶️ 点击继续按钮...');
          await resumeButton.click();
          await page.waitForTimeout(1000);
        }
      }

      console.log('⏳ 等待动画完成（总共6秒）...');
      await page.waitForTimeout(2000);

      const finalScreenshot = await saveScreenshot(page, 'animation_complete');
      console.log('📷 动画完成截图已保存: ' + finalScreenshot);

      const resetButton = await page.getByRole('button', { name: /重置|reset/i }).first();
      if (resetButton && await resetButton.isVisible()) {
        console.log('🔄 点击重置按钮...');
        await resetButton.click();
        await page.waitForTimeout(1000);
        const resetScreenshot = await saveScreenshot(page, 'after_reset');
        console.log('📷 重置后截图已保存: ' + resetScreenshot);
      }
    }

    if (consoleErrors.length > 0) {
      const screenshot = await saveScreenshot(page, 'final_console_errors');
      logIssue(
        '运行时报错',
        '运行过程中控制台报错: ' + consoleErrors.join('; '),
        screenshot
      );
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 测试完成');
    console.log('='.repeat(60));
    console.log('\n发现问题总数: ' + issues.length);
    issues.forEach((issue, index) => {
      console.log('\n' + (index + 1) + '. ' + issue.description);
      console.log('   证据: ' + issue.evidence);
      if (issue.screenshot) console.log('   截图: ' + issue.screenshot);
    });

    const reportPath = path.join(IMG_DIR, 'test_report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      testTime: new Date().toISOString(),
      issues: issues,
      consoleErrors: consoleErrors
    }, null, 2));
    console.log('\n📄 测试报告已保存: ' + reportPath);

  } catch (error) {
    console.error('测试过程中发生错误:', error);
    const screenshot = await saveScreenshot(page, 'test_error');
    logIssue(
      '测试执行失败',
      '测试脚本执行出错: ' + error.message,
      screenshot
    );
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
