<template>
  <div class="schema-list">
    <div class="list-header">
      <h2>数据模型列表</h2>
      <span class="count">共 {{ schemas.length }} 个模型</span>
    </div>

    <div v-if="schemas.length === 0" class="empty-state">
      <div class="empty-icon">🗄️</div>
      <p>暂无数据模型</p>
      <p class="hint">点击上方"新建模型"按钮创建第一个数据模型</p>
    </div>

    <div v-else class="schema-cards">
      <div 
        v-for="schema in schemas" 
        :key="schema.id"
        class="schema-card"
        @click="$emit('select', schema)"
      >
        <div class="card-header">
          <span class="schema-name">{{ schema.name }}</span>
          <button 
            @click.stop="handleDelete(schema.id)"
            class="delete-btn"
            title="删除模型"
          >
            🗑️
          </button>
        </div>
        
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">表名:</span>
            <span class="info-value code">{{ schema.tableName }}</span>
          </div>
          
          <div class="info-row" v-if="schema.description">
            <span class="info-label">描述:</span>
            <span class="info-value">{{ schema.description }}</span>
          </div>
          
          <div class="stats">
            <div class="stat-item">
              <span class="stat-icon">📊</span>
              <span class="stat-value">{{ schema.fields.length }}</span>
              <span class="stat-label">字段</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">🔗</span>
              <span class="stat-value">{{ schema.relations.length }}</span>
              <span class="stat-label">关联</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">📈</span>
              <span class="stat-value">{{ schema.indexes.length }}</span>
              <span class="stat-label">索引</span>
            </div>
          </div>
        </div>
        
        <div class="card-footer">
          <span class="updated-time">
            更新于: {{ formatDate(schema.updatedAt) }}
          </span>
          <span class="edit-hint">点击编辑</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Schema } from '../types'

defineProps<{
  schemas: Schema[]
}>()

defineEmits<{
  (e: 'select', schema: Schema): void
  (e: 'delete', id: string): void
}>()

function handleDelete(id: string) {
  if (confirm('确定要删除这个数据模型吗？')) {
    // $emit('delete', id)
  }
}

function formatDate(dateString: string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.schema-list {
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem 2rem;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.list-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.count {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.5);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.schema-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.schema-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.schema-card:hover {
  background: rgba(74, 222, 128, 0.05);
  border-color: rgba(74, 222, 128, 0.3);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.schema-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #4ade80;
}

.delete-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  opacity: 0.5;
  transition: all 0.2s;
}

.delete-btn:hover {
  background: rgba(248, 113, 113, 0.2);
  opacity: 1;
}

.card-body {
  margin-bottom: 1rem;
}

.info-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.info-label {
  color: rgba(255, 255, 255, 0.5);
}

.info-value {
  color: rgba(255, 255, 255, 0.8);
}

.info-value.code {
  font-family: 'Monaco', 'Menlo', monospace;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}

.stats {
  display: flex;
  gap: 1.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.stat-icon {
  font-size: 0.875rem;
}

.stat-value {
  font-weight: 600;
  color: #4ade80;
}

.stat-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.updated-time {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
}

.edit-hint {
  font-size: 0.75rem;
  color: rgba(74, 222, 128, 0.6);
}
</style>
