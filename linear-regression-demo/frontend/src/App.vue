<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { 
  FeatureImportance, 
  ResidualData, 
  ModelMetadata,
  EvaluationMetrics,
  FeatureStatistic
} from './api'
import housingApi from './api'
import FeatureSlider from './components/FeatureSlider.vue'
import FeatureImportanceChart from './components/FeatureImportanceChart.vue'
import ResidualChart from './components/ResidualChart.vue'
import PredictionResult from './components/PredictionResult.vue'
import ModelMetrics from './components/ModelMetrics.vue'

const isLoading = ref(false)
const errorMessage = ref('')
const modelTrained = ref(false)
const modelId = ref<number | null>(null)

const evaluationMetrics = ref<EvaluationMetrics | null>(null)
const modelMetadata = ref<ModelMetadata | null>(null)
const featureImportance = ref<FeatureImportance[]>([])
const residuals = ref<ResidualData[]>([])
const featureStatistics = ref<Record<string, FeatureStatistic>>({})
const featureRanges = ref<Record<string, { min: number; max: number; mean: number; std: number }>>({})

const featureValues = ref<Record<string, number>>({})
const predictedPrice = ref<number | null>(null)
const isPredicting = ref(false)

const trainModel = async () => {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    const response = await housingApi.trainModel()
    
    if (response.success) {
      modelTrained.value = true
      modelId.value = response.model_id
      evaluationMetrics.value = response.evaluation_metrics
      featureImportance.value = response.feature_importance
      featureStatistics.value = response.feature_statistics
      
      const initialValues: Record<string, number> = {}
      for (const [key, stats] of Object.entries(response.feature_statistics)) {
        initialValues[key] = stats.mean
      }
      featureValues.value = initialValues
      
      const modelInfo = await housingApi.getLatestModel()
      if (modelInfo.success && modelInfo.data) {
        modelMetadata.value = modelInfo.data.model_metadata
        residuals.value = modelInfo.data.residuals
      }
    }
  } catch (error: any) {
    errorMessage.value = error.response?.data?.detail || '训练模型失败'
    console.error('训练模型错误:', error)
  } finally {
    isLoading.value = false
  }
}

const predictPrice = async () => {
  if (!modelTrained.value || Object.keys(featureValues.value).length === 0) {
    return
  }
  
  isPredicting.value = true
  errorMessage.value = ''
  
  try {
    const response = await housingApi.predictPrice(featureValues.value, modelId.value || undefined)
    
    if (response.success) {
      predictedPrice.value = response.predicted_price
    }
  } catch (error: any) {
    errorMessage.value = error.response?.data?.detail || '预测失败'
    console.error('预测错误:', error)
  } finally {
    isPredicting.value = false
  }
}

const loadFeatureRanges = async () => {
  try {
    const response = await housingApi.getFeatureRanges()
    
    if (response.success) {
      featureRanges.value = response.feature_ranges
    }
  } catch (error) {
    console.error('获取特征范围失败:', error)
  }
}

watch(featureValues, () => {
  if (modelTrained.value) {
    predictPrice()
  }
}, { deep: true })

onMounted(async () => {
  await loadFeatureRanges()
})
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1>房价走势线性回归预测系统</h1>
      <p class="subtitle">基于多元线性回归的房价预测与分析平台</p>
    </header>

    <main class="main-content">
      <section class="control-panel">
        <div class="action-buttons">
          <button 
            class="btn btn-primary" 
            @click="trainModel" 
            :disabled="isLoading"
          >
            {{ isLoading ? '训练中...' : '训练模型' }}
          </button>
          
          <div class="model-status" v-if="modelTrained">
            <span class="status-indicator trained"></span>
            <span>模型已训练 (ID: {{ modelId }})</span>
          </div>
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
      </section>

      <div v-if="modelTrained" class="dashboard-grid">
        <section class="metrics-section">
          <h2>模型评估指标</h2>
          <ModelMetrics :metrics="evaluationMetrics" />
        </section>

        <section class="prediction-section">
          <h2>实时房价预测</h2>
          <PredictionResult 
            :price="predictedPrice" 
            :isLoading="isPredicting"
          />
        </section>

        <section class="features-section">
          <h2>调整影响因素</h2>
          <FeatureSlider 
            :features="featureStatistics"
            :ranges="featureRanges"
            v-model="featureValues"
          />
        </section>

        <section class="chart-section importance-chart">
          <h2>特征重要性系数</h2>
          <FeatureImportanceChart :data="featureImportance" />
        </section>

        <section class="chart-section residual-chart">
          <h2>残差分布分析</h2>
          <ResidualChart :data="residuals" />
        </section>
      </div>

      <div v-else class="welcome-section">
        <div class="welcome-content">
          <h2>欢迎使用房价预测系统</h2>
          <p>请点击"训练模型"按钮开始分析房价数据</p>
          
          <div class="feature-list">
            <div class="feature-item">
              <h3>📊 数据处理</h3>
              <p>自动清洗、归一化历史房价数据</p>
            </div>
            <div class="feature-item">
              <h3>🤖 模型训练</h3>
              <p>训练多元线性回归预测模型</p>
            </div>
            <div class="feature-item">
              <h3>🎯 实时预测</h3>
              <p>交互式调整参数，实时预测房价</p>
            </div>
            <div class="feature-item">
              <h3>📈 可视化分析</h3>
              <p>特征重要性、残差分布图表展示</p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="app-footer">
      <p>房价走势线性回归预测系统 © 2024</p>
    </footer>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 24px 40px;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 8px;
}

.app-header .subtitle {
  color: #666;
  font-size: 14px;
}

.main-content {
  flex: 1;
  padding: 30px 40px;
}

.control-panel {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 20px;
}

.btn {
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.model-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-indicator.trained {
  background: #4ade80;
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.5);
}

.error-message {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 14px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.metrics-section,
.prediction-section,
.features-section,
.chart-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.metrics-section {
  grid-column: span 1;
}

.prediction-section {
  grid-column: span 1;
}

.features-section {
  grid-column: span 2;
}

.importance-chart {
  grid-column: span 1;
}

.residual-chart {
  grid-column: span 1;
}

section h2 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f0f0;
}

.welcome-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 500px;
}

.welcome-content {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 60px 80px;
  text-align: center;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
}

.welcome-content h2 {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 12px;
}

.welcome-content p {
  color: #666;
  font-size: 16px;
  margin-bottom: 40px;
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.feature-item {
  background: #f8f9ff;
  border-radius: 12px;
  padding: 24px;
  text-align: left;
}

.feature-item h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 8px;
}

.feature-item p {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.app-footer {
  background: rgba(255, 255, 255, 0.9);
  padding: 16px 40px;
  text-align: center;
  color: #666;
  font-size: 14px;
}

@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  
  .metrics-section,
  .prediction-section,
  .features-section,
  .importance-chart,
  .residual-chart {
    grid-column: span 1;
  }
}

@media (max-width: 768px) {
  .main-content {
    padding: 20px;
  }
  
  .app-header {
    padding: 20px;
  }
  
  .welcome-content {
    padding: 40px 30px;
  }
  
  .feature-list {
    grid-template-columns: 1fr;
  }
}
</style>
