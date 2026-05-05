<template>
  <div class="prediction-result-card card">
    <h3 class="card-title">预测结果</h3>
    <div v-if="!result" class="no-data">
      <p>请调整特征参数后点击"预测房价"</p>
    </div>
    <div v-else class="result-content">
      <div class="predicted-price">
        <div class="price-label">预测房价</div>
        <div class="price-value">{{ result.predicted_price_formatted }}</div>
      </div>
      
      <div class="contributions">
        <h4>特征贡献度分析</h4>
        <div class="contribution-list">
          <div
            v-for="(contribution, name) in sortedContributions"
            :key="name"
            class="contribution-item"
          >
            <div class="contribution-info">
              <span class="feature-name">{{ getFeatureDisplayName(name) }}</span>
              <span class="contribution-value" :class="contribution > 0 ? 'positive' : 'negative'">
                {{ contribution > 0 ? '+' : '' }}{{ formatContribution(contribution) }}
              </span>
            </div>
            <div class="contribution-bar">
              <div
                class="bar-fill"
                :class="contribution > 0 ? 'positive' : 'negative'"
                :style="{ width: getBarWidth(contribution) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PredictionResult } from '../types';

const props = defineProps<{
  result: PredictionResult | null;
  features: { name: string; display_name: string }[];
}>();

const getFeatureDisplayName = (name: string): string => {
  const feature = props.features.find(f => f.name === name);
  return feature?.display_name || name;
};

const sortedContributions = computed(() => {
  if (!props.result?.feature_contributions) return {};
  
  const entries = Object.entries(props.result.feature_contributions);
  entries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  
  return Object.fromEntries(entries);
});

const maxContribution = computed(() => {
  const contributions = Object.values(sortedContributions.value);
  if (contributions.length === 0) return 1;
  return Math.max(...contributions.map(Math.abs), 1);
});

const getBarWidth = (contribution: number): number => {
  return (Math.abs(contribution) / maxContribution.value) * 100;
};

const formatContribution = (value: number): string => {
  if (Math.abs(value) >= 10000) {
    return (value / 10000).toFixed(2) + '万';
  }
  return value.toFixed(0);
};
</script>

<style scoped>
.no-data {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.result-content {
  padding: 10px 0;
}

.predicted-price {
  text-align: center;
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  margin-bottom: 24px;
}

.price-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin-bottom: 8px;
}

.price-value {
  color: #fff;
  font-size: 32px;
  font-weight: 700;
}

.contributions h4 {
  font-size: 14px;
  color: #333;
  margin-bottom: 16px;
  font-weight: 600;
}

.contribution-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contribution-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.contribution-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.feature-name {
  font-size: 13px;
  color: #666;
}

.contribution-value {
  font-size: 13px;
  font-weight: 500;
}

.contribution-value.positive {
  color: #52c41a;
}

.contribution-value.negative {
  color: #ff4d4f;
}

.contribution-bar {
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.bar-fill.positive {
  background: linear-gradient(90deg, #52c41a, #73d13d);
}

.bar-fill.negative {
  background: linear-gradient(90deg, #ff4d4f, #ff7875);
}
</style>
