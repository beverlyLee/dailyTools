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
    message: '个人碳足迹追踪器 API',
    version: '1.0.0',
    endpoints: {
      records: '/api/records',
      calculations: '/api/calculations',
      emissionFactors: '/api/emission-factors'
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
