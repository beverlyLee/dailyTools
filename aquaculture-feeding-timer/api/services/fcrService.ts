export interface FCRCalculationRequest {
  totalFeedAmount: number
  estimatedYield: number
  initialWeight: number
  stockCount: number
  targetFCR?: number
}

export interface FCRCalculationResponse {
  fcr: number
  totalWeightGain: number
  estimatedYield: number
  targetFCR: number
  isOverTarget: boolean
  warning: string
  feedCostSaving: number
  suggestions: string[]
}

const DEFAULT_TARGET_FCR = 1.8
const FEED_PRICE_PER_KG = 8

export function calculateFCR(data: FCRCalculationRequest): FCRCalculationResponse {
  const { 
    totalFeedAmount, 
    estimatedYield, 
    initialWeight, 
    stockCount,
    targetFCR = DEFAULT_TARGET_FCR 
  } = data
  
  const totalInitialWeight = initialWeight * stockCount
  const totalWeightGain = estimatedYield - totalInitialWeight
  
  const fcr = totalWeightGain > 0 
    ? Math.round((totalFeedAmount / totalWeightGain) * 100) / 100 
    : 0
  
  const isOverTarget = fcr > targetFCR
  
  const suggestions: string[] = []
  let warning = ''
  let feedCostSaving = 0
  
  if (fcr === 0) {
    warning = '数据不完整，无法计算饵料系数'
    suggestions.push('请检查预估产量和初始体重是否正确填写')
  } else if (isOverTarget) {
    const excessFeed = (fcr - targetFCR) * totalWeightGain
    feedCostSaving = Math.round(excessFeed * FEED_PRICE_PER_KG * 100) / 100
    
    warning = `饵料系数超标，当前 FCR: ${fcr}，目标 FCR: ${targetFCR}`
    suggestions.push('优化投喂策略，避免过量投喂')
    suggestions.push('检查水质，确保溶氧充足')
    suggestions.push('调整饲料配方，提高饲料利用率')
    suggestions.push('分多次少量投喂，提高摄食率')
  } else {
    warning = '饵料系数正常，养殖效益良好'
    suggestions.push('继续保持当前投喂策略')
    suggestions.push('定期检测水质和鱼类生长情况')
  }
  
  return {
    fcr,
    totalWeightGain: Math.round(totalWeightGain * 100) / 100,
    estimatedYield,
    targetFCR,
    isOverTarget,
    warning,
    feedCostSaving,
    suggestions,
  }
}
