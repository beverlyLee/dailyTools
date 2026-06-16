export const BREED_CONFIG = {
  '杜洛克猪': { A: 180, B: 4.2, K: 0.022, birthWeight: 1.5, matureWeight: 180, standardFCR: 2.8, warningThreshold: 0.15 },
  '长白猪': { A: 170, B: 4.0, K: 0.024, birthWeight: 1.4, matureWeight: 170, standardFCR: 2.7, warningThreshold: 0.15 },
  '大白猪': { A: 175, B: 4.1, K: 0.023, birthWeight: 1.45, matureWeight: 175, standardFCR: 2.75, warningThreshold: 0.15 },
  '地方品种': { A: 120, B: 3.8, K: 0.018, birthWeight: 1.0, matureWeight: 120, standardFCR: 3.2, warningThreshold: 0.2 }
}

export function gompertz(ageDays, A, B, K) {
  return A * Math.exp(-B * Math.exp(-K * ageDays))
}

export function getStandardWeight(breed, ageDays) {
  const config = BREED_CONFIG[breed] || BREED_CONFIG['地方品种']
  return gompertz(ageDays, config.A, config.B, config.K)
}

export function calculateAgeDays(birthDate, targetDate = new Date()) {
  const birth = new Date(birthDate)
  const target = new Date(targetDate)
  const diff = target.getTime() - birth.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function calculateFCR(totalFeed, weightGain) {
  if (weightGain <= 0) return null
  return totalFeed / weightGain
}

export function calculateDailyGain(firstWeight, secondWeight, daysBetween) {
  if (daysBetween <= 0) return null
  return (secondWeight - firstWeight) / daysBetween
}

export function calculateDeviation(actualWeight, standardWeight) {
  if (standardWeight <= 0) return null
  return (actualWeight - standardWeight) / standardWeight
}

export function checkWarning(deviation, threshold = 0.15) {
  return deviation < -threshold
}

export function generateGrowthCurve(breed, startAge = 0, endAge = 200) {
  const config = BREED_CONFIG[breed] || BREED_CONFIG['地方品种']
  const points = []
  for (let age = startAge; age <= endAge; age += 7) {
    points.push({
      age,
      weight: gompertz(age, config.A, config.B, config.K)
    })
  }
  return points
}

export function calculateFCRBetweenRecords(weightRecords, feedRecords, startDate, endDate) {
  const sortedWeights = weightRecords
    .filter(r => {
      const d = new Date(r.recordDate)
      return d >= new Date(startDate) && d <= new Date(endDate)
    })
    .sort((a, b) => new Date(a.recordDate) - new Date(b.recordDate))

  if (sortedWeights.length < 2) return null

  const firstWeight = sortedWeights[0]
  const lastWeight = sortedWeights[sortedWeights.length - 1]
  const weightGain = lastWeight.weight - firstWeight.weight

  const totalFeed = feedRecords
    .filter(r => {
      const d = new Date(r.recordDate)
      return d >= new Date(firstWeight.recordDate) && d <= new Date(lastWeight.recordDate)
    })
    .reduce((sum, r) => sum + (r.feedAmount || 0), 0)

  if (weightGain <= 0 || totalFeed <= 0) return null

  const daysBetween = calculateAgeDays(firstWeight.recordDate, lastWeight.recordDate)

  return {
    fcr: totalFeed / weightGain,
    weightGain,
    totalFeed,
    daysBetween,
    startWeight: firstWeight.weight,
    endWeight: lastWeight.weight,
    dailyGain: weightGain / Math.max(daysBetween, 1)
  }
}

export function calculateUniformity(weightRecords) {
  if (weightRecords.length < 2) return null

  const weights = weightRecords.map(r => r.weight)
  const mean = weights.reduce((a, b) => a + b, 0) / weights.length
  const variance = weights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / weights.length
  const stdDev = Math.sqrt(variance)

  const cv = (stdDev / mean) * 100
  const uniformCount = weights.filter(w => w >= mean * 0.9 && w <= mean * 1.1).length

  return {
    meanWeight: mean,
    stdDev,
    cv,
    uniformity: (uniformCount / weights.length) * 100
  }
}
