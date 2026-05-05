<template>
  <div>
    <a-row :gutter="[16, 16]">
      <a-col :span="7">
        <a-card title="模型训练" bordered="false">
          <a-form layout="vertical">
            <a-form-item label="训练方法">
              <a-select v-model:value="trainMethod" style="width: 100%">
                <a-select-option value="standard">标准线性回归</a-select-option>
                <a-select-option value="minmax">MinMax 归一化</a-select-option>
              </a-select>
            </a-form-item>
            
            <a-form-item label="测试集比例">
              <a-slider v-model:value="testSize" :min="0.1" :max="0.5" :step="0.05" />
              <div style="text-align: center">{{ testSize }}</div>
            </a-form-item>

            <a-form-item>
              <a-button type="primary" @click="trainModel" :loading="training">
                训练模型
              </a-button>
            </a-form-item>
          </a-form>

          <a-divider />

          <a-card title="模型评估" bordered="false" size="small" v-if="modelMetrics">
            <a-descriptions :column="1" bordered size="small">
              <a-descriptions-item label="训练集 R²">{{ modelMetrics.train_r2?.toFixed(4) }}</a-descriptions-item>
              <a-descriptions-item label="测试集 R²">{{ modelMetrics.test_r2?.toFixed(4) }}</a-descriptions-item>
              <a-descriptions-item label="训练集 RMSE">{{ modelMetrics.train_rmse?.toFixed(2) }}</a-descriptions-item>
              <a-descriptions-item label="测试集 RMSE">{{ modelMetrics.test_rmse?.toFixed(2) }}</a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-card>

        <a-card title="房价预测" bordered="false" style="margin-top: 16px">
          <a-form layout="vertical">
            <a-form-item v-for="feature in featureSliders" :key="feature.name" :label="feature.label">
              <a-slider
                v-model:value="featureValues[feature.name]"
                :min="feature.min"
                :max="feature.max"
                :step="feature.step"
                @change="updatePrediction"
              />
              <div style="display: flex; justify-content: space-between">
                <span style="color: #999">{{ feature.min }}</span>
                <span style="font-weight: bold">{{ featureValues[feature.name] }}</span>
                <span style="color: #999">{{ feature.max }}</span>
              </div>
            </a-form-item>
          </a-form>

          <a-divider />

          <a-statistic title="预测房价" :value="predictedPrice" suffix="元/平方米" :precision="0">
            <template #prefix>
              <span style="color: #1890ff; font-size: 28px">¥</span>
            </template>
          </a-statistic>

          <a-form-item style="margin-top: 16px">
            <a-button @click="resetFeatures">重置默认值</a-button>
          </a-form-item>
        </a-card>
      </a-col>

      <a-col :span="17">
        <a-tabs v-model:activeKey="activeTab">
          <a-tab-pane key="importance" tab="特征重要性">
            <a-card bordered="false">
              <div ref="importanceChartRef" style="height: 450px; width: 100%"></div>
            </a-card>
          </a-tab-pane>

          <a-tab-pane key="residuals" tab="残差分析">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-card title="实际值 vs 预测值" bordered="false">
                  <div ref="actualPredChartRef" style="height: 400px; width: 100%"></div>
                </a-card>
              </a-col>
              <a-col :span="12">
                <a-card title="残差分布" bordered="false">
                  <div ref="residualDistChartRef" style="height: 400px; width: 100%"></div>
                </a-card>
              </a-col>
            </a-row>
          </a-tab-pane>

          <a-tab-pane key="data-info" tab="数据概览">
            <a-card bordered="false">
              <a-descriptions title="数据集基本信息" :column="3" bordered v-if="dataInfo">
                <a-descriptions-item label="样本数量">{{ dataInfo.row_count }}</a-descriptions-item>
                <a-descriptions-item label="特征数量">{{ dataInfo.column_count - 1 }}</a-descriptions-item>
                <a-descriptions-item label="目标变量">price (房价)</a-descriptions-item>
              </a-descriptions>

              <a-divider />

              <a-table 
                :columns="dataColumns" 
                :data-source="dataInfo?.sample_data || []"
                :pagination="false"
                size="small"
                bordered
                style="margin-top: 16px"
              >
              </a-table>
            </a-card>
          </a-tab-pane>

          <a-tab-pane key="history" tab="预测历史">
            <a-card bordered="false">
              <a-table 
                :columns="historyColumns" 
                :data-source="predictionHistory"
                :pagination="{ pageSize: 10 }"
                bordered
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'features'">
                    <a-tag v-for="(value, key) in JSON.parse(record.input_features)" :key="key" style="margin: 2px">
                      {{ key }}: {{ value }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'predicted_price'">
                    ¥{{ record.predicted_price?.toFixed(0) }}
                  </template>
                  <template v-else-if="column.key === 'created_at'">
                    {{ new Date(record.created_at).toLocaleString('zh-CN') }}
                  </template>
                </template>
              </a-table>
            </a-card>
          </a-tab-pane>
        </a-tabs>

        <a-card title="模型参数" bordered="false" style="margin-top: 16px" v-if="modelInfo">
          <a-descriptions :column="4" bordered size="small">
            <a-descriptions-item label="截距项">{{ modelInfo.intercept?.toFixed(4) }}</a-descriptions-item>
            <a-descriptions-item label="特征数量">{{ modelInfo.feature_names?.length }}</a-descriptions-item>
            <a-descriptions-item label="模型名称">{{ modelInfo.model_name || 'Linear Regression' }}</a-descriptions-item>
            <a-descriptions-item label="保存状态">{{ savedModelId ? '已保存 (ID: ' + savedModelId + ')' : '未保存' }}</a-descriptions-item>
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
import { regressionApi } from '../api'

const trainMethod = ref('standard')
const testSize = ref(0.2)
const training = ref(false)
const activeTab = ref('importance')
const predictedPrice = ref(0)
const modelMetrics = ref(null)
const modelInfo = ref(null)
const dataInfo = ref(null)
const savedModelId = ref(null)
const predictionHistory = ref([])

const featureSliders = ref([
  { name: 'year', label: '年份', min: 2015, max: 2025, step: 1, default: 2023 },
  { name: 'quarter', label: '季度', min: 1, max: 4, step: 1, default: 2 },
  { name: 'city_gdp', label: '城市 GDP (亿元)', min: 10000, max: 35000, step: 100, default: 28000 },
  { name: 'population', label: '城市人口 (万)', min: 800, max: 1000, step: 5, default: 900 },
  { name: 'interest_rate', label: '利率 (%)', min: 2.0, max: 8.0, step: 0.1, default: 3.5 },
  { name: 'unemployment_rate', label: '失业率 (%)', min: 1.0, max: 5.0, step: 0.1, default: 2.5 },
  { name: 'avg_income', label: '人均收入 (元)', min: 30000, max: 60000, step: 500, default: 48000 },
  { name: 'construction_cost', label: '建造成本 (元/平)', min: 2000, max: 5000, step: 50, default: 3500 },
  { name: 'land_price', label: '土地价格 (元/平)', min: 8000, max: 15000, step: 100, default: 12000 },
  { name: 'num_houses_sold', label: '销售套数', min: 1000, max: 3000, step: 50, default: 2000 },
  { name: 'inventory_level', label: '库存水平', min: 8000, max: 16000, step: 100, default: 10000 }
])

const featureValues = ref({})
const featureImportance = ref([])
const residualsData = ref(null)

const importanceChartRef = ref(null)
const actualPredChartRef = ref(null)
const residualDistChartRef = ref(null)

let importanceChart = null
let actualPredChart = null
let residualDistChart = null

const dataColumns = computed(() => {
  if (!dataInfo.value?.columns) return []
  return dataInfo.value.columns.map(col => ({
    title: col,
    dataIndex: col,
    key: col,
    width: 120
  }))
})

const historyColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '输入特征', dataIndex: 'input_features', key: 'features', ellipsis: true },
  { title: '预测价格', dataIndex: 'predicted_price', key: 'predicted_price', width: 150 },
  { title: '预测时间', dataIndex: 'created_at', key: 'created_at', width: 180 }
]

const initFeatureValues = () => {
  featureValues.value = {}
  featureSliders.value.forEach(feature => {
    featureValues.value[feature.name] = feature.default
  })
}

const loadDataInfo = async () => {
  try {
    const res = await regressionApi.getDataInfo()
    if (res.data.success) {
      dataInfo.value = res.data.data_info
    }
  } catch (error) {
    console.error('加载数据信息失败:', error)
  }
}

const loadPredictionHistory = async () => {
  try {
    const res = await regressionApi.getPredictionHistory({ limit: 20 })
    if (res.data.success) {
      predictionHistory.value = res.data.history
    }
  } catch (error) {
    console.error('加载预测历史失败:', error)
  }
}

const trainModel = async () => {
  training.value = true
  try {
    const scalingMethod = trainMethod.value === 'minmax' ? 'minmax' : 'standard'
    
    const res = await regressionApi.train({
      scaling_method: scalingMethod,
      test_size: testSize.value,
      save_to_db: true
    })
    
    if (res.data.success) {
      modelInfo.value = res.data.model_info
      modelMetrics.value = res.data.model_info.metrics
      featureImportance.value = res.data.model_info.feature_importance
      residualsData.value = res.data.model_info.residuals
      savedModelId.value = res.data.saved_model_id
      
      message.success('模型训练成功')
      
      await nextTick()
      renderCharts()
      loadPredictionHistory()
      updatePrediction()
    } else {
      message.error(res.data.error || '训练失败')
    }
  } catch (error) {
    message.error('请求失败: ' + error.message)
  } finally {
    training.value = false
  }
}

const updatePrediction = async () => {
  if (!modelInfo.value) {
    return
  }
  
  try {
    const res = await regressionApi.predict({
      features: featureValues.value,
      model_id: savedModelId.value,
      save_history: false
    })
    
    if (res.data.success) {
      predictedPrice.value = res.data.predicted_price
    }
  } catch (error) {
    console.error('预测失败:', error)
  }
}

const resetFeatures = () => {
  initFeatureValues()
  updatePrediction()
}

const renderCharts = () => {
  renderImportanceChart()
  renderActualPredChart()
  renderResidualDistChart()
}

const renderImportanceChart = () => {
  if (!importanceChartRef.value || !featureImportance.value.length) return
  
  if (!importanceChart) {
    importanceChart = echarts.init(importanceChartRef.value)
  }
  
  const data = featureImportance.value.map(item => ({
    name: item.feature,
    value: Math.abs(item.coefficient),
    coefficient: item.coefficient
  }))
  
  const option = {
    title: { text: '特征重要性排序', left: 'center' },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const item = params[0]
        const original = featureImportance.value.find(f => f.feature === item.name)
        return `
          <strong>${item.name}</strong><br/>
          重要性: ${item.value.toFixed(4)}<br/>
          系数: ${original?.coefficient?.toFixed(4)}
        `
      }
    },
    grid: { left: 120, right: 50, top: 60, bottom: 50 },
    xAxis: { type: 'value', name: '重要性 (系数绝对值)' },
    yAxis: { 
      type: 'category', 
      data: data.map(d => d.name).reverse(),
      axisLabel: { interval: 0 }
    },
    series: [{
      type: 'bar',
      data: data.map(d => d.value).reverse(),
      itemStyle: {
        color: (params) => {
          const idx = params.dataIndex
          const originalIdx = data.length - 1 - idx
          const original = featureImportance.value[originalIdx]
          return original?.coefficient >= 0 ? '#52c41a' : '#ff4d4f'
        }
      }
    }]
  }
  
  importanceChart.setOption(option)
}

const renderActualPredChart = () => {
  if (!actualPredChartRef.value || !residualsData.value) return
  
  if (!actualPredChart) {
    actualPredChart = echarts.init(actualPredChartRef.value)
  }
  
  const { actual, predicted } = residualsData.value
  const data = actual.map((a, idx) => [a, predicted[idx]])
  
  const minVal = Math.min(...actual, ...predicted)
  const maxVal = Math.max(...actual, ...predicted)
  
  const option = {
    title: { text: '实际值 vs 预测值', left: 'center' },
    tooltip: { trigger: 'item', formatter: '实际: {c[0]}<br/>预测: {c[1]}' },
    grid: { left: 60, right: 30, top: 60, bottom: 60 },
    xAxis: { type: 'value', name: '实际房价', min: minVal * 0.9, max: maxVal * 1.1 },
    yAxis: { type: 'value', name: '预测房价', min: minVal * 0.9, max: maxVal * 1.1 },
    series: [
      {
        type: 'scatter',
        data: data,
        symbolSize: 8,
        itemStyle: { color: '#1890ff', opacity: 0.7 }
      },
      {
        type: 'line',
        data: [[minVal * 0.9, minVal * 0.9], [maxVal * 1.1, maxVal * 1.1]],
        lineStyle: { color: '#ff4d4f', type: 'dashed' },
        symbol: 'none'
      }
    ]
  }
  
  actualPredChart.setOption(option)
}

const renderResidualDistChart = () => {
  if (!residualDistChartRef.value || !residualsData.value) return
  
  if (!residualDistChart) {
    residualDistChart = echarts.init(residualDistChartRef.value)
  }
  
  const { residuals } = residualsData.value
  
  const bins = 20
  const min = Math.min(...residuals)
  const max = Math.max(...residuals)
  const binWidth = (max - min) / bins
  
  const histogram = new Array(bins).fill(0)
  residuals.forEach(r => {
    const idx = Math.min(Math.floor((r - min) / binWidth), bins - 1)
    histogram[idx]++
  })
  
  const option = {
    title: { text: '残差分布直方图', left: 'center' },
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 30, top: 60, bottom: 60 },
    xAxis: { 
      type: 'category',
      data: histogram.map((_, idx) => {
        const lower = min + idx * binWidth
        return lower.toFixed(0)
      })
    },
    yAxis: { type: 'value', name: '频数' },
    series: [{
      type: 'bar',
      data: histogram,
      itemStyle: { color: '#722ed1' },
      barWidth: '80%'
    }]
  }
  
  residualDistChart.setOption(option)
}

const handleResize = () => {
  importanceChart?.resize()
  actualPredChart?.resize()
  residualDistChart?.resize()
}

onMounted(() => {
  initFeatureValues()
  loadDataInfo()
  loadPredictionHistory()
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
