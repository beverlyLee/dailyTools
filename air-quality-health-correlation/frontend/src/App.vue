<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <div class="header-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
            <circle cx="8" cy="10" r="2" fill="currentColor" opacity="0.6"/>
            <circle cx="12" cy="8" r="1.5" fill="currentColor" opacity="0.5"/>
            <circle cx="16" cy="11" r="1.8" fill="currentColor" opacity="0.4"/>
          </svg>
        </div>
        <div class="header-text">
          <h1>城市空气质量与个人健康关联分析</h1>
          <p class="subtitle">追踪空气质量变化，守护您的健康生活</p>
        </div>
      </div>
    </header>

    <main class="app-main">
      <section class="control-section">
        <div class="control-card">
          <div class="control-header">
            <h3>数据设置</h3>
            <div class="data-source-badge" :class="dataSourceMode">
              <span class="badge-icon">{{ dataSourceMode === 'real' ? '🔗' : '🎯' }}</span>
              <span>{{ dataSourceMode === 'real' ? '真实API' : '智能模拟' }}</span>
            </div>
          </div>
          <div class="control-content">
            <div class="control-item">
              <label>数据源模式</label>
              <div class="control-input">
                <select v-model="useMockData" class="select-input">
                  <option :value="true">🎯 智能模拟数据 (推荐，无需配置)</option>
                  <option :value="false">🔗 真实和风天气API (需配置API Key)</option>
                </select>
              </div>
            </div>
            <div class="control-item city-select">
              <label>选择城市</label>
              <div class="control-input">
                <select v-model="location" class="select-input">
                  <option v-for="city in locations" :key="city.code" :value="city.code">
                    🏙️ {{ city.name }} ({{ city.code }})
                  </option>
                </select>
              </div>
            </div>
            <div class="control-item">
              <label></label>
              <div class="control-input">
                <button class="btn btn-primary" @click="loadData">
                  <svg class="btn-icon" viewBox="0 0 24 24" fill="none">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"/>
                  </svg>
                  刷新数据
                </button>
              </div>
            </div>
          </div>
          <div class="data-source-info" v-if="useMockData">
            <div class="info-icon">ℹ️</div>
            <div class="info-content">
              <p><strong>智能模拟模式</strong>：系统正在使用智能模拟数据，空气质量数据会根据以下因素生成：</p>
              <ul>
                <li>季节性变化（冬季空气质量较差，夏季较好）</li>
                <li>工作日/周末差异（工作日污染较重）</li>
                <li>不同城市的空气质量特征</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section class="stats-section" v-if="analysisResult">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon total">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
              </svg>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ analysisResult.totalDays }}</div>
              <div class="stat-label">总记录天数</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon sick">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <line x1="8" y1="9" x2="10" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <line x1="10" y1="9" x2="8" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <line x1="14" y1="9" x2="16" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <line x1="16" y1="9" x2="14" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M8 16c1.5-2 5.5-2 8 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ analysisResult.sickDays }}</div>
              <div class="stat-label">生病天数</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon healthy">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M8 14l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ analysisResult.healthyDays }}</div>
              <div class="stat-label">健康天数</div>
            </div>
          </div>
        </div>
        
        <div class="analysis-section" v-if="analysisResult.sickDays > 0">
          <h3 class="section-title">关联分析结果</h3>
          <div class="analysis-grid">
            <div class="analysis-card high">
              <div class="analysis-header">
                <span class="analysis-label">生病时平均 AQI</span>
                <span class="analysis-badge warning">偏高</span>
              </div>
              <div class="analysis-value">{{ analysisResult.avgAQIWhenSick.toFixed(1) }}</div>
              <div class="analysis-compare">
                <span v-if="analysisResult.avgAQIWhenSick > analysisResult.avgAQIWhenHealthy">
                  比健康时高 {{ (analysisResult.avgAQIWhenSick - analysisResult.avgAQIWhenHealthy).toFixed(1) }}
                </span>
              </div>
            </div>
            <div class="analysis-card low">
              <div class="analysis-header">
                <span class="analysis-label">健康时平均 AQI</span>
                <span class="analysis-badge good">正常</span>
              </div>
              <div class="analysis-value">{{ analysisResult.avgAQIWhenHealthy.toFixed(1) }}</div>
              <div class="analysis-compare">
                <span v-if="analysisResult.avgAQIWhenSick > analysisResult.avgAQIWhenHealthy">
                  空气质量更好
                </span>
              </div>
            </div>
            <div class="analysis-card info">
              <div class="analysis-header">
                <span class="analysis-label">高 AQI (>100) 时生病天数</span>
              </div>
              <div class="analysis-value">{{ analysisResult.highAQISickDays }}</div>
              <div class="analysis-compare">
                <span>占生病天数的 {{ analysisResult.sickDays > 0 ? (analysisResult.highAQISickDays / analysisResult.sickDays * 100).toFixed(0) : 0 }}%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="chart-section">
        <div class="chart-header">
          <h3>空气质量趋势与健康关联</h3>
          <div class="chart-legend">
            <div class="legend-item">
              <span class="legend-dot aqi"></span>
              <span>AQI 指数</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot pm25"></span>
              <span>PM2.5 浓度</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot sick"></span>
              <span>生病日期</span>
            </div>
          </div>
        </div>
        <div class="chart-container">
          <DualYAxisChart
            :chart-data="chartData"
            :title="''"
            height="450px"
          />
        </div>
        <div class="aqi-legend">
          <div class="aqi-level level-good">
            <span class="aqi-color"></span>
            <span class="aqi-text">优 (0-50)</span>
          </div>
          <div class="aqi-level level-moderate">
            <span class="aqi-color"></span>
            <span class="aqi-text">良 (51-100)</span>
          </div>
          <div class="aqi-level level-light">
            <span class="aqi-color"></span>
            <span class="aqi-text">轻度污染 (101-150)</span>
          </div>
          <div class="aqi-level level-moderate-pollution">
            <span class="aqi-color"></span>
            <span class="aqi-text">中度污染 (151-200)</span>
          </div>
          <div class="aqi-level level-heavy">
            <span class="aqi-color"></span>
            <span class="aqi-text">重度污染 (201-300)</span>
          </div>
          <div class="aqi-level level-severe">
            <span class="aqi-color"></span>
            <span class="aqi-text">严重污染 (>300)</span>
          </div>
        </div>
      </section>

      <section class="records-section">
        <div class="section-header">
          <h3>健康记录管理</h3>
          <button class="btn btn-outline" @click="showForm = !showForm; editingRecord = null">
            <svg v-if="!showForm" class="btn-icon" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <svg v-else class="btn-icon" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            {{ showForm ? '收起表单' : '添加记录' }}
          </button>
        </div>

        <div v-if="showForm" class="form-wrapper">
          <HealthRecordForm
            :editing-record="editingRecord"
            @saved="handleRecordSaved"
            @cancelled="handleFormCancelled"
          />
        </div>

        <div class="records-container" v-if="healthRecords.length > 0">
          <div class="record-card" v-for="record in healthRecords" :key="record.id">
            <div class="record-date">{{ formatDate(record.date) }}</div>
            <div class="record-status" :class="record.isSick ? 'sick' : 'healthy'">
              <span v-if="record.isSick" class="status-icon">😷</span>
              <span v-else class="status-icon">😊</span>
              <span>{{ record.isSick ? '生病' : '健康' }}</span>
            </div>
            <div class="record-details" v-if="record.isSick">
              <div class="detail-item">
                <span class="detail-label">症状:</span>
                <span class="detail-value">{{ record.symptoms || '未记录' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">严重程度:</span>
                <div class="severity-bar">
                  <div 
                    class="severity-fill" 
                    :style="{ width: (record.severity / 5 * 100) + '%' }"
                  ></div>
                </div>
                <span class="severity-value">{{ record.severity }}/5</span>
              </div>
            </div>
            <div class="record-actions">
              <button class="action-btn edit" @click="editRecord(record)">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/>
                </svg>
                编辑
              </button>
              <button class="action-btn delete" @click="deleteRecord(record)">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2"/>
                </svg>
                删除
              </button>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
              <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
              <path d="M9 16l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
            </svg>
          </div>
          <p class="empty-text">暂无健康记录</p>
          <p class="empty-hint">点击上方"添加记录"按钮开始记录您的健康状况</p>
        </div>
      </section>
    </main>

    <footer class="app-footer">
      <p>空气质量与健康关联分析系统 | 数据仅供参考，身体不适请及时就医</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { healthRecordApi, correlationApi, airQualityApi } from './services/api'
import DualYAxisChart from './components/DualYAxisChart.vue'
import HealthRecordForm from './components/HealthRecordForm.vue'

const useMockData = ref(true)
const location = ref('101010100')
const healthRecords = ref([])
const analysisResult = ref(null)
const showForm = ref(false)
const editingRecord = ref(null)
const locations = ref([
  { code: '101010100', name: '北京' },
  { code: '101020100', name: '上海' },
  { code: '101280101', name: '广州' },
  { code: '101280601', name: '深圳' },
  { code: '101040100', name: '重庆' },
  { code: '101270101', name: '成都' },
  { code: '101210101', name: '杭州' },
  { code: '101190101', name: '南京' },
  { code: '101200101', name: '武汉' },
  { code: '101110101', name: '西安' },
])

const dataSourceMode = computed(() => {
  return useMockData.value ? 'mock' : 'real'
})

const chartData = computed(() => {
  if (!analysisResult.value || !analysisResult.value.correlationData) {
    return {
      dates: [],
      aqiData: [],
      pm25Data: [],
      sickData: []
    }
  }

  const data = analysisResult.value.correlationData
  return {
    dates: data.map(item => formatDateForChart(item.date)),
    aqiData: data.map(item => item.aqi || null),
    pm25Data: data.map(item => item.pm25 || null),
    sickData: data.map(item => item.isSick)
  }
})

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  })
}

const formatDateForChart = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toISOString().split('T')[0]
}

const loadData = async () => {
  try {
    let response
    if (useMockData.value) {
      response = await correlationApi.getMockData()
    } else {
      response = await correlationApi.analyze({
        location: location.value
      })
    }
    analysisResult.value = response.data

    if (!useMockData.value) {
      await loadHealthRecords()
    }
  } catch (error) {
    console.error('Error loading data:', error)
    alert('加载数据失败，请检查后端服务是否启动')
  }
}

const loadHealthRecords = async () => {
  try {
    const response = await healthRecordApi.getAll()
    healthRecords.value = response.data
  } catch (error) {
    console.error('Error loading health records:', error)
  }
}

const loadLocations = async () => {
  try {
    const response = await airQualityApi.getLocations()
    if (response.data && response.data.locations) {
      locations.value = response.data.locations
    }
  } catch (error) {
    console.error('Error loading locations:', error)
  }
}

const editRecord = (record) => {
  editingRecord.value = record
  showForm.value = true
}

const deleteRecord = async (record) => {
  if (confirm(`确定要删除 ${formatDate(record.date)} 的记录吗？`)) {
    try {
      await healthRecordApi.delete(record.id)
      await loadHealthRecords()
      if (!useMockData.value) {
        await loadData()
      }
    } catch (error) {
      console.error('Error deleting record:', error)
      alert('删除失败，请重试')
    }
  }
}

const handleRecordSaved = async () => {
  showForm.value = false
  editingRecord.value = null
  await loadHealthRecords()
  if (!useMockData.value) {
    await loadData()
  }
}

const handleFormCancelled = () => {
  showForm.value = false
  editingRecord.value = null
}

onMounted(() => {
  loadData()
  loadHealthRecords()
  loadLocations()
})
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  color: white;
  padding: 32px 24px;
  box-shadow: 0 4px 20px rgba(30, 136, 229, 0.3);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 24px;
}

.header-icon {
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-icon svg {
  width: 40px;
  height: 40px;
}

.header-text h1 {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
  letter-spacing: 0.5px;
}

.subtitle {
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
  font-weight: 400;
}

.app-main {
  flex: 1;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 24px;
}

.control-section {
  margin-bottom: 24px;
}

.control-card {
  background: white;
  border-radius: 16px;
  box-shadow: var(--card-shadow);
  overflow: hidden;
}

.control-header {
  background: linear-gradient(90deg, var(--light-blue) 0%, var(--light-teal) 100%);
  padding: 16px 24px;
  border-bottom: 1px solid rgba(30, 136, 229, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.control-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.data-source-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.data-source-badge.mock {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  color: #2e7d32;
}

.data-source-badge.real {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  color: #1565c0;
}

.badge-icon {
  font-size: 14px;
}

.control-content {
  padding: 24px 24px 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 200px;
}

.control-item.city-select {
  flex: 1;
  min-width: 280px;
}

.control-item label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.select-input,
.text-input {
  padding: 12px 16px;
  border: 2px solid #e3f2fd;
  border-radius: 10px;
  font-size: 15px;
  transition: all 0.2s ease;
  background: white;
  min-width: 220px;
  cursor: pointer;
}

.select-input:focus,
.text-input:focus {
  outline: none;
  border-color: var(--primary-blue);
  box-shadow: 0 0 0 3px rgba(30, 136, 229, 0.1);
}

.data-source-info {
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
  border-left: 4px solid #ff9800;
  padding: 16px 20px;
  margin: 0 24px 24px;
  border-radius: 0 10px 10px 0;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.info-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.info-content p {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #e65100;
}

.info-content ul {
  margin: 0;
  padding-left: 20px;
}

.info-content li {
  font-size: 13px;
  color: #f57c00;
  margin-bottom: 4px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon {
  width: 18px;
  height: 18px;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary-blue) 0%, #1565c0 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(30, 136, 229, 0.4);
}

.btn-outline {
  background: white;
  color: var(--primary-blue);
  border: 2px solid var(--primary-blue);
}

.btn-outline:hover {
  background: var(--primary-blue);
  color: white;
}

.stats-section {
  margin-bottom: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--card-shadow);
  display: flex;
  align-items: center;
  gap: 20px;
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg {
  width: 28px;
  height: 28px;
}

.stat-icon.total {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  color: var(--primary-blue);
}

.stat-icon.sick {
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  color: var(--accent-red);
}

.stat-icon.healthy {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  color: var(--primary-green);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.1;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.analysis-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--card-shadow);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 20px 0;
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.analysis-card {
  padding: 20px;
  border-radius: 12px;
}

.analysis-card.high {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-left: 4px solid var(--accent-orange);
}

.analysis-card.low {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border-left: 4px solid var(--primary-green);
}

.analysis-card.info {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-left: 4px solid var(--primary-blue);
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.analysis-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.analysis-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.analysis-badge.warning {
  background: rgba(255, 152, 0, 0.2);
  color: #ef6c00;
}

.analysis-badge.good {
  background: rgba(67, 160, 71, 0.2);
  color: #2e7d32;
}

.analysis-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
}

.analysis-compare {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.chart-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: var(--card-shadow);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.chart-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.chart-legend {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.legend-dot.aqi {
  background: #1e88e5;
}

.legend-dot.pm25 {
  background: #26a69a;
}

.legend-dot.sick {
  background: #e53935;
}

.chart-container {
  width: 100%;
}

.aqi-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e3f2fd;
}

.aqi-level {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.aqi-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.level-good .aqi-color { background: #00e400; }
.level-moderate .aqi-color { background: #ffff00; }
.level-light .aqi-color { background: #ff7e00; }
.level-moderate-pollution .aqi-color { background: #ff0000; }
.level-heavy .aqi-color { background: #99004c; }
.level-severe .aqi-color { background: #7e0023; }

.records-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--card-shadow);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.form-wrapper {
  margin-bottom: 24px;
}

.records-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.record-card {
  background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e3f2fd;
  transition: all 0.2s ease;
}

.record-card:hover {
  border-color: var(--primary-blue);
  box-shadow: 0 4px 12px rgba(30, 136, 229, 0.15);
}

.record-date {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.record-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 8px;
}

.record-status.healthy {
  background: rgba(67, 160, 71, 0.1);
}

.record-status.sick {
  background: rgba(229, 57, 53, 0.1);
}

.status-icon {
  font-size: 20px;
}

.record-status span:last-child {
  font-weight: 500;
}

.record-status.healthy span:last-child {
  color: var(--primary-green);
}

.record-status.sick span:last-child {
  color: var(--accent-red);
}

.record-details {
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
}

.detail-label {
  color: var(--text-secondary);
  font-weight: 500;
}

.detail-value {
  color: var(--text-primary);
}

.severity-bar {
  flex: 1;
  height: 8px;
  background: #e3f2fd;
  border-radius: 4px;
  overflow: hidden;
}

.severity-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-green) 0%, var(--accent-orange) 50%, var(--accent-red) 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.severity-value {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 40px;
}

.record-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn svg {
  width: 14px;
  height: 14px;
}

.action-btn.edit {
  background: rgba(30, 136, 229, 0.1);
  color: var(--primary-blue);
}

.action-btn.edit:hover {
  background: var(--primary-blue);
  color: white;
}

.action-btn.delete {
  background: rgba(229, 57, 53, 0.1);
  color: var(--accent-red);
}

.action-btn.delete:hover {
  background: var(--accent-red);
  color: white;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: var(--light-blue);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon svg {
  width: 40px;
  height: 40px;
  color: var(--primary-blue);
}

.empty-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 14px;
  color: var(--text-secondary);
}

.app-footer {
  background: white;
  padding: 20px;
  text-align: center;
  border-top: 1px solid #e3f2fd;
  margin-top: auto;
}

.app-footer p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    text-align: center;
  }

  .header-text h1 {
    font-size: 22px;
  }

  .control-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .control-content {
    flex-direction: column;
  }

  .control-item {
    width: 100%;
  }

  .control-item.city-select {
    min-width: auto;
  }

  .select-input,
  .text-input {
    width: 100%;
  }

  .data-source-info {
    flex-direction: column;
    margin: 0 16px 16px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .analysis-grid {
    grid-template-columns: 1fr;
  }

  .chart-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .aqi-legend {
    justify-content: center;
  }

  .records-container {
    grid-template-columns: 1fr;
  }
}
</style>
