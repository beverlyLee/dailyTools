const fs = require('fs')
const path = require('path')

const emissionFactorsPath = path.resolve(__dirname, 'emission-factors.json')
let emissionFactors = null

function loadEmissionFactors() {
  try {
    const data = fs.readFileSync(emissionFactorsPath, 'utf8')
    emissionFactors = JSON.parse(data)
    console.log('排放因子库加载成功')
  } catch (error) {
    console.error('加载排放因子库失败:', error.message)
    emissionFactors = null
  }
}

loadEmissionFactors()

function getEmissionFactor(type, subtype) {
  if (!emissionFactors) {
    throw new Error('排放因子库未加载')
  }

  const category = emissionFactors[type]
  if (!category) {
    throw new Error(`未找到类型: ${type}`)
  }

  const factor = category[subtype]
  if (!factor) {
    throw new Error(`未找到子类型: ${subtype} (类型: ${type})`)
  }

  return factor
}

function calculateCarbonEmission(type, subtype, amount) {
  const factor = getEmissionFactor(type, subtype)
  const carbonEmission = amount * factor.factor
  return {
    carbon_emission: carbonEmission,
    unit: factor.unit,
    factor: factor.factor,
    name: factor.name
  }
}

function calculateTotalCarbon(records) {
  return records.reduce((total, record) => {
    return total + (record.carbon_emission || 0)
  }, 0)
}

function calculateByType(records) {
  const byType = {}
  
  records.forEach(record => {
    const type = record.type
    if (!byType[type]) {
      byType[type] = {
        total: 0,
        count: 0,
        subtypes: {}
      }
    }
    
    byType[type].total += record.carbon_emission
    byType[type].count += 1
    
    const subtype = record.subtype
    if (!byType[type].subtypes[subtype]) {
      byType[type].subtypes[subtype] = {
        total: 0,
        count: 0
      }
    }
    
    byType[type].subtypes[subtype].total += record.carbon_emission
    byType[type].subtypes[subtype].count += 1
  })
  
  return byType
}

function calculateByDateRange(records, startDate, endDate) {
  const filtered = records.filter(record => {
    return record.date >= startDate && record.date <= endDate
  })
  
  return {
    records: filtered,
    total: calculateTotalCarbon(filtered),
    byType: calculateByType(filtered)
  }
}

function calculateDailyTrend(records, days = 30) {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - days)
  
  const trend = {}
  const dateFormat = (date) => date.toISOString().split('T')[0]
  
  for (let i = 0; i <= days; i++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(currentDate.getDate() + i)
    const dateStr = dateFormat(currentDate)
    trend[dateStr] = 0
  }
  
  records.forEach(record => {
    if (trend.hasOwnProperty(record.date)) {
      trend[record.date] += record.carbon_emission
    }
  })
  
  return Object.entries(trend).map(([date, value]) => ({
    date,
    carbon_emission: value
  }))
}

function getTypeCategoryName(type) {
  const typeNames = {
    transport: '出行',
    diet: '饮食',
    home: '家庭能源',
    shopping: '购物'
  }
  return typeNames[type] || type
}

function getAllEmissionFactors() {
  if (!emissionFactors) {
    throw new Error('排放因子库未加载')
  }
  
  return emissionFactors
}

function getEmissionFactorsByType(type) {
  if (!emissionFactors) {
    throw new Error('排放因子库未加载')
  }
  
  const category = emissionFactors[type]
  if (!category) {
    throw new Error(`未找到类型: ${type}`)
  }
  
  return category
}

module.exports = {
  loadEmissionFactors,
  getEmissionFactor,
  calculateCarbonEmission,
  calculateTotalCarbon,
  calculateByType,
  calculateByDateRange,
  calculateDailyTrend,
  getTypeCategoryName,
  getAllEmissionFactors,
  getEmissionFactorsByType
}
