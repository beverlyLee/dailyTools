const test = require('node:test')
const assert = require('node:assert')
const AnalyticsEngine = require('./analyticsEngine')

const engine = new AnalyticsEngine()

test('calculateReadingSpeed - 正常计算阅读速度', () => {
  const startPage = 0
  const endPage = 50
  const startTime = '2023-01-01T10:00:00'
  const endTime = '2023-01-01T11:00:00'
  
  const speed = engine.calculateReadingSpeed(startPage, endPage, startTime, endTime)
  
  const expectedSpeed = 50 / 60
  assert.strictEqual(speed, expectedSpeed)
})

test('calculateReadingSpeed - 零分钟情况', () => {
  const startPage = 0
  const endPage = 50
  const startTime = '2023-01-01T10:00:00'
  const endTime = '2023-01-01T10:00:00'
  
  const speed = engine.calculateReadingSpeed(startPage, endPage, startTime, endTime)
  
  assert.strictEqual(speed, 0)
})

test('calculateReadingSpeed - 零页数情况', () => {
  const startPage = 50
  const endPage = 50
  const startTime = '2023-01-01T10:00:00'
  const endTime = '2023-01-01T11:00:00'
  
  const speed = engine.calculateReadingSpeed(startPage, endPage, startTime, endTime)
  
  assert.strictEqual(speed, 0)
})

test('calculateReadingSpeed - 无效输入', () => {
  assert.strictEqual(engine.calculateReadingSpeed(undefined, 50, '2023-01-01T10:00:00', '2023-01-01T11:00:00'), 0)
  assert.strictEqual(engine.calculateReadingSpeed(0, undefined, '2023-01-01T10:00:00', '2023-01-01T11:00:00'), 0)
  assert.strictEqual(engine.calculateReadingSpeed(0, 50, undefined, '2023-01-01T11:00:00'), 0)
  assert.strictEqual(engine.calculateReadingSpeed(0, 50, '2023-01-01T10:00:00', undefined), 0)
})

test('calculateAverageReadingSpeed - 计算平均阅读速度', () => {
  const sessions = [
    {
      start_page: 0,
      end_page: 50,
      start_time: '2023-01-01T10:00:00',
      end_time: '2023-01-01T11:00:00'
    },
    {
      start_page: 50,
      end_page: 100,
      start_time: '2023-01-02T10:00:00',
      end_time: '2023-01-02T10:30:00'
    }
  ]
  
  const averageSpeed = engine.calculateAverageReadingSpeed(sessions)
  
  const totalPages = 50 + 50
  const totalMinutes = 60 + 30
  const expected = totalPages / totalMinutes
  
  assert.strictEqual(averageSpeed, expected)
})

test('calculateAverageReadingSpeed - 空数组返回0', () => {
  assert.strictEqual(engine.calculateAverageReadingSpeed([]), 0)
  assert.strictEqual(engine.calculateAverageReadingSpeed(null), 0)
  assert.strictEqual(engine.calculateAverageReadingSpeed(undefined), 0)
})

test('generateReadingHeatmap - 生成热力图数据', () => {
  const sessions = [
    {
      start_time: '2023-01-02T10:00:00',
      end_time: '2023-01-02T12:00:00'
    },
    {
      start_time: '2023-01-03T15:00:00',
      end_time: '2023-01-03T16:00:00'
    }
  ]
  
  const heatmap = engine.generateReadingHeatmap(sessions)
  
  assert.strictEqual(heatmap.length, 7 * 24)
  
  const monday10am = heatmap.find(item => item[0] === 1 && item[1] === 10)
  const monday11am = heatmap.find(item => item[0] === 1 && item[1] === 11)
  const tuesday3pm = heatmap.find(item => item[0] === 2 && item[1] === 15)
  
  assert.ok(monday10am[2] >= 1)
  assert.ok(monday11am[2] >= 1)
  assert.ok(tuesday3pm[2] >= 1)
})

test('generateReadingHeatmap - 空会话返回零矩阵', () => {
  const heatmap = engine.generateReadingHeatmap([])
  
  assert.strictEqual(heatmap.length, 7 * 24)
  
  heatmap.forEach(item => {
    assert.strictEqual(item[2], 0)
  })
})

test('generateReadingHeatmap - 数据结构验证', () => {
  const sessions = [
    {
      start_time: '2023-01-01T12:00:00'
    }
  ]
  
  const heatmap = engine.generateReadingHeatmap(sessions)
  
  heatmap.forEach(item => {
    assert.ok(Array.isArray(item))
    assert.strictEqual(item.length, 3)
    assert.ok(typeof item[0] === 'number' && item[0] >= 0 && item[0] <= 6)
    assert.ok(typeof item[1] === 'number' && item[1] >= 0 && item[1] <= 23)
    assert.ok(typeof item[2] === 'number' && item[2] >= 0)
  })
})

test('calculateReadingStatistics - 计算阅读统计数据', () => {
  const sessions = [
    {
      start_page: 0,
      end_page: 50,
      start_time: '2023-01-02T10:00:00',
      end_time: '2023-01-02T11:00:00'
    }
  ]
  
  const books = [
    { id: 1, title: 'Test Book', genre: '编程' }
  ]
  
  const stats = engine.calculateReadingStatistics(sessions, books)
  
  assert.strictEqual(stats.totalSessions, 1)
  assert.strictEqual(stats.totalBooks, 1)
  assert.strictEqual(stats.totalPages, 50)
  assert.strictEqual(stats.totalMinutes, 60)
  assert.strictEqual(stats.averageSpeed, 50 / 60)
  assert.strictEqual(stats.mostReadGenre, '编程')
})

test('calculateReadingStatistics - 空数据处理', () => {
  const stats = engine.calculateReadingStatistics([], [])
  
  assert.strictEqual(stats.totalSessions, 0)
  assert.strictEqual(stats.totalBooks, 0)
  assert.strictEqual(stats.totalPages, 0)
  assert.strictEqual(stats.totalMinutes, 0)
  assert.strictEqual(stats.averageSpeed, 0)
  assert.strictEqual(stats.mostReadGenre, null)
})

test('calculateReadingProgress - 计算阅读进度', () => {
  const book = {
    id: 1,
    title: 'Test Book',
    total_pages: 200
  }
  
  const sessions = [
    { start_page: 0, end_page: 50 },
    { start_page: 50, end_page: 100 }
  ]
  
  const progress = engine.calculateReadingProgress(book, sessions)
  
  assert.strictEqual(progress.pagesRead, 100)
  assert.strictEqual(progress.totalPages, 200)
  assert.strictEqual(progress.progress, 50)
  assert.strictEqual(progress.isCompleted, false)
})

test('calculateReadingProgress - 已完成书籍', () => {
  const book = {
    id: 1,
    title: 'Test Book',
    total_pages: 100
  }
  
  const sessions = [
    { start_page: 0, end_page: 100 }
  ]
  
  const progress = engine.calculateReadingProgress(book, sessions)
  
  assert.strictEqual(progress.pagesRead, 100)
  assert.strictEqual(progress.totalPages, 100)
  assert.strictEqual(progress.progress, 100)
  assert.strictEqual(progress.isCompleted, true)
})

test('calculateReadingProgress - 无书籍情况', () => {
  const progress = engine.calculateReadingProgress(null, [])
  
  assert.strictEqual(progress.progress, 0)
  assert.strictEqual(progress.pagesRead, 0)
  assert.strictEqual(progress.totalPages, 0)
})

test('calculateReadingProgress - 无会话情况', () => {
  const book = {
    id: 1,
    title: 'Test Book',
    total_pages: 100
  }
  
  const progress = engine.calculateReadingProgress(book, [])
  
  assert.strictEqual(progress.progress, 0)
  assert.strictEqual(progress.pagesRead, 0)
  assert.strictEqual(progress.totalPages, 100)
  assert.strictEqual(progress.isCompleted, false)
})
