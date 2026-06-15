<template>
  <div class="app-container" :class="{ 'has-alarm': hasActiveAlarm }">
    <AppHeader />
    
    <main class="main-content">
      <section class="gauges-section">
        <div class="section-title">
          <span class="title-icon">📊</span>
          <span>实时环境监测</span>
        </div>
        <div class="gauges-grid">
          <TemperatureGauge />
          <HumidityGauge />
          <LightGauge />
          <Co2Gauge />
        </div>
      </section>
      
      <div class="content-row">
        <section class="chart-section">
          <HistoryChart />
        </section>
        
        <section class="alarm-section">
          <AlarmPanel />
        </section>
      </div>
      
      <section class="device-section">
        <DevicePanel />
      </section>
    </main>
    
    <div v-if="showAlarmOverlay" class="alarm-overlay" @click="dismissAlarm">
      <div class="alarm-popup" @click.stop>
        <div class="alarm-popup-icon">⚠️</div>
        <h3 class="alarm-popup-title">温度告警</h3>
        <p class="alarm-popup-message">{{ latestAlarmMessage }}</p>
        <button class="alarm-popup-btn" @click="dismissAlarm">
          我知道了
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import AppHeader from './components/AppHeader.vue';
import TemperatureGauge from './components/TemperatureGauge.vue';
import HumidityGauge from './components/HumidityGauge.vue';
import LightGauge from './components/LightGauge.vue';
import Co2Gauge from './components/Co2Gauge.vue';
import HistoryChart from './components/HistoryChart.vue';
import AlarmPanel from './components/AlarmPanel.vue';
import DevicePanel from './components/DevicePanel.vue';

import { useEnvironmentStore } from './stores/environment';
import { useSettingsStore } from './stores/settings';
import { useDeviceStore } from './stores/device';
import { useAlarmStore } from './stores/alarm';

const envStore = useEnvironmentStore();
const settingsStore = useSettingsStore();
const deviceStore = useDeviceStore();
const alarmStore = useAlarmStore();

const showAlarmOverlay = ref(false);
const latestAlarmMessage = ref('');
let lastAlarmTime = 0;

const hasActiveAlarm = computed(() => {
  return envStore.temperatureStatus === 'danger' || envStore.co2Status === 'danger';
});

function playAlarmSound() {
  settingsStore.playAlertSound();
}

function showAlarm(message) {
  const now = Date.now();
  if (now - lastAlarmTime < 10000) return;
  lastAlarmTime = now;
  
  latestAlarmMessage.value = message;
  showAlarmOverlay.value = true;
  playAlarmSound();
}

function dismissAlarm() {
  showAlarmOverlay.value = false;
}

watch(
  () => envStore.state.temperature,
  (temp) => {
    if (temp >= 35) {
      showAlarm(`当前温度 ${temp.toFixed(1)}℃，已超过安全阈值！`);
    }
  }
);

watch(
  () => envStore.temperatureStatus,
  (status) => {
    if (status === 'danger') {
      showAlarm(`温度异常！当前温度 ${envStore.state.temperature.toFixed(1)}℃`);
    }
  }
);

onMounted(() => {
  settingsStore.initSettings();
  envStore.connectWebSocket();
  deviceStore.fetchDevices();
  alarmStore.fetchAlarms();
  
  setTimeout(() => {
    envStore.fetchHistory();
  }, 500);
});
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background: var(--color-bg-primary);
  transition: background var(--transition-normal);
}

.app-container.has-alarm {
  animation: alarm-bg-pulse 2s ease-in-out infinite;
}

@keyframes alarm-bg-pulse {
  0%, 100% {
    background: var(--color-bg-primary);
  }
  50% {
    background: color-mix(in srgb, var(--color-bg-primary) 90%, var(--color-danger));
  }
}

.main-content {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 16px;
}

.title-icon {
  font-size: 24px;
}

.gauges-section {
  margin-bottom: 24px;
}

.gauges-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

@media (max-width: 1200px) {
  .gauges-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .gauges-grid {
    grid-template-columns: 1fr;
  }
}

.content-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

@media (max-width: 1000px) {
  .content-row {
    grid-template-columns: 1fr;
  }
}

.chart-section {
  min-width: 0;
}

.alarm-section {
  min-height: 400px;
}

.device-section {
  margin-bottom: 24px;
}

.alarm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.alarm-popup {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: 32px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  border: 2px solid var(--color-danger);
  box-shadow: 0 0 40px rgba(239, 68, 68, 0.4);
  animation: slideUp 0.4s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.alarm-popup-icon {
  font-size: 64px;
  margin-bottom: 16px;
  animation: shake 0.5s ease infinite;
}

@keyframes shake {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(-10deg); }
  75% { transform: rotate(10deg); }
}

.alarm-popup-title {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  color: var(--color-danger);
  margin-bottom: 12px;
}

.alarm-popup-message {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 24px;
  line-height: 1.6;
}

.alarm-popup-btn {
  width: 100%;
  padding: 12px 24px;
  background: var(--color-danger);
  color: white;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  transition: all var(--transition-fast);
}

.alarm-popup-btn:hover {
  background: #dc2626;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}
</style>
