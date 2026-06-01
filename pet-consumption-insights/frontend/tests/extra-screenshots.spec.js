const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const IMG_DIR = path.join(__dirname, '../../img');
const FRONTEND_URL = 'http://localhost:5173';

test.describe('额外截图测试', () => {
  test('07 - 旭日图详情截图', async ({ page }) => {
    console.log('📸 额外测试: 旭日图详情');
    await page.goto(FRONTEND_URL);
    await page.waitForTimeout(2000);
    
    const charts = await page.locator('.echarts').all();
    if (charts.length > 0) {
      await charts[0].screenshot({
        path: path.join(IMG_DIR, '07-sunburst-chart-detail.png')
      });
    } else {
      await page.screenshot({
        path: path.join(IMG_DIR, '07-sunburst-chart-detail.png'),
        fullPage: true
      });
    }
    console.log('✅ 旭日图详情截图完成');
  });

  test('09 - 品牌趋势图表截图', async ({ page }) => {
    console.log('📸 额外测试: 品牌趋势图表');
    await page.goto(FRONTEND_URL);
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(IMG_DIR, '09-brand-trends-chart.png'),
      fullPage: true
    });
    console.log('✅ 品牌趋势图表截图完成');
  });

  test('10 - 所有数据源依次切换完整截图', async ({ page }) => {
    console.log('📸 额外测试: 所有数据源依次切换');
    
    const sources = [
      { id: 0, name: 'mock-data-final' },
      { id: 1, name: 'industry-report-final' },
      { id: 2, name: 'tmall-final' },
      { id: 3, name: 'jd-final' },
      { id: 4, name: 'douyin-final' },
      { id: 5, name: 'weibo-final' }
    ];

    await page.goto(FRONTEND_URL);
    await page.waitForTimeout(1500);
    
    const buttons = await page.locator('button').all();
    
    for (const source of sources) {
      if (buttons.length > source.id) {
        await buttons[source.id].click();
        await page.waitForTimeout(1000);
        await page.screenshot({
          path: path.join(IMG_DIR, `10-source-${source.name}.png`),
          fullPage: true
        });
        console.log(`✅ 截图完成: ${source.name}`);
      }
    }
  });
});
