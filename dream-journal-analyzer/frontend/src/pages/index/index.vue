<template>
  <view class="container">
    <view class="header">
      <text class="title">梦境日记</text>
      <text class="subtitle">记录每一个奇妙的夜晚</text>
    </view>

    <view class="stats-section">
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
    </view>

    <view class="list-section">
      <view class="section-header">
        <text class="section-title">最近记录</text>
        <view class="add-btn" @click="goToAdd">
          <text class="add-btn-text">+ 记录梦境</text>
        </view>
      </view>

      <view v-if="dreams.length === 0" class="empty-state">
        <text class="empty-text">还没有记录任何梦境</text>
        <text class="empty-subtext">点击上方按钮开始记录吧</text>
      </view>

      <view v-else class="dream-list">
        <view 
          v-for="dream in dreams" 
          :key="dream.id" 
          class="dream-item card"
          @click="goToDetail(dream.id)"
        >
          <view class="dream-header">
            <text class="dream-title">{{ dream.title }}</text>
            <text class="dream-date">{{ formatDate(dream.date) }}</text>
          </view>
          <view class="dream-content">
            <text class="dream-preview">{{ truncateText(dream.content, 80) }}</text>
          </view>
          <view class="dream-tags">
            <view 
              v-if="dream.emotion" 
              :class="['tag', getEmotionTagClass(dream.emotion)]"
            >
              <text class="tag-text">{{ dream.emotion }}</text>
            </view>
            <view v-if="dream.clarity" class="tag tag-clarity">
              <text class="tag-text">清晰度: {{ dream.clarity }}/10</text>
            </view>
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
      dreams: [],
      analyzedCount: 0,
      positiveCount: 0
    };
  },
  onShow() {
    this.loadDreams();
  },
  methods: {
    async loadDreams() {
      try {
        const result = await dreamApi.getAll();
        this.dreams = result || [];
        this.calculateStats();
      } catch (error) {
        console.error('加载梦境列表失败:', error);
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    },
    calculateStats() {
      this.analyzedCount = this.dreams.filter(d => d.analysis).length;
      this.positiveCount = this.dreams.filter(d => 
        d.emotion === '积极' || d.emotion === 'positive'
      ).length;
    },
    goToAdd() {
      uni.navigateTo({
        url: '/pages/add-dream/add-dream'
      });
    },
    goToDetail(id) {
      uni.navigateTo({
        url: `/pages/dream-detail/dream-detail?id=${id}`
      });
    },
    formatDate(dateStr) {
      const date = new Date(dateStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}月${day}日`;
    },
    truncateText(text, maxLength) {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    },
    getEmotionTagClass(emotion) {
      const lowerEmotion = emotion.toLowerCase();
      if (lowerEmotion.includes('积极') || lowerEmotion.includes('positive') || lowerEmotion.includes('happy')) {
        return 'tag-positive';
      }
      if (lowerEmotion.includes('消极') || lowerEmotion.includes('negative') || lowerEmotion.includes('scary')) {
        return 'tag-negative';
      }
      return 'tag-neutral';
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

.stats-section {
  display: flex;
  justify-content: space-around;
  padding: 0 20rpx 30rpx;
}

.stat-card {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16rpx;
  padding: 30rpx 40rpx;
  text-align: center;
  backdrop-filter: blur(10px);
}

.stat-number {
  font-size: 44rpx;
  font-weight: bold;
  color: #fff;
  display: block;
}

.stat-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 8rpx;
  display: block;
}

.list-section {
  background: #f8f8f8;
  border-radius: 40rpx 40rpx 0 0;
  min-height: 60vh;
  padding: 30rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.section-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.add-btn {
  background: #667eea;
  padding: 16rpx 32rpx;
  border-radius: 30rpx;
}

.add-btn-text {
  color: #fff;
  font-size: 28rpx;
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;
}

.empty-text {
  font-size: 32rpx;
  color: #999;
  display: block;
  margin-bottom: 10rpx;
}

.empty-subtext {
  font-size: 26rpx;
  color: #ccc;
  display: block;
}

.dream-list {
  padding-bottom: 40rpx;
}

.dream-item {
  transition: transform 0.2s ease;
}

.dream-item:active {
  transform: scale(0.98);
}

.dream-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16rpx;
}

.dream-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
  margin-right: 20rpx;
}

.dream-date {
  font-size: 24rpx;
  color: #999;
  white-space: nowrap;
}

.dream-content {
  margin-bottom: 20rpx;
}

.dream-preview {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
}

.dream-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag {
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
}

.tag-text {
  color: #fff;
}

.tag-positive {
  background: #52c41a;
}

.tag-negative {
  background: #f5222d;
}

.tag-neutral {
  background: #667eea;
}

.tag-clarity {
  background: #faad14;
}
</style>
