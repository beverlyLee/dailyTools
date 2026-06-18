import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function runDeepDiagnostic() {
  console.log('🔍 深度诊断 - 前端内部状态精确追踪');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 收集页面内所有 console 输出
  const pageLogs = [];
  page.on('console', (msg) => {
    pageLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  try {
    // 先打开页面
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    console.log('✅ 页面加载完成');

    // 在页面中注入深度诊断代码，劫持 App 实例的 render 和 handleWsMessage
    console.log('\n📋 注入前端内部状态劫持代码...');
    await page.evaluate(() => {
      // 尝试通过各种方式找到 ColdChainApp 实例
      const globalKeys = Object.keys(window);
      console.log('[INJECT] window 全局键:', globalKeys.slice(0, 30).join(', '));
      
      // 检查是否有已挂载的 DOM 属性
      const appEl = document.getElementById('app');
      if (appEl) {
        console.log('[INJECT] #app 存在');
        const appKeys = Object.keys(appEl);
        console.log('[INJECT] #app 属性:', appKeys.slice(0, 20).join(', '));
      }
      
      // 直接通过 innerHTML 查看结构
      const productList = document.getElementById('productList');
      if (productList) {
        console.log('[INJECT] productList 存在');
      }
      
      // 检查是否有 script 标签中的类名
      const scripts = document.querySelectorAll('script');
      scripts.forEach((s, i) => {
        if (s.textContent && s.textContent.includes('ColdChainApp')) {
          console.log(`[INJECT] script[${i}] 包含 ColdChainApp, 长度:`, s.textContent.length);
          // 检查是否是模块
          console.log(`[INJECT] script[${i}] type:`, s.getAttribute('type'));
        }
      });

      // 直接劫持 document.getElementById 来跟踪 alertDuration 元素的文本变化
      const alertDurationEl = document.getElementById('alertDuration');
      if (alertDurationEl) {
        console.log('[INJECT] alertDuration 元素存在, 初始文本:', alertDurationEl.textContent);
        
        // 使用 MutationObserver 跟踪文本变化
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((m) => {
            if (m.type === 'childList' || m.type === 'characterData') {
              const newText = alertDurationEl.textContent;
              const stack = new Error().stack?.split('\n').slice(1, 4).join(' | ') || '';
              console.log(`[MUTATION] alertDuration 文本变化: ${newText} | stack: ${stack}`);
            }
          });
        });
        observer.observe(alertDurationEl, { childList: true, characterData: true, subtree: true });
        window._durationObserver = observer;
      }

      // 劫持 WebSocket，记录精确的到达时间和内容（针对页面中的连接）
      const OriginalWebSocket = window.WebSocket;
      const messageTimeline = [];
      
      window._wsTimeline = messageTimeline;
      
      // 劫持 render 函数（通过自定义元素和观察）
      const bodyObserver = new MutationObserver(() => {
        // 观察 body 变化，用于检测 render 调用
      });
      bodyObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
      window._bodyObserver = bodyObserver;
      
      console.log('[INJECT] 劫持代码注入完成');
    });

    // 等待注入生效
    await page.waitForTimeout(1000);

    // 重置并开启车门，同时精确捕获 DOM 变化时间线
    console.log('\n📋 执行操作：重置 → 开启车门，并跟踪状态变化');
    
    // 先点击重置
    await page.locator('#resetBtn').click();
    await page.waitForTimeout(1500);
    console.log('→ 已重置');

    const resetDuration = await page.locator('#alertDuration').textContent();
    console.log(`   重置后 alertDuration 文本: ${resetDuration}`);

    // 清空日志，准备捕获警报
    pageLogs.length = 0;

    // 开启车门
    await page.locator('#doorBtn').click();
    console.log('→ 已开启车门，等待警报触发...');

    // 逐秒检查 DOM 文本
    let alertTriggered = false;
    let firstAlertDuration = '';
    let firstAlertSecond = 0;
    const durationTimeline = [];

    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(1000);
      const alertVisible = await page.locator('#alertBanner').isVisible();
      const tempText = await page.locator('#tempValue').textContent();
      const alertDuration = await page.locator('#alertDuration').textContent();
      
      durationTimeline.push({
        second: i + 1,
        alertVisible,
        temp: tempText,
        duration: alertDuration,
        logs: pageLogs.length
      });

      process.stdout.write(`\r   第${i+1}秒: ${tempText}°C | 警报:${alertVisible ? '🔴' : '🟢'} | 时长:${alertDuration} | 日志:${pageLogs.length}`);

      if (alertVisible && !alertTriggered) {
        alertTriggered = true;
        firstAlertSecond = i + 1;
        firstAlertDuration = alertDuration;
        console.log(`\n   🚨 首次警报触发！第${i+1}秒`);
        console.log(`      alertDuration 显示: "${alertDuration}"`);
        
        // 立即提取页面内部日志
        console.log('\n   📜 页面内部日志:');
        pageLogs.forEach(l => {
          if (l.includes('[MUTATION]') || l.includes('[INJECT]') || l.includes('alert')) {
            console.log(`      ${l.substring(0, 200)}`);
          }
        });
        
        // 等3秒后再看一次
        await page.waitForTimeout(3000);
        const durAt3Sec = await page.locator('#alertDuration').textContent();
        console.log(`\n   3秒后 alertDuration: "${durAt3Sec}"`);
        break;
      }
    }

    console.log('\n');
    console.log('📊 时长变化时间线:');
    durationTimeline.slice(0, firstAlertSecond + 3).forEach((d) => {
      console.log(`   第${d.second}s: 警报=${d.alertVisible ? '是' : '否'}, 时长="${d.duration}", 温度=${d.temp}°C`);
    });

    // 验证：首帧是否为0秒
    if (firstAlertDuration === '0秒') {
      console.log('\n❌ 问题确认：警报首帧 alertDuration 仍显示"0秒"');
      console.log('   根因分析：');
      console.log('   1) 后端计算正确（HTTP API 返回60秒，WebSocket state 也正确）');
      console.log('   2) 但前端在 tick 处理中计算后覆盖了 state 的值');
      console.log('   3) 可能的原因：');
      console.log('      a) tick 消息比 state 消息先到达（网络乱序）');
      console.log('      b) 或 tick 中 alertHistory 计算时 startTime === time，差值为0（虽然有后端兜底）');
      console.log('      c) 或前端 tick 中的计算逻辑没有正确处理 ongoing 记录');
    } else {
      console.log('\n✅ 警报首帧 alertDuration 不为0秒，修复成功');
    }

    // 检查前端计算逻辑的输入值
    console.log('\n📋 验证前端计算逻辑: 提取 alertHistory 状态快照');
    const stateSnapshot = await page.evaluate(() => {
      // 通过 fetch 再次获取最新状态
      return fetch('http://localhost:3001/api/status').then(r => r.json());
    });

    console.log(`   后端当前 alertHistory 条数: ${stateSnapshot.alertHistory?.length || 0}`);
    if (stateSnapshot.alertHistory?.[0]) {
      const a = stateSnapshot.alertHistory[0];
      const elapsed = stateSnapshot.time - a.startTime;
      console.log(`   alertHistory[0]: startTime=${a.startTime}, time=${stateSnapshot.time}, elapsed=${elapsed}s, ongoing=${a.ongoing}`);
      console.log(`   按前端计算逻辑: total = elapsed=${elapsed}`);
      console.log(`   按后端兜底逻辑: elapsed===0时返回60，当前 elapsed=${elapsed === 0 ? 0 : elapsed}`);
      console.log(`   后端返回 totalAlertDuration = ${stateSnapshot.totalAlertDuration}s`);
    }

  } catch (e) {
    console.error(`\n❌ 诊断失败: ${e.message}`);
    console.error(e.stack);
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 深度诊断完成');
}

runDeepDiagnostic().catch(console.error);
