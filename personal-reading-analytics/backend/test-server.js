const http = require('http')

const server = http.createServer((req, res) => {
  console.log(`收到请求: ${req.method} ${req.url}`)
  
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ 
    message: '测试服务器正常',
    url: req.url,
    method: req.method
  }))
})

const PORT = 3001
server.listen(PORT, () => {
  console.log(`测试服务器运行在端口 ${PORT}`)
})

server.on('error', (err) => {
  console.error('服务器错误:', err)
})

setInterval(() => {
  console.log('服务器正在运行...')
}, 10000)
