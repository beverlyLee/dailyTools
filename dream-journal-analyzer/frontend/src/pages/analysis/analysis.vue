<template>
  <view class="container">
    <view class="header">
      <text class="title">梦境分析</text>
      <text class="subtitle">探索梦境背后的意义</text>
    </view>

    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else-if="dreams.length === 0" class="empty-state">
      <text class="empty-icon">📝</text>
      <text class="empty-text">还没有记录任何梦境</text>
      <text class="empty-subtext">先记录一些梦境才能进行分析</text>
      <view class="add-btn" @click="goToAdd">
        <text class="add-btn-text">+ 记录梦境</text>
      </view>
    </view>

    <view v-else class="analysis-content">
      <view class="overview-section">
        <view class="section-header">
          <text class="section-title">总体统计</text>
        </view>
        <view class="stats-grid">
          <view class="stat-card">
            <text class="stat-number">{{ dreams.length }}</text>
            <text class="stat-label">梦境总数</text>
          </view>
          <view class="stat-card">
            <text class="stat-number">{{ analyzedCount }}</text>
            <text class="stat-label">已分析</text>
          </view>
          <view class="stat-card">
            <text class="stat-number">{{ positiveCount }}</text>
            <text class="stat-label">积极梦境</text>
          </view>
          <view class="stat-card">
            <text class="stat-number">{{ negativeCount }}</text>
            <text class="stat-label">消极梦境</text>
          </view>
        </view>
      </view>

      <view class="emotion-trend-section" v-if="emotionTrend.length > 0">
        <view class="section-header">
          <text class="section-title">情感趋势</text>
        </view>
        <view class="trend-chart">
          <view 
            v-for="(item, index) in emotionTrend" 
            :key="index"
            class="trend-item"
          >
            <text class="trend-date">{{ formatShortDate(item.date) }}</text>
            <view class="trend-bars">
              <view class="trend-bar positive">
                <view 
                  class="trend-bar-fill" 
                  :style="{ height: getBarHeight(item.positive, maxEmotionCount) + '%' }"
                ></view>
              </view>
              <view class="trend-bar neutral">
                <view 
                  class="trend-bar-fill" 
                  :style="{ height: getBarHeight(item.neutral, maxEmotionCount) + '%' }"
                ></view>
              </view>
              <view class="trend-bar negative">
                <view 
                  class="trend-bar-fill" 
                  :style="{ height: getBarHeight(item.negative, maxEmotionCount) + '%' }"
                ></view>
              </view>
            </view>
          </view>
        </view>
        <view class="trend-legend">
          <view class="legend-item">
            <view class="legend-color positive"></view>
            <text class="legend-text">积极</text>
          </view>
          <view class="legend-item">
            <view class="legend-color neutral"></view>
            <text class="legend-text">中性</text>
          </view>
          <view class="legend-item">
            <view class="legend-color negative"></view>
            <text class="legend-text">消极</text>
          </view>
        </view>
      </view>

      <view class="themes-section" v-if="topThemes.length > 0">
        <view class="section-header">
          <text class="section-title">高频主题</text>
        </view>
        <view class="themes-list">
          <view 
            v-for="(theme, index) in topThemes" 
            :key="index"
            class="theme-item card"
          >
            <view class="theme-rank">{{ index + 1 }}</view>
            <view class="theme-info">
              <text class="theme-name">{{ theme.name }}</text>
              <text class="theme-count">出现 {{ theme.count }} 次</text>
            </view>
            <view class="theme-progress">
              <view 
                class="theme-progress-fill" 
                :style="{ width: getThemeProgress(theme.count, maxThemeCount) + '%' }"
              ></view>
            </view>
          </view>
        </view>
      </view>

      <view class="entities-section" v-if="topEntities.length > 0">
        <view class="section-header">
          <text class="section-title">常见实体</text>
        </view>
        <view class="entities-cloud">
          <view 
            v-for="(entity, index) in topEntities" 
            :key="index"
            :class="['entity-tag', getEntitySizeClass(entity.count)]"
          >
            <text class="entity-text">{{ entity.text }}</text>
            <text class="entity-count">({{ entity.count }})</text>
          </view>
        </view>
      </view>

      <view class="keywords-section" v-if="topKeywords.length > 0">
        <view class="section-header">
          <text class="section-title">关键词云</text>
        </view>
        <view class="keywords-cloud">
          <view 
            v-for="(keyword, index) in topKeywords" 
            :key="index"
            :class="['keyword-tag', getKeywordSizeClass(keyword.count)]"
          >
            <text class="keyword-text">{{ keyword.word }}</text>
          </view>
        </view>
      </view>

      <view class="insights-section" v-if="insights.length > 0">
        <view class="section-header">
          <text class="section-title">分析洞察</text>
        </view>
        <view class="insights-list">
          <view 
            v-for="(insight, index) in insights" 
            :key="index"
            class="insight-item card"
          >
            <view class="insight-icon">{{ insight.icon }}</view>
            <text class="insight-text">{{ insight.text }}</text>
          </view>
        </view>
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
      dreams: [],
      analyzedCount: 0,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      emotionTrend: [],
      maxEmotionCount: 0,
      topThemes: [],
      maxThemeCount: 0,
      topEntities: [],
      topKeywords: [],
      insights: []
    };
  },
  onShow() {
    this.loadData();
  },
  methods: {
    async loadData() {
      this.loading = true;
      try {
        const result = await dreamApi.getAll();
        this.dreams = result || [];
        this.analyzeData();
      } catch (error) {
        console.error('加载数据失败:', error);
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        });
      } finally {
        this.loading = false;
      }
    },
    analyzeData() {
      this.analyzedCount = 0;
      this.positiveCount = 0;
      this.negativeCount = 0;
      this.neutralCount = 0;
      
      const themesMap = {};
      const entitiesMap = {};
      const keywordsMap = {};
      const emotionsByDate = {};

      this.dreams.forEach(dream => {
        const date = dream.date;
        const emotion = dream.emotion ? dream.emotion.toLowerCase() : '';
        
        if (dream.analysis) {
          this.analyzedCount++;
          
          if (dream.analysis.themes) {
            dream.analysis.themes.forEach(theme => {
              const name = theme.name.toLowerCase();
              themesMap[name] = (themesMap[name] || 0) + 1;
            });
          }
          
          if (dream.analysis.entities) {
            dream.analysis.entities.forEach(entity => {
              const key = `${entity.type}-${entity.text.toLowerCase()}`;
              entitiesMap[key] = (entitiesMap[key] || { 
                text: entity.text, 
                type: entity.type, 
                count: 0 
              });
              entitiesMap[key].count++;
            });
          }
          
          if (dream.analysis.keywords) {
            dream.analysis.keywords.forEach(kw => {
              const word = kw.word.toLowerCase();
              keywordsMap[word] = (keywordsMap[word] || 0) + kw.count;
            });
          }
          
          if (dream.analysis.emotions) {
            if (!emotionsByDate[date]) {
              emotionsByDate[date] = {
                date,
                positive: 0,
                neutral: 0,
                negative: 0
              };
            }
            emotionsByDate[date].positive += dream.analysis.emotions.positive;
            emotionsByDate[date].neutral += dream.analysis.emotions.neutral;
            emotionsByDate[date].negative += dream.analysis.emotions.negative;
          }
        }
        
        if (emotion.includes('积极') || emotion.includes('positive')) {
          this.positiveCount++;
        } else if (emotion.includes('消极') || emotion.includes('negative')) {
          this.negativeCount++;
        } else if (emotion.includes('中性') || emotion.includes('neutral')) {
          this.neutralCount++;
        }
      });

      this.emotionTrend = Object.values(emotionsByDate)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-7);
      
      this.maxEmotionCount = Math.max(
        ...this.emotionTrend.map(item => 
          Math.max(item.positive, item.neutral, item.negative)
        ),
        1
      );

      this.topThemes = Object.entries(themesMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      this.maxThemeCount = this.topThemes.length > 0 
        ? Math.max(...this.topThemes.map(t => t.count)) 
        : 1;

      this.topEntities = Object.values(entitiesMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      this.topKeywords = Object.entries(keywordsMap)
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      this.generateInsights();
    },
    generateInsights() {
      this.insights = [];
      
      if (this.dreams.length === 0) return;

      if (this.positiveCount > this.negativeCount && this.positiveCount > this.neutralCount) {
        this.insights.push({
          icon: '😊',
          text: '您的梦境整体偏向积极，这可能反映了您近期良好的心理状态。'
        });
      } else if (this.negativeCount > this.positiveCount && this.negativeCount > this.neutralCount) {
        this.insights.push({
          icon: '😟',
          text: '您的梦境中消极情绪较多，建议关注自己的心理健康状况。'
        });
      }

      if (this.topThemes.length > 0) {
        this.insights.push({
          icon: '🎯',
          text: `您梦境中最常出现的主题是"${this.topThemes[0].name}"，这可能是您当前生活中重要的关注点。`
        });
      }

      if (this.dreams.length >= 5) {
        const avgClarity = this.dreams.reduce((sum, d) => sum + (d.clarity || 5), 0) / this.dreams.length;
        if (avgClarity >= 7) {
          this.insights.push({
            icon: '🌟',
            text: `您的梦境清晰度平均为${avgClarity.toFixed(1)}/10，说明您对梦境的记忆能力很强。`
          });
        }
      }
    },
    goToAdd() {
      uni.switchTab({
        url: '/pages/add-dream/add-dream'
      });
    },
    formatShortDate(dateStr) {
      const date = new Date(dateStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}/${day}`;
    },
    getBarHeight(value, max) {
      if (max === 0) return 0;
      return Math.max(5, (value / max) * 100);
    },
    getThemeProgress(count, max) {
      if (max === 0) return 0;
      return (count / max) * 100;
    },
    getEntitySizeClass(count) {
      if (count >= 5) return 'entity-large';
      if (count >= 3) return 'entity-medium';
      return 'entity-small';
    },
    getKeywordSizeClass(count) {
      if (count >= 8) return 'keyword-xlarge';
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
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  padding-bottom: 120rpx;
}

.header {
  padding: 60rpx 40rpx 40rpx;
  text-align: center;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #fff;
  display: block;
  margin-bottom: 10rpx;
}

.subtitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  display: block;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
}

.loading-text {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 40rpx;
  text-align: center;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 30rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #fff;
  margin-bottom: 10rpx;
}

.empty-subtext {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 40rpx;
}

.add-btn {
  background: rgba(255, 255, 255, 0.2);
  padding: 20rpx 40rpx;
  border-radius: 40rpx;
  backdrop-filter: blur(10px);
}

.add-btn-text {
  color: #fff;
  font-size: 28rpx;
  font-weight: 500;
}

.analysis-content {
  background: #f8f8f8;
  border-radius: 40rpx 40rpx 0 0;
  min-height: 60vh;
  padding: 30rpx;
}

.overview-section {
  margin-bottom: 30rpx;
}

.section-header {
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.stat-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  text-align: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.stat-number {
  font-size: 48rpx;
  font-weight: bold;
  color: #667eea;
  display: block;
}

.stat-label {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}

.emotion-trend-section {
  margin-bottom: 30rpx;
}

.trend-chart {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.trend-item {
  display: flex;
  align-items: flex-end;
  margin-bottom: 20rpx;
}

.trend-item:last-child {
  margin-bottom: 0;
}

.trend-date {
  font-size: 22rpx;
  color: #999;
  width: 80rpx;
  text-align: center;
  margin-right: 20rpx;
}

.trend-bars {
  flex: 1;
  display: flex;
  gap: 16rpx;
  align-items: flex-end;
  height: 160rpx;
}

.trend-bar {
  flex: 1;
  display: flex;
  align-items: flex-end;
  height: 100%;
}

.trend-bar-fill {
  width: 100%;
  border-radius: 8rpx 8rpx 0 0;
  transition: height 0.3s ease;
}

.trend-bar.positive .trend-bar-fill {
  background: linear-gradient(180deg, #52c41a 0%, #73d13d 100%);
}

.trend-bar.neutral .trend-bar-fill {
  background: linear-gradient(180deg, #667eea 0%, #85a0ff 100%);
}

.trend-bar.negative .trend-bar-fill {
  background: linear-gradient(180deg, #f5222d 0%, #ff4d4f 100%);
}

.trend-legend {
  display: flex;
  justify-content: center;
  gap: 40rpx;
  margin-top: 20rpx;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.legend-color {
  width: 20rpx;
  height: 20rpx;
  border-radius: 4rpx;
}

.legend-color.positive {
  background: #52c41a;
}

.legend-color.neutral {
  background: #667eea;
}

.legend-color.negative {
  background: #f5222d;
}

.legend-text {
  font-size: 22rpx;
  color: #999;
}

.themes-section {
  margin-bottom: 30rpx;
}

.themes-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.theme-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.theme-rank {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 50%;
  font-size: 24rpx;
  font-weight: 500;
}

.theme-info {
  flex: 1;
}

.theme-name {
  font-size: 28rpx;
  color: #333;
  display: block;
}

.theme-count {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-top: 4rpx;
}

.theme-progress {
  width: 120rpx;
  height: 8rpx;
  background: #f0f0f0;
  border-radius: 4rpx;
  overflow: hidden;
}

.theme-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 4rpx;
  transition: width 0.3s ease;
}

.entities-section {
  margin-bottom: 30rpx;
}

.entities-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.entity-tag {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  border-radius: 24rpx;
}

.entity-large {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 16rpx 28rpx;
}

.entity-large .entity-text {
  font-size: 30rpx;
  color: #fff;
  font-weight: 500;
}

.entity-large .entity-count {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
}

.entity-medium {
  background: linear-gradient(135deg, #85a0ff 0%, #a5b4fc 100%);
}

.entity-medium .entity-text {
  font-size: 26rpx;
  color: #fff;
}

.entity-medium .entity-count {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.8);
}

.entity-small {
  background: #f0f4ff;
}

.entity-small .entity-text {
  font-size: 24rpx;
  color: #667eea;
}

.entity-small .entity-count {
  font-size: 18rpx;
  color: #999;
}

.keywords-section {
  margin-bottom: 30rpx;
}

.keywords-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.keyword-tag {
  padding: 12rpx 24rpx;
  border-radius: 24rpx;
}

.keyword-xlarge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 16rpx 32rpx;
}

.keyword-xlarge .keyword-text {
  font-size: 36rpx;
  color: #fff;
  font-weight: 500;
}

.keyword-large {
  background: linear-gradient(135deg, #85a0ff 0%, #a5b4fc 100%);
}

.keyword-large .keyword-text {
  font-size: 30rpx;
  color: #fff;
}

.keyword-medium {
  background: #f0f4ff;
}

.keyword-medium .keyword-text {
  font-size: 26rpx;
  color: #667eea;
}

.keyword-small {
  background: #f8f9fa;
}

.keyword-small .keyword-text {
  font-size: 22rpx;
  color: #999;
}

.insights-section {
  margin-bottom: 30rpx;
}

.insights-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.insight-item {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.insight-icon {
  font-size: 40rpx;
  margin-top: 4rpx;
}

.insight-text {
  flex: 1;
  font-size: 26rpx;
  color: #666;
  line-height: 1.8;
}
</style>
