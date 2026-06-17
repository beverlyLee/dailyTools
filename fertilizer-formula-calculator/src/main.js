import './style.css';
import { CROPS, SOIL_TYPES } from './agronomyData.js';
import { calculateNutrientBalance, formatNutrientResult } from './nutrientCalculator.js';
import { generateFertilizerPlan, formatFertilizerPlan } from './fertilizerConverter.js';
import { 
  generateApplicationPlan, 
  generateBlindFertilizationPlan, 
  compareFertilizationPlans, 
  generateCompletePlan,
  FERTILIZER_PLAN_TYPE 
} from './applicationOptimizer.js';
import { 
  getCustomCrops, 
  saveCustomCrop, 
  deleteCustomCrop, 
  generateCropId,
  getDefaultCropTemplate 
} from './customCrops.js';

const format = (val) => val.toFixed(2);

let currentCustomCrops = {};
let editingCropId = null;
let growthStages = [];
let cropToDelete = null;
let errorTimeout = null;

function showError(message) {
  let errorEl = document.getElementById('globalError');
  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.id = 'globalError';
    errorEl.className = 'fixed top-4 right-4 z-[100] max-w-sm bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full opacity-0';
    errorEl.innerHTML = `
      <div class="flex items-start">
        <svg class="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
        </svg>
        <span id="globalErrorMessage" class="text-sm"></span>
      </div>
    `;
    document.body.appendChild(errorEl);
  }
  
  document.getElementById('globalErrorMessage').textContent = message;
  errorEl.classList.remove('translate-x-full', 'opacity-0');
  
  if (errorTimeout) clearTimeout(errorTimeout);
  errorTimeout = setTimeout(() => {
    errorEl.classList.add('translate-x-full', 'opacity-0');
  }, 4000);
}

function highlightField(fieldId) {
  const field = document.getElementById(fieldId);
  if (field) {
    field.classList.add('ring-2', 'ring-red-400', 'border-red-400');
    setTimeout(() => {
      field.classList.remove('ring-2', 'ring-red-400', 'border-red-400');
    }, 2500);
  }
}

function updateTargetYieldLimit() {
  const cropType = document.getElementById('cropType').value;
  const yieldInput = document.getElementById('targetYield');
  
  const isCustomCrop = cropType.startsWith('custom_');
  
  if (isCustomCrop) {
    yieldInput.max = '10000';
    yieldInput.step = '100';
    if (!yieldInput.placeholder.includes('番茄')) {
      yieldInput.placeholder = '例如：番茄 5000、小麦 500';
    }
  } else {
    yieldInput.max = '2000';
    yieldInput.step = '50';
    yieldInput.placeholder = '例如：500';
  }
  
  const currentValue = parseFloat(yieldInput.value);
  const maxVal = parseFloat(yieldInput.max);
  if (!isNaN(currentValue) && currentValue > maxVal) {
    yieldInput.value = maxVal;
  }
}

function renderSavedCropsList() {
  const section = document.getElementById('savedCropsSection');
  const list = document.getElementById('savedCropsList');
  
  currentCustomCrops = getCustomCrops();
  const crops = Object.entries(currentCustomCrops);
  
  if (crops.length === 0) {
    section.classList.add('hidden');
    return;
  }
  
  section.classList.remove('hidden');
  list.innerHTML = '';
  
  crops.forEach(([id, crop]) => {
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors';
    item.innerHTML = `
      <div class="flex-1 min-w-0">
        <div class="font-medium text-gray-800 truncate">${crop.name}</div>
        <div class="text-xs text-gray-500">
          N:${crop.nutrientUptake?.N?.toFixed(1) || '-'} P:${crop.nutrientUptake?.P2O5?.toFixed(1) || '-'} K:${crop.nutrientUptake?.K2O?.toFixed(1) || '-'}
          · ${crop.growthStages?.length || 0}个生育期
        </div>
      </div>
      <div class="flex items-center gap-1 ml-3">
        <button type="button" class="edit-crop-btn p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors" data-id="${id}" title="编辑">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        <button type="button" class="delete-crop-btn p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors" data-id="${id}" title="删除">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    `;
    list.appendChild(item);
  });
  
  list.querySelectorAll('.edit-crop-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      editCustomCrop(e.currentTarget.dataset.id);
    });
  });
  
  list.querySelectorAll('.delete-crop-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      handleDeleteCustomCrop(e.currentTarget.dataset.id);
    });
  });
}

function editCustomCrop(cropId) {
  const crop = currentCustomCrops[cropId];
  if (!crop) return;
  
  editingCropId = cropId;
  document.getElementById('formModeLabel').textContent = `✏️ 编辑：${crop.name}`;
  document.getElementById('formModeLabel').className = 'text-sm font-medium text-blue-700 mb-2';
  
  document.getElementById('customCropName').value = crop.name || '';
  document.getElementById('customCropUnit').value = crop.unit || '公斤/亩';
  document.getElementById('uptakeN').value = crop.nutrientUptake?.N || 2.5;
  document.getElementById('uptakeP2O5').value = crop.nutrientUptake?.P2O5 || 1.0;
  document.getElementById('uptakeK2O').value = crop.nutrientUptake?.K2O || 2.5;
  document.getElementById('baseMethod').value = crop.applicationMethod?.base || '深施（15-20cm）';
  document.getElementById('topMethod').value = crop.applicationMethod?.top || '条施或穴施';
  
  growthStages = crop.growthStages && crop.growthStages.length > 0
    ? crop.growthStages.map(s => ({ ...s }))
    : [...getDefaultCropTemplate().growthStages];
  
  renderGrowthStages();
}

function renderCropOptions() {
  const select = document.getElementById('cropType');
  const builtInGroup = document.getElementById('builtInCropsGroup');
  const customGroup = document.getElementById('customCropsGroup');
  
  const previousValue = select.value;
  currentCustomCrops = getCustomCrops();
  
  builtInGroup.innerHTML = '';
  for (const [key, crop] of Object.entries(CROPS)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = crop.name;
    builtInGroup.appendChild(option);
  }
  
  customGroup.innerHTML = '';
  const hasCustomCrops = Object.keys(currentCustomCrops).length > 0;
  customGroup.style.display = hasCustomCrops ? '' : 'none';
  
  for (const [key, crop] of Object.entries(currentCustomCrops)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = crop.name + ' (自定义)';
    customGroup.appendChild(option);
  }
  
  if (previousValue && (CROPS[previousValue] || currentCustomCrops[previousValue])) {
    select.value = previousValue;
  }
  
  updateTargetYieldLimit();
}

function renderSoilTypes() {
  const select = document.getElementById('soilType');
  
  for (const [key, soil] of Object.entries(SOIL_TYPES)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = `${soil.name}（${soil.region}）`;
    select.appendChild(option);
  }
}

function handleSoilTypeChange() {
  const soilType = document.getElementById('soilType').value;
  const descriptionEl = document.getElementById('soilDescription');
  const fertilityEl = document.getElementById('soilFertility');
  
  if (soilType === 'custom') {
    descriptionEl.classList.add('hidden');
    fertilityEl.classList.add('hidden');
    return;
  }
  
  const soil = SOIL_TYPES[soilType];
  if (soil) {
    descriptionEl.textContent = soil.description;
    descriptionEl.classList.remove('hidden');
    fertilityEl.textContent = soil.fertility;
    fertilityEl.classList.remove('hidden');
    
    document.getElementById('soilN').value = soil.typicalNutrients.N;
    document.getElementById('soilP').value = soil.typicalNutrients.P2O5;
    document.getElementById('soilK').value = soil.typicalNutrients.K2O;
  }
}

function renderNutrientResult(result, cropType, targetYield) {
  const container = document.getElementById('nutrientResult');
  const formatted = formatNutrientResult(result, cropType, targetYield, currentCustomCrops);

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
          <span class="text-sm text-gray-500">${stage.timing || ''}</span>
        </div>
        ${stage.method ? `<p class="text-sm text-gray-600 mb-3">施用方法: ${stage.method}</p>` : ''}
        
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
  const targetYieldStr = document.getElementById('targetYield').value;
  const targetYield = parseFloat(targetYieldStr);
  const soilNStr = document.getElementById('soilN').value;
  const soilN = parseFloat(soilNStr);
  const soilPStr = document.getElementById('soilP').value;
  const soilP = parseFloat(soilPStr);
  const soilKStr = document.getElementById('soilK').value;
  const soilK = parseFloat(soilKStr);
  const soilType = document.getElementById('soilType').value;
  const yieldMax = parseFloat(document.getElementById('targetYield').max);

  const errors = [];
  
  if (!cropType) {
    errors.push('请选择作物类型');
    highlightField('cropType');
  }
  
  if (!targetYieldStr || isNaN(targetYield)) {
    errors.push('请输入目标产量');
    highlightField('targetYield');
  } else if (targetYield < 50) {
    errors.push('目标产量不能低于50公斤/亩');
    highlightField('targetYield');
  } else if (targetYield > yieldMax) {
    errors.push(`目标产量不能超过${yieldMax}公斤/亩`);
    highlightField('targetYield');
  }
  
  if (!soilNStr || isNaN(soilN)) {
    errors.push('请输入土壤碱解氮含量');
    highlightField('soilN');
  } else if (soilN < 0) {
    errors.push('土壤碱解氮含量不能为负数');
    highlightField('soilN');
  }
  
  if (!soilPStr || isNaN(soilP)) {
    errors.push('请输入土壤有效磷含量');
    highlightField('soilP');
  } else if (soilP < 0) {
    errors.push('土壤有效磷含量不能为负数');
    highlightField('soilP');
  }
  
  if (!soilKStr || isNaN(soilK)) {
    errors.push('请输入土壤速效钾含量');
    highlightField('soilK');
  } else if (soilK < 0) {
    errors.push('土壤速效钾含量不能为负数');
    highlightField('soilK');
  }

  if (errors.length > 0) {
    showError('请检查输入：' + errors.join('；'));
    return;
  }

  const soilNutrients = {
    N: soilN,
    P2O5: soilP,
    K2O: soilK
  };

  const options = {
    customCrops: currentCustomCrops,
    soilType: soilType === 'custom' ? null : soilType
  };

  let completePlan;
  try {
    completePlan = generateCompletePlan(cropType, targetYield, soilNutrients, options);
  } catch (err) {
    showError('计算出错：' + err.message);
    console.error(err);
    return;
  }
  
  renderNutrientResult(completePlan.nutrientResult, cropType, targetYield);
  renderFertilizerPlan(completePlan.fertilizerPlan);
  renderApplicationPlan(completePlan.applicationPlan);
  renderComparison(completePlan.comparison, completePlan.blindPlan);

  document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleReset() {
  document.getElementById('calculatorForm').reset();
  document.getElementById('soilType').value = 'custom';
  document.getElementById('soilDescription').classList.add('hidden');
  document.getElementById('soilFertility').classList.add('hidden');
  document.getElementById('nutrientResult').innerHTML = '';
  document.getElementById('fertilizerResult').innerHTML = '';
  document.getElementById('applicationResult').innerHTML = '';
  document.getElementById('comparisonResult').innerHTML = '';
  
  document.getElementById('cropType').value = 'wheat';
  document.getElementById('targetYield').value = '500';
  document.getElementById('soilN').value = '80';
  document.getElementById('soilP').value = '20';
  document.getElementById('soilK').value = '120';
  
  updateTargetYieldLimit();
}

function openCustomCropModal() {
  editingCropId = null;
  document.getElementById('customCropForm').reset();
  
  document.getElementById('formModeLabel').textContent = '✨ 创建新作物';
  document.getElementById('formModeLabel').className = 'text-sm font-medium text-green-700 mb-2';
  
  const template = getDefaultCropTemplate();
  document.getElementById('customCropName').value = '';
  document.getElementById('customCropUnit').value = template.unit;
  document.getElementById('uptakeN').value = template.nutrientUptake.N;
  document.getElementById('uptakeP2O5').value = template.nutrientUptake.P2O5;
  document.getElementById('uptakeK2O').value = template.nutrientUptake.K2O;
  document.getElementById('baseMethod').value = template.applicationMethod.base;
  document.getElementById('topMethod').value = template.applicationMethod.top;
  
  growthStages = [...template.growthStages];
  renderGrowthStages();
  renderSavedCropsList();
  
  document.getElementById('customCropModal').classList.remove('hidden');
}

function closeCustomCropModal() {
  document.getElementById('customCropModal').classList.add('hidden');
  editingCropId = null;
  growthStages = [];
}

function renderGrowthStages() {
  const container = document.getElementById('growthStagesContainer');
  container.innerHTML = '';
  
  growthStages.forEach((stage, index) => {
    const stageEl = document.createElement('div');
    stageEl.className = 'flex items-center gap-3 p-3 bg-gray-50 rounded-lg';
    stageEl.innerHTML = `
      <div class="flex-1">
        <input type="text" class="input-field stage-name-input" placeholder="生育期名称" value="${stage.name}" data-index="${index}">
      </div>
      <div class="w-32">
        <input type="text" class="input-field stage-timing-input" placeholder="时间" value="${stage.timing || ''}" data-index="${index}">
      </div>
      <div class="w-24">
        <div class="relative">
          <input type="number" class="input-field pr-6 stage-ratio-input" placeholder="比例" value="${(stage.ratio * 100).toFixed(0)}" min="0" max="100" step="5" data-index="${index}">
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
        </div>
      </div>
      <button type="button" class="delete-stage-btn text-red-500 hover:text-red-700 p-2" data-index="${index}">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    `;
    container.appendChild(stageEl);
  });
  
  updateStageRatioSum();
  
  container.querySelectorAll('.stage-name-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      growthStages[index].name = e.target.value;
    });
  });
  
  container.querySelectorAll('.stage-timing-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      growthStages[index].timing = e.target.value;
    });
  });
  
  container.querySelectorAll('.stage-ratio-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      const value = parseFloat(e.target.value) || 0;
      growthStages[index].ratio = value / 100;
      updateStageRatioSum();
    });
  });
  
  container.querySelectorAll('.delete-stage-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      growthStages.splice(index, 1);
      renderGrowthStages();
    });
  });
}

function updateStageRatioSum() {
  const sum = growthStages.reduce((acc, s) => acc + (s.ratio || 0), 0);
  const sumEl = document.getElementById('stageRatioSum');
  sumEl.textContent = `合计：${(sum * 100).toFixed(0)}%`;
  
  if (Math.abs(sum - 1) < 0.01) {
    sumEl.classList.remove('text-red-600');
    sumEl.classList.add('text-green-600');
  } else {
    sumEl.classList.add('text-red-600');
    sumEl.classList.remove('text-green-600');
  }
}

function addGrowthStage() {
  growthStages.push({
    name: '',
    timing: '',
    ratio: 0.1
  });
  renderGrowthStages();
}

function handleSaveCustomCrop(e) {
  e.preventDefault();
  
  const name = document.getElementById('customCropName').value.trim();
  if (!name) {
    showError('请输入作物名称');
    highlightField('customCropName');
    return;
  }
  
  const uptakeN = parseFloat(document.getElementById('uptakeN').value);
  const uptakeP = parseFloat(document.getElementById('uptakeP2O5').value);
  const uptakeK = parseFloat(document.getElementById('uptakeK2O').value);
  
  if (isNaN(uptakeN) || uptakeN <= 0) {
    showError('氮吸收量必须大于0');
    highlightField('uptakeN');
    return;
  }
  if (isNaN(uptakeP) || uptakeP <= 0) {
    showError('磷吸收量必须大于0');
    highlightField('uptakeP2O5');
    return;
  }
  if (isNaN(uptakeK) || uptakeK <= 0) {
    showError('钾吸收量必须大于0');
    highlightField('uptakeK2O');
    return;
  }
  
  const sum = growthStages.reduce((acc, s) => acc + (s.ratio || 0), 0);
  if (Math.abs(sum - 1) > 0.01) {
    showError(`生育期施肥比例之和必须等于100%，当前为${(sum * 100).toFixed(0)}%`);
    return;
  }
  
  const validStages = growthStages.filter(s => s.name && s.ratio > 0);
  if (validStages.length === 0) {
    showError('请至少添加一个有效的生育期（需填写名称且比例>0）');
    return;
  }
  
  const cropData = {
    name,
    unit: document.getElementById('customCropUnit').value || '公斤/亩',
    nutrientUptake: {
      N: uptakeN,
      P2O5: uptakeP,
      K2O: uptakeK
    },
    growthStages: validStages,
    applicationMethod: {
      base: document.getElementById('baseMethod').value || '深施',
      top: document.getElementById('topMethod').value || '追肥'
    },
    baseFertilizerRatio: {
      N: validStages[0]?.ratio || 0.5,
      P2O5: validStages[0]?.ratio || 0.7,
      K2O: validStages[0]?.ratio || 0.7
    },
    topDressingRatio: {
      N: 1 - (validStages[0]?.ratio || 0.5),
      P2O5: 1 - (validStages[0]?.ratio || 0.7),
      K2O: 1 - (validStages[0]?.ratio || 0.7)
    },
    topDressingStage: validStages.length > 1 ? validStages[1].name : '旺盛生长期'
  };
  
  const cropId = editingCropId || generateCropId();
  saveCustomCrop(cropId, cropData);
  
  renderCropOptions();
  document.getElementById('cropType').value = cropId;
  updateTargetYieldLimit();
  
  renderSavedCropsList();
  
  const isEdit = !!editingCropId;
  editingCropId = null;
  document.getElementById('formModeLabel').textContent = `✅ 已${isEdit ? '更新' : '保存'}：${name}`;
  document.getElementById('formModeLabel').className = 'text-sm font-medium text-emerald-700 mb-2';
}

function handleDeleteCustomCrop(cropId) {
  cropToDelete = cropId;
  document.getElementById('deleteConfirmModal').classList.remove('hidden');
}

function confirmDelete() {
  if (cropToDelete) {
    deleteCustomCrop(cropToDelete);
    renderCropOptions();
    renderSavedCropsList();
    
    if (document.getElementById('cropType').value === cropToDelete) {
      document.getElementById('cropType').value = 'wheat';
      updateTargetYieldLimit();
    }
  }
  closeDeleteModal();
}

function closeDeleteModal() {
  document.getElementById('deleteConfirmModal').classList.add('hidden');
  cropToDelete = null;
}

document.addEventListener('DOMContentLoaded', () => {
  renderCropOptions();
  renderSoilTypes();
  
  document.getElementById('calculatorForm').addEventListener('submit', handleCalculate);
  document.getElementById('resetBtn').addEventListener('click', handleReset);
  document.getElementById('soilType').addEventListener('change', handleSoilTypeChange);
  document.getElementById('cropType').addEventListener('change', updateTargetYieldLimit);
  
  document.getElementById('openCustomCropBtn').addEventListener('click', openCustomCropModal);
  document.getElementById('closeCustomCropBtn').addEventListener('click', closeCustomCropModal);
  document.getElementById('cancelCustomCropBtn').addEventListener('click', closeCustomCropModal);
  document.getElementById('customCropForm').addEventListener('submit', handleSaveCustomCrop);
  document.getElementById('addGrowthStageBtn').addEventListener('click', addGrowthStage);
  
  document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
  document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

  document.getElementById('customCropModal').addEventListener('click', (e) => {
    if (e.target.id === 'customCropModal') {
      closeCustomCropModal();
    }
  });
  
  document.getElementById('deleteConfirmModal').addEventListener('click', (e) => {
    if (e.target.id === 'deleteConfirmModal') {
      closeDeleteModal();
    }
  });

  document.getElementById('cropType').value = 'wheat';
  document.getElementById('targetYield').value = '500';
  document.getElementById('soilN').value = '80';
  document.getElementById('soilP').value = '20';
  document.getElementById('soilK').value = '120';
  
  updateTargetYieldLimit();
});

export {
  calculateNutrientBalance,
  generateFertilizerPlan,
  generateApplicationPlan,
  generateBlindFertilizationPlan,
  compareFertilizationPlans,
  generateCompletePlan
};
