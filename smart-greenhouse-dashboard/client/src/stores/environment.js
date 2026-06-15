import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useEnvironmentStore = defineStore('environment', () => {
  const state = ref({
    temperature: 22,
    humidity: 65,
    light: 5000,
    co2: 700,
    timestamp: Date.now(),
  });
  
  const history = ref([]);
  const wsConnected = ref(false);
  let ws = null;
  
  const thresholds = {
    temperature: { warningHigh: 32, warningLow: 15, idealMin: 20, idealMax: 28 },
    humidity: { warningHigh: 85, warningLow: 40, idealMin: 50, idealMax: 75 },
    light: { warningHigh: 9000, warningLow: 1000, idealMin: 3000, idealMax: 8000 },
    co2: { warningHigh: 1500, warningLow: 400, idealMin: 600, idealMax: 1000 },
  };
  
  const temperatureStatus = computed(() => {
    const t = state.value.temperature;
    if (t > thresholds.temperature.warningHigh) return 'danger';
    if (t < thresholds.temperature.warningLow) return 'warning';
    if (t >= thresholds.temperature.idealMin && t <= thresholds.temperature.idealMax) return 'good';
    return 'normal';
  });
  
  const humidityStatus = computed(() => {
    const h = state.value.humidity;
    if (h > thresholds.humidity.warningHigh) return 'warning';
    if (h < thresholds.humidity.warningLow) return 'warning';
    if (h >= thresholds.humidity.idealMin && h <= thresholds.humidity.idealMax) return 'good';
    return 'normal';
  });
  
  const lightStatus = computed(() => {
    const l = state.value.light;
    if (l > thresholds.light.warningHigh) return 'warning';
    if (l < thresholds.light.warningLow) return 'warning';
    if (l >= thresholds.light.idealMin && l <= thresholds.light.idealMax) return 'good';
    return 'normal';
  });
  
  const co2Status = computed(() => {
    const c = state.value.co2;
    if (c > thresholds.co2.warningHigh) return 'danger';
    if (c < thresholds.co2.warningLow) return 'warning';
    if (c >= thresholds.co2.idealMin && c <= thresholds.co2.idealMax) return 'good';
    return 'normal';
  });
  
  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:3002`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      wsConnected.value = true;
      console.log('WebSocket 连接成功');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'init' || data.type === 'state_update') {
        if (data.state) {
          state.value = data.state;
        }
      }
      
      if (data.type === 'history') {
        history.value = data.history;
      }
    };
    
    ws.onclose = () => {
      wsConnected.value = false;
      console.log('WebSocket 连接断开，3秒后重连...');
      setTimeout(connectWebSocket, 3000);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket 错误:', error);
    };
  }
  
  function sendMessage(message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  
  function setTemperature(value) {
    sendMessage({ type: 'set_temperature', value });
  }
  
  function requestHistory() {
    sendMessage({ type: 'get_history' });
  }
  
  async function fetchHistory() {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      history.value = data.history;
    } catch (e) {
      console.error('获取历史数据失败:', e);
    }
  }
  
  return {
    state,
    history,
    wsConnected,
    thresholds,
    temperatureStatus,
    humidityStatus,
    lightStatus,
    co2Status,
    connectWebSocket,
    sendMessage,
    setTemperature,
    requestHistory,
    fetchHistory,
  };
});
