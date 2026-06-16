#!/usr/bin/env node
import axios from 'axios';

const BASE = 'http://localhost:3002/api';

async function test() {
  console.log('='.repeat(60));
  console.log('智能灌溉系统 - 核心功能验证');
  console.log('='.repeat(60));

  // =============== 1. 健康检查 ===============
  console.log('\n✅ 1. 健康检查');
  const h = await axios.get(`${BASE}/health`);
  console.log('  状态:', h.data.success ? '正常' : '异常');

  // =============== 2. 场景一：无雨 - 正常生成处方 ===============
  console.log('\n' + '='.repeat(60));
  console.log('📌 场景一：未来无雨，土壤缺水 → 应该生成有效灌溉处方');
  console.log('='.repeat(60));

  const weatherNormal = await axios.get(`${BASE}/weather?city=%E5%8C%97%E4%BA%AC&forceRain=false`);
  const w1 = weatherNormal.data.data;
  console.log('\n🌤️  气象数据:');
  console.log('  hasEffectiveRain:', w1.hasEffectiveRain);
  console.log('  建议延后天数:', w1.suggestedDelayDays);
  console.log('  72h累计降水:', w1.totalExpectedRain?.toFixed(1), 'mm');

  const soilReq = {
    crop: { cropType: 'wheat', cropName: '冬小麦', growthStage: '拔节期', rootDepth: 80, plantingArea: 10, cropCoefficient: 1.15 },
    soil: { fieldCapacity: 28, wiltingPoint: 12, bulkDensity: 1.4, initialMoisture: 16, soilTexture: 'loam' },
    startDate: '2026-06-16', city: '北京'
  };
  const soilResp = await axios.post(`${BASE}/soil/simulate`, soilReq);
  const s1 = soilResp.data.data;
  console.log('\n🌱  土壤墒情:');
  console.log('  needsIrrigation:', s1.needsIrrigation);
  console.log('  当前水分亏缺:', s1.currentDeficit?.toFixed(1), 'mm');
  console.log('  出现亏缺天数:', JSON.stringify(s1.deficitDays));

  const presReq1 = {
    ...soilReq,
    soilSimulation: s1,
    weather: w1,
    pumpFlow: 50,
    irrigationEfficiency: 0.85,
    preferredDate: '2026-06-17',
    preferredTime: '08:00'
  };
  const presResp1 = await axios.post(`${BASE}/prescription/generate`, presReq1);
  const p1 = presResp1.data.data;
  console.log('\n💧  灌溉处方:');
  console.log('  isValid（有效处方）:', p1.isValid, p1.isValid ? '✅ 可执行' : '❌ 建议延后');
  if (p1.isValid) {
    console.log('  建议灌溉日期:', p1.recommendedDate, p1.recommendedTime);
    console.log('  需灌水深度:', p1.waterDepth?.toFixed(1), 'mm');
    console.log('  需灌水量:', p1.waterAmount?.toFixed(1), 'm³');
    console.log('  灌溉时长:', Math.floor(p1.durationMinutes/60), '小时', p1.durationMinutes%60, '分钟');
    console.log('  预计成本:', '¥' + p1.estimatedCost?.toFixed(2));
  }
  if (p1.delayReason) console.log('  延后原因:', p1.delayReason);

  // =============== 3. 场景二：未来两天中雨 - 自动延后（核心验证！） ===============
  console.log('\n' + '='.repeat(60));
  console.log('🚨 场景二（核心验证）：未来两天中雨，土壤缺水 → 应该自动延后灌溉！');
  console.log('='.repeat(60));

  const weatherRain = await axios.get(`${BASE}/weather?city=%E5%8C%97%E4%BA%AC&forceRain=true`);
  const w2 = weatherRain.data.data;
  console.log('\n🌧️  气象数据（模拟中雨）:');
  console.log('  hasEffectiveRain:', w2.hasEffectiveRain, w2.hasEffectiveRain ? '✅ 检测到有效降雨' : '');
  console.log('  建议延后天数:', w2.suggestedDelayDays, '天');
  console.log('  72h累计降水:', w2.totalExpectedRain?.toFixed(1), 'mm');
  console.log('  下次降雨日期:', w2.nextRainDate || '未知');

  const presReq2 = {
    ...soilReq,
    soilSimulation: s1,
    weather: w2,
    pumpFlow: 50,
    irrigationEfficiency: 0.85,
    preferredDate: '2026-06-17',
    preferredTime: '08:00'
  };
  const presResp2 = await axios.post(`${BASE}/prescription/generate`, presReq2);
  const p2 = presResp2.data.data;
  console.log('\n💧  灌溉处方（遇雨场景）:');
  console.log('  isValid（有效处方）:', p2.isValid, p2.isValid ? '' : '❌ 自动取消/延后');
  console.log('  delayReason（延后原因）:', p2.delayReason || '无');
  console.log('  suggestedAlternativeDate（建议替代日期）:', p2.suggestedAlternativeDate || '雨停后评估');
  
  // 验证核心断言
  const coreTestPassed = w2.hasEffectiveRain === true && p2.isValid === false && !!p2.delayReason;
  console.log('\n' + '='.repeat(60));
  console.log(coreTestPassed ? '✅✅✅ 核心验证通过：降雨检测 → 自动取消灌溉处方 ✅✅✅' : '❌❌❌ 核心验证失败 ❌❌❌');
  console.log('='.repeat(60));

  // =============== 4. 成本计算 ===============
  console.log('\n📊 4. 成本效益验证');
  const costReq = {
    config: { electricityPrice: 0.6, waterPrice: 2.5, pumpPower: 7.5, pumpFlow: 50, laborCostPerHour: 30 },
    waterAmount: 120,
    durationMinutes: 144,
    area: 10
  };
  const costResp = await axios.post(`${BASE}/cost/calculate`, costReq);
  const c = costResp.data.data;
  console.log('  单次灌溉总成本:', '¥' + c.totalCost.toFixed(2));
  console.log('  电费:¥' + c.electricityCost.toFixed(2), '| 水费:¥' + c.waterCost.toFixed(2), '| 人工:¥' + c.laborCost.toFixed(2));
  console.log('  单位面积成本: ¥' + c.unitCostPerMu.toFixed(2), '/亩');

  // =============== 5. 日历任务 CRUD ===============
  console.log('\n📅 5. 农事日历任务验证');
  const startISO = '2026-06-20T08:00:00+08:00';
  const endISO = '2026-06-20T10:24:00+08:00';
  const createReq = {
    title: '冬小麦-拔节期灌溉',
    start: startISO,
    end: endISO,
    status: 'pending',
    extendedProps: {
      prescriptionId: 'TEST-' + Date.now(),
      waterAmount: 120, durationMinutes: 144, estimatedCost: 450,
      cropType: 'wheat', cropName: '冬小麦', area: 10
    }
  };
  const createResp = await axios.post(`${BASE}/calendar/tasks`, createReq);
  const created = createResp.data.data;
  console.log('  创建任务:', createResp.data.success ? '✅' : '❌', 'ID:', created.id?.slice(0,8));
  console.log('  状态:', created.status);
  console.log('  FullCalendar backgroundColor:', created.backgroundColor, '| borderColor:', created.borderColor);

  // 更新状态为执行中
  await axios.patch(`${BASE}/calendar/tasks/${created.id}/status`, { status: 'in_progress' });
  const listResp = await axios.get(`${BASE}/calendar/tasks`);
  console.log('  任务列表数量:', listResp.data.data.length, '条');

  // 删除测试任务
  await axios.delete(`${BASE}/calendar/tasks/${created.id}`);
  const listAfter = await axios.get(`${BASE}/calendar/tasks`);
  console.log('  删除后剩余:', listAfter.data.data.length, '条');

  console.log('\n🎉 所有验证完成！');
}

test().catch(err => {
  console.error('测试失败:', err.response?.data || err.message);
  process.exit(1);
});
