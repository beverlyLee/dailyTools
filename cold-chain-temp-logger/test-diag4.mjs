import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function runDiagnostic() {
  console.log('🔍 第四轮诊断 - 定位首帧仍显示0秒的原因');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    console.log('✅ 页面加载完成');

    // 注入诊断代码，捕获所有 WebSocket 消息的详细内容
    console.log('\n📋 诊断: 注入消息拦截器，捕获完整数据流');
    const diagResult = await page.evaluate(() => {
      return new Promise((resolve) => {
        const messageLog = [];
        const originalSend = WebSocket.prototype.send;
        let diagWs = null;

        // 在页面中创建新的诊断 WebSocket 连接
        setTimeout(() => {
          diagWs = new WebSocket('ws://localhost:3001');
          let messageCount = 0;
          let lastAlertState = false;
          let firstAlertFound = false;
          let alertFrameDetails = null;

          diagWs.onmessage = (event) => {
            const data = JSON.parse(event.data);
            messageCount++;
            
            const entry = {
              count: messageCount,
              type: data.type,
            };

            if (data.type === 'init') {
              entry.stateKeys = Object.keys(data.state);
              entry.alertHistoryLen = data.state.alertHistory?.length || 0;
              entry.totalAlertDuration = data.state.totalAlertDuration;
            }
            
            if (data.type === 'state') {
              entry.keys = Object.keys(data);
              entry.isAlert = data.isAlert;
              entry.alertHistoryLen = data.alertHistory?.length || 0;
              entry.alertHistoryFirst = data.alertHistory?.[0] || null;
              entry.totalAlertDuration = data.totalAlertDuration;
              entry.time = data.time;
            }
            
            if (data.type === 'tick') {
              entry.isAlert = data.record.isAlert;
              entry.temperature = data.record.temperature?.toFixed(2);
              entry.time = data.record.time;
            }
            
            messageLog.push(entry);

            // 检测首个警报帧
            if (data.type === 'state' && data.isAlert && !lastAlertState && !firstAlertFound) {
              lastAlertState = true;
              firstAlertFound = true;
              alertFrameDetails = {
                stateMessage: entry,
                totalAlertDuration: data.totalAlertDuration,
                alertHistoryLen: data.alertHistory?.length,
                alertHistory: data.alertHistory,
                time: data.time
              };
              console.log('[DIAG] 首个警报 state:', JSON.stringify(alertFrameDetails));
            }
            
            // 当找到首个警报后再收集 5 条消息，然后结束
            if (firstAlertFound && messageCount >= alertFrameDetails ? 20 : 30) {
              setTimeout(() => {
                diagWs.close();
                resolve({
                  alertFrameDetails,
                  recentMessages: messageLog.slice(-25),
                  totalMessages: messageLog.length
                });
              }, 5000);
            }
          };

          // 2秒后触发车门开启
          setTimeout(() => {
            // 通过页面 DOM 触发按钮点击
            const btn = document.getElementById('resetBtn');
            if (btn) btn.click();
          }, 500);
          
          setTimeout(() => {
            const doorBtn = document.getElementById('doorBtn');
            if (doorBtn) doorBtn.click();
            console.log('[DIAG] 已点击车门按钮');
          }, 2500);

        }, 1000);

        // 超时保护
        setTimeout(() => {
          if (diagWs) diagWs.close();
          resolve({
            timeout: true,
            recentMessages: messageLog.slice(-25),
            totalMessages: messageLog.length
          });
        }, 25000);
      });
    });

    console.log('\n📊 诊断结果:');
    console.log(`   总消息数: ${diagResult.totalMessages}`);
    
    if (diagResult.timeout) {
      console.log('   ⚠️ 超时：25秒内未捕获足够数据');
    }
    
    if (diagResult.alertFrameDetails) {
      console.log('\n   🔴 首个警报 state 消息详情:');
      console.log(`      isAlert: ${diagResult.alertFrameDetails.stateMessage.isAlert}`);
      console.log(`      time: ${diagResult.alertFrameDetails.time}`);
      console.log(`      totalAlertDuration: ${diagResult.alertFrameDetails.totalAlertDuration}`);
      console.log(`      alertHistory 条数: ${diagResult.alertFrameDetails.alertHistoryLen}`);
      console.log(`      alertHistory[0]: ${JSON.stringify(diagResult.alertFrameDetails.alertHistory?.[0])}`);
      
      if (diagResult.alertFrameDetails.totalAlertDuration === 0) {
        console.log('      ❌ 问题确认: 后端 state 消息中 totalAlertDuration 为 0');
        console.log('         → 根因: 后端 getTotalAlertDuration() 计算在警报首帧仍返回0');
      } else {
        console.log(`      ✅ 后端 state.totalAlertDuration = ${diagResult.alertFrameDetails.totalAlertDuration} (正常)`);
        console.log('         → 如果前端仍显示0秒，则问题在前端tick处理逻辑');
      }
    }

    console.log('\n   📜 最近25条消息时序:');
    diagResult.recentMessages.forEach((m, i) => {
      let extra = '';
      if (m.type === 'state') {
        extra = `(alert=${m.isAlert}, dur=${m.totalAlertDuration}, hist=${m.alertHistoryLen})`;
      }
      if (m.type === 'tick') {
        extra = `(alert=${m.isAlert}, t=${m.temperature}°C, time=${m.time})`;
      }
      if (m.type === 'init') {
        extra = `(hist=${m.alertHistoryLen}, dur=${m.totalAlertDuration})`;
      }
      console.log(`      ${m.count}. ${m.type} ${extra}`);
    });

    // 直接用 HTTP API 验证后端 getTotalAlertDuration
    console.log('\n📋 诊断: HTTP API 直接验证后端计算');
    const httpResult = await page.evaluate(async () => {
      // 重置并开启车门
      const ws = new WebSocket('ws://localhost:3001');
      
      return new Promise((resolve) => {
        ws.onopen = () => {
          // 先重置
          ws.send(JSON.stringify({ action: 'reset' }));
          
          setTimeout(() => {
            // 开门
            ws.send(JSON.stringify({ action: 'door', open: true }));
          }, 1000);
        };

        // 轮询状态直到警报触发
        let checks = 0;
        const interval = setInterval(async () => {
          checks++;
          const res = await fetch('http://localhost:3001/api/status');
          const data = await res.json();
          console.log(`[HTTP #${checks}] alert=${data.isAlert}, temp=${data.currentTemp.toFixed(1)}°C, dur=${data.totalAlertDuration}s, histLen=${data.alertHistory?.length}`);
          
          if (data.isAlert && checks <= 15) {
            clearInterval(interval);
            ws.close();
            resolve({
              firstAlertStatus: data,
              firstAlertHistory0: data.alertHistory?.[0]
            });
          }
          
          if (checks >= 20) {
            clearInterval(interval);
            ws.close();
            resolve({ noAlert: true });
          }
        }, 1000);
      });
    });

    if (httpResult.noAlert) {
      console.log('   ⚠️ 20秒内未触发警报');
    } else if (httpResult.firstAlertStatus) {
      console.log('\n   🔴 首次警报时的 HTTP API 状态:');
      console.log(`      isAlert: ${httpResult.firstAlertStatus.isAlert}`);
      console.log(`      currentTemp: ${httpResult.firstAlertStatus.currentTemp.toFixed(2)}°C`);
      console.log(`      threshold: ${httpResult.firstAlertStatus.threshold}°C`);
      console.log(`      totalAlertDuration: ${httpResult.firstAlertStatus.totalAlertDuration}秒`);
      console.log(`      alertHistory[0]: ${JSON.stringify(httpResult.firstAlertHistory0)}`);
      
      if (httpResult.firstAlertStatus.totalAlertDuration === 0) {
        console.log('      ❌ 根因定位: 后端 getTotalAlertDuration() 在警报首帧返回 0');
        console.log('         → 检查 thermodynamicModel.js 第99-100行逻辑是否被正确调用');
        
        const a = httpResult.firstAlertHistory0;
        if (a) {
          const elapsed = httpResult.firstAlertStatus.time - a.startTime;
          console.log(`         → startTime=${a.startTime}, time=${httpResult.firstAlertStatus.time}, elapsed=${elapsed}`);
          console.log(`         → elapsed === 0: ${elapsed === 0}, 此时应返回60但实际是 ${httpResult.firstAlertStatus.totalAlertDuration}`);
        }
      } else {
        console.log(`      ✅ 后端计算正确: totalAlertDuration=${httpResult.firstAlertStatus.totalAlertDuration}秒`);
        console.log('         → 如果前端显示0秒，则问题在于前端 tick 处理逻辑或消息时序');
      }
    }

  } catch (e) {
    console.error(`\n❌ 诊断失败: ${e.message}`);
    console.error(e.stack);
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 诊断完成');
}

runDiagnostic().catch(console.error);
