<template>
  <header class="app-header">
    <div class="header-left">
      <div class="logo">
        <span class="logo-icon">🌱</span>
        <span class="logo-text">智慧大棚监控中心</span>
      </div>
      <div class="header-status">
        <span class="status-dot" :class="{ connected: wsConnected }"></span>
        <span class="status-text">{{ wsConnected ? '实时连接' : '连接中...' }}</span>
      </div>
    </div>
    
    <div class="header-right">
      <div class="current-time">
        <span class="time-icon">🕐</span>
        <span class="time-text">{{ currentTime }}</span>
      </div>
      
      <button class="header-btn sound-btn" :class="{ enabled: soundEnabled }" @click="toggleSound">
        {{ soundEnabled ? '🔊' : '🔇' }}
      </button>
      
      <button class="header-btn theme-btn" @click="toggleTheme">
        {{ theme === 'dark' ? '🌙' : '☀️' }}
      </button>
      
      <div class="test-panel">
        <button class="test-btn" @click="triggerHighTemp">
          🧪 测试高温告警
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useSettingsStore } from '../stores/settings';
import { useEnvironmentStore } from '../stores/environment';

const settingsStore = useSettingsStore();
const envStore = useEnvironmentStore();

const theme = computed(() => settingsStore.theme);
const soundEnabled = computed(() => settingsStore.soundEnabled);
const wsConnected = computed(() => envStore.wsConnected);

const currentTime = ref('');
let timeInterval = null;

function updateTime() {
  const now = new Date();
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function toggleTheme() {
  settingsStore.toggleTheme();
}

function toggleSound() {
  settingsStore.toggleSound();
}

async function triggerHighTemp() {
  try {
    await fetch('/api/test/temperature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 38 }),
    });
  } catch (e) {
    console.error('触发测试失败:', e);
  }
}

onMounted(() => {
  updateTime();
  timeInterval = setInterval(updateTime, 1000);
});

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval);
  }
});
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: 0.5px;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-muted);
}

.status-dot.connected {
  background: var(--color-accent);
  box-shadow: 0 0 8px var(--color-accent);
  animation: pulse-green 2s ease-in-out infinite;
}

@keyframes pulse-green {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.current-time {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.time-icon {
  font-size: 16px;
}

.time-text {
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--color-text-primary);
  font-weight: 500;
}

.header-btn {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.header-btn:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border-light);
}

.test-panel {
  margin-left: 8px;
  padding-left: 12px;
  border-left: 1px solid var(--color-border);
}

.test-btn {
  padding: 8px 14px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  color: var(--color-danger);
  font-size: 12px;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.test-btn:hover {
  background: var(--color-danger);
  color: white;
}
</style>
