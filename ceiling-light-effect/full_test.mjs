import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const imgDir = path.join(process.cwd(), 'img');
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

let issues = [];
let consoleErrors = [];

function logIssue(category, description, evidence = '') {
  issues.push({ category, description, evidence, time: new Date().toISOString() });
  console.log(`\n❌ [${category}] ${description}`);
  if (evidence) console.log(`   证据: ${evidence}`);
}

async function takeScreenshot(page, name) {
  try {
    const screenshotPath = path.join(imgDir, `${name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false, timeout: 5000 });
    console.log(`   📸 截图: ${name}.png`);
    return screenshotPath;
  } catch (e) {
    console.log(`   ⚠️  截图失败: ${e.message}`);
    return null;
  }
}

async function safeEval(page, fn, defaultValue = null) {
  try {
    return await page.evaluate(fn);
  } catch (e) {
    return defaultValue;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('  吊顶灯光效果预览器 - 全面功能测试');
  console.log('='.repeat(60));
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  
  // 收集错误
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push({ type: msg.type(), text: msg.text() });
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push({ type: 'exception', text: err.message, stack: err.stack });
  });
  
  try {
    // ===== 测试 1: 页面加载 =====
    console.log('\n📋 测试 1: 页面加载与基础结构');
    console.log('-'.repeat(40));
    
    await page.goto('http://localhost:3001/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    const title = await page.title();
    console.log(`   页面标题: ${title}`);
    
    // 检查关键元素
    const hasCanvas = await safeEval(page, () => document.querySelector('canvas') !== null, false);
    const hasControlPanel = await safeEval(page, () => document.querySelector('.control-panel') !== null, false);
    const hasStatsPanel = await safeEval(page, () => document.querySelector('.stats-panel') !== null, false);
    const hasHint = await safeEval(page, () => document.querySelector('.controls-hint') !== null, false);
    
    console.log(`   Canvas 元素: ${hasCanvas ? '✅' : '❌'}`);
    console.log(`   控制面板: ${hasControlPanel ? '✅' : '❌'}`);
    console.log(`   统计面板: ${hasStatsPanel ? '✅' : '❌'}`);
    console.log(`   操作提示: ${hasHint ? '✅' : '❌'}`);
    
    if (!hasCanvas) logIssue('页面结构', 'Canvas 元素不存在', 'Three.js 渲染画布未找到');
    if (!hasControlPanel) logIssue('页面结构', '控制面板不存在', '.control-panel 元素未找到');
    
    await takeScreenshot(page, 'test01_initial_state');
    
    // ===== 测试 2: 吊顶结构生成器 =====
    console.log('\n📋 测试 2: 吊顶结构生成器');
    console.log('-'.repeat(40));
    
    // 房间宽度
    const roomWidthVal = await safeEval(page, () => document.getElementById('roomWidthValue')?.textContent, null);
    console.log(`   初始房间宽度: ${roomWidthVal || '❌ 未找到'}`);
    
    if (roomWidthVal) {
      await page.evaluate(() => {
        const el = document.getElementById('roomWidth');
        el.value = 12;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.waitForTimeout(600);
      
      const newVal = await safeEval(page, () => document.getElementById('roomWidthValue')?.textContent, null);
      console.log(`   修改后房间宽度: ${newVal}`);
      
      if (newVal === roomWidthVal) {
        logIssue('吊顶结构', '房间宽度修改后显示值未更新', `初始: ${roomWidthVal}, 修改后: ${newVal}`);
      }
      
      await takeScreenshot(page, 'test02_room_width_12m');
      
      // 恢复默认
      await page.evaluate(() => {
        const el = document.getElementById('roomWidth');
        el.value = 8;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.waitForTimeout(500);
    } else {
      logIssue('吊顶结构', '房间宽度控件未找到', '#roomWidthValue 元素不存在');
    }
    
    // 吊顶下垂高度
    const ceilingDropVal = await safeEval(page, () => document.getElementById('ceilingDropValue')?.textContent, null);
    console.log(`   初始吊顶下垂: ${ceilingDropVal || '❌ 未找到'}`);
    
    if (ceilingDropVal) {
      await page.evaluate(() => {
        const el = document.getElementById('ceilingDrop');
        el.value = 0.35;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.waitForTimeout(600);
      
      const newVal = await safeEval(page, () => document.getElementById('ceilingDropValue')?.textContent, null);
      console.log(`   修改后吊顶下垂: ${newVal}`);
      
      await takeScreenshot(page, 'test03_ceiling_drop_high');
      
      // 恢复默认
      await page.evaluate(() => {
        const el = document.getElementById('ceilingDrop');
        el.value = 0.15;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.waitForTimeout(500);
    }
    
    // 灯槽宽度和深度
    await page.evaluate(() => {
      const tw = document.getElementById('trenchWidth');
      const td = document.getElementById('trenchDepth');
      if (tw) { tw.value = 0.25; tw.dispatchEvent(new Event('input', { bubbles: true })); }
      if (td) { td.value = 0.15; td.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(600);
    await takeScreenshot(page, 'test04_large_trench');
    
    // 恢复
    await page.evaluate(() => {
      const tw = document.getElementById('trenchWidth');
      const td = document.getElementById('trenchDepth');
      if (tw) { tw.value = 0.12; tw.dispatchEvent(new Event('input', { bubbles: true })); }
      if (td) { td.value = 0.08; td.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(500);
    
    // ===== 测试 3: 光源编辑器 =====
    console.log('\n📋 测试 3: 光源编辑器');
    console.log('-'.repeat(40));
    
    const intensityVal = await safeEval(page, () => document.getElementById('intensityValue')?.textContent, null);
    console.log(`   初始亮度: ${intensityVal || '❌ 未找到'}`);
    
    // 测试最大亮度
    await page.evaluate(() => {
      const el = document.getElementById('intensity');
      if (el) { el.value = 2000; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(800);
    
    const maxIntensity = await safeEval(page, () => document.getElementById('intensityValue')?.textContent, null);
    console.log(`   最大亮度: ${maxIntensity}`);
    await takeScreenshot(page, 'test05_max_intensity');
    
    // 测试最低亮度
    await page.evaluate(() => {
      const el = document.getElementById('intensity');
      if (el) { el.value = 50; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(800);
    
    const minIntensity = await safeEval(page, () => document.getElementById('intensityValue')?.textContent, null);
    console.log(`   最低亮度: ${minIntensity}`);
    await takeScreenshot(page, 'test06_min_intensity');
    
    // 恢复默认亮度
    await page.evaluate(() => {
      const el = document.getElementById('intensity');
      if (el) { el.value = 500; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(500);
    
    // 测试色温 - 暖色
    await page.evaluate(() => {
      const el = document.getElementById('colorTemp');
      if (el) { el.value = 2000; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(600);
    
    const warmTemp = await safeEval(page, () => document.getElementById('colorTempValue')?.textContent, null);
    console.log(`   暖光色温: ${warmTemp}`);
    await takeScreenshot(page, 'test07_warm_color_2000K');
    
    // 测试色温 - 冷色
    await page.evaluate(() => {
      const el = document.getElementById('colorTemp');
      if (el) { el.value = 8000; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(600);
    
    const coolTemp = await safeEval(page, () => document.getElementById('colorTempValue')?.textContent, null);
    console.log(`   冷光色温: ${coolTemp}`);
    await takeScreenshot(page, 'test08_cool_color_8000K');
    
    // 恢复默认色温
    await page.evaluate(() => {
      const el = document.getElementById('colorTemp');
      if (el) { el.value = 4000; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(500);
    
    // 测试光源类型切换
    const lightTypeBadge = await safeEval(page, () => document.getElementById('lightTypeBadge')?.textContent, null);
    console.log(`   初始光源类型: ${lightTypeBadge || '❌ 未找到'}`);
    
    const tubeBtn = await page.$('#tubeLightBtn');
    if (tubeBtn) {
      await tubeBtn.click();
      await page.waitForTimeout(600);
      
      const newType = await safeEval(page, () => document.getElementById('lightTypeBadge')?.textContent, null);
      console.log(`   切换后光源类型: ${newType}`);
      
      if (newType !== 'TubeLight') {
        logIssue('光源编辑', '光源类型切换后标签未更新', `期望: TubeLight, 实际: ${newType}`);
      }
      
      await takeScreenshot(page, 'test09_tube_light');
      
      // 切换回面光源
      const areaBtn = await page.$('#areaLightBtn');
      if (areaBtn) await areaBtn.click();
      await page.waitForTimeout(500);
    } else {
      logIssue('光源编辑', '管光源按钮不存在', '#tubeLightBtn 元素未找到');
    }
    
    // ===== 测试 4: 间接照明（光线反弹） =====
    console.log('\n📋 测试 4: 光线反弹模拟');
    console.log('-'.repeat(40));
    
    const bounceVal = await safeEval(page, () => document.getElementById('bounceCountValue')?.textContent, null);
    console.log(`   初始反弹次数: ${bounceVal || '❌ 未找到'}`);
    
    // 0 次反弹
    await page.evaluate(() => {
      const el = document.getElementById('bounceCount');
      if (el) { el.value = 0; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(800);
    
    const bounce0 = await safeEval(page, () => document.getElementById('bounceCountValue')?.textContent, null);
    const indirect0 = await safeEval(page, () => document.getElementById('indirectContribution')?.textContent, null);
    console.log(`   0次反弹 - 显示: ${bounce0}, 间接贡献: ${indirect0}`);
    await takeScreenshot(page, 'test10_bounce_0');
    
    // 4 次反弹
    await page.evaluate(() => {
      const el = document.getElementById('bounceCount');
      if (el) { el.value = 4; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(800);
    
    const bounce4 = await safeEval(page, () => document.getElementById('bounceCountValue')?.textContent, null);
    const indirect4 = await safeEval(page, () => document.getElementById('indirectContribution')?.textContent, null);
    console.log(`   4次反弹 - 显示: ${bounce4}, 间接贡献: ${indirect4}`);
    await takeScreenshot(page, 'test11_bounce_4');
    
    // 测试墙面反射率
    await page.evaluate(() => {
      const el = document.getElementById('wallAlbedo');
      if (el) { el.value = 0.95; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(600);
    await takeScreenshot(page, 'test12_high_wall_albedo');
    
    // 恢复默认
    await page.evaluate(() => {
      const bc = document.getElementById('bounceCount');
      const wa = document.getElementById('wallAlbedo');
      const ca = document.getElementById('ceilingAlbedo');
      if (bc) { bc.value = 2; bc.dispatchEvent(new Event('input', { bubbles: true })); }
      if (wa) { wa.value = 0.7; wa.dispatchEvent(new Event('input', { bubbles: true })); }
      if (ca) { ca.value = 0.85; ca.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(500);
    
    // ===== 测试 5: 洗墙效果 =====
    console.log('\n📋 测试 5: 洗墙效果渲染');
    console.log('-'.repeat(40));
    
    // 最大洗墙强度
    await page.evaluate(() => {
      const el = document.getElementById('wallWashIntensity');
      if (el) { el.value = 2; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(800);
    console.log(`   洗墙强度: 最大 (2.0)`);
    await takeScreenshot(page, 'test13_max_wallwash');
    
    // 0 洗墙强度
    await page.evaluate(() => {
      const el = document.getElementById('wallWashIntensity');
      if (el) { el.value = 0; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(800);
    console.log(`   洗墙强度: 关闭 (0)`);
    await takeScreenshot(page, 'test14_zero_wallwash');
    
    // 测试光束角度
    await page.evaluate(() => {
      const el = document.getElementById('beamAngle');
      if (el) { el.value = 90; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(600);
    await takeScreenshot(page, 'test15_wide_beam');
    
    // 恢复默认
    await page.evaluate(() => {
      const wi = document.getElementById('wallWashIntensity');
      const ba = document.getElementById('beamAngle');
      const hs = document.getElementById('haloSpread');
      if (wi) { wi.value = 1; wi.dispatchEvent(new Event('input', { bubbles: true })); }
      if (ba) { ba.value = 45; ba.dispatchEvent(new Event('input', { bubbles: true })); }
      if (hs) { hs.value = 0.5; hs.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(500);
    
    // ===== 测试 6: 眩光分析 =====
    console.log('\n📋 测试 6: 眩光分析');
    console.log('-'.repeat(40));
    
    const ugrVal = await safeEval(page, () => document.getElementById('ugrValue')?.textContent, null);
    console.log(`   初始 UGR 值: ${ugrVal || '❌ 未找到'}`);
    
    const glareWarningHidden = await safeEval(page, () => {
      const el = document.getElementById('glareWarning');
      return el ? el.classList.contains('hidden') : null;
    }, null);
    console.log(`   眩光警告: ${glareWarningHidden === null ? '❌ 未找到' : (glareWarningHidden ? '隐藏 (正常)' : '⚠️  显示中')}`);
    
    // 提高亮度测试眩光
    await page.evaluate(() => {
      const el = document.getElementById('intensity');
      if (el) { el.value = 2000; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(1000);
    
    const ugrHigh = await safeEval(page, () => document.getElementById('ugrValue')?.textContent, null);
    const glareHiddenHigh = await safeEval(page, () => {
      const el = document.getElementById('glareWarning');
      return el ? el.classList.contains('hidden') : null;
    }, null);
    
    console.log(`   高亮度 UGR: ${ugrHigh}`);
    console.log(`   高亮度眩光警告: ${glareHiddenHigh ? '隐藏' : '显示'}`);
    await takeScreenshot(page, 'test16_high_glare');
    
    // 恢复亮度
    await page.evaluate(() => {
      const el = document.getElementById('intensity');
      if (el) { el.value = 500; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(500);
    
    // ===== 测试 7: 视图控制 =====
    console.log('\n📋 测试 7: 视图控制');
    console.log('-'.repeat(40));
    
    const frontBtn = await page.$('#viewFrontBtn');
    const sideBtn = await page.$('#viewSideBtn');
    const isoBtn = await page.$('#viewIsoBtn');
    
    if (frontBtn) {
      await frontBtn.click();
      await page.waitForTimeout(600);
      await takeScreenshot(page, 'test17_view_front');
      console.log('   正视图: ✅');
    } else {
      logIssue('视图控制', '正视图按钮不存在', '#viewFrontBtn 未找到');
    }
    
    if (sideBtn) {
      await sideBtn.click();
      await page.waitForTimeout(600);
      await takeScreenshot(page, 'test18_view_side');
      console.log('   侧视图: ✅');
    } else {
      logIssue('视图控制', '侧视图按钮不存在', '#viewSideBtn 未找到');
    }
    
    if (isoBtn) {
      await isoBtn.click();
      await page.waitForTimeout(600);
      await takeScreenshot(page, 'test19_view_iso');
      console.log('   轴测图: ✅');
    } else {
      logIssue('视图控制', '轴测图按钮不存在', '#viewIsoBtn 未找到');
    }
    
    // ===== 测试 8: 核心验证 - 墙面亮度渐变 =====
    console.log('\n📋 测试 8: 核心验证 - 墙面亮度渐变');
    console.log('-'.repeat(40));
    
    // 切换到正视图
    if (frontBtn) await frontBtn.click();
    await page.waitForTimeout(600);
    
    // 设置中等亮度
    await page.evaluate(() => {
      const intensity = document.getElementById('intensity');
      if (intensity) { intensity.value = 800; intensity.dispatchEvent(new Event('input', { bubbles: true })); }
      const wallWash = document.getElementById('wallWashIntensity');
      if (wallWash) { wallWash.value = 1.5; wallWash.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(1000);
    
    await takeScreenshot(page, 'test20_validation_wall_gradient');
    console.log('   已保存墙面渐变验证截图');
    
    // 检查统计数据
    const indirectContrib = await safeEval(page, () => document.getElementById('indirectContribution')?.textContent, null);
    const wallBrightness = await safeEval(page, () => document.getElementById('wallBrightness')?.textContent, null);
    
    console.log(`   间接光照贡献: ${indirectContrib || '❌'}`);
    console.log(`   墙面平均亮度: ${wallBrightness || '❌'}`);
    
    // 恢复默认
    await page.evaluate(() => {
      const intensity = document.getElementById('intensity');
      if (intensity) { intensity.value = 500; intensity.dispatchEvent(new Event('input', { bubbles: true })); }
      const wallWash = document.getElementById('wallWashIntensity');
      if (wallWash) { wallWash.value = 1; wallWash.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(500);
    
    // ===== 最终检查 =====
    console.log('\n📋 最终状态检查');
    console.log('-'.repeat(40));
    
    await takeScreenshot(page, 'test99_final_state');
    
    // 检查控制台错误
    console.log(`\n   控制台错误/警告数: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('   错误列表:');
      consoleErrors.forEach((err, i) => {
        console.log(`   ${i + 1}. [${err.type}] ${err.text.substring(0, 150)}`);
      });
    }
    
  } catch (e) {
    console.error('\n❌ 测试过程中发生严重错误:', e.message);
    console.error(e.stack);
    logIssue('测试流程', '测试执行出错', e.message);
    await takeScreenshot(page, 'test_error');
  }
  
  await browser.close();
  
  // ===== 测试总结 =====
  console.log('\n' + '='.repeat(60));
  console.log('  测试总结');
  console.log('='.repeat(60));
  console.log(`  发现功能问题: ${issues.length} 个`);
  console.log(`  控制台错误/警告: ${consoleErrors.length} 个`);
  
  if (issues.length > 0) {
    console.log('\n  功能问题列表:');
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. [${issue.category}] ${issue.description}`);
      if (issue.evidence) console.log(`     证据: ${issue.evidence}`);
    });
  }
  
  // 保存结果
  const result = {
    testTime: new Date().toISOString(),
    issues,
    consoleErrors,
    totalIssues: issues.length + consoleErrors.length
  };
  
  fs.writeFileSync(path.join(imgDir, 'test_result.json'), JSON.stringify(result, null, 2));
  console.log(`\n  详细结果已保存到: img/test_result.json`);
  
  return result;
}

runTests().catch(console.error);
