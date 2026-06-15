<template>
  <div class="alarm-panel">
    <div class="panel-header">
      <div class="header-left">
        <span class="header-icon">🔔</span>
        <span class="header-title">告警日志</span>
        <span class="alarm-badge" v-if="todayCount > 0">
          {{ todayCount }}
        </span>
      </div>
      <div class="header-actions">
        <input
          type="date"
          v-model="filterDate"
          class="date-input"
          @change="handleDateChange"
        />
        <select v-model="filterLevel" class="level-select" @change="handleLevelChange">
          <option value="">全部级别</option>
          <option value="warning">警告</option>
          <option value="info">提示</option>
        </select>
        <button class="export-btn" @click="handleExport">
          <span>📥</span>
          导出
        </button>
      </div>
    </div>
    
    <div class="alarm-stats">
      <div class="stat-item warning">
        <span class="stat-icon">⚠️</span>
        <span class="stat-count">{{ warningCount }}</span>
        <span class="stat-label">警告</span>
      </div>
      <div class="stat-item info">
        <span class="stat-icon">ℹ️</span>
        <span class="stat-count">{{ infoCount }}</span>
        <span class="stat-label">提示</span>
      </div>
      <div class="stat-item today">
        <span class="stat-icon">📅</span>
        <span class="stat-count">{{ todayCount }}</span>
        <span class="stat-label">今日</span>
      </div>
    </div>
    
    <div class="alarm-list">
      <div v-if="filteredAlarms.length === 0" class="empty-state">
        <span class="empty-icon">✅</span>
        <span class="empty-text">暂无告警记录</span>
      </div>
      
      <TransitionGroup name="alarm" tag="div" class="alarm-items">
        <div
          v-for="alarm in filteredAlarms"
          :key="alarm.id"
          class="alarm-item"
          :class="alarm.level"
        >
          <div class="alarm-indicator"></div>
          <div class="alarm-icon">
            {{ getAlarmIcon(alarm.type) }}
          </div>
          <div class="alarm-content">
            <div class="alarm-message">{{ alarm.message }}</div>
            <div class="alarm-meta">
              <span class="alarm-time">{{ alarm.time }}</span>
              <span class="alarm-date">{{ alarm.date }}</span>
            </div>
          </div>
          <div class="alarm-badge" :class="alarm.level">
            {{ alarm.level === 'warning' ? '警告' : '提示' }}
          </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAlarmStore } from '../stores/alarm';

const alarmStore = useAlarmStore();

const filterDate = ref('');
const filterLevel = ref('');

const filteredAlarms = computed(() => alarmStore.filteredAlarms);
const warningCount = computed(() => alarmStore.warningCount);
const infoCount = computed(() => alarmStore.infoCount);
const todayCount = computed(() => alarmStore.todayCount);

function handleDateChange() {
  alarmStore.setFilterDate(filterDate.value);
}

function handleLevelChange() {
  alarmStore.setFilterLevel(filterLevel.value);
}

function handleExport() {
  alarmStore.exportAlarms(filterDate.value);
}

function getAlarmIcon(type) {
  const iconMap = {
    temperature_high: '🌡️',
    temperature_low: '❄️',
    humidity_high: '💧',
    humidity_low: '🏜️',
    light_high: '☀️',
    light_low: '🌑',
    co2_high: '🌫️',
    co2_low: '💨',
  };
  return iconMap[type] || '🔔';
}

onMounted(() => {
  alarmStore.fetchAlarms();
});
</script>

<style scoped>
.alarm-panel {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid var(--color-border);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 20px;
}

.header-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.alarm-badge {
  background: var(--color-danger);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  min-width: 20px;
  text-align: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.date-input,
.level-select {
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 12px;
  font-family: var(--font-body);
}

.date-input::-webkit-calendar-picker-indicator {
  filter: var(--date-picker-filter, invert(1));
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  color: white;
  font-size: 12px;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.export-btn:hover {
  background: var(--color-accent-hover);
}

.alarm-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.stat-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.stat-count {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.stat-item.warning .stat-count {
  color: var(--color-warning);
}

.stat-item.info .stat-count {
  color: var(--color-info);
}

.stat-item.today .stat-count {
  color: var(--color-accent);
}

.stat-label {
  font-size: 11px;
  color: var(--color-text-muted);
}

.alarm-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--color-text-muted);
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 14px;
}

.alarm-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alarm-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  position: relative;
  overflow: hidden;
  transition: all var(--transition-fast);
}

.alarm-item:hover {
  background: var(--color-bg-hover);
}

.alarm-indicator {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--color-info);
}

.alarm-item.warning .alarm-indicator {
  background: var(--color-warning);
}

.alarm-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.alarm-content {
  flex: 1;
  min-width: 0;
}

.alarm-message {
  font-size: 13px;
  color: var(--color-text-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alarm-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--color-text-muted);
}

.alarm-badge.warning {
  background: rgba(245, 158, 11, 0.15);
  color: var(--color-warning);
}

.alarm-badge.info {
  background: rgba(59, 130, 246, 0.15);
  color: var(--color-info);
}

.alarm-enter-active {
  transition: all 0.3s ease;
}

.alarm-leave-active {
  transition: all 0.2s ease;
}

.alarm-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.alarm-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
