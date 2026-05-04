class MockDataService {
  constructor() {
    this.deepWorkKeywords = [
      'coding', 'programming', 'development', '设计', '分析', '研究',
      'writing', '文档', 'review', '架构', '算法', 'debug',
      '会议', 'planning', 'strategic', '学习', 'training', 'research'
    ]
    
    this.shallowWorkKeywords = [
      'email', '邮件', 'chat', '聊天', 'slack', 'teams',
      'meeting', 'standup', 'sync', 'admin', '管理', '审批',
      'social', '社交媒体', 'news', '新闻', 'break', '休息'
    ]
  }

  /**
   * 生成Mock时间条目数据
   * @param {number} days - 生成多少天的数据
   * @param {string} startDate - 开始日期 (YYYY-MM-DD格式)
   * @returns {Array} - 时间条目数组
   */
  generateTimeEntries(days = 14, startDate = null) {
    const entries = []
    const baseDate = startDate ? new Date(startDate) : new Date()
    
    for (let day = 0; day < days; day++) {
      const currentDate = new Date(baseDate)
      currentDate.setDate(currentDate.getDate() - day)
      
      const dayEntries = this.generateDayEntries(currentDate)
      entries.push(...dayEntries)
    }
    
    return entries.sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  }

  /**
   * 生成单天的时间条目
   * @param {Date} date - 日期
   * @returns {Array} - 时间条目数组
   */
  generateDayEntries(date) {
    const entries = []
    const dayOfWeek = date.getDay()
    
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const workHours = isWeekend ? 
      this.randomInt(2, 5) : 
      this.randomInt(6, 10)
    
    let currentHour = isWeekend ? this.randomInt(10, 12) : this.randomInt(8, 10)
    
    for (let i = 0; i < workHours && currentHour < 22; i++) {
      const durationMinutes = this.randomInt(30, 120)
      const isDeepWork = Math.random() > 0.4
      
      const startTime = new Date(date)
      startTime.setHours(currentHour, this.randomInt(0, 30), 0, 0)
      
      const endTime = new Date(startTime)
      endTime.setMinutes(endTime.getMinutes() + durationMinutes)
      
      const description = this.generateDescription(isDeepWork)
      const productivityScore = isDeepWork ? 
        this.randomInt(70, 100) : 
        this.randomInt(40, 70)
      
      entries.push({
        source: 'mock',
        external_id: `mock_${date.toISOString().split('T')[0]}_${i}`,
        description,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration: durationMinutes * 60,
        project: isDeepWork ? '核心项目' : '日常事务',
        tags: JSON.stringify(isDeepWork ? ['deep-work', 'focused'] : ['shallow', 'admin']),
        productivity_score: productivityScore,
        is_deep_work: isDeepWork ? 1 : 0
      })
      
      const breakMinutes = this.randomInt(5, 30)
      currentHour = endTime.getHours() + (endTime.getMinutes() + breakMinutes) / 60
    }
    
    return entries
  }

  /**
   * 生成活动描述
   * @param {boolean} isDeepWork - 是否是深度工作
   * @returns {string} - 活动描述
   */
  generateDescription(isDeepWork) {
    const keywords = isDeepWork ? this.deepWorkKeywords : this.shallowWorkKeywords
    const keyword = keywords[Math.floor(Math.random() * keywords.length)]
    
    const templates = isDeepWork ? [
      `正在${keyword}新功能`,
      `${keyword}系统架构`,
      `进行${keyword}任务`,
      `${keyword}代码审查`,
      `深度${keyword}工作`
    ] : [
      `处理${keyword}`,
      `${keyword}沟通`,
      `日常${keyword}`,
      `${keyword}事务`,
      `团队${keyword}`
    ]
    
    return templates[Math.floor(Math.random() * templates.length)]
  }

  /**
   * 生成指定范围的随机整数
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @returns {number} - 随机整数
   */
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  /**
   * 获取RescueTime风格的Mock数据
   * @returns {Object} - RescueTime API响应格式的数据
   */
  getRescueTimeMockData() {
    const entries = this.generateTimeEntries(14)
    
    return {
      notes: 'data is an array of arrays, use row_headers for the schema to interpret',
      row_headers: [
        'Date',
        'Time Spent (seconds)',
        'Number of People',
        'Activity',
        'Category',
        'Productivity'
      ],
      rows: entries.map(entry => {
        const date = new Date(entry.start_time)
        return [
          date.toISOString().split('T')[0],
          entry.duration,
          1,
          entry.description,
          entry.is_deep_work ? 'Software Development' : 'Communication & Scheduling',
          entry.productivity_score > 60 ? 2 : 1
        ]
      })
    }
  }

  /**
   * 获取Toggl风格的Mock数据
   * @returns {Object} - Toggl API响应格式的数据
   */
  getTogglMockData() {
    const entries = this.generateTimeEntries(14)
    
    return {
      data: entries.map((entry, index) => ({
        id: index + 1000,
        wid: 123456,
        pid: entry.is_deep_work ? 789012 : 789013,
        billable: false,
        start: entry.start_time,
        end: entry.end_time,
        duration: entry.duration,
        description: entry.description,
        tags: JSON.parse(entry.tags || '[]'),
        duronly: false,
        at: new Date().toISOString(),
        uid: 987654
      }))
    }
  }

  /**
   * 获取综合统计数据
   * @returns {Object} - 统计数据
   */
  getDashboardStats() {
    const entries = this.generateTimeEntries(30)
    const analyticsEngine = require('./analyticsEngine')
    const analytics = new analyticsEngine()
    
    const efficiency = analytics.calculateEfficiencyScore(entries)
    const peakTime = analytics.identifyPeakFocusTime(entries)
    const overall = analytics.calculateOverallFocusScore(entries)
    
    return {
      totalEntries: entries.length,
      efficiency,
      peakTime,
      overall,
      lastSync: new Date().toISOString(),
      dataSource: 'mock'
    }
  }
}

module.exports = MockDataService
