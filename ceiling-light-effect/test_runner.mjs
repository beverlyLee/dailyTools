import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const imgDir = path.join(process.cwd(), 'img');
if (!fs.existsSync(imgDir)) {
  fs.mkdirSync(imgDir, { recursive: true });
}

let issues = [];
let consoleErrors = [];

function logIssue(category, description, evidence) {
  const issue = { category, description, evidence, timestamp: new Date().toISOString() };
  issues.push(issue);
  console.log(`[ISSUE - ${category}] ${description}`);
  if (evidence) console.log(`  Evidence: ${evidence}`);
}

async function takeScreenshot(page, name) {
  const screenshotPath = path.join(imgDir, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`  Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

async function runTest() {
  console.log('=== 吊顶灯光效果预览器 - 测试开始 ===\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  
  // 收集控制台错误
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), type: msg.type() });
      console.log(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });
  
  page.on('pageerror', err => {
    consoleErrors.push({ text: err.message, type: 'exception', stack: err.stack });
    console.log(`[PAGE ERROR] ${err.message}`);
  });
  
  // 1. 页面加载测试
  console.log('1. 页面加载测试...');
  try {
    await page.goto('http://localhost:3001/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '01_initial_load');
    
    const title = await page.title();
    console.log(`  页面标题: ${title}`);
    
    // 检查控制面板是否存在
    const controlPanel = await page.$('.control-panel');
    if (!controlPanel) {
      logIssue('页面结构', '控制面板未找到', '选择器 .control-panel 无匹配元素');
    } else {
      console.log('  控制面板: 存在');
    }
    
    // 检查 canvas 是否存在
    const canvas = await page.$('canvas');
    if (!canvas) {
      logIssue('页面结构', 'Canvas 元素未找到', 'Three.js 渲染画布不存在');
    } else {
      console.log('  Canvas 元素: 存在');
    }
    
    // 检查 stats panel
    const statsPanel = await page.$('.stats-panel');
    if (!statsPanel) {
      logIssue('页面结构', '统计面板未找到', '.stats-panel 元素不存在');
    } else {
      console.log('  统计面板: 存在');
    }
    
  } catch (e) {
    logIssue('页面加载', '页面加载失败', e.message);
    await takeScreenshot(page, '01_load_error');
  }
  
  // 2. 吊顶结构生成器测试
  console.log('\n2. 吊顶结构生成器测试...');
  try {
    // 测试房间宽度滑块
    const roomWidthSlider = await page.$('#roomWidth');
    if (roomWidthSlider) {
      const initialValue = await page.$eval('#roomWidthValue', el => el.textContent);
      console.log(`  初始房间宽度: ${initialValue}`);
      
      // 拖动滑块
      await roomWidthSlider.evaluate(el => { el.value = 12; el.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(500);
      
      const newValue = await page.$eval('#roomWidthValue', el => el.textContent);
      console.log(`  修改后房间宽度: ${newValue}`);
      
      if (newValue === initialValue) {
        logIssue('吊顶结构', '房间宽度滑块修改后值未更新', `初始值: ${initialValue}, 修改后: ${newValue}`);
      }
      
      await takeScreenshot(page, '02_room_width_changed');
      
      // 恢复默认值
      await roomWidthSlider.evaluate(el => { el.value = 8; el.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(500);
    } else {
      logIssue('吊顶结构', '房间宽度滑块未找到', '#roomWidth 元素不存在');
    }
    
    // 测试吊顶下垂高度
    const ceilingDropSlider = await page.$('#ceilingDrop');
    if (ceilingDropSlider) {
      await ceilingDropSlider.evaluate(el => { el.value = 0.3; el.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(500);
      const newValue = await page.$eval('#ceilingDropValue', el => el.textContent);
      console.log(`  吊顶下垂高度: ${newValue}`);
      await takeScreenshot(page, '03_ceiling_drop_changed');
      
      // 恢复默认值
      await ceilingDropSlider.evaluate(el => { el.value = 0.15; el.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(500);
    } else {
      logIssue('吊顶结构', '吊顶下垂高度滑块未找到', '#ceilingDrop 元素不存在');
    }
    
  } catch (e) {
    logIssue('吊顶结构测试', '测试过程出错', e.message);
  }
  
  // 3. 光源编辑器测试
  console.log('\n3. 光源编辑器测试...');
  try {
    // 测试亮度滑块
    const intensitySlider = await page.$('#intensity');
    if (intensitySlider) {
      const initialValue = await page.$eval('#intensityValue', el => el.textContent);
      console.log(`  初始亮度: ${initialValue}`);
      
      // 调到最大亮度
      await intensitySlider.evaluate(el => { el.value = 2000; el.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(1000);
      
      const maxValue = await page.$eval('#intensityValue', el => el.textContent);
      console.log(`  最大亮度: ${maxValue}`);
      await takeScreenshot(page, '04_max_intensity');
      
      // 调到最低亮度
      await intensitySlider.evaluate(el => { el.value = 50; el.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(1000);
      
      const minValue = await page.$eval('#intensityValue', el => el.textContent);
      console.log(`  最低亮度: ${minValue}`);
      await takeScreenshot(page, '05_min_intensity');
      
      // 恢复默认值
      await intensitySlider.evaluate(el => { el.value = 500; el.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(500);
    } else {
      logIssue('光源编辑', '亮度滑块未找到', '#intensity 元素不存在');
    }
    
    // 测试色温滑块
    const colorTempSlider = await page.$('#colorTemp');
    if (colorTempSlider) {
      // 暖光
      await colorTempSlider.evaluate(el => { el.value = 2000; el.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(500);
      const warmValue = await page.$eval('#colorTempValue', el => el.textContent);
      console.log(`  暖光色温: ${warmValue}`);
      await takeScreenshot(page, '06_warm_color_temp');
      
      // 冷光
      await colorTempSlider.evaluate(el => { el.value = 8000; el.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(500);
      const coolValue = await page.$eval('#colorTempValue', el => el.textContent);
      console.log(`  冷光色温: ${coolValue}`);
      await takeScreenshot(page, '07_cool_color_temp');
      
      // 恢复默认值
      await colorTempSlider.evaluate(el => { el.value = 4000; el.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(500);
    } else {
      logIssue('光源编辑', '色温滑块未找到', '#colorTemp 元素不存在');
    }
    
    // 测试光源类型切换
    const tubeLightBtn = await page.$('#tubeLightBtn');
    if (tubeLightBtn) {
      await tubeLightBtn.click();
      await page.waitForTimeout(500);
      
      const badgeText = await page.$eval('#lightTypeBadge', el => el.textContent);
      console.log(`  切换后光源类型: ${badgeText}`);
      
      if (badgeText !== 'TubeLight') {
        logIssue('光源编辑', '光源类型切换后标签未更新', `期望: TubeLight, 实际: ${badgeText}`);
      }
      
      await takeScreenshot(page, '08_tube_light');
      
      // 切换回面光源
      const areaLightBtn = await page.$('#areaLightBtn');
      await areaLightBtn.click();
      await page.waitForTimeout(500);
    } else {
      logIssue('光源编辑', '管光源按钮未找到', '#tubeLightBtn 元素不存在');
    }
    
  } catch (e) {
    logIssue('光源编辑器测试', '测试过程出错', e.message);
  }
  
  // 4. 间接照明测试
  console.log('\n4. 光线反弹模拟测试...');
  try {
    const bounceCountSlider = await page.$('#bounceCount');
    if (bounceCountSlider) {
      // 0 次反弹
      await bounceCountSlider.evaluate(el => { el.value = 0; el.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(500);
      const bounce0 = await page.$eval('#bounceCountValue', el => el.textContent);
      console.log(`  0次反弹: ${bounce0}`);
      await takeScreenshot(page, '09_bounce_0');
      
      // 4 次反弹
      await bounceCountSlider.evaluate(el => { el.value = 4; el.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(500);
      const bounce4 = await page.$eval('#bounceCountValue', el => el.textContent);
      console.log(`  4次反弹: ${bounce4}`);
      await takeScreenshot(page, '10_bounce_4');
      
      // 恢复默认值
      await bounceCountSlider.evaluate(el => { el.value = 2; el.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(500);
    } else {
      logIssue('间接照明', '光线反弹次数滑块未找到', '#bounceCount 元素不存在');
    }
    
    // 检查间接光照贡献值
    const indirectContrib = await page.$('#indirectContribution');
    if (indirectContrib) {
      const value = await page.$eval('#indirectContribution', el => el.textContent);
      console.log(`  间接光照贡献: ${value}`);
    }
    
    // 检查墙面平均亮度
    const wallBrightness = await page.$('#wallBrightness');
    if (wallBrightness) {
      const value = await page.$eval('#wallBrightness', el => el.textContent);
      console.log(`  墙面平均亮度: ${value}`);
    }
    
  } catch (e) {
    logIssue('间接照明测试', '测试过程出错', e.message);
  }
  
  // 5. 洗墙效果测试
  console.log('\n5. 洗墙效果渲染测试...');
  try {
    const wallWashIntensitySlider = await page.$('#wallWashIntensity');
    if (wallWashIntensitySlider) {
      // 最大洗墙强度
      await wallWashIntensitySlider.evaluate(el => { el.value = 2; el.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(500);
      await takeScreenshot(page, '11_max_wall_wash');
      
      // 0 洗墙强度
      await wallWashIntensitySlider.evaluate(el => { el.value = 0; el.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(500);
      await takeScreenshot(page, '12_min_wall_wash');
      
      // 恢复默认值
      await wallWashIntensitySlider.evaluate(el => { el.value = 1; el.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(500);
    } else {
      logIssue('洗墙效果', '洗墙强度滑块未找到', '#wallWashIntensity 元素不存在');
    }
    
  } catch (e) {
    logIssue('洗墙效果测试', '测试过程出错', e.message);
  }
  
  // 6. 眩光分析测试
  console.log('\n6. 眩光分析测试...');
  try {
    const ugrValue = await page.$('#ugrValue');
    if (ugrValue) {
      const value = await page.$eval('#ugrValue', el => el.textContent);
      console.log(`  初始 UGR 值: ${value}`);
    }
    
    // 检查眩光警告元素
    const glareWarning = await page.$('#glareWarning');
    if (glareWarning) {
      const isHidden = await page.$eval('#glareWarning', el => el.classList.contains('hidden'));
      console.log(`  眩光警告显示状态: ${isHidden ? '隐藏' : '显示'}`);
      
      // 提高亮度看看是否触发眩光警告
      const intensitySlider = await page.$('#intensity');
      if (intensitySlider) {
        await intensitySlider.evaluate(el => { el.value = 2000; el.dispatchEvent(new Event('input')); });
        await page.waitForTimeout(1000);
        
        const ugrAfter = await page.$eval('#ugrValue', el => el.textContent);
        console.log(`  高亮度下 UGR 值: ${ugrAfter}`);
        
        const isHiddenAfter = await page.$eval('#glareWarning', el => el.classList.contains('hidden'));
        console.log(`  高亮度下眩光警告: ${isHiddenAfter ? '隐藏' : '显示'}`);
        
        await takeScreenshot(page, '13_glare_high_intensity');
        
        // 恢复默认值
        await intensitySlider.evaluate(el => { el.value = 500; el.dispatchEvent(new Event('input')); });
        await page.waitForTimeout(500);
      }
    } else {
      logIssue('眩光分析', '眩光警告元素未找到', '#glareWarning 元素不存在');
    }
    
  } catch (e) {
    logIssue('眩光分析测试', '测试过程出错', e.message);
  }
  
  // 7. 视图控制测试
  console.log('\n7. 视图控制测试...');
  try {
    const viewFrontBtn = await page.$('#viewFrontBtn');
    const viewSideBtn = await page.$('#viewSideBtn');
    const viewIsoBtn = await page.$('#viewIsoBtn');
    
    if (viewFrontBtn) {
      await viewFrontBtn.click();
      await page.waitForTimeout(500);
      await takeScreenshot(page, '14_view_front');
    }
    
    if (viewSideBtn) {
      await viewSideBtn.click();
      await page.waitForTimeout(500);
      await takeScreenshot(page, '15_view_side');
    }
    
    if (viewIsoBtn) {
      await viewIsoBtn.click();
      await page.waitForTimeout(500);
      await takeScreenshot(page, '16_view_iso');
    }
    
    console.log('  视图切换测试完成');
  } catch (e) {
    logIssue('视图控制测试', '测试过程出错', e.message);
  }
  
  // 8. 检查整体效果 - 验证方法
  console.log('\n8. 核心验证：调整亮度检查墙面渐变效果...');
  try {
    // 切换到正视图以便观察墙面
    const viewFrontBtn = await page.$('#viewFrontBtn');
    if (viewFrontBtn) await viewFrontBtn.click();
    await page.waitForTimeout(500);
    
    // 中等亮度
    const intensitySlider = await page.$('#intensity');
    if (intensitySlider) {
      await intensitySlider.evaluate(el => { el.value = 800; el.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(1000);
      await takeScreenshot(page, '17_validation_medium');
      
      // 检查是否有明显的暗区或光斑 - 这是一个视觉检查
      console.log('  已保存中等亮度下的墙面效果截图，用于验证渐变均匀性');
    }
    
  } catch (e) {
    logIssue('核心验证', '验证测试出错', e.message);
  }
  
  // 等待一段时间确保所有渲染完成
  await page.waitForTimeout(1000);
  
  // 最终截图
  await takeScreenshot(page, '99_final_state');
  
  // 输出总结
  console.log('\n=== 测试总结 ===');
  console.log(`发现问题数: ${issues.length}`);
  console.log(`控制台错误数: ${consoleErrors.length}`);
  
  if (issues.length > 0) {
    console.log('\n问题列表:');
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. [${issue.category}] ${issue.description}`);
      if (issue.evidence) console.log(`   证据: ${issue.evidence}`);
    });
  }
  
  if (consoleErrors.length > 0) {
    console.log('\n控制台错误:');
    consoleErrors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.text.substring(0, 200)}`);
    });
  }
  
  await browser.close();
  
  // 保存测试结果
  const report = {
    testTime: new Date().toISOString(),
    issues: issues,
    consoleErrors: consoleErrors,
    totalIssues: issues.length + consoleErrors.length
  };
  
  fs.writeFileSync(path.join(imgDir, 'test_result.json'), JSON.stringify(report, null, 2));
  
  console.log('\n测试完成！结果已保存到 img/test_result.json');
  
  return report;
}

runTest().catch(console.error);
