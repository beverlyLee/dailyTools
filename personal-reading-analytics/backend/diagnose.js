console.log('=== 开始诊断后端模块 ===\n')

// 测试 1: 检查 natural 库
console.log('测试 1: 检查 natural 库...')
try {
  const natural = require('natural')
  console.log('  ✓ natural 库加载成功')
  
  console.log('  测试 WordTokenizer...')
  const tokenizer = new natural.WordTokenizer()
  const tokens = tokenizer.tokenize('Hello world')
  console.log('  ✓ WordTokenizer 正常工作:', tokens)
  
  console.log('  测试 stopwords...')
  console.log('  natural.stopwords 类型:', typeof natural.stopwords)
  console.log('  natural.stopwords 是数组吗?:', Array.isArray(natural.stopwords))
  if (natural.stopwords) {
    console.log('  natural.stopwords 长度:', natural.stopwords.length)
  }
  
  // 尝试不同的方式获取停用词
  console.log('\n  尝试 alternative stopwords 方式...')
  const stopWords = new Set()
  
  // 检查 natural 是否有 PorterStemmer
  console.log('  检查 PorterStemmer...')
  if (natural.PorterStemmer) {
    console.log('  ✓ PorterStemmer 可用')
  }
  
  // 检查 SentimentAnalyzer
  console.log('\n  检查 SentimentAnalyzer...')
  if (natural.SentimentAnalyzer) {
    console.log('  ✓ SentimentAnalyzer 可用')
    try {
      const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn')
      console.log('  ✓ SentimentAnalyzer 实例化成功')
    } catch (e) {
      console.log('  ✗ SentimentAnalyzer 实例化失败:', e.message)
    }
  }
  
} catch (e) {
  console.log('  ✗ natural 库测试失败:', e.message)
  console.log('    堆栈:', e.stack)
}

console.log('\n')

// 测试 2: 检查数据库
console.log('测试 2: 检查数据库模块...')
try {
  const db = require('./database')
  console.log('  ✓ 数据库模块加载成功')
  
  // 等待一下数据库初始化
  setTimeout(() => {
    console.log('\n  测试数据库查询...')
    db.get('SELECT 1 as test', [], (err, row) => {
      if (err) {
        console.log('  ✗ 数据库查询失败:', err.message)
      } else {
        console.log('  ✓ 数据库查询成功:', row)
      }
    })
  }, 1000)
  
} catch (e) {
  console.log('  ✗ 数据库模块测试失败:', e.message)
  console.log('    堆栈:', e.stack)
}

console.log('\n')

// 测试 3: 检查路由
console.log('测试 3: 检查路由模块...')
try {
  const routes = require('./routes')
  console.log('  ✓ 路由模块加载成功')
  console.log('  路由模块类型:', typeof routes)
} catch (e) {
  console.log('  ✗ 路由模块测试失败:', e.message)
  console.log('    堆栈:', e.stack)
}

console.log('\n')

// 测试 4: 检查分析引擎
console.log('测试 4: 检查分析引擎...')
try {
  const AnalyticsEngine = require('./analyticsEngine')
  const engine = new AnalyticsEngine()
  console.log('  ✓ 分析引擎实例化成功')
  
  // 测试计算阅读速度
  const speed = engine.calculateReadingSpeed(0, 50, '2023-01-01T10:00:00', '2023-01-01T11:00:00')
  console.log('  ✓ calculateReadingSpeed 测试:', speed)
  
  // 测试热力图
  const heatmap = engine.generateReadingHeatmap([
    { start_time: '2023-01-02T10:00:00', end_time: '2023-01-02T11:00:00' }
  ])
  console.log('  ✓ generateReadingHeatmap 测试，数据点数量:', heatmap.length)
  
} catch (e) {
  console.log('  ✗ 分析引擎测试失败:', e.message)
  console.log('    堆栈:', e.stack)
}

console.log('\n')

// 测试 5: 检查数据同步服务
console.log('测试 5: 检查数据同步服务...')
try {
  const DataSyncService = require('./dataSyncService')
  const service = new DataSyncService()
  console.log('  ✓ 数据同步服务实例化成功')
} catch (e) {
  console.log('  ✗ 数据同步服务测试失败:', e.message)
  console.log('    堆栈:', e.stack)
}

console.log('\n=== 诊断完成 ===')
