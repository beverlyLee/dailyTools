import http from 'http';

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

async function runTest() {
  console.log('=== 冷链温度监测系统验证测试 ===\n');

  console.log('1. 重置模拟...');
  await httpPost('http://localhost:3001/api/control/reset', { productKey: 'litchi' });

  console.log('2. 获取初始状态...');
  let status = await httpGet('http://localhost:3001/api/status');
  console.log(`   初始温度: ${status.currentTemp.toFixed(2)}°C`);
  console.log(`   阈值: ${status.threshold}°C (荔枝阈值 0°C)`);
  console.log(`   是否告警: ${status.isAlert}`);

  console.log('\n3. 模拟开启车门...');
  await httpPost('http://localhost:3001/api/control/door', { open: true });

  console.log('4. 等待模拟运行（加速模拟12秒 ≈ 真实12分钟）...\n');

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  for (let i = 0; i < 12; i++) {
    await sleep(1000);
    status = await httpGet('http://localhost:3001/api/status');
    const mins = Math.floor(status.time / 60);
    console.log(`   [${mins}分钟] 温度: ${status.currentTemp.toFixed(2)}°C | 告警: ${status.isAlert ? '🔴 触发' : '🟢 正常'} | 车门: ${status.doorOpen ? '开启' : '关闭'}`);
    if (status.isAlert && status.currentTemp > status.threshold + 2) {
      console.log('\n✅ 温度越界警报已触发！温度曲线出现尖峰！');
      break;
    }
  }

  console.log('\n5. 关闭车门...');
  await httpPost('http://localhost:3001/api/control/door', { open: false });

  console.log('6. 等待温度回落...\n');
  for (let i = 0; i < 6; i++) {
    await sleep(1000);
    status = await httpGet('http://localhost:3001/api/status');
    const mins = Math.floor(status.time / 60);
    console.log(`   [${mins}分钟] 温度: ${status.currentTemp.toFixed(2)}°C | 告警: ${status.isAlert ? '🔴 触发' : '🟢 正常'}`);
  }

  console.log('\n7. 获取完整报告...');
  const report = await httpGet('http://localhost:3001/api/report');
  console.log(`   总运输时长: ${Math.floor(report.totalDuration / 60)}分钟`);
  console.log(`   越界累计: ${Math.floor(report.alertDuration / 60)}分钟`);
  console.log(`   越界次数: ${report.alertCount}`);
  console.log(`   最高温度: ${report.maxTemp.toFixed(2)}°C`);
  console.log(`   最低温度: ${report.minTemp.toFixed(2)}°C`);
  console.log(`   验收结论: ${report.isQualified ? '✅ 合格' : '❌ 不合格'}`);

  console.log('\n=== 测试结果 ===');
  if (report.maxTemp > report.threshold && report.alertCount > 0) {
    console.log('✅ PASS: 车门开启后温度曲线出现尖峰并触发红色越界警报！');
  } else {
    console.log('❌ FAIL: 温度未出现预期尖峰');
  }
}

runTest().catch(console.error);
