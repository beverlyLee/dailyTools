import WebSocket from 'ws';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function test() {
  console.log('=== 冷链温度监测系统 - 优化验证测试 ===\n');

  // 连接 WebSocket
  const results = await new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:3001');
    const stateMessages = [];
    const tickMessages = [];
    let initState = null;
    let alertStartState = null;
    let alertEndState = null;
    let alertStartedAt = null;
    let alertEndedAt = null;

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('测试超时'));
    }, 20000);

    ws.on('open', () => {
      console.log('✅ WebSocket 已连接');
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'init') {
        initState = msg.state;
        console.log(`✅ 收到 init 消息，alertHistory 字段: ${'alertHistory' in msg.state ? '存在 ✓' : '缺失 ✗'}`);
        console.log(`   当前温度: ${msg.state.currentTemp.toFixed(2)}°C, 阈值: ${msg.state.threshold}°C`);
        
        // 发送开门指令，触发温度上升
        setTimeout(() => {
          console.log('\n👉 发送开门指令，模拟断链...');
          ws.send(JSON.stringify({ action: 'door', open: true }));
        }, 1000);
      }
      
      if (msg.type === 'state') {
        stateMessages.push(msg);
        
        // 记录警报开始的 state
        if (msg.isAlert && !alertStartState) {
          alertStartState = msg;
          alertStartedAt = Date.now();
          console.log(`\n🔴 警报开始（state 消息），totalAlertDuration: ${msg.totalAlertDuration}s`);
          console.log(`   alertHistory 长度: ${msg.alertHistory.length}`);
        }
        
        // 记录警报进行中的 state 频率
        if (msg.isAlert && alertStartState) {
          // 已经触发过了，不重复打日志
        }
      }
      
      if (msg.type === 'tick') {
        tickMessages.push(msg.record);
      }
    });

    // 8秒后关门
    setTimeout(() => {
      console.log('\n👉 发送关门指令...');
      ws.send(JSON.stringify({ action: 'door', open: false }));
    }, 8000);

    // 12秒后检查警报结束时是否有 state
    setTimeout(() => {
      // 获取最终状态
      console.log('\n📊 收集数据中...');
    }, 11000);

    // 15秒后总结
    setTimeout(() => {
      clearTimeout(timeout);
      ws.close();
      
      const lastState = stateMessages[stateMessages.length - 1];
      const alertStates = stateMessages.filter(s => s.isAlert);
      const normalAfterAlert = stateMessages.filter(s => !s.isAlert && stateMessages.indexOf(s) > stateMessages.findIndex(s => s.isAlert));
      
      resolve({
        totalStateMessages: stateMessages.length,
        totalTickMessages: tickMessages.length,
        initHasAlertHistory: initState && 'alertHistory' in initState,
        alertStartReceived: !!alertStartState,
        alertDuringMessages: alertStates.length,
        alertEndReceived: normalAfterAlert.length > 0,
        lastTotalAlertDuration: lastState ? lastState.totalAlertDuration : null,
        lastAlertHistoryLen: lastState ? lastState.alertHistory.length : null
      });
    }, 14000);

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  console.log('\n=== 测试结果 ===\n');
  
  const checks = [
    {
      name: 'init 消息包含 alertHistory 字段',
      pass: results.initHasAlertHistory,
      desc: '状态结构一致性：init 消息有 alertHistory'
    },
    {
      name: '警报开始时收到 state 广播',
      pass: results.alertStartReceived,
      desc: '实时性：警报触发时后端立即广播 state'
    },
    {
      name: '警报进行中持续广播 state',
      pass: results.alertDuringMessages >= 3,
      desc: `实时性：越界期间广播了 ${results.alertDuringMessages} 次 state`
    },
    {
      name: '警报结束时收到 state 广播',
      pass: results.alertEndReceived,
      desc: '一致性：警报结束时也广播 state，避免前端数据滞后'
    },
    {
      name: 'totalAlertDuration 非零（有越界发生）',
      pass: results.lastTotalAlertDuration > 0,
      desc: `正确性：累计越界时长 ${results.lastTotalAlertDuration} 秒`
    },
    {
      name: 'alertHistory 有记录',
      pass: results.lastAlertHistoryLen >= 1,
      desc: `完整性：alertHistory 有 ${results.lastAlertHistoryLen} 条记录`
    }
  ];

  let allPass = true;
  checks.forEach(check => {
    console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
    console.log(`     ${check.desc}`);
    if (!check.pass) allPass = false;
  });

  console.log(`\n  总计: state 消息 ${results.totalStateMessages} 条, tick 消息 ${results.totalTickMessages} 条`);

  console.log(`\n${allPass ? '✅ 所有测试通过！' : '❌ 部分测试失败'}`);
}

test().catch(console.error);
