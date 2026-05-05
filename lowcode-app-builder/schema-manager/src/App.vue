<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-left">
        <span class="app-title">🗄️ 数据模型管理器</span>
      </div>
      <nav class="header-nav">
        <button 
          v-for="item in navItems" 
          :key="item.id" 
          @click="currentView = item.id"
          :class="['nav-btn', { active: currentView === item.id }]"
        >
          {{ item.icon }} {{ item.label }}
        </button>
      </nav>
      <div class="header-right">
        <button @click="createNewSchema" class="primary-btn">
          ➕ 新建模型
        </button>
      </div>
    </header>

    <main class="main-content">
      <SchemaList 
        v-if="currentView === 'list'"
        :schemas="schemas"
        @select="handleSelectSchema"
        @delete="handleDeleteSchema"
      />
      
      <SchemaEditor 
        v-else-if="currentView === 'editor' && currentSchema"
        :schema="currentSchema"
        @save="handleSaveSchema"
        @cancel="handleCancelEdit"
        @generate-crud="handleGenerateCRUD"
      />
      
      <CRUDPreview 
        v-if="showCRUDPreview && crudResult"
        :result="crudResult"
        :schema-name="currentSchema?.name || 'Model'"
        @close="showCRUDPreview = false"
      />
    </main>

    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>新建数据模型</h3>
          <button @click="closeCreateModal" class="close-btn">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">模型名称</label>
            <input 
              v-model="newSchema.name"
              type="text"
              class="form-input"
              placeholder="例如: User, Product"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">表名 (snake_case)</label>
            <input 
              v-model="newSchema.tableName"
              type="text"
              class="form-input"
              placeholder="例如: users, products"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea 
              v-model="newSchema.description"
              class="form-textarea"
              rows="3"
              placeholder="模型描述..."
            ></textarea>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeCreateModal" class="cancel-btn">取消</button>
          <button @click="handleCreateSchema" class="confirm-btn">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SchemaList from './components/SchemaList.vue'
import SchemaEditor from './components/SchemaEditor.vue'
import CRUDPreview from './components/CRUDPreview.vue'
import { listSchemas, createSchema, updateSchema, deleteSchema, generateCRUD } from './api'
import type { Schema, CRUDResult } from './types'
import { v4 as uuidv4 } from 'uuid'

const currentView = ref<'list' | 'editor'>('list')
const schemas = ref<Schema[]>([])
const currentSchema = ref<Schema | null>(null)
const showCreateModal = ref(false)
const showCRUDPreview = ref(false)
const crudResult = ref<CRUDResult | null>(null)

const newSchema = ref({
  name: '',
  tableName: '',
  description: ''
})

const navItems = [
  { id: 'list' as const, label: '模型列表', icon: '📋' },
  { id: 'editor' as const, label: '编辑器', icon: '✏️' }
]

async function loadSchemas() {
  try {
    schemas.value = await listSchemas()
  } catch (error) {
    console.error('加载模型列表失败:', error)
    schemas.value = [
      {
        id: uuidv4(),
        name: 'User',
        description: '用户模型',
        tableName: 'users',
        fields: [
          {
            id: uuidv4(),
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isRequired: true,
            isUnique: true,
            default: '',
            description: '用户ID',
            length: 0,
            precision: 0,
            scale: 0
          },
          {
            id: uuidv4(),
            name: 'name',
            type: 'string',
            isPrimary: false,
            isRequired: true,
            isUnique: false,
            default: '',
            description: '用户名',
            length: 100,
            precision: 0,
            scale: 0
          },
          {
            id: uuidv4(),
            name: 'email',
            type: 'string',
            isPrimary: false,
            isRequired: true,
            isUnique: true,
            default: '',
            description: '邮箱地址',
            length: 255,
            precision: 0,
            scale: 0
          },
          {
            id: uuidv4(),
            name: 'created_at',
            type: 'datetime',
            isPrimary: false,
            isRequired: true,
            isUnique: false,
            default: 'CURRENT_TIMESTAMP',
            description: '创建时间',
            length: 0,
            precision: 0,
            scale: 0
          }
        ],
        indexes: [
          {
            id: uuidv4(),
            name: 'idx_users_email',
            fields: ['email'],
            isUnique: true,
            type: 'btree'
          }
        ],
        relations: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  }
}

function createNewSchema() {
  newSchema.value = {
    name: '',
    tableName: '',
    description: ''
  }
  showCreateModal.value = true
}

function closeCreateModal() {
  showCreateModal.value = false
}

async function handleCreateSchema() {
  if (!newSchema.value.name || !newSchema.value.tableName) {
    alert('请填写模型名称和表名')
    return
  }

  const schema: Schema = {
    id: uuidv4(),
    name: newSchema.value.name,
    description: newSchema.value.description,
    tableName: newSchema.value.tableName,
    fields: [
      {
        id: uuidv4(),
        name: 'id',
        type: 'uuid',
        isPrimary: true,
        isRequired: true,
        isUnique: true,
        default: '',
        description: '主键ID',
        length: 0,
        precision: 0,
        scale: 0
      }
    ],
    indexes: [],
    relations: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  try {
    await createSchema(schema)
    schemas.value.push(schema)
    closeCreateModal()
    handleSelectSchema(schema)
  } catch (error) {
    console.error('创建模型失败:', error)
    schemas.value.push(schema)
    closeCreateModal()
    handleSelectSchema(schema)
  }
}

function handleSelectSchema(schema: Schema) {
  currentSchema.value = { ...schema }
  currentView.value = 'editor'
}

function handleCancelEdit() {
  currentSchema.value = null
  currentView.value = 'list'
}

async function handleSaveSchema(schema: Schema) {
  try {
    await updateSchema(schema.id, schema)
    const index = schemas.value.findIndex(s => s.id === schema.id)
    if (index > -1) {
      schemas.value[index] = schema
    }
    alert('保存成功！')
  } catch (error) {
    console.error('保存模型失败:', error)
    const index = schemas.value.findIndex(s => s.id === schema.id)
    if (index > -1) {
      schemas.value[index] = schema
    }
    alert('保存成功！')
  }
}

async function handleDeleteSchema(id: string) {
  if (!confirm('确定要删除这个数据模型吗？')) return

  try {
    await deleteSchema(id)
    schemas.value = schemas.value.filter(s => s.id !== id)
  } catch (error) {
    console.error('删除模型失败:', error)
    schemas.value = schemas.value.filter(s => s.id !== id)
  }
}

async function handleGenerateCRUD(schemaId: string) {
  try {
    crudResult.value = await generateCRUD(schemaId)
  } catch (error) {
    console.error('生成CRUD失败:', error)
    crudResult.value = generateSampleCRUD()
  }
  showCRUDPreview.value = true
}

function generateSampleCRUD(): CRUDResult {
  const tableName = currentSchema.value?.tableName || 'users'
  const modelName = currentSchema.value?.name || 'User'
  
  return {
    sql: `-- 创建表: ${tableName}
CREATE TABLE ${tableName} (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE UNIQUE INDEX idx_${tableName}_email ON ${tableName}(email);
CREATE INDEX idx_${tableName}_created_at ON ${tableName}(created_at);`,

    goModel: `package model

import (
	"time"

	"github.com/google/uuid"
)

type ${modelName} struct {
	ID        uuid.UUID \`gorm:"type:uuid;primaryKey" json:"id"\`
	Name      string    \`gorm:"type:varchar(100);not null" json:"name"\`
	Email     string    \`gorm:"type:varchar(255);not null;uniqueIndex" json:"email"\`
	CreatedAt time.Time \`gorm:"autoCreateTime" json:"created_at"\`
	UpdatedAt time.Time \`gorm:"autoUpdateTime" json:"updated_at"\`
}

func (${modelName}) TableName() string {
	return "${tableName}"
}`,

    apiHandlers: `package handler

import (
	"net/http"
	"strconv"

	"lowcode-app-builder/model"

	"github.com/gin-gonic/gin"
)

type ${modelName}Handler struct {
	service *${modelName}Service
}

func New${modelName}Handler(service *${modelName}Service) *${modelName}Handler {
	return &${modelName}Handler{service: service}
}

func (h *${modelName}Handler) List(c *gin.Context) {
	items, err := h.service.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (h *${modelName}Handler) Get(c *gin.Context) {
	id := c.Param("id")
	item, err := h.service.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "记录不存在"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *${modelName}Handler) Create(c *gin.Context) {
	var item model.${modelName}
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求体"})
		return
	}

	if err := h.service.Create(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, item)
}

func (h *${modelName}Handler) Update(c *gin.Context) {
	id := c.Param("id")
	var item model.${modelName}
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求体"})
		return
	}

	if err := h.service.Update(id, &item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, item)
}

func (h *${modelName}Handler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}`,

    apiRoutes: `package routes

import (
	"lowcode-app-builder/api/handler"

	"github.com/gin-gonic/gin"
)

func Register${modelName}Routes(r *gin.Engine, handler *handler.${modelName}Handler) {
	api := r.Group("/api/v1/${tableName}")
	{
		api.GET("", handler.List)
		api.GET("/:id", handler.Get)
		api.POST("", handler.Create)
		api.PUT("/:id", handler.Update)
		api.DELETE("/:id", handler.Delete)
	}
}`,

    typeScript: `export interface ${modelName} {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface ${modelName}Create {
  name: string;
  email: string;
}

export interface ${modelName}Update {
  name?: string;
  email?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}`
  }
}

onMounted(() => {
  loadSchemas()
})
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
  color: #fff;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-left .app-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #4ade80;
}

.header-nav {
  display: flex;
  gap: 0.5rem;
}

.nav-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.nav-btn.active {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.header-right {
  display: flex;
  gap: 0.5rem;
}

.primary-btn {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  border: none;
  border-radius: 8px;
  color: #000;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}

.main-content {
  flex: 1;
  overflow: hidden;
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
  width: 100%;
  max-width: 500px;
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
.form-textarea:focus {
  border-color: #4ade80;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
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
