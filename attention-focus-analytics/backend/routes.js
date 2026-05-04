const express = require('express')
const router = express.Router()
const db = require('./database')
const AnalyticsEngine = require('./analyticsEngine')
const ApiSyncService = require('./apiSyncService')
const MockDataService = require('./mockDataService')

const analytics = new AnalyticsEngine()
const syncService = new ApiSyncService()
const mockService = new MockDataService()

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

router.get('/entries', (req, res) => {
  const { startDate, endDate, limit = 100, offset = 0 } = req.query
  
  let query = 'SELECT * FROM time_entries WHERE 1=1'
  const params = []

  if (startDate) {
    query += ' AND date(start_time) >= ?'
    params.push(startDate)
  }
  if (endDate) {
    query += ' AND date(start_time) <= ?'
    params.push(endDate)
  }

  query += ' ORDER BY start_time DESC LIMIT ? OFFSET ?'
  params.push(parseInt(limit), parseInt(offset))

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('查询时间条目失败:', err)
      return res.status(500).json({ error: '查询失败' })
    }
    res.json({ 
      success: true, 
      data: rows,
      pagination: { limit: parseInt(limit), offset: parseInt(offset), total: rows.length }
    })
  })
})

router.post('/entries', (req, res) => {
  const { 
    source = 'manual',
    description,
    start_time,
    end_time,
    duration,
    project,
    tags,
    productivity_score = 50,
    is_deep_work = 0
  } = req.body

  if (!description || !start_time) {
    return res.status(400).json({ error: '描述和开始时间为必填项' })
  }

  const finalDuration = duration || 
    (end_time ? (new Date(end_time) - new Date(start_time)) / 1000 : 0)

  const finalEndTime = end_time || 
    new Date(new Date(start_time).getTime() + finalDuration * 1000).toISOString()

  db.run(`
    INSERT INTO time_entries 
    (source, description, start_time, end_time, duration, project, tags, productivity_score, is_deep_work)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    source,
    description,
    start_time,
    finalEndTime,
    finalDuration,
    project,
    JSON.stringify(tags || []),
    productivity_score,
    is_deep_work
  ], function(err) {
    if (err) {
      console.error('添加时间条目失败:', err)
      return res.status(500).json({ error: '添加失败' })
    }
    res.json({ success: true, id: this.lastID, message: '添加成功' })
  })
})

router.get('/analytics/efficiency', (req, res) => {
  const { startDate, endDate } = req.query
  
  let query = 'SELECT * FROM time_entries WHERE 1=1'
  const params = []

  if (startDate) {
    query += ' AND date(start_time) >= ?'
    params.push(startDate)
  }
  if (endDate) {
    query += ' AND date(start_time) <= ?'
    params.push(endDate)
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('查询效率数据失败:', err)
      return res.status(500).json({ error: '查询失败' })
    }

    const result = analytics.calculateEfficiencyScore(rows)
    res.json({ success: true, data: result, dataSource: rows.length > 0 ? 'database' : 'none' })
  })
})

router.get('/analytics/peak-focus', (req, res) => {
  const { startDate, endDate } = req.query
  
  let query = 'SELECT * FROM time_entries WHERE 1=1'
  const params = []

  if (startDate) {
    query += ' AND date(start_time) >= ?'
    params.push(startDate)
  }
  if (endDate) {
    query += ' AND date(start_time) <= ?'
    params.push(endDate)
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('查询峰值专注数据失败:', err)
      return res.status(500).json({ error: '查询失败' })
    }

    const result = analytics.identifyPeakFocusTime(rows)
    res.json({ success: true, data: result, dataSource: rows.length > 0 ? 'database' : 'none' })
  })
})

router.get('/analytics/overview', (req, res) => {
  const { startDate, endDate } = req.query
  
  let query = 'SELECT * FROM time_entries WHERE 1=1'
  const params = []

  if (startDate) {
    query += ' AND date(start_time) >= ?'
    params.push(startDate)
  }
  if (endDate) {
    query += ' AND date(start_time) <= ?'
    params.push(endDate)
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('查询概览数据失败:', err)
      return res.status(500).json({ error: '查询失败' })
    }

    const dataToAnalyze = rows.length > 0 ? rows : mockService.generateTimeEntries(14)
    
    const overall = analytics.calculateOverallFocusScore(dataToAnalyze)
    const heatmap = analytics.generateFocusHeatmap(dataToAnalyze)

    res.json({ 
      success: true, 
      data: {
        overall,
        heatmap,
        totalEntries: dataToAnalyze.length
      },
      dataSource: rows.length > 0 ? 'database' : 'mock'
    })
  })
})

router.get('/analytics/heatmap', (req, res) => {
  const { startDate, endDate } = req.query
  
  let query = 'SELECT * FROM time_entries WHERE 1=1'
  const params = []

  if (startDate) {
    query += ' AND date(start_time) >= ?'
    params.push(startDate)
  }
  if (endDate) {
    query += ' AND date(start_time) <= ?'
    params.push(endDate)
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('查询热力图数据失败:', err)
      return res.status(500).json({ error: '查询失败' })
    }

    const dataToAnalyze = rows.length > 0 ? rows : mockService.generateTimeEntries(14)
    const heatmap = analytics.generateFocusHeatmap(dataToAnalyze)

    res.json({ 
      success: true, 
      data: heatmap,
      dataSource: rows.length > 0 ? 'database' : 'mock'
    })
  })
})

router.post('/sync/:provider', async (req, res) => {
  const { provider } = req.params
  const { apiKey, useMock = false, startDate, endDate } = req.body

  if (!['rescuetime', 'toggl'].includes(provider.toLowerCase())) {
    return res.status(400).json({ error: '不支持的提供商，请使用 rescuetime 或 toggl' })
  }

  try {
    const result = await syncService.syncData(
      provider.toLowerCase(), 
      apiKey, 
      { useMock, startDate, endDate }
    )

    if (result.success) {
      res.json({ 
        success: true, 
        message: `成功从 ${provider} 同步 ${result.entriesSaved} 条记录`,
        data: result
      })
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error,
        data: result
      })
    }
  } catch (error) {
    console.error('同步失败:', error)
    res.status(500).json({ error: '同步过程中发生错误' })
  }
})

router.get('/mock/generate', (req, res) => {
  const { days = 14 } = req.query
  const entries = mockService.generateTimeEntries(parseInt(days))
  
  res.json({
    success: true,
    message: `生成了 ${entries.length} 条模拟数据`,
    data: entries
  })
})

router.post('/mock/import', async (req, res) => {
  const { days = 14 } = req.body
  const entries = mockService.generateTimeEntries(parseInt(days))
  
  try {
    const count = await syncService.saveEntriesToDatabase(entries)
    res.json({
      success: true,
      message: `成功导入 ${count} 条模拟数据`,
      count
    })
  } catch (error) {
    console.error('导入模拟数据失败:', error)
    res.status(500).json({ error: '导入失败' })
  }
})

router.get('/stats', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM time_entries', (err, row) => {
    if (err) {
      return res.status(500).json({ error: '查询统计失败' })
    }

    db.get('SELECT MAX(start_time) as latest FROM time_entries', (err2, row2) => {
      if (err2) {
        return res.status(500).json({ error: '查询统计失败' })
      }

      res.json({
        success: true,
        data: {
          totalEntries: row.count,
          latestEntry: row2.latest,
          databaseStatus: 'connected'
        }
      })
    })
  })
})

module.exports = router
