import { BREED_CONFIG, gompertz } from './growthModel.js'

export function generateEarTag() {
  const prefix = 'ET'
  const date = new Date().toISOString().slice(2, 8).replace(/-/g, '')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${prefix}${date}${random}`
}

function addDays(baseDate, days) {
  const d = new Date(baseDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function generateMockLivestock(count = 10) {
  const breeds = Object.keys(BREED_CONFIG)
  const livestock = []
  const today = new Date()

  for (let i = 0; i < count; i++) {
    const breed = breeds[Math.floor(Math.random() * breeds.length)]
    const ageDays = 30 + Math.floor(Math.random() * 120)
    const birthDate = addDays(today, -ageDays)

    livestock.push({
      earTag: generateEarTag(),
      breed,
      birthDate,
      gender: Math.random() > 0.5 ? '公' : '母',
      sire: `S${Math.floor(Math.random() * 100)}`,
      dam: `D${Math.floor(Math.random() * 100)}`,
      notes: `模拟数据 - ${breed}`
    })
  }

  return livestock
}

export function generateMockWeightRecords(livestockId, birthDate, breed, includeSlowGrowth = false) {
  const config = BREED_CONFIG[breed] || BREED_CONFIG['地方品种']
  const records = []
  const today = new Date()
  const birth = new Date(birthDate)
  const totalDays = Math.floor((today - birth) / (1000 * 60 * 60 * 24))

  const slowFactor = includeSlowGrowth ? 0.85 : 1.0

  for (let age = 7; age <= totalDays; age += 7) {
    const standardWeight = gompertz(age, config.A, config.B, config.K)
    const noise = (Math.random() - 0.5) * standardWeight * 0.05
    const actualWeight = (standardWeight + noise) * slowFactor

    records.push({
      livestockId,
      recordDate: addDays(birthDate, age),
      weight: Math.max(config.birthWeight, actualWeight)
    })
  }

  return records
}

export function generateMockFeedRecords(livestockId, birthDate, weightRecords) {
  const records = []
  const sortedWeights = weightRecords.sort((a, b) => new Date(a.recordDate) - new Date(b.recordDate))

  for (let i = 1; i < sortedWeights.length; i++) {
    const prev = sortedWeights[i - 1]
    const curr = sortedWeights[i]
    const daysBetween = Math.floor((new Date(curr.recordDate) - new Date(prev.recordDate)) / (1000 * 60 * 60 * 24))
    const weightGain = curr.weight - prev.weight

    const fcr = 2.5 + Math.random() * 0.8
    const totalFeed = weightGain * fcr
    const dailyFeed = totalFeed / Math.max(daysBetween, 1)

    for (let d = 0; d < daysBetween; d++) {
      records.push({
        livestockId,
        recordDate: addDays(prev.recordDate, d),
        feedAmount: dailyFeed * (0.95 + Math.random() * 0.1),
        notes: '模拟投喂记录'
      })
    }
  }

  return records
}

export function generateMockVaccineRecords(livestockId, birthDate, breed) {
  const records = []
  const vaccines = {
    '杜洛克猪': ['猪瘟疫苗', '伪狂犬病疫苗', '猪蓝耳病疫苗'],
    '长白猪': ['猪瘟疫苗', '伪狂犬病疫苗', '猪圆环病毒疫苗'],
    '大白猪': ['猪瘟疫苗', '伪狂犬病疫苗', '口蹄疫疫苗'],
    '地方品种': ['猪瘟疫苗', '口蹄疫疫苗']
  }
  const vaccineList = vaccines[breed] || vaccines['地方品种']
  const days = [14, 21, 30, 45, 60]

  vaccineList.slice(0, 3).forEach((name, i) => {
    records.push({
      livestockId,
      vaccineName: name,
      vaccineDate: addDays(birthDate, days[i]),
      batchNumber: `B${Date.now()}${i}`,
      type: 'initial',
      operator: '系统模拟',
      notes: '模拟接种记录'
    })
  })

  return records
}

export function generateValidationData() {
  const testCases = []

  testCases.push({
    name: '正常生长个体',
    breed: '杜洛克猪',
    ageDays: 100,
    expectedFCRRange: [2.5, 3.2],
    deviationRange: [-0.05, 0.05],
    shouldWarning: false,
    slowGrowth: false
  })

  testCases.push({
    name: '生长迟缓个体 - 15%偏离',
    breed: '长白猪',
    ageDays: 120,
    expectedFCRRange: [3.2, 4.5],
    deviationRange: [-0.25, -0.1],
    shouldWarning: true,
    slowGrowth: true
  })

  testCases.push({
    name: '早期个体 - 30天',
    breed: '大白猪',
    ageDays: 30,
    expectedFCRRange: [2.0, 2.8],
    deviationRange: [-0.05, 0.05],
    shouldWarning: false,
    slowGrowth: false
  })

  return testCases
}
