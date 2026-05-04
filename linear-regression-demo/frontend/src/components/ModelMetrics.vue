<script setup lang="ts">
import { computed } from 'vue'
import type { EvaluationMetrics } from '../api'

interface Props {
  metrics: EvaluationMetrics | null
}

const props = defineProps<Props>()

const r2Status = computed(() => {
  if (!props.metrics) return { color: '#999', text: '暂无数据', level: 'none' }
  
  const r2 = props.metrics.r2_score
  
  if (r2 >= 0.9) {
    return { color: '#4ade80', text: '优秀', level: 'excellent' }
  } else if (r2 >= 0.75) {
    return { color: '#22d3ee', text: '良好', level: 'good' }
  } else if (r2 >= 0.5) {
    return { color: '#f59e0b', text: '一般', level: 'average' }
  }
  return { color: '#f87171', text: '较差', level: 'poor' }
})

const formattedMetrics = computed(() => {
  if (!props.metrics) return null
  
  return {
    r2_score: props.metrics.r2_score.toFixed(4),
    r2_percent: (props.metrics.r2_score * 100).toFixed(2),
    mse: props.metrics.mse.toFixed(2),
    rmse: props.metrics.rmse.toFixed(2)
  }
})

const getProgressWidth = (value: number) => {
  return Math.max(0, Math.min(100, value * 100)) + '%'
}
</script>

<template>
  <div class="model-metrics">
    <div v-if="!metrics" class="empty-metrics">
      <div class="empty-icon">📊</div>
      <p>暂无模型评估数据</p>
      <p class="hint">请先训练模型</p>
    </div>
    
    <div v-else class="metrics-content">
      <div class="metric-card primary">
        <div class="metric-header">
          <span class="metric-name">R² 决定系数</span>
          <span class="metric-badge" :style="{ backgroundColor: r2Status.color + '20', color: r2Status.color }">
            {{ r2Status.text }}
          </span>
        </div>
        <div class="metric-value" :style="{ color: r2Status.color }">
          {{ formattedMetrics?.r2_score }}
        </div>
        <div class="metric-progress">
          <div 
            class="progress-fill"
            :style="{ 
              width: getProgressWidth(metrics.r2_score),
              backgroundColor: r2Status.color 
            }"
          ></div>
        </div>
        <div class="metric-desc">
          解释了 {{ formattedMetrics?.r2_percent }}% 的房价变异
        </div>
      </div>
      
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-name secondary">均方误差 (MSE)</div>
          <div class="metric-value secondary">
            {{ formattedMetrics?.mse }}
          </div>
          <div class="metric-desc">
            预测值与实际值的平方差均值
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-name secondary">均方根误差 (RMSE)</div>
          <div class="metric-value secondary">
            {{ formattedMetrics?.rmse }}
          </div>
          <div class="metric-desc">
            预测误差的标准差 (元/㎡)
          </div>
        </div>
      </div>
      
      <div class="metrics-info">
        <div class="info-item">
          <span class="info-label">R² 解读:</span>
          <span class="info-value">
            越接近 1 表示模型拟合效果越好
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">RMSE 解读:</span>
          <span class="info-value">
            数值越小表示预测精度越高
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.model-metrics {
  width: 100%;
}

.empty-metrics {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-metrics p {
  color: #999;
  font-size: 14px;
  margin: 0;
  margin-bottom: 8px;
}

.empty-metrics .hint {
  color: #bbb;
  font-size: 12px;
}

.metrics-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.metric-card {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f3ff 100%);
  border-radius: 12px;
  padding: 20px;
}

.metric-card.primary {
  border-left: 4px solid #667eea;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.metric-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
}

.metric-name.secondary {
  margin-bottom: 8px;
}

.metric-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
}

.metric-value {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 12px;
}

.metric-value.secondary {
  font-size: 24px;
  color: #667eea;
  margin-bottom: 8px;
}

.metric-progress {
  height: 8px;
  background: #e0e5ff;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.metric-desc {
  font-size: 12px;
  color: #999;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.metrics-info {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  white-space: nowrap;
}

.info-value {
  font-size: 12px;
  color: #999;
}

@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .metric-value {
    font-size: 28px;
  }
  
  .metric-value.secondary {
    font-size: 20px;
  }
}
</style>
