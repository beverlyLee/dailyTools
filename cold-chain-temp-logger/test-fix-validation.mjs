import http from 'http';
import WebSocket from 'ws';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => resolve(JSON.parse(responseData)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function test() {
  console.log('=== 冷链温度监测系统 - 修复验证 ===\n');

  // 测试 1: /api/status 接口结构一致性
  console.log('【测试 1】 /api/status 接口字段完整性');
  const status = await httpGet('http://localhost:3001/api/status');
  const requiredFields = [
    'currentTemp', 'doorOpen', 'refrigerationPower', 'ambientTemp',
    'threshold', 'time', 'isAlert', 'totalAlertDuration', 'alertHistory'
  ];
  const missingFields = requiredFields.filter(f => !(f in status));
  if (missingFields.length === 0) {
    console.log('  ✅ PASS: /api/status 包含所有必需字段');
    console.log(`     - alertHistory 类型: ${Array.isArray(status.alertHistory) ? '数组 ✓' : '错误'}`);
    console.log(`     - 当前外界气温: ${status.ambientTemp}°C`);
  } else {
    console.log(`  ❌ FAIL: 缺少字段: ${missingFields.join(', ')}`);
  }

  // 测试 2: HTTP API /api/control/ambient 生效
  console.log('\n【测试 2】 HTTP API 调节外界气温');
  await httpPost('http://localhost:3001/api/control/ambient', { temp: 35 });
  const statusAfterHttp = await httpGet('http://localhost:3001/api/status');
  if (statusAfterHttp.ambientTemp === 35) {
    console.log('  ✅ PASS: HTTP API 调节外界气温生效（35°C）');
  } else {
    console.log(`  ❌ FAIL: 预期 35°C，实际 ${statusAfterHttp.ambientTemp}°C`);
  }

  // 测试 3: WebSocket ambient 动作生效
  console.log('\n【测试 3】 WebSocket ambient 动作');
  const wsTestResult = await new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:3001');
    let receivedState = null;
    let initReceived = false;

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket 超时'));
    }, 5000);

    ws.on('open', () => {
      console.log('     WebSocket 已连接');
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'init') {
        initReceived = true;
        console.log('     收到 init 消息');
        // 发送 ambient 调节
        ws.send(JSON.stringify({ action: 'ambient', temp: 40 }));
        console.log('     发送 ambient 动作 (40°C)');
      } else if (msg.type === 'state') {
        receivedState = msg;
        console.log(`     收到 state 消息，ambientTemp = ${msg.ambientTemp}°C`);
        if (msg.ambientTemp === 40) {
          clearTimeout(timeout);
          ws.close();
          resolve({ success: true, state: msg });
        }
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  if (wsTestResult.success) {
    console.log('  ✅ PASS: WebSocket ambient 动作生效（40°C）');
    // 验证 state 消息字段完整
    const stateFields = requiredFields.filter(f => f in wsTestResult.state);
    if (stateFields.length === requiredFields.length) {
      console.log('  ✅ PASS: WebSocket state 消息字段与 HTTP API 一致');
    } else {
      const missing = requiredFields.filter(f => !(f in wsTestResult.state));
      console.log(`  ⚠️ WARN: WebSocket state 缺少字段: ${missing.join(', ')}`);
    }
  } else {
    console.log('  ❌ FAIL: WebSocket ambient 动作未生效');
  }

  // 重置为默认值
  await httpPost('http://localhost:3001/api/control/reset', {});

  console.log('\n=== 验证完成 ===');
}

test().catch(console.error);
