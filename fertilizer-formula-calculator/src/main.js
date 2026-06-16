import './style.css';
import { CROPS } from './agronomyData.js';
import { calculateNutrientBalance, formatNutrientResult } from './nutrientCalculator.js';
import { generateFertilizerPlan, formatFertilizerPlan } from './fertilizerConverter.js';
import { generateApplicationPlan, generateBlindFertilizationPlan, compareFertilizationPlans, generateCompletePlan } from './applicationOptimizer.js';

const format = (val) => val.toFixed(2);

function renderCropOptions() {
  const select = document.getElementById('cropType');
  for (const [key, crop] of Object.entries(CROPS)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = crop.name;
    select.appendChild(option);
  }
}

function renderNutrientResult(result) {
  const container = document.getElementById('nutrientResult');
  const formatted = formatNutrientResult(result, document.getElementById('cropType').value, parseFloat(document.getElementById('targetYield').value));

  let html = `<h3 class="text-lg font-semibold text-gray-800 mb-4">${formatted.cropInfo}</h3>`;

  for (const [sectionKey, section] of Object.entries(formatted)) {
    if (sectionKey === 'cropInfo') continue;
    html += `
      <div class="mb-6">
        <h4 class="font-medium text-gray-700 mb-2">${section.title}</h4>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                ${Object.keys(section.data).map(key => `<th>${key}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                ${Object.values(section.data).map(val => `<td>${val}</td>`).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

function renderFertilizerPlan(plan) {
  const container = document.getElementById('fertilizerResult');
  const formatted = formatFertilizerPlan(plan);

  let html = `<h3 class="text-lg font-semibold text-gray-800 mb-4">${formatted.title}</h3>`;

  html += `
    <div class="table-responsive mb-4">
      <table class="data-table">
        <thead>
          <tr>
            ${Object.keys(formatted.items[0]).map(key => `<th>${key}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${formatted.items.map(item => `
            <tr>
              ${Object.values(item).map(val => `<td>${val}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  html += `
    <div class="p-4 bg-gray-50 rounded-lg">
      ${Object.entries(formatted.summary).map(([key, val]) => `
        <div class="flex justify-between items-center">
          <span class="font-medium">${key}:</span>
          <span class="text-green-600 font-semibold">${val}</span>
        </div>
      `).join('')}
    </div>
  `;

  container.innerHTML = html;
}

function renderApplicationPlan(plan) {
  const container = document.getElementById('applicationResult');

  let html = `<h3 class="text-lg font-semibold text-gray-800 mb-4">${plan.crop}施肥方案</h3>`;

  for (const stage of plan.stages) {
    html += `
      <div class="result-card mb-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-semibold text-gray-800">${stage.stage}</h4>
          <span class="text-sm text-gray-500">${stage.timing}</span>
        </div>
        <p class="text-sm text-gray-600 mb-3">施用方法: ${stage.method}</p>
        
        <div class="mb-3">
          <h5 class="font-medium text-gray-700 mb-2">养分用量:</h5>
          <div class="flex flex-wrap gap-3">
            ${Object.entries(stage.nutrients).map(([key, val]) => `
              <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                ${key}: ${val} 公斤/亩
              </span>
            `).join('')}
          </div>
        </div>

        <div class="mb-3">
          <h5 class="font-medium text-gray-700 mb-2">肥料用量:</h5>
          <div class="flex flex-wrap gap-3">
            ${stage.fertilizers.map(f => `
              <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                ${f.name}: ${f.amount}
              </span>
            `).join('')}
          </div>
        </div>

        <div class="text-right font-medium text-gray-700">
          投入: <span class="text-green-600">${stage.cost}</span>
        </div>
      </div>
    `;
  }

  html += `
    <div class="p-4 saving-highlight rounded-lg">
      <div class="flex justify-between items-center text-lg">
        <span class="font-semibold">总投入:</span>
        <span class="text-green-600 font-bold">${plan.totalCost}</span>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function renderComparison(comparison, blindPlan) {
  const container = document.getElementById('comparisonResult');

  let html = `<h3 class="text-lg font-semibold text-gray-800 mb-4">${comparison.title}</h3>`;

  html += `
    <div class="result-card mb-4">
      <h4 class="font-medium text-gray-700 mb-3">养分投入对比（公斤/亩）</h4>
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>养分</th>
            <th>精准施肥</th>
            <th>盲目施肥</th>
            <th>差异</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(comparison.nutrientComparison).map(([nutrient, data]) => `
            <tr>
              <td class="font-medium">${nutrient}</td>
              <td>${data.精准施肥}</td>
              <td>${data.盲目施肥}</td>
              <td class="${parseFloat(data.差异) > 0 ? 'text-red-600' : 'text-green-600'}">
                ${parseFloat(data.差异) > 0 ? '+' : ''}${data.差异}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  `;

  html += `
    <div class="result-card saving-highlight mb-4">
      <h4 class="font-medium text-gray-700 mb-3">成本对比</h4>
      <div class="grid grid-cols-2 gap-4">
        ${Object.entries(comparison.costComparison).map(([key, val]) => `
          <div class="p-3 bg-white rounded-lg">
            <div class="text-sm text-gray-500">${key}</div>
            <div class="text-lg font-semibold ${key.includes('节本') ? 'text-green-600' : 'text-gray-800'}">${val}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  html += `
    <div class="result-card mb-4">
      <h4 class="font-medium text-gray-700 mb-3">节本增效分析</h4>
      <div class="space-y-2">
        ${comparison.benefits.map(benefit => `
          <div class="flex items-start">
            <svg class="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span class="text-gray-700">${benefit}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function handleCalculate(event) {
  event.preventDefault();

  const cropType = document.getElementById('cropType').value;
  const targetYield = parseFloat(document.getElementById('targetYield').value);
  const soilN = parseFloat(document.getElementById('soilN').value);
  const soilP = parseFloat(document.getElementById('soilP').value);
  const soilK = parseFloat(document.getElementById('soilK').value);

  if (!cropType || isNaN(targetYield) || isNaN(soilN) || isNaN(soilP) || isNaN(soilK)) {
    alert('请填写完整的输入信息');
    return;
  }

  const soilNutrients = {
    N: soilN,
    P2O5: soilP,
    K2O: soilK
  };

  const nutrientResult = calculateNutrientBalance(cropType, targetYield, soilNutrients);
  renderNutrientResult(nutrientResult);

  const fertilizerPlan = generateFertilizerPlan(nutrientResult.fertilizerNeeded, 'optimal');
  renderFertilizerPlan(fertilizerPlan);

  const applicationPlan = generateApplicationPlan(nutrientResult.fertilizerNeeded, cropType);
  renderApplicationPlan(applicationPlan);

  const blindPlan = generateBlindFertilizationPlan(cropType, targetYield);
  const comparison = compareFertilizationPlans(fertilizerPlan, blindPlan, nutrientResult.fertilizerNeeded);
  renderComparison(comparison, blindPlan);

  document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

function handleReset() {
  document.getElementById('calculatorForm').reset();
  document.getElementById('nutrientResult').innerHTML = '';
  document.getElementById('fertilizerResult').innerHTML = '';
  document.getElementById('applicationResult').innerHTML = '';
  document.getElementById('comparisonResult').innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
  renderCropOptions();
  
  document.getElementById('calculatorForm').addEventListener('submit', handleCalculate);
  document.getElementById('resetBtn').addEventListener('click', handleReset);

  document.getElementById('cropType').value = 'wheat';
  document.getElementById('targetYield').value = '500';
  document.getElementById('soilN').value = '80';
  document.getElementById('soilP').value = '20';
  document.getElementById('soilK').value = '120';
});

export {
  calculateNutrientBalance,
  generateFertilizerPlan,
  generateApplicationPlan,
  generateBlindFertilizationPlan,
  compareFertilizationPlans,
  generateCompletePlan
};
