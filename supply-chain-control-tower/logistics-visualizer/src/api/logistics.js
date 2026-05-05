import axios from 'axios';

const api = axios.create({
  baseURL: '/api/logistics',
  timeout: 10000,
});

export const getTopology = () => api.get('/topology');

export const getOrders = () => api.get('/orders');

export const getInventory = () => api.get('/inventory');

export const getCarrierDetail = (carrierId) => api.get(`/carriers/${carrierId}`);

export const getAlerts = () => api.get('/alerts');

export const acknowledgeAlert = (alertId) => api.post(`/alerts/${alertId}/ack`);

class WebSocketService {
  constructor() {
    this.ws = null;
    this.messageHandlers = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket连接已建立');
      this.reconnectAttempts = 0;
    };

    this.ws.onclose = () => {
      console.log('WebSocket连接已关闭');
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('消息解析错误:', error);
      }
    };
  }

  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(), 3000);
    } else {
      console.error('达到最大重连次数，停止重连');
    }
  }

  send(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  subscribe(topic) {
    this.send('subscribe', topic);
  }

  on(messageType, handler) {
    if (!this.messageHandlers[messageType]) {
      this.messageHandlers[messageType] = [];
    }
    this.messageHandlers[messageType].push(handler);
  }

  off(messageType, handler) {
    if (this.messageHandlers[messageType]) {
      this.messageHandlers[messageType] = this.messageHandlers[messageType].filter(
        (h) => h !== handler
      );
    }
  }

  handleMessage(message) {
    const { type } = message;
    if (this.messageHandlers[type]) {
      this.messageHandlers[type].forEach((handler) => handler(message));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export const wsService = new WebSocketService();

export default api;
