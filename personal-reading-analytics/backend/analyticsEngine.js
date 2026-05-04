class AnalyticsEngine {
  constructor() {}

  /**
   * 计算阅读速度（每分钟阅读页数）
   * @param {number} startPage - 开始页数
   * @param {number} endPage - 结束页数
   * @param {string} startTime - 开始时间 (ISO格式)
   * @param {string} endTime - 结束时间 (ISO格式)
   * @returns {number} - 每分钟阅读页数
   */
  calculateReadingSpeed(startPage, endPage, startTime, endTime) {
    if (startPage === undefined || endPage === undefined) {
      return 0
    }
    
    if (startTime === undefined || endTime === undefined) {
      return 0
    }
    
    const pagesRead = Math.max(0, endPage - startPage)
    const start = new Date(startTime)
    const end = new Date(endTime)
    const minutesRead = Math.max(0, (end - start) / (1000 * 60))
    
    if (minutesRead === 0 || pagesRead === 0) {
      return 0
    }
    
    return pagesRead / minutesRead
  }

  /**
   * 计算平均阅读速度
   * @param {Array} sessions - 阅读会话数组
   * @returns {number} - 平均阅读速度
   */
  calculateAverageReadingSpeed(sessions) {
    if (!sessions || sessions.length === 0) {
      return 0
    }
    
    let totalPages = 0
    let totalMinutes = 0
    
    sessions.forEach(session => {
      if (session.start_page !== undefined && session.end_page !== undefined &&
          session.start_time && session.end_time) {
        const pagesRead = Math.max(0, session.end_page - session.start_page)
        const start = new Date(session.start_time)
        const end = new Date(session.end_time)
        const minutesRead = Math.max(0, (end - start) / (1000 * 60))
        
        if (pagesRead > 0 && minutesRead > 0) {
          totalPages += pagesRead
          totalMinutes += minutesRead
        }
      }
    })
    
    if (totalMinutes === 0) {
      return 0
    }
    
    return totalPages / totalMinutes
  }

  /**
   * 生成阅读时段热力图数据
   * @param {Array} sessions - 阅读会话数组
   * @returns {Array} - 热力图数据，格式为 [dayOfWeek, hour, count]，dayOfWeek: 0-6 (周日-周六), hour: 0-23
   */
  generateReadingHeatmap(sessions) {
    const heatmap = []
    
    // 初始化7x24的热力图矩阵
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        heatmap.push([day, hour, 0])
      }
    }
    
    if (!sessions || sessions.length === 0) {
      return heatmap
    }
    
    sessions.forEach(session => {
      if (session.start_time) {
        const startTime = new Date(session.start_time)
        const dayOfWeek = startTime.getDay() // 0-6, 周日为0
        const hour = startTime.getHours() // 0-23
        
        // 找到对应的热力图数据点并增加计数
        const index = dayOfWeek * 24 + hour
        if (index >= 0 && index < heatmap.length) {
          heatmap[index][2]++
        }
        
        // 如果会话跨越了多个小时，也需要标记其他小时
        if (session.end_time) {
          const endTime = new Date(session.end_time)
          let currentTime = new Date(startTime)
          currentTime.setMinutes(0, 0, 0)
          
          const endHourTime = new Date(endTime)
          endHourTime.setMinutes(0, 0, 0)
          
          while (currentTime <= endHourTime) {
            const currentDay = currentTime.getDay()
            const currentHour = currentTime.getHours()
            const currentIndex = currentDay * 24 + currentHour
            
            if (currentIndex >= 0 && currentIndex < heatmap.length) {
              heatmap[currentIndex][2]++
            }
            
            currentTime.setHours(currentTime.getHours() + 1)
          }
        }
      }
    })
    
    return heatmap
  }

  /**
   * 计算阅读统计数据
   * @param {Array} sessions - 阅读会话数组
   * @param {Array} books - 书籍数组
   * @returns {Object} - 统计数据
   */
  calculateReadingStatistics(sessions, books) {
    const stats = {
      totalSessions: 0,
      totalBooks: books ? books.length : 0,
      totalPages: 0,
      totalMinutes: 0,
      averageSpeed: 0,
      favoriteReadingTime: null,
      mostReadGenre: null
    }
    
    if (!sessions || sessions.length === 0) {
      return stats
    }
    
    stats.totalSessions = sessions.length
    
    // 计算总页数和总时间
    sessions.forEach(session => {
      if (session.start_page !== undefined && session.end_page !== undefined) {
        stats.totalPages += Math.max(0, session.end_page - session.start_page)
      }
      
      if (session.start_time && session.end_time) {
        const start = new Date(session.start_time)
        const end = new Date(session.end_time)
        stats.totalMinutes += Math.max(0, (end - start) / (1000 * 60))
      }
    })
    
    // 计算平均阅读速度
    stats.averageSpeed = this.calculateAverageReadingSpeed(sessions)
    
    // 找出最喜欢的阅读时间
    const heatmap = this.generateReadingHeatmap(sessions)
    let maxCount = 0
    let favoriteTime = null
    
    heatmap.forEach(([day, hour, count]) => {
      if (count > maxCount) {
        maxCount = count
        favoriteTime = { day, hour, count }
      }
    })
    
    if (favoriteTime) {
      const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      stats.favoriteReadingTime = `${days[favoriteTime.day]} ${favoriteTime.hour}:00-${favoriteTime.hour + 1}:00`
    }
    
    // 找出阅读最多的类型
    if (books && books.length > 0) {
      const genreCount = {}
      books.forEach(book => {
        if (book.genre) {
          genreCount[book.genre] = (genreCount[book.genre] || 0) + 1
        }
      })
      
      let maxGenreCount = 0
      for (const genre in genreCount) {
        if (genreCount[genre] > maxGenreCount) {
          maxGenreCount = genreCount[genre]
          stats.mostReadGenre = genre
        }
      }
    }
    
    return stats
  }

  /**
   * 计算阅读进度
   * @param {Object} book - 书籍对象
   * @param {Array} sessions - 该书籍的阅读会话数组
   * @returns {Object} - 阅读进度信息
   */
  calculateReadingProgress(book, sessions) {
    if (!book) {
      return { progress: 0, pagesRead: 0, totalPages: 0 }
    }
    
    const totalPages = book.total_pages || 0
    let pagesRead = 0
    
    if (sessions && sessions.length > 0) {
      sessions.forEach(session => {
        if (session.start_page !== undefined && session.end_page !== undefined) {
          pagesRead += Math.max(0, session.end_page - session.start_page)
        }
      })
    }
    
    const progress = totalPages > 0 ? (pagesRead / totalPages) * 100 : 0
    
    return {
      progress,
      pagesRead,
      totalPages,
      isCompleted: pagesRead >= totalPages && totalPages > 0
    }
  }
}

module.exports = AnalyticsEngine
