import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export const rsaApi = {
  checkPrime: (number) => api.post('/rsa/check-prime', { number }),
  generatePrime: (bitLength = 512) => api.get('/rsa/generate-prime', { params: { bit_length: bitLength } }),
  generateKeyPair: (data) => api.post('/rsa/generate-key-pair', data),
  getKeyPairs: (skip = 0, limit = 100) => api.get('/rsa/key-pairs', { params: { skip, limit } }),
  getKeyPair: (id) => api.get(`/rsa/key-pairs/${id}`),
  deleteKeyPair: (id) => api.delete(`/rsa/key-pairs/${id}`)
}

export const calculatorApi = {
  calculateGCD: (a, b) => api.post('/calculator/gcd', { a, b }),
  calculateModInverse: (e, phi) => api.post('/calculator/mod-inverse', { e, phi }),
  calculateModExp: (base, exponent, modulus) => api.post('/calculator/mod-exp', { base, exponent, modulus })
}

export const cryptoApi = {
  encrypt: (data) => api.post('/crypto/encrypt', data),
  decrypt: (data) => api.post('/crypto/decrypt', data),
  encryptWithKeyPair: (data) => api.post('/crypto/encrypt-with-key-pair', data),
  decryptWithKeyPair: (data) => api.post('/crypto/decrypt-with-key-pair', data),
  testEncryption: (message, bitLength) => api.post('/crypto/test-encryption-decryption', null, { params: { message, bit_length: bitLength } })
}

export const historyApi = {
  getKeyPairHistory: (skip = 0, limit = 100) => api.get('/history/key-pairs', { params: { skip, limit } }),
  getCryptoHistory: (params = {}) => api.get('/history/crypto-operations', { params }),
  getCryptoRecord: (id) => api.get(`/history/crypto-operations/${id}`),
  deleteCryptoRecord: (id) => api.delete(`/history/crypto-operations/${id}`),
  clearAllHistory: () => api.delete('/history/crypto-operations'),
  getStats: () => api.get('/history/stats')
}

export default api
