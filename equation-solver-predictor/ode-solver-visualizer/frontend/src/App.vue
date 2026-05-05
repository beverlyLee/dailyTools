<template>
  <div class="app-container">
    <header class="header">
      <h1>常微分方程数值解可视化系统</h1>
      <p>支持欧拉法、龙格-库塔法等多种数值求解算法 | 相平面分析 | 庞加莱截面 | 参数扫描</p>
    </header>

    <div class="main-content">
      <aside class="sidebar">
        <div class="panel">
          <h3 class="panel-title">经典方程模型</h3>
          <div class="example-list">
            <div
              v-for="example in examples"
              :key="example.key"
              :class="['example-item', { selected: selectedExample?.key === example.key }]"
              @click="selectExample(example)"
            >
              <div class="example-item-name">{{ example.name }}</div>
              <div class="example-item-desc">{{ example.description }}</div>
            </div>
          </div>
        </div>

        <template v-if="selectedExample">
          <div class="panel">
            <h3 class="panel-title">求解器设置</h3>
            <div class="form-group">
              <label class="form-label">数值方法</label>
              <select
                class="form-select"
                :value="solverMethod"
                @change="solverMethod = $event.target.value as any"
              >
                <option value="euler">欧拉法 (Euler)</option>
                <option value="rk4">龙格-库塔法 (RK4)</option>
                <option value="rk45">自适应步长 (RK45)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">时间范围 [t0, tf]</label>
              <div style="display: flex; gap: 8px">
                <input
                  type="number"
                  class="form-input"
                  :value="tStart"
                  @change="tStart = parseFloat($event.target.value) || 0"
                  style="width: 50%"
                />
                <input
                  type="number"
                  class="form-input"
                  :value="tEnd"
                  @change="tEnd = parseFloat($event.target.value) || 50"
                  style="width: 50%"
                />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">时间步数: {{ numPoints }}</label>
              <input
                type="range"
                class="param-slider"
                min="100"
                max="10000"
                step="100"
                :value="numPoints"
                @change="numPoints = parseInt($event.target.value)"
              />
            </div>
          </div>

          <div class="panel">
            <h3 class="panel-title">初始条件</h3>
            <div
              v-for="(ic, idx) in initialConditions"
              :key="idx"
              class="form-group"
            >
              <label class="form-label">{{ selectedExample.variables[idx] }}</label>
              <input
                type="number"
                class="form-input"
                step="any"
                :value="ic"
                @change="handleInitialConditionChange(idx, parseFloat($event.target.value) || 0)"
              />
            </div>
          </div>

          <div class="panel">
            <h3 class="panel-title">方程参数</h3>
            <div
              v-for="paramName in paramNames"
              :key="paramName"
              class="form-group"
            >
              <label class="form-label">{{ paramName }}</label>
              <input
                type="number"
                class="form-input"
                step="any"
                :value="parameters[paramName]"
                @change="handleParameterChange(paramName, parseFloat($event.target.value) || 0)"
              />
              <div
                v-if="selectedExample.param_ranges[paramName]"
                class="param-value"
              >
                范围: [{{ selectedExample.param_ranges[paramName][0] }}, {{ selectedExample.param_ranges[paramName][1] }}]
              </div>
            </div>
          </div>

          <div class="panel">
            <h3 class="panel-title">操作</h3>
            <div style="display: flex; flex-direction: column; gap: 8px">
              <button
                class="btn btn-primary"
                @click="handleSolve"
                :disabled="isLoading"
              >
                <span v-if="isLoading" class="loading">
                  <span class="spinner"></span>求解中...
                </span>
                <span v-else>求解 ODE</span>
              </button>
              <button
                class="btn btn-secondary"
                @click="handlePoincare"
                :disabled="isLoading"
              >
                计算庞加莱截面
              </button>
              <button
                class="btn btn-secondary"
                @click="handleParameterScan"
                :disabled="isLoading"
              >
                参数扫描
              </button>
            </div>
          </div>

          <div class="panel">
            <h3 class="panel-title">庞加莱截面设置</h3>
            <div class="form-group">
              <label class="form-label">截面维度</label>
              <select
                class="form-select"
                :value="planeDimension"
                @change="planeDimension = parseInt($event.target.value)"
              >
                <option
                  v-for="(v, idx) in selectedExample.variables"
                  :key="idx"
                  :value="idx"
                >
                  {{ v }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">截面值: {{ planeValue.toFixed(2) }}</label>
              <input
                type="range"
                class="param-slider"
                min="-50"
                max="50"
                step="0.1"
                :value="planeValue"
                @change="planeValue = parseFloat($event.target.value)"
              />
            </div>
            <div class="form-group">
              <label class="form-label">穿越方向</label>
              <select
                class="form-select"
                :value="poincareDirection"
                @change="poincareDirection = parseInt($event.target.value)"
              >
                <option :value="1">正方向 (+)</option>
                <option :value="-1">负方向 (-)</option>
                <option :value="0">双向</option>
              </select>
            </div>
          </div>

          <div class="panel">
            <h3 class="panel-title">参数扫描设置</h3>
            <div class="form-group">
              <label class="form-label">扫描参数</label>
              <select
                class="form-select"
                :value="scanParameter"
                @change="handleScanParameterChange($event.target.value)"
              >
                <option
                  v-for="param in paramNames"
                  :key="param"
                  :value="param"
                >
                  {{ param }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">参数范围</label>
              <div style="display: flex; gap: 8px">
                <input
                  type="number"
                  class="form-input"
                  step="any"
                  :value="scanStart"
                  @change="scanStart = parseFloat($event.target.value) || 0"
                  style="width: 50%"
                />
                <input
                  type="number"
                  class="form-input"
                  step="any"
                  :value="scanEnd"
                  @change="scanEnd = parseFloat($event.target.value) || 100"
                  style="width: 50%"
                />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">扫描点数: {{ scanSteps }}</label>
              <input
                type="range"
                class="param-slider"
                min="2"
                max="100"
                :value="scanSteps"
                @change="scanSteps = parseInt($event.target.value)"
              />
            </div>
          </div>
        </template>
      </aside>

      <main class="main-area">
        <div v-if="error" class="message message-error">
          {{ error }}
        </div>

        <div
          v-if="!solutionData && !poincareData && !scanData"
          class="viz-panel"
        >
          <div class="loading" style="flex-direction: column; gap: 16px">
            <div style="font-size: 1.25rem; color: #3b82f6; font-weight: 600">
              请选择方程模型并开始求解
            </div>
            <div style="color: #64748b; text-align: center; max-width: 500px">
              <p style="margin-bottom: 8px">左侧面板提供了多种经典常微分方程模型：</p>
              <ul
                style="list-style-position: inside; text-align: left; margin: 0 auto; max-width: 350px"
              >
                <li><strong>洛伦兹吸引子</strong> - 三维混沌系统，展现蝴蝶效应</li>
                <li><strong>捕食者-猎物模型</strong> - 生态系统种群动态</li>
                <li><strong>范德波尔振荡器</strong> - 非线性极限环</li>
                <li><strong>单摆</strong> - 经典力学系统</li>
                <li>以及更多...</li>
              </ul>
            </div>
          </div>
        </div>

        <template v-if="solutionData || poincareData || scanData">
          <nav class="tab-nav">
            <button
              :class="['tab-btn', { active: activeTab === 'solution' }]"
              @click="activeTab = 'solution'"
            >
              时间序列
            </button>
            <button
              :class="['tab-btn', { active: activeTab === 'phase' }]"
              @click="activeTab = 'phase'"
              :disabled="!solutionData"
            >
              相平面图
            </button>
            <button
              :class="['tab-btn', { active: activeTab === 'poincare' }]"
              @click="activeTab = 'poincare'"
              :disabled="!poincareData"
            >
              庞加莱截面
            </button>
            <button
              :class="['tab-btn', { active: activeTab === 'scan' }]"
              @click="activeTab = 'scan'"
              :disabled="!scanData"
            >
              参数扫描
            </button>
          </nav>

          <div
            v-if="activeTab === 'solution' && solutionData"
            class="viz-panel"
          >
            <div class="viz-header">
              <h3 class="viz-title">
                时间序列图 - {{ solutionData.equation_name }}
              </h3>
              <div style="font-size: 0.875rem; color: #64748b">
                求解方法: {{ solutionData.solver_method.toUpperCase() }}
              </div>
            </div>
            <div class="viz-content">
              <TimeSeriesPlot
                :time="solutionData.time"
                :states="solutionData.states"
                :variables="solutionData.variables"
              />
            </div>
          </div>

          <div
            v-if="activeTab === 'phase' && solutionData"
            class="viz-panel"
          >
            <div class="viz-header">
              <h3 class="viz-title">
                相平面图 - {{ solutionData.equation_name }}
              </h3>
            </div>
            <div class="viz-content">
              <PhasePortrait
                :states="solutionData.states"
                :variables="solutionData.variables"
              />
            </div>
          </div>

          <div
            v-if="activeTab === 'poincare' && poincareData"
            class="viz-panel"
          >
            <div class="viz-header">
              <h3 class="viz-title">
                庞加莱截面 - {{ poincareData.equation_name }}
              </h3>
              <div style="font-size: 0.875rem; color: #64748b">
                截面: {{ poincareData.plane_variable }} = {{ poincareData.plane_value }}
              </div>
            </div>
            <div class="viz-content">
              <PoincarePlot
                :points="poincareData.points"
                :variables="poincareData.remaining_variables"
                :analysis="poincareData.analysis"
              />
            </div>
          </div>

          <div
            v-if="activeTab === 'scan' && scanData"
            class="viz-panel"
          >
            <div class="viz-header">
              <h3 class="viz-title">参数扫描结果</h3>
            </div>
            <div class="viz-content">
              <ParameterScanPlot :scan-data="scanData" />
            </div>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { odeApi } from './lib/api';
import type {
  ClassicExample,
  SolutionData,
  PoincareData,
  ParameterScanData,
  SolverMethodType,
  TabType,
} from './types';
import TimeSeriesPlot from './components/TimeSeriesPlot.vue';
import PhasePortrait from './components/PhasePortrait.vue';
import PoincarePlot from './components/PoincarePlot.vue';
import ParameterScanPlot from './components/ParameterScanPlot.vue';

const examples = ref<ClassicExample[]>([]);
const selectedExample = ref<ClassicExample | null>(null);

const solverMethod = ref<SolverMethodType>('rk4');
const initialConditions = ref<number[]>([]);
const parameters = ref<Record<string, number>>({});

const tStart = ref(0);
const tEnd = ref(50);
const numPoints = ref(1000);

const activeTab = ref<TabType>('solution');
const isLoading = ref(false);
const error = ref<string | null>(null);

const solutionData = ref<SolutionData | null>(null);
const poincareData = ref<PoincareData | null>(null);
const scanData = ref<ParameterScanData | null>(null);

const planeDimension = ref(0);
const planeValue = ref(0);
const poincareDirection = ref(1);

const scanParameter = ref('');
const scanStart = ref(0);
const scanEnd = ref(100);
const scanSteps = ref(20);

const paramNames = computed(() => {
  if (!selectedExample.value) return [];
  return Object.keys(selectedExample.value.default_params);
});

onMounted(() => {
  loadExamples();
});

const loadExamples = async () => {
  try {
    const data = await odeApi.getExamples();
    examples.value = data;
    if (data.length > 0) {
      selectExample(data[0]);
    }
  } catch (err: any) {
    console.error('Failed to load examples:', err);
    error.value = err.message || '加载失败';
  }
};

const selectExample = (example: ClassicExample) => {
  selectedExample.value = example;
  initialConditions.value = [...example.default_initial];
  parameters.value = { ...example.default_params };
  tStart.value = example.t_span[0];
  tEnd.value = example.t_span[1];
  planeDimension.value = 0;
  planeValue.value = 0;

  const pNames = Object.keys(example.default_params);
  if (pNames.length > 0) {
    scanParameter.value = pNames[0];
    const range = example.param_ranges[pNames[0]];
    if (range) {
      scanStart.value = range[0];
      scanEnd.value = range[1];
    }
  }

  solutionData.value = null;
  poincareData.value = null;
  scanData.value = null;
  error.value = null;
};

const handleParameterChange = (key: string, value: number) => {
  parameters.value = { ...parameters.value, [key]: value };
};

const handleInitialConditionChange = (index: number, value: number) => {
  const newIC = [...initialConditions.value];
  newIC[index] = value;
  initialConditions.value = newIC;
};

const handleSolve = async () => {
  if (!selectedExample.value) return;

  isLoading.value = true;
  error.value = null;

  try {
    const response = await odeApi.solve({
      equation_key: selectedExample.value.key,
      initial_conditions: initialConditions.value,
      parameters: parameters.value,
      solver_method: solverMethod.value,
      t_start: tStart.value,
      t_end: tEnd.value,
      num_points: numPoints.value,
    });

    if (response.success) {
      solutionData.value = response.data;
      activeTab.value = 'solution';
    } else {
      error.value = response.message || '求解失败';
    }
  } catch (err: any) {
    error.value = err.message || '求解失败';
  } finally {
    isLoading.value = false;
  }
};

const handlePoincare = async () => {
  if (!selectedExample.value) return;

  isLoading.value = true;
  error.value = null;

  try {
    const response = await odeApi.computePoincare({
      equation_key: selectedExample.value.key,
      initial_conditions: initialConditions.value,
      parameters: parameters.value,
      solver_method: solverMethod.value,
      t_start: tStart.value,
      t_end: tEnd.value * 2,
      num_points: numPoints.value * 3,
      plane_dimension: planeDimension.value,
      plane_value: planeValue.value,
      direction: poincareDirection.value,
    });

    if (response.success) {
      poincareData.value = response.data;
      activeTab.value = 'poincare';
    } else {
      error.value = response.message || '庞加莱截面计算失败';
    }
  } catch (err: any) {
    error.value = err.message || '庞加莱截面计算失败';
  } finally {
    isLoading.value = false;
  }
};

const handleParameterScan = async () => {
  if (!selectedExample.value || !scanParameter.value) return;

  isLoading.value = true;
  error.value = null;

  try {
    const response = await odeApi.runParameterScan({
      equation_key: selectedExample.value.key,
      initial_conditions: initialConditions.value,
      parameters: parameters.value,
      scan_parameter: scanParameter.value,
      param_start: scanStart.value,
      param_end: scanEnd.value,
      param_steps: scanSteps.value,
      solver_method: solverMethod.value,
      t_start: tStart.value,
      t_end: tEnd.value,
      num_points: numPoints.value,
      save_to_db: true,
    });

    if (response.success) {
      scanData.value = response.data;
      activeTab.value = 'scan';
    } else {
      error.value = response.message || '参数扫描失败';
    }
  } catch (err: any) {
    error.value = err.message || '参数扫描失败';
  } finally {
    isLoading.value = false;
  }
};

const handleScanParameterChange = (param: string) => {
  scanParameter.value = param;
  if (selectedExample.value) {
    const range = selectedExample.value.param_ranges[param];
    if (range) {
      scanStart.value = range[0];
      scanEnd.value = range[1];
    }
  }
};
</script>
