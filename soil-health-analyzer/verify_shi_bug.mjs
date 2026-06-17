const weights = { ph: 0.25, organicMatter: 0.25, nitrogen: 0.15, phosphorus: 0.15, potassium: 0.20 };

const testScores = {
  ph: 50,
  organicMatter: 50,
  nitrogen: 64,
  phosphorus: 58,
  potassium: 58
};

// 代码中的错误写法（缺少括号）
const wrongShi = Math.round(
  testScores.ph * weights.ph +
  testScores.organicMatter * weights.organicMatter +
  testScores.nitrogen * weights.nitrogen +
  testScores.phosphorus * weights.phosphorus +
  testScores.potassium * weights.potassium
* 10) / 10;

// 正确写法（有括号）
const correctShi = Math.round((
  testScores.ph * weights.ph +
  testScores.organicMatter * weights.organicMatter +
  testScores.nitrogen * weights.nitrogen +
  testScores.phosphorus * weights.phosphorus +
  testScores.potassium * weights.potassium
) * 10) / 10;

console.log('=== SHI计算BUG验证 ===');
console.log('各项分数: pH=50, OM=50, N=64, P=58, K=58');
console.log('');
console.log('代码中的计算（错误，无括号）:');
console.log('  实际计算逻辑: 50*0.25 + 50*0.25 + 64*0.15 + 58*0.15 + (58*0.20*10)');
console.log('  = 12.5 + 12.5 + 9.6 + 8.7 + (11.6*10)');
console.log('  = 12.5 + 12.5 + 9.6 + 8.7 + 116');
console.log('  =', wrongShi);
console.log('');
console.log('正确的计算（应有括号）:');
console.log('  实际计算逻辑: (50*0.25 + 50*0.25 + 64*0.15 + 58*0.15 + 58*0.20) * 10 / 10');
console.log('  = (12.5 + 12.5 + 9.6 + 8.7 + 11.6)');
console.log('  =', correctShi);
console.log('');
console.log('错误导致偏差:', (correctShi - wrongShi).toFixed(1), '分');
console.log('钾的权重被错误放大了10倍，权重从0.20变成了2.0！');
