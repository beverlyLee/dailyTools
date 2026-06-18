import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function runSimpleTest() {
  console.log('🔍 简单验证测试 - 外界气温调节问题');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // 收集所有控制台输出
  const allLogs = [];
  page.on('console', (msg) => {
    allLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    allLogs.push(`[PAGE_ERROR] ${err.message}`);
  });

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    console.log('✅ 页面加载完成');

    // 测试1: 检查初始值
    const initialAmbient = await page.locator('#ambientTemp').textContent();
    const initialSliderValue = await page.locator('#ambientSlider').inputValue();
    console.log(`\n初始状态: 显示=${initialAmbient}, 滑块值=${initialSliderValue}`);

    // 测试2: 直接调用前端的setAmbientTemp方法（通过WebSocket发送消息）
    console.log('\n📋 测试1: 直接在页面中执行代码，检查WebSocket发送');
    
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        // 记录WebSocket消息
        const originalSend = WebSocket.prototype.send;
        const sentMessages = [];
        const receivedMessages = [];
        
        WebSocket.prototype.send = function(data) {
          try {
            const parsed = JSON.parse(data);
            sentMessages.push(parsed);
            console.log('[TEST] 发送消息:', JSON.stringify(parsed));
          } catch (e) {
            sentMessages.push({ raw: data });
          }
          return originalSend.call(this, data);
        };
        
        // 监听页面上现有的WebSocket
        // 直接模拟滑块事件
        const slider = document.getElementById('ambientSlider');
        if (slider) {
          console.log('[TEST] 找到滑块元素:', slider.id);
          
          // 设置值并触发事件
          slider.value = 35;
          const event = new Event('input', { bubbles: true });
          console.log('[TEST] 触发input事件');
          slider.dispatchEvent(event);
        } else {
          console.log('[TEST] 未找到滑块元素');
        }
        
        // 检查事件监听器
        setTimeout(() => {
          resolve({
            sentMessages,
            receivedMessages,
            foundSlider: slider !== null,
            ambientDisplay: document.getElementById('ambientTemp')?.textContent,
            sliderValue: slider?.value
          });
        }, 3000);
      });
    });
    
    console.log(`发送的消息: ${JSON.stringify(result.sentMessages, null, 2)}`);
    console.log(`滑块值: ${result.sliderValue}`);
    console.log(`气温显示: ${result.ambientDisplay}`);

    // 测试3: 直接通过WebSocket发送消息
    console.log('\n📋 测试2: 直接发送WebSocket消息');
    
    const wsResult = await page.evaluate(() => {
      return new Promise((resolve) => {
        const testWs = new WebSocket('ws://localhost:3001');
        let ambientTempBefore = null;
        let ambientTempAfter = null;
        
        testWs.onopen = () => {
          console.log('[TEST] 测试WebSocket已连接');
          // 先获取当前状态
          testWs.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('[TEST] 收到:', data.type, data.ambientTemp !== undefined ? `ambient=${data.ambientTemp}` : '');
            
            if (data.type === 'init' || data.type === 'state') {
              if (ambientTempBefore === null) {
                ambientTempBefore = data.ambientTemp || data.state?.ambientTemp;
                console.log(`[TEST] 调节前ambientTemp: ${ambientTempBefore}`);
                
                // 发送调节消息
                const msg = JSON.stringify({ action: 'ambient', temp: 38 });
                console.log(`[TEST] 发送: ${msg}`);
                testWs.send(msg);
              } else {
                ambientTempAfter = data.ambientTemp || data.state?.ambientTemp;
                console.log(`[TEST] 调节后ambientTemp: ${ambientTempAfter}`);
                
                setTimeout(() => {
                  testWs.close();
                  resolve({
                    before: ambientTempBefore,
                    after: ambientTempAfter,
                    changed: ambientTempBefore !== ambientTempAfter
                  });
                }, 2000);
              }
            }
          };
        };
        
        testWs.onerror = (err) => {
          resolve({ error: err.message });
        };
        
        setTimeout(() => {
          testWs.close();
          resolve({ error: 'timeout', before: ambientTempBefore, after: ambientTempAfter });
        }, 10000);
      });
    });
    
    console.log(`WebSocket测试结果: ${JSON.stringify(wsResult)}`);

    // 测试4: 检查HTTP API
    console.log('\n📋 测试3: HTTP API测试');
    
    const httpResult = await page.evaluate(async () => {
      try {
        // 先获取当前状态
        const res1 = await fetch('http://localhost:3001/api/status');
        const status1 = await res1.json();
        console.log('[TEST] 调节前:', status1.ambientTemp);
        
        // 调用调节API
        const res2 = await fetch('http://localhost:3001/api/control/ambient', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ temp: 40 })
        });
        const result2 = await res2.json();
        console.log('[TEST] POST响应:', result2);
        
        // 再获取状态
        await new Promise(r => setTimeout(r, 1000));
        const res3 = await fetch('http://localhost:3001/api/status');
        const status3 = await res3.json();
        console.log('[TEST] 调节后:', status3.ambientTemp);
        
        return {
          before: status1.ambientTemp,
          after: status3.ambientTemp,
          postResult: result2,
          alertHistory: status3.alertHistory ? `存在（长度${status3.alertHistory.length}）` : '不存在'
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log(`HTTP API结果: ${JSON.stringify(httpResult, null, 2)}`);

    // 检查页面显示
    await page.waitForTimeout(2000);
    const finalAmbient = await page.locator('#ambientTemp').textContent();
    console.log(`\n页面最终显示外界气温: ${finalAmbient}`);

    // 控制台输出
    console.log('\n📋 控制台输出:');
    allLogs.slice(-30).forEach(log => console.log(`  ${log}`));

  } catch (e) {
    console.error(`测试失败: ${e.message}`);
    console.error(e.stack);
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 测试完成');
}

runSimpleTest().catch(console.error);
