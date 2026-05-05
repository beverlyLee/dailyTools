const API_BASE = '/api'

export async function generateSignal(params) {
  const response = await fetch(`${API_BASE}/generate-signal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
  if (!response.ok) {
    throw new Error('生成信号失败')
  }
  return await response.json()
}

export async function performFFT(params) {
  const response = await fetch(`${API_BASE}/fft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
  if (!response.ok) {
    throw new Error('FFT计算失败')
  }
  return await response.json()
}

export async function performSTFT(params) {
  const response = await fetch(`${API_BASE}/stft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
  if (!response.ok) {
    throw new Error('STFT计算失败')
  }
  return await response.json()
}

export async function applyFilter(params) {
  const response = await fetch(`${API_BASE}/filter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
  if (!response.ok) {
    throw new Error('滤波失败')
  }
  return await response.json()
}

export async function saveExperiment(params) {
  const response = await fetch(`${API_BASE}/experiments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
  if (!response.ok) {
    throw new Error('保存实验失败')
  }
  return await response.json()
}

export async function getHistory() {
  const response = await fetch(`${API_BASE}/experiments`)
  if (!response.ok) {
    throw new Error('获取历史记录失败')
  }
  return await response.json()
}

export async function getExperiment(id) {
  const response = await fetch(`${API_BASE}/experiments/${id}`)
  if (!response.ok) {
    throw new Error('获取实验失败')
  }
  return await response.json()
}

export async function deleteExperiment(id) {
  const response = await fetch(`${API_BASE}/experiments/${id}`, {
    method: 'DELETE'
  })
  if (!response.ok) {
    throw new Error('删除实验失败')
  }
  return await response.json()
}
