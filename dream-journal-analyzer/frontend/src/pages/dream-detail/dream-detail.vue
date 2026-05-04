<template>
  <view class="container">
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else class="detail-container">
      <view class="dream-header card">
        <view class="dream-main-info">
          <text class="dream-title">{{ dream.title }}</text>
          <view class="dream-meta">
            <text class="dream-date">{{ formatDate(dream.date) }}</text>
            <view 
              v-if="dream.emotion" 
              :class="['emotion-tag', getEmotionTagClass(dream.emotion)]"
            >
              <text class="emotion-text">{{ dream.emotion }}</text>
            </view>
          </view>
        </view>
        <view class="clarity-badge" v-if="dream.clarity">
          <text class="clarity-number">{{ dream.clarity }}</text>
          <text class="clarity-label">清晰度</text>
        </view>
      </view>

      <view class="dream-content card">
        <text class="section-title">梦境内容</text>
        <text class="dream-text">{{ dream.content }}</text>
      </view>

      <view class="dream-actions">
        <view class="action-btn action-edit" @click="editDream">
          <text class="action-icon">✏️</text>
          <text class="action-text">编辑</text>
        </view>
        <view class="action-btn action-analyze" @click="reAnalyze" v-if="analysis">
          <text class="action-icon">🔄</text>
          <text class="action-text">重新分析</text>
        </view>
        <view class="action-btn action-delete" @click="deleteDream">
          <text class="action-icon">🗑️</text>
          <text class="action-text">删除</text>
        </view>
      </view>

      <view v-if="analysis" class="analysis-section">
        <view class="section-header">
          <text class="section-title">分析结果</text>
        </view>

        <view class="analysis-card card" v-if="analysis.emotions">
          <view class="analysis-item-header">
            <text class="analysis-icon">💭</text>
            <text class="analysis-label">情感分析</text>
          </view>
          <view class="emotion-stats">
            <view class="emotion-stat">
              <view class="emotion-bar positive">
                <view 
                  class="emotion-fill" 
                  :style="{ width: getEmotionPercentage(analysis.emotions, 'positive') + '%' }"
                ></view>
              </view>
              <text class="emotion-stat-label">积极: {{ analysis.emotions.positive }}</text>
            </view>
            <view class="emotion-stat">
              <view class="emotion-bar negative">
                <view 
                  class="emotion-fill" 
                  :style="{ width: getEmotionPercentage(analysis.emotions, 'negative') + '%' }"
                ></view>
              </view>
              <text class="emotion-stat-label">消极: {{ analysis.emotions.negative }}</text>
            </view>
            <view class="emotion-stat">
              <view class="emotion-bar neutral">
                <view 
                  class="emotion-fill" 
                  :style="{ width: getEmotionPercentage(analysis.emotions, 'neutral') + '%' }"
                ></view>
              </view>
              <text class="emotion-stat-label">中性: {{ analysis.emotions.neutral }}</text>
            </view>
          </view>
          <view class="dominant-emotion">
            <text class="dominant-label">主导情感: </text>
            <text :class="['dominant-value', getDominantEmotionClass(analysis.emotions.dominantEmotion)]">
              {{ getEmotionText(analysis.emotions.dominantEmotion) }}
            </text>
          </view>
        </view>

        <view class="analysis-card card" v-if="analysis.themes && analysis.themes.length > 0">
          <view class="analysis-item-header">
            <text class="analysis-icon">🎯</text>
            <text class="analysis-label">主要主题</text>
          </view>
          <view class="themes-list">
            <view 
              v-for="(theme, index) in analysis.themes" 
              :key="theme.id"
              class="theme-item"
            >
              <view class="theme-index">{{ index + 1 }}</view>
              <text class="theme-name">{{ theme.name }}</text>
              <view v-if="theme.type" class="theme-type">
                <text class="theme-type-text">{{ getThemeTypeText(theme.type) }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="analysis-card card" v-if="analysis.entities && analysis.entities.length > 0">
          <view class="analysis-item-header">
            <text class="analysis-icon">👤</text>
            <text class="analysis-label">识别到的实体</text>
          </view>
          <view class="entities-list">
            <view 
              v-for="(entity, index) in analysis.entities" 
              :key="index"
              class="entity-item"
            >
              <text class="entity-text">{{ entity.text }}</text>
              <view :class="['entity-type-badge', getEntityTypeClass(entity.type)]">
                <text class="entity-type-text">{{ getEntityTypeText(entity.type) }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="analysis-card card" v-if="analysis.keywords && analysis.keywords.length > 0">
          <view class="analysis-item-header">
            <text class="analysis-icon">🔑</text>
            <text class="analysis-label">高频关键词</text>
          </view>
          <view class="keywords-cloud">
            <view 
              v-for="(keyword, index) in analysis.keywords" 
              :key="index"
              :class="['keyword-item', getKeywordSizeClass(keyword.count)]"
            >
              <text class="keyword-text">{{ keyword.word }}</text>
              <text class="keyword-count">({{ keyword.count }})</text>
            </view>
          </view>
        </view>

        <view class="analysis-card card" v-if="analysis.analysis">
          <view class="analysis-item-header">
            <text class="analysis-icon">📋</text>
            <text class="analysis-label">完整分析报告</text>
          </view>
          <text class="analysis-full-text">{{ analysis.analysis }}</text>
        </view>
      </view>

      <view v-else class="no-analysis card" @click="analyzeDream">
        <text class="no-analysis-icon">🔍</text>
        <text class="no-analysis-text">此梦境尚未分析</text>
        <text class="no-analysis-hint">点击此处进行分析</text>
      </view>
    </view>
  </view>
</template>

<script>
import dreamApi from '@/api/index.js';

export default {
  data() {
    return {
      loading: true,
      dreamId: null,
      dream: {},
      analysis: null
    };
  },
  onLoad(options) {
    if (options.id) {
      this.dreamId = parseInt(options.id);
      this.loadDream();
    }
  },
  methods: {
    async loadDream() {
      this.loading = true;
      try {
        const result = await dreamApi.getById(this.dreamId);
        this.dream = result.dream;
        this.analysis = result.analysis;
      } catch (error) {
        console.error('加载梦境失败:', error);
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        });
      } finally {
        this.loading = false;
      }
    },
    async analyzeDream() {
      uni.showLoading({
        title: '分析中...'
      });
      
      try {
        const result = await dreamApi.analyze(this.dreamId);
        this.analysis = result;
        uni.hideLoading();
        uni.showToast({
          title: '分析完成',
          icon: 'success'
        });
      } catch (error) {
        uni.hideLoading();
        console.error('分析失败:', error);
        uni.showToast({
          title: '分析失败',
          icon: 'none'
        });
      }
    },
    async reAnalyze() {
      await this.analyzeDream();
    },
    editDream() {
      uni.navigateTo({
        url: `/pages/add-dream/add-dream?id=${this.dreamId}`
      });
    },
    deleteDream() {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除这条梦境记录吗？此操作不可恢复。',
        success: async (res) => {
          if (res.confirm) {
            try {
              await dreamApi.delete(this.dreamId);
              uni.showToast({
                title: '删除成功',
                icon: 'success'
              });
              setTimeout(() => {
                uni.switchTab({
                  url: '/pages/index/index'
                });
              }, 1500);
            } catch (error) {
              console.error('删除失败:', error);
              uni.showToast({
                title: '删除失败',
                icon: 'none'
              });
            }
          }
        }
      });
    },
    formatDate(dateStr) {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${year}年${month}月${day}日`;
    },
    getEmotionTagClass(emotion) {
      const lowerEmotion = emotion.toLowerCase();
      if (lowerEmotion.includes('积极') || lowerEmotion.includes('positive') || lowerEmotion.includes('happy')) {
        return 'emotion-positive';
      }
      if (lowerEmotion.includes('消极') || lowerEmotion.includes('negative') || lowerEmotion.includes('scary')) {
        return 'emotion-negative';
      }
      return 'emotion-neutral';
    },
    getEmotionPercentage(emotions, type) {
      const total = emotions.positive + emotions.negative + emotions.neutral;
      if (total === 0) return 0;
      return Math.round((emotions[type] / total) * 100);
    },
    getEmotionText(emotion) {
      const map = {
        'positive': '积极',
        'negative': '消极',
        'neutral': '中性'
      };
      return map[emotion] || emotion;
    },
    getDominantEmotionClass(emotion) {
      return `dominant-${emotion}`;
    },
    getThemeTypeText(type) {
      const map = {
        'keyphrase': '关键短语',
        'person': '人物',
        'place': '地点',
        'date': '日期',
        'value': '数值',
        'emotion': '情感'
      };
      return map[type] || type;
    },
    getEntityTypeClass(type) {
      return `entity-${type}`;
    },
    getEntityTypeText(type) {
      const map = {
        'person': '人物',
        'place': '地点',
        'date': '日期',
        'value': '数值'
      };
      return map[type] || type;
    },
    getKeywordSizeClass(count) {
      if (count >= 5) return 'keyword-large';
      if (count >= 3) return 'keyword-medium';
      return 'keyword-small';
    }
  }
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #f8f8f8;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

.detail-container {
  padding: 30rpx;
  padding-bottom: 60rpx;
}

.dream-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.dream-main-info {
  flex: 1;
  margin-right: 20rpx;
}

.dream-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.dream-meta {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.dream-date {
  font-size: 26rpx;
  color: #999;
}

.emotion-tag {
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
}

.emotion-tag .emotion-text {
  font-size: 22rpx;
  color: #fff;
}

.emotion-positive {
  background: #52c41a;
}

.emotion-negative {
  background: #f5222d;
}

.emotion-neutral {
  background: #667eea;
}

.clarity-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100rpx;
  height: 100rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx;
}

.clarity-number {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
}

.clarity-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.9);
}

.dream-content {
  margin-top: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
  display: block;
  margin-bottom: 20rpx;
}

.dream-text {
  font-size: 28rpx;
  color: #666;
  line-height: 2;
  white-space: pre-wrap;
}

.dream-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
  margin-bottom: 30rpx;
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.action-icon {
  font-size: 40rpx;
  margin-bottom: 10rpx;
}

.action-text {
  font-size: 24rpx;
  color: #666;
}

.action-edit:active {
  background: #f0f4ff;
}

.action-analyze:active {
  background: #e6fffb;
}

.action-delete:active {
  background: #fff2f0;
}

.analysis-section {
  margin-top: 20rpx;
}

.section-header {
  margin-bottom: 20rpx;
}

.analysis-card {
  margin-bottom: 20rpx;
}

.analysis-item-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.analysis-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.analysis-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.emotion-stats {
  margin-bottom: 20rpx;
}

.emotion-stat {
  margin-bottom: 16rpx;
}

.emotion-stat:last-child {
  margin-bottom: 0;
}

.emotion-bar {
  height: 16rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
  overflow: hidden;
  margin-bottom: 8rpx;
}

.emotion-fill {
  height: 100%;
  border-radius: 8rpx;
  transition: width 0.3s ease;
}

.emotion-bar.positive .emotion-fill {
  background: #52c41a;
}

.emotion-bar.negative .emotion-fill {
  background: #f5222d;
}

.emotion-bar.neutral .emotion-fill {
  background: #667eea;
}

.emotion-stat-label {
  font-size: 24rpx;
  color: #999;
}

.dominant-emotion {
  display: flex;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.dominant-label {
  font-size: 26rpx;
  color: #666;
}

.dominant-value {
  font-size: 28rpx;
  font-weight: 500;
}

.dominant-positive {
  color: #52c41a;
}

.dominant-negative {
  color: #f5222d;
}

.dominant-neutral {
  color: #667eea;
}

.themes-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.theme-item {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
}

.theme-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  background: #667eea;
  color: #fff;
  border-radius: 50%;
  font-size: 22rpx;
  font-weight: 500;
  margin-right: 16rpx;
}

.theme-name {
  flex: 1;
  font-size: 26rpx;
  color: #333;
}

.theme-type {
  padding: 4rpx 12rpx;
  background: #e6fffb;
  border-radius: 8rpx;
}

.theme-type-text {
  font-size: 20rpx;
  color: #13c2c2;
}

.entities-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.entity-item {
  display: flex;
  align-items: center;
  padding: 12rpx 20rpx;
  background: #f5f5f5;
  border-radius: 20rpx;
}

.entity-text {
  font-size: 26rpx;
  color: #333;
  margin-right: 12rpx;
}

.entity-type-badge {
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
}

.entity-type-text {
  font-size: 20rpx;
  color: #fff;
}

.entity-person {
  background: #667eea;
}

.entity-place {
  background: #52c41a;
}

.entity-date {
  background: #faad14;
}

.entity-value {
  background: #f5222d;
}

.keywords-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.keyword-item {
  display: flex;
  align-items: baseline;
  padding: 10rpx 20rpx;
  background: linear-gradient(135deg, #f0f4ff 0%, #faf0ff 100%);
  border-radius: 20rpx;
}

.keyword-large {
  padding: 14rpx 24rpx;
}

.keyword-large .keyword-text {
  font-size: 32rpx;
  font-weight: 500;
}

.keyword-medium .keyword-text {
  font-size: 28rpx;
}

.keyword-small .keyword-text {
  font-size: 24rpx;
}

.keyword-text {
  color: #667eea;
  margin-right: 6rpx;
}

.keyword-count {
  font-size: 20rpx;
  color: #999;
}

.analysis-full-text {
  font-size: 26rpx;
  color: #666;
  line-height: 2;
  white-space: pre-wrap;
}

.no-analysis {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx;
  margin-top: 20rpx;
}

.no-analysis:active {
  background: #f0f0f0;
}

.no-analysis-icon {
  font-size: 64rpx;
  margin-bottom: 20rpx;
}

.no-analysis-text {
  font-size: 30rpx;
  color: #999;
  margin-bottom: 10rpx;
}

.no-analysis-hint {
  font-size: 24rpx;
  color: #ccc;
}
</style>
