import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = __dirname;
const imgDir = path.join(projectDir, 'img', 'round2');
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

const logFile = path.join(imgDir, 'test_log.txt');
let logContent = '';

function log(msg) {
  console.log(msg);
  logContent += msg + '\n';
  fs.writeFileSync(logFile, logContent);
}

let issues = [];
let consoleErrors = [];

function logIssue(category, description, evidence = '') {
  issues.push({ category, description, evidence, time: new Date().toISOString() });
  log(`\n❌ [${category}] ${description}`);
  if (evidence) log(`   证据: ${evidence}`);
}

async function takeScreenshot(page, name) {
  try {
    const screenshotPath = path.join(imgDir, `${name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false, timeout: 10000 });
    log(`   📸 ${name}.png`);
    return screenshotPath;
  } catch (e) {
    log(`   ⚠️  截图失败: ${e.message}`);
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

// 启动 vite 服务器
function startVite() {
  return new Promise((resolve, reject) => {
    log('启动 Vite 开发服务器...');
    
    const vite = spawn('npx', ['vite', '--port', '3009'], {
      cwd: projectDir
    });
    
    let serverReady = false;
    let output = '';
    
    vite.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      log('[Vite] ' + text.trim());
      
      if (text.includes('Local:') && !serverReady) {
        serverReady = true;
        setTimeout(() => resolve({ port: 3009, process: vite }), 1500);
      }
    });
    
    vite.stderr.on('data', (data) => {
      log('[Vite Error] ' + data.toString().trim());
    });
    
    vite.on('error', (err) => {
      reject(err);
    });
    
    vite.on('exit', (code) => {
      log(`Vite exited with code ${code}`);
      if (!serverReady) {
        reject(new Error(`Vite exited before ready. Output: ${output}`));
      }
    });
    
    setTimeout(() => {
      if (!serverReady) {
        reject(new Error('Vite startup timeout after 20s'));
      }
    }, 20000);
  });
}

async function runTests(port) {
  log('\n' + '='.repeat(60));
  log('  吊顶灯光效果预览器 - 第二轮修复验收测试');
  log('='.repeat(60));
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push({ type: msg.type(), text: msg.text() });
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push({ type: 'exception', text: err.message, stack: err.stack });
  });
  
  try {
    // 0. 页面加载
    log('\n📋 0. 页面加载与基础检查');
    log('-'.repeat(40));
    
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    
    const title = await page.title();
    log(`   页面标题: ${title}`);
    
    const hasCanvas = await safeEval(page, () => document.querySelector('canvas') !== null, false);
    const hasControlPanel = await safeEval(page, () => document.querySelector('.control-panel') !== null, false);
    const hasStatsSection = await safeEval(page, () => document.querySelector('.stats-section') !== null, false);
    
    log(`   Canvas: ${hasCanvas ? '✅' : '❌'}`);
    log(`   控制面板: ${hasControlPanel ? '✅' : '❌'}`);
    log(`   统计区域: ${hasStatsSection ? '✅' : '❌'}`);
    
    if (!hasCanvas) logIssue('页面结构', 'Canvas 元素不存在', 'Three.js 渲染画布未找到');
    if (!hasControlPanel) logIssue('页面结构', '控制面板不存在', '.control-panel 元素未找到');
    
    await takeScreenshot(page, '01_initial_page_load');
    
    // 3. 初始视角
    log('\n📋 3. 初始视角和场景呈现验证');
    log('-'.repeat(40));
    log('   初始视角截图已保存 (01_initial_page_load.png)');
    
    // 4. UI统计面板布局
    log('\n📋 4. UI统计面板布局验证');
    log('-'.repeat(40));
    
    const statsInPanel = await safeEval(page, () => {
      const statsSection = document.querySelector('.stats-section');
      const controlPanel = document.querySelector('.control-panel');
      if (!statsSection || !controlPanel) return false;
      return controlPanel.contains(statsSection);
    }, false);
    
    log(`   统计面板在控制面板内: ${statsInPanel ? '✅' : '❌'}`);
    if (!statsInPanel) logIssue('UI布局', '统计面板未整合到控制面板内部', '.stats-section 不在 .control-panel 内');
    
    const hasDivider = await safeEval(page, () => document.querySelector('.stats-divider') !== null, false);
    log(`   分隔线存在: ${hasDivider ? '✅' : '❌'}`);
    
    const statsItemsCount = await safeEval(page, () => document.querySelectorAll('.stats-item').length, 0);
    log(`   统计项数量: ${statsItemsCount}`);
    
    const hasOldStatsPanel = await safeEval(page, () => document.querySelector('.stats-panel') !== null, false);
    log(`   旧统计面板已移除: ${!hasOldStatsPanel ? '✅' : '❌'}`);
    if (hasOldStatsPanel) logIssue('UI布局', '旧的 stats-panel 没有完全移除', '可能与新统计区域产生冲突');
    
    await takeScreenshot(page, '07_ui_stats_panel_layout');
    
    // 2. 光强与亮度平衡
    log('\n📋 2. 整体光强与亮度平衡验证');
    log('-'.repeat(40));
    
    const wallBrightness = await safeEval(page, () => {
      const el = document.getElementById('wallBrightness');
      return el ? el.textContent : null;
    }, null);
    
    const indirectContrib = await safeEval(page, () => {
      const el = document.getElementById('indirectContribution');
      return el ? el.textContent : null;
    }, null);
    
    log(`   墙面平均亮度: ${wallBrightness || '❌ 未找到'}`);
    log(`   间接光照贡献: ${indirectContrib || '❌ 未找到'}`);
    
    if (wallBrightness) {
      const brightnessNum = parseInt(wallBrightness);
      if (brightnessNum < 100 || brightnessNum > 200) {
        logIssue('光强校准', '墙面平均亮度不在 100-200 lux 范围内', `当前值: ${wallBrightness}, 期望范围: 100-200 lux`);
      } else {
        log('   ✅ 墙面亮度在 100-200 lux 范围内');
      }
    } else {
      logIssue('光强校准', '墙面亮度元素未找到', '#wallBrightness 不存在');
    }
    
    if (indirectContrib) {
      const contribNum = parseInt(indirectContrib);
      if (contribNum < 30 || contribNum > 50) {
        logIssue('光强校准', '间接光照贡献比例不在 30-50% 范围内', `当前值: ${indirectContrib}, 期望范围: 30-50%`);
      } else {
        log('   ✅ 间接光照贡献在 30-50% 范围内');
      }
    } else {
      logIssue('光强校准', '间接光照贡献元素未找到', '#indirectContribution 不存在');
    }
    
    // 最大亮度
    await page.evaluate(() => {
      const el = document.getElementById('intensity');
      if (el) { el.value = 2000; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(1000);
    
    const maxBrightness = await safeEval(page, () => {
      const el = document.getElementById('wallBrightness');
      return el ? el.textContent : null;
    }, null);
    log(`   最大亮度 (2000 cd/m²): ${maxBrightness}`);
    await takeScreenshot(page, '04_max_intensity');
    
    // 最低亮度
    await page.evaluate(() => {
      const el = document.getElementById('intensity');
      if (el) { el.value = 50; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(1000);
    
    const minBrightness = await safeEval(page, () => {
      const el = document.getElementById('wallBrightness');
      return el ? el.textContent : null;
    }, null);
    log(`   最低亮度 (50 cd/m²): ${minBrightness}`);
    await takeScreenshot(page, '05_min_intensity');
    
    // 恢复默认
    await page.evaluate(() => {
      const el = document.getElementById('intensity');
      if (el) { el.value = 500; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(800);
    
    // 1. 光源出射角度
    log('\n📋 1. 光源出射角度修复验证');
    log('-'.repeat(40));
    
    const frontBtn = await page.$('#viewFrontBtn');
    if (frontBtn) {
      await frontBtn.click();
      await page.waitForTimeout(800);
      await takeScreenshot(page, '02_view_front_wall_wash');
      log('   正视图: 已截取，检查墙面洗墙效果');
    }
    
    const sideBtn = await page.$('#viewSideBtn');
    if (sideBtn) {
      await sideBtn.click();
      await page.waitForTimeout(800);
      await takeScreenshot(page, '03_view_side_wall_wash');
      log('   侧视图: 已截取，检查侧面墙面洗墙效果');
    }
    
    const isoBtn = await page.$('#viewIsoBtn');
    if (isoBtn) {
      await isoBtn.click();
      await page.waitForTimeout(800);
    }
    
    // 5. 核心验证：墙面亮度渐变
    log('\n📋 5. 核心验证：墙面亮度渐变效果');
    log('-'.repeat(40));
    
    if (frontBtn) {
      await frontBtn.click();
      await page.waitForTimeout(800);
    }
    
    await page.evaluate(() => {
      const intensity = document.getElementById('intensity');
      if (intensity) { intensity.value = 800; intensity.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(1000);
    
    await takeScreenshot(page, '08_validation_wall_gradient');
    log('   正视图墙面渐变验证截图已保存');
    
    // 6. 眩光分析
    log('\n📋 6. 眩光分析功能检查');
    log('-'.repeat(40));
    
    const ugrValue = await safeEval(page, () => {
      const el = document.getElementById('ugrValue');
      return el ? el.textContent : null;
    }, null);
    log(`   UGR 值: ${ugrValue || '❌ 未找到'}`);
    
    const glareWarningHidden = await safeEval(page, () => {
      const el = document.getElementById('glareWarning');
      return el ? el.classList.contains('hidden') : null;
    }, null);
    log(`   眩光警告: ${glareWarningHidden === null ? '❌ 未找到' : (glareWarningHidden ? '隐藏' : '显示中')}`);
    
    // 高亮度测试
    await page.evaluate(() => {
      const intensity = document.getElementById('intensity');
      if (intensity) { intensity.value = 2000; intensity.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(1000);
    
    const ugrHigh = await safeEval(page, () => {
      const el = document.getElementById('ugrValue');
      return el ? el.textContent : null;
    }, null);
    const glareHighHidden = await safeEval(page, () => {
      const el = document.getElementById('glareWarning');
      return el ? el.classList.contains('hidden') : null;
    }, null);
    
    log(`   高亮度 UGR: ${ugrHigh}`);
    log(`   高亮度眩光警告: ${glareHighHidden ? '隐藏' : '显示'}`);
    
    await takeScreenshot(page, '09_glare_high_intensity');
    
    // 恢复默认
    await page.evaluate(() => {
      const intensity = document.getElementById('intensity');
      if (intensity) { intensity.value = 500; intensity.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(500);
    
    // 7. 色温测试
    log('\n📋 7. 色温调节测试');
    log('-'.repeat(40));
    
    await page.evaluate(() => {
      const el = document.getElementById('colorTemp');
      if (el) { el.value = 2000; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(800);
    await takeScreenshot(page, '10_warm_color_2000K');
    log('   暖光 (2000K) 截图已保存');
    
    await page.evaluate(() => {
      const el = document.getElementById('colorTemp');
      if (el) { el.value = 8000; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(800);
    await takeScreenshot(page, '11_cool_color_8000K');
    log('   冷光 (8000K) 截图已保存');
    
    // 恢复默认
    await page.evaluate(() => {
      const el = document.getElementById('colorTemp');
      if (el) { el.value = 4000; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(500);
    
    // 8. 吊顶结构测试
    log('\n📋 8. 吊顶结构参数测试');
    log('-'.repeat(40));
    
    await page.evaluate(() => {
      const el = document.getElementById('ceilingDrop');
      if (el) { el.value = 0.3; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(800);
    await takeScreenshot(page, '12_high_ceiling_drop');
    log('   吊顶下垂 0.3m 截图已保存');
    
    // 恢复
    await page.evaluate(() => {
      const el = document.getElementById('ceilingDrop');
      if (el) { el.value = 0.15; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(500);
    
    // 最终状态
    log('\n📋 最终状态');
    log('-'.repeat(40));
    
    if (isoBtn) {
      await isoBtn.click();
      await page.waitForTimeout(800);
    }
    
    await takeScreenshot(page, '99_final_state');
    
    log(`\n   控制台错误/警告数: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      log('   错误列表:');
      consoleErrors.slice(0, 10).forEach((err, i) => {
        log(`   ${i + 1}. [${err.type}] ${err.text.substring(0, 150)}`);
      });
    }
    
  } catch (e) {
    log('\n❌ 测试过程中发生严重错误: ' + e.message);
    log(e.stack);
    logIssue('测试流程', '测试执行出错', e.message);
    await takeScreenshot(page, 'test_error');
  }
  
  await browser.close();
  
  // 测试总结
  log('\n' + '='.repeat(60));
  log('  测试总结');
  log('='.repeat(60));
  log(`  发现功能问题: ${issues.length} 个`);
  log(`  控制台错误/警告: ${consoleErrors.length} 个`);
  
  if (issues.length > 0) {
    log('\n  功能问题列表:');
    issues.forEach((issue, i) => {
      log(`  ${i + 1}. [${issue.category}] ${issue.description}`);
      if (issue.evidence) log(`     证据: ${issue.evidence}`);
    });
  }
  
  // 保存结果
  const result = {
    testTime: new Date().toISOString(),
    testRound: 2,
    issues,
    consoleErrors,
    totalIssues: issues.length + consoleErrors.length
  };
  
  fs.writeFileSync(path.join(imgDir, 'test_result.json'), JSON.stringify(result, null, 2));
  log(`\n  详细结果已保存到: img/round2/test_result.json`);
  log(`  测试日志已保存到: img/round2/test_log.txt`);
  
  return result;
}

async function main() {
  let viteProc = null;
  
  try {
    const { port, process } = await startVite();
    viteProc = process;
    log(`✅ Vite 服务器已启动，端口: ${port}`);
    
    await runTests(port);
    
  } catch (e) {
    log('❌ 测试失败: ' + e.message);
    log(e.stack);
    process.exitCode = 1;
  } finally {
    if (viteProc) {
      log('\n正在关闭 Vite 服务器...');
      viteProc.kill();
    }
  }
}

main();
