const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const IMG_DIR = path.join(__dirname, '../../img');
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://127.0.0.1:8003';

test.describe('宠物消费洞察分析平台 - 自动化测试', () => {
  let page;
  let consoleErrors = [];

  test.beforeAll(async ({ browser }) => {
    if (!fs.existsSync(IMG_DIR)) {
      fs.mkdirSync(IMG_DIR, { recursive: true });
    }
    page = await browser.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location(),
          timestamp: new Date().toISOString()
        });
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push({
        type: 'pageerror',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });

    page.on('requestfailed', request => {
      consoleErrors.push({
        type: 'requestfailed',
        url: request.url(),
        failure: request.failure(),
        timestamp: new Date().toISOString()
      });
    });
  });

  test.afterAll(async () => {
    if (consoleErrors.length > 0) {
      fs.writeFileSync(
        path.join(IMG_DIR, 'console-errors.json'),
        JSON.stringify(consoleErrors, null, 2)
      );
      await page.screenshot({
        path: path.join(IMG_DIR, 'console-errors.png'),
        fullPage: true
      });
    }
    await page.close();
  });

  const dataSources = [
    { id: 'mock_data', name: '模拟演示数据' },
    { id: 'industry_report', name: '行业报告数据' },
    { id: 'e_commerce', name: '电商平台数据' },
    { id: 'social_media', name: '社交媒体数据' }
  ];

  test('01 - 页面加载测试', async () => {
    console.log('📄 测试: 页面加载');
    
    const response = await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    expect(response.ok()).toBeTruthy();
    
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(IMG_DIR, '01-page-loaded.png'),
      fullPage: true
    });
    
    console.log('✅ 页面加载完成，已截图');
  });

  test('02 - 初始状态 - 模拟数据', async () => {
    console.log('📊 测试: 初始状态 - 模拟数据');
    
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(IMG_DIR, '02-data-source-mock-before.png'),
      fullPage: true
    });
    
    const pageText = await page.textContent('body');
    console.log('📝 页面内容预览:', pageText.substring(0, 200));
    
    console.log('✅ 初始状态截图完成');
  });

  test('03 - 切换到行业报告数据', async () => {
    console.log('🔄 测试: 切换到行业报告数据');
    
    try {
      const buttons = await page.locator('button').all();
      console.log(`🔍 找到 ${buttons.length} 个按钮`);
      
      if (buttons.length >= 2) {
        await buttons[1].click();
        await page.waitForTimeout(1500);
        await page.screenshot({
          path: path.join(IMG_DIR, '03-data-source-industry-report.png'),
          fullPage: true
        });
        console.log('✅ 行业报告数据截图完成');
      } else {
        console.log('⚠️  数据源按钮未找到，尝试直接测试API');
        await page.screenshot({
          path: path.join(IMG_DIR, '03-data-source-no-buttons.png'),
          fullPage: true
        });
      }
    } catch (e) {
      console.log('❌ 点击失败:', e.message);
      await page.screenshot({
        path: path.join(IMG_DIR, '03-data-source-click-error.png'),
        fullPage: true
      });
    }
  });

  test('04 - 切换到电商平台数据', async () => {
    console.log('🔄 测试: 切换到电商平台数据');
    
    try {
      const buttons = await page.locator('button').all();
      if (buttons.length >= 3) {
        await buttons[2].click();
        await page.waitForTimeout(1500);
        await page.screenshot({
          path: path.join(IMG_DIR, '04-data-source-e-commerce.png'),
          fullPage: true
        });
        console.log('✅ 电商平台数据截图完成');
      }
    } catch (e) {
      console.log('❌ 点击失败:', e.message);
    }
  });

  test('05 - 切换到社交媒体数据', async () => {
    console.log('🔄 测试: 切换到社交媒体数据');
    
    try {
      const buttons = await page.locator('button').all();
      if (buttons.length >= 4) {
        await buttons[3].click();
        await page.waitForTimeout(1500);
        await page.screenshot({
          path: path.join(IMG_DIR, '05-data-source-social-media.png'),
          fullPage: true
        });
        console.log('✅ 社交媒体数据截图完成');
      }
    } catch (e) {
      console.log('❌ 点击失败:', e.message);
    }
  });

  test('06 - 切回模拟数据', async () => {
    console.log('🔄 测试: 切回模拟数据');
    
    try {
      const buttons = await page.locator('button').all();
      if (buttons.length >= 1) {
        await buttons[0].click();
        await page.waitForTimeout(1500);
        await page.screenshot({
          path: path.join(IMG_DIR, '06-data-source-mock-after.png'),
          fullPage: true
        });
        console.log('✅ 切回模拟数据截图完成');
      }
    } catch (e) {
      console.log('❌ 点击失败:', e.message);
    }
  });

  test('07 - 后端API健康检查', async () => {
    console.log('🔍 测试: 后端API健康检查');
    
    const apiTests = [
      { name: '首页', path: '/' },
      { name: '数据源列表', path: '/api/data-sources' },
      { name: '消费结构', path: '/api/consumption-structure' },
      { name: '品牌趋势', path: '/api/brand-trends' },
      { name: '社交帖子', path: '/api/social-posts' }
    ];

    const results = [];
    for (const test of apiTests) {
      try {
        const response = await page.request.get(`${BACKEND_URL}${test.path}`);
        results.push({
          name: test.name,
          status: response.status(),
          ok: response.ok()
        });
      } catch (e) {
        results.push({
          name: test.name,
          error: e.message,
          ok: false
        });
      }
    }

    fs.writeFileSync(
      path.join(IMG_DIR, 'api-health-check.json'),
      JSON.stringify(results, null, 2)
    );

    console.log('✅ API健康检查完成');
  });

  test('08 - 最终状态截图', async () => {
    console.log('📸 测试: 最终状态');
    
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(IMG_DIR, '08-final-state.png'),
      fullPage: true
    });
    
    console.log('✅ 最终状态截图完成');
  });
});

test.describe('后端API独立测试', () => {
  test('测试所有数据源切换', async ({ request }) => {
    console.log('🔄 API测试: 数据源切换');
    
    const sources = ['mock_data', 'industry_report', 'e_commerce', 'social_media'];
    const results = [];

    for (const source of sources) {
      try {
        const response = await request.post(`${BACKEND_URL}/api/data-sources/${source}`);
        const data = await response.json();
        
        const structureResponse = await request.get(`${BACKEND_URL}/api/consumption-structure`);
        const structure = await structureResponse.json();
        
        results.push({
          source: source,
          switchSuccess: data.success,
          currentSource: structure.data_source_info?.current_source,
          foodShare: structure.summary?.food_share,
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        results.push({
          source: source,
          error: e.message
        });
      }
    }

    fs.writeFileSync(
      path.join(IMG_DIR, 'data-source-switch-test.json'),
      JSON.stringify(results, null, 2)
    );
    
    console.log('✅ 数据源切换API测试完成');
  });
});
