<template>
  <div class="schema-editor">
    <div class="editor-header">
      <div class="header-left">
        <button @click="$emit('cancel')" class="back-btn">
          ← 返回
        </button>
        <h2>编辑数据模型</h2>
      </div>
      <div class="header-right">
        <button @click="handleGenerateCRUD" class="generate-btn">
          ⚡ 生成CRUD
        </button>
        <button @click="handleSave" class="save-btn">
          💾 保存
        </button>
      </div>
    </div>

    <div class="editor-content">
      <div class="main-section">
        <div class="section-card">
          <div class="card-title">基本信息</div>
          <div class="card-content">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">模型名称</label>
                <input 
                  v-model="editSchema.name"
                  type="text"
                  class="form-input"
                  placeholder="例如: User, Product"
                />
              </div>
              <div class="form-group">
                <label class="form-label">表名</label>
                <input 
                  v-model="editSchema.tableName"
                  type="text"
                  class="form-input"
                  placeholder="例如: users, products"
                />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">描述</label>
              <textarea 
                v-model="editSchema.description"
                class="form-textarea"
                rows="2"
                placeholder="模型描述..."
              ></textarea>
            </div>
          </div>
        </div>

        <div class="section-card">
          <div class="card-title">
            <span>字段管理</span>
            <button @click="addNewField" class="add-btn">
              ➕ 添加字段
            </button>
          </div>
          <div class="card-content">
            <div class="fields-table">
              <div class="table-header">
                <span class="col-name">字段名</span>
                <span class="col-type">类型</span>
                <span class="col-primary">主键</span>
                <span class="col-required">必填</span>
                <span class="col-unique">唯一</span>
                <span class="col-length">长度</span>
                <span class="col-actions">操作</span>
              </div>
              
              <div 
                v-for="(field, index) in editSchema.fields" 
                :key="field.id"
                class="table-row"
                :class="{ 'primary-row': field.isPrimary }"
              >
                <div class="col-name">
                  <input 
                    v-model="field.name"
                    type="text"
                    class="cell-input"
                    placeholder="字段名"
                  />
                </div>
                <div class="col-type">
                  <select 
                    v-model="field.type"
                    class="cell-select"
                  >
                    <option v-for="ft in fieldTypes" :key="ft.value" :value="ft.value">
                      {{ ft.label }}
                    </option>
                  </select>
                </div>
                <div class="col-primary">
                  <input 
                    v-model="field.isPrimary"
                    type="checkbox"
                    class="cell-checkbox"
                  />
                </div>
                <div class="col-required">
                  <input 
                    v-model="field.isRequired"
                    type="checkbox"
                    class="cell-checkbox"
                  />
                </div>
                <div class="col-unique">
                  <input 
                    v-model="field.isUnique"
                    type="checkbox"
                    class="cell-checkbox"
                  />
                </div>
                <div class="col-length">
                  <input 
                    v-model.number="field.length"
                    type="number"
                    class="cell-input small"
                    placeholder="0"
                  />
                </div>
                <div class="col-actions">
                  <button 
                    @click="removeField(index)"
                    class="action-btn delete"
                    title="删除字段"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="section-card">
          <div class="card-title">
            <span>索引管理</span>
            <button @click="addNewIndex" class="add-btn">
              ➕ 添加索引
            </button>
          </div>
          <div class="card-content">
            <div v-if="editSchema.indexes.length === 0" class="empty-list">
              暂无索引，点击上方按钮添加
            </div>
            <div v-else class="indexes-list">
              <div 
                v-for="(index, indexIdx) in editSchema.indexes" 
                :key="index.id"
                class="index-item"
              >
                <div class="index-header">
                  <input 
                    v-model="index.name"
                    type="text"
                    class="index-name-input"
                    placeholder="索引名称"
                  />
                  <label class="unique-checkbox">
                    <input v-model="index.isUnique" type="checkbox" />
                    唯一索引
                  </label>
                  <button 
                    @click="removeIndex(indexIdx)"
                    class="action-btn delete"
                    title="删除索引"
                  >
                    ✕
                  </button>
                </div>
                <div class="index-fields">
                  <span class="label">字段:</span>
                  <div class="fields-tags">
                    <span 
                      v-for="(field, fIdx) in index.fields" 
                      :key="fIdx"
                      class="field-tag"
                    >
                      {{ field }}
                      <button @click="removeIndexField(indexIdx, fIdx)" class="remove-tag">×</button>
                    </span>
                    <select 
                      v-model="newIndexField"
                      @change="addIndexField(indexIdx)"
                      class="field-select"
                    >
                      <option value="">选择字段</option>
                      <option 
                        v-for="field in editSchema.fields" 
                        :key="field.id"
                        :value="field.name"
                      >
                        {{ field.name }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="side-section">
        <div class="section-card">
          <div class="card-title">SQL 预览</div>
          <div class="card-content">
            <pre class="sql-preview"><code>{{ generateSQLPreview }}</code></pre>
          </div>
        </div>

        <div class="section-card">
          <div class="card-title">关联管理</div>
          <div class="card-content">
            <div v-if="editSchema.relations.length === 0" class="empty-list">
              暂无关联关系
            </div>
            <div v-else class="relations-list">
              <div 
                v-for="(relation, relIdx) in editSchema.relations" 
                :key="relation.id"
                class="relation-item"
              >
                <div class="relation-info">
                  <span class="relation-name">{{ relation.name }}</span>
                  <span class="relation-type-badge">{{ getRelationTypeLabel(relation.type) }}</span>
                </div>
                <div class="relation-details">
                  <span>{{ relation.sourceTable }}.{{ relation.sourceField }}</span>
                  <span class="arrow">→</span>
                  <span>{{ relation.targetTable }}.{{ relation.targetField }}</span>
                </div>
                <button 
                  @click="removeRelation(relIdx)"
                  class="action-btn delete"
                  title="删除关联"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { Schema, FieldType, RelationType } from '../types'

const props = defineProps<{
  schema: Schema
}>()

const emit = defineEmits<{
  (e: 'save', schema: Schema): void
  (e: 'cancel'): void
  (e: 'generate-crud', schemaId: string): void
}>()

const editSchema = ref<Schema>({ ...props.schema })

const newIndexField = ref('')

const fieldTypes = [
  { value: 'string' as FieldType, label: '字符串 (string)' },
  { value: 'integer' as FieldType, label: '整数 (integer)' },
  { value: 'float' as FieldType, label: '浮点数 (float)' },
  { value: 'boolean' as FieldType, label: '布尔值 (boolean)' },
  { value: 'date' as FieldType, label: '日期 (date)' },
  { value: 'datetime' as FieldType, label: '日期时间 (datetime)' },
  { value: 'text' as FieldType, label: '长文本 (text)' },
  { value: 'json' as FieldType, label: 'JSON (json)' },
  { value: 'uuid' as FieldType, label: 'UUID (uuid)' }
]

const relationTypes = [
  { value: 'oneToOne' as RelationType, label: '一对一' },
  { value: 'oneToMany' as RelationType, label: '一对多' },
  { value: 'manyToOne' as RelationType, label: '多对一' },
  { value: 'manyToMany' as RelationType, label: '多对多' }
]

const generateSQLPreview = computed(() => {
  if (!editSchema.value || editSchema.value.fields.length === 0) {
    return '-- 请添加字段以查看SQL预览'
  }

  let sql = `-- 表: ${editSchema.value.tableName}\n`
  sql += `CREATE TABLE ${editSchema.value.tableName} (\n`

  const fieldDefs: string[] = []
  editSchema.value.fields.forEach((field, idx) => {
    let def = `  ${field.name} ${getSQLType(field)}`
    if (field.isPrimary) def += ' PRIMARY KEY'
    if (field.isRequired && !field.isPrimary) def += ' NOT NULL'
    if (field.isUnique) def += ' UNIQUE'
    if (field.default) def += ` DEFAULT ${field.default}`
    if (idx < editSchema.value.fields.length - 1 || editSchema.value.indexes.length > 0) def += ','
    fieldDefs.push(def)
  })

  editSchema.value.indexes.forEach((index, idx) => {
    if (index.fields.length > 0) {
      let indexDef = `  ${index.isUnique ? 'UNIQUE ' : ''}INDEX ${index.name} (${index.fields.join(', ')})`
      if (idx < editSchema.value.indexes.length - 1) indexDef += ','
      fieldDefs.push(indexDef)
    }
  })

  sql += fieldDefs.join('\n') + '\n);'

  return sql
})

function getSQLType(field: { type: FieldType; length: number; precision: number; scale: number }): string {
  switch (field.type) {
    case 'string':
      return field.length > 0 ? `VARCHAR(${field.length})` : 'VARCHAR(255)'
    case 'integer':
      return 'INTEGER'
    case 'float':
      if (field.precision > 0 && field.scale > 0) {
        return `DECIMAL(${field.precision}, ${field.scale})`
      }
      return 'FLOAT'
    case 'boolean':
      return 'BOOLEAN'
    case 'date':
      return 'DATE'
    case 'datetime':
      return 'TIMESTAMP'
    case 'text':
      return 'TEXT'
    case 'json':
      return 'JSON'
    case 'uuid':
      return 'UUID'
    default:
      return 'VARCHAR(255)'
  }
}

function getRelationTypeLabel(type: RelationType): string {
  const found = relationTypes.find(rt => rt.value === type)
  return found ? found.label : type
}

function addNewField() {
  const newField = {
    id: uuidv4(),
    name: `field_${editSchema.value.fields.length + 1}`,
    type: 'string' as FieldType,
    isPrimary: false,
    isRequired: false,
    isUnique: false,
    default: '',
    description: '',
    length: 255,
    precision: 0,
    scale: 0
  }
  editSchema.value.fields.push(newField)
}

function removeField(index: number) {
  if (editSchema.value.fields.length <= 1) {
    alert('至少需要保留一个字段')
    return
  }
  editSchema.value.fields.splice(index, 1)
}

function addNewIndex() {
  const newIndex = {
    id: uuidv4(),
    name: `idx_${editSchema.value.tableName}_${editSchema.value.indexes.length + 1}`,
    fields: [],
    isUnique: false,
    type: 'btree'
  }
  editSchema.value.indexes.push(newIndex)
}

function removeIndex(index: number) {
  editSchema.value.indexes.splice(index, 1)
}

function addIndexField(indexIdx: number) {
  if (newIndexField.value && !editSchema.value.indexes[indexIdx].fields.includes(newIndexField.value)) {
    editSchema.value.indexes[indexIdx].fields.push(newIndexField.value)
  }
  newIndexField.value = ''
}

function removeIndexField(indexIdx: number, fieldIdx: number) {
  editSchema.value.indexes[indexIdx].fields.splice(fieldIdx, 1)
}

function removeRelation(index: number) {
  editSchema.value.relations.splice(index, 1)
}

function handleSave() {
  if (!editSchema.value.name || !editSchema.value.tableName) {
    alert('请填写模型名称和表名')
    return
  }
  if (editSchema.value.fields.length === 0) {
    alert('请至少添加一个字段')
    return
  }
  emit('save', editSchema.value)
}

function handleGenerateCRUD() {
  emit('generate-crud', editSchema.value.id)
}

watch(() => props.schema, (newSchema) => {
  editSchema.value = { ...newSchema }
}, { deep: true })
</script>

<style scoped>
.schema-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.header-left h2 {
  margin: 0;
  font-size: 1.125rem;
}

.header-right {
  display: flex;
  gap: 0.75rem;
}

.generate-btn,
.save-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.generate-btn {
  background: rgba(168, 85, 247, 0.2);
  border: 1px solid rgba(168, 85, 247, 0.3);
  color: #a78bfa;
}

.generate-btn:hover {
  background: rgba(168, 85, 247, 0.3);
}

.save-btn {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  border: none;
  color: #000;
  font-weight: 600;
}

.save-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}

.editor-content {
  flex: 1;
  overflow: auto;
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem 2rem;
}

.main-section {
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.side-section {
  flex: 1;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-weight: 600;
  font-size: 0.875rem;
}

.add-btn {
  padding: 0.25rem 0.75rem;
  background: rgba(74, 222, 128, 0.2);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 4px;
  color: #4ade80;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.add-btn:hover {
  background: rgba(74, 222, 128, 0.3);
}

.card-content {
  padding: 1.25rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
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
  min-height: 60px;
}

.fields-table {
  width: 100%;
}

.table-header {
  display: grid;
  grid-template-columns: 1.5fr 1.2fr 0.6fr 0.6fr 0.6fr 0.8fr 0.8fr;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
}

.table-row {
  display: grid;
  grid-template-columns: 1.5fr 1.2fr 0.6fr 0.6fr 0.6fr 0.8fr 0.8fr;
  gap: 0.5rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  align-items: center;
}

.table-row.primary-row {
  background: rgba(74, 222, 128, 0.05);
}

.cell-input,
.cell-select {
  width: 100%;
  padding: 0.5rem 0.625rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: #fff;
  font-size: 0.8rem;
  outline: none;
}

.cell-input.small {
  text-align: center;
}

.cell-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #4ade80;
  cursor: pointer;
}

.col-actions {
  display: flex;
  justify-content: center;
}

.action-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.2s;
}

.action-btn:hover {
  opacity: 1;
}

.action-btn.delete:hover {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.empty-list {
  text-align: center;
  padding: 1.5rem;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.875rem;
}

.indexes-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.index-item {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 0.75rem;
}

.index-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.index-name-input {
  flex: 1;
  padding: 0.375rem 0.625rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: #fff;
  font-size: 0.8rem;
  font-family: 'Monaco', 'Menlo', monospace;
  outline: none;
}

.unique-checkbox {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
}

.unique-checkbox input[type="checkbox"] {
  accent-color: #4ade80;
}

.index-fields {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.index-fields .label {
  color: rgba(255, 255, 255, 0.5);
}

.fields-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
}

.field-tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: rgba(74, 222, 128, 0.2);
  border-radius: 4px;
  font-size: 0.75rem;
  color: #4ade80;
}

.remove-tag {
  background: transparent;
  border: none;
  color: rgba(74, 222, 128, 0.6);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.remove-tag:hover {
  color: #fff;
}

.field-select {
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: #fff;
  font-size: 0.75rem;
  outline: none;
}

.sql-preview {
  margin: 0;
  padding: 0.75rem;
  background: #0a0a14;
  border-radius: 6px;
  overflow-x: auto;
}

.sql-preview code {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.8rem;
  line-height: 1.6;
  color: #e5e7eb;
}

.relations-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.relation-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.relation-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.relation-name {
  font-size: 0.875rem;
  font-weight: 500;
}

.relation-type-badge {
  padding: 0.125rem 0.375rem;
  background: rgba(168, 85, 247, 0.2);
  border-radius: 4px;
  font-size: 0.7rem;
  color: #a78bfa;
}

.relation-details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-family: 'Monaco', 'Menlo', monospace;
  color: rgba(255, 255, 255, 0.6);
}

.relation-details .arrow {
  color: #4ade80;
}
</style>
