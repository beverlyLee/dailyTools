import WebSocket from 'ws';

async function test() {
  console.log('=== 冷链温度监测系统 - 首帧显示延迟验证测试 ===\n');

  const results = await new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:3001');
    let messageOrder = [];
    let firstAlertTick = null;
    let firstAlertTickTotalDuration = null;
    let firstAlertState = null;
    let firstAlertStateTotalDuration = null;
    let alertTriggered = false;
    let messageCount = 0;

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('测试超时 - 可能温度未达标'));
    }, 15000);

    ws.on('open', () => {
      console.log('✅ WebSocket 已连接');
      console.log('\n👉 3秒后发送开门指令...');
      setTimeout(() => {
        ws.send(JSON.stringify({ action: 'door', open: true }));
        console.log('🚪 已发送开门指令');
      }, 3000);
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      messageCount++;

      if (msg.type === 'tick') {
        messageOrder.push({ type: 'tick', temp: msg.record.temperature, isAlert: msg.record.isAlert, time: msg.record.time });
        
        if (msg.record.isAlert && !alertTriggered) {
          alertTriggered = true;
          firstAlertTick = msg.record;
          
          // 检查此时前端 state 中的 totalAlertDuration（模拟前端计算逻辑）
          // 由于我们无法直接访问前端 state，我们通过消息顺序和内容来验证
          console.log(`\n🔴 首次检测到越界警报！温度: ${msg.record.temperature.toFixed(2)}°C, 时间: ${Math.floor(msg.record.time / 60)}分钟`);
          console.log(`   消息顺序: 这是第 ${messageCount} 条消息`);
          console.log(`   之前的消息: ${messageOrder.slice(-5).map(m => m.type).join(' → ')}`);
          
          // 检查之前是否已经收到 state 消息（包含 alertHistory）
          const recentState = messageOrder.reverse().find(m => m.type === 'state');
          if (recentState) {
            console.log(`   ✅ 在 tick 之前已收到 state 消息，alertHistory 应已更新`);
          } else {
            console.log(`   ⚠️  在 tick 之前未收到 state 消息，依赖前端兜底逻辑`);
          }
          messageOrder.reverse(); // 恢复顺序
        }
      }
      
      if (msg.type === 'state') {
        messageOrder.push({ type: 'state', isAlert: msg.isAlert, totalAlertDuration: msg.totalAlertDuration, alertHistoryLen: msg.alertHistory?.length });
        
        if (msg.isAlert && !firstAlertState) {
          firstAlertState = msg;
          firstAlertStateTotalDuration = msg.totalAlertDuration;
          console.log(`\n📡 收到警报后的首条 state 消息:`);
          console.log(`   totalAlertDuration: ${msg.totalAlertDuration}s`);
          console.log(`   alertHistory 长度: ${msg.alertHistory?.length}`);
          console.log(`   ongoing: ${msg.alertHistory?.[msg.alertHistory.length - 1]?.ongoing}`);
          
          if (msg.totalAlertDuration > 0) {
            console.log(`   ✅ state 中的 totalAlertDuration 正确，不为 0`);
          } else {
            console.log(`   ❌ state 中的 totalAlertDuration 为 0，存在问题！`);
          }
        }
        
        // 检查警报触发后的第一条 state 的 totalAlertDuration
        if (alertTriggered && firstAlertState === null && msg.isAlert) {
          // 已在上面处理
        }
      }
    });

    // 12秒后结束测试
    setTimeout(() => {
      clearTimeout(timeout);
      ws.close();
      
      // 分析消息顺序
      const tickIndex = messageOrder.findIndex(m => m.type === 'tick' && m.isAlert);
      const stateIndex = messageOrder.findIndex(m => m.type === 'state' && m.isAlert);
      
      resolve({
        totalMessages: messageCount,
        firstAlertTickTemp: firstAlertTick?.temperature,
        firstAlertStateTotalDuration,
        stateBeforeFirstAlertTick: stateIndex !== -1 && tickIndex !== -1 && stateIndex < tickIndex,
        stateDurationValid: firstAlertStateTotalDuration > 0,
        messageOrderSample: messageOrder.slice(Math.max(0, tickIndex - 3), Math.min(messageOrder.length, tickIndex + 3)).map(m => m.type)
      });
    }, 12000);

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  console.log('\n=== 测试结果 ===\n');
  
  const checks = [
    {
      name: 'broadcastState 先于 broadcastTick 发送',
      pass: results.stateBeforeFirstAlertTick,
      desc: results.stateBeforeFirstAlertTick 
        ? `消息顺序: ${results.messageOrderSample.join(' → ')}`
        : `消息顺序: ${results.messageOrderSample.join(' → ')}，未满足 state 先于 tick`
    },
    {
      name: '首次警报 state 的 totalAlertDuration > 0',
      pass: results.stateDurationValid,
      desc: results.stateDurationValid
        ? `✅ 首帧 totalAlertDuration = ${results.firstAlertStateTotalDuration}s，不为 0`
        : `❌ 首帧 totalAlertDuration = ${results.firstAlertStateTotalDuration}s，显示延迟问题存在`
    }
  ];

  let allPass = true;
  checks.forEach(check => {
    console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
    console.log(`     ${check.desc}`);
    if (!check.pass) allPass = false;
  });

  console.log(`\n  总计收到 ${results.totalMessages} 条消息`);
  console.log(`  首次越界温度: ${results.firstAlertTickTemp?.toFixed(2)}°C`);

  console.log(`\n${allPass ? '✅ 首帧显示延迟问题已修复！' : '❌ 仍存在首帧显示延迟问题'}`);
}

test().catch(console.error);
