const test = require('node:test')
const assert = require('node:assert')
const AnalyticsEngine = require('./analyticsEngine')

const analytics = new AnalyticsEngine()

test('identifyPeakFocusTime - 空数据应返回空结果', () => {
  const result = analytics.identifyPeakFocusTime([])
  assert.strictEqual(result.peakHour, null)
  assert.strictEqual(result.peakFocusScore, 0)
  assert.strictEqual(result.hourlyAnalysis.length, 0)
  assert.match(result.message, /没有足够的数据/)
})

test('identifyPeakFocusTime - null数据应返回空结果', () => {
  const result = analytics.identifyPeakFocusTime(null)
  assert.strictEqual(result.peakHour, null)
  assert.strictEqual(result.peakFocusScore, 0)
})

test('identifyPeakFocusTime - 单条数据应正确识别时段', () => {
  const testData = [
    {
      start_time: '2024-01-15T09:30:00',
      end_time: '2024-01-15T10:30:00',
      duration: 3600,
      is_deep_work: 1,
      productivity_score: 85
    }
  ]
  
  const result = analytics.identifyPeakFocusTime(testData)
  assert.strictEqual(result.peakHour, 9)
  assert.ok(result.peakFocusScore > 0)
  assert.ok(result.hourlyAnalysis.length > 0)
})

test('identifyPeakFocusTime - 深度工作时段应获得更高分数', () => {
  const testData = [
    {
      start_time: '2024-01-15T09:00:00',
      end_time: '2024-01-15T10:00:00',
      duration: 3600,
      is_deep_work: 1,
      productivity_score: 90
    },
    {
      start_time: '2024-01-15T14:00:00',
      end_time: '2024-01-15T15:00:00',
      duration: 3600,
      is_deep_work: 0,
      productivity_score: 60
    }
  ]
  
  const result = analytics.identifyPeakFocusTime(testData)
  assert.strictEqual(result.peakHour, 9)
  assert.ok(result.hourlyAnalysis[0].focusScore > result.hourlyAnalysis[1].focusScore)
})

test('calculateEfficiencyScore - 空数据应返回0分', () => {
  const result = analytics.calculateEfficiencyScore([])
  assert.strictEqual(result.efficiencyScore, 0)
  assert.strictEqual(result.totalTime, 0)
  assert.strictEqual(result.deepWorkTime, 0)
  assert.match(result.message, /没有足够的数据/)
})

test('calculateEfficiencyScore - 全部深度工作应返回100分', () => {
  const testData = [
    {
      duration: 3600,
      is_deep_work: 1
    },
    {
      duration: 1800,
      is_deep_work: 1
    }
  ]
  
  const result = analytics.calculateEfficiencyScore(testData)
  assert.strictEqual(result.efficiencyScore, 100)
  assert.strictEqual(result.totalTime, 5400)
  assert.strictEqual(result.deepWorkTime, 5400)
  assert.strictEqual(result.shallowWorkTime, 0)
  assert.strictEqual(result.deepWorkRatio, 1)
})

test('calculateEfficiencyScore - 无深度工作应返回0分', () => {
  const testData = [
    {
      duration: 3600,
      is_deep_work: 0
    },
    {
      duration: 1800,
      is_deep_work: 0
    }
  ]
  
  const result = analytics.calculateEfficiencyScore(testData)
  assert.strictEqual(result.efficiencyScore, 0)
  assert.strictEqual(result.deepWorkTime, 0)
  assert.strictEqual(result.shallowWorkTime, 5400)
  assert.strictEqual(result.deepWorkRatio, 0)
})

test('calculateEfficiencyScore - 混合工作应正确计算比例', () => {
  const testData = [
    {
      duration: 3600,
      is_deep_work: 1
    },
    {
      duration: 3600,
      is_deep_work: 0
    }
  ]
  
  const result = analytics.calculateEfficiencyScore(testData)
  assert.strictEqual(result.efficiencyScore, 50)
  assert.strictEqual(result.deepWorkTime, 3600)
  assert.strictEqual(result.shallowWorkTime, 3600)
  assert.strictEqual(result.deepWorkRatio, 0.5)
})

test('calculateEfficiencyScore - 时间格式化应正确', () => {
  const testData = [
    {
      duration: 3660,
      is_deep_work: 1
    }
  ]
  
  const result = analytics.calculateEfficiencyScore(testData)
  assert.strictEqual(result.totalTimeFormatted, '1小时1分钟')
  assert.strictEqual(result.deepWorkTimeFormatted, '1小时1分钟')
})

test('getEfficiencyMessage - 不同分数应返回不同消息', () => {
  assert.match(analytics.getEfficiencyMessage(80), /优秀/)
  assert.match(analytics.getEfficiencyMessage(60), /良好/)
  assert.match(analytics.getEfficiencyMessage(40), /一般/)
  assert.match(analytics.getEfficiencyMessage(20), /需要改进/)
})

test('calculateOverallFocusScore - 空数据应返回0分', () => {
  const result = analytics.calculateOverallFocusScore([])
  assert.strictEqual(result.overallScore, 0)
  assert.strictEqual(result.components.efficiency, 0)
  assert.strictEqual(result.components.productivity, 0)
  assert.strictEqual(result.components.concentration, 0)
})

test('calculateOverallFocusScore - 综合评分计算正确', () => {
  const testData = [
    {
      start_time: '2024-01-15T09:00:00',
      end_time: '2024-01-15T11:00:00',
      duration: 7200,
      is_deep_work: 1,
      productivity_score: 90
    }
  ]
  
  const result = analytics.calculateOverallFocusScore(testData)
  assert.ok(result.overallScore > 0)
  assert.ok(result.components.efficiency > 0)
  assert.ok(result.components.productivity > 0)
  assert.ok(result.components.concentration > 0)
  assert.ok(result.efficiencyResult)
  assert.ok(result.peakResult)
})

test('generateFocusHeatmap - 空数据应返回初始化的热力图', () => {
  const result = analytics.generateFocusHeatmap([])
  assert.strictEqual(result.length, 168)
  result.forEach(([day, hour, intensity]) => {
    assert.ok(day >= 0 && day <= 6)
    assert.ok(hour >= 0 && hour <= 23)
    assert.strictEqual(intensity, 0)
  })
})

test('generateFocusHeatmap - 有数据时应正确计算强度', () => {
  const testData = [
    {
      start_time: '2024-01-15T09:00:00',
      end_time: '2024-01-15T10:00:00',
      duration: 3600,
      is_deep_work: 1,
      productivity_score: 80
    }
  ]
  
  const result = analytics.generateFocusHeatmap(testData)
  
  const monday9Hour = result.find(([day, hour]) => day === 1 && hour === 9)
  assert.ok(monday9Hour[2] > 0)
})

test('getFocusMessage - 不同分数应返回不同消息', () => {
  assert.match(analytics.getFocusMessage(90), /优秀/)
  assert.match(analytics.getFocusMessage(70), /良好/)
  assert.match(analytics.getFocusMessage(50), /一般/)
  assert.match(analytics.getFocusMessage(30), /需要提升/)
})

console.log('所有测试通过！')
