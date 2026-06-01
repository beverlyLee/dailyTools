import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const IMG_DIR = path.join(process.cwd(), 'img');
const URL = 'http://localhost:5178/';

let issues = [];
let screenshotCount = 0;
let consoleErrors = [];
let pageErrors = [];
let networkErrors = [];

function takeScreenshot(page, name, description) {
  screenshotCount++;
  const filename = `${screenshotCount.toString().padStart(2, '0')}-${name}.png`;
  const filepath = path.join(IMG_DIR, filename);
  page.screenshot({ path: filepath, fullPage: true, timeout: 10000 });
  issues.push({
    name,
    description,
    screenshot: filename
  });
  console.log(`📸 截图已保存: ${filename} - ${description}`);
  return filepath;
}

function addIssue(name, description, severity = 'medium', screenshot = null) {
  issues.push({ name, description, severity, screenshot });
  console.log(`❌ 问题: [${name}] ${description}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('🧪 开始测试榫卯椅拆装教学项目 - 第6轮...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      const error = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        time: new Date().toISOString()
      };
      if (msg.type() === 'error') {
        consoleErrors.push(error);
      }
      console.log(`⚠️  控制台${msg.type()}: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', err => {
    pageErrors.push({
      text: err.message,
      stack: err.stack,
      time: new Date().toISOString()
    });
    console.log(`⚠️  页面错误: ${err.message}`);
  });
  
  page.on('requestfailed', req => {
    const url = req.url();
    const error = req.failure()?.errorText || 'Unknown error';
    if (url.includes('.glb') || url.includes('.gltf') || url.includes('model') || url.includes('texture')) {
      networkErrors.push({
        url,
        error,
        time: new Date().toISOString()
      });
      console.log(`⚠️  资源加载失败: ${url} - ${error}`);
    }
  });
  
  console.log('📍 步骤1: 访问页面并检查加载状态');
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    const loadingOverlay = page.locator('.loading-overlay');
    const hasLoadingScreen = await loadingOverlay.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`显示加载界面: ${hasLoadingScreen ? '✅ 是' : '❌ 否'}`);
    
    if (hasLoadingScreen) {
      const loadingTitle = await page.locator('.loading-title').textContent({ timeout: 3000 }).catch(() => '');
      const loadingText = await page.locator('.loading-text').textContent({ timeout: 3000 }).catch(() => '');
      console.log(`加载标题: ${loadingTitle}`);
      console.log(`加载文本: ${loadingText}`);
      
      await sleep(2000);
      takeScreenshot(page, '01-loading-screen', '加载界面显示状态');
      await sleep(3000);
    }
    
    await sleep(2000);
    console.log('✅ 页面加载完成');
  } catch (e) {
    takeScreenshot(page, 'page-load-error', '页面加载失败: ' + e.message);
    addIssue('page-load-error', '页面加载失败: ' + e.message, 'high', 'page-load-error.png');
    console.error('❌ 页面加载失败:', e.message);
    await browser.close();
    return;
  }
  
  takeScreenshot(page, '02-initial-page', '页面初始加载完成状态');
  
  console.log('\n📍 步骤2: 检查页面标题和基本元素');
  try {
    const title = await page.title();
    console.log(`页面标题: ${title}`);
    
    if (title !== '榫卯椅 — 拆装教学') {
      takeScreenshot(page, 'wrong-title', `页面标题错误，期望"榫卯椅 — 拆装教学"，实际"${title}"`);
      addIssue('wrong-title', `页面标题错误，期望"榫卯椅 — 拆装教学"，实际"${title}"`, 'medium', 'wrong-title.png');
    }
    
    const headerTitle = await page.locator('.title').first().textContent({ timeout: 10000 });
    console.log(`页面头部: ${headerTitle}`);
    
    const statusText = await page.locator('.status').first().textContent({ timeout: 10000 });
    console.log(`状态文本: ${statusText}`);
    
    if (statusText?.includes('程序生成') || statusText?.includes('模型使用程序生成')) {
      takeScreenshot(page, 'glb-load-failed', '部分或全部GLB模型加载失败，使用了程序化生成的降级方案');
      addIssue('glb-load-failed', 'GLB模型加载失败，系统使用了程序化生成的降级方案，模型不包含真实榫卯结构细节', 'high', 'glb-load-failed.png');
    }
  } catch (e) {
    takeScreenshot(page, 'element-check-error', '元素检查失败: ' + e.message);
    addIssue('element-check-error', '元素检查失败: ' + e.message, 'medium', 'element-check-error.png');
    console.error('❌ 元素检查失败:', e.message);
  }
  
  console.log('\n📍 步骤3: 检查3D画布和HUD控制元素');
  try {
    const canvas = page.locator('canvas.stage').first();
    const canvasExists = await canvas.isVisible({ timeout: 10000 });
    console.log(`3D画布存在: ${canvasExists ? '✅ 是' : '❌ 否'}`);
    
    if (!canvasExists) {
      takeScreenshot(page, 'canvas-missing', '3D画布元素不存在');
      addIssue('canvas-missing', '3D画布元素不存在', 'high', 'canvas-missing.png');
    }
    
    const hudElements = {
      '重置按钮': page.locator('button:has-text("重置")').first(),
      '一键组装按钮': page.locator('button:has-text("一键组装")').first(),
      '显示/隐藏参考模型按钮': page.locator('button:has-text("参考模型")').first(),
      '进度条': page.locator('.progress').first(),
      '状态文本': page.locator('.status').first(),
      '操作提示': page.locator('.tips').first()
    };
    
    for (const [name, locator] of Object.entries(hudElements)) {
      try {
        const exists = await locator.isVisible({ timeout: 5000 });
        console.log(`${name}: ${exists ? '✅' : '❌'}`);
        if (!exists) {
          takeScreenshot(page, `missing-${name}`, `缺少${name}元素`);
          addIssue(`missing-${name}`, `缺少${name}元素`, 'medium', `missing-${name}.png`);
        }
      } catch (e) {
        takeScreenshot(page, `check-${name}-error`, `检查${name}失败: ${e.message}`);
      }
    }
  } catch (e) {
    takeScreenshot(page, 'canvas-check-error', '画布检查失败: ' + e.message);
    addIssue('canvas-check-error', '画布检查失败: ' + e.message, 'medium', 'canvas-check-error.png');
  }
  
  console.log('\n📍 步骤4: 测试「一键组装」按钮和庆祝效果');
  try {
    await page.click('button:has-text("一键组装")', { timeout: 10000 });
    await sleep(2000);
    
    const statusAfter = await page.locator('.status').first().textContent({ timeout: 5000 });
    console.log(`点击一键组装后状态: ${statusAfter}`);
    
    const progressText = await page.locator('.progress span').first().textContent({ timeout: 5000 });
    console.log(`进度: ${progressText}`);
    
    if (!progressText?.includes('9 / 9')) {
      takeScreenshot(page, 'assemble-all-fail', `一键组装后进度未达到9/9，实际为: ${progressText}`);
      addIssue('assemble-all-fail', `一键组装后进度未达到9/9，实际为: ${progressText}`, 'high', 'assemble-all-fail.png');
    }
    
    const hasCelebration = statusAfter?.includes('🎉') || statusAfter?.includes('全部榫卯部件组装完成');
    console.log(`庆祝效果文本: ${hasCelebration ? '✅ 是' : '❌ 否'}`);
    
    if (!hasCelebration) {
      takeScreenshot(page, 'missing-celebration', '一键组装完成后缺少庆祝效果，状态文本应为"🎉 全部榫卯部件组装完成！椅子完整呈现。"');
      addIssue('missing-celebration', '一键组装完成后缺少庆祝效果，状态文本应为"🎉 全部榫卯部件组装完成！椅子完整呈现。"，实际为: ' + statusAfter, 'medium', 'missing-celebration.png');
    }
    
    takeScreenshot(page, '03-after-assemble-all', '点击一键组装后的状态（含庆祝效果）');
  } catch (e) {
    takeScreenshot(page, 'assemble-all-error', '点击一键组装报错: ' + e.message);
    addIssue('assemble-all-error', '点击一键组装报错: ' + e.message, 'high', 'assemble-all-error.png');
  }
  
  console.log('\n📍 步骤5: 测试「重置（拆散开）」按钮');
  try {
    await page.click('button:has-text("重置")', { timeout: 10000 });
    await sleep(1500);
    
    const statusAfter = await page.locator('.status').first().textContent({ timeout: 5000 });
    console.log(`点击重置后状态: ${statusAfter}`);
    
    const progressText = await page.locator('.progress span').first().textContent({ timeout: 5000 });
    console.log(`进度: ${progressText}`);
    
    if (!progressText?.includes('0 / 9')) {
      takeScreenshot(page, 'reset-fail', `重置后进度未归零，实际为: ${progressText}`);
      addIssue('reset-fail', `重置后进度未归零，实际为: ${progressText}`, 'high', 'reset-fail.png');
    }
    
    takeScreenshot(page, '04-after-reset', '点击重置后的状态');
  } catch (e) {
    takeScreenshot(page, 'reset-error', '点击重置报错: ' + e.message);
    addIssue('reset-error', '点击重置报错: ' + e.message, 'high', 'reset-error.png');
  }
  
  console.log('\n📍 步骤6: 测试点击不跟随 - 验证拖拽跟随修复');
  try {
    const canvas = page.locator('canvas.stage').first();
    const canvasBox = await canvas.boundingBox();
    
    if (canvasBox) {
      const centerX = canvasBox.x + canvasBox.width / 2;
      const centerY = canvasBox.y + canvasBox.height / 2;
      
      console.log('测试纯点击（不拖动）是否会有部件跟随...');
      await page.mouse.move(centerX - 150, centerY - 50);
      await sleep(300);
      await page.mouse.down();
      await sleep(100);
      await page.mouse.up();
      await sleep(500);
      
      const statusAfterClick = await page.locator('.status').first().textContent({ timeout: 5000 }).catch(() => '');
      console.log(`纯点击后状态: ${statusAfterClick}`);
      
      if (statusAfterClick?.includes('已归位') || statusAfterClick?.includes('还未靠近')) {
        takeScreenshot(page, 'click-follow-bug', '纯点击但没有拖动时，部件被错误地触发了拖拽逻辑');
        addIssue('click-follow-bug', '纯点击（鼠标移动距离<3像素）但没有拖动时，部件被错误地触发了拖拽逻辑，状态文本发生了变化', 'medium', 'click-follow-bug.png');
      } else {
        console.log('✅ 纯点击不会触发部件跟随，拖拽跟随修复正常');
      }
      
      takeScreenshot(page, '05-click-only-test', '纯点击测试后的状态');
    }
  } catch (e) {
    takeScreenshot(page, 'click-test-error', '点击测试报错: ' + e.message);
    addIssue('click-test-error', '点击测试报错: ' + e.message, 'medium', 'click-test-error.png');
  }
  
  console.log('\n📍 步骤7: 测试鼠标拖拽 - 验证选中部件信息显示');
  try {
    const canvas = page.locator('canvas.stage').first();
    const canvasBox = await canvas.boundingBox();
    
    if (canvasBox) {
      const centerX = canvasBox.x + canvasBox.width / 2;
      const centerY = canvasBox.y + canvasBox.height / 2;
      
      console.log('测试左键拖拽部件并检查选中信息显示...');
      await page.mouse.move(centerX - 200, centerY + 100);
      await sleep(300);
      await page.mouse.down();
      await sleep(200);
      await page.mouse.move(centerX - 150, centerY + 50, { steps: 15 });
      await sleep(300);
      
      const selectedVisible = await page.locator('.selected').first().isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`选中部件信息显示: ${selectedVisible ? '✅ 是' : '❌ 否'}`);
      
      let selectedName = '';
      let selectedDesc = '';
      if (selectedVisible) {
        selectedName = await page.locator('.selected b').first().textContent({ timeout: 3000 }).catch(() => '');
        selectedDesc = await page.locator('.selected .desc').first().textContent({ timeout: 3000 }).catch(() => '');
        console.log(`选中部件: ${selectedName}`);
        console.log(`部件描述: ${selectedDesc}`);
      } else {
        takeScreenshot(page, 'selected-info-missing', '拖拽部件时选中信息面板未显示');
        addIssue('selected-info-missing', '拖拽部件时，`.selected`元素未显示，用户无法看到当前选中部件的名称和榫卯结构描述', 'medium', 'selected-info-missing.png');
      }
      
      await page.mouse.move(centerX - 80, centerY + 20, { steps: 10 });
      await sleep(500);
      await page.mouse.up();
      await sleep(1000);
      
      const statusAfter = await page.locator('.status').first().textContent({ timeout: 5000 }).catch(() => '');
      console.log(`拖拽释放后状态: ${statusAfter}`);
      
      takeScreenshot(page, '06-after-drag', '鼠标拖拽部件后的状态');
    }
  } catch (e) {
    takeScreenshot(page, 'mouse-interaction-error', '鼠标交互报错: ' + e.message);
    addIssue('mouse-interaction-error', '鼠标交互报错: ' + e.message, 'medium', 'mouse-interaction-error.png');
  }
  
  console.log('\n📍 步骤8: 测试右键旋转视角和滚轮缩放');
  try {
    const canvas = page.locator('canvas.stage').first();
    const canvasBox = await canvas.boundingBox();
    
    if (canvasBox) {
      const centerX = canvasBox.x + canvasBox.width / 2;
      const centerY = canvasBox.y + canvasBox.height / 2;
      
      console.log('测试右键旋转视角...');
      await page.mouse.move(centerX, centerY);
      await sleep(200);
      await page.mouse.click(centerX, centerY, { button: 'right', delay: 200 });
      await sleep(500);
      
      console.log('测试滚轮缩放...');
      await page.mouse.move(centerX, centerY);
      await sleep(300);
      await page.mouse.wheel(0, 300);
      await sleep(500);
      await page.mouse.wheel(0, -200);
      await sleep(500);
      
      takeScreenshot(page, '07-after-zoom-rotate', '视角旋转和缩放后的状态');
    }
  } catch (e) {
    takeScreenshot(page, 'view-control-error', '视角控制报错: ' + e.message);
    addIssue('view-control-error', '视角控制报错: ' + e.message, 'low', 'view-control-error.png');
  }
  
  console.log('\n📍 步骤9: 测试「显示参考模型」按钮');
  try {
    const toggleBtn = page.locator('button:has-text("参考模型")').first();
    await toggleBtn.click({ timeout: 10000 });
    await sleep(1000);
    
    const btnTextAfter = await toggleBtn.textContent({ timeout: 5000 });
    console.log(`点击后按钮文本: ${btnTextAfter}`);
    
    const isActive = await toggleBtn.evaluate(el => el.classList.contains('active')).catch(() => false);
    console.log(`按钮激活状态: ${isActive ? '✅ 是' : '❌ 否'}`);
    
    takeScreenshot(page, '08-reference-model', '显示参考模型后的状态');
    
    await toggleBtn.click({ timeout: 10000 });
    await sleep(500);
  } catch (e) {
    takeScreenshot(page, 'reference-model-error', '参考模型切换报错: ' + e.message);
    addIssue('reference-model-error', '显示/隐藏参考模型功能报错: ' + e.message, 'medium', 'reference-model-error.png');
  }
  
  console.log('\n📍 步骤10: 测试插槽标记和吸附反馈');
  try {
    const canvas = page.locator('canvas.stage').first();
    const canvasBox = await canvas.boundingBox();
    
    if (canvasBox) {
      const centerX = canvasBox.x + canvasBox.width / 2;
      const centerY = canvasBox.y + canvasBox.height / 2;
      
      await page.click('button:has-text("重置")', { timeout: 10000 });
      await sleep(1500);
      
      console.log('拖动部件靠近目标位置测试吸附反馈...');
      await page.mouse.move(centerX - 200, centerY + 100);
      await sleep(300);
      await page.mouse.down();
      await sleep(200);
      await page.mouse.move(centerX - 50, centerY, { steps: 30 });
      await sleep(500);
      
      const statusDuring = await page.locator('.status').first().textContent({ timeout: 5000 }).catch(() => '');
      console.log(`拖动中状态: ${statusDuring}`);
      
      await page.mouse.move(centerX, centerY - 50, { steps: 20 });
      await sleep(500);
      await page.mouse.up();
      await sleep(1000);
      
      const statusAfter = await page.locator('.status').first().textContent({ timeout: 5000 }).catch(() => '');
      console.log(`释放后状态: ${statusAfter}`);
      
      if (statusAfter?.includes('已归位')) {
        console.log('✅ 部件吸附成功');
      } else if (statusAfter?.includes('还未靠近')) {
        console.log('ℹ️  部件未到达吸附距离');
      }
      
      takeScreenshot(page, '09-snap-feedback', '吸附反馈测试后的状态');
    }
  } catch (e) {
    takeScreenshot(page, 'snap-feedback-error', '吸附反馈测试报错: ' + e.message);
    addIssue('snap-feedback-error', '吸附反馈测试报错: ' + e.message, 'medium', 'snap-feedback-error.png');
  }
  
  console.log('\n📍 步骤11: 最终组装并检查庆祝效果和五彩纸屑');
  try {
    await page.click('button:has-text("一键组装")', { timeout: 10000 });
    await sleep(2500);
    
    const statusText = await page.locator('.status').first().textContent({ timeout: 5000 });
    const progressText = await page.locator('.progress span').first().textContent({ timeout: 5000 });
    
    console.log(`最终状态: ${statusText}`);
    console.log(`最终进度: ${progressText}`);
    
    const hasFullCelebration = statusText?.includes('🎉 全部榫卯部件组装完成！椅子完整呈现。');
    console.log(`完整庆祝文本: ${hasFullCelebration ? '✅ 是' : '❌ 否'}`);
    
    if (!hasFullCelebration) {
      addIssue('incomplete-celebration-text', 
        `组装完成庆祝文本不完整，期望"🎉 全部榫卯部件组装完成！椅子完整呈现。"，实际为: "${statusText}"`, 
        'medium', null);
    }
    
    takeScreenshot(page, '10-final-assembled', '最终组装完成状态（含五彩纸屑庆祝效果）');
  } catch (e) {
    takeScreenshot(page, 'final-assemble-error', '最终组装报错: ' + e.message);
    addIssue('final-assemble-error', '最终组装报错: ' + e.message, 'high', 'final-assemble-error.png');
  }
  
  console.log('\n📍 步骤12: 代码实现与需求的静态检查');
  
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
  const hasReactThreeDrei = packageJson.dependencies['@react-three/drei'] || packageJson.devDependencies['@react-three/drei'];
  console.log(`\n是否安装@react-three/drei: ${hasReactThreeDrei ? '❌ 是（不应存在）' : '✅ 否（已按要求移除）'}`);
  
  if (hasReactThreeDrei) {
    addIssue('unwanted-drei-dependency', 
      'package.json中仍存在@react-three/drei依赖，本轮要求保留当前DragControls实现并移除对drei的依赖要求',
      'high', null);
  }
  
  const chairModelContent = fs.readFileSync(path.join(process.cwd(), 'src/components/ChairModel.vue'), 'utf-8');
  const hasGLTFLoader = chairModelContent.includes('GLTFLoader');
  const hasDragControlsImport = chairModelContent.includes('DragControls');
  const importSource = chairModelContent.match(/import.*DragControls.*from\s+['"]([^'"]+)['"]/)?.[1] || '';
  const hasIsActuallyDragging = chairModelContent.includes('isActuallyDragging');
  const hasDragStartPos = chairModelContent.includes('dragStartPos');
  const hasConfetti = chairModelContent.includes('confetti') || chairModelContent.includes('triggerCelebration');
  const hasCelebrationText = chairModelContent.includes('🎉 全部榫卯部件组装完成！椅子完整呈现。');
  
  console.log(`是否使用GLTFLoader: ${hasGLTFLoader ? '✅ 是' : '❌ 否'}`);
  console.log(`是否导入DragControls: ${hasDragControlsImport ? '✅ 是' : '❌ 否'}`);
  console.log(`DragControls导入来源: ${importSource}`);
  console.log(`是否有isActuallyDragging逻辑: ${hasIsActuallyDragging ? '✅ 是' : '❌ 否'}`);
  console.log(`是否有dragStartPos判断: ${hasDragStartPos ? '✅ 是' : '❌ 否'}`);
  console.log(`是否有五彩纸屑庆祝效果: ${hasConfetti ? '✅ 是' : '❌ 否'}`);
  console.log(`是否有完整庆祝文本: ${hasCelebrationText ? '✅ 是' : '❌ 否'}`);
  
  if (!hasIsActuallyDragging) {
    addIssue('missing-drag-threshold', '缺少拖拽阈值判断（isActuallyDragging逻辑），纯点击可能会误触发部件跟随', 'high', null);
  }
  
  if (!hasDragStartPos) {
    addIssue('missing-drag-start-pos', '缺少dragStartPos记录和移动距离判断逻辑', 'high', null);
  }
  
  if (!hasConfetti) {
    addIssue('missing-confetti-effect', '缺少五彩纸屑庆祝动画效果', 'medium', null);
  }
  
  if (!hasCelebrationText) {
    addIssue('missing-celebration-text', '缺少"🎉 全部榫卯部件组装完成！椅子完整呈现。"庆祝文本', 'medium', null);
  }
  
  const publicDir = path.join(process.cwd(), 'public');
  const modelsDir = path.join(publicDir, 'models');
  const texturesDir = path.join(publicDir, 'textures');
  
  const glbFiles = fs.existsSync(modelsDir) ? fs.readdirSync(modelsDir).filter(f => f.endsWith('.glb')) : [];
  const textureFiles = fs.existsSync(texturesDir) ? fs.readdirSync(texturesDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg')) : [];
  
  console.log(`.glb模型文件数量: ${glbFiles.length}`);
  console.log(`纹理文件数量: ${textureFiles.length}`);
  
  if (glbFiles.length < 10) {
    addIssue('insufficient-glb-files', 
      `GLB模型文件数量不足，应有10个（1个完整椅子+9个部件），实际只有${glbFiles.length}个。当前文件: ${glbFiles.join(', ')}`, 
      'high', null);
  }
  
  console.log('\n📍 步骤13: 检查运行时错误汇总');
  await sleep(1000);
  
  if (consoleErrors.length > 0 || pageErrors.length > 0 || networkErrors.length > 0) {
    const totalErrors = consoleErrors.length + pageErrors.length + networkErrors.length;
    console.log(`❌ 发现 ${totalErrors} 个运行时错误/警告:`);
    
    if (consoleErrors.length > 0) {
      console.log(`\n控制台错误 (${consoleErrors.length}个):`);
      consoleErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. [${err.type}] ${err.text}`);
        if (err.location) console.log(`     位置: ${JSON.stringify(err.location)}`);
      });
      addIssue('console-errors', `运行时存在${consoleErrors.length}个控制台错误`, 'high', null);
    }
    
    if (pageErrors.length > 0) {
      console.log(`\n页面异常 (${pageErrors.length}个):`);
      pageErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.text}`);
        if (err.stack) console.log(`     堆栈: ${err.stack.substring(0, 300)}`);
      });
      addIssue('page-errors', `运行时存在${pageErrors.length}个页面异常`, 'high', null);
    }
    
    if (networkErrors.length > 0) {
      console.log(`\n资源加载失败 (${networkErrors.length}个):`);
      networkErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.url}`);
        console.log(`     错误: ${err.error}`);
      });
      addIssue('network-errors', `运行时存在${networkErrors.length}个资源加载失败`, 'high', null);
    }
  } else {
    console.log('✅ 无控制台错误、页面异常或资源加载失败');
  }
  
  await sleep(1000);
  await browser.close();
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 第4轮测试总结报告');
  console.log('='.repeat(70));
  
  const realIssues = issues.filter(i => i.severity);
  
  if (realIssues.length > 0) {
    console.log(`\n❌ 共发现 ${realIssues.length} 个问题:`);
    realIssues.forEach((issue, i) => {
      const severityIcon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
      console.log(`\n  ${i + 1}. [${issue.name}] ${severityIcon}`);
      console.log(`     严重程度: ${issue.severity}`);
      console.log(`     描述: ${issue.description}`);
      if (issue.screenshot) console.log(`     截图: ${issue.screenshot}`);
    });
  } else {
    console.log('\n✅ 未发现明显问题');
  }
  
  const screenshotFiles = fs.readdirSync(IMG_DIR).filter(f => f.endsWith('.png'));
  
  fs.writeFileSync(
    path.join(IMG_DIR, 'test-result.json'),
    JSON.stringify({
      testTime: new Date().toISOString(),
      testRound: 4,
      projectName: 'mortise-tenon-builder',
      testUrl: URL,
      issues: realIssues.map(i => ({
        name: i.name,
        description: i.description,
        screenshot: i.screenshot,
        severity: i.severity
      })),
      consoleErrors,
      pageErrors,
      networkErrors,
      screenshots: screenshotFiles,
      totalScreenshots: screenshotFiles.length,
      totalIssues: realIssues.length
    }, null, 2)
  );
  
  console.log(`\n📁 测试结果已保存到 img/test-result.json`);
  console.log(`📸 共生成 ${screenshotFiles.length} 张测试截图`);
  console.log('\n' + '='.repeat(70));
}

runTest().catch(err => {
  console.error('❌ 测试执行异常:', err);
  process.exit(1);
});
