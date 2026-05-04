<template>
  <div v-if="queue.length > 0" class="card">
    <h3 class="card-title">
      转换队列
      <span class="queue-count">({{ queue.length }} 个文件)</span>
    </h3>
    <div class="queue-list">
      <div 
        v-for="(item, index) in queue" 
        :key="item.id"
        class="queue-item"
        :class="{ active: index === currentIndex }"
      >
        <div class="queue-number">{{ index + 1 }}</div>
        <div class="queue-item-info">
          <div class="queue-item-name">{{ item.file.name }}</div>
          <div class="queue-item-meta">
            <span class="meta-item">
              {{ formatDuration(item.file.duration) }}
            </span>
            <span class="meta-item">
              {{ item.settings.format.toUpperCase() }}
            </span>
            <span class="meta-item">
              {{ item.settings.width }}x{{ item.settings.height }}
            </span>
          </div>
        </div>
        <div class="queue-item-status" :class="item.status">
          <span v-if="item.status === 'pending'">等待中</span>
          <span v-else-if="item.status === 'converting'">转换中...</span>
          <span v-else-if="item.status === 'completed'">已完成</span>
          <span v-else-if="item.status === 'failed'">失败</span>
        </div>
        <button 
          v-if="item.status !== 'converting'"
          class="queue-remove-btn"
          @click="handleRemove(item.id)"
        >
          ✕
        </button>
      </div>
    </div>
    
    <div v-if="queue.some(item => item.status === 'completed' || item.status === 'failed')" class="queue-actions">
      <button class="action-btn" @click="clearCompleted">
        清除已完成
      </button>
      <button class="action-btn" @click="clearAll">
        清空队列
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { QueueItem } from '../types'

interface Props {
  queue: QueueItem[]
  currentIndex: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'remove', id: number): void
  (e: 'clear-completed'): void
  (e: 'clear-all'): void
}>()

const handleRemove = (id: number) => {
  emit('remove', id)
}

const clearCompleted = () => {
  emit('clear-completed')
}

const clearAll = () => {
  emit('clear-all')
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.queue-count {
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--text-secondary);
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background-color: var(--background-color);
  border-radius: var(--radius);
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
}

.queue-item.active {
  border-color: var(--primary-color);
  background-color: rgba(99, 102, 241, 0.1);
}

.queue-number {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--surface-hover);
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.queue-item.active .queue-number {
  background-color: var(--primary-color);
  color: white;
}

.queue-item-info {
  flex: 1;
  min-width: 0;
}

.queue-item-name {
  font-weight: 500;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-item-meta {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

.meta-item {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.queue-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.action-btn {
  padding: 0.5rem 1rem;
  background-color: var(--surface-hover);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background-color: var(--error-color);
  border-color: var(--error-color);
}
</style>
