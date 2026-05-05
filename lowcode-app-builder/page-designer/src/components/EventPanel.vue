<template>
  <div class="event-panel">
    <div class="panel-header">
      <span class="title">事件绑定</span>
      <button @click="showAddModal = true" class="add-btn">
        ➕ 添加事件
      </button>
    </div>

    <div v-if="events.length === 0" class="empty-state">
      <p>暂无绑定的事件</p>
      <p class="hint">点击上方按钮添加事件</p>
    </div>

    <div v-else class="events-list">
      <div 
        v-for="event in events" 
        :key="event.id"
        class="event-item"
      >
        <div class="event-header">
          <div class="event-info">
            <span class="event-type-badge">{{ getEventTypeLabel(event.eventType) }}</span>
            <span class="arrow">→</span>
            <span class="action-type-badge">{{ getActionTypeLabel(event.action) }}</span>
          </div>
          <button @click="handleRemove(event.id)" class="remove-btn" title="移除事件">
            ✕
          </button>
        </div>
        
        <div class="event-details" v-if="event.target || event.handler">
          <div v-if="event.target" class="detail-row">
            <span class="detail-label">目标:</span>
            <span class="detail-value">{{ event.target }}</span>
          </div>
          <div v-if="event.handler" class="detail-row">
            <span class="detail-label">处理函数:</span>
            <span class="detail-value">{{ event.handler }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAddModal" class="modal-overlay" @click.self="closeAddModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>添加事件绑定</h3>
          <button @click="closeAddModal" class="close-btn">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">事件类型</label>
            <select v-model="newEvent.eventType" class="form-select">
              <option v-for="type in eventTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">执行动作</label>
            <select v-model="newEvent.action" class="form-select">
              <option v-for="action in actionTypes" :key="action.value" :value="action.value">
                {{ action.label }}
              </option>
            </select>
          </div>
          
          <div class="form-group" v-if="showTargetField">
            <label class="form-label">目标组件</label>
            <input 
              v-model="newEvent.target"
              type="text"
              class="form-input"
              placeholder="输入目标组件ID或名称"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">处理函数名</label>
            <input 
              v-model="newEvent.handler"
              type="text"
              class="form-input"
              placeholder="例如: handleSubmit, toggleModal"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">额外配置 (JSON)</label>
            <textarea 
              v-model="newEventConfig"
              class="form-textarea"
              rows="3"
              placeholder='{"url": "/api/submit", "method": "POST"}'
            ></textarea>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeAddModal" class="cancel-btn">取消</button>
          <button @click="handleAdd" class="confirm-btn">添加事件</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Component, EventBinding, EventType, ActionType } from '../types'
import { v4 as uuidv4 } from 'uuid'

const props = defineProps<{
  component: Component
}>()

const emit = defineEmits<{
  (e: 'add-event', event: EventBinding): void
  (e: 'remove-event', eventId: string): void
}>()

const showAddModal = ref(false)
const events = ref<EventBinding[]>([])
const newEvent = ref<{
  eventType: EventType
  action: ActionType
  target: string
  handler: string
}>({
  eventType: 'click',
  action: 'custom',
  target: '',
  handler: ''
})
const newEventConfig = ref('')

const eventTypes = [
  { value: 'click' as EventType, label: '点击 (click)' },
  { value: 'change' as EventType, label: '值变化 (change)' },
  { value: 'input' as EventType, label: '输入 (input)' },
  { value: 'focus' as EventType, label: '获得焦点 (focus)' },
  { value: 'blur' as EventType, label: '失去焦点 (blur)' },
  { value: 'submit' as EventType, label: '提交 (submit)' },
  { value: 'load' as EventType, label: '加载完成 (load)' },
  { value: 'scroll' as EventType, label: '滚动 (scroll)' }
]

const actionTypes = [
  { value: 'navigate' as ActionType, label: '页面跳转' },
  { value: 'showModal' as ActionType, label: '显示弹窗' },
  { value: 'hideModal' as ActionType, label: '隐藏弹窗' },
  { value: 'setData' as ActionType, label: '设置数据' },
  { value: 'getData' as ActionType, label: '获取数据' },
  { value: 'submitForm' as ActionType, label: '提交表单' },
  { value: 'resetForm' as ActionType, label: '重置表单' },
  { value: 'custom' as ActionType, label: '自定义函数' }
]

const showTargetField = computed(() => {
  return ['showModal', 'hideModal', 'setData', 'getData', 'submitForm', 'resetForm'].includes(newEvent.value.action)
})

function getEventTypeLabel(type: EventType): string {
  const found = eventTypes.find(t => t.value === type)
  return found ? found.label : type
}

function getActionTypeLabel(action: ActionType): string {
  const found = actionTypes.find(a => a.value === action)
  return found ? found.label : action
}

function handleAdd() {
  if (!newEvent.value.eventType || !newEvent.value.action) {
    alert('请选择事件类型和执行动作')
    return
  }

  let config: Record<string, any> | undefined
  if (newEventConfig.value.trim()) {
    try {
      config = JSON.parse(newEventConfig.value)
    } catch (e) {
      alert('JSON格式不正确')
      return
    }
  }

  const event: EventBinding = {
    id: uuidv4(),
    componentId: props.component.id,
    eventType: newEvent.value.eventType,
    action: newEvent.value.action,
    target: newEvent.value.target || undefined,
    handler: newEvent.value.handler || undefined,
    config
  }

  events.value.push(event)
  emit('add-event', event)
  closeAddModal()
}

function handleRemove(eventId: string) {
  if (confirm('确定要移除这个事件绑定吗？')) {
    const index = events.value.findIndex(e => e.id === eventId)
    if (index > -1) {
      events.value.splice(index, 1)
    }
    emit('remove-event', eventId)
  }
}

function closeAddModal() {
  showAddModal.value = false
  newEvent.value = {
    eventType: 'click',
    action: 'custom',
    target: '',
    handler: ''
  }
  newEventConfig.value = ''
}
</script>

<style scoped>
.event-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 1rem;
}

.title {
  font-weight: 600;
  color: #4ade80;
}

.add-btn {
  padding: 0.375rem 0.75rem;
  background: rgba(74, 222, 128, 0.2);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 6px;
  color: #4ade80;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.add-btn:hover {
  background: rgba(74, 222, 128, 0.3);
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.5);
}

.hint {
  font-size: 0.8rem;
  margin-top: 0.5rem;
}

.events-list {
  flex: 1;
  overflow-y: auto;
}

.event-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.event-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.event-type-badge,
.action-type-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.event-type-badge {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.action-type-badge {
  background: rgba(168, 85, 247, 0.2);
  color: #a78bfa;
}

.arrow {
  color: rgba(255, 255, 255, 0.5);
}

.remove-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.remove-btn:hover {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.event-details {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.detail-row {
  display: flex;
  gap: 0.5rem;
  font-size: 0.8rem;
  margin-bottom: 0.25rem;
}

.detail-label {
  color: rgba(255, 255, 255, 0.5);
}

.detail-value {
  color: rgba(255, 255, 255, 0.8);
  font-family: 'Monaco', 'Menlo', monospace;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
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
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
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
  font-size: 1rem;
}

.close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.375rem;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.625rem 0.875rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #fff;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: #4ade80;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
  font-family: 'Monaco', 'Menlo', monospace;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.cancel-btn,
.confirm-btn {
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.confirm-btn {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  border: none;
  color: #000;
  font-weight: 600;
}

.confirm-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}
</style>
