import { chromium } from 'playwright';

async function runTests() {
    console.log('\n' + '='.repeat(80));
    console.log('🌌 aurora-dancer 北极光项目 - 第4轮浏览器测试');
    console.log('='.repeat(80) + '\n');
    
    const testResults = [];
    const consoleLogs = [];
    
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
    
    await new Promise(r => setTimeout(r, 3000));
    
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
    
    // 测试3: 提取调试面板数值
    try {
        const debugPanel = page.locator('div').filter({ hasText: 'Aurora Debug' }).first();
        const debugText = await debugPanel.innerText({ timeout: 5000 });
        const lines = debugText.split('\n');
        let fpsValue = 'N/A';
        let noiseValue = 'N/A';
        for (const line of lines) {
            if (line.includes('FPS:')) {
                fpsValue = line.split('FPS:')[1].trim();
            }
            if (line.includes('Noise:')) {
                noiseValue = line.split('Noise:')[1].trim();
            }
        }
        
        console.log(`📊 调试数据 | FPS=${fpsValue}, Noise=${noiseValue}`);
        testResults.push(['调试数据', true, `FPS=${fpsValue}, Noise=${noiseValue}`]);
    } catch (e) {
        console.log(`❌ FAIL | 3. 调试数据 | ${e.message}`);
        testResults.push(['调试数据', false, e.message]);
    }
    
    // 测试4: 等待5秒后再次检查Noise值变化
    await new Promise(r => setTimeout(r, 5000));
    try {
        const debugPanel = page.locator('div').filter({ hasText: 'Aurora Debug' }).first();
        const debugText2 = await debugPanel.innerText({ timeout: 5000 });
        const lines2 = debugText2.split('\n');
        let noiseValue2 = 'N/A';
        for (const line of lines2) {
            if (line.includes('Noise:')) {
                noiseValue2 = line.split('Noise:')[1].trim();
            }
        }
        
        console.log(`📊 5秒后数据 | Noise=${noiseValue2}`);
        testResults.push(['5秒后Noise', true, `Noise=${noiseValue2}`]);
        
        // 检查Noise值是否在正常范围(-1.0~1.0)
        try {
            const noiseFloat = parseFloat(noiseValue2);
            if (!isNaN(noiseFloat) && noiseFloat >= -1.0 && noiseFloat <= 1.0) {
                console.log(`✅ PASS | 4. Noise值范围 | 在 -1.0~1.0 之间: ${noiseFloat}`);
                testResults.push(['Noise值范围', true, `${noiseFloat}`]);
            } else {
                console.log(`❌ FAIL | 4. Noise值范围 | 超出范围: ${noiseFloat}`);
                testResults.push(['Noise值范围', false, `超出范围: ${noiseFloat}`]);
            }
        } catch {
            console.log('❌ FAIL | 4. Noise值范围 | 无法解析数值');
            testResults.push(['Noise值范围', false, '无法解析']);
        }
    } catch (e) {
        console.log(`❌ FAIL | 4. Noise值范围 | ${e.message}`);
        testResults.push(['Noise值范围', false, e.message]);
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
    const screenshotPath = '/Users/liboyang/trae/dailyTools/aurora-dancer/img/aurora-round4-main.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`\n📸 截图已保存: ${screenshotPath}`);
    
    // 5秒后再截图看动态效果
    await new Promise(r => setTimeout(r, 5000));
    const screenshotPath2 = '/Users/liboyang/trae/dailyTools/aurora-dancer/img/aurora-round4-8s-later.png';
    await page.screenshot({ path: screenshotPath2 });
    console.log(`📸 8秒后截图已保存: ${screenshotPath2}`);
    
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
    
    return { testResults, consoleLogs };
}

runTests().catch(console.error);
