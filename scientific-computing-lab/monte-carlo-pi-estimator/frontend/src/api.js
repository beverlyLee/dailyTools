const API_BASE = '/api'

export async function estimatePi(params) {
  const response = await fetch(`${API_BASE}/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sample_size: params.sample_size,
      num_workers: params.num_workers
    })
  })
  if (!response.ok) {
    throw new Error('估算失败')
  }
  return await response.json()
}

export async function getSamplePoints(params) {
  const response = await fetch(`${API_BASE}/sample-points?count=${params.count || 1000}`)
  if (!response.ok) {
    throw new Error('获取采样点失败')
  }
  return await response.json()
}

export async function getHistory(params) {
  const limit = params?.limit || 50
  const response = await fetch(`${API_BASE}/history?limit=${limit}`)
  if (!response.ok) {
    throw new Error('获取历史记录失败')
  }
  return await response.json()
}

export async function getHistoryRecord(id) {
  const response = await fetch(`${API_BASE}/history/${id}`)
  if (!response.ok) {
    throw new Error('获取历史记录失败')
  }
  return await response.json()
}

export async function clearHistory() {
  const response = await fetch(`${API_BASE}/history`, {
    method: 'DELETE'
  })
  if (!response.ok) {
    throw new Error('清除历史失败')
  }
  return await response.json()
}
