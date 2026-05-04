<template>
  <div class="card">
    <h3 class="card-title">
      转换历史
      <button 
        v-if="history.length > 0"
        class="clear-history-btn"
        @click="handleClear"
      >
        清空
      </button>
    </h3>
    
    <div v-if="history.length === 0" class="empty-history">
      <div class="empty-icon">📝</div>
      <p>暂无转换历史</p>
    </div>
    
    <div v-else class="history-list">
      <div 
        v-for="item in history" 
        :key="item.id"
        class="history-item"
        @click="handleLoad(item)"
      >
        <div class="history-info">
          <div class="history-name">
            {{ getFileName(item.originalPath) }}
          </div>
          <div class="history-time">
            {{ formatDate(item.createdAt) }}
          </div>
        </div>
        <div class="history-right">
          <span class="history-format">
            {{ item.settings.format.toUpperCase() }}
          </span>
          <span class="history-resolution">
            {{ item.settings.width }}x{{ item.settings.height }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { invoke } from '@tauri-apps/api/tauri'
import type { ConversionHistoryItem } from '../types'

interface Props {
  history: ConversionHistoryItem[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'load-history', item: ConversionHistoryItem): void
  (e: 'clear'): void
}>()

const handleLoad = (item: ConversionHistoryItem) => {
  emit('load-history', item)
}

const handleClear = async () => {
  try {
    await invoke('clear_history')
    emit('')
  } catch (error) {
    console.error('清空历史失败:', error)
  }
}

const getFileName = (path: string): string => {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}

const formatDate = (isoString: string): string => {
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) {
      return '刚刚'
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} 分钟前`
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)} 小时前`
    } else if (diff < 604800000) {
      return `${Math.floor(diff / 86400000)} 天前`
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  } catch {
    return isoString
  }
}
</script>

<style scoped>
.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.clear-history-btn {
  padding: 0.375rem 0.75rem;
  background: none;
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-history-btn:hover {
  background-color: var(--error-color);
  border-color: var(--error-color);
  color: white;
}

.empty-history {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: var(--background-color);
  border-radius: var(--radius);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.history-item:hover {
  border-color: var(--primary-color);
  background-color: rgba(99, 102, 241, 0.05);
}

.history-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.history-name {
  font-weight: 500;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.history-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.history-format {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background-color: var(--primary-color);
  border-radius: 4px;
  color: white;
  font-weight: 500;
}

.history-resolution {
  font-size: 0.75rem;
  color: var(--text-secondary);
}
</style>
