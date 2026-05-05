<template>
  <div class="property-panel">
    <div class="panel-header">
      <span class="component-type">{{ getComponentTypeLabel }}</span>
      <span class="component-id">ID: {{ component.id }}</span>
    </div>

    <div class="panel-section">
      <div class="section-title">基本属性</div>
      
      <div 
        v-for="prop in propertyConfigs" 
        :key="prop.name"
        class="property-item"
      >
        <label class="property-label">{{ prop.label }}</label>
        
        <div class="property-control">
          <input 
            v-if="prop.type === 'text'"
            :value="component.properties[prop.name] || prop.default"
            @input="handleInput(prop.name, $event)"
            class="property-input"
            type="text"
          />
          
          <input 
            v-else-if="prop.type === 'number'"
            :value="component.properties[prop.name] || prop.default"
            @input="handleNumberInput(prop.name, $event)"
            class="property-input"
            type="number"
          />
          
          <select 
            v-else-if="prop.type === 'select'"
            :value="component.properties[prop.name] || prop.default"
            @change="handleInput(prop.name, $event)"
            class="property-select"
          >
            <option 
              v-for="option in prop.options" 
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          
          <label 
            v-else-if="prop.type === 'boolean'"
            class="checkbox-label"
          >
            <input 
              :checked="component.properties[prop.name] || prop.default"
              @change="handleCheckbox(prop.name, $event)"
              type="checkbox"
            />
            <span>启用</span>
          </label>
          
          <textarea 
            v-else-if="prop.type === 'textarea'"
            :value="component.properties[prop.name] || prop.default"
            @input="handleInput(prop.name, $event)"
            class="property-textarea"
            rows="3"
          ></textarea>
          
          <input 
            v-else-if="prop.type === 'color'"
            :value="component.properties[prop.name] || prop.default"
            @input="handleInput(prop.name, $event)"
            class="property-color"
            type="color"
          />
        </div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-title">样式属性</div>
      
      <div class="property-item">
        <label class="property-label">宽度</label>
        <div class="property-control">
          <input 
            :value="component.styles.width || ''"
            @input="handleStyleInput('width', $event)"
            class="property-input"
            type="text"
            placeholder="auto"
          />
        </div>
      </div>
      
      <div class="property-item">
        <label class="property-label">高度</label>
        <div class="property-control">
          <input 
            :value="component.styles.height || ''"
            @input="handleStyleInput('height', $event)"
            class="property-input"
            type="text"
            placeholder="auto"
          />
        </div>
      </div>
      
      <div class="property-item">
        <label class="property-label">边距</label>
        <div class="property-control style-group">
          <input 
            :value="component.styles['margin-top'] || ''"
            @input="handleStyleInput('marginTop', $event)"
            class="property-input small"
            type="text"
            placeholder="上"
          />
          <input 
            :value="component.styles['margin-right'] || ''"
            @input="handleStyleInput('marginRight', $event)"
            class="property-input small"
            type="text"
            placeholder="右"
          />
          <input 
            :value="component.styles['margin-bottom'] || ''"
            @input="handleStyleInput('marginBottom', $event)"
            class="property-input small"
            type="text"
            placeholder="下"
          />
          <input 
            :value="component.styles['margin-left'] || ''"
            @input="handleStyleInput('marginLeft', $event)"
            class="property-input small"
            type="text"
            placeholder="左"
          />
        </div>
      </div>
      
      <div class="property-item">
        <label class="property-label">内边距</label>
        <div class="property-control">
          <div class="style-group">
            <input 
              :value="component.styles['padding-top'] || ''"
              @input="handleStyleInput('paddingTop', $event)"
              class="property-input small"
              type="text"
              placeholder="上"
            />
            <input 
              :value="component.styles['padding-right'] || ''"
              @input="handleStyleInput('paddingRight', $event)"
              class="property-input small"
              type="text"
              placeholder="右"
            />
            <input 
              :value="component.styles['padding-bottom'] || ''"
              @input="handleStyleInput('paddingBottom', $event)"
              class="property-input small"
              type="text"
              placeholder="下"
            />
            <input 
              :value="component.styles['padding-left'] || ''"
              @input="handleStyleInput('paddingLeft', $event)"
              class="property-input small"
              type="text"
              placeholder="左"
            />
          </div>
        </div>
      </div>
      
      <div class="property-item">
        <label class="property-label">背景色</label>
        <div class="property-control">
          <input 
            :value="component.styles['background-color'] || '#ffffff'"
            @input="handleStyleInput('backgroundColor', $event)"
            class="property-color"
            type="color"
          />
          <input 
            :value="component.styles['background-color'] || ''"
            @input="handleStyleInput('backgroundColor', $event)"
            class="property-input"
            type="text"
            placeholder="#ffffff"
          />
        </div>
      </div>
      
      <div class="property-item">
        <label class="property-label">文字颜色</label>
        <div class="property-control">
          <input 
            :value="component.styles['color'] || '#000000'"
            @input="handleStyleInput('color', $event)"
            class="property-color"
            type="color"
          />
          <input 
            :value="component.styles['color'] || ''"
            @input="handleStyleInput('color', $event)"
            class="property-input"
            type="text"
            placeholder="#000000"
          />
        </div>
      </div>
      
      <div class="property-item">
        <label class="property-label">字体大小</label>
        <div class="property-control">
          <input 
            :value="component.styles['font-size'] || ''"
            @input="handleStyleInput('fontSize', $event)"
            class="property-input"
            type="text"
            placeholder="14px"
          />
        </div>
      </div>
      
      <div class="property-item">
        <label class="property-label">圆角</label>
        <div class="property-control">
          <input 
            :value="component.styles['border-radius'] || ''"
            @input="handleStyleInput('borderRadius', $event)"
            class="property-input"
            type="text"
            placeholder="0px"
          />
        </div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-title">显示控制</div>
      
      <div class="property-item">
        <label class="property-label">显示</label>
        <div class="property-control">
          <select 
            :value="component.styles.display || 'block'"
            @change="handleStyleSelect('display', $event)"
            class="property-select"
          >
            <option value="block">块级</option>
            <option value="inline">行内</option>
            <option value="inline-block">行内块</option>
            <option value="flex">弹性</option>
            <option value="none">隐藏</option>
          </select>
        </div>
      </div>
      
      <div class="property-item">
        <label class="property-label">定位</label>
        <div class="property-control">
          <select 
            :value="component.styles.position || 'static'"
            @change="handleStyleSelect('position', $event)"
            class="property-select"
          >
            <option value="static">静态</option>
            <option value="relative">相对</option>
            <option value="absolute">绝对</option>
            <option value="fixed">固定</option>
            <option value="sticky">粘性</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Component, PropertyConfig } from '../types'

const props = defineProps<{
  component: Component
}>()

const emit = defineEmits<{
  (e: 'update-properties', properties: Record<string, any>): void
}>()

const componentTypeLabels: Record<string, string> = {
  input: '输入框',
  button: '按钮',
  text: '文本',
  image: '图片',
  container: '容器',
  form: '表单',
  list: '列表',
  chart: '图表',
  select: '下拉选择',
  textarea: '多行文本',
  checkbox: '复选框',
  radio: '单选框',
  'date-picker': '日期选择',
  table: '表格',
  card: '卡片',
  divider: '分割线',
  tabs: '标签页'
}

const getComponentTypeLabel = computed(() => {
  return componentTypeLabels[props.component.type] || props.component.type
})

const propertyConfigs: PropertyConfig[] = [
  { name: 'id', label: 'ID', type: 'text', default: '' },
  { name: 'name', label: '名称', type: 'text', default: '' },
  { name: 'className', label: '类名', type: 'text', default: '' },
  { name: 'placeholder', label: '占位符', type: 'text', default: '' },
  { name: 'text', label: '文本', type: 'text', default: '' },
  { name: 'content', label: '内容', type: 'textarea', default: '' },
  { name: 'src', label: '源地址', type: 'text', default: '' },
  { name: 'alt', label: '替代文本', type: 'text', default: '' },
  { name: 'type', label: '类型', type: 'select', options: [
    { label: '文本', value: 'text' },
    { label: '密码', value: 'password' },
    { label: '邮箱', value: 'email' },
    { label: '数字', value: 'number' }
  ], default: 'text' },
  { name: 'disabled', label: '禁用', type: 'boolean', default: false },
  { name: 'readonly', label: '只读', type: 'boolean', default: false },
  { name: 'required', label: '必填', type: 'boolean', default: false }
]

function handleInput(name: string, event: Event) {
  const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  const newValue = target.value
  
  const updatedProperties = {
    ...props.component.properties,
    [name]: newValue
  }
  
  emit('update-properties', updatedProperties)
}

function handleNumberInput(name: string, event: Event) {
  const target = event.target as HTMLInputElement
  const newValue = Number(target.value)
  
  const updatedProperties = {
    ...props.component.properties,
    [name]: newValue
  }
  
  emit('update-properties', updatedProperties)
}

function handleCheckbox(name: string, event: Event) {
  const target = event.target as HTMLInputElement
  const newValue = target.checked
  
  const updatedProperties = {
    ...props.component.properties,
    [name]: newValue
  }
  
  emit('update-properties', updatedProperties)
}

function handleStyleInput(name: string, event: Event) {
  const target = event.target as HTMLInputElement
  const newValue = target.value
  
  const cssName = toKebabCase(name)
  const updatedStyles = {
    ...props.component.styles,
    [cssName]: newValue
  }
  
  const updatedProperties = {
    ...props.component.properties,
    style: updatedStyles
  }
  
  emit('update-properties', updatedProperties)
}

function handleStyleSelect(name: string, event: Event) {
  const target = event.target as HTMLSelectElement
  const newValue = target.value
  
  const cssName = toKebabCase(name)
  const updatedStyles = {
    ...props.component.styles,
    [cssName]: newValue
  }
  
  const updatedProperties = {
    ...props.component.properties,
    style: updatedStyles
  }
  
  emit('update-properties', updatedProperties)
}

function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}
</script>

<style scoped>
.property-panel {
  height: 100%;
  overflow-y: auto;
}

.panel-header {
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 1rem;
}

.component-type {
  font-weight: 600;
  color: #4ade80;
  display: block;
  margin-bottom: 0.25rem;
}

.component-id {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.panel-section {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.property-item {
  margin-bottom: 0.75rem;
}

.property-label {
  display: block;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.375rem;
}

.property-control {
  width: 100%;
}

.property-input,
.property-select,
.property-textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #fff;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s;
}

.property-input:focus,
.property-select:focus,
.property-textarea:focus {
  border-color: #4ade80;
}

.property-input.small {
  width: 60px;
}

.property-color {
  width: 36px;
  height: 32px;
  padding: 2px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  vertical-align: middle;
  margin-right: 0.5rem;
}

.property-textarea {
  resize: vertical;
  min-height: 60px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #4ade80;
  cursor: pointer;
}

.style-group {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.25rem;
}
</style>
