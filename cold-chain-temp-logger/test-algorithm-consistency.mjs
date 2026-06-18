import WebSocket from 'ws';

async function test() {
  console.log('=== 前后端 totalAlertDuration 算法一致性验证测试 ===\n');

  const results = await new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:3001');
    const discrepancies = [];
    let alertTriggered = false;
    let firstAlertChecks = [];
    let lastStateTotal = null;
    let lastTickRecord = null;
    let alertHistoryCache = null;
    let messageLog = [];

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('测试超时'));
    }, 15000);

    ws.on('open', () => {
      console.log('✅ WebSocket 已连接');
      setTimeout(() => {
        ws.send(JSON.stringify({ action: 'door', open: true }));
        console.log('🚪 已发送开门指令');
      }, 3000);
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'init') {
        alertHistoryCache = msg.state.alertHistory || [];
        messageLog.push('init');
      }
      
      if (msg.type === 'state') {
        lastStateTotal = msg.totalAlertDuration;
        alertHistoryCache = msg.alertHistory || [];
        messageLog.push(`state:total=${msg.totalAlertDuration}`);
        
        if (msg.isAlert && !alertTriggered) {
          alertTriggered = true;
          console.log(`\n🔴 警报触发！后端 state totalAlertDuration = ${msg.totalAlertDuration}s`);
          console.log(`   alertHistory 长度: ${msg.alertHistory.length}`);
          console.log(`   首条 ongoing 警报: startTime=${msg.alertHistory[0]?.startTime}, ongoing=${msg.alertHistory[0]?.ongoing}`);
          
          const backendElapsed = msg.time - msg.alertHistory[0]?.startTime;
          console.log(`   后端计算: time(${msg.time}) - startTime(${msg.alertHistory[0]?.startTime}) = ${backendElapsed}`);
          console.log(`   后端兜底: elapsed=0 → 返回60s，实际 total=${msg.totalAlertDuration}s`);
          
          firstAlertChecks.push({
            type: 'state',
            backendTotal: msg.totalAlertDuration,
            expectedTotal: 60,
            match: msg.totalAlertDuration === 60
          });
        }
      }
      
      if (msg.type === 'tick') {
        lastTickRecord = msg.record;
        messageLog.push(`tick:temp=${msg.record.temperature.toFixed(1)},alert=${msg.record.isAlert}`);
        
        // 模拟前端算法（与修复后代码完全一致）
        if (alertHistoryCache && alertHistoryCache.length > 0 && msg.record.isAlert) {
          let total = 0;
          let hasOngoing = false;
          for (const alert of alertHistoryCache) {
            if (alert.ongoing) {
              const elapsed = msg.record.time - alert.startTime;
              total += elapsed === 0 ? 60 : elapsed;
              hasOngoing = true;
            } else if (alert.endTime !== null) {
              total += alert.endTime - alert.startTime;
            }
          }
          if (msg.record.isAlert && !hasOngoing) {
            total += 60;
          }
          
          // 对比前后端
          if (lastStateTotal !== null) {
            const match = total === lastStateTotal;
            if (!match && Math.abs(total - lastStateTotal) > 1) {
              discrepancies.push({
                tick: messageLog.length,
                time: msg.record.time,
                frontendCalc: total,
                backendState: lastStateTotal,
                diff: total - lastStateTotal
              });
            }
            
            if (!firstAlertChecks.some(c => c.type === 'tick') && msg.record.isAlert && alertTriggered) {
              console.log(`\n📊 警报首帧算法对比:`);
              console.log(`   前端模拟计算 total = ${total}s (elapsed=0 时兜底为 60)`);
              console.log(`   后端 state 广播 total = ${lastStateTotal}s`);
              console.log(`   前后端一致? ${total === lastStateTotal ? '✅ 一致' : '❌ 不一致'}`);
              console.log(`   用户看到的首帧显示: "${Math.floor(total / 60)}分${total % 60}秒"`);
              
              firstAlertChecks.push({
                type: 'tick',
                frontendTotal: total,
                backendTotal: lastStateTotal,
                match: total === lastStateTotal,
                displayText: `${Math.floor(total / 60)}分${total % 60}秒`
              });
            }
          }
        }
      }
    });

    setTimeout(() => {
      clearTimeout(timeout);
      ws.close();
      
      resolve({
        firstAlertChecks,
        discrepancies,
        totalMessages: messageLog.length,
        alertTriggered
      });
    }, 12000);

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  console.log('\n=== 验证结果 ===\n');
  
  const checks = [
    {
      name: '警报首帧后端 state totalAlertDuration = 60s',
      pass: results.firstAlertChecks.find(c => c.type === 'state')?.match ?? false,
      desc: results.firstAlertChecks.find(c => c.type === 'state') 
        ? `后端返回 ${results.firstAlertChecks.find(c => c.type === 'state').backendTotal}s`
        : '未检测到警报'
    },
    {
      name: '警报首帧前端计算 = 后端 state 值',
      pass: results.firstAlertChecks.find(c => c.type === 'tick')?.match ?? false,
      desc: results.firstAlertChecks.find(c => c.type === 'tick')
        ? `前端=${results.firstAlertChecks.find(c => c.type === 'tick').frontendTotal}s, 后端=${results.firstAlertChecks.find(c => c.type === 'tick').backendTotal}s`
        : '未检测到警报'
    },
    {
      name: '用户看到首帧显示"1分0秒"',
      pass: results.firstAlertChecks.find(c => c.type === 'tick')?.displayText === '1分0秒',
      desc: results.firstAlertChecks.find(c => c.type === 'tick')
        ? `首帧显示文本: "${results.firstAlertChecks.find(c => c.type === 'tick').displayText}"`
        : '未检测到警报'
    },
    {
      name: '后续帧前后端计算无显著差异',
      pass: results.discrepancies.filter(d => Math.abs(d.diff) > 1).length === 0,
      desc: results.discrepancies.length === 0 
        ? '前后端完全一致，无差异'
        : `有 ${results.discrepancies.length} 帧差异 > 1s`
    }
  ];

  let allPass = true;
  checks.forEach(check => {
    console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
    console.log(`     ${check.desc}`);
    if (!check.pass) allPass = false;
  });

  console.log(`\n  警报触发? ${results.alertTriggered ? '✅ 是' : '❌ 否'}`);

  console.log(`\n${allPass ? '✅ 首帧显示修复完成！用户看不到"0秒"中间状态' : '❌ 仍存在问题'}`);
}

test().catch(console.error);
