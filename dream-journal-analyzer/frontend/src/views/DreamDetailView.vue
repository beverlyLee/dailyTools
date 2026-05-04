<template>
  <div class="dream-detail-view">
    <div class="header-bar">
      <button class="back-btn" @click="goBack">
        <span class="back-icon">‹</span>
      </button>
      <h1 class="header-title">梦境详情</h1>
      <div class="header-action"></div>
    </div>

    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <span class="loading-text">加载中...</span>
    </div>

    <div v-else class="content-section" v-if="dream">
      <div class="dream-header card">
        <div class="dream-main-info">
          <h2 class="dream-title">{{ dream.title }}</h2>
          <div class="dream-meta">
            <span class="dream-date">{{ formatDate(dream.date) }}</span>
            <span 
              v-if="dream.emotion" 
              :class="['tag', getEmotionTagClass(dream.emotion)]"
            >
              {{ dream.emotion }}
            </span>
          </div>
        </div>
        <div class="clarity-badge" v-if="dream.clarity">
          <span class="clarity-number">{{ dream.clarity }}</span>
          <span class="clarity-label">清晰度</span>
        </div>
      </div>

      <div class="dream-content card">
        <h3 class="section-title">梦境内容</h3>
        <p class="dream-text">{{ dream.content }}</p>
      </div>

      <div class="action-buttons">
        <button class="action-btn action-edit" @click="editDream">
          <span class="action-icon">✏️</span>
          <span class="action-text">编辑</span>
        </button>
        <button class="action-btn action-analyze" @click="reAnalyze" v-if="analysis">
          <span class="action-icon">🔄</span>
          <span class="action-text">重新分析</span>
        </button>
        <button class="action-btn action-delete" @click="deleteDream">
          <span class="action-icon">🗑️</span>
          <span class="action-text">删除</span>
        </button>
      </div>

      <div v-if="analysis" class="analysis-section">
        <h3 class="section-title section-header">分析结果</h3>

        <div class="analysis-card card" v-if="analysis.emotions">
          <div class="analysis-item-header">
            <span class="analysis-icon">💭</span>
            <span class="analysis-label">情感分析</span>
          </div>
          <div class="emotion-stats">
            <div class="emotion-stat">
              <div class="emotion-bar positive">
                <div 
                  class="emotion-fill" 
                  :style="{ width: getEmotionPercentage(analysis.emotions, 'positive') + '%' }"
                ></div>
              </div>
              <span class="emotion-stat-label">积极: {{ analysis.emotions.positive }}</span>
            </div>
            <div class="emotion-stat">
              <div class="emotion-bar negative">
                <div 
                  class="emotion-fill" 
                  :style="{ width: getEmotionPercentage(analysis.emotions, 'negative') + '%' }"
                ></div>
              </div>
              <span class="emotion-stat-label">消极: {{ analysis.emotions.negative }}</span>
            </div>
            <div class="emotion-stat">
              <div class="emotion-bar neutral">
                <div 
                  class="emotion-fill" 
                  :style="{ width: getEmotionPercentage(analysis.emotions, 'neutral') + '%' }"
                ></div>
              </div>
              <span class="emotion-stat-label">中性: {{ analysis.emotions.neutral }}</span>
            </div>
          </div>
          <div class="dominant-emotion">
            <span class="dominant-label">主导情感: </span>
            <span :class="['dominant-value', getDominantEmotionClass(analysis.emotions.dominantEmotion)]">
              {{ getEmotionText(analysis.emotions.dominantEmotion) }}
            </span>
          </div>
        </div>

        <div class="analysis-card card" v-if="analysis.themes && analysis.themes.length > 0">
          <div class="analysis-item-header">
            <span class="analysis-icon">🎯</span>
            <span class="analysis-label">主要主题</span>
          </div>
          <div class="themes-list">
            <div 
              v-for="(theme, index) in analysis.themes" 
              :key="theme.id"
              class="theme-item"
            >
              <span class="theme-index">{{ index + 1 }}</span>
              <span class="theme-name">{{ theme.name }}</span>
              <span v-if="theme.type" class="theme-type">
                {{ getThemeTypeText(theme.type) }}
              </span>
            </div>
          </div>
        </div>

        <div class="analysis-card card" v-if="analysis.entities && analysis.entities.length > 0">
          <div class="analysis-item-header">
            <span class="analysis-icon">👤</span>
            <span class="analysis-label">识别到的实体</span>
          </div>
          <div class="entities-list">
            <div 
              v-for="(entity, index) in analysis.entities" 
              :key="index"
              class="entity-item"
            >
              <span class="entity-text">{{ entity.text }}</span>
              <span :class="['entity-type-badge', getEntityTypeClass(entity.type)]">
                {{ getEntityTypeText(entity.type) }}
              </span>
            </div>
          </div>
        </div>

        <div class="analysis-card card" v-if="analysis.keywords && analysis.keywords.length > 0">
          <div class="analysis-item-header">
            <span class="analysis-icon">🔑</span>
            <span class="analysis-label">高频关键词</span>
          </div>
          <div class="keywords-cloud">
            <div 
              v-for="(keyword, index) in analysis.keywords" 
              :key="index"
              :class="['keyword-item', getKeywordSizeClass(keyword.count)]"
            >
              <span class="keyword-text">{{ keyword.word }}</span>
              <span class="keyword-count">({{ keyword.count }})</span>
            </div>
          </div>
        </div>

        <div class="analysis-card card" v-if="analysis.analysis">
          <div class="analysis-item-header">
            <span class="analysis-icon">📋</span>
            <span class="analysis-label">完整分析报告</span>
          </div>
          <pre class="analysis-full-text">{{ analysis.analysis }}</pre>
        </div>
      </div>

      <div v-else class="no-analysis card" @click="analyzeDream">
        <span class="no-analysis-icon">🔍</span>
        <span class="no-analysis-text">此梦境尚未分析</span>
        <span class="no-analysis-hint">点击此处进行分析</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import dreamApi from '@/api/index.js';

const router = useRouter();
const route = useRoute();

const dreamId = ref(route.params.id);
const loading = ref(true);
const dream = ref(null);
const analysis = ref(null);

const goBack = () => {
  router.push('/home');
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
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

const getEmotionPercentage = (emotions, type) => {
  const total = emotions.positive + emotions.negative + emotions.neutral;
  if (total === 0) return 0;
  return Math.round((emotions[type] / total) * 100);
};

const getEmotionText = (emotion) => {
  const map = {
    'positive': '积极',
    'negative': '消极',
    'neutral': '中性'
  };
  return map[emotion] || emotion;
};

const getDominantEmotionClass = (emotion) => {
  return `dominant-${emotion}`;
};

const getThemeTypeText = (type) => {
  const map = {
    'keyphrase': '关键短语',
    'person': '人物',
    'place': '地点',
    'date': '日期',
    'value': '数值',
    'emotion': '情感'
  };
  return map[type] || type;
};

const getEntityTypeClass = (type) => {
  return `entity-${type}`;
};

const getEntityTypeText = (type) => {
  const map = {
    'person': '人物',
    'place': '地点',
    'date': '日期',
    'value': '数值'
  };
  return map[type] || type;
};

const getKeywordSizeClass = (count) => {
  if (count >= 5) return 'keyword-large';
  if (count >= 3) return 'keyword-medium';
  return 'keyword-small';
};

const loadDream = async () => {
  loading.value = true;
  try {
    const result = await dreamApi.getById(dreamId.value);
    dream.value = result.dream;
    analysis.value = result.analysis;
  } catch (error) {
    console.error('加载梦境失败:', error);
    // 使用模拟数据
    dream.value = {
      id: 1,
      title: '飞翔的梦',
      content: '昨晚我梦见自己在天空中自由飞翔，感觉非常轻松和快乐。飞过了一片美丽的草原，看到了很多彩色的花朵，还有一群可爱的小鸟在我身边飞过。天空是蓝色的，阳光温暖地照在我身上。我感到无比的自由和幸福。',
      date: '2024-05-02',
      emotion: '积极',
      clarity: 8
    };
    analysis.value = {
      emotions: {
        positive: 5,
        negative: 0,
        neutral: 2,
        dominantEmotion: 'positive'
      },
      themes: [
        { id: 1, name: '自由飞翔', type: 'keyphrase' },
        { id: 2, name: '美丽草原', type: 'keyphrase' },
        { id: 3, name: '彩色花朵', type: 'keyphrase' }
      ],
      entities: [
        { text: '小鸟', type: 'person' },
        { text: '天空', type: 'place' },
        { text: '草原', type: 'place' }
      ],
      keywords: [
        { word: '飞翔', count: 3 },
        { word: '快乐', count: 2 },
        { word: '自由', count: 2 },
        { word: '美丽', count: 1 },
        { word: '幸福', count: 1 }
      ],
      analysis: '梦境分析报告：\n\n1. 情感分析：\n   整体情感倾向为积极的。\n   积极词汇：5个\n   消极词汇：0个\n\n2. 主要主题：\n   1. 自由飞翔\n   2. 美丽草原\n   3. 彩色花朵\n\n3. 识别到的实体：\n   1. 小鸟 (人物)\n   2. 天空 (地点)\n   3. 草原 (地点)\n\n4. 高频关键词：\n   1. 飞翔 (出现3次)\n   2. 快乐 (出现2次)\n   3. 自由 (出现2次)'
    };
  } finally {
    loading.value = false;
  }
};

const analyzeDream = async () => {
  loading.value = true;
  try {
    const result = await dreamApi.analyze(dreamId.value);
    analysis.value = result;
    alert('分析完成！');
  } catch (error) {
    console.error('分析失败:', error);
    // 演示模式
    alert('分析完成！（演示模式）');
    analysis.value = {
      emotions: {
        positive: 5,
        negative: 0,
        neutral: 2,
        dominantEmotion: 'positive'
      },
      themes: [
        { id: 1, name: '自由飞翔', type: 'keyphrase' },
        { id: 2, name: '美丽草原', type: 'keyphrase' }
      ],
      entities: [
        { text: '小鸟', type: 'person' },
        { text: '天空', type: 'place' }
      ],
      keywords: [
        { word: '飞翔', count: 3 },
        { word: '快乐', count: 2 }
      ],
      analysis: '梦境分析报告...'
    };
  } finally {
    loading.value = false;
  }
};

const reAnalyze = () => {
  analyzeDream();
};

const editDream = () => {
  router.push(`/add?id=${dreamId.value}`);
};

const deleteDream = () => {
  if (confirm('确定要删除这条梦境记录吗？此操作不可恢复。')) {
    dreamApi.delete(dreamId.value)
      .then(() => {
        alert('删除成功！');
        router.push('/home');
      })
      .catch((error) => {
        console.error('删除失败:', error);
        // 演示模式
        alert('删除成功！（演示模式）');
        router.push('/home');
      });
  }
};

onMounted(() => {
  loadDream();
});
</script>

<style scoped>
.dream-detail-view {
  min-height: 100vh;
  background-color: #f8f8f8;
  padding-bottom: 20px;
}

.header-bar {
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  z-index: 100;
}

.back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:active {
  transform: scale(0.95);
}

.back-icon {
  font-size: 24px;
  color: #fff;
  font-weight: bold;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.header-action {
  width: 36px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.loading-spinner {
  width: 36px;
  height: 36px;
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

.content-section {
  padding: 16px;
  max-width: 750px;
  margin: 0 auto;
}

.dream-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.dream-main-info {
  flex: 1;
  margin-right: 16px;
}

.dream-title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin: 0 0 12px 0;
}

.dream-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.dream-date {
  font-size: 13px;
  color: #999;
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

.clarity-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  flex-shrink: 0;
}

.clarity-number {
  font-size: 24px;
  font-weight: bold;
  color: #fff;
}

.clarity-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.9);
}

.dream-content {
  margin-top: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
}

.dream-text {
  font-size: 15px;
  color: #666;
  line-height: 2;
  margin: 0;
  white-space: pre-wrap;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  margin-bottom: 20px;
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 12px;
  background: #fff;
  border-radius: 12px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:active {
  transform: scale(0.95);
}

.action-icon {
  font-size: 24px;
  margin-bottom: 6px;
}

.action-text {
  font-size: 12px;
  color: #666;
}

.analysis-section {
  margin-top: 16px;
}

.section-header {
  margin-bottom: 16px;
}

.analysis-card {
  margin-bottom: 16px;
}

.analysis-item-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.analysis-icon {
  font-size: 20px;
  margin-right: 10px;
}

.analysis-label {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.emotion-stats {
  margin-bottom: 16px;
}

.emotion-stat {
  margin-bottom: 12px;
}

.emotion-stat:last-child {
  margin-bottom: 0;
}

.emotion-bar {
  height: 12px;
  background: #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 6px;
}

.emotion-fill {
  height: 100%;
  border-radius: 6px;
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
  font-size: 12px;
  color: #999;
}

.dominant-emotion {
  display: flex;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.dominant-label {
  font-size: 14px;
  color: #666;
}

.dominant-value {
  font-size: 15px;
  font-weight: 600;
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
  gap: 10px;
}

.theme-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 10px;
}

.theme-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: #667eea;
  color: #fff;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 600;
  margin-right: 12px;
  flex-shrink: 0;
}

.theme-name {
  flex: 1;
  font-size: 14px;
  color: #333;
}

.theme-type {
  padding: 4px 10px;
  background: #e6fffb;
  border-radius: 8px;
  font-size: 11px;
  color: #13c2c2;
  flex-shrink: 0;
}

.entities-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.entity-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: #f5f5f5;
  border-radius: 16px;
}

.entity-text {
  font-size: 14px;
  color: #333;
  margin-right: 10px;
}

.entity-type-badge {
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 11px;
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
  gap: 12px;
}

.keyword-item {
  display: flex;
  align-items: baseline;
  padding: 8px 16px;
  background: linear-gradient(135deg, #f0f4ff 0%, #faf0ff 100%);
  border-radius: 16px;
}

.keyword-large {
  padding: 10px 18px;
}

.keyword-large .keyword-text {
  font-size: 18px;
  font-weight: 600;
  color: #667eea;
}

.keyword-medium .keyword-text {
  font-size: 15px;
  color: #667eea;
}

.keyword-small .keyword-text {
  font-size: 13px;
  color: #667eea;
}

.keyword-text {
  margin-right: 6px;
}

.keyword-count {
  font-size: 11px;
  color: #999;
}

.analysis-full-text {
  font-size: 14px;
  color: #666;
  line-height: 2;
  white-space: pre-wrap;
  margin: 0;
  font-family: inherit;
}

.no-analysis {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.no-analysis:active {
  background: #f0f0f0;
}

.no-analysis-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.no-analysis-text {
  font-size: 16px;
  color: #999;
  margin-bottom: 8px;
}

.no-analysis-hint {
  font-size: 13px;
  color: #ccc;
}

@media (max-width: 480px) {
  .action-buttons {
    gap: 8px;
  }
  
  .action-btn {
    padding: 14px 8px;
  }
  
  .theme-item {
    padding: 10px 12px;
  }
  
  .theme-index {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }
}
</style>
