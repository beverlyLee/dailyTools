const express = require('express')
const router = express.Router()
const db = require('./database')
const AnalyticsEngine = require('./analyticsEngine')
const NLPAnalyzer = require('./nlpAnalyzer')
const DataSyncService = require('./dataSyncService')
const multer = require('multer')
const path = require('path')

const analyticsEngine = new AnalyticsEngine()
const nlpAnalyzer = new NLPAnalyzer()
const dataSyncService = new DataSyncService()

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'))
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  }
})

const upload = multer({ storage: storage })

// 确保上传目录存在
const fs = require('fs')
const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// 健康检查
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ==================== 书籍管理 ====================

// 获取所有书籍
router.get('/books', (req, res) => {
  db.all('SELECT * FROM books ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      console.error('获取书籍失败:', err.message)
      return res.status(500).json({ error: '获取书籍失败' })
    }
    res.json(rows)
  })
})

// 获取单个书籍
router.get('/books/:id', (req, res) => {
  const id = req.params.id
  db.get('SELECT * FROM books WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('获取书籍失败:', err.message)
      return res.status(500).json({ error: '获取书籍失败' })
    }
    if (!row) {
      return res.status(404).json({ error: '书籍不存在' })
    }
    res.json(row)
  })
})

// 添加书籍
router.post('/books', (req, res) => {
  const { title, author, publisher, publication_date, total_pages, genre, isbn, description } = req.body

  if (!title) {
    return res.status(400).json({ error: '缺少必要字段: title' })
  }

  const stmt = db.prepare(`
    INSERT INTO books (title, author, publisher, publication_date, total_pages, genre, isbn, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(title, author, publisher, publication_date, total_pages, genre, isbn, description, function(err) {
    if (err) {
      console.error('添加书籍失败:', err.message)
      return res.status(500).json({ error: '添加书籍失败' })
    }

    db.get('SELECT * FROM books WHERE id = ?', [this.lastID], (err, row) => {
      if (err) {
        console.error('获取新书籍失败:', err.message)
        return res.status(500).json({ error: '获取新书籍失败' })
      }
      res.status(201).json(row)
    })
  })

  stmt.finalize()
})

// 更新书籍
router.put('/books/:id', (req, res) => {
  const id = req.params.id
  const { title, author, publisher, publication_date, total_pages, genre, isbn, description } = req.body

  if (!title) {
    return res.status(400).json({ error: '缺少必要字段: title' })
  }

  const stmt = db.prepare(`
    UPDATE books 
    SET title = ?, author = ?, publisher = ?, publication_date = ?, total_pages = ?, genre = ?, isbn = ?, description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `)

  stmt.run(title, author, publisher, publication_date, total_pages, genre, isbn, description, id, function(err) {
    if (err) {
      console.error('更新书籍失败:', err.message)
      return res.status(500).json({ error: '更新书籍失败' })
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: '书籍不存在' })
    }

    db.get('SELECT * FROM books WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('获取更新后书籍失败:', err.message)
        return res.status(500).json({ error: '获取更新后书籍失败' })
      }
      res.json(row)
    })
  })

  stmt.finalize()
})

// 删除书籍
router.delete('/books/:id', (req, res) => {
  const id = req.params.id
  
  db.run('DELETE FROM books WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('删除书籍失败:', err.message)
      return res.status(500).json({ error: '删除书籍失败' })
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: '书籍不存在' })
    }
    
    res.json({ message: '删除成功', id: id })
  })
})

// ==================== 阅读会话管理 ====================

// 获取所有阅读会话
router.get('/sessions', (req, res) => {
  const bookId = req.query.book_id
  let query = 'SELECT * FROM reading_sessions'
  let params = []
  
  if (bookId) {
    query += ' WHERE book_id = ?'
    params.push(bookId)
  }
  
  query += ' ORDER BY start_time DESC'
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('获取阅读会话失败:', err.message)
      return res.status(500).json({ error: '获取阅读会话失败' })
    }
    res.json(rows)
  })
})

// 获取单个阅读会话
router.get('/sessions/:id', (req, res) => {
  const id = req.params.id
  db.get('SELECT * FROM reading_sessions WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('获取阅读会话失败:', err.message)
      return res.status(500).json({ error: '获取阅读会话失败' })
    }
    if (!row) {
      return res.status(404).json({ error: '阅读会话不存在' })
    }
    res.json(row)
  })
})

// 添加阅读会话
router.post('/sessions', (req, res) => {
  const { book_id, start_time, end_time, start_page, end_page, notes } = req.body

  if (!book_id || !start_time) {
    return res.status(400).json({ error: '缺少必要字段: book_id 或 start_time' })
  }

  const stmt = db.prepare(`
    INSERT INTO reading_sessions (book_id, start_time, end_time, start_page, end_page, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  stmt.run(book_id, start_time, end_time, start_page, end_page, notes, function(err) {
    if (err) {
      console.error('添加阅读会话失败:', err.message)
      return res.status(500).json({ error: '添加阅读会话失败' })
    }

    db.get('SELECT * FROM reading_sessions WHERE id = ?', [this.lastID], (err, row) => {
      if (err) {
        console.error('获取新阅读会话失败:', err.message)
        return res.status(500).json({ error: '获取新阅读会话失败' })
      }
      res.status(201).json(row)
    })
  })

  stmt.finalize()
})

// 更新阅读会话
router.put('/sessions/:id', (req, res) => {
  const id = req.params.id
  const { book_id, start_time, end_time, start_page, end_page, notes } = req.body

  if (!book_id || !start_time) {
    return res.status(400).json({ error: '缺少必要字段: book_id 或 start_time' })
  }

  const stmt = db.prepare(`
    UPDATE reading_sessions 
    SET book_id = ?, start_time = ?, end_time = ?, start_page = ?, end_page = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `)

  stmt.run(book_id, start_time, end_time, start_page, end_page, notes, id, function(err) {
    if (err) {
      console.error('更新阅读会话失败:', err.message)
      return res.status(500).json({ error: '更新阅读会话失败' })
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: '阅读会话不存在' })
    }

    db.get('SELECT * FROM reading_sessions WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('获取更新后阅读会话失败:', err.message)
        return res.status(500).json({ error: '获取更新后阅读会话失败' })
      }
      res.json(row)
    })
  })

  stmt.finalize()
})

// 删除阅读会话
router.delete('/sessions/:id', (req, res) => {
  const id = req.params.id
  
  db.run('DELETE FROM reading_sessions WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('删除阅读会话失败:', err.message)
      return res.status(500).json({ error: '删除阅读会话失败' })
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: '阅读会话不存在' })
    }
    
    res.json({ message: '删除成功', id: id })
  })
})

// ==================== 阅读笔记管理 ====================

// 获取所有阅读笔记
router.get('/notes', (req, res) => {
  const sessionId = req.query.session_id
  let query = 'SELECT * FROM reading_notes'
  let params = []
  
  if (sessionId) {
    query += ' WHERE session_id = ?'
    params.push(sessionId)
  }
  
  query += ' ORDER BY created_at DESC'
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('获取阅读笔记失败:', err.message)
      return res.status(500).json({ error: '获取阅读笔记失败' })
    }
    res.json(rows)
  })
})

// 获取单个阅读笔记
router.get('/notes/:id', (req, res) => {
  const id = req.params.id
  db.get('SELECT * FROM reading_notes WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('获取阅读笔记失败:', err.message)
      return res.status(500).json({ error: '获取阅读笔记失败' })
    }
    if (!row) {
      return res.status(404).json({ error: '阅读笔记不存在' })
    }
    res.json(row)
  })
})

// 添加阅读笔记
router.post('/notes', (req, res) => {
  const { session_id, page_number, content } = req.body

  if (!session_id || !content) {
    return res.status(400).json({ error: '缺少必要字段: session_id 或 content' })
  }

  const stmt = db.prepare(`
    INSERT INTO reading_notes (session_id, page_number, content)
    VALUES (?, ?, ?)
  `)

  stmt.run(session_id, page_number, content, function(err) {
    if (err) {
      console.error('添加阅读笔记失败:', err.message)
      return res.status(500).json({ error: '添加阅读笔记失败' })
    }

    db.get('SELECT * FROM reading_notes WHERE id = ?', [this.lastID], (err, row) => {
      if (err) {
        console.error('获取新阅读笔记失败:', err.message)
        return res.status(500).json({ error: '获取新阅读笔记失败' })
      }
      res.status(201).json(row)
    })
  })

  stmt.finalize()
})

// 更新阅读笔记
router.put('/notes/:id', (req, res) => {
  const id = req.params.id
  const { session_id, page_number, content } = req.body

  if (!session_id || !content) {
    return res.status(400).json({ error: '缺少必要字段: session_id 或 content' })
  }

  const stmt = db.prepare(`
    UPDATE reading_notes 
    SET session_id = ?, page_number = ?, content = ?
    WHERE id = ?
  `)

  stmt.run(session_id, page_number, content, id, function(err) {
    if (err) {
      console.error('更新阅读笔记失败:', err.message)
      return res.status(500).json({ error: '更新阅读笔记失败' })
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: '阅读笔记不存在' })
    }

    db.get('SELECT * FROM reading_notes WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('获取更新后阅读笔记失败:', err.message)
        return res.status(500).json({ error: '获取更新后阅读笔记失败' })
      }
      res.json(row)
    })
  })

  stmt.finalize()
})

// 删除阅读笔记
router.delete('/notes/:id', (req, res) => {
  const id = req.params.id
  
  db.run('DELETE FROM reading_notes WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('删除阅读笔记失败:', err.message)
      return res.status(500).json({ error: '删除阅读笔记失败' })
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: '阅读笔记不存在' })
    }
    
    res.json({ message: '删除成功', id: id })
  })
})

// ==================== 数据分析 API ====================

// 获取阅读统计数据
router.get('/analytics/statistics', (req, res) => {
  db.all('SELECT * FROM reading_sessions', [], (err, sessions) => {
    if (err) {
      console.error('获取阅读会话失败:', err.message)
      return res.status(500).json({ error: '获取阅读会话失败' })
    }
    
    db.all('SELECT * FROM books', [], (err, books) => {
      if (err) {
        console.error('获取书籍失败:', err.message)
        return res.status(500).json({ error: '获取书籍失败' })
      }
      
      const statistics = analyticsEngine.calculateReadingStatistics(sessions, books)
      res.json(statistics)
    })
  })
})

// 获取阅读速度分析
router.get('/analytics/reading-speed', (req, res) => {
  db.all('SELECT * FROM reading_sessions WHERE end_time IS NOT NULL', [], (err, sessions) => {
    if (err) {
      console.error('获取阅读会话失败:', err.message)
      return res.status(500).json({ error: '获取阅读会话失败' })
    }
    
    const validSessions = sessions.filter(s => 
      s.start_page !== null && s.end_page !== null && 
      s.start_page !== undefined && s.end_page !== undefined
    )
    
    const averageSpeed = analyticsEngine.calculateAverageReadingSpeed(validSessions)
    
    const sessionSpeeds = validSessions.map(session => ({
      session_id: session.id,
      book_id: session.book_id,
      speed: analyticsEngine.calculateReadingSpeed(
        session.start_page, 
        session.end_page, 
        session.start_time, 
        session.end_time
      ),
      pages_read: session.end_page - session.start_page,
      duration_minutes: (new Date(session.end_time) - new Date(session.start_time)) / (1000 * 60),
      date: session.start_time
    }))
    
    res.json({
      average_speed: averageSpeed,
      session_speeds: sessionSpeeds
    })
  })
})

// 获取阅读时段热力图
router.get('/analytics/heatmap', (req, res) => {
  db.all('SELECT * FROM reading_sessions', [], (err, sessions) => {
    if (err) {
      console.error('获取阅读会话失败:', err.message)
      return res.status(500).json({ error: '获取阅读会话失败' })
    }
    
    const heatmapData = analyticsEngine.generateReadingHeatmap(sessions)
    res.json({
      heatmap: heatmapData,
      days: ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    })
  })
})

// 获取书籍阅读进度
router.get('/analytics/progress/:bookId', (req, res) => {
  const bookId = req.params.bookId
  
  db.get('SELECT * FROM books WHERE id = ?', [bookId], (err, book) => {
    if (err) {
      console.error('获取书籍失败:', err.message)
      return res.status(500).json({ error: '获取书籍失败' })
    }
    
    if (!book) {
      return res.status(404).json({ error: '书籍不存在' })
    }
    
    db.all('SELECT * FROM reading_sessions WHERE book_id = ?', [bookId], (err, sessions) => {
      if (err) {
        console.error('获取阅读会话失败:', err.message)
        return res.status(500).json({ error: '获取阅读会话失败' })
      }
      
      const progress = analyticsEngine.calculateReadingProgress(book, sessions)
      res.json(progress)
    })
  })
})

// ==================== NLP 分析 API ====================

// 分析笔记关键词
router.post('/nlp/keywords', (req, res) => {
  const { text, top_n } = req.body
  
  if (!text) {
    return res.status(400).json({ error: '缺少必要字段: text' })
  }
  
  const keywords = nlpAnalyzer.extractKeywords(text, top_n || 10)
  res.json({ keywords })
})

// 分析笔记情感倾向
router.post('/nlp/sentiment', (req, res) => {
  const { text } = req.body
  
  if (!text) {
    return res.status(400).json({ error: '缺少必要字段: text' })
  }
  
  const sentiment = nlpAnalyzer.analyzeSentiment(text)
  res.json(sentiment)
})

// 分析所有阅读笔记的主题
router.get('/nlp/themes', (req, res) => {
  db.all('SELECT * FROM reading_notes', [], (err, notes) => {
    if (err) {
      console.error('获取阅读笔记失败:', err.message)
      return res.status(500).json({ error: '获取阅读笔记失败' })
    }
    
    const themes = nlpAnalyzer.analyzeReadingThemes(notes, 5)
    res.json({ themes })
  })
})

// 分析阅读习惯模式
router.get('/nlp/patterns', (req, res) => {
  db.all('SELECT * FROM reading_sessions', [], (err, sessions) => {
    if (err) {
      console.error('获取阅读会话失败:', err.message)
      return res.status(500).json({ error: '获取阅读会话失败' })
    }
    
    db.all('SELECT * FROM reading_notes', [], (err, notes) => {
      if (err) {
        console.error('获取阅读笔记失败:', err.message)
        return res.status(500).json({ error: '获取阅读笔记失败' })
      }
      
      const patterns = nlpAnalyzer.analyzeReadingPatterns(sessions, notes)
      res.json(patterns)
    })
  })
})

// ==================== 数据同步 API ====================

// 导入CSV文件
router.post('/sync/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' })
    }
    
    const result = await dataSyncService.importFromCSV(req.file.path)
    
    // 记录导入记录
    const stmt = db.prepare(`
      INSERT INTO import_records (source_type, file_name, imported_count, status, completed_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    stmt.run('csv', req.file.originalname, result.importedCount, 'completed', new Date().toISOString(), (err) => {
      if (err) {
        console.error('记录导入失败:', err.message)
      }
    })
    
    stmt.finalize()
    
    res.json(result)
  } catch (error) {
    console.error('导入失败:', error.message)
    res.status(500).json({
      success: false,
      error: '导入失败',
      details: error.message
    })
  }
})

// 导出数据为CSV
router.get('/sync/export', async (req, res) => {
  try {
    const type = req.query.type || 'all'
    const csvContent = await dataSyncService.exportToCSV(type)
    
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename=reading-data-${type}-${Date.now()}.csv`)
    res.send(csvContent)
  } catch (error) {
    console.error('导出失败:', error.message)
    res.status(500).json({
      success: false,
      error: '导出失败',
      details: error.message
    })
  }
})

// 获取Mock OAuth配置
router.get('/sync/oauth-config/:provider', (req, res) => {
  const provider = req.params.provider
  const config = dataSyncService.getMockOAuthConfig(provider)
  
  if (!config) {
    return res.status(404).json({ error: '不支持的服务提供商' })
  }
  
  res.json(config)
})

// 检查是否使用Mock OAuth
router.get('/sync/use-mock/:provider', (req, res) => {
  const provider = req.params.provider
  const useMock = dataSyncService.isUsingMockOAuth(provider)
  res.json({ use_mock: useMock, provider: provider })
})

module.exports = router
