<template>
  <div class="app-container">
    <header class="header">
      <h1>🏠 通勤租房分析器</h1>
      <p class="subtitle">找到最适合你的居住圈，平衡租金与通勤</p>
      <div class="data-sources">
        <div class="data-source-item">
          <span class="ds-icon">🗺️</span>
          <span class="ds-name">高德地图API</span>
          <span class="ds-desc">通勤时间、拥堵指数</span>
        </div>
        <div class="data-source-item">
          <span class="ds-icon">🏘️</span>
          <span class="ds-name">聚合数据API</span>
          <span class="ds-desc">各区域租金中位数</span>
        </div>
        <div class="data-source-item">
          <span class="ds-icon">🤖</span>
          <span class="ds-name">火山大模型</span>
          <span class="ds-desc">AI智能租房建议</span>
        </div>
      </div>
    </header>

    <main class="main-content">
      <div class="search-section">
        <div class="search-card">
          <div class="form-group">
            <label>选择城市</label>
            <select v-model="city" class="form-control">
              <option value="beijing">北京</option>
              <option value="shanghai">上海</option>
            </select>
          </div>
          <div class="form-group">
            <label>月租金预算 (元)</label>
            <input 
              type="number" 
              v-model.number="budget" 
              class="form-control"
              placeholder="请输入预算"
              min="1000"
              max="50000"
            >
          </div>
          <div class="form-group">
            <label>工作地点</label>
            <select v-model="workLocation" class="form-control">
              <option value="center">市中心</option>
              <option value="wangjing">望京</option>
              <option value="xierqi">西二旗</option>
              <option value="guomao">国贸</option>
              <option value="zhongguancun">中关村</option>
            </select>
          </div>
          <button @click="search" class="search-btn" :disabled="loading">
            {{ loading ? '搜索中...' : '开始搜索' }}
          </button>
        </div>
        
        <div v-if="searchError" class="error-message">
          <span class="error-icon">⚠️</span>
          <span class="error-text">{{ searchError }}</span>
          <button @click="searchError = ''" class="close-error">×</button>
        </div>
        
        <div v-if="renderError" class="error-message warning">
          <span class="error-icon">⚠️</span>
          <span class="error-text">{{ renderError }}</span>
          <button @click="renderError = ''" class="close-error">×</button>
        </div>
      </div>

      <div v-if="searchResult" class="results-section">
        <div class="summary-stats">
          <div class="stat-card">
            <div class="stat-value">{{ avgCommute }}</div>
            <div class="stat-label">平均通勤(分钟)</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">¥{{ avgRent }}</div>
            <div class="stat-label">平均租金(元/月)</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ searchResult.areas.length }}</div>
            <div class="stat-label">覆盖区域数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ affordableCount }}</div>
            <div class="stat-label">预算内区域</div>
          </div>
        </div>

        <div class="map-section">
          <div class="card">
            <div class="chart-header">
              <h3>📍 区域分布热力图</h3>
              <div class="chart-explanation">
                <p>💡 气泡大小表示推荐程度，颜色表示生存压力指数。鼠标悬停可查看租金、通勤时长和压力指数详情。</p>
              </div>
            </div>
            <div ref="mapChart" class="chart-container large"></div>
          </div>
        </div>

        <div class="charts-row">
          <div class="card half">
            <div class="chart-header">
              <h3>💰 租金对比分析</h3>
              <div class="chart-explanation">
                <p>💡 柱状图显示各区域月租金中位数，红色虚线为您的预算线。柱子颜色越深表示压力越大。</p>
              </div>
            </div>
            <div ref="rentChart" class="chart-container small"></div>
          </div>
          <div class="card half">
            <div class="chart-header">
              <h3>🚗 通勤时间对比</h3>
              <div class="chart-explanation">
                <p>💡 显示从各区域到您选择工作地点的平均通勤时长（驾车）。通勤时间越短，绿色越明显。</p>
              </div>
            </div>
            <div ref="commuteChart" class="chart-container small"></div>
          </div>
        </div>

        <div class="formula-section">
          <div class="card">
            <h3>📐 生存压力指数计算逻辑</h3>
            <div class="formula-content">
              <div class="formula-main">
                <span class="formula-title">综合压力指数 = </span>
                <span class="formula-weight weight-rent">租金压力 × 50%</span>
                <span class="formula-plus"> + </span>
                <span class="formula-weight weight-commute">通勤压力 × 35%</span>
                <span class="formula-plus"> + </span>
                <span class="formula-weight weight-traffic">交通压力 × 15%</span>
              </div>
              <div class="formula-details">
                <div class="detail-item">
                  <span class="detail-label">租金压力：</span>
                  <span class="detail-value">实际租金 / 预算 * 归一化系数 (范围0-1)</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">通勤压力：</span>
                  <span class="detail-value">(通勤时间 - 15) / 45 * 归一化系数 (范围0-1)</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">交通压力：</span>
                  <span class="detail-value">区域拥堵指数 (范围0-1)</span>
                </div>
              </div>
              <div class="pressure-legend">
                <div class="legend-item">
                  <span class="legend-color green"></span>
                  <span>低压力 (0-0.3) - 理想选择</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color yellow"></span>
                  <span>中低压力 (0.3-0.5) - 可接受</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color orange"></span>
                  <span>中高压力 (0.5-0.7) - 需权衡</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color red"></span>
                  <span>高压力 (0.7-1.0) - 谨慎选择</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="areas-list">
          <h3>📋 生存压力指数排名</h3>
          <div 
            v-for="(area, index) in searchResult.areas" 
            :key="area.name"
            class="area-card"
            :style="{ borderLeftColor: area.pressure_color }"
          >
            <div class="rank">{{ index + 1 }}</div>
            <div class="area-info">
              <h4>{{ area.name }}</h4>
              <p class="district">{{ area.district }}</p>
            </div>
            <div class="metrics">
              <div class="metric">
                <span class="label">租金</span>
                <span class="value" :class="{ affordable: area.rent_median <= budget * 1.2, overBudget: area.rent_median > budget }">
                  ¥{{ area.rent_median }}/月
                  <span v-if="area.rent_median > budget" class="over-badge">超预算</span>
                </span>
              </div>
              <div class="metric commute-metric">
                <span class="label">🚗 通勤时长</span>
                <span class="value" :class="{ fast: area.commute_minutes <= 30, medium: area.commute_minutes > 30 && area.commute_minutes <= 45 }">
                  <span class="commute-time">{{ area.commute_minutes }}</span>分钟
                  <span class="distance">(约{{ area.distance_km }}公里)</span>
                </span>
              </div>
              <div class="metric">
                <span class="label">压力指数</span>
                <span class="value" :style="{ color: area.pressure_color, fontWeight: 'bold' }">
                  {{ area.pressure_index }}
                </span>
              </div>
            </div>
            <div class="level-badge" :style="{ backgroundColor: area.pressure_color }">
              {{ area.pressure_level }}
            </div>
          </div>
        </div>

        <div class="ai-section">
          <div class="card ai-card">
            <div class="ai-header">
              <h3>🤖 AI 租房顾问</h3>
              <span class="ai-powered">Powered by 火山大模型</span>
            </div>
            <div class="ai-intro">
              <p>基于您的预算和偏好，结合区域租金、通勤时间、交通状况等多维数据，为您生成个性化的租房建议。</p>
            </div>
            <div class="ai-input-section">
              <div class="ai-tags">
                <button 
                  v-for="tag in quickTags" 
                  :key="tag"
                  @click="addTag(tag)"
                  class="tag-btn"
                >
                  {{ tag }}
                </button>
              </div>
              <textarea 
                v-model="preferences" 
                class="form-control ai-textarea"
                placeholder="描述您的租房偏好，例如：希望离地铁站近、周边有大型超市、生活配套完善..."
                rows="3"
              ></textarea>
              <button @click="getAIAdvice" class="ai-btn" :disabled="aiLoading || !searchResult">
                <span v-if="aiLoading" class="loading-spinner"></span>
                {{ aiLoading ? 'AI正在分析中...' : '生成个性化推荐' }}
              </button>
            </div>
            <div v-if="aiRecommendation" class="ai-result">
              <div class="ai-result-header">
                <span class="ai-icon">💡</span>
                <span>AI 分析报告</span>
              </div>
              <div class="ai-content">{{ aiRecommendation }}</div>
              <div class="ai-disclaimer">
                <p>⚠️ 以上建议仅供参考，实际租房请结合现场考察</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="footer">
      <p>数据更新时间: {{ currentTime }} | 数据来源：高德地图开放平台、聚合数据</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import * as echarts from 'echarts'
import axios from 'axios'

const city = ref('beijing')
const budget = ref(5000)
const workLocation = ref('center')
const loading = ref(false)
const aiLoading = ref(false)
const searchResult = ref(null)
const preferences = ref('')
const aiRecommendation = ref('')
const currentTime = ref('')
const searchError = ref('')
const renderError = ref('')

const cityDisplayMap = {
  'beijing': '北京',
  'shanghai': '上海',
  'guangzhou': '广州',
  'shenzhen': '深圳'
}

const getCityDisplayName = (cityCode) => {
  return cityDisplayMap[cityCode] || cityCode
}

const quickTags = [
  '离地铁站近',
  '生活配套完善',
  '周边有大型超市',
  '通勤30分钟内',
  '希望安静小区',
  '有学区优先'
]

const mapChart = ref(null)
const rentChart = ref(null)
const commuteChart = ref(null)

let mapChartInstance = null
let rentChartInstance = null
let commuteChartInstance = null

const avgCommute = computed(() => {
  if (!searchResult.value) return 0
  const total = searchResult.value.areas.reduce((sum, a) => sum + a.commute_minutes, 0)
  return Math.round(total / searchResult.value.areas.length)
})

const avgRent = computed(() => {
  if (!searchResult.value) return 0
  const total = searchResult.value.areas.reduce((sum, a) => sum + a.rent_median, 0)
  return Math.round(total / searchResult.value.areas.length)
})

const affordableCount = computed(() => {
  if (!searchResult.value) return 0
  return searchResult.value.areas.filter(a => a.rent_median <= budget.value * 1.2).length
})

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN')
}

const addTag = (tag) => {
  if (preferences.value) {
    if (!preferences.value.includes(tag)) {
      preferences.value += '，' + tag
    }
  } else {
    preferences.value = tag
  }
}

const validateSearchParams = () => {
  if (!city.value) {
    return { valid: false, message: '请选择城市' }
  }
  if (!budget.value || budget.value < 1000) {
    return { valid: false, message: '请输入有效的预算金额（至少1000元）' }
  }
  if (!workLocation.value) {
    return { valid: false, message: '请选择工作地点' }
  }
  return { valid: true, message: '' }
}

const validateResponseData = (data) => {
  if (!data) {
    return { valid: false, message: '服务器返回空数据' }
  }
  if (!data.areas || !Array.isArray(data.areas)) {
    return { valid: false, message: '区域数据格式错误' }
  }
  if (data.areas.length === 0) {
    return { valid: false, message: '未找到符合条件的区域' }
  }
  
  const requiredFields = ['name', 'rent_median', 'commute_minutes', 'distance_km', 'pressure_index', 'pressure_level']
  const firstArea = data.areas[0]
  const missingFields = requiredFields.filter(field => !(field in firstArea))
  
  if (missingFields.length > 0) {
    console.warn('部分字段缺失:', missingFields)
  }
  
  return { valid: true, message: '' }
}

const search = async () => {
  loading.value = true
  searchError.value = ''
  renderError.value = ''
  searchResult.value = null
  
  try {
    const paramValidation = validateSearchParams()
    if (!paramValidation.valid) {
      searchError.value = paramValidation.message
      return
    }
    
    console.log(`[搜索流程] 城市=${city.value} (${getCityDisplayName(city.value)}), 预算=${budget.value}, 工作地点=${workLocation.value}`)
    
    const response = await axios.get(`/api/search`, {
      params: {
        city: city.value,
        budget: budget.value,
        work_location: workLocation.value
      },
      timeout: 15000
    })
    
    console.log('[API响应] 原始数据:', response.data)
    
    const dataValidation = validateResponseData(response.data)
    if (!dataValidation.valid) {
      searchError.value = dataValidation.message
      console.error('[数据验证失败]', dataValidation.message)
      return
    }
    
    searchResult.value = response.data
    console.log('[数据验证通过] 区域数量:', response.data.areas.length)
    console.log('[数据样例] 第一个区域:', response.data.areas[0])
    
    await nextTick()
    
    try {
      renderCharts()
      console.log('[图表渲染] 完成')
    } catch (renderErr) {
      renderError.value = '图表渲染失败: ' + (renderErr.message || '未知错误')
      console.error('[图表渲染失败]', renderErr)
    }
    
    updateTime()
    
  } catch (error) {
    console.error('[搜索失败]', error)
    if (error.code === 'ECONNABORTED') {
      searchError.value = '请求超时，请检查网络连接后重试'
    } else if (error.response) {
      searchError.value = `服务器错误 (${error.response.status}): ${error.response.data?.message || '请稍后重试'}`
    } else if (error.request) {
      searchError.value = '无法连接到服务器，请检查后端服务是否启动'
    } else {
      searchError.value = '搜索失败: ' + (error.message || '未知错误')
    }
  } finally {
    loading.value = false
  }
}

const getAIAdvice = async () => {
  aiLoading.value = true
  aiRecommendation.value = ''
  try {
    const response = await axios.post('/api/ai/advise', {
      city: city.value,
      budget: budget.value,
      preferences: preferences.value,
      workLocation: workLocation.value
    })
    aiRecommendation.value = response.data.recommendation
  } catch (error) {
    console.error('获取AI建议失败:', error)
    aiRecommendation.value = '抱歉，AI顾问暂时无法提供服务，请稍后再试。'
  } finally {
    aiLoading.value = false
  }
}

const renderCharts = () => {
  if (!searchResult.value) {
    console.warn('[渲染跳过] searchResult 为空')
    return
  }

  const areas = searchResult.value.areas
  if (!areas || areas.length === 0) {
    console.warn('[渲染跳过] 区域数据为空')
    return
  }
  
  console.log('[开始渲染] 区域数量:', areas.length)

  try {
    if (mapChart.value) {
      if (mapChartInstance) mapChartInstance.dispose()
      mapChartInstance = echarts.init(mapChart.value)
      
      const cityCenter = {
        name: getCityDisplayName(city.value) + '市中心',
        x: 50,
        y: 50
      }
      
      const mapOption = {
        backgroundColor: '#f0f5ff',
        title: {
          text: `${getCityDisplayName(city.value)}居住区域热力图`,
          subtext: '气泡大小 = 推荐程度 | 颜色 = 生存压力指数',
          left: 'center',
          top: 10,
          textStyle: { fontSize: 18, fontWeight: 'bold', color: '#1890ff' },
          subtextStyle: { fontSize: 12, color: '#666' }
        },
        tooltip: {
          trigger: 'item',
          formatter: (params) => {
            const area = areas.find(a => a.name === params.name)
            if (area) {
              return `
                <div style="padding: 10px; min-width: 180px;">
                  <strong style="font-size: 16px; color: #1890ff;">${area.name}</strong><br/>
                  <span style="color: #888; font-size: 12px;">${area.district || '-'}</span><br/>
                  <hr style="margin: 8px 0; border: none; border-top: 1px solid #e8e8e8;"/>
                  💰 月租金: <strong>¥${area.rent_median}</strong><br/>
                  🚗 通勤时长: <strong>${area.commute_minutes}分钟</strong><br/>
                  📏 通勤距离: <strong>${area.distance_km}公里</strong><br/>
                  <hr style="margin: 8px 0; border: none; border-top: 1px solid #e8e8e8;"/>
                  📊 压力指数: <strong style="color: ${area.pressure_color}">${(area.pressure_index || 0).toFixed(2)}</strong><br/>
                  🎯 压力等级: <strong style="color: ${area.pressure_color}">${area.pressure_level || '-'}</strong>
                </div>
              `
            }
            return params.name
          },
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          borderColor: '#1890ff',
          borderWidth: 1,
          textStyle: { color: '#333' },
          extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px;'
        },
        visualMap: {
          min: 0,
          max: 1,
          left: 20,
          bottom: 20,
          text: ['高压力', '低压力'],
          textStyle: { color: '#666' },
          inRange: {
            color: ['#52c41a', '#95de64', '#faad14', '#fa8c16', '#f5222d']
          },
          itemWidth: 20,
          itemHeight: 120,
          formatter: (value) => value.toFixed(1)
        },
        grid: { left: 80, right: 80, top: 80, bottom: 80 },
        xAxis: { show: false, type: 'value', min: 0, max: 100 },
        yAxis: { show: false, type: 'value', min: 0, max: 100 },
        series: [
          {
            type: 'scatter',
            name: '城市中心',
            data: [{ name: cityCenter.name, value: [cityCenter.x, cityCenter.y] }],
            symbol: 'pin',
            symbolSize: 50,
            itemStyle: {
              color: '#1890ff',
              shadowBlur: 15,
              shadowColor: 'rgba(24, 144, 255, 0.5)'
            },
            label: {
              show: true,
              formatter: '{b}',
              position: 'bottom',
              fontSize: 12,
              fontWeight: 'bold',
              color: '#1890ff'
            },
            z: 10
          },
          {
            type: 'lines',
            name: '通勤路线',
            data: areas.map(area => ({
              coords: [
                [cityCenter.x, cityCenter.y],
                [area.x || 50, area.y || 50]
              ],
              value: area.commute_minutes
            })),
            lineStyle: { color: '#1890ff', width: 1, opacity: 0.3, curveness: 0.2 },
            effect: { show: true, symbol: 'arrow', symbolSize: 6, trailLength: 0.2, color: '#1890ff' },
            z: 5
          },
          {
            type: 'effectScatter',
            name: '居住区域',
            symbolSize: (data) => 25 + (1 - data[2]) * 35,
            data: areas.map(area => ({
              name: area.name,
              value: [
                area.x || (Math.random() * 60 + 20),
                area.y || (Math.random() * 60 + 20),
                area.pressure_index || 0.5,
                area.commute_minutes
              ],
              itemStyle: {
                color: area.pressure_color,
                shadowBlur: 12,
                shadowColor: area.pressure_color,
                opacity: 0.9
              }
            })),
            rippleEffect: { brushType: 'stroke', scale: 3, period: 4 },
            label: {
              show: true,
              formatter: (params) => {
                const area = areas.find(a => a.name === params.name)
                return `{name|${params.name}}\n{time|${area?.commute_minutes || 0}分钟}`
              },
              position: 'right',
              fontSize: 12,
              fontWeight: 'bold',
              color: '#333',
              rich: {
                name: { fontSize: 13, fontWeight: 'bold', color: '#333', lineHeight: 18 },
                time: { fontSize: 11, color: '#666', backgroundColor: '#f5f5f5', borderRadius: 4, padding: [2, 6] }
              }
            },
            emphasis: {
              itemStyle: { borderColor: '#fff', borderWidth: 4, shadowBlur: 20 },
              scale: 1.2
            },
            z: 15
          }
        ]
      }
      
      mapChartInstance.setOption(mapOption)
      console.log('[热力图] 渲染完成')
    }

    if (rentChart.value) {
      if (rentChartInstance) rentChartInstance.dispose()
      rentChartInstance = echarts.init(rentChart.value)
      
      const rentOption = {
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (params) => {
            const data = params[0]
            return `
              <strong>${data.name}</strong><br/>
              租金: ¥${data.value}/月<br/>
              预算: ¥${budget.value}<br/>
              ${data.value > budget.value * 1.2 ? '⚠️ 超出预算' : '✅ 在预算范围内'}
            `
          }
        },
        grid: { left: 60, right: 30, top: 40, bottom: 60 },
        xAxis: {
          type: 'category',
          data: areas.map(a => a.name),
          axisLabel: { rotate: 30, fontSize: 11 }
        },
        yAxis: { type: 'value', name: '租金(元/月)', nameTextStyle: { fontSize: 12 } },
        series: [{
          data: areas.map(a => ({
            value: a.rent_median,
            itemStyle: { color: a.pressure_color, borderRadius: [4, 4, 0, 0] }
          })),
          type: 'bar',
          barWidth: '60%',
          markLine: {
            data: [{ yAxis: budget.value, name: '预算线' }],
            lineStyle: { color: '#ff4d4f', type: 'dashed', width: 2 },
            label: { formatter: '预算线: ¥' + budget.value, fontSize: 11 }
          }
        }]
      }
      
      rentChartInstance.setOption(rentOption)
      console.log('[租金图] 渲染完成')
    }

    if (commuteChart.value) {
      if (commuteChartInstance) commuteChartInstance.dispose()
      commuteChartInstance = echarts.init(commuteChart.value)
      
      const commuteOption = {
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (params) => {
            const data = params[0]
            const mins = data.value
            let level = '较理想'
            if (mins > 30) level = '可接受'
            if (mins > 45) level = '较长'
            return `
              <strong>${data.name}</strong><br/>
              通勤时间: ${mins}分钟<br/>
              通勤等级: ${level}
            `
          }
        },
        grid: { left: 60, right: 30, top: 40, bottom: 60 },
        xAxis: {
          type: 'category',
          data: areas.map(a => a.name),
          axisLabel: { rotate: 30, fontSize: 11 }
        },
        yAxis: { type: 'value', name: '通勤时间(分钟)', nameTextStyle: { fontSize: 12 } },
        series: [{
          data: areas.map(a => ({
            value: a.commute_minutes,
            itemStyle: { 
              color: a.commute_minutes <= 30 ? '#52c41a' : a.commute_minutes <= 45 ? '#faad14' : '#f5222d',
              borderRadius: [4, 4, 0, 0]
            }
          })),
          type: 'bar',
          barWidth: '60%',
          markLine: {
            data: [{ yAxis: 30, name: '理想通勤线' }, { yAxis: 45, name: '可接受线' }],
            lineStyle: { color: '#1890ff', type: 'dashed', width: 1.5 },
            label: { fontSize: 10 }
          }
        }]
      }
      
      commuteChartInstance.setOption(commuteOption)
      console.log('[通勤图] 渲染完成')
    }
    
    console.log('[渲染完成] 所有图表渲染成功')
    
  } catch (error) {
    console.error('[图表渲染失败]', error)
    renderError.value = '图表渲染失败: ' + (error.message || '未知错误')
  }
}

onMounted(() => {
  updateTime()
  search()
  
  window.addEventListener('resize', () => {
    mapChartInstance?.resize()
    rentChartInstance?.resize()
    commuteChartInstance?.resize()
  })
})
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header {
  text-align: center;
  color: white;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
}

.subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
  margin-bottom: 10px;
}

.data-sources {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
  margin-top: 15px;
}

.data-source-item {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  padding: 10px 18px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.ds-icon {
  font-size: 1.2rem;
}

.ds-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.ds-desc {
  font-size: 0.8rem;
  opacity: 0.85;
}

.error-message {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.error-message.warning {
  background: #fffbe6;
  border-color: #ffe58f;
}

.error-icon {
  font-size: 1.2rem;
}

.error-text {
  flex: 1;
  color: #cf1322;
  font-size: 0.95rem;
}

.error-message.warning .error-text {
  color: #faad14;
}

.close-error {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #999;
  cursor: pointer;
  padding: 0 5px;
}

.close-error:hover {
  color: #666;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
}

.search-section {
  margin-bottom: 30px;
}

.search-card {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 20px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.form-group {
  flex: 1;
  min-width: 200px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.form-control {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
}

.search-btn {
  padding: 12px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.search-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.card h3 {
  margin-bottom: 15px;
  color: #333;
  font-size: 1.2rem;
}

.chart-header {
  margin-bottom: 15px;
}

.chart-explanation {
  background: #f6ffed;
  border-left: 4px solid #52c41a;
  padding: 10px 15px;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #52c41a;
  line-height: 1.5;
}

.chart-explanation p {
  margin: 0;
}

.chart-container {
  height: 400px;
}

.chart-container.large {
  height: 500px;
}

.chart-container.small {
  height: 280px;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.half {
  margin-bottom: 0;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
}

.formula-section {
  margin: 20px 0;
}

.formula-content {
  padding: 20px;
  background: #fafafa;
  border-radius: 12px;
}

.formula-main {
  text-align: center;
  padding: 20px;
  background: white;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 1.1rem;
}

.formula-title {
  font-weight: 600;
  color: #333;
}

.formula-weight {
  padding: 4px 12px;
  border-radius: 4px;
  color: white;
  font-weight: 600;
  margin: 0 5px;
}

.weight-rent { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.weight-commute { background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%); }
.weight-traffic { background: linear-gradient(135deg, #faad14 0%, #fa8c16 100%); }

.formula-plus {
  color: #999;
  margin: 0 5px;
}

.formula-details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.detail-item {
  padding: 15px;
  background: white;
  border-radius: 8px;
  font-size: 0.85rem;
}

.detail-label {
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 5px;
}

.detail-value {
  color: #666;
  line-height: 1.5;
}

.pressure-legend {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: white;
  border-radius: 8px;
  font-size: 0.85rem;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.legend-color.green { background: #52c41a; }
.legend-color.yellow { background: #faad14; }
.legend-color.orange { background: #fa8c16; }
.legend-color.red { background: #f5222d; }

.areas-list h3 {
  color: white;
  margin-bottom: 20px;
}

.area-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 20px;
  border-left: 5px solid;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s;
}

.area-card:hover {
  transform: translateX(5px);
}

.rank {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 18px;
  flex-shrink: 0;
}

.area-info {
  flex: 1;
}

.area-info h4 {
  font-size: 1.2rem;
  color: #333;
  margin-bottom: 4px;
}

.district {
  color: #666;
  font-size: 0.9rem;
}

.metrics {
  display: flex;
  gap: 30px;
}

.metric {
  text-align: center;
}

.metric .label {
  display: block;
  color: #999;
  font-size: 0.85rem;
  margin-bottom: 4px;
}

.metric .value {
  font-weight: 600;
  color: #333;
  font-size: 1.1rem;
}

.metric .value.affordable {
  color: #52c41a;
}

.metric .value.fast {
  color: #52c41a;
}

.metric .value.medium {
  color: #faad14;
}

.metric .value.overBudget {
  color: #f5222d;
}

.over-badge {
  background: #f5222d;
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 5px;
  font-weight: normal;
}

.commute-metric {
  min-width: 140px;
}

.commute-time {
  font-size: 1.3rem;
  font-weight: bold;
}

.distance {
  font-size: 0.8rem;
  color: #999;
  margin-left: 4px;
}

.level-badge {
  padding: 6px 16px;
  color: white;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
}

.ai-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.ai-card h3 {
  color: white;
  margin-bottom: 5px;
}

.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.ai-powered {
  font-size: 0.85rem;
  opacity: 0.8;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 20px;
}

.ai-intro {
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 0.9rem;
  line-height: 1.6;
}

.ai-input-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
}

.ai-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 15px;
}

.tag-btn {
  padding: 6px 14px;
  background: #f0f5ff;
  border: 1px solid #adc6ff;
  border-radius: 20px;
  font-size: 0.85rem;
  color: #2f54eb;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-btn:hover {
  background: #adc6ff;
  color: white;
}

.ai-textarea {
  border-color: #d9d9d9;
  margin-bottom: 15px;
}

.ai-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.ai-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(82, 196, 26, 0.4);
}

.ai-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #ffffff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ai-result {
  margin-top: 20px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.ai-result-header {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
  color: white;
  padding: 15px 20px;
  font-weight: 600;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.ai-icon {
  font-size: 1.3rem;
}

.ai-content {
  padding: 25px;
  color: #333;
  line-height: 1.8;
  white-space: pre-wrap;
}

.ai-disclaimer {
  padding: 15px 25px;
  background: #fffbe6;
  border-top: 1px solid #ffe58f;
  font-size: 0.85rem;
  color: #faad14;
}

.ai-disclaimer p {
  margin: 0;
}

.footer {
  text-align: center;
  color: white;
  margin-top: 40px;
  padding: 20px;
  font-size: 0.85rem;
  opacity: 0.8;
}

@media (max-width: 768px) {
  .charts-row {
    grid-template-columns: 1fr;
  }
  
  .summary-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .formula-details {
    grid-template-columns: 1fr;
  }
  
  .pressure-legend {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .area-card {
    flex-wrap: wrap;
  }
  
  .metrics {
    width: 100%;
    justify-content: space-around;
  }
}
</style>
