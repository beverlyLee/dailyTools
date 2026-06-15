<template>
  <div class="device-panel">
    <div class="panel-header">
      <div class="header-title">
        <span class="title-icon">⚙️</span>
        <span class="title-text">设备控制</span>
      </div>
      <div class="header-stats">
        <span class="active-count">{{ activeCount }}</span>
        <span class="stats-label">台运行中</span>
      </div>
    </div>
    
    <div class="device-grid">
      <div
        v-for="device in devices"
        :key="device.key"
        class="device-card"
        :class="{ 'is-active': device.enabled }"
      >
        <div class="device-icon" :class="{ 'animate-active': device.enabled }">
          <span class="icon-emoji">{{ device.icon }}</span>
        </div>
        
        <div class="device-info">
          <span class="device-name">{{ device.name }}</span>
          <span class="device-status" :class="device.status">
            {{ device.enabled ? '运行中' : '已关闭' }}
          </span>
        </div>
        
        <button
          class="device-toggle"
          :class="{ 'is-on': device.enabled }"
          @click="toggleDevice(device.key)"
        >
          <span class="toggle-slider">
            <span class="toggle-dot"></span>
          </span>
        </button>
        
        <svg v-if="device.enabled" class="device-waves" viewBox="0 0 100 30" preserveAspectRatio="none">
          <path
            d="M0 15 Q 25 5, 50 15 T 100 15"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            opacity="0.5"
            class="wave wave-1"
          />
          <path
            d="M0 18 Q 25 8, 50 18 T 100 18"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
            opacity="0.3"
            class="wave wave-2"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useDeviceStore } from '../stores/device';

const deviceStore = useDeviceStore();

const devices = computed(() => deviceStore.devices);
const activeCount = computed(() => deviceStore.activeCount);

function toggleDevice(key) {
  deviceStore.toggleDevice(key);
}
</script>

<style scoped>
.device-panel {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid var(--color-border);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 20px;
}

.title-text {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.header-stats {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.active-count {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  color: var(--color-accent);
}

.stats-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.device-card {
  position: relative;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  padding: 16px;
  border: 1px solid var(--color-border);
  transition: all var(--transition-normal);
  overflow: hidden;
}

.device-card.is-active {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.3);
}

.device-icon {
  font-size: 28px;
  margin-bottom: 12px;
  display: inline-block;
  transition: transform var(--transition-normal);
}

.icon-emoji {
  display: inline-block;
}

.animate-active .icon-emoji {
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.device-info {
  margin-bottom: 12px;
}

.device-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.device-status {
  font-size: 12px;
  color: var(--color-text-muted);
}

.device-status.running {
  color: var(--color-accent);
}

.device-toggle {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: var(--color-border);
  position: relative;
  transition: all var(--transition-fast);
}

.device-toggle.is-on {
  background: var(--color-accent);
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 40px;
  height: 20px;
  transition: all var(--transition-fast);
}

.toggle-dot {
  position: absolute;
  left: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  transition: all var(--transition-fast);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.device-toggle.is-on .toggle-dot {
  left: 20px;
}

.device-waves {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 20px;
  color: var(--color-accent);
  opacity: 0.6;
}

.wave {
  animation: wave-move 3s linear infinite;
}

.wave-2 {
  animation-delay: -1.5s;
}

@keyframes wave-move {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
</style>
