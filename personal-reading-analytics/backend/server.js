const express = require('express')
const cors = require('cors')
require('dotenv').config()

const routes = require('./routes')
require('./database')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api', routes)

app.get('/', (req, res) => {
  res.json({
    message: '个人阅读习惯分析应用 API',
    version: '1.0.0',
    endpoints: {
      books: '/api/books',
      sessions: '/api/sessions',
      notes: '/api/notes',
      analytics: {
        statistics: '/api/analytics/statistics',
        readingSpeed: '/api/analytics/reading-speed',
        heatmap: '/api/analytics/heatmap',
        progress: '/api/analytics/progress/:bookId'
      },
      nlp: {
        keywords: '/api/nlp/keywords',
        sentiment: '/api/nlp/sentiment',
        themes: '/api/nlp/themes',
        patterns: '/api/nlp/patterns'
      },
      sync: {
        import: '/api/sync/import',
        export: '/api/sync/export',
        oauthConfig: '/api/sync/oauth-config/:provider',
        useMock: '/api/sync/use-mock/:provider'
      }
    }
  })
})

app.use((req, res) => {
  res.status(404).json({ 
    error: 'API端点不存在',
    method: req.method,
    url: req.url
  })
})

app.use((err, req, res, next) => {
  console.error('服务器错误:', err.stack)
  res.status(500).json({ error: '服务器内部错误' })
})

const server = app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`)
  console.log(`API文档: http://localhost:${PORT}`)
  console.log(`健康检查: http://localhost:${PORT}/api/health`)
})

server.on('error', (err) => {
  console.error('服务器启动错误:', err.message)
  if (err.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用，请尝试使用其他端口或关闭占用该端口的程序`)
  }
})

process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...')
  server.close(() => {
    console.log('服务器已关闭')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭服务器...')
  server.close(() => {
    console.log('服务器已关闭')
    process.exit(0)
  })
})

module.exports = app
