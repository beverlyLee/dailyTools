<template>
  <div class="analysis-view">
    <div class="header-section">
      <div class="header-content">
        <h1 class="title">梦境分析</h1>
        <p class="subtitle">探索梦境背后的意义</p>
      </div>
    </div>

    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <span class="loading-text">分析中...</span>
    </div>

    <div v-else class="content-section">
      <div v-if="dreams.length === 0" class="empty-state">
        <span class="empty-state-icon">📝</span>
        <span class="empty-state-text">还没有记录任何梦境</span>
        <span class="empty-state-subtext">先记录一些梦境才能进行分析</span>
        <button class="add-btn" @click="goToAdd">
          <span class="add-btn-text">+ 记录梦境</span>
        </button>
      </div>

      <div v-else class="analysis-content">
        <div class="overview-section">
          <h2 class="section-title">总体统计</h2>
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
            <div class="stat-card">
              <span class="stat-number">{{ negativeCount }}</span>
              <span class="stat-label">消极梦境</span>
            </div>
          </div>
        </div>

        <div class="emotion-trend-section" v-if="emotionTrend.length > 0">
          <h2 class="section-title">情感趋势</h2>
          <div class="trend-chart card">
            <div class="trend-items">
              <div 
                v-for="(item, index) in emotionTrend" 
                :key="index"
                class="trend-item"
              >
                <span class="trend-date">{{ formatShortDate(item.date) }}</span>
                <div class="trend-bars">
                  <div class="trend-bar positive">
                    <div 
                      class="trend-bar-fill" 
                      :style="{ height: getBarHeight(item.positive, maxEmotionCount) + '%' }"
                    ></div>
                  </div>
                  <div class="trend-bar neutral">
                    <div 
                      class="trend-bar-fill" 
                      :style="{ height: getBarHeight(item.neutral, maxEmotionCount) + '%' }"
                    ></div>
                  </div>
                  <div class="trend-bar negative">
                    <div 
                      class="trend-bar-fill" 
                      :style="{ height: getBarHeight(item.negative, maxEmotionCount) + '%' }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="trend-legend">
              <div class="legend-item">
                <div class="legend-color positive"></div>
                <span class="legend-text">积极</span>
              </div>
              <div class="legend-item">
                <div class="legend-color neutral"></div>
                <span class="legend-text">中性</span>
              </div>
              <div class="legend-item">
                <div class="legend-color negative"></div>
                <span class="legend-text">消极</span>
              </div>
            </div>
          </div>
        </div>

        <div class="themes-section" v-if="topThemes.length > 0">
          <h2 class="section-title">高频主题</h2>
          <div class="themes-list card">
            <div 
              v-for="(theme, index) in topThemes" 
              :key="index"
              class="theme-item"
            >
              <span class="theme-rank">{{ index + 1 }}</span>
              <div class="theme-info">
                <span class="theme-name">{{ theme.name }}</span>
                <span class="theme-count">出现 {{ theme.count }} 次</span>
              </div>
              <div class="theme-progress">
                <div 
                  class="theme-progress-fill" 
                  :style="{ width: getThemeProgress(theme.count, maxThemeCount) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div class="entities-section" v-if="topEntities.length > 0">
          <h2 class="section-title">常见实体</h2>
          <div class="entities-cloud card">
            <div 
              v-for="(entity, index) in topEntities" 
              :key="index"
              :class="['entity-tag', getEntitySizeClass(entity.count)]"
            >
              <span class="entity-text">{{ entity.text }}</span>
              <span class="entity-count">({{ entity.count }})</span>
            </div>
          </div>
        </div>

        <div class="keywords-section" v-if="topKeywords.length > 0">
          <h2 class="section-title">关键词云</h2>
          <div class="keywords-cloud card">
            <div 
              v-for="(keyword, index) in topKeywords" 
              :key="index"
              :class="['keyword-tag', getKeywordSizeClass(keyword.count)]"
            >
              <span class="keyword-text">{{ keyword.word }}</span>
            </div>
          </div>
        </div>

        <div class="insights-section" v-if="insights.length > 0">
          <h2 class="section-title">分析洞察</h2>
          <div class="insights-list">
            <div 
              v-for="(insight, index) in insights" 
              :key="index"
              class="insight-item card"
            >
              <span class="insight-icon">{{ insight.icon }}</span>
              <p class="insight-text">{{ insight.text }}</p>
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

const loading = ref(true);
const dreams = ref([]);
const analyzedCount = ref(0);
const positiveCount = ref(0);
const negativeCount = ref(0);
const neutralCount = ref(0);
const emotionTrend = ref([]);
const maxEmotionCount = ref(1);
const topThemes = ref([]);
const maxThemeCount = ref(1);
const topEntities = ref([]);
const topKeywords = ref([]);
const insights = ref([]);

const goToAdd = () => {
  router.push('/add');
};

const formatShortDate = (dateStr) => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
};

const getBarHeight = (value, max) => {
  if (max === 0) return 0;
  return Math.max(5, (value / max) * 100);
};

const getThemeProgress = (count, max) => {
  if (max === 0) return 0;
  return (count / max) * 100;
};

const getEntitySizeClass = (count) => {
  if (count >= 5) return 'entity-large';
  if (count >= 3) return 'entity-medium';
  return 'entity-small';
};

const getKeywordSizeClass = (count) => {
  if (count >= 8) return 'keyword-xlarge';
  if (count >= 5) return 'keyword-large';
  if (count >= 3) return 'keyword-medium';
  return 'keyword-small';
};

const loadData = async () => {
  loading.value = true;
  try {
    const result = await dreamApi.getAll();
    dreams.value = result || [];
    analyzeData();
  } catch (error) {
    console.error('加载数据失败:', error);
    // 使用模拟数据
    dreams.value = [
      {
        id: 1,
        title: '飞翔的梦',
        content: '昨晚我梦见自己在天空中自由飞翔...',
        date: '2024-05-02',
        emotion: '积极',
        clarity: 8,
        analysis: {
          themes: [
            { name: '自由飞翔' },
            { name: '美丽草原' }
          ],
          entities: [
            { text: '小鸟', type: 'person' },
            { text: '天空', type: 'place' }
          ],
          keywords: [
            { word: '飞翔', count: 3 },
            { word: '快乐', count: 2 }
          ],
          emotions: {
            positive: 5,
            negative: 0,
            neutral: 2
          }
        }
      },
      {
        id: 2,
        title: '神秘森林',
        content: '我走进了一片神秘的森林...',
        date: '2024-05-01',
        emotion: '中性',
        clarity: 6,
        analysis: {
          themes: [
            { name: '神秘森林' },
            { name: '阳光光影' }
          ],
          entities: [
            { text: '树木', type: 'place' }
          ],
          keywords: [
            { word: '森林', count: 2 }
          ],
          emotions: {
            positive: 1,
            negative: 1,
            neutral: 3
          }
        }
      },
      {
        id: 3,
        title: '考试的梦',
        content: '梦见自己在参加一场重要的考试...',
        date: '2024-04-30',
        emotion: '消极',
        clarity: 7,
        analysis: {
          themes: [
            { name: '紧张考试' }
          ],
          entities: [
            { text: '考场', type: 'place' }
          ],
          keywords: [
            { word: '紧张', count: 3 }
          ],
          emotions: {
            positive: 0,
            negative: 4,
            neutral: 2
          }
        }
      }
    ];
    analyzeData();
  } finally {
    loading.value = false;
  }
};

const analyzeData = () => {
  analyzedCount.value = 0;
  positiveCount.value = 0;
  negativeCount.value = 0;
  neutralCount.value = 0;
  
  const themesMap = {};
  const entitiesMap = {};
  const keywordsMap = {};
  const emotionsByDate = {};

  dreams.value.forEach(dream => {
    const date = dream.date;
    const emotion = dream.emotion ? dream.emotion.toLowerCase() : '';
    
    if (dream.analysis) {
      analyzedCount.value++;
      
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
      positiveCount.value++;
    } else if (emotion.includes('消极') || emotion.includes('negative')) {
      negativeCount.value++;
    } else if (emotion.includes('中性') || emotion.includes('neutral')) {
      neutralCount.value++;
    }
  });

  emotionTrend.value = Object.values(emotionsByDate)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-7);
  
  if (emotionTrend.value.length > 0) {
    maxEmotionCount.value = Math.max(
      ...emotionTrend.value.map(item => 
        Math.max(item.positive, item.neutral, item.negative)
      ),
      1
    );
  }

  topThemes.value = Object.entries(themesMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  if (topThemes.value.length > 0) {
    maxThemeCount.value = Math.max(...topThemes.value.map(t => t.count));
  }

  topEntities.value = Object.values(entitiesMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  topKeywords.value = Object.entries(keywordsMap)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  generateInsights();
};

const generateInsights = () => {
  insights.value = [];
  
  if (dreams.value.length === 0) return;

  if (positiveCount.value > negativeCount.value && positiveCount.value > neutralCount.value) {
    insights.value.push({
      icon: '😊',
      text: '您的梦境整体偏向积极，这可能反映了您近期良好的心理状态。'
    });
  } else if (negativeCount.value > positiveCount.value && negativeCount.value > neutralCount.value) {
    insights.value.push({
      icon: '😟',
      text: '您的梦境中消极情绪较多，建议关注自己的心理健康状况。'
    });
  } else {
    insights.value.push({
      icon: '😐',
      text: '您的梦境情感整体较为中性，处于平衡状态。'
    });
  }

  if (topThemes.value.length > 0) {
    insights.value.push({
      icon: '🎯',
      text: `您梦境中最常出现的主题是"${topThemes.value[0].name}"，这可能是您当前生活中重要的关注点。`
    });
  }

  if (dreams.value.length >= 3) {
    const avgClarity = dreams.value.reduce((sum, d) => sum + (d.clarity || 5), 0) / dreams.value.length;
    if (avgClarity >= 7) {
      insights.value.push({
        icon: '🌟',
        text: `您的梦境清晰度平均为${avgClarity.toFixed(1)}/10，说明您对梦境的记忆能力很强。`
      });
    }
  }

  if (topKeywords.value.length > 0) {
    const commonWords = topKeywords.value.slice(0, 3).map(k => k.word).join('、');
    insights.value.push({
      icon: '🔑',
      text: `您梦境中频繁出现的关键词有：${commonWords}。这些词汇可能与您近期的生活经历相关。`
    });
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.analysis-view {
  min-height: 100vh;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  padding-bottom: 80px;
}

.header-section {
  padding: 40px 20px 20px;
  text-align: center;
}

.header-content {
  max-width: 750px;
  margin: 0 auto;
}

.title {
  font-size: 28px;
  font-weight: bold;
  color: #fff;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid #fff;
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
  color: rgba(255, 255, 255, 0.8);
}

.content-section {
  background: #f8f8f8;
  border-radius: 32px 32px 0 0;
  min-height: 60vh;
  padding: 20px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  max-width: 750px;
  margin: 0 auto;
}

.empty-state-icon {
  font-size: 56px;
  margin-bottom: 20px;
}

.empty-state-text {
  font-size: 16px;
  color: #999;
  margin-bottom: 8px;
}

.empty-state-subtext {
  font-size: 14px;
  color: #ccc;
  margin-bottom: 24px;
}

.add-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 12px 28px;
  border-radius: 24px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-btn:active {
  transform: scale(0.95);
}

.add-btn-text {
  color: #fff;
  font-size: 15px;
  font-weight: 500;
}

.analysis-content {
  max-width: 750px;
  margin: 0 auto;
}

.overview-section,
.emotion-trend-section,
.themes-section,
.entities-section,
.keywords-section,
.insights-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px 16px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.stat-number {
  display: block;
  font-size: 32px;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 4px;
}

.stat-label {
  display: block;
  font-size: 13px;
  color: #999;
}

.trend-chart {
  padding: 20px;
}

.trend-items {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 200px;
  padding: 0 10px;
}

.trend-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 40px;
}

.trend-date {
  font-size: 11px;
  color: #999;
  margin-bottom: 8px;
}

.trend-bars {
  display: flex;
  gap: 4px;
  align-items: flex-end;
  height: 140px;
}

.trend-bar {
  width: 12px;
  display: flex;
  align-items: flex-end;
  height: 100%;
}

.trend-bar-fill {
  width: 100%;
  border-radius: 4px 4px 0 0;
  transition: height 0.3s ease;
  min-height: 4px;
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
  gap: 24px;
  margin-top: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
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
  font-size: 12px;
  color: #666;
}

.themes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.theme-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.theme-rank {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.theme-info {
  flex: 1;
  min-width: 0;
}

.theme-name {
  display: block;
  font-size: 15px;
  color: #333;
  font-weight: 500;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theme-count {
  font-size: 12px;
  color: #999;
}

.theme-progress {
  width: 80px;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.theme-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.entities-cloud,
.keywords-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 20px;
}

.entity-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 20px;
  transition: all 0.2s ease;
}

.entity-large {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 12px 20px;
}

.entity-large .entity-text {
  font-size: 16px;
  color: #fff;
  font-weight: 500;
}

.entity-large .entity-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.entity-medium {
  background: linear-gradient(135deg, #85a0ff 0%, #a5b4fc 100%);
}

.entity-medium .entity-text {
  font-size: 14px;
  color: #fff;
}

.entity-medium .entity-count {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
}

.entity-small {
  background: #f0f4ff;
}

.entity-small .entity-text {
  font-size: 13px;
  color: #667eea;
}

.entity-small .entity-count {
  font-size: 10px;
  color: #999;
}

.keyword-tag {
  padding: 10px 16px;
  border-radius: 20px;
  transition: all 0.2s ease;
}

.keyword-xlarge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 14px 24px;
}

.keyword-xlarge .keyword-text {
  font-size: 20px;
  color: #fff;
  font-weight: 600;
}

.keyword-large {
  background: linear-gradient(135deg, #85a0ff 0%, #a5b4fc 100%);
  padding: 12px 20px;
}

.keyword-large .keyword-text {
  font-size: 17px;
  color: #fff;
  font-weight: 500;
}

.keyword-medium {
  background: #f0f4ff;
}

.keyword-medium .keyword-text {
  font-size: 14px;
  color: #667eea;
}

.keyword-small {
  background: #f8f9fa;
}

.keyword-small .keyword-text {
  font-size: 12px;
  color: #999;
}

.insights-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.insight-item {
  display: flex;
  gap: 16px;
  padding: 20px;
}

.insight-icon {
  font-size: 28px;
  flex-shrink: 0;
  margin-top: 2px;
}

.insight-text {
  font-size: 14px;
  color: #666;
  line-height: 1.8;
  margin: 0;
}

@media (max-width: 480px) {
  .stats-grid {
    gap: 8px;
  }
  
  .stat-card {
    padding: 16px 12px;
  }
  
  .stat-number {
    font-size: 28px;
  }
  
  .trend-bar {
    width: 10px;
  }
  
  .theme-progress {
    width: 60px;
  }
}
</style>
