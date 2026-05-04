export class WebSocketService {
  constructor(url) {
    this.url = url
    this.ws = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 3000
    
    this.onConnectCallbacks = []
    this.onDisconnectCallbacks = []
    this.onMessageCallbacks = []
    this.onErrorCallbacks = []
  }
  
  connect() {
    try {
      this.ws = new WebSocket(this.url)
      
      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.reconnectAttempts = 0
        this.onConnectCallbacks.forEach(cb => cb())
      }
      
      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event)
        this.onDisconnectCallbacks.forEach(cb => cb())
        this.attemptReconnect()
      }
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.onMessageCallbacks.forEach(cb => cb(data))
        } catch (err) {
          console.error('Error parsing WebSocket message:', err)
        }
      }
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.onErrorCallbacks.forEach(cb => cb(error))
      }
    } catch (error) {
      console.error('Error creating WebSocket:', error)
      this.attemptReconnect()
    }
  }
  
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      setTimeout(() => this.connect(), this.reconnectDelay)
    } else {
      console.error('Max reconnect attempts reached')
    }
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
  
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }
  
  onConnect(callback) {
    this.onConnectCallbacks.push(callback)
  }
  
  onDisconnect(callback) {
    this.onDisconnectCallbacks.push(callback)
  }
  
  onMessage(callback) {
    this.onMessageCallbacks.push(callback)
  }
  
  onError(callback) {
    this.onErrorCallbacks.push(callback)
  }
}
