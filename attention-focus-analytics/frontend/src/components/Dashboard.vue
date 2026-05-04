<template>
  <div>
    <div v-if="store.error" class="error-message">
      {{ store.error }}
      <button @click="store.clearError" style="margin-left: 12px; background: transparent; border: none; color: #c62828; cursor: pointer; text-decoration: underline;">
        关闭
      </button>
    </div>

    <div v-if="store.loading" class="loading">
      <div class="spinner"></div>
    </div>

    <template v-else>
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <h2 class="card-title">📊 总体概览</h2>
          <div :class="['data-source-indicator', store.dataSource === 'mock' ? 'mock' : '']">
            <span class="dot"></span>
            {{ store.dataSource === 'mock' ? '模拟数据' : '实际数据' }}
          </div>
        </div>

        <div class="grid grid-4">
          <div class="card score-card">
            <div :class="['score-value', store.getScoreColor(store.overallScore)]">
              {{ store.overallScore }}
            </div>
            <div class="score-label">综合专注度评分</div>
            <div class="score-description">
              基于效率、生产力和集中度的综合评估
            </div>
            <div class="progress-bar">
              <div 
                :class="['progress-fill', getProgressColor(store.overallScore)]"
                :style="{ width: store.overallScore + '%' }"
              ></div>
            </div>
          </div>

          <div class="card score-card">
            <div :class="['score-value', store.getScoreColor(store.efficiencyScore)]">
              {{ store.efficiencyScore }}
            </div>
            <div class="score-label">效率评分</div>
            <div class="score-description">
              深度工作时长占总工作时间的比例
            </div>
            <div class="progress-bar">
              <div 
                :class="['progress-fill', getProgressColor(store.efficiencyScore)]"
                :style="{ width: store.efficiencyScore + '%' }"
              ></div>
            </div>
          </div>

          <div class="card score-card">
            <div :class="['score-value', store.getScoreColor(store.productivityScore)]">
              {{ store.productivityScore }}
            </div>
            <div class="score-label">生产力评分</div>
            <div class="score-description">
              所有工作条目的平均生产力得分
            </div>
            <div class="progress-bar">
              <div 
                :class="['progress-fill', getProgressColor(store.productivityScore)]"
                :style="{ width: store.productivityScore + '%' }"
              ></div>
            </div>
          </div>

          <div class="card score-card">
            <div :class="['score-value', store.getScoreColor(store.concentrationScore)]">
              {{ store.concentrationScore }}
            </div>
            <div class="score-label">集中度评分</div>
            <div class="score-description">
              工作时段的集中程度（时段越少分数越高）
            </div>
            <div class="progress-bar">
              <div 
                :class="['progress-fill', getProgressColor(store.concentrationScore)]"
                :style="{ width: store.concentrationScore + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">⏰ 时间统计</h3>
          </div>
          <div class="time-stats">
            <div class="time-stat">
              <div class="time-stat-value" style="color: #667eea;">{{ store.totalTimeFormatted }}</div>
              <div class="time-stat-label">总工作时间</div>
            </div>
            <div class="time-stat">
              <div class="time-stat-value" style="color: #4caf50;">{{ store.deepWorkTimeFormatted }}</div>
              <div class="time-stat-label">深度工作时间</div>
            </div>
            <div class="time-stat">
              <div class="time-stat-value" style="color: #ff9800;">{{ store.shallowWorkTimeFormatted }}</div>
              <div class="time-stat-label">浅度工作时间</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">🌟 专注力峰值时段</h3>
          </div>
          <div v-if="store.peakHour !== null" class="peak-hour">
            <div class="peak-hour-icon">🌅</div>
            <div class="peak-hour-value">
              {{ store.peakHour }}:00 - {{ store.peakHour + 1 }}:00
            </div>
            <div class="peak-hour-label">您的最佳工作时段</div>
          </div>
          <div v-else class="empty-state">
            <div class="empty-state-icon">📊</div>
            <div class="empty-state-text">暂无足够数据</div>
            <div class="empty-state-hint">添加更多工作记录以分析您的专注时段</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🔥 工作热力图</h3>
          <span class="card-badge">最近14天</span>
        </div>
        <div class="heatmap-container">
          <HeatmapChart :data="heatmapData" />
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📈 效率趋势</h3>
        </div>
        <div class="chart-container">
          <EfficiencyChart :overview="store.overviewData?.data?.overall" />
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🔄 数据同步</h3>
        </div>
        <p style="color: #666; margin-bottom: 16px;">
          从 RescueTime 或 Toggl 同步您的时间追踪数据，或使用模拟数据进行体验。
        </p>
        
        <div class="sync-section">
          <h4 class="sync-title">快速体验（使用模拟数据）</h4>
          <div class="sync-buttons">
            <button 
              class="btn btn-success" 
              :disabled="store.loading"
              @click="handleImportMock"
            >
              📊 导入14天模拟数据
            </button>
            <button 
              class="btn btn-secondary" 
              :disabled="store.loading"
              @click="handleRefresh"
            >
              🔄 刷新数据
            </button>
          </div>
        </div>

        <div class="sync-section" style="margin-top: 16px;">
          <h4 class="sync-title">连接实际数据源</h4>
          
          <div class="grid grid-2" style="margin-bottom: 16px;">
            <div class="form-group">
              <label class="form-label">RescueTime API Key</label>
              <input 
                type="text" 
                v-model="rescuetimeKey"
                class="form-input"
                placeholder="输入您的 RescueTime API Key"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Toggl API Token</label>
              <input 
                type="text" 
                v-model="togglToken"
                class="form-input"
                placeholder="输入您的 Toggl API Token"
              />
            </div>
          </div>

          <div class="sync-buttons">
            <button 
              class="btn btn-primary" 
              :disabled="store.loading || !rescuetimeKey"
              @click="handleSyncRescueTime"
            >
              🔗 从 RescueTime 同步
            </button>
            <button 
              class="btn btn-primary" 
              :disabled="store.loading || !togglToken"
              @click="handleSyncToggl"
            >
              🔗 从 Toggl 同步
            </button>
          </div>

          <p style="font-size: 12px; color: #999; margin-top: 12px;">
            💡 提示：如果没有 API Key，系统会自动使用模拟数据作为兜底。
          </p>
        </div>
      </div>

      <div v-if="store.stats?.data?.totalEntries > 0" class="card">
        <div class="card-header">
          <h3 class="card-title">📝 最近工作记录</h3>
          <span class="card-badge">共 {{ store.stats.data.totalEntries }} 条记录</span>
        </div>
        
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #eee;">
                <th style="text-align: left; padding: 12px; color: #666; font-weight: 500;">描述</th>
                <th style="text-align: left; padding: 12px; color: #666; font-weight: 500;">开始时间</th>
                <th style="text-align: left; padding: 12px; color: #666; font-weight: 500;">时长</th>
                <th style="text-align: left; padding: 12px; color: #666; font-weight: 500;">类型</th>
                <th style="text-align: left; padding: 12px; color: #666; font-weight: 500;">生产力</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="entry in recentEntries" 
                :key="entry.id"
                style="border-bottom: 1px solid #f5f5f5;"
              >
                <td style="padding: 12px;">{{ entry.description }}</td>
                <td style="padding: 12px; color: #666; font-size: 13px;">
                  {{ formatDateTime(entry.start_time) }}
                </td>
                <td style="padding: 12px; color: #666;">{{ formatDuration(entry.duration) }}</td>
                <td style="padding: 12px;">
                  <span 
                    :class="['card-badge', entry.is_deep_work ? '' : '']"
                    :style="entry.is_deep_work ? 'background: #e8f5e9; color: #2e7d32;' : 'background: #fff3e0; color: #ef6c00;'"
                  >
                    {{ entry.is_deep_work ? '深度工作' : '浅度工作' }}
                  </span>
                </td>
                <td style="padding: 12px;">
                  <div 
                    :style="{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      background: store.getScoreBgColor(entry.productivity_score),
                      color: 'inherit'
                    }"
                  >
                    <span :class="store.getScoreColor(entry.productivity_score)">
                      {{ entry.productivity_score }}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { defineComponent, ref, computed } from 'vue'
import { useAnalyticsStore } from '../stores/analyticsStore'
import HeatmapChart from './HeatmapChart.vue'
import EfficiencyChart from './EfficiencyChart.vue'

export default defineComponent({
  name: 'Dashboard',
  components: {
    HeatmapChart,
    EfficiencyChart
  },
  setup() {
    const store = useAnalyticsStore()
    const rescuetimeKey = ref('')
    const togglToken = ref('')

    const heatmapData = computed(() => {
      return store.overviewData?.data?.heatmap || []
    })

    const recentEntries = computed(() => {
      return (store.entries || []).slice(0, 10)
    })

    function getProgressColor(score) {
      if (score >= 70) return 'green'
      if (score >= 50) return 'yellow'
      if (score >= 30) return 'orange'
      return 'red'
    }

    function formatDateTime(isoString) {
      if (!isoString) return '-'
      const date = new Date(isoString)
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    function formatDuration(seconds) {
      if (!seconds) return '-'
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      if (hours > 0) {
        return `${hours}小时${minutes}分钟`
      }
      return `${minutes}分钟`
    }

    async function handleImportMock() {
      try {
        await store.importMockData(14)
      } catch (error) {
        console.error('导入模拟数据失败:', error)
      }
    }

    async function handleRefresh() {
      try {
        await store.fetchOverview()
        await store.fetchStats()
        await store.fetchEntries()
      } catch (error) {
        console.error('刷新数据失败:', error)
      }
    }

    async function handleSyncRescueTime() {
      try {
        await store.syncFromProvider('rescuetime', rescuetimeKey.value, !rescuetimeKey.value)
      } catch (error) {
        console.error('同步 RescueTime 失败:', error)
      }
    }

    async function handleSyncToggl() {
      try {
        await store.syncFromProvider('toggl', togglToken.value, !togglToken.value)
      } catch (error) {
        console.error('同步 Toggl 失败:', error)
      }
    }

    return {
      store,
      rescuetimeKey,
      togglToken,
      heatmapData,
      recentEntries,
      getProgressColor,
      formatDateTime,
      formatDuration,
      handleImportMock,
      handleRefresh,
      handleSyncRescueTime,
      handleSyncToggl
    }
  }
})
</script>
