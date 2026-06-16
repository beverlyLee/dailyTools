import { calculateNutrientBalance } from './src/nutrientCalculator.js';
import { generateFertilizerPlan } from './src/fertilizerConverter.js';

function verifyWheatUreaUsage() {
  console.log('='.repeat(60));
  console.log('小麦尿素用量验证测试');
  console.log('='.repeat(60));

  const testCases = [
    {
      name: '中低产田（亩产400公斤）',
      targetYield: 400,
      soilNutrients: { N: 60, P2O5: 15, K2O: 100 }
    },
    {
      name: '中产田（亩产500公斤）',
      targetYield: 500,
      soilNutrients: { N: 80, P2O5: 20, K2O: 120 }
    },
    {
      name: '高产田（亩产600公斤）',
      targetYield: 600,
      soilNutrients: { N: 100, P2O5: 25, K2O: 150 }
    }
  ];

  console.log('\n农艺常识范围：');
  console.log('  - 小麦每100公斤产量需纯氮约3.0公斤');
  console.log('  - 尿素含氮量46%，当季利用率35%');
  console.log('  - 亩产500公斤小麦尿素用量通常在25-40公斤/亩');
  console.log('');

  let allPassed = true;

  for (const testCase of testCases) {
    console.log('-'.repeat(60));
    console.log(`测试案例：${testCase.name}`);
    console.log(`  目标产量：${testCase.targetYield} 公斤/亩`);
    console.log(`  土壤养分：N=${testCase.soilNutrients.N}mg/kg, P=${testCase.soilNutrients.P2O5}mg/kg, K=${testCase.soilNutrients.K2O}mg/kg`);

    const result = calculateNutrientBalance('wheat', testCase.targetYield, testCase.soilNutrients);
    
    console.log('');
    console.log('  养分计算结果：');
    console.log(`    需氮总量：${result.demand.N.toFixed(2)} 公斤/亩（理论：${(testCase.targetYield * 3.0 / 100).toFixed(2)}）`);
    console.log(`    土壤供氮：${result.supply.N.toFixed(2)} 公斤/亩`);
    console.log(`    需补纯氮：${result.fertilizerNeeded.N.toFixed(2)} 公斤/亩`);

    const fertilizerPlan = generateFertilizerPlan(result.fertilizerNeeded, 'traditional');
    const ureaItem = fertilizerPlan.items.find(item => item.fertilizer === '尿素');
    const ureaAmount = ureaItem ? ureaItem.amount : 0;

    console.log('');
    console.log('  商品肥换算：');
    console.log(`    尿素用量：${ureaAmount.toFixed(2)} 公斤/亩`);

    const expectedN = (testCase.targetYield * 3.0 / 100 - testCase.soilNutrients.N * 0.15) / 0.35;
    const expectedUrea = expectedN > 0 ? expectedN / 0.46 : 0;
    console.log(`    理论计算：${expectedUrea.toFixed(2)} 公斤/亩`);

    const minExpected = 20;
    const maxExpected = 45;
    const isInRange = ureaAmount >= minExpected && ureaAmount <= maxExpected;
    
    console.log('');
    console.log(`  验证结果：${isInRange ? '✅ 通过' : '❌ 失败'}`);
    console.log(`    期望值范围：${minExpected}-${maxExpected} 公斤/亩`);
    console.log(`    实际计算值：${ureaAmount.toFixed(2)} 公斤/亩`);
    
    if (!isInRange) {
      allPassed = false;
    }
    
    console.log('');

    console.log('  完整采购清单：');
    for (const item of fertilizerPlan.items) {
      console.log(`    ${item.fertilizer}: ${item.amount.toFixed(2)} 公斤/亩（${item.amount * item.price.toFixed(2)} 元/亩）`);
    }
    console.log(`    总投入：${fertilizerPlan.totalCost.toFixed(2)} 元/亩`);
  }

  console.log('='.repeat(60));
  console.log(`总体验证结果：${allPassed ? '✅ 全部通过' : '❌ 存在失败'}`);
  console.log('='.repeat(60));

  return allPassed;
}

verifyWheatUreaUsage();
