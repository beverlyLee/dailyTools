export async function fetchCurrentWeather() {
  try {
    const response = await fetch('/api/weather/current')
    const data = await response.json()
    if (data.success) {
      return data.data
    }
    throw new Error(data.error || '获取天气数据失败')
  } catch (error) {
    console.error('Fetch weather error:', error)
    return null
  }
}

export async function fetchFeedingAdvice() {
  try {
    const response = await fetch('/api/weather/advice')
    const data = await response.json()
    if (data.success) {
      return data.data
    }
    throw new Error(data.error || '获取投喂建议失败')
  } catch (error) {
    console.error('Fetch feeding advice error:', error)
    return null
  }
}

export async function calculateFCR(formData) {
  try {
    const response = await fetch('/api/fcr/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    })
    const data = await response.json()
    if (data.success) {
      return data.data
    }
    throw new Error(data.error || '计算失败')
  } catch (error) {
    console.error('Calculate FCR error:', error)
    return null
  }
}
