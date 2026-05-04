const axios = require('axios')
const db = require('./database')
const MockDataService = require('./mockDataService')
const mockService = new MockDataService()

class ApiSyncService {
  constructor() {
    this.mockService = new MockDataService()
  }

  /**
   * 从RescueTime API获取数据
   * @param {string} apiKey - RescueTime API Key
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} - API响应数据
   */
  async fetchFromRescueTime(apiKey, options = {}) {
    const { 
      startDate, 
      endDate,
      useMock = false 
    } = options

    if (useMock || !apiKey) {
      console.log('使用Mock数据作为RescueTime API的兜底')
      return this.mockService.getRescueTimeMockData()
    }

    try {
      const params = {
        key: apiKey,
        format: 'json',
        perspective: 'interval',
        resolution_time: 'hour'
      }

      if (startDate) params.restrict_begin = startDate
      if (endDate) params.restrict_end = endDate

      const response = await axios.get('https://www.rescuetime.com/anapi/data', {
        params,
        timeout: 10000
      })

      return response.data
    } catch (error) {
      console.error('RescueTime API请求失败:', error.message)
      console.log('切换到Mock数据作为兜底')
      return this.mockService.getRescueTimeMockData()
    }
  }

  /**
   * 从Toggl API获取数据
   * @param {string} apiToken - Toggl API Token
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} - API响应数据
   */
  async fetchFromToggl(apiToken, options = {}) {
    const { 
      startDate, 
      endDate,
      useMock = false 
    } = options

    if (useMock || !apiToken) {
      console.log('使用Mock数据作为Toggl API的兜底')
      return this.mockService.getTogglMockData()
    }

    try {
      const auth = {
        username: apiToken,
        password: 'api_token'
      }

      const params = {}
      if (startDate) params.start_date = new Date(startDate).toISOString()
      if (endDate) params.end_date = new Date(endDate).toISOString()

      const response = await axios.get('https://api.track.toggl.com/api/v8/time_entries', {
        auth,
        params,
        timeout: 10000
      })

      return { data: response.data }
    } catch (error) {
      console.error('Toggl API请求失败:', error.message)
      console.log('切换到Mock数据作为兜底')
      return this.mockService.getTogglMockData()
    }
  }

  /**
   * 转换RescueTime数据为内部格式
   * @param {Object} rescueTimeData - RescueTime原始数据
   * @returns {Array} - 转换后的时间条目数组
   */
  convertRescueTimeData(rescueTimeData) {
    if (!rescueTimeData || !rescueTimeData.rows) {
      return []
    }

    const { row_headers, rows } = rescueTimeData
    const headers = row_headers || []

    const dateIndex = headers.indexOf('Date')
    const timeIndex = headers.indexOf('Time Spent (seconds)')
    const activityIndex = headers.indexOf('Activity')
    const categoryIndex = headers.indexOf('Category')
    const productivityIndex = headers.indexOf('Productivity')

    return rows.map((row, index) => {
      const dateStr = row[dateIndex] || new Date().toISOString().split('T')[0]
      const duration = row[timeIndex] || 0
      const activity = row[activityIndex] || '未知活动'
      const category = row[categoryIndex] || '其他'
      const productivity = row[productivityIndex] || 1

      const productivityScore = this.mapRescueTimeProductivity(productivity)
      const isDeepWork = this.isDeepWorkCategory(category, activity)

      const startTime = new Date(dateStr + 'T09:00:00')
      startTime.setHours(startTime.getHours() + (index % 8))
      
      const endTime = new Date(startTime)
      endTime.setSeconds(endTime.getSeconds() + duration)

      return {
        source: 'rescuetime',
        external_id: `rescue_${dateStr}_${index}`,
        description: activity,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration,
        project: category,
        tags: JSON.stringify([category.toLowerCase()]),
        productivity_score: productivityScore,
        is_deep_work: isDeepWork ? 1 : 0
      }
    })
  }

  /**
   * 转换Toggl数据为内部格式
   * @param {Object} togglData - Toggl原始数据
   * @returns {Array} - 转换后的时间条目数组
   */
  convertTogglData(togglData) {
    if (!togglData || !togglData.data) {
      return []
    }

    return togglData.data.map(entry => {
      const duration = entry.duration || 0
      const description = entry.description || '未命名任务'
      const tags = entry.tags || []

      const isDeepWork = this.inferDeepWorkFromTags(tags, description)
      const productivityScore = isDeepWork ? 85 : 55

      return {
        source: 'toggl',
        external_id: `toggl_${entry.id}`,
        description,
        start_time: entry.start,
        end_time: entry.end,
        duration: duration > 0 ? duration : 0,
        project: entry.pid ? `项目_${entry.pid}` : '默认项目',
        tags: JSON.stringify(tags),
        productivity_score: productivityScore,
        is_deep_work: isDeepWork ? 1 : 0
      }
    })
  }

  /**
   * 映射RescueTime生产力值到0-100分数
   * @param {number} productivity - RescueTime生产力值 (-2到2)
   * @returns {number} - 0-100的分数
   */
  mapRescueTimeProductivity(productivity) {
    const mapping = {
      '-2': 10,
      '-1': 30,
      '0': 50,
      '1': 70,
      '2': 90
    }
    return mapping[productivity] || 50
  }

  /**
   * 判断活动是否为深度工作
   * @param {string} category - 类别
   * @param {string} activity - 活动描述
   * @returns {boolean} - 是否为深度工作
   */
  isDeepWorkCategory(category, activity) {
    const deepCategories = [
      'Software Development', 'Programming', 'Design',
      'Writing', 'Research', 'Analysis', 'Architecture',
      'Engineering', 'Coding', 'Development'
    ]

    const shallowCategories = [
      'Email', 'Communication', 'Social Networking',
      'Entertainment', 'News', 'Shopping', 'Video'
    ]

    const lowerCategory = (category || '').toLowerCase()
    const lowerActivity = (activity || '').toLowerCase()

    if (shallowCategories.some(c => lowerCategory.includes(c.toLowerCase()))) {
      return false
    }

    if (deepCategories.some(c => lowerCategory.includes(c.toLowerCase()))) {
      return true
    }

    const deepKeywords = ['code', 'develop', 'design', 'write', 'research', 'analyze', 'debug', 'review']
    return deepKeywords.some(kw => lowerActivity.includes(kw))
  }

  /**
   * 根据标签和描述推断是否为深度工作
   * @param {Array} tags - 标签数组
   * @param {string} description - 描述
   * @returns {boolean} - 是否为深度工作
   */
  inferDeepWorkFromTags(tags, description) {
    const deepTags = ['deep', 'focus', 'coding', 'development', '设计', '研究', '开发', '专注']
    const shallowTags = ['meeting', 'email', 'chat', 'admin', '会议', '邮件', '沟通', '管理']

    const lowerTags = (tags || []).map(t => t.toLowerCase())
    const lowerDescription = (description || '').toLowerCase()

    if (shallowTags.some(t => lowerTags.includes(t) || lowerDescription.includes(t))) {
      return false
    }

    return deepTags.some(t => lowerTags.includes(t) || lowerDescription.includes(t))
  }

  /**
   * 将时间条目保存到数据库
   * @param {Array} entries - 时间条目数组
   * @returns {Promise<number>} - 保存的条目数量
   */
  async saveEntriesToDatabase(entries) {
    if (!entries || entries.length === 0) {
      return 0
    }

    return new Promise((resolve, reject) => {
      db.serialize(() => {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO time_entries 
          (source, external_id, description, start_time, end_time, duration, 
           project, tags, productivity_score, is_deep_work)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        let count = 0
        entries.forEach(entry => {
          stmt.run(
            entry.source,
            entry.external_id,
            entry.description,
            entry.start_time,
            entry.end_time,
            entry.duration,
            entry.project,
            entry.tags,
            entry.productivity_score,
            entry.is_deep_work,
            (err) => {
              if (!err) count++
            }
          )
        })

        stmt.finalize((err) => {
          if (err) reject(err)
          else resolve(count)
        })
      })
    })
  }

  /**
   * 执行完整的同步流程
   * @param {string} provider - 服务提供商 ('rescuetime' 或 'toggl')
   * @param {string} apiKey - API密钥
   * @param {Object} options - 选项
   * @returns {Promise<Object>} - 同步结果
   */
  async syncData(provider, apiKey, options = {}) {
    const syncRecord = {
      provider,
      sync_type: 'full',
      status: 'pending',
      started_at: new Date().toISOString()
    }

    try {
      let rawData
      let convertedEntries

      if (provider === 'rescuetime') {
        rawData = await this.fetchFromRescueTime(apiKey, options)
        convertedEntries = this.convertRescueTimeData(rawData)
      } else if (provider === 'toggl') {
        rawData = await this.fetchFromToggl(apiKey, options)
        convertedEntries = this.convertTogglData(rawData)
      } else {
        throw new Error(`不支持的提供商: ${provider}`)
      }

      const savedCount = await this.saveEntriesToDatabase(convertedEntries)

      syncRecord.status = 'completed'
      syncRecord.entry_count = savedCount
      syncRecord.completed_at = new Date().toISOString()

      return {
        success: true,
        provider,
        entriesSaved: savedCount,
        rawData: options.includeRaw ? rawData : undefined,
        syncRecord
      }
    } catch (error) {
      syncRecord.status = 'failed'
      syncRecord.error_message = error.message
      syncRecord.completed_at = new Date().toISOString()

      return {
        success: false,
        provider,
        error: error.message,
        syncRecord
      }
    }
  }
}

module.exports = ApiSyncService
