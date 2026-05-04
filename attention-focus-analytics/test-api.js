const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            rawData: data
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testApis() {
  console.log('=== 测试 API 连接 ===\n');

  try {
    console.log('1. 测试健康检查接口 GET /api/health');
    const healthResult = await makeRequest({
      hostname: '127.0.0.1',
      port: 3002,
      path: '/api/health',
      method: 'GET'
    });
    console.log('   状态码:', healthResult.statusCode);
    console.log('   响应:', JSON.stringify(healthResult.data, null, 2));
    console.log('');

    console.log('2. 测试概览接口 GET /api/analytics/overview');
    const overviewResult = await makeRequest({
      hostname: '127.0.0.1',
      port: 3002,
      path: '/api/analytics/overview',
      method: 'GET'
    });
    console.log('   状态码:', overviewResult.statusCode);
    console.log('   数据源:', overviewResult.data?.dataSource);
    console.log('   综合评分:', overviewResult.data?.data?.overall?.overallScore);
    console.log('');

    console.log('3. 测试模拟数据导入接口 POST /api/mock/import');
    const postData = JSON.stringify({ days: 7 });
    const importResult = await makeRequest({
      hostname: '127.0.0.1',
      port: 3002,
      path: '/api/mock/import',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, postData);
    console.log('   状态码:', importResult.statusCode);
    console.log('   响应:', JSON.stringify(importResult.data, null, 2));
    console.log('');

    console.log('4. 测试统计接口 GET /api/stats');
    const statsResult = await makeRequest({
      hostname: '127.0.0.1',
      port: 3002,
      path: '/api/stats',
      method: 'GET'
    });
    console.log('   状态码:', statsResult.statusCode);
    console.log('   响应:', JSON.stringify(statsResult.data, null, 2));
    console.log('');

    console.log('✅ 所有 API 测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

testApis();
