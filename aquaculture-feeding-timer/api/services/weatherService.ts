export interface WeatherData {
  temperature: number
  humidity: number
  pressure: number
  windSpeed: number
  weatherCondition: string
  thunderstormWarning: boolean
  dissolvedOxygen: number
  updateTime: string
}

const weatherConditions = ['晴', '多云', '阴', '小雨', '中雨', '雷阵雨']

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getRandomFloat(min: number, max: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals)
  return Math.floor((Math.random() * (max - min) + min) * factor) / factor
}

export function generateWeatherData(): WeatherData {
  const now = new Date()
  const hour = now.getHours()
  
  const isNight = hour < 6 || hour > 20
  const baseTemp = isNight ? 20 : 28
  
  const temperature = getRandomFloat(baseTemp - 3, baseTemp + 3)
  const humidity = getRandomInt(60, 95)
  const pressure = getRandomFloat(990, 1020, 0)
  const windSpeed = getRandomFloat(0.5, 8.0)
  
  const conditionIndex = getRandomInt(0, weatherConditions.length - 1)
  const weatherCondition = weatherConditions[conditionIndex]
  
  const thunderstormWarning = weatherCondition === '雷阵雨' || (pressure < 1000 && humidity > 85)
  
  const baseDO = 8.5
  const tempEffect = (temperature - 25) * 0.2
  const pressureEffect = (1013 - pressure) * 0.02
  const stormEffect = thunderstormWarning ? 2.5 : 0
  const nightEffect = isNight ? 1.5 : 0
  
  const dissolvedOxygen = Math.max(3, Math.round((baseDO - tempEffect - pressureEffect - stormEffect - nightEffect) * 10) / 10)
  
  return {
    temperature,
    humidity,
    pressure,
    windSpeed,
    weatherCondition,
    thunderstormWarning,
    dissolvedOxygen,
    updateTime: now.toISOString(),
  }
}

export function shouldDelayFeeding(weather: WeatherData): {
  shouldDelay: boolean
  reason: string
  suggestion: string
} {
  const reasons: string[] = []
  const suggestions: string[] = []
  
  if (weather.pressure < 1000) {
    reasons.push(`气压过低 (${weather.pressure}hPa)`)
    suggestions.push('开启增氧机')
  }
  
  if (weather.thunderstormWarning) {
    reasons.push('雷雨预警')
    suggestions.push('开启增氧机，避免雷雨前投喂')
  }
  
  if (weather.dissolvedOxygen < 5) {
    reasons.push(`溶氧不足 (${weather.dissolvedOxygen}mg/L)`)
    suggestions.push('开启增氧机，待溶氧回升后再投喂')
  }
  
  if (reasons.length > 0) {
    return {
      shouldDelay: true,
      reason: reasons.join('、'),
      suggestion: suggestions.join('；'),
    }
  }
  
  return {
    shouldDelay: false,
    reason: '',
    suggestion: '天气条件良好，适合投喂',
  }
}
