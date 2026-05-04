<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  price: number | null
  isLoading: boolean
}

const props = defineProps<Props>()

const formattedPrice = computed(() => {
  if (props.price === null || props.price === undefined) return null
  
  if (props.price >= 10000) {
    const wan = Math.floor(props.price / 10000)
    const yuan = props.price % 10000
    return `${wan}万${yuan > 0 ? yuan.toFixed(0) : ''}`
  }
  
  return props.price.toFixed(2)
})

const priceColor = computed(() => {
  if (props.price === null) return '#667eea'
  
  if (props.price > 20000) {
    return '#ef4444'
  } else if (props.price > 15000) {
    return '#f59e0b'
  } else if (props.price > 10000) {
    return '#667eea'
  }
  return '#4ade80'
})
</script>

<template>
  <div class="prediction-result">
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <span>预测中...</span>
    </div>
    
    <div v-else-if="price !== null" class="result-content">
      <div class="price-display">
        <span class="price-label">预测房价</span>
        <div class="price-value" :style="{ color: priceColor }">
          ¥ {{ formattedPrice }}
          <span class="unit">元/平方米</span>
        </div>
      </div>
      
      <div class="price-breakdown">
        <div class="breakdown-item">
          <span class="breakdown-label">每平方米单价</span>
          <span class="breakdown-value">{{ price?.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) }} 元</span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">100平方米总价</span>
          <span class="breakdown-value">{{ price ? (price * 100 / 10000).toFixed(2) : '0.00' }} 万元</span>
        </div>
      </div>
    </div>
    
    <div v-else class="empty-state">
      <div class="empty-icon">🏠</div>
      <p>请调整左侧影响因素</p>
      <p class="hint">系统将实时预测房价</p>
    </div>
  </div>
</template>

<style scoped>
.prediction-result {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e5ff;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.result-content {
  width: 100%;
}

.price-display {
  text-align: center;
  padding: 24px;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f3ff 100%);
  border-radius: 16px;
  margin-bottom: 20px;
}

.price-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  display: block;
}

.price-value {
  font-size: 36px;
  font-weight: 700;
  line-height: 1.2;
}

.unit {
  font-size: 14px;
  font-weight: 500;
  color: #999;
  margin-left: 8px;
}

.price-breakdown {
  display: flex;
  justify-content: space-around;
  gap: 16px;
}

.breakdown-item {
  flex: 1;
  text-align: center;
  padding: 16px;
  background: #fafafa;
  border-radius: 12px;
}

.breakdown-label {
  font-size: 12px;
  color: #999;
  display: block;
  margin-bottom: 4px;
}

.breakdown-value {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a2e;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state p {
  color: #999;
  font-size: 14px;
  margin: 0;
  margin-bottom: 8px;
}

.empty-state .hint {
  color: #bbb;
  font-size: 12px;
}

@media (max-width: 768px) {
  .price-value {
    font-size: 28px;
  }
  
  .price-breakdown {
    flex-direction: column;
  }
}
</style>
