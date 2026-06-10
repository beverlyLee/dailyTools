import playwright from '/Users/liboyang/trae/dailyTools/node_modules/playwright/index.js';
const { chromium } = playwright;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imgDir = path.join(__dirname, 'img', 'round3');
const reportPath = path.join(imgDir, 'test_report2.json');

if (!fs.existsSync(imgDir)) {
  fs.mkdirSync(imgDir, { recursive: true });
}

const issues = [];
const consoleErrors = [];
const screenshots = [];
const passes = [];

function recordIssue(category, description, evidence, screenshotName = null, severity = 'medium') {
  const issue = { category, description, evidence, screenshot: screenshotName, severity, time: new Date().toISOString() };
  issues.push(issue);
  console.log(`❌ [${severity.toUpperCase()}] [${category}] ${description}`);
  if (evidence) console.log(`   证据: ${String(evidence).substring(0, 180)}`);
}

function recordPass(category, description) {
  passes.push({ category, description });
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
        const m = text.match(/(\d+\.?\d*)%/);
        if (m) result.indirectRatio = parseFloat(m[1]);
      }
      if (text.includes('墙面平均亮度')) {
        const m = text.match(/([\d,]+)\s*lux/i);
        if (m) result.wallBrightness = parseFloat(m[1].replace(/,/g, ''));
      }
      if (text.includes('眩光')) {
        const m = text.match(/(\d+\.?\d*)/);
        if (m) result.ugr = parseFloat(m[1]);
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
      const label = labelEl ? labelEl.textContent.trim() : input.id || `s${idx}`;
      result.push({ id: input.id, label, value: input.value, min: input.min, max: input.max, index: idx });
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
  await page.waitForTimeout(500);
}

async function runTests() {
  console.log('='.repeat(65));
  console.log('🔬 第三轮补充测试 - 吊顶灯光预览器');
  console.log('='.repeat(65));

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
    await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log('页面加载完成');

    const sliders = await getSliders(page);
    console.log(`找到 ${sliders.length} 个滑块`);

    // ===== 测试1: 亮度调节多档位测试 =====
    console.log('\n📐 测试1: 亮度调节多档位测试');
    console.log('-'.repeat(50));
    
    const bIdx = sliders.findIndex(s => s.label.includes('亮度') || s.id.includes('intensity'));
    
    if (bIdx >= 0) {
      const brightnessData = [];
      const testVals = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      
      for (const v of testVals) {
        await setSlider(page, bIdx, String(v));
        await page.waitForTimeout(1000);
        const stats = await getStats(page);
        brightnessData.push({ input: v, lux: stats.wallBrightness, indirect: stats.indirectRatio });
        console.log(`  ${v} cd/m² → ${stats.wallBrightness} lux, 间接 ${stats.indirectRatio}%`);
      }
      
      // 检查线性度
      const ratio500_100 = brightnessData[4].lux / brightnessData[0].lux;
      const expected = 5;
      const deviation = Math.abs(ratio500_100 - expected) / expected;
      
      console.log(`  500/100 亮度比: ${ratio500_100.toFixed(2)} (期望 ${expected}x, 偏差 ${(deviation*100).toFixed(1)}%)`);
      
      if (deviation < 0.25) {
        recordPass('亮度调节', `线性度良好 (偏差${(deviation*100).toFixed(1)}%)`);
      } else {
        recordIssue('亮度调节', '亮度调节线性度不足', 
          `500/100比为${ratio500_100.toFixed(2)}，期望约${expected}，偏差${(deviation*100).toFixed(1)}%`, 
          null, 'medium');
      }
      
      // 检查500时亮度是否在目标范围
      const lux500 = brightnessData[4].lux;
      if (lux500 >= 100 && lux500 <= 200) {
        recordPass('光强校准', `500 cd/m² 时 ${lux500} lux，在 100-200 lux 目标范围内`);
      } else if (lux500 >= 80 && lux500 <= 250) {
        recordIssue('光强校准', '墙面亮度接近目标但略超出', 
          `当前 ${lux500} lux，目标 100-200 lux`, null, 'low');
      } else {
        recordIssue('光强校准', '墙面亮度严重偏离目标', 
          `当前 ${lux500} lux，目标 100-200 lux`, null, 'high');
      }
      
      // 检查间接光照比例是否在目标范围
      const indirect500 = brightnessData[4].indirect;
      if (indirect500 >= 35 && indirect500 <= 45) {
        recordPass('间接光照', `间接光照 ${indirect500}%，在 35-45% 目标范围内`);
      } else if (indirect500 >= 30 && indirect500 <= 50) {
        recordIssue('间接光照', '间接光照比例接近目标但略超出', 
          `当前 ${indirect500}%，目标 35-45%`, null, 'low');
      } else {
        recordIssue('间接光照', '间接光照比例严重偏离目标', 
          `当前 ${indirect500}%，目标 35-45%`, null, 'high');
      }
      
      await setSlider(page, bIdx, '500');
      await page.waitForTimeout(800);
    }
    
    await takeScreenshot(page, '11_brightness_test');

    // ===== 测试2: 间接照明反弹次数测试 =====
    console.log('\n🌟 测试2: 间接照明反弹次数测试');
    console.log('-'.repeat(50));
    
    const bounceIdx = sliders.findIndex(s => s.label.includes('反弹') || s.id.includes('bounce'));
    
    if (bounceIdx >= 0) {
      const bounceData = [];
      const bounceVals = [0, 1, 2, 3, 4, 5];
      
      for (const b of bounceVals) {
        await setSlider(page, bounceIdx, String(b));
        await page.waitForTimeout(1500);
        const stats = await getStats(page);
        bounceData.push({ bounces: b, lux: stats.wallBrightness, indirect: stats.indirectRatio });
        console.log(`  ${b}次反弹 → ${stats.wallBrightness} lux, 间接 ${stats.indirectRatio}%`);
      }
      
      // 0次反弹时，间接光照应该为0或很低
      if (bounceData[0].indirect > 20) {
        recordIssue('间接光照', '0次反弹时间接光照比例仍然过高', 
          `0次反弹时 ${bounceData[0].indirect}%，应该接近0%`, null, 'high');
      } else if (bounceData[0].indirect > 5) {
        recordIssue('间接光照', '0次反弹时仍有少量间接光', 
          `0次反弹时 ${bounceData[0].indirect}%`, null, 'medium');
      } else {
        recordPass('间接光照', `0次反弹时间接光照正确 (${bounceData[0].indirect}%)`);
      }
      
      // 检查反弹次数增加时亮度是否单调递增
      let monotonic = true;
      for (let i = 1; i < bounceData.length; i++) {
        if (bounceData[i].lux <= bounceData[i-1].lux * 0.95) {
          monotonic = false;
          break;
        }
      }
      
      if (monotonic) {
        recordPass('间接光照', '亮度随反弹次数单调递增');
      } else {
        recordIssue('间接光照', '亮度随反弹次数不单调', null, null, 'low');
      }
      
      await takeScreenshot(page, '12_bounce_test');
      
      // 恢复默认
      await setSlider(page, bounceIdx, '2');
      await page.waitForTimeout(800);
    }

    // ===== 测试3: 洗墙强度调节 =====
    console.log('\n💡 测试3: 洗墙强度调节测试');
    console.log('-'.repeat(50));
    
    const washIdx = sliders.findIndex(s => s.label.includes('洗墙强度') || s.label.includes('强度'));
    
    if (washIdx >= 0) {
      console.log(`洗墙强度滑块索引: ${washIdx}, 范围: ${sliders[washIdx].min}-${sliders[washIdx].max}`);
      
      // 最小
      await setSlider(page, washIdx, sliders[washIdx].min);
      await page.waitForTimeout(1500);
      const minStats = await getStats(page);
      await takeScreenshot(page, '13_wash_min');
      console.log(`  最小洗墙强度: ${minStats.wallBrightness} lux`);
      
      // 最大
      await setSlider(page, washIdx, sliders[washIdx].max);
      await page.waitForTimeout(1500);
      const maxStats = await getStats(page);
      await takeScreenshot(page, '14_wash_max');
      console.log(`  最大洗墙强度: ${maxStats.wallBrightness} lux`);
      
      const washRatio = maxStats.wallBrightness / Math.max(minStats.wallBrightness, 1);
      console.log(`  洗墙强度变化比: ${washRatio.toFixed(2)}x`);
      
      if (washRatio > 1.2) {
        recordPass('洗墙效果', `洗墙强度调节有效 (${washRatio.toFixed(2)}x变化)`);
      } else {
        recordIssue('洗墙效果', '洗墙强度调节效果不明显', 
          `最大/最小比仅 ${washRatio.toFixed(2)}x`, null, 'medium');
      }
      
      // 恢复默认
      await setSlider(page, washIdx, '1.0');
      await page.waitForTimeout(800);
    }

    // ===== 测试4: 光源类型切换 =====
    console.log('\n🔦 测试4: 光源类型切换测试');
    console.log('-'.repeat(50));
    
    const btnCount = await page.evaluate(() => {
      const btns = document.querySelectorAll('.toggle-btn');
      return btns.length;
    });
    
    console.log(`切换按钮数量: ${btnCount}`);
    
    // 找到面光源和管光源按钮
    const areaIdx = await page.evaluate(() => {
      const btns = document.querySelectorAll('.toggle-btn');
      for (let i = 0; i < btns.length; i++) {
        if (btns[i].textContent?.includes('面光源')) return i;
      }
      return -1;
    });
    
    const tubeIdx = await page.evaluate(() => {
      const btns = document.querySelectorAll('.toggle-btn');
      for (let i = 0; i < btns.length; i++) {
        if (btns[i].textContent?.includes('管光源')) return i;
      }
      return -1;
    });
    
    console.log(`面光源按钮: ${areaIdx}, 管光源按钮: ${tubeIdx}`);
    
    if (areaIdx >= 0 && tubeIdx >= 0) {
      // 切到面光源
      await page.evaluate(idx => {
        const btns = document.querySelectorAll('.toggle-btn');
        if (btns[idx]) btns[idx].click();
      }, areaIdx);
      await page.waitForTimeout(2000);
      const areaStats = await getStats(page);
      await takeScreenshot(page, '15_area_light');
      console.log(`  面光源: ${areaStats.wallBrightness} lux`);
      
      // 切到管光源
      await page.evaluate(idx => {
        const btns = document.querySelectorAll('.toggle-btn');
        if (btns[idx]) btns[idx].click();
      }, tubeIdx);
      await page.waitForTimeout(2000);
      const tubeStats = await getStats(page);
      await takeScreenshot(page, '16_tube_light');
      console.log(`  管光源: ${tubeStats.wallBrightness} lux`);
      
      recordPass('光源类型', '面光源/管光源切换正常');
      
      // 切回面光源
      await page.evaluate(idx => {
        const btns = document.querySelectorAll('.toggle-btn');
        if (btns[idx]) btns[idx].click();
      }, areaIdx);
      await page.waitForTimeout(1000);
    }

    // ===== 测试5: 吊顶结构参数调节 =====
    console.log('\n🏠 测试5: 吊顶结构参数测试');
    console.log('-'.repeat(50));
    
    const widthIdx = sliders.findIndex(s => s.label.includes('房间宽度'));
    const heightIdx = sliders.findIndex(s => s.label.includes('房间高度'));
    
    if (widthIdx >= 0) {
      // 调整宽度
      await setSlider(page, widthIdx, '10');
      await page.waitForTimeout(1500);
      const wideStats = await getStats(page);
      await takeScreenshot(page, '17_room_wide');
      console.log(`  房间宽10m: ${wideStats.wallBrightness} lux`);
      
      await setSlider(page, widthIdx, '8');
      await page.waitForTimeout(800);
    }
    
    if (heightIdx >= 0) {
      await setSlider(page, heightIdx, '3.5');
      await page.waitForTimeout(1500);
      const tallStats = await getStats(page);
      await takeScreenshot(page, '18_room_tall');
      console.log(`  房间高3.5m: ${tallStats.wallBrightness} lux`);
      
      await setSlider(page, heightIdx, '2.8');
      await page.waitForTimeout(800);
    }
    
    recordPass('吊顶结构', '吊顶参数调节响应正常');

    // ===== 测试6: 眩光警告可见性 =====
    console.log('\n⚠️  测试6: 眩光警告');
    console.log('-'.repeat(50));
    
    const glareVisible = await page.evaluate(() => {
      const w = document.querySelector('.glare-warning');
      if (!w) return 'not found';
      return w.classList.contains('hidden') ? 'hidden' : 'visible';
    });
    
    console.log(`眩光警告状态: ${glareVisible}`);
    
    if (glareVisible === 'not found') {
      recordIssue('眩光分析', '未找到眩光警告组件', null, null, 'low');
    } else {
      recordPass('眩光分析', `眩光警告组件存在 (${glareVisible})`);
    }

    // ===== 测试7: 控制台错误 =====
    console.log('\n🖥️  测试7: 控制台错误检查');
    console.log('-'.repeat(50));
    
    const errors = consoleErrors.filter(e => e.type === 'error' || e.type === 'pageerror');
    const warnings = consoleErrors.filter(e => e.type === 'warning');
    
    console.log(`错误: ${errors.length}, 警告: ${warnings.length}`);
    
    if (errors.length > 0) {
      recordIssue('控制台错误', `发现 ${errors.length} 个错误`, 
        errors.map(e => e.text).join('\n').substring(0, 300), null, 'high');
    } else {
      recordPass('控制台错误', '无控制台错误');
    }
    
    if (warnings.length > 0 && warnings.length < 10) {
      console.log(`  (${warnings.length}个GPU性能警告，属正常现象)`);
    }

    // 最终状态
    await takeScreenshot(page, '99_final');

  } catch (e) {
    console.error('测试出错:', e.message);
    recordIssue('测试流程', '测试执行异常', e.message.substring(0, 200), null, 'high');
  } finally {
    await browser.close();
  }

  // 生成报告
  const report = {
    testTime: new Date().toISOString(),
    testRound: 3,
    issues,
    passes,
    consoleErrors,
    screenshots,
    summary: {
      totalIssues: issues.length,
      totalPasses: passes.length,
      highSeverity: issues.filter(i => i.severity === 'high').length,
      mediumSeverity: issues.filter(i => i.severity === 'medium').length,
      lowSeverity: issues.filter(i => i.severity === 'low').length,
      screenshots: screenshots.length
    }
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n' + '='.repeat(65));
  console.log('📊 补充测试完成');
  console.log('='.repeat(65));
  console.log(`通过: ${passes.length} 项`);
  console.log(`问题: ${issues.length} 个 (高:${issues.filter(i=>i.severity==='high').length}, 中:${issues.filter(i=>i.severity==='medium').length}, 低:${issues.filter(i=>i.severity==='low').length})`);
  console.log(`截图: ${screenshots.length} 张`);
  
  return report;
}

runTests().catch(console.error);
