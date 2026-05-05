<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>CRUD 代码生成预览 - {{ schemaName }}</h3>
        <button @click="$emit('close')" class="close-btn">✕</button>
      </div>
      
      <div class="modal-body">
        <div class="code-tabs">
          <button 
            v-for="tab in codeTabs" 
            :key="tab.value"
            @click="activeTab = tab.value"
            :class="['code-tab-btn', { active: activeTab === tab.value }]"
          >
            {{ tab.label }}
          </button>
        </div>
        
        <div class="code-container">
          <div class="code-header">
            <span class="file-name">{{ getFileName }}</span>
            <button @click="copyCurrentCode" class="copy-btn">
              📋 复制
            </button>
          </div>
          <pre class="code-content"><code>{{ currentCode }}</code></pre>
        </div>
        
        <div class="download-section">
          <button @click="downloadAll" class="download-btn">
            ⬇️ 下载所有文件
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CRUDResult } from '../types'

const props = defineProps<{
  result: CRUDResult
  schemaName: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const codeTabs = [
  { value: 'sql' as const, label: 'SQL', fileExt: 'sql' },
  { value: 'goModel' as const, label: 'Go Model', fileExt: 'go' },
  { value: 'apiHandlers' as const, label: 'API Handlers', fileExt: 'go' },
  { value: 'apiRoutes' as const, label: 'API Routes', fileExt: 'go' },
  { value: 'typeScript' as const, label: 'TypeScript', fileExt: 'ts' }
]

const activeTab = ref<'sql' | 'goModel' | 'apiHandlers' | 'apiRoutes' | 'typeScript'>('sql')

const getFileName = computed(() => {
  const tab = codeTabs.find(t => t.value === activeTab.value)
  const baseName = props.schemaName.toLowerCase()
  
  switch (activeTab.value) {
    case 'sql':
      return `${baseName}.sql`
    case 'goModel':
      return `${baseName}.go`
    case 'apiHandlers':
      return `${baseName}_handler.go`
    case 'apiRoutes':
      return `${baseName}_routes.go`
    case 'typeScript':
      return `${baseName}.ts`
    default:
      return 'code.txt'
  }
})

const currentCode = computed(() => {
  const codeMap: Record<string, string> = {
    sql: props.result.sql,
    goModel: props.result.goModel,
    apiHandlers: props.result.apiHandlers,
    apiRoutes: props.result.apiRoutes,
    typeScript: props.result.typeScript
  }
  return codeMap[activeTab.value] || ''
})

function copyCurrentCode() {
  navigator.clipboard.writeText(currentCode.value)
    .then(() => {
      alert('代码已复制到剪贴板！')
    })
    .catch(() => {
      alert('复制失败')
    })
}

function downloadAll() {
  const files = [
    { name: `${props.schemaName.toLowerCase()}.sql`, content: props.result.sql },
    { name: `${props.schemaName.toLowerCase()}_model.go`, content: props.result.goModel },
    { name: `${props.schemaName.toLowerCase()}_handler.go`, content: props.result.apiHandlers },
    { name: `${props.schemaName.toLowerCase()}_routes.go`, content: props.result.apiRoutes },
    { name: `${props.schemaName.toLowerCase()}.ts`, content: props.result.typeScript }
  ]
  
  files.forEach(file => {
    const blob = new Blob([file.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  width: 100%;
  max-width: 1000px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #4ade80;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
}

.code-tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5rem;
  flex-wrap: wrap;
}

.code-tab-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  border-radius: 6px 6px 0 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.code-tab-btn:hover {
  color: rgba(255, 255, 255, 0.7);
}

.code-tab-btn.active {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
  font-weight: 600;
}

.code-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #0a0a14;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.file-name {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
}

.copy-btn {
  padding: 0.375rem 0.75rem;
  background: rgba(74, 222, 128, 0.2);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 4px;
  color: #4ade80;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: rgba(74, 222, 128, 0.3);
}

.code-content {
  flex: 1;
  overflow: auto;
  margin: 0;
  padding: 1rem;
}

.code-content code {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  color: #e5e7eb;
  white-space: pre;
}

.download-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.download-btn {
  width: 100%;
  padding: 0.875rem 1.5rem;
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  border: none;
  border-radius: 8px;
  color: #000;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.download-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}
</style>
