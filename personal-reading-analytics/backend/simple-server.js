const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')

const app = express()
const PORT = 3001

app.use(cors())
app.use(bodyParser.json())

app.get('/api/health', (req, res) => {
  console.log('收到 /api/health 请求')
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/books', (req, res) => {
  console.log('收到 /api/books 请求')
  res.json([])
})

app.post('/api/books', (req, res) => {
  console.log('收到 POST /api/books 请求:', req.body)
  res.status(201).json({ id: 1, ...req.body })
})

app.get('/', (req, res) => {
  res.json({
    message: '测试 API 服务器',
    endpoints: {
      health: '/api/health',
      books: '/api/books'
    }
  })
})

app.use((req, res) => {
  console.log(`404: ${req.method} ${req.url}`)
  res.status(404).json({ error: 'API端点不存在', url: req.url, method: req.method })
})

const server = app.listen(PORT, () => {
  console.log(`测试服务器运行在端口 ${PORT}`)
  console.log(`健康检查: http://localhost:${PORT}/api/health`)
  console.log(`书籍 API: http://localhost:${PORT}/api/books`)
})

server.on('error', (err) => {
  console.error('服务器错误:', err)
})

process.on('SIGTERM', () => {
  console.log('收到 SIGTERM，关闭服务器')
  server.close(() => {
    console.log('服务器已关闭')
  })
})

process.on('SIGINT', () => {
  console.log('收到 SIGINT，关闭服务器')
  server.close(() => {
    console.log('服务器已关闭')
  })
})

// 保持进程运行
setInterval(() => {
  console.log('服务器正在运行...', new Date().toISOString())
}, 30000)
