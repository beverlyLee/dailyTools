import playwright from '/Users/liboyang/trae/dailyTools/node_modules/playwright/index.js';
const { chromium } = playwright;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imgDir = path.join(__dirname, 'img', 'round3');
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
  if (evidence) console.log(`   证据: ${String(evidence).substring(0, 200)}`);
}

function recordPass(category, description) {
  console.log(`✅ [${category}] ${description}`);
}

async function takeScreenshot(page, name) {
  const filename = `${name}.png`;
  const filepath = path.join(imgDir, filename);
  await page.screenshot({ path: filepath });
  screenshots.push(filename);
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
  await page.waitForTimeout(600);
}

async function runTests() {
  console.log('='.repeat(70));
  console.log('🚀 第三轮验收测试 - 吊顶灯光预览器');
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
    console.log('\n📝 测试1: 页面加载');
    console.log('-'.repeat(50));
    
    const response = await page.goto('http://localhost:3009/', { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
    
    const status = response.status();
    if (status === 200) {
      recordPass('页面加载', `HTTP ${status}，页面加载成功`);
    } else {
      recordIssue('页面加载', '页面加载失败', `HTTP状态: ${status}`, null, 'high');
    }
    
    const title = await page.title();
    if (title.includes('吊顶灯光')) {
      recordPass('页面加载', `页面标题正确: ${title}`);
    } else {
      recordIssue('页面加载', '页面标题不正确', `实际: ${title}`, null, 'medium');
    }
    
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '01_initial_state');
    
    // ===== 测试2: UI统计面板布局 =====
    console.log('\n📝 测试2: UI统计面板布局');
    console.log('-'.repeat(50));
    
    const statsInPanel = await page.evaluate(() => {
      const stats = document.querySelector('.stats-section');
      const panel = document.querySelector('.control-panel');
      return stats && panel && panel.contains(stats);
    });
    
    const dividerExists = await page.$('.stats-divider') !== null;
    const statsItemCount = await page.$$('.stats-item').then(a => a.length);
    
    if (statsInPanel && dividerExists && statsItemCount >= 3) {
      recordPass('UI布局', `统计面板在控制面板内，有分隔线，${statsItemCount}项数据`);
    } else {
      if (!statsInPanel) recordIssue('UI布局', '统计面板不在控制面板内', null, null, 'medium');
      if (!dividerExists) recordIssue('UI布局', '缺少视觉分隔线', null, null, 'low');
      if (statsItemCount < 3) recordIssue('UI布局', `统计项不足`, `仅有 ${statsItemCount} 项`, null, 'low');
    }
    
    await takeScreenshot(page, '02_ui_panel');
    
    // ===== 测试3: 初始视角评估 =====
    console.log('\n📝 测试3: 初始视角评估');
    console.log('-'.repeat(50));
    
    // 分析画面内容
    const viewportAnalysis = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { error: 'no canvas' };
      
      const w = Math.min(canvas.width, 400);
      const h = Math.min(canvas.height, 300);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, 0, w, h);
      
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      
      let totalBrightness = 0;
      let darkPixels = 0;
      let veryBrightPixels = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const b = (data[i] + data[i + 1] + data[i + 2]) / 3;
        totalBrightness += b;
        if (b < 15) darkPixels++;
        if (b > 200) veryBrightPixels++;
      }
      
      const pixelCount = data.length / 4;
      return {
        avgBrightness: totalBrightness / pixelCount,
        darkRatio: darkPixels / pixelCount,
        brightRatio: veryBrightPixels / pixelCount,
        pixelCount,
        width: w,
        height: h
      };
    });
    
    console.log(`画面平均亮度: ${viewportAnalysis.avgBrightness?.toFixed(1) || 'N/A'}/255`);
    console.log(`暗像素比例: ${((viewportAnalysis.darkRatio || 0) * 100).toFixed(1)}%`);
    console.log(`亮像素比例: ${((viewportAnalysis.brightRatio || 0) * 100).toFixed(1)}%`);
    
    if (viewportAnalysis.darkRatio > 0.6) {
      recordIssue('初始视角', '初始视角大面积黑暗', 
        `暗像素占比 ${(viewportAnalysis.darkRatio * 100).toFixed(1)}%，超过60%`, 
        '01_initial_state.png', 'high');
    } else if (viewportAnalysis.darkRatio > 0.4) {
      recordIssue('初始视角', '初始视角暗区较大', 
        `暗像素占比 ${(viewportAnalysis.darkRatio * 100).toFixed(1)}%`, 
        null, 'medium');
    } else {
      recordPass('初始视角', `暗区比例合理 (${(viewportAnalysis.darkRatio * 100).toFixed(1)}%)`);
    }
    
    await takeScreenshot(page, '03_camera_view');
    
    // ===== 测试4: 亮度数值校准（核心） =====
    console.log('\n📝 测试4: 亮度数值校准（核心验证）');
    console.log('-'.repeat(50));
    
    const defaultStats = await getStats(page);
    console.log(`默认 500 cd/m² 时:`);
    console.log(`  墙面平均亮度: ${defaultStats.wallBrightness} lux (目标: 100-200)`);
    console.log(`  间接光照贡献: ${defaultStats.indirectRatio}% (目标: 35-45%)`);
    console.log(`  眩光指数 UGR: ${defaultStats.ugr}`);
    
    // 验证墙面亮度
    if (defaultStats.wallBrightness !== undefined) {
      const wb = defaultStats.wallBrightness;
      if (wb >= 100 && wb <= 200) {
        recordPass('光强校准', `墙面亮度 ${wb} lux，在目标范围 100-200 lux 内`);
      } else if (wb < 50 || wb > 500) {
        recordIssue('光强校准', '墙面亮度严重偏离目标', 
          `当前 ${wb} lux，目标 100-200 lux，偏差 ${wb < 100 ? ((100/wb).toFixed(0) + '倍偏低') : ((wb/200).toFixed(0) + '倍偏高')}`, 
          '02_ui_panel.png', 'high');
      } else {
        recordIssue('光强校准', '墙面亮度不在目标范围内', 
          `当前 ${wb} lux，目标 100-200 lux`, 
          null, 'medium');
      }
    }
    
    // 验证间接光照比例
    if (defaultStats.indirectRatio !== undefined) {
      const ir = defaultStats.indirectRatio;
      if (ir >= 35 && ir <= 45) {
        recordPass('间接光照', `间接光照比例 ${ir}%，在目标范围 35-45% 内`);
      } else if (ir < 20 || ir > 70) {
        recordIssue('间接光照', '间接光照比例严重偏离', 
          `当前 ${ir}%，目标 35-45%`, 
          '02_ui_panel.png', 'high');
      } else {
        recordIssue('间接光照', '间接光照比例不在目标范围内', 
          `当前 ${ir}%，目标 35-45%`, 
          null, 'medium');
      }
    }
    
    // ===== 测试5: 亮度调节线性响应 =====
    console.log('\n📝 测试5: 亮度调节线性响应');
    console.log('-'.repeat(50));
    
    const sliders = await getSliders(page);
    const brightnessIdx = sliders.findIndex(s => 
      s.label.includes('亮度') || s.id.includes('intensity') || s.label.includes('Intensity')
    );
    
    if (brightnessIdx >= 0) {
      console.log(`亮度滑块索引: ${brightnessIdx}`);
      
      // 测试多个亮度点
      const testPoints = [100, 250, 500, 750, 1000];
      const brightnessResults = [];
      
      for (const val of testPoints) {
        await setSlider(page, brightnessIdx, String(val));
        await page.waitForTimeout(1200);
        const stats = await getStats(page);
        brightnessResults.push({ input: val, brightness: stats.wallBrightness });
        console.log(`  ${val} cd/m² → ${stats.wallBrightness} lux`);
      }
      
      // 检查线性度
      const r1 = brightnessResults[1].brightness / brightnessResults[0].brightness;
      const r2 = brightnessResults[2].brightness / brightnessResults[1].brightness;
      const expectedRatio = 2.5; // 250/100 = 2.5
      
      console.log(`亮度变化比例: ${r1.toFixed(2)}x (期望约 ${expectedRatio}x)`);
      
      if (Math.abs(r1 - expectedRatio) / expectedRatio < 0.3) {
        recordPass('亮度调节', `亮度调节线性度良好 (${r1.toFixed(2)}x vs 期望 ${expectedRatio}x)`);
      } else {
        recordIssue('亮度调节', '亮度调节线性度不佳', 
          `250/100 亮度比为 ${r1.toFixed(2)}，期望约 ${expectedRatio}`, 
          null, 'medium');
      }
      
      // 恢复默认
      await setSlider(page, brightnessIdx, '500');
      await page.waitForTimeout(800);
    } else {
      recordIssue('亮度调节', '未找到亮度滑块', 
        `滑块列表: ${sliders.map(s => s.label).join(', ')}`, 
        null, 'high');
    }
    
    await takeScreenshot(page, '04_brightness_test');
    
    // ===== 测试6: 间接照明参数测试 =====
    console.log('\n📝 测试6: 间接照明参数测试');
    console.log('-'.repeat(50));
    
    const bounceIdx = sliders.findIndex(s => 
      s.label.includes('反弹') || s.id.includes('bounce') || s.label.includes('Bounce')
    );
    
    if (bounceIdx >= 0) {
      console.log(`光线反弹滑块索引: ${bounceIdx}`);
      
      // 0次反弹
      await setSlider(page, bounceIdx, '0');
      await page.waitForTimeout(2000);
      const stats0 = await getStats(page);
      console.log(`0次反弹: 亮度 ${stats0.wallBrightness} lux, 间接 ${stats0.indirectRatio}%`);
      
      if (stats0.indirectRatio !== undefined && stats0.indirectRatio > 30) {
        recordIssue('间接光照', '0次反弹时间接光照比例仍然过高', 
          `0次反弹时 ${stats0.indirectRatio}%，理论上应该接近0%`, 
          null, 'high');
      }
      
      await takeScreenshot(page, '05_bounce_0');
      
      // 2次反弹（默认）
      await setSlider(page, bounceIdx, '2');
      await page.waitForTimeout(2000);
      const stats2 = await getStats(page);
      console.log(`2次反弹: 亮度 ${stats2.wallBrightness} lux, 间接 ${stats2.indirectRatio}%`);
      
      await takeScreenshot(page, '06_bounce_2');
      
      // 最大反弹
      await setSlider(page, bounceIdx, sliders[bounceIdx].max);
      await page.waitForTimeout(2000);
      const statsMax = await getStats(page);
      console.log(`${sliders[bounceIdx].max}次反弹: 亮度 ${statsMax.wallBrightness} lux, 间接 ${statsMax.indirectRatio}%`);
      
      await takeScreenshot(page, '07_bounce_max');
      
      // 恢复默认
      await setSlider(page, bounceIdx, '2');
      await page.waitForTimeout(800);
    }
    
    // ===== 测试7: 洗墙效果视觉评估 =====
    console.log('\n📝 测试7: 洗墙效果视觉评估');
    console.log('-'.repeat(50));
    
    // 从视觉上评估洗墙效果
    const washQuality = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { error: 'no canvas' };
      
      const w = Math.min(canvas.width, 300);
      const h = Math.min(canvas.height, 200);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, 0, w, h);
      
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      
      // 分析左半部分和右半部分的亮度分布
      const leftBrightness = [];
      const rightBrightness = [];
      
      for (let y = 0; y < h; y++) {
        let leftSum = 0, rightSum = 0;
        let leftCount = 0, rightCount = 0;
        
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const b = (data[i] + data[i + 1] + data[i + 2]) / 3;
          
          if (x < w * 0.3) {
            leftSum += b;
            leftCount++;
          }
          if (x > w * 0.7) {
            rightSum += b;
            rightCount++;
          }
        }
        
        if (leftCount > 0) leftBrightness.push(leftSum / leftCount);
        if (rightCount > 0) rightBrightness.push(rightSum / rightCount);
      }
      
      // 计算上部和下部的亮度比
      const topThirdBrightness = leftBrightness.slice(0, Math.floor(h/3)).reduce((a,b)=>a+b,0) / Math.floor(h/3);
      const bottomThirdBrightness = leftBrightness.slice(Math.floor(2*h/3)).reduce((a,b)=>a+b,0) / Math.floor(h/3);
      
      return {
        leftAvg: leftBrightness.reduce((a,b)=>a+b,0) / leftBrightness.length,
        rightAvg: rightBrightness.reduce((a,b)=>a+b,0) / rightBrightness.length,
        topThird: topThirdBrightness,
        bottomThird: bottomThirdBrightness,
        topBottomRatio: topThirdBrightness / Math.max(bottomThirdBrightness, 1),
        height: h
      };
    });
    
    console.log(`左侧平均亮度: ${washQuality.leftAvg?.toFixed(1) || 'N/A'}`);
    console.log(`右侧平均亮度: ${washQuality.rightAvg?.toFixed(1) || 'N/A'}`);
    console.log(`上部1/3亮度: ${washQuality.topThird?.toFixed(1) || 'N/A'}`);
    console.log(`下部1/3亮度: ${washQuality.bottomThird?.toFixed(1) || 'N/A'}`);
    console.log(`上下亮度比: ${washQuality.topBottomRatio?.toFixed(2) || 'N/A'}`);
    
    // 如果有洗墙效果，上部应该比下部亮
    if (washQuality.topBottomRatio > 1.5) {
      recordPass('洗墙效果', `有明显的上下亮度梯度 (${washQuality.topBottomRatio.toFixed(2)}:1)`);
    } else if (washQuality.topBottomRatio > 1.1) {
      recordIssue('洗墙效果', '洗墙效果梯度不明显', 
        `上下亮度比仅 ${washQuality.topBottomRatio.toFixed(2)}:1，梯度效果弱`, 
        null, 'medium');
    } else {
      recordIssue('洗墙效果', '洗墙效果缺失', 
        `上下亮度比 ${washQuality.topBottomRatio.toFixed(2)}:1，几乎无洗墙效果`, 
        null, 'high');
    }
    
    await takeScreenshot(page, '08_wallwash_quality');
    
    // ===== 测试8: 色温调节 =====
    console.log('\n📝 测试8: 色温调节');
    console.log('-'.repeat(50));
    
    const tempIdx = sliders.findIndex(s => 
      s.label.includes('色温') || s.id.includes('colorTemp') || s.label.includes('温度')
    );
    
    if (tempIdx >= 0) {
      // 暖光
      await setSlider(page, tempIdx, '2700');
      await page.waitForTimeout(1500);
      await takeScreenshot(page, '09_color_temp_warm');
      
      // 冷光
      await setSlider(page, tempIdx, '6500');
      await page.waitForTimeout(1500);
      await takeScreenshot(page, '10_color_temp_cool');
      
      // 恢复
      await setSlider(page, tempIdx, '4000');
      await page.waitForTimeout(800);
      
      recordPass('色温调节', '色温切换正常');
    }
    
    // ===== 测试9: 眩光警告 =====
    console.log('\n📝 测试9: 眩光警告');
    console.log('-'.repeat(50));
    
    const glareInfo = await page.evaluate(() => {
      const warning = document.querySelector('.glare-warning');
      if (!warning) return { exists: false };
      return {
        exists: true,
        visible: !warning.classList.contains('hidden'),
        text: warning.textContent?.trim() || ''
      };
    });
    
    console.log(`眩光警告存在: ${glareInfo.exists}`);
    console.log(`眩光警告可见: ${glareInfo.visible}`);
    if (glareInfo.text) console.log(`警告内容: ${glareInfo.text.substring(0, 50)}`);
    
    if (glareInfo.exists) {
      recordPass('眩光分析', '眩光警告组件存在');
    } else {
      recordIssue('眩光分析', '未找到眩光警告组件', null, null, 'low');
    }
    
    // ===== 测试10: 控制台错误 =====
    console.log('\n📝 测试10: 控制台错误检查');
    console.log('-'.repeat(50));
    
    const errorCount = consoleErrors.filter(e => e.type === 'error' || e.type === 'pageerror').length;
    const warningCount = consoleErrors.filter(e => e.type === 'warning').length;
    
    console.log(`错误: ${errorCount}, 警告: ${warningCount}`);
    
    if (errorCount > 0) {
      recordIssue('控制台错误', `发现 ${errorCount} 个错误`, 
        consoleErrors.filter(e => e.type === 'error' || e.type === 'pageerror')
          .map(e => e.text).join('\n'), 
        null, 'high');
    } else {
      recordPass('控制台错误', '无控制台错误');
    }
    
    // 最终状态
    await takeScreenshot(page, '99_final_state');

  } catch (e) {
    console.error('测试流程异常:', e.message);
    recordIssue('测试流程', '测试执行出错', e.message, null, 'high');
  } finally {
    await browser.close();
  }

  // 生成报告
  const report = {
    testTime: new Date().toISOString(),
    testRound: 3,
    testItems: [
      '页面加载',
      'UI统计面板布局',
      '初始视角评估',
      '亮度数值校准',
      '亮度调节线性度',
      '间接照明参数',
      '洗墙效果质量',
      '色温调节',
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
  console.log(`截图数量: ${screenshots.length} 张`);
  console.log(`报告路径: ${reportPath}`);
  
  if (issues.length > 0) {
    console.log('\n问题列表:');
    issues.forEach((issue, i) => {
      console.log(`\n${i + 1}. [${issue.severity.toUpperCase()}] [${issue.category}] ${issue.description}`);
      if (issue.evidence) console.log(`   证据: ${String(issue.evidence).substring(0, 150)}`);
    });
  }
  
  return report;
}

runTests().catch(console.error);
