import { calculateNutrientBalance } from './src/nutrientCalculator.js';
import { generateFertilizerPlan } from './src/fertilizerConverter.js';
import { generateBlindFertilizationPlan, compareFertilizationPlans, FERTILIZER_PLAN_TYPE, generateApplicationPlan } from './src/applicationOptimizer.js';

function verifyWheatUreaUsage() {
  console.log('='.repeat(60));
  console.log('化肥配比计算器验证测试');
  console.log('='.repeat(60));

  const testCases = [
    {
      name: '中低产田（亩产400公斤）',
      cropType: 'wheat',
      targetYield: 400,
      soilNutrients: { N: 60, P2O5: 15, K2O: 100 }
    },
    {
      name: '中产田（亩产500公斤）',
      cropType: 'wheat',
      targetYield: 500,
      soilNutrients: { N: 80, P2O5: 20, K2O: 120 }
    },
    {
      name: '高产田（亩产600公斤）',
      cropType: 'wheat',
      targetYield: 600,
      soilNutrients: { N: 100, P2O5: 25, K2O: 150 }
    }
  ];

  console.log(`\n配肥方案类型：${FERTILIZER_PLAN_TYPE}`);
  console.log('\n验证项目：');
  console.log('  1. 尿素用量符合农艺常识范围（20-45公斤/亩）');
  console.log('  2. 采购清单与施肥方案总用量一致');
  console.log('  3. 精准施肥成本低于盲目施肥（节本金额 > 0）');
  console.log('');

  let allPassed = true;

  for (const testCase of testCases) {
    console.log('-'.repeat(60));
    console.log(`测试案例：${testCase.name}`);
    console.log(`  目标产量：${testCase.targetYield} 公斤/亩`);
    console.log(`  土壤养分：N=${testCase.soilNutrients.N}mg/kg, P=${testCase.soilNutrients.P2O5}mg/kg, K=${testCase.soilNutrients.K2O}mg/kg`);

    const result = calculateNutrientBalance(testCase.cropType, testCase.targetYield, testCase.soilNutrients);
    
    console.log('');
    console.log('  【验证1：尿素用量】');
    console.log(`    需氮总量：${result.demand.N.toFixed(2)} 公斤/亩`);
    console.log(`    土壤供氮：${result.supply.N.toFixed(2)} 公斤/亩`);
    console.log(`    需补纯氮：${result.fertilizerNeeded.N.toFixed(2)} 公斤/亩`);

    const fertilizerPlan = generateFertilizerPlan(result.fertilizerNeeded, FERTILIZER_PLAN_TYPE);
    const ureaItem = fertilizerPlan.items.find(item => item.fertilizer === '尿素');
    const ureaAmount = ureaItem ? ureaItem.amount : 0;

    console.log(`    尿素用量：${ureaAmount.toFixed(2)} 公斤/亩`);

    const minExpected = 20;
    const maxExpected = 45;
    const ureaInRange = ureaAmount >= minExpected && ureaAmount <= maxExpected;
    
    console.log(`    验证结果：${ureaInRange ? '✅ 通过' : '❌ 失败'}`);
    console.log(`    期望值范围：${minExpected}-${maxExpected} 公斤/亩`);
    
    if (!ureaInRange) {
      allPassed = false;
    }

    console.log('');
    console.log('  采购清单：');
    for (const item of fertilizerPlan.items) {
      console.log(`    ${item.fertilizer}: ${item.amount.toFixed(2)} 公斤/亩（${(item.amount * item.price).toFixed(2)} 元/亩）`);
    }
    console.log(`    总投入：${fertilizerPlan.totalCost.toFixed(2)} 元/亩`);

    console.log('');
    console.log('  【验证2：采购清单与施肥方案一致性】');
    const applicationPlan = generateApplicationPlan(result.fertilizerNeeded, testCase.cropType);
    
    const baseFertilizers = {};
    const topFertilizers = {};
    for (const stage of applicationPlan.stages) {
      for (const f of stage.fertilizers) {
        const amount = parseFloat(f.amount);
        if (stage.stage === '基肥') {
          baseFertilizers[f.name] = (baseFertilizers[f.name] || 0) + amount;
        } else {
          topFertilizers[f.name] = (topFertilizers[f.name] || 0) + amount;
        }
      }
    }

    const totalFertilizers = {};
    for (const [name, amount] of Object.entries(baseFertilizers)) {
      totalFertilizers[name] = (totalFertilizers[name] || 0) + amount;
    }
    for (const [name, amount] of Object.entries(topFertilizers)) {
      totalFertilizers[name] = (totalFertilizers[name] || 0) + amount;
    }

    let consistent = true;
    for (const item of fertilizerPlan.items) {
      const planAmount = totalFertilizers[item.fertilizer] || 0;
      const diff = Math.abs(item.amount - planAmount);
      if (diff > 0.01) {
        console.log(`    ❌ ${item.fertilizer}不一致：采购清单 ${item.amount.toFixed(2)}，施肥方案 ${planAmount.toFixed(2)}`);
        consistent = false;
      }
    }
    
    if (consistent) {
      console.log('    ✅ 通过：采购清单与施肥方案肥料用量一致');
    } else {
      allPassed = false;
    }

    const appTotalCost = parseFloat(applicationPlan.totalCost);
    const planTotalCost = fertilizerPlan.totalCost;
    const costDiff = Math.abs(appTotalCost - planTotalCost);
    if (costDiff < 0.01) {
      console.log('    ✅ 通过：采购清单与施肥方案总成本一致');
    } else {
      console.log(`    ❌ 总成本不一致：采购清单 ${planTotalCost.toFixed(2)}，施肥方案 ${appTotalCost.toFixed(2)}`);
      allPassed = false;
    }

    console.log('');
    console.log('  【验证3：节本增效方向】');
    const blindPlan = generateBlindFertilizationPlan(testCase.cropType, testCase.targetYield);
    const comparison = compareFertilizationPlans(fertilizerPlan, blindPlan, result.fertilizerNeeded);
    
    const costSaving = parseFloat(comparison.costComparison['节本金额']);
    const savingRate = parseFloat(comparison.costComparison['节本率']);
    
    console.log(`    精准施肥成本：${comparison.costComparison['精准施肥']}`);
    console.log(`    盲目施肥成本：${comparison.costComparison['盲目施肥']}`);
    console.log(`    节本金额：${comparison.costComparison['节本金额']}`);
    console.log(`    节本率：${comparison.costComparison['节本率']}`);
    
    const savingPositive = costSaving > 0;
    console.log(`    验证结果：${savingPositive ? '✅ 通过（节本金额为正）' : '❌ 失败（节本金额为负，反而更贵）'}`);
    
    if (!savingPositive) {
      allPassed = false;
    }

    console.log('');
  }

  console.log('='.repeat(60));
  console.log(`总体验证结果：${allPassed ? '✅ 全部通过' : '❌ 存在失败'}`);
  console.log('='.repeat(60));

  return allPassed;
}

verifyWheatUreaUsage();
