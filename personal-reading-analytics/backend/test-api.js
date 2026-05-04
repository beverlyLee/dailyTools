const http = require('http')

const testOptions = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/books',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
}

console.log('测试后端 API...')
console.log('请求路径: http://localhost:3001/api/books')

const req = http.request(testOptions, (res) => {
  console.log(`\n响应状态码: ${res.statusCode}`)
  console.log(`响应头: ${JSON.stringify(res.headers, null, 2)}`)
  
  let data = ''
  res.on('data', (chunk) => {
    data += chunk
  })
  
  res.on('end', () => {
    console.log(`\n响应体:`)
    try {
      const json = JSON.parse(data)
      console.log(JSON.stringify(json, null, 2))
    } catch (e) {
      console.log(data)
    }
  })
})

req.on('error', (e) => {
  console.error(`\n请求错误: ${e.message}`)
  console.error(`请确保后端服务器正在运行在端口 3001`)
})

req.end()
