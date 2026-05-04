<template>
  <div class="home-view">
    <div class="header-section">
      <div class="header-content">
        <h1 class="title">梦境日记</h1>
        <p class="subtitle">记录每一个奇妙的夜晚</p>
      </div>
    </div>

    <div class="content-section">
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-number">{{ dreams.length }}</span>
          <span class="stat-label">梦境总数</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ analyzedCount }}</span>
          <span class="stat-label">已分析</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ positiveCount }}</span>
          <span class="stat-label">积极梦境</span>
        </div>
      </div>

      <div class="list-section">
        <div class="section-header">
          <h2 class="section-title">最近记录</h2>
          <button class="add-btn" @click="goToAdd">
            <span class="add-btn-text">+ 记录梦境</span>
          </button>
        </div>

        <div v-if="loading" class="loading-container">
          <div class="loading-spinner"></div>
          <span class="loading-text">加载中...</span>
        </div>

        <div v-else-if="dreams.length === 0" class="empty-state">
          <span class="empty-state-icon">📝</span>
          <span class="empty-state-text">还没有记录任何梦境</span>
          <span class="empty-state-subtext">点击上方按钮开始记录吧</span>
        </div>

        <div v-else class="dream-list">
          <div 
            v-for="dream in dreams" 
            :key="dream.id" 
            class="dream-item card"
            @click="goToDetail(dream.id)"
          >
            <div class="dream-header">
              <h3 class="dream-title">{{ dream.title }}</h3>
              <span class="dream-date">{{ formatDate(dream.date) }}</span>
            </div>
            <div class="dream-content">
              <p class="dream-preview">{{ truncateText(dream.content, 80) }}</p>
            </div>
            <div class="dream-tags">
              <span 
                v-if="dream.emotion" 
                :class="['tag', getEmotionTagClass(dream.emotion)]"
              >
                {{ dream.emotion }}
              </span>
              <span v-if="dream.clarity" class="tag tag-clarity">
                清晰度: {{ dream.clarity }}/10
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import dreamApi from '@/api/index.js';

const router = useRouter();
const dreams = ref([]);
const loading = ref(true);

const analyzedCount = computed(() => {
  return dreams.value.filter(d => d.analysis).length;
});

const positiveCount = computed(() => {
  return dreams.value.filter(d => {
    if (!d.emotion) return false;
    const emotion = d.emotion.toLowerCase();
    return emotion.includes('积极') || emotion.includes('positive') || emotion.includes('happy');
  }).length;
});

const loadDreams = async () => {
  loading.value = true;
  try {
    const result = await dreamApi.getAll();
    dreams.value = result || [];
  } catch (error) {
    console.error('加载梦境列表失败:', error);
    // 使用模拟数据进行演示
    dreams.value = [
      {
        id: 1,
        title: '飞翔的梦',
        content: '昨晚我梦见自己在天空中自由飞翔，感觉非常轻松和快乐。飞过了一片美丽的草原，看到了很多彩色的花朵...',
        date: '2024-05-02',
        emotion: '积极',
        clarity: 8,
        analysis: true
      },
      {
        id: 2,
        title: '神秘森林',
        content: '我走进了一片神秘的森林，树木很高，阳光透过树叶洒下斑驳的光影。突然听到了远处传来的声音...',
        date: '2024-05-01',
        emotion: '中性',
        clarity: 6,
        analysis: true
      }
    ];
  } finally {
    loading.value = false;
  }
};

const goToAdd = () => {
  router.push('/add');
};

const goToDetail = (id) => {
  router.push(`/detail/${id}`);
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
};

const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const getEmotionTagClass = (emotion) => {
  const lowerEmotion = emotion.toLowerCase();
  if (lowerEmotion.includes('积极') || lowerEmotion.includes('positive') || lowerEmotion.includes('happy')) {
    return 'tag-positive';
  }
  if (lowerEmotion.includes('消极') || lowerEmotion.includes('negative') || lowerEmotion.includes('scary')) {
    return 'tag-negative';
  }
  return 'tag-neutral';
};

onMounted(() => {
  loadDreams();
});
</script>

<style scoped>
.home-view {
  min-height: 100vh;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  padding-bottom: 80px;
}

.header-section {
  padding: 40px 20px;
  text-align: center;
}

.header-content {
  max-width: 750px;
  margin: 0 auto;
}

.title {
  font-size: 32px;
  font-weight: bold;
  color: #fff;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

.content-section {
  background: #f8f8f8;
  border-radius: 32px 32px 0 0;
  min-height: 60vh;
  padding: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px 12px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.stat-number {
  display: block;
  font-size: 28px;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 4px;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #999;
}

.list-section {
  max-width: 750px;
  margin: 0 auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0;
}

.add-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 10px 20px;
  border-radius: 20px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.add-btn:active {
  transform: scale(0.95);
}

.add-btn-text {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: #999;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-state-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state-text {
  font-size: 16px;
  color: #999;
  margin-bottom: 8px;
}

.empty-state-subtext {
  font-size: 14px;
  color: #ccc;
}

.dream-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dream-item {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.dream-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.dream-item:active {
  transform: scale(0.98);
}

.dream-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.dream-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0;
  flex: 1;
  margin-right: 12px;
}

.dream-date {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.dream-content {
  margin-bottom: 12px;
}

.dream-preview {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0;
}

.dream-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.tag-positive {
  background-color: #e6fffb;
  color: #13c2c2;
}

.tag-negative {
  background-color: #fff2f0;
  color: #ff4d4f;
}

.tag-neutral {
  background-color: #f0f4ff;
  color: #667eea;
}

.tag-clarity {
  background-color: #fffbe6;
  color: #faad14;
}

@media (max-width: 480px) {
  .title {
    font-size: 28px;
  }
  
  .stats-grid {
    gap: 8px;
  }
  
  .stat-card {
    padding: 16px 8px;
  }
  
  .stat-number {
    font-size: 24px;
  }
}
</style>
