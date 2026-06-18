import WebSocket from 'ws';

const WS_URL = 'ws://localhost:3001';

console.log('🔍 后端 WebSocket ambient 动作测试');
console.log('='.repeat(60));

const ws = new WebSocket(WS_URL);
let ambientTempBefore = null;
let ambientTempAfter = null;
let stateMessages = [];

ws.on('open', () => {
  console.log('✅ WebSocket 已连接');
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    
    if (msg.type === 'init') {
      ambientTempBefore = msg.state.ambientTemp;
      console.log(`📍 初始 ambientTemp: ${ambientTempBefore}°C`);
      console.log(`📍 初始 state 字段: ${Object.keys(msg.state).join(', ')}`);
      console.log(`📍 alertHistory 存在: ${'alertHistory' in msg.state}`);
      
      // 发送 ambient 调节消息
      console.log('\n📤 发送 ambient 调节消息，目标温度: 38°C');
      ws.send(JSON.stringify({ action: 'ambient', temp: 38 }));
      
      // 2秒后再发送 power 调节用于对比
      setTimeout(() => {
        console.log('\n📤 发送 power 调节消息，目标功率: 1000W（用于对比）');
        ws.send(JSON.stringify({ action: 'power', power: 1000 }));
      }, 2000);
    }
    
    if (msg.type === 'state') {
      stateMessages.push(msg);
      console.log(`\n📥 收到 state 消息:`);
      console.log(`   ambientTemp: ${msg.ambientTemp}°C`);
      console.log(`   refrigerationPower: ${msg.refrigerationPower}W`);
      console.log(`   字段: ${Object.keys(msg).join(', ')}`);
      console.log(`   alertHistory 存在: ${'alertHistory' in msg}`);
      
      if (ambientTempBefore !== null && ambientTempAfter === null && msg.ambientTemp !== ambientTempBefore) {
        ambientTempAfter = msg.ambientTemp;
        console.log(`\n✅ ambientTemp 已变化: ${ambientTempBefore}°C → ${ambientTempAfter}°C`);
      }
    }
    
    if (msg.type === 'tick') {
      // 忽略 tick 消息
    }
    
  } catch (e) {
    console.error('解析消息失败:', e.message);
  }
});

ws.on('error', (err) => {
  console.error('❌ WebSocket 错误:', err.message);
});

// 8秒后结束测试
setTimeout(() => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总:');
  console.log(`   初始 ambientTemp: ${ambientTempBefore}°C`);
  console.log(`   最终 ambientTemp: ${ambientTempAfter || '未变化'}°C`);
  console.log(`   ambient 调节是否生效: ${ambientTempAfter !== null && ambientTempAfter !== ambientTempBefore ? '✅ 是' : '❌ 否'}`);
  console.log(`   收到 state 消息数量: ${stateMessages.length}`);
  
  if (stateMessages.length > 0) {
    const lastState = stateMessages[stateMessages.length - 1];
    console.log(`   最后一条 state 包含 alertHistory: ${'alertHistory' in lastState ? '✅ 是' : '❌ 否'}`);
  }
  
  ws.close();
  console.log('\n✅ 测试完成');
  process.exit(0);
}, 8000);
