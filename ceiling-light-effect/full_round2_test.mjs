import playwright from '/Users/liboyang/trae/dailyTools/node_modules/playwright/index.js';
const { chromium } = playwright;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imgDir = path.join(__dirname, 'img', 'round2');
const reportPath = path.join(imgDir, 'test_report.json');

if (!fs.existsSync(imgDir)) {
  fs.mkdirSync(imgDir, { recursive: true });
}

const issues = [];
const consoleErrors = [];
const screenshots = [];

function recordIssue(category, description, evidence, screenshotName = null, severity = 'medium') {
  const issue = {
    category,
    description,
    evidence,
    screenshot: screenshotName,
    severity,
    time: new Date().toISOString()
  };
  issues.push(issue);
  console.log(`❌ [${category}] [${severity}] ${description}`);
  if (evidence) console.log(`   证据: ${evidence.substring(0, 200)}`);
}

async function takeScreenshot(page, name) {
  const filename = `${name}.png`;
  const filepath = path.join(imgDir, filename);
  await page.screenshot({ path: filepath });
  screenshots.push(filename);
  console.log(`📸 ${name}`);
  return filename;
}

async function getStats(page) {
  return await page.evaluate(() => {
    const items = document.querySelectorAll('.stats-item');
    const result = {};
    items.forEach(item => {
      const text = item.textContent.trim();
      if (text.includes('间接光照')) {
        const match = text.match(/(\d+\.?\d*)%/);
        if (match) result.indirectRatio = parseFloat(match[1]);
      }
      if (text.includes('墙面平均亮度')) {
        const match = text.match(/([\d,]+)\s*lux/i);
        if (match) result.wallBrightness = parseFloat(match[1].replace(/,/g, ''));
      }
      if (text.includes('眩光')) {
        const match = text.match(/(\d+\.?\d*)/);
        if (match) result.ugr = parseFloat(match[1]);
      }
    });
    return result;
  });
}

async function getSliders(page) {
  return await page.evaluate(() => {
    const inputs = document.querySelectorAll('input[type="range"]');
    const result = [];
    inputs.forEach((input, idx) => {
      const labelEl = input.closest('.control-item')?.querySelector('.control-label');
      const label = labelEl ? labelEl.textContent.trim() : input.id || `slider-${idx}`;
      result.push({ 
        id: input.id, 
        label: label,
        value: input.value, 
        min: input.min, 
        max: input.max,
        index: idx
      });
    });
    return result;
  });
}

async function setSlider(page, index, value) {
  await page.evaluate(({ idx, val }) => {
    const inputs = document.querySelectorAll('input[type="range"]');
    if (inputs[idx]) {
      inputs[idx].value = val;
      inputs[idx].dispatchEvent(new Event('input', { bubbles: true }));
      inputs[idx].dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, { idx: index, val: value });
}

async function runTests() {
  console.log('='.repeat(70));
  console.log('🚀 第二轮验收深度测试');
  console.log('='.repeat(70));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push({ type: msg.type(), text: msg.text() });
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push({ type: 'pageerror', text: err.message });
  });

  try {
    // ===== 测试1: 页面加载 =====
    console.log('\n📝 测试1: 页面加载测试');
    console.log('-'.repeat(50));
    
    const response = await page.goto('http://localhost:3008/', { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
    console.log(`HTTP状态: ${response.status()}`);
    
    const title = await page.title();
    console.log(`页面标题: ${title}`);
    
    if (!title.includes('吊顶灯光')) {
      recordIssue('页面加载', '页面标题不正确', `实际: ${title}`, null, 'high');
    }
    
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '01_initial_state');
    
    // ===== 测试2: UI统计面板布局验证 =====
    console.log('\n📝 测试2: UI统计面板布局验证');
    console.log('-'.repeat(50));
    
    const controlPanel = await page.$('.control-panel');
    const statsSection = await page.$('.stats-section');
    const statsDivider = await page.$('.stats-divider');
    const statsGrid = await page.$('.stats-grid');
    const statsItems = await page.$$('.stats-item');
    
    console.log(`控制面板存在: ${!!controlPanel}`);
    console.log(`统计区域存在: ${!!statsSection}`);
    console.log(`分隔线存在: ${!!statsDivider}`);
    console.log(`统计网格存在: ${!!statsGrid}`);
    console.log(`统计项数量: ${statsItems.length}`);
    
    if (!controlPanel) {
      recordIssue('UI布局', '控制面板不存在', '找不到 .control-panel 元素', null, 'high');
    }
    
    if (!statsSection) {
      recordIssue('UI布局', '统计面板未整合到控制面板内', '找不到 .stats-section', null, 'high');
    } else {
      // 检查是否在控制面板内
      const isInside = await page.evaluate(() => {
        const stats = document.querySelector('.stats-section');
        const panel = document.querySelector('.control-panel');
        return stats && panel && panel.contains(stats);
      });
      console.log(`统计面板在控制面板内: ${isInside}`);
      if (!isInside) {
        recordIssue('UI布局', '统计面板不在控制面板内部', 'stats-section 不是 control-panel 的子元素', '01_initial_state.png', 'medium');
      }
    }
    
    if (statsItems.length < 3) {
      recordIssue('UI布局', '统计数据项数量不足', `仅有 ${statsItems.length} 项，期望至少3项`, null, 'low');
    }
    
    await takeScreenshot(page, '02_ui_layout_detail');
    
    // ===== 测试3: 初始视角验证 =====
    console.log('\n📝 测试3: 初始视角和场景呈现');
    console.log('-'.repeat(50));
    
    const canvas = await page.$('canvas');
    console.log(`Canvas 存在: ${!!canvas}`);
    
    // 获取相机位置（通过评估）
    const cameraInfo = await page.evaluate(() => {
      try {
        const scripts = document.querySelectorAll('script');
        return { scripts: scripts.length };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    // 视觉评估：截图看视角
    console.log('视觉评估: 检查是否能看到吊顶和两面墙');
    
    // 检查画面是否大部分是黑的（像素分析）
    const brightness = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return -1;
      const ctx = canvas.getContext('2d');
      if (!ctx) return -2;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let total = 0;
      let darkPixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        total += avg;
        if (avg < 20) darkPixels++;
      }
      const avgBrightness = total / (data.length / 4);
      const darkRatio = darkPixels / (data.length / 4);
      return { avgBrightness, darkRatio, totalPixels: data.length / 4 };
    });
    
    console.log(`画面平均亮度: ${brightness.avgBrightness?.toFixed(1) || 'N/A'}`);
    console.log(`暗像素比例: ${(brightness.darkRatio * 100)?.toFixed(1) || 'N/A'}%`);
    
    if (brightness.darkRatio > 0.6) {
      recordIssue('初始视角', '初始视角画面过暗，大面积黑暗', 
        `暗像素占比 ${(brightness.darkRatio * 100).toFixed(1)}%，超过60%`, 
        '01_initial_state.png', 'medium');
    }
    
    await takeScreenshot(page, '03_camera_view_detail');
    
    // ===== 测试4: 亮度数值校准验证 =====
    console.log('\n📝 测试4: 亮度数值校准验证');
    console.log('-'.repeat(50));
    
    const defaultStats = await getStats(page);
    console.log(`默认亮度 500 cd/m² 时:`);
    console.log(`  墙面平均亮度: ${defaultStats.wallBrightness} lux (期望 100-200)`);
    console.log(`  间接光照贡献: ${defaultStats.indirectRatio}% (期望 30-50%)`);
    console.log(`  眩光指数 UGR: ${defaultStats.ugr}`);
    
    // 验证墙面亮度
    if (defaultStats.wallBrightness !== undefined) {
      if (defaultStats.wallBrightness > 10000) {
        recordIssue('光强校准', '墙面平均亮度严重超标', 
          `500 cd/m² 时为 ${defaultStats.wallBrightness} lux，期望 100-200 lux，超出 ${(defaultStats.wallBrightness / 200).toFixed(0)} 倍`, 
          '02_ui_layout_detail.png', 'high');
      } else if (defaultStats.wallBrightness < 100 || defaultStats.wallBrightness > 200) {
        recordIssue('光强校准', '墙面平均亮度不在目标范围内', 
          `实际 ${defaultStats.wallBrightness} lux，期望 100-200 lux`, 
          null, 'medium');
      }
    }
    
    // 验证间接光照比例
    if (defaultStats.indirectRatio !== undefined) {
      if (defaultStats.indirectRatio > 80) {
        recordIssue('光强校准', '间接光照贡献比例严重过高', 
          `当前 ${defaultStats.indirectRatio}%，期望 30-50%，间接光几乎完全主导`, 
          '02_ui_layout_detail.png', 'high');
      } else if (defaultStats.indirectRatio < 30 || defaultStats.indirectRatio > 50) {
        recordIssue('光强校准', '间接光照贡献比例不在目标范围内', 
          `实际 ${defaultStats.indirectRatio}%，期望 30-50%`, 
          null, 'medium');
      }
    }
    
    // ===== 测试5: 亮度调节响应测试 =====
    console.log('\n📝 测试5: 亮度调节响应测试');
    console.log('-'.repeat(50));
    
    const sliders = await getSliders(page);
    console.log(`找到 ${sliders.length} 个滑块`);
    
    const brightnessSlider = sliders.find(s => 
      s.label.includes('亮度') || s.label.includes('intensity') || s.id.includes('intensity')
    );
    
    if (brightnessSlider) {
      console.log(`亮度滑块索引: ${brightnessSlider.index}`);
      
      // 测试低亮度
      await setSlider(page, brightnessSlider.index, '100');
      await page.waitForTimeout(2000);
      const lowStats = await getStats(page);
      await takeScreenshot(page, '05_brightness_low');
      console.log(`低亮度(100)时墙面亮度: ${lowStats.wallBrightness} lux`);
      
      // 测试高亮度
      await setSlider(page, brightnessSlider.index, '1000');
      await page.waitForTimeout(2000);
      const highStats = await getStats(page);
      await takeScreenshot(page, '05_brightness_high');
      console.log(`高亮度(1000)时墙面亮度: ${highStats.wallBrightness} lux`);
      
      // 恢复默认
      await setSlider(page, brightnessSlider.index, '500');
      await page.waitForTimeout(1000);
      
      // 检查亮度变化是否成比例
      if (lowStats.wallBrightness && highStats.wallBrightness) {
        const ratio = highStats.wallBrightness / lowStats.wallBrightness;
        const expectedRatio = 1000 / 100; // 10倍
        console.log(`亮度变化倍率: ${ratio.toFixed(1)}x (理论: ${expectedRatio}x)`);
        
        if (ratio < 2 || ratio > 50) {
          recordIssue('亮度调节', '亮度变化比例异常', 
            `100到1000亮度变化仅 ${ratio.toFixed(1)}倍，期望约 ${expectedRatio} 倍`, 
            null, 'medium');
        }
      }
    } else {
      recordIssue('亮度调节', '未找到亮度调节滑块', 
        `滑块列表: ${sliders.map(s => s.label).join(', ')}`, 
        null, 'high');
    }
    
    // ===== 测试6: 色温调节测试 =====
    console.log('\n📝 测试6: 色温调节测试');
    console.log('-'.repeat(50));
    
    const tempSlider = sliders.find(s => 
      s.label.includes('色温') || s.label.includes('温度') || s.id.includes('colorTemp')
    );
    
    if (tempSlider) {
      console.log(`色温滑块索引: ${tempSlider.index}`);
      
      // 暖光
      await setSlider(page, tempSlider.index, '2700');
      await page.waitForTimeout(2000);
      await takeScreenshot(page, '06_color_temp_warm');
      
      // 冷光
      await setSlider(page, tempSlider.index, '6500');
      await page.waitForTimeout(2000);
      await takeScreenshot(page, '06_color_temp_cool');
      
      // 恢复
      await setSlider(page, tempSlider.index, '4000');
      await page.waitForTimeout(1000);
      
      console.log('色温测试完成');
    } else {
      console.log('未找到色温滑块（跳过）');
    }
    
    // ===== 测试7: 光源类型切换测试 =====
    console.log('\n📝 测试7: 光源类型切换测试');
    console.log('-'.repeat(50));
    
    const toggleBtns = await page.$$('.toggle-btn');
    console.log(`切换按钮数量: ${toggleBtns.length}`);
    
    if (toggleBtns.length >= 2) {
      // 点击第二个（管光源）
      await toggleBtns[1].click();
      await page.waitForTimeout(2000);
      const tubeStats = await getStats(page);
      await takeScreenshot(page, '07_light_type_tube');
      console.log(`管光源时墙面亮度: ${tubeStats.wallBrightness} lux`);
      
      // 点回第一个（面光源）
      await toggleBtns[0].click();
      await page.waitForTimeout(2000);
      const areaStats = await getStats(page);
      await takeScreenshot(page, '07_light_type_area');
      console.log(`面光源时墙面亮度: ${areaStats.wallBrightness} lux`);
    }
    
    // ===== 测试8: 间接照明参数测试 =====
    console.log('\n📝 测试8: 间接照明参数测试');
    console.log('-'.repeat(50));
    
    const bounceSlider = sliders.find(s => 
      s.label.includes('反弹') || s.label.includes('bounce')
    );
    
    if (bounceSlider) {
      console.log(`光线反弹滑块索引: ${bounceSlider.index}`);
      
      // 反弹0次
      await setSlider(page, bounceSlider.index, '0');
      await page.waitForTimeout(2000);
      const bounce0Stats = await getStats(page);
      await takeScreenshot(page, '08_bounce_0');
      console.log(`0次反弹: 间接光照 ${bounce0Stats.indirectRatio}%, 亮度 ${bounce0Stats.wallBrightness} lux`);
      
      // 反弹3次
      await setSlider(page, bounceSlider.index, bounceSlider.max);
      await page.waitForTimeout(2000);
      const bounceMaxStats = await getStats(page);
      await takeScreenshot(page, '08_bounce_max');
      console.log(`${bounceSlider.max}次反弹: 间接光照 ${bounceMaxStats.indirectRatio}%, 亮度 ${bounceMaxStats.wallBrightness} lux`);
      
      // 恢复
      await setSlider(page, bounceSlider.index, '2');
      await page.waitForTimeout(1000);
    }
    
    // ===== 测试9: 眩光警告测试 =====
    console.log('\n📝 测试9: 眩光警告测试');
    console.log('-'.repeat(50));
    
    const glareWarning = await page.$('.glare-warning');
    const glareVisible = glareWarning ? await glareWarning.isVisible() : false;
    console.log(`眩光警告可见: ${glareVisible}`);
    
    if (glareVisible) {
      const glareText = await glareWarning.textContent();
      console.log(`眩光警告: ${glareText.trim()}`);
    }
    
    // ===== 测试10: 控制台错误检查 =====
    console.log('\n📝 测试10: 控制台错误检查');
    console.log('-'.repeat(50));
    
    console.log(`控制台消息数: ${consoleErrors.length}`);
    consoleErrors.slice(0, 5).forEach(err => {
      console.log(`  [${err.type}] ${err.text.substring(0, 150)}`);
    });
    
    const realErrors = consoleErrors.filter(e => e.type === 'error' || e.type === 'pageerror');
    if (realErrors.length > 0) {
      recordIssue('控制台错误', `发现 ${realErrors.length} 个错误`, 
        realErrors.map(e => e.text).join('\n'), 
        null, 'high');
    }
    
    // ===== 测试11: 最终状态 =====
    console.log('\n📝 测试11: 最终状态');
    console.log('-'.repeat(50));
    
    await takeScreenshot(page, '99_final_state');
    const finalStats = await getStats(page);
    console.log(`最终状态: 亮度 ${finalStats.wallBrightness} lux, 间接 ${finalStats.indirectRatio}%`);

  } catch (e) {
    console.error('测试流程异常:', e);
    recordIssue('测试流程', '测试执行出错', e.message, null, 'high');
  } finally {
    await browser.close();
  }

  // 生成报告
  const report = {
    testTime: new Date().toISOString(),
    testRound: 2,
    testItems: [
      '页面加载',
      'UI统计面板布局',
      '初始视角呈现',
      '光强与亮度校准',
      '亮度调节响应',
      '色温调节',
      '光源类型切换',
      '间接照明参数',
      '眩光警告',
      '控制台错误'
    ],
    issues: issues,
    consoleErrors: consoleErrors,
    screenshots: screenshots,
    summary: {
      totalIssues: issues.length,
      highSeverity: issues.filter(i => i.severity === 'high').length,
      mediumSeverity: issues.filter(i => i.severity === 'medium').length,
      lowSeverity: issues.filter(i => i.severity === 'low').length,
      consoleErrors: consoleErrors.length,
      screenshots: screenshots.length
    }
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 测试完成');
  console.log('='.repeat(70));
  console.log(`问题总数: ${issues.length}`);
  console.log(`  严重: ${issues.filter(i => i.severity === 'high').length}`);
  console.log(`  中等: ${issues.filter(i => i.severity === 'medium').length}`);
  console.log(`  轻微: ${issues.filter(i => i.severity === 'low').length}`);
  console.log(`控制台错误: ${consoleErrors.length} 个`);
  console.log(`截图数量: ${screenshots.length} 张`);
  console.log(`报告路径: ${reportPath}`);
  
  if (issues.length > 0) {
    console.log('\n问题列表:');
    issues.forEach((issue, i) => {
      console.log(`\n${i + 1}. [${issue.severity.toUpperCase()}] [${issue.category}] ${issue.description}`);
      if (issue.evidence) console.log(`   证据: ${issue.evidence.substring(0, 200)}`);
    });
  }
  
  return report;
}

runTests().catch(console.error);
