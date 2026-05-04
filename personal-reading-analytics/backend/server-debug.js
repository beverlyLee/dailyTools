const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
require('dotenv').config()

console.log('=== 服务器启动 ===')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('PORT:', process.env.PORT)

// 捕获未处理的异常
process.on('uncaughtException', (err) => {
  console.error('=== 未捕获的异常 ===')
  console.error(err.message)
  console.error(err.stack)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('=== 未处理的 Promise 拒绝 ===')
  console.error('Reason:', reason)
})

// 捕获退出信号
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号')
  process.exit(0)
})

console.log('正在加载路由模块...')
try {
  const routes = require('./routes')
  console.log('✓ 路由模块加载成功')
  
  console.log('正在加载数据库模块...')
  require('./database')
  console.log('✓ 数据库模块加载成功')
  
  const app = express()
  const PORT = process.env.PORT || 3001

  app.use(cors())
  console.log('✓ CORS 中间件已启用')
  
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))
  console.log('✓ BodyParser 中间件已启用')

  // 添加请求日志
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
    next()
  })

  app.use('/api', routes)
  console.log('✓ API 路由已注册: /api/*')

  app.get('/', (req, res) => {
    res.json({
      message: '个人阅读习惯分析应用 API',
      version: '1.0.0',
      endpoints: {
        books: '/api/books',
        sessions: '/api/sessions',
        notes: '/api/notes'
      }
    })
  })

  // 错误处理中间件
  app.use((err, req, res, next) => {
    console.error('=== 服务器错误 ===')
    console.error(err.stack)
    res.status(500).json({ error: '服务器内部错误', message: err.message })
  })

  // 404 处理
  app.use((req, res) => {
    console.log(`404: ${req.method} ${req.url}`)
    res.status(404).json({ 
      error: 'API端点不存在', 
      url: req.url, 
      method: req.method,
      availableEndpoints: [
        'GET /api/books',
        'POST /api/books',
        'GET /api/books/:id',
        'PUT /api/books/:id',
        'DELETE /api/books/:id',
        'GET /api/sessions',
        'POST /api/sessions',
        'GET /api/sessions/:id',
        'PUT /api/sessions/:id',
        'DELETE /api/sessions/:id',
        'GET /api/notes',
        'POST /api/notes',
        'GET /api/notes/:id',
        'PUT /api/notes/:id',
        'DELETE /api/notes/:id'
      ]
    })
  })

  const server = app.listen(PORT, () => {
    console.log(`\n=== 服务器已启动 ===`)
    console.log(`服务器运行在端口 ${PORT}`)
    console.log(`API文档: http://localhost:${PORT}`)
    console.log(`健康检查: http://localhost:${PORT}/api/health`)
    console.log(`书籍 API: http://localhost:${PORT}/api/books`)
    console.log(`==================\n`)
  })

  server.on('error', (err) => {
    console.error('=== 服务器错误 ===')
    console.error(err.message)
    if (err.code === 'EADDRINUSE') {
      console.error(`端口 ${PORT} 已被占用`)
    }
    process.exit(1)
  })

  // 保持进程活动
  setInterval(() => {
    console.log(`[心跳] 服务器运行中 - ${new Date().toISOString()}`)
  }, 60000)

  console.log('=== 服务器初始化完成 ===')
  
} catch (err) {
  console.error('=== 服务器启动失败 ===')
  console.error(err.message)
  console.error(err.stack)
  process.exit(1)
}
