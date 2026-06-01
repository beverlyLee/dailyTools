import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

async function runTests() {
    console.log('\n' + '='.repeat(80));
    console.log('🌌 aurora-dancer 北极光项目 - 第5轮浏览器测试');
    console.log('='.repeat(80) + '\n');
    
    const testResults = [];
    const consoleLogs = [];
    const noiseValues = [];
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    
    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    
    // 测试1: 页面加载
    const start = Date.now();
    try {
        await page.goto('http://localhost:3001/', { waitUntil: 'networkidle', timeout: 30000 });
        const loadTime = (Date.now() - start) / 1000;
        console.log(`✅ PASS | 1. 页面加载 | 加载时间: ${loadTime.toFixed(2)}s`);
        testResults.push(['页面加载', true, `${loadTime.toFixed(2)}s`]);
    } catch (e) {
        console.log(`❌ FAIL | 1. 页面加载 | ${e.message}`);
        testResults.push(['页面加载', false, e.message]);
    }
    
    await new Promise(r => setTimeout(r, 4000));
    
    // 测试2: 调试面板存在
    try {
        const debugPanel = page.locator('div').filter({ hasText: 'Aurora Debug' }).first();
        const exists = await debugPanel.isVisible({ timeout: 5000 });
        if (exists) {
            console.log('✅ PASS | 2. 调试面板 | 已渲染');
            testResults.push(['调试面板', true, '已渲染']);
        } else {
            console.log('❌ FAIL | 2. 调试面板 | 未找到');
            testResults.push(['调试面板', false, '未找到']);
        }
    } catch (e) {
        console.log(`❌ FAIL | 2. 调试面板 | ${e.message}`);
        testResults.push(['调试面板', false, e.message]);
    }
    
    // 测试3: 连续10秒监控Noise值变化
    console.log('\n📊 开始连续10秒监控Noise值...');
    try {
        const debugPanel = page.locator('div').filter({ hasText: 'Aurora Debug' }).first();
        const startTime = Date.now();
        let lastNoise = null;
        let hasJump = false;
        let hasStagnation = true;
        
        for (let i = 0; i < 11; i++) {
            const debugText = await debugPanel.innerText({ timeout: 5000 });
            const lines = debugText.split('\n');
            let noiseValue = 'N/A';
            let fpsValue = 'N/A';
            for (const line of lines) {
                if (line.includes('Noise:')) {
                    noiseValue = line.split('Noise:')[1].trim();
                }
                if (line.includes('FPS:')) {
                    fpsValue = line.split('FPS:')[1].trim();
                }
            }
            
            const noiseFloat = parseFloat(noiseValue);
            noiseValues.push({ time: (Date.now() - startTime) / 1000, noise: noiseFloat, fps: fpsValue });
            console.log(`  [${(Date.now() - startTime) / 1000}s] Noise=${noiseValue}, FPS=${fpsValue}`);
            
            // 检查范围
            if (isNaN(noiseFloat) || noiseFloat < -1.0 || noiseFloat > 1.0) {
                hasJump = true;
            }
            
            // 检查是否有变化（非停滞）
            if (lastNoise !== null && Math.abs(noiseFloat - lastNoise) > 0.001) {
                hasStagnation = false;
            }
            lastNoise = noiseFloat;
            
            await new Promise(r => setTimeout(r, 1000));
        }
        
        const noiseValuesArr = noiseValues.map(n => n.noise).filter(n => !isNaN(n));
        const minNoise = Math.min(...noiseValuesArr);
        const maxNoise = Math.max(...noiseValuesArr);
        const avgNoise = noiseValuesArr.reduce((a, b) => a + b, 0) / noiseValuesArr.length;
        
        console.log(`\n📊 Noise值统计: 最小值=${minNoise.toFixed(4)}, 最大值=${maxNoise.toFixed(4)}, 平均值=${avgNoise.toFixed(4)}`);
        
        const allInRange = minNoise >= -1.0 && maxNoise <= 1.0;
        const hasSmoothChange = !hasJump && !hasStagnation;
        
        if (allInRange) {
            console.log(`✅ PASS | 3. Noise值范围 | 在 -1.0~1.0 之间`);
            testResults.push(['Noise值范围', true, `${minNoise.toFixed(4)} ~ ${maxNoise.toFixed(4)}`]);
        } else {
            console.log(`❌ FAIL | 3. Noise值范围 | 超出范围: ${minNoise.toFixed(4)} ~ ${maxNoise.toFixed(4)}`);
            testResults.push(['Noise值范围', false, `超出范围: ${minNoise.toFixed(4)} ~ ${maxNoise.toFixed(4)}`]);
        }
        
        if (hasSmoothChange) {
            console.log(`✅ PASS | 4. Noise值连续性 | 平滑变化，无跳变无停滞`);
            testResults.push(['Noise值连续性', true, '平滑变化']);
        } else {
            console.log(`❌ FAIL | 4. Noise值连续性 | 跳变=${hasJump}, 停滞=${hasStagnation}`);
            testResults.push(['Noise值连续性', false, `跳变=${hasJump}, 停滞=${hasStagnation}`]);
        }
    } catch (e) {
        console.log(`❌ FAIL | 3-4. Noise监控 | ${e.message}`);
        testResults.push(['Noise监控', false, e.message]);
    }
    
    // 测试5: 控制台错误检查
    const jsErrors = consoleLogs.filter(e => e.toLowerCase().includes('[error]') || e.toLowerCase().includes('error'));
    if (jsErrors.length === 0) {
        console.log('✅ PASS | 5. 浏览器控制台 | 无JS错误');
        testResults.push(['浏览器控制台', true, '无错误']);
    } else {
        console.log(`❌ FAIL | 5. 浏览器控制台 | 发现 ${jsErrors.length} 个错误`);
        testResults.push(['浏览器控制台', false, `${jsErrors.length}个错误`]);
        for (const err of jsErrors.slice(0, 5)) {
            console.log(`    → ${err}`);
        }
    }
    
    console.log('\n📝 完整控制台日志:');
    for (const log of consoleLogs.slice(0, 15)) {
        console.log(`  ${log}`);
    }
    
    // 截图保存
    const screenshotPath = '/Users/liboyang/trae/dailyTools/aurora-dancer/img/aurora-round5-main.png';
    await page.screenshot({ path: screenshotPath, timeout: 60000 });
    console.log(`\n📸 截图已保存: ${screenshotPath}`);
    
    // 5秒后再截图看动态效果
    await new Promise(r => setTimeout(r, 5000));
    const screenshotPath2 = '/Users/liboyang/trae/dailyTools/aurora-dancer/img/aurora-round5-8s-later.png';
    await page.screenshot({ path: screenshotPath2, timeout: 60000 });
    console.log(`📸 8秒后截图已保存: ${screenshotPath2}`);
    
    // 保存Noise数据用于分析
    const noiseDataPath = '/Users/liboyang/trae/dailyTools/aurora-dancer/img/noise-data-round5.json';
    writeFileSync(noiseDataPath, JSON.stringify(noiseValues, null, 2));
    console.log(`📊 Noise数据已保存: ${noiseDataPath}`);
    
    await browser.close();
    
    // 测试总结
    console.log('\n' + '='.repeat(80));
    console.log('📊 测试总结');
    console.log('='.repeat(80));
    
    const passed = testResults.filter(r => r[1]).length;
    const total = testResults.length;
    
    console.log(`\n通过: ${passed}/${total} (${(passed/total*100).toFixed(1)}%)`);
    console.log(`失败: ${total-passed}/${total}\n`);
    
    if (passed === total) {
        console.log('🎉 所有测试通过！');
    } else {
        console.log('⚠️  部分测试失败，请检查上述失败项');
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    return { testResults, consoleLogs, noiseValues, screenshotPath, screenshotPath2 };
}

runTests().catch(console.error);
