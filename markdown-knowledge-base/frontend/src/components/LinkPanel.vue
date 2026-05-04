<template>
  <div class="link-panel">
    <!-- Incoming Links -->
    <div class="link-section">
      <div class="section-header">
        <span class="title">反向链接</span>
        <span class="count">{{ incomingLinks.length }}</span>
      </div>
      <div class="link-list">
        <div
          v-if="incomingLinks.length === 0"
          class="empty-message"
        >
          暂无反向链接
        </div>
        <div
          v-for="link in incomingLinks"
          :key="link.id"
          class="link-item"
          @click="navigateTo(link.file_path)"
        >
          <span class="link-icon">📄</span>
          <span class="link-title">{{ link.title }}</span>
        </div>
      </div>
    </div>
    
    <!-- Outgoing Links -->
    <div class="link-section">
      <div class="section-header">
        <span class="title">当前引用</span>
        <span class="count">{{ outgoingLinks.length }}</span>
      </div>
      <div class="link-list">
        <div
          v-if="outgoingLinks.length === 0"
          class="empty-message"
        >
          暂无引用链接
        </div>
        <div
          v-for="link in outgoingLinks"
          :key="link.id"
          class="link-item"
          @click="navigateTo(link.file_path)"
        >
          <span class="link-icon">📄</span>
          <span class="link-title">{{ link.title }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LinkInfo } from '@/types'
import { useNotesStore } from '@/stores/notes'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

const props = defineProps<{
  currentPath?: string
}>()

const emit = defineEmits<{
  (e: 'navigate', path: string): void
}>()

const notesStore = useNotesStore()
const { noteLinks } = storeToRefs(notesStore)
const { openNote } = notesStore

const incomingLinks = computed(() => {
  return noteLinks.value?.incoming_links || []
})

const outgoingLinks = computed(() => {
  return noteLinks.value?.outgoing_links || []
})

function navigateTo(path: string) {
  openNote(path)
  emit('navigate', path)
}
</script>

<style scoped>
.link-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #1e1e1e;
  color: #d4d4d4;
  font-size: 13px;
}

.link-section {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #2d2d2d;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #858585;
  margin-bottom: 4px;
}

.count {
  background-color: #2d2d2d;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 10px;
}

.link-list {
  display: flex;
  flex-direction: column;
  padding: 4px 0;
}

.empty-message {
  padding: 12px 16px;
  color: #858585;
  font-style: italic;
}

.link-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 2px;
  transition: background-color 0.1s;
}

.link-item:hover {
  background-color: #2a2d2e;
}

.link-icon {
  margin-right: 8px;
  font-size: 14px;
}

.link-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 滚动条样式 */
.link-panel::-webkit-scrollbar {
  width: 10px;
}

.link-panel::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.link-panel::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
}

.link-panel::-webkit-scrollbar-thumb:hover {
  background: #4f4f4f;
}
</style>
