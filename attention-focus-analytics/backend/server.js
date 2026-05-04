const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
require('dotenv').config()

const routes = require('./routes')
require('./database')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use('/api', routes)

app.get('/', (req, res) => {
  res.json({
    message: '个人注意力与专注力数据分析应用 API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      entries: {
        list: 'GET /api/entries',
        create: 'POST /api/entries'
      },
      analytics: {
        efficiency: '/api/analytics/efficiency',
        peakFocus: '/api/analytics/peak-focus',
        overview: '/api/analytics/overview',
        heatmap: '/api/analytics/heatmap'
      },
      sync: {
        rescuetime: 'POST /api/sync/rescuetime',
        toggl: 'POST /api/sync/toggl'
      },
      mock: {
        generate: 'GET /api/mock/generate',
        import: 'POST /api/mock/import'
      },
      stats: '/api/stats'
    },
    features: {
      dataCollection: '支持 RescueTime 和 Toggl API 数据同步',
      patternRecognition: '识别一天中专注力最高的时段',
      efficiencyScoring: '计算深度工作时长占比的效率评分',
      mockData: '提供 Mock 数据作为 API 不可用时的兜底'
    }
  })
})

app.use((err, req, res, next) => {
  console.error('服务器错误:', err.stack)
  res.status(500).json({ error: '服务器内部错误' })
})

app.use((req, res) => {
  res.status(404).json({ error: 'API端点不存在' })
})

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`)
  console.log(`API文档: http://localhost:${PORT}`)
})

module.exports = app
