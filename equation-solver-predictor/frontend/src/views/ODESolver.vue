<template>
  <div>
    <a-row :gutter="[16, 16]">
      <a-col :span="8">
        <a-card title="模型配置" bordered="false">
          <a-form layout="vertical">
            <a-form-item label="选择模型">
              <a-select v-model:value="selectedModel" style="width: 100%" @change="onModelChange">
                <a-select-option v-for="(model, key) in models" :key="key" :value="key">
                  {{ model.name }}
                </a-select-option>
              </a-select>
            </a-form-item>
            
            <a-form-item label="模型描述" v-if="currentModel">
              <a-textarea :value="currentModel.description" :rows="3" disabled />
            </a-form-item>

            <a-form-item label="求解方法">
              <a-select v-model:value="selectedMethod" style="width: 100%">
                <a-select-option v-for="(method, key) in methods" :key="key" :value="key">
                  {{ method.name }}
                </a-select-option>
              </a-select>
            </a-form-item>

            <a-divider>初始条件</a-divider>
            
            <a-form-item v-for="(ic, idx) in initialConditions" :key="idx" :label="`y${idx}`">
              <a-input-number v-model:value="initialConditions[idx]" style="width: 100%" :step="0.1" />
            </a-form-item>

            <a-divider>时间范围</a-divider>
            
            <a-row :gutter="8">
              <a-col :span="12">
                <a-form-item label="开始时间">
                  <a-input-number v-model:value="timeStart" style="width: 100%" :step="0.1" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="结束时间">
                  <a-input-number v-model:value="timeEnd" style="width: 100%" :step="0.1" />
                </a-form-item>
              </a-col>
            </a-row>
            
            <a-form-item label="时间步长">
              <a-input-number v-model:value="timeStep" style="width: 100%" :step="0.001" />
            </a-form-item>

            <a-divider>模型参数</a-divider>
            
            <a-form-item v-for="(value, key) in modelParams" :key="key" :label="key">
              <a-input-number v-model:value="modelParams[key]" style="width: 100%" :step="0.1" />
            </a-form-item>

            <a-form-item>
              <a-space>
                <a-button type="primary" @click="solveEquation" :loading="solving">
                  求解方程
                </a-button>
                <a-button @click="resetForm">重置</a-button>
              </a-space>
            </a-form-item>
          </a-form>
        </a-card>

        <a-card title="参数扫描" bordered="false" style="margin-top: 16px">
          <a-form layout="vertical">
            <a-form-item label="扫描参数">
              <a-select v-model:value="scanParam" style="width: 100%">
                <a-select-option v-for="(value, key) in modelParams" :key="key" :value="key">
                  {{ key }}
                </a-select-option>
              </a-select>
            </a-form-item>

            <a-row :gutter="8">
              <a-col :span="8">
                <a-form-item label="最小值">
                  <a-input-number v-model:value="scanRange[0]" style="width: 100%" :step="0.1" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="最大值">
                  <a-input-number v-model:value="scanRange[1]" style="width: 100%" :step="0.1" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="步数">
                  <a-input-number v-model:value="scanSteps" style="width: 100%" :min="2" />
                </a-form-item>
              </a-col>
            </a-row>

            <a-form-item>
              <a-button type="primary" @click="runParameterScan" :loading="scanning">
                开始扫描
              </a-button>
            </a-form-item>
          </a-form>
        </a-card>
      </a-col>

      <a-col :span="16">
        <a-tabs v-model:activeKey="activeTab">
          <a-tab-pane key="time" tab="时间序列图">
            <a-card bordered="false">
              <div ref="timeChartRef" style="height: 500px; width: 100%"></div>
            </a-card>
          </a-tab-pane>
          
          <a-tab-pane key="phase" tab="相空间图">
            <a-card bordered="false">
              <div ref="phaseChartRef" style="height: 500px; width: 100%"></div>
            </a-card>
          </a-tab-pane>
          
          <a-tab-pane key="poincare" tab="庞加莱截面" v-if="is3DModel">
            <a-card bordered="false">
              <div ref="poincareChartRef" style="height: 500px; width: 100%"></div>
            </a-card>
          </a-tab-pane>
          
          <a-tab-pane key="projection" tab="多视角投影" v-if="is3DModel">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-card title="x-y 平面投影" bordered="false" size="small">
                  <div ref="projectionXYRef" style="height: 220px; width: 100%"></div>
                </a-card>
              </a-col>
              <a-col :span="12">
                <a-card title="x-z 平面投影" bordered="false" size="small">
                  <div ref="projectionXZRef" style="height: 220px; width: 100%"></div>
                </a-card>
              </a-col>
              <a-col :span="24" style="margin-top: 16px">
                <a-card title="y-z 平面投影" bordered="false" size="small">
                  <div ref="projectionYZRef" style="height: 220px; width: 100%"></div>
                </a-card>
              </a-col>
            </a-row>
          </a-tab-pane>
          
          <a-tab-pane key="scan" tab="参数扫描结果">
            <a-card bordered="false">
              <div ref="scanChartRef" style="height: 500px; width: 100%"></div>
            </a-card>
          </a-tab-pane>
        </a-tabs>

        <a-card title="求解信息" bordered="false" style="margin-top: 16px" v-if="solutionResult">
          <a-descriptions :column="3" bordered size="small">
            <a-descriptions-item label="模型">{{ currentModel?.name }}</a-descriptions-item>
            <a-descriptions-item label="求解方法">{{ methods[selectedMethod]?.name }}</a-descriptions-item>
            <a-descriptions-item label="数据点数量">{{ solutionResult.solution.solution.length }}</a-descriptions-item>
            <a-descriptions-item label="时间范围">{{ timeStart }} - {{ timeEnd }}</a-descriptions-item>
            <a-descriptions-item label="时间步长">{{ timeStep }}</a-descriptions-item>
            <a-descriptions-item label="状态">成功</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { message } from 'ant-design-vue'
import { odeApi } from '../api'

const selectedModel = ref('lorenz')
const selectedMethod = ref('rk4')
const initialConditions = ref([1.0, 1.0, 1.0])
const timeStart = ref(0.0)
const timeEnd = ref(100.0)
const timeStep = ref(0.01)
const modelParams = ref({})
const models = ref({})
const methods = ref({})
const solving = ref(false)
const scanning = ref(false)
const solutionResult = ref(null)
const poincarePoints = ref([])
const scanResult = ref(null)
const activeTab = ref('time')

const scanParam = ref('sigma')
const scanRange = ref([0.0, 50.0])
const scanSteps = ref(10)

const timeChartRef = ref(null)
const phaseChartRef = ref(null)
const poincareChartRef = ref(null)
const projectionXYRef = ref(null)
const projectionXZRef = ref(null)
const projectionYZRef = ref(null)
const scanChartRef = ref(null)

let timeChart = null
let phaseChart = null
let poincareChart = null
let projectionXYChart = null
let projectionXZChart = null
let projectionYZChart = null
let scanChart = null

const currentModel = computed(() => models.value[selectedModel.value])
const is3DModel = computed(() => currentModel.value?.dimensions === 3)

const onModelChange = () => {
  if (currentModel.value) {
    initialConditions.value = [...currentModel.value.default_initial]
    modelParams.value = { ...currentModel.value.default_params }
  }
}

const loadModels = async () => {
  try {
    const res = await odeApi.getModels()
    if (res.data) {
      models.value = res.data
      onModelChange()
    }
  } catch (error) {
    message.error('加载模型列表失败')
  }
}

const loadMethods = async () => {
  try {
    const res = await odeApi.getMethods()
    if (res.data) {
      methods.value = res.data
    }
  } catch (error) {
    message.error('加载求解方法失败')
  }
}

const solveEquation = async () => {
  solving.value = true
  try {
    const res = await odeApi.solve({
      model_name: selectedModel.value,
      initial_conditions: initialConditions.value,
      time_span: [timeStart.value, timeEnd.value],
      dt: timeStep.value,
      method: selectedMethod.value,
      parameters: modelParams.value
    })
    
    if (res.data.success) {
      solutionResult.value = res.data
      poincarePoints.value = res.data.poincare_section || []
      
      await nextTick()
      renderCharts()
      message.success('方程求解成功')
    } else {
      message.error(res.data.error || '求解失败')
    }
  } catch (error) {
    message.error('请求失败: ' + error.message)
  } finally {
    solving.value = false
  }
}

const runParameterScan = async () => {
  scanning.value = true
  try {
    const res = await odeApi.parameterScan({
      model_name: selectedModel.value,
      initial_conditions: initialConditions.value,
      time_span: [timeStart.value, timeEnd.value],
      dt: timeStep.value,
      method: selectedMethod.value,
      param_name: scanParam.value,
      param_range: scanRange.value,
      n_steps: scanSteps.value
    })
    
    if (res.data.success) {
      scanResult.value = res.data
      activeTab.value = 'scan'
      await nextTick()
      renderScanChart()
      message.success('参数扫描完成')
    } else {
      message.error(res.data.error || '扫描失败')
    }
  } catch (error) {
    message.error('请求失败: ' + error.message)
  } finally {
    scanning.value = false
  }
}

const resetForm = () => {
  onModelChange()
  timeStart.value = 0.0
  timeEnd.value = 100.0
  timeStep.value = 0.01
  solutionResult.value = null
  scanResult.value = null
}

const renderCharts = () => {
  if (!solutionResult.value) return
  
  const { time, solution } = solutionResult.value.solution
  const nDim = solution[0].length
  
  renderTimeChart(time, solution, nDim)
  renderPhaseChart(solution, nDim)
  
  if (nDim === 3) {
    renderPoincareChart()
    renderProjectionCharts(solution)
  }
}

const renderTimeChart = (time, solution, nDim) => {
  if (!timeChartRef.value) return
  
  if (!timeChart) {
    timeChart = echarts.init(timeChartRef.value)
  }
  
  const series = []
  const labels = nDim === 3 ? ['x(t)', 'y(t)', 'z(t)'] : ['x(t)', 'v(t)']
  const colors = ['#5470c6', '#91cc75', '#fac858']
  
  for (let i = 0; i < nDim; i++) {
    series.push({
      name: labels[i],
      type: 'line',
      data: time.map((t, idx) => [t, solution[idx][i]]),
      lineStyle: { width: 1 },
      symbol: 'none',
      color: colors[i]
    })
  }
  
  const option = {
    title: { text: '时间序列图', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { data: labels, bottom: 10 },
    grid: { left: 50, right: 20, top: 60, bottom: 60 },
    xAxis: { type: 'value', name: 't' },
    yAxis: { type: 'value' },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100, bottom: 80 }
    ],
    series
  }
  
  timeChart.setOption(option)
}

const renderPhaseChart = (solution, nDim) => {
  if (!phaseChartRef.value) return
  
  if (!phaseChart) {
    phaseChart = echarts.init(phaseChartRef.value)
  }
  
  let option
  
  if (nDim === 3) {
    const data = solution.map(p => [p[0], p[1]])
    option = {
      title: { text: '相空间图 (x-y 平面)', left: 'center' },
      tooltip: { trigger: 'item' },
      grid: { left: 50, right: 20, top: 60, bottom: 50 },
      xAxis: { type: 'value', name: 'x' },
      yAxis: { type: 'value', name: 'y' },
      series: [{
        type: 'line',
        data: data,
        lineStyle: { width: 1 },
        symbol: 'none',
        color: '#5470c6'
      }]
    }
  } else {
    const data = solution.map(p => [p[0], p[1]])
    option = {
      title: { text: '相空间图 (x-v 平面)', left: 'center' },
      tooltip: { trigger: 'item' },
      grid: { left: 50, right: 20, top: 60, bottom: 50 },
      xAxis: { type: 'value', name: 'x' },
      yAxis: { type: 'value', name: 'v' },
      series: [{
        type: 'line',
        data: data,
        lineStyle: { width: 1.5 },
        symbol: 'none',
        color: '#91cc75'
      }]
    }
  }
  
  phaseChart.setOption(option)
}

const renderPoincareChart = () => {
  if (!poincareChartRef.value || !poincarePoints.value.length) return
  
  if (!poincareChart) {
    poincareChart = echarts.init(poincareChartRef.value)
  }
  
  const data = poincarePoints.value.map(p => [p[0], p[1]])
  
  const option = {
    title: { text: '庞加莱截面 (z=0 平面)', left: 'center' },
    tooltip: { trigger: 'item' },
    grid: { left: 50, right: 20, top: 60, bottom: 50 },
    xAxis: { type: 'value', name: 'x' },
    yAxis: { type: 'value', name: 'y' },
    series: [{
      type: 'scatter',
      data: data,
      symbolSize: 5,
      itemStyle: { color: '#ee6666' }
    }]
  }
  
  poincareChart.setOption(option)
}

const renderProjectionCharts = (solution) => {
  const renderSingleProjection = (chartRef, chartVar, data, xName, yName, color) => {
    if (!chartRef.value) return null
    
    if (!chartVar) {
      chartVar = echarts.init(chartRef.value)
    }
    
    const option = {
      tooltip: { trigger: 'item' },
      grid: { left: 50, right: 20, top: 30, bottom: 40 },
      xAxis: { type: 'value', name: xName },
      yAxis: { type: 'value', name: yName },
      series: [{
        type: 'line',
        data: data,
        lineStyle: { width: 1, color },
        symbol: 'none'
      }]
    }
    
    chartVar.setOption(option)
    return chartVar
  }
  
  const dataXY = solution.map(p => [p[0], p[1]])
  const dataXZ = solution.map(p => [p[0], p[2]])
  const dataYZ = solution.map(p => [p[1], p[2]])
  
  const newXYChart = renderSingleProjection(projectionXYRef, projectionXYChart, dataXY, 'x', 'y', '#5470c6')
  const newXZChart = renderSingleProjection(projectionXZRef, projectionXZChart, dataXZ, 'x', 'z', '#91cc75')
  const newYZChart = renderSingleProjection(projectionYZRef, projectionYZChart, dataYZ, 'y', 'z', '#fac858')
  
  if (newXYChart) projectionXYChart = newXYChart
  if (newXZChart) projectionXZChart = newXZChart
  if (newYZChart) projectionYZChart = newYZChart
}

const renderScanChart = () => {
  if (!scanChartRef.value || !scanResult.value) return
  
  if (!scanChart) {
    scanChart = echarts.init(scanChartRef.value)
  }
  
  const { parameter_name, parameter_values, summary } = scanResult.value.scan
  
  const series = []
  const dimensions = summary[0]?.mean?.length || 1
  const labels = dimensions === 3 ? ['x 均值', 'y 均值', 'z 均值'] : ['x 均值', 'v 均值']
  const colors = ['#5470c6', '#91cc75', '#fac858']
  
  for (let d = 0; d < dimensions; d++) {
    series.push({
      name: labels[d],
      type: 'line',
      data: parameter_values.map((p, idx) => {
        const item = summary[idx]
        return item?.error ? null : [p, item.mean[d]]
      }),
      lineStyle: { width: 2 },
      symbol: 'circle',
      symbolSize: 6,
      color: colors[d]
    })
  }
  
  const option = {
    title: { text: `参数扫描结果 (${parameter_name})`, left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { data: labels, bottom: 10 },
    grid: { left: 50, right: 20, top: 60, bottom: 60 },
    xAxis: { type: 'value', name: parameter_name },
    yAxis: { type: 'value', name: '状态变量均值' },
    series
  }
  
  scanChart.setOption(option)
}

const handleResize = () => {
  timeChart?.resize()
  phaseChart?.resize()
  poincareChart?.resize()
  projectionXYChart?.resize()
  projectionXZChart?.resize()
  projectionYZChart?.resize()
  scanChart?.resize()
}

onMounted(() => {
  loadModels()
  loadMethods()
  window.addEventListener('resize', handleResize)
})

watch(activeTab, () => {
  nextTick(() => {
    handleResize()
  })
})
</script>

<style scoped>
.ant-card {
  height: 100%;
}
</style>
