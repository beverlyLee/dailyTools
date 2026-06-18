import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function runDebugTests() {
  console.log('🔍 详细调试测试 - 第二轮');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const consoleLogs = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  // 监听 WebSocket 消息
  const wsMessages = [];
  page.on('websocket', (ws) => {
    console.log('📡 WebSocket 已连接');
    ws.on('framesent', (event) => {
      try {
        const data = JSON.parse(event.text());
        wsMessages.push({ direction: 'sent', data });
        console.log(`📤 发送: ${JSON.stringify(data)}`);
      } catch (e) {
        console.log(`📤 发送(非JSON): ${event.text()}`);
      }
    });
    ws.on('framereceived', (event) => {
      try {
        const data = JSON.parse(event.text());
        if (data.type === 'tick') return;
        wsMessages.push({ direction: 'received', data });
        console.log(`📥 接收(${data.type}): ${JSON.stringify(data).substring(0, 150)}`);
      } catch (e) {
        // 忽略解析错误
      }
    });
  });

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    console.log('✅ 页面加载完成');

    // ===== 调试1: 检查前端滑块事件 =====
    console.log('\n📋 调试1: 外界气温滑块调节详细分析');
    
    const initialAmbient = await page.locator('#ambientTemp').textContent();
    console.log(`初始外界气温: ${initialAmbient}`);
    
    // 检查滑块属性
    const sliderProps = await page.locator('#ambientSlider').evaluate((el) => {
      return {
        id: el.id,
        type: el.type,
        min: el.min,
        max: el.max,
        step: el.step,
        value: el.value,
        hasInputListener: el.oninput !== null,
        outerHTML: el.outerHTML.substring(0, 200)
      };
    });
    console.log(`滑块属性: ${JSON.stringify(sliderProps, null, 2)}`);

    // 方法1: 使用原生事件模拟
    console.log('\n--- 方法1: 模拟真实用户输入 ---');
    const ambientSlider = page.locator('#ambientSlider');
    const sliderBox = await ambientSlider.boundingBox();
    console.log(`滑块位置: ${JSON.stringify(sliderBox)}`);
    
    if (sliderBox) {
      // 点击滑块右侧位置，模拟拖动
      await ambientSlider.hover();
      await page.mouse.down();
      await page.mouse.move(sliderBox.x + sliderBox.width * 0.8, sliderBox.y + sliderBox.height / 2);
      await page.mouse.up();
      await page.waitForTimeout(2000);
      
      const afterDrag = await page.locator('#ambientTemp').textContent();
      console.log(`拖动后气温: ${afterDrag}`);
      console.log(`滑块值: ${await ambientSlider.inputValue()}`);
    }

    // 方法2: 直接调用setAmbientTemp函数（如果存在）
    console.log('\n--- 方法2: 直接检查前端App代码 ---');
    const appCode = await page.evaluate(() => {
      // 检查是否有全局的App实例或相关函数
      const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src || s.textContent?.substring(0, 100));
      return {
        hasColdChainApp: typeof window !== 'undefined' && 'ColdChainApp' in window,
        scripts: scripts.filter(s => s && s.includes('App'))
      };
    });
    console.log(`前端App检查: ${JSON.stringify(appCode)}`);

    // ===== 调试2: 手动发送WebSocket消息 =====
    console.log('\n📋 调试2: 手动发送WebSocket ambient消息');
    
    const wsSendResult = await page.evaluate(() => {
      return new Promise((resolve) => {
        // 查找现有的WebSocket连接
        const originalSend = WebSocket.prototype.send;
        const messages = [];
        
        // 尝试创建一个新的WebSocket连接来测试
        const testWs = new WebSocket('ws://localhost:3001');
        
        testWs.onopen = () => {
          console.log('测试WebSocket已连接');
          const testMsg = JSON.stringify({ action: 'ambient', temp: 38 });
          console.log(`发送测试消息: ${testMsg}`);
          testWs.send(testMsg);
          
          // 等待一段时间看是否有响应
          setTimeout(() => {
            testWs.close();
            resolve({ success: true, messageSent: testMsg });
          }, 2000);
        };
        
        testWs.onerror = (err) => {
          resolve({ success: false, error: err.message });
        };
        
        testWs.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'state') {
            console.log(`收到state响应，ambientTemp: ${data.ambientTemp}`);
            messages.push(data);
          }
        };
        
        setTimeout(() => {
          if (testWs.readyState === 1) {
            testWs.close();
          }
          resolve({ success: false, error: 'timeout', messages });
        }, 5000);
      });
    });
    
    console.log(`WebSocket测试结果: ${JSON.stringify(wsSendResult)}`);
    
    await page.waitForTimeout(2000);
    const afterWsTest = await page.locator('#ambientTemp').textContent();
    console.log(`WebSocket测试后气温: ${afterWsTest}`);

    // ===== 调试3: 检查后端WebSocket处理 =====
    console.log('\n📋 调试3: 检查后端WebSocket消息处理');
    console.log('已捕获的WebSocket消息:');
    wsMessages.forEach((msg, i) => {
      console.log(`  ${i+1}. ${msg.direction === 'sent' ? '↑' : '↓'} ${JSON.stringify(msg.data).substring(0, 100)}`);
    });

    // ===== 调试4: 检查前端ambient事件处理代码 =====
    console.log('\n📋 调试4: 检查前端代码中的ambient处理');
    const ambientHandlerCheck = await page.evaluate(() => {
      // 检查所有script标签的内容
      const scripts = Array.from(document.querySelectorAll('script'));
      let ambientCode = '';
      
      for (const script of scripts) {
        if (script.src) {
          try {
            // 尝试获取源码
            const response = fetch(script.src);
          } catch (e) {}
        } else if (script.textContent) {
          if (script.textContent.includes('ambient')) {
            ambientCode += script.textContent.substring(0, 500) + '\n';
          }
        }
      }
      
      return {
        ambientCodeFound: ambientCode.length > 0,
        ambientCode: ambientCode.substring(0, 1000)
      };
    });
    
    console.log(`前端ambient代码检查: ${ambientHandlerCheck.ambientCodeFound ? '找到' : '未找到'}`);
    if (ambientHandlerCheck.ambientCode) {
      console.log(`相关代码片段:\n${ambientHandlerCheck.ambientCode}`);
    }

    // ===== 调试5: 直接测试HTTP API =====
    console.log('\n📋 调试5: 直接测试HTTP API');
    
    const httpTest = await page.evaluate(async () => {
      const results = [];
      
      try {
        const res1 = await fetch('http://localhost:3001/api/control/ambient', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ temp: 42 })
        });
        results.push({
          api: 'POST /api/control/ambient',
          ok: res1.ok,
          status: res1.status,
          data: await res1.json()
        });
        
        await new Promise(r => setTimeout(r, 1000));
        
        const res2 = await fetch('http://localhost:3001/api/status');
        results.push({
          api: 'GET /api/status',
          ok: res2.ok,
          status: res2.status,
          data: await res2.json()
        });
      } catch (e) {
        results.push({ error: e.message });
      }
      
      return results;
    });
    
    httpTest.forEach((result, i) => {
      if (result.error) {
        console.log(`  API ${i+1} 错误: ${result.error}`);
      } else {
        console.log(`  ${result.api}: ${result.ok ? '✅' : '❌'} (${result.status})`);
        if (result.data) {
          console.log(`    数据: ${JSON.stringify(result.data).substring(0, 200)}`);
        }
      }
    });
    
    await page.waitForTimeout(1500);
    const afterHttpTest = await page.locator('#ambientTemp').textContent();
    console.log(`HTTP API测试后气温: ${afterHttpTest}`);

    // ===== 控制台错误汇总 =====
    console.log('\n📋 控制台错误汇总');
    if (consoleErrors.length > 0) {
      console.log(`❌ 共 ${consoleErrors.length} 个错误:`);
      consoleErrors.forEach((err, i) => {
        console.log(`  ${i+1}. ${err}`);
      });
    } else {
      console.log('✅ 无控制台错误');
    }
    
    console.log('\n📋 控制台日志（筛选）:');
    consoleLogs.filter(l => l.includes('ambient') || l.includes('WS') || l.includes('error'))
      .slice(-20)
      .forEach(log => console.log(`  ${log}`));

  } catch (e) {
    console.error(`测试失败: ${e.message}`);
    console.error(e.stack);
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 调试测试完成');
}

runDebugTests().catch(console.error);
