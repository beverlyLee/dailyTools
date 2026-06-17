import type { SoilData, SHIResult, SHIScores } from '../../shared/types.js'

function scorePh(ph: number): number {
  if (ph >= 6.5 && ph <= 7.5) return 100
  if (ph > 7.5 && ph <= 8.0) return 100 - (ph - 7.5) * 60
  if (ph >= 5.5 && ph < 6.5) return 100 - (6.5 - ph) * 30
  if (ph > 8.0 && ph <= 8.5) return 70 - (ph - 8.0) * 80
  if (ph >= 4.5 && ph < 5.5) return 70 - (5.5 - ph) * 40
  if (ph < 4.5) return Math.max(0, 30 - (4.5 - ph) * 30)
  return Math.max(0, 30 - (ph - 8.5) * 30)
}

function scoreOrganicMatter(om: number): number {
  if (om >= 30) return 100
  if (om >= 20) return 80 + (om - 20) / 10 * 20
  if (om >= 10) return 50 + (om - 10) / 10 * 30
  return Math.max(0, om / 10 * 50)
}

function scoreNitrogen(n: number): number {
  if (n >= 1.5) return 100
  if (n >= 1.0) return 70 + (n - 1.0) / 0.5 * 30
  if (n >= 0.5) return 40 + (n - 0.5) / 0.5 * 30
  return Math.max(0, n / 0.5 * 40)
}

function scorePhosphorus(p: number): number {
  if (p >= 20) return 100
  if (p >= 10) return 70 + (p - 10) / 10 * 30
  if (p >= 5) return 40 + (p - 5) / 5 * 30
  return Math.max(0, p / 5 * 40)
}

function scorePotassium(k: number): number {
  if (k >= 150) return 100
  if (k >= 100) return 70 + (k - 100) / 50 * 30
  if (k >= 50) return 40 + (k - 50) / 50 * 30
  return Math.max(0, k / 50 * 40)
}

function getGrade(shi: number): '优' | '良' | '中' | '差' {
  if (shi >= 85) return '优'
  if (shi >= 70) return '良'
  if (shi >= 55) return '中'
  return '差'
}

function identifyDegradation(data: SoilData, scores: SHIScores): string[] {
  const types: string[] = []
  if (data.ph < 6.5) types.push('酸化')
  if (data.ph > 8.0) types.push('碱化')
  if (data.organicMatter < 15) types.push('板结')
  if (scores.nitrogen < 50 && scores.phosphorus < 50 && scores.potassium < 50) {
    types.push('贫瘠')
  }
  if (types.length === 0) types.push('无明显退化')
  return types
}

export function calculateSHI(data: SoilData): SHIResult {
  const scores: SHIScores = {
    ph: Math.round(scorePh(data.ph) * 10) / 10,
    organicMatter: Math.round(scoreOrganicMatter(data.organicMatter) * 10) / 10,
    nitrogen: Math.round(scoreNitrogen(data.totalNitrogen) * 10) / 10,
    phosphorus: Math.round(scorePhosphorus(data.availablePhosphorus) * 10) / 10,
    potassium: Math.round(scorePotassium(data.availablePotassium) * 10) / 10,
  }

  const weights = {
    ph: 0.25,
    organicMatter: 0.25,
    nitrogen: 0.15,
    phosphorus: 0.15,
    potassium: 0.20,
  }

  const shi = Math.round((
    scores.ph * weights.ph +
    scores.organicMatter * weights.organicMatter +
    scores.nitrogen * weights.nitrogen +
    scores.phosphorus * weights.phosphorus +
    scores.potassium * weights.potassium
  ) * 10) / 10

  const grade = getGrade(shi)
  const degradationTypes = identifyDegradation(data, scores)

  return { shi, grade, scores, degradationTypes }
}
