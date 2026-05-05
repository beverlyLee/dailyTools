<template>
  <div class="app">
    <header class="header">
      <div class="header-content">
        <h1 class="header-title">房价走势线性回归预测器</h1>
        <p class="header-subtitle">基于多元线性回归的房价预测系统 | 支持8个影响因素实时调整</p>
      </div>
    </header>

    <main class="container">
      <div v-if="loading" class="loading-container">
        <div class="loading">
          <div class="spinner"></div>
        </div>
        <p>正在加载模型数据...</p>
      </div>

      <div v-else>
        <div class="tabs">
          <div
            class="tab-item"
            :class="{ active: activeTab === 'predict' }"
            @click="activeTab = 'predict'"
          >
            房价预测
          </div>
          <div
            class="tab-item"
            :class="{ active: activeTab === 'model' }"
            @click="activeTab = 'model'"
          >
            模型分析
          </div>
          <div
            class="tab-item"
            :class="{ active: activeTab === 'dataset' }"
            @click="activeTab = 'dataset'"
          >
            数据集信息
          </div>
        </div>

        <div v-if="activeTab === 'predict'" class="tab-content">
          <div class="grid-2">
            <div class="card">
              <h3 class="card-title">特征参数调整</h3>
              
              <div class="feature-list">
                <div
                  v-for="feature in features"
                  :key="feature.name"
                  class="feature-item"
                >
                  <div class="feature-header">
                    <label class="feature-label">{{ feature.display_name }}</label>
                    <span class="feature-unit">{{ feature.unit || '' }}</span>
                  </div>
                  <div class="slider-container">
                    <input
                      type="range"
                      class="slider"
                      :min="feature.min_value"
                      :max="feature.max_value"
                      :step="getStep(feature)"
                      :value="featureValues[feature.name]"
                      @input="updateFeatureValue(feature.name, ($event.target as HTMLInputElement).value)"
                    />
                    <input
                      type="number"
                      class="feature-input"
                      :min="feature.min_value"
                      :max="feature.max_value"
                      :step="getStep(feature)"
                      :value="featureValues[feature.name]"
                      @change="updateFeatureValue(feature.name, ($event.target as HTMLInputElement).value)"
                    />
                  </div>
                  <div class="feature-range">
                    <span>最小: {{ formatValue(feature, feature.min_value) }}</span>
                    <span>最大: {{ formatValue(feature, feature.max_value) }}</span>
                  </div>
                </div>
              </div>

              <div class="action-buttons">
                <button class="btn btn-primary" @click="predictPrice" :disabled="predicting">
                  {{ predicting ? '预测中...' : '预测房价' }}
                </button>
                <button class="btn" @click="resetFeatures">
                  重置默认值
                </button>
              </div>
            </div>

            <PredictionResult
              :result="predictionResult"
              :features="features"
            />
          </div>
        </div>

        <div v-if="activeTab === 'model'" class="tab-content">
          <div class="grid-2">
            <div class="card model-info-card">
              <h3 class="card-title">模型状态</h3>
              <div class="model-status">
                <div class="status-badge" :class="modelInfo?.is_trained ? 'trained' : 'not-trained'">
                  {{ modelInfo?.is_trained ? '已训练' : '未训练' }}
                </div>
              </div>
              
              <div v-if="modelInfo?.metrics" class="metrics-grid">
                <div class="metric-item">
                  <div class="metric-value">{{ (modelInfo.metrics.r2_score * 100).toFixed(1) }}%</div>
                  <div class="metric-label">R² 决定系数</div>
                </div>
                <div class="metric-item">
                  <div class="metric-value">{{ (modelInfo.metrics.rmse / 10000).toFixed(2) }}万</div>
                  <div class="metric-label">RMSE 均方根误差</div>
                </div>
                <div class="metric-item">
                  <div class="metric-value">{{ (modelInfo.metrics.mae / 10000).toFixed(2) }}万</div>
                  <div class="metric-label">MAE 平均绝对误差</div>
                </div>
              </div>

              <div class="train-section">
                <h4>重新训练模型</h4>
                <div class="train-controls">
                  <div class="control-group">
                    <label>测试集比例</label>
                    <input
                      type="number"
                      class="form-input"
                      v-model.number="trainConfig.testSize"
                      min="0.1"
                      max="0.5"
                      step="0.05"
                    />
                  </div>
                  <div class="control-group">
                    <label>随机种子</label>
                    <input
                      type="number"
                      class="form-input"
                      v-model.number="trainConfig.randomState"
                      min="1"
                    />
                  </div>
                </div>
                <button class="btn btn-success" @click="trainModel" :disabled="training">
                  {{ training ? '训练中...' : '开始训练' }}
                </button>
              </div>
            </div>

            <FeatureImportanceChart :data="modelInfo?.feature_importance || null" />
          </div>

          <div class="mt-20">
            <ResidualPlot :data="residualData" />
          </div>
        </div>

        <div v-if="activeTab === 'dataset'" class="tab-content">
          <div class="grid-3">
            <div class="card stat-card">
              <div class="stat-value">{{ datasetStats?.total_samples || 0 }}</div>
              <div class="stat-label">样本总数</div>
            </div>
            <div class="card stat-card">
              <div class="stat-value">{{ datasetStats?.feature_count || 0 }}</div>
              <div class="stat-label">特征数量</div>
            </div>
            <div class="card stat-card">
              <div class="stat-value">
                ¥{{ (datasetStats?.avg_price || 0).toLocaleString() }}
              </div>
              <div class="stat-label">平均房价</div>
            </div>
          </div>

          <div class="grid-2 mt-20">
            <div class="card">
              <h3 class="card-title">价格分布统计</h3>
              <div class="stats-detail">
                <div class="stat-row">
                  <span class="stat-name">最低价格</span>
                  <span class="stat-num">¥{{ (datasetStats?.min_price || 0).toLocaleString() }}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-name">最高价格</span>
                  <span class="stat-num">¥{{ (datasetStats?.max_price || 0).toLocaleString() }}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-name">价格标准差</span>
                  <span class="stat-num">¥{{ (datasetStats?.price_std || 0).toLocaleString() }}</span>
                </div>
              </div>
            </div>

            <div class="card">
              <h3 class="card-title">特征说明</h3>
              <div class="feature-description">
                <div v-for="feature in features" :key="feature.name" class="desc-item">
                  <strong>{{ feature.display_name }}</strong>
                  <p>{{ feature.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { housePriceApi } from './lib/api';
import type {
  FeatureInfo,
  PredictionResult,
  ModelInfo,
  DatasetStats,
  ResidualData,
} from './types';
import FeatureImportanceChart from './components/FeatureImportanceChart.vue';
import ResidualPlot from './components/ResidualPlot.vue';
import PredictionResult from './components/PredictionResult.vue';

const loading = ref(true);
const predicting = ref(false);
const training = ref(false);

const activeTab = ref('predict');

const features = ref<FeatureInfo[]>([]);
const featureValues = reactive<Record<string, number>>({});

const predictionResult = ref<PredictionResult | null>(null);
const modelInfo = ref<ModelInfo | null>(null);
const datasetStats = ref<DatasetStats | null>(null);
const residualData = ref<ResidualData | null>(null);

const trainConfig = reactive({
  testSize: 0.2,
  randomState: 42,
});

const getStep = (feature: FeatureInfo): number => {
  if (feature.name === 'interest_rate') return 0.1;
  if (feature.name === 'area') return 1;
  return 1;
};

const formatValue = (feature: FeatureInfo, value: number): string => {
  if (feature.name === 'interest_rate') {
    return value.toFixed(1) + '%';
  }
  if (feature.name === 'gdp') {
    return (value / 100000000).toFixed(0) + '亿';
  }
  if (feature.name === 'population') {
    return (value / 10000).toFixed(0) + '万';
  }
  return value.toFixed(0);
};

const updateFeatureValue = (name: string, value: string) => {
  featureValues[name] = parseFloat(value);
};

const resetFeatures = async () => {
  try {
    const defaults = await housePriceApi.getDefaultValues();
    Object.assign(featureValues, defaults);
    predictionResult.value = null;
  } catch (error) {
    console.error('重置默认值失败:', error);
  }
};

const predictPrice = async () => {
  predicting.value = true;
  try {
    const result = await housePriceApi.predict({ ...featureValues });
    predictionResult.value = result;
  } catch (error) {
    console.error('预测失败:', error);
    alert('预测失败，请稍后重试');
  } finally {
    predicting.value = false;
  }
};

const trainModel = async () => {
  training.value = true;
  try {
    await housePriceApi.trainModel(trainConfig.testSize, trainConfig.randomState);
    await loadModelInfo();
    await loadResidualData();
    alert('模型训练完成！');
  } catch (error) {
    console.error('训练失败:', error);
    alert('训练失败，请稍后重试');
  } finally {
    training.value = false;
  }
};

const loadModelInfo = async () => {
  try {
    const info = await housePriceApi.getModelInfo();
    modelInfo.value = info;
  } catch (error) {
    console.error('加载模型信息失败:', error);
  }
};

const loadResidualData = async () => {
  try {
    const data = await housePriceApi.getResiduals();
    residualData.value = data;
  } catch (error) {
    console.error('加载残差数据失败:', error);
    residualData.value = null;
  }
};

const loadDatasetStats = async () => {
  try {
    const stats = await housePriceApi.getDatasetInfo();
    datasetStats.value = stats;
  } catch (error) {
    console.error('加载数据集信息失败:', error);
  }
};

onMounted(async () => {
  try {
    const [featuresData, defaults] = await Promise.all([
      housePriceApi.getFeatures(),
      housePriceApi.getDefaultValues(),
    ]);

    features.value = featuresData;
    Object.assign(featureValues, defaults);

    await Promise.all([
      loadModelInfo(),
      loadDatasetStats(),
      loadResidualData(),
    ]);
  } catch (error) {
    console.error('初始化失败:', error);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px;
  color: #666;
}

.loading-container p {
  margin-top: 16px;
  font-size: 14px;
}

.feature-list {
  max-height: 500px;
  overflow-y: auto;
  padding-right: 8px;
}

.feature-list::-webkit-scrollbar {
  width: 6px;
}

.feature-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.feature-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.feature-item {
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.feature-item:last-child {
  border-bottom: none;
}

.feature-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.feature-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.feature-unit {
  font-size: 12px;
  color: #999;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  background: #e0e0e0;
  border-radius: 2px;
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #1890ff;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 0 0 4px rgba(24, 144, 255, 0.2);
}

.feature-input {
  width: 90px;
  padding: 6px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  text-align: right;
}

.feature-input:focus {
  outline: none;
  border-color: #1890ff;
}

.feature-range {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 11px;
  color: #999;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.action-buttons .btn {
  flex: 1;
  padding: 12px;
  font-size: 15px;
}

.model-info-card {
  height: fit-content;
}

.model-status {
  text-align: center;
  margin-bottom: 24px;
}

.status-badge {
  display: inline-block;
  padding: 8px 24px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.status-badge.trained {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.status-badge.not-trained {
  background: #fff7e6;
  color: #faad14;
  border: 1px solid #ffd591;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.metric-item {
  text-align: center;
  padding: 16px 8px;
  background: #fafafa;
  border-radius: 8px;
}

.metric-value {
  font-size: 18px;
  font-weight: 700;
  color: #1890ff;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 11px;
  color: #666;
}

.train-section {
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.train-section h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #333;
}

.train-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-group label {
  font-size: 12px;
  color: #666;
}

.mt-20 {
  margin-top: 20px;
}

.stats-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 6px;
}

.stat-name {
  font-size: 14px;
  color: #666;
}

.stat-num {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.feature-description {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.desc-item {
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
}

.desc-item strong {
  font-size: 13px;
  color: #333;
}

.desc-item p {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  line-height: 1.5;
}
</style>
