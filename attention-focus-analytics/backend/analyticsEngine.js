class AnalyticsEngine {
  constructor() {}

  /**
   * 识别一天中哪个时段专注力最高
   * 算法逻辑：分析每个小时段的工作质量和数量，找出专注峰值时段
   * @param {Array} timeEntries - 时间条目数组
   * @returns {Object} - 包含峰值时段信息的对象
   */
  identifyPeakFocusTime(timeEntries) {
    if (!timeEntries || timeEntries.length === 0) {
      return {
        peakHour: null,
        peakFocusScore: 0,
        hourlyAnalysis: [],
        message: '没有足够的数据进行分析'
      }
    }

    const hourlyStats = new Array(24).fill(null).map(() => ({
      hour: 0,
      totalDuration: 0,
      deepWorkDuration: 0,
      avgProductivityScore: 0,
      entryCount: 0,
      focusScore: 0
    }))

    timeEntries.forEach((entry, index) => {
      const startTime = new Date(entry.start_time)
      const endTime = new Date(entry.end_time)
      const hour = startTime.getHours()
      
      if (hourlyStats[hour]) {
        hourlyStats[hour].hour = hour
        hourlyStats[hour].totalDuration += entry.duration
        hourlyStats[hour].deepWorkDuration += entry.is_deep_work ? entry.duration : 0
        hourlyStats[hour].avgProductivityScore += entry.productivity_score || 50
        hourlyStats[hour].entryCount++
      }
    })

    hourlyStats.forEach(hourStat => {
      if (hourStat.entryCount > 0) {
        hourStat.avgProductivityScore = hourStat.avgProductivityScore / hourStat.entryCount
        
        const deepWorkRatio = hourStat.totalDuration > 0 ? 
          (hourStat.deepWorkDuration / hourStat.totalDuration) : 0
        
        hourStat.focusScore = (
          deepWorkRatio * 0.5 +
          (hourStat.avgProductivityScore / 100) * 0.3 +
          Math.min(hourStat.entryCount * 0.1, 0.2)
        ) * 100
      }
    })

    let peakHour = null
    let maxFocusScore = 0

    hourlyStats.forEach(hourStat => {
      if (hourStat.focusScore > maxFocusScore && hourStat.entryCount > 0) {
        maxFocusScore = hourStat.focusScore
        peakHour = hourStat.hour
      }
    })

    const hourlyAnalysis = hourlyStats
      .filter(h => h.entryCount > 0)
      .sort((a, b) => b.focusScore - a.focusScore)

    return {
      peakHour,
      peakFocusScore: Math.round(maxFocusScore * 10) / 10,
      hourlyAnalysis,
      message: peakHour !== null ? 
        `专注力峰值时段为 ${peakHour}:00-${peakHour + 1}:00` : 
        '未找到明确的峰值时段'
    }
  }

  /**
   * 计算效率评分：深度工作时长占比
   * 公式：效率评分 = (深度工作时长 / 总工作时长) × 100
   * @param {Array} timeEntries - 时间条目数组
   * @returns {Object} - 包含效率评分的对象
   */
  calculateEfficiencyScore(timeEntries) {
    if (!timeEntries || timeEntries.length === 0) {
      return {
        efficiencyScore: 0,
        totalTime: 0,
        deepWorkTime: 0,
        shallowWorkTime: 0,
        deepWorkRatio: 0,
        message: '没有足够的数据进行计算'
      }
    }

    let totalTime = 0
    let deepWorkTime = 0
    let shallowWorkTime = 0

    timeEntries.forEach(entry => {
      const duration = entry.duration || 0
      totalTime += duration
      
      if (entry.is_deep_work) {
        deepWorkTime += duration
      } else {
        shallowWorkTime += duration
      }
    })

    const deepWorkRatio = totalTime > 0 ? (deepWorkTime / totalTime) : 0
    const efficiencyScore = deepWorkRatio * 100

    const formatTime = (seconds) => {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${hours}小时${minutes}分钟`
    }

    return {
      efficiencyScore: Math.round(efficiencyScore * 10) / 10,
      totalTime,
      totalTimeFormatted: formatTime(totalTime),
      deepWorkTime,
      deepWorkTimeFormatted: formatTime(deepWorkTime),
      shallowWorkTime,
      shallowWorkTimeFormatted: formatTime(shallowWorkTime),
      deepWorkRatio: Math.round(deepWorkRatio * 1000) / 1000,
      message: this.getEfficiencyMessage(efficiencyScore)
    }
  }

  /**
   * 根据效率评分给出评价消息
   * @param {number} score - 效率评分
   * @returns {string} - 评价消息
   */
  getEfficiencyMessage(score) {
    if (score >= 70) {
      return '优秀！您的深度工作占比很高，保持专注状态。'
    } else if (score >= 50) {
      return '良好。您的工作效率处于中等水平，可以尝试增加深度工作时间。'
    } else if (score >= 30) {
      return '一般。建议减少干扰，提高深度工作的比例。'
    } else {
      return '需要改进。大部分时间用于浅工作，建议尝试番茄工作法来提高专注力。'
    }
  }

  /**
   * 计算综合专注度评分
   * 结合深度工作比例、平均生产力得分和工作时段集中度
   * @param {Array} timeEntries - 时间条目数组
   * @returns {Object} - 综合专注度评分
   */
  calculateOverallFocusScore(timeEntries) {
    if (!timeEntries || timeEntries.length === 0) {
      return {
        overallScore: 0,
        components: {
          efficiency: 0,
          productivity: 0,
          concentration: 0
        },
        message: '没有足够的数据进行计算'
      }
    }

    const efficiencyResult = this.calculateEfficiencyScore(timeEntries)
    const peakResult = this.identifyPeakFocusTime(timeEntries)

    let avgProductivity = 50
    if (timeEntries.length > 0) {
      avgProductivity = timeEntries.reduce((sum, entry) => {
        return sum + (entry.productivity_score || 50)
      }, 0) / timeEntries.length
    }

    const hoursWorked = new Set()
    timeEntries.forEach(entry => {
      const hour = new Date(entry.start_time).getHours()
      hoursWorked.add(hour)
    })
    const concentrationRatio = hoursWorked.size > 0 ? 
      Math.min(1, 8 / hoursWorked.size) : 0

    const efficiencyWeight = 0.4
    const productivityWeight = 0.35
    const concentrationWeight = 0.25

    const overallScore = (
      efficiencyResult.efficiencyScore * efficiencyWeight +
      avgProductivity * productivityWeight +
      concentrationRatio * 100 * concentrationWeight
    )

    return {
      overallScore: Math.round(overallScore * 10) / 10,
      components: {
        efficiency: Math.round(efficiencyResult.efficiencyScore * 10) / 10,
        productivity: Math.round(avgProductivity * 10) / 10,
        concentration: Math.round(concentrationRatio * 100 * 10) / 10
      },
      efficiencyResult,
      peakResult,
      message: this.getFocusMessage(overallScore)
    }
  }

  /**
   * 根据综合专注度评分给出评价消息
   * @param {number} score - 综合评分
   * @returns {string} - 评价消息
   */
  getFocusMessage(score) {
    if (score >= 80) {
      return '专注力表现优秀！您处于高效工作状态。'
    } else if (score >= 60) {
      return '专注力表现良好。继续保持并尝试提高深度工作比例。'
    } else if (score >= 40) {
      return '专注力一般。建议减少多任务切换，增加专注时段。'
    } else {
      return '专注力需要提升。尝试使用番茄工作法或减少干扰源。'
    }
  }

  /**
   * 生成工作日热力图数据
   * @param {Array} timeEntries - 时间条目数组
   * @returns {Array} - 热力图数据 [day, hour, intensity]
   */
  generateFocusHeatmap(timeEntries) {
    const heatmap = []
    
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        heatmap.push([day, hour, 0])
      }
    }

    if (!timeEntries || timeEntries.length === 0) {
      return heatmap
    }

    timeEntries.forEach(entry => {
      if (entry.start_time) {
        const startTime = new Date(entry.start_time)
        const dayOfWeek = startTime.getDay()
        const hour = startTime.getHours()
        
        const intensity = (entry.is_deep_work ? 2 : 1) * 
          (entry.productivity_score || 50) / 100
        
        const index = dayOfWeek * 24 + hour
        if (index >= 0 && index < heatmap.length) {
          heatmap[index][2] += intensity
        }
      }
    })

    return heatmap
  }
}

module.exports = AnalyticsEngine
