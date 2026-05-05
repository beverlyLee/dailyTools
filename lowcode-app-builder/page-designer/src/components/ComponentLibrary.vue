<template>
  <div class="component-library">
    <div class="library-header">
      <h3>组件库</h3>
    </div>
    
    <div v-for="category in categories" :key="category.name" class="category-section">
      <div class="category-header" @click="toggleCategory(category.name)">
        <span class="toggle-icon">{{ expandedCategories.includes(category.name) ? '▼' : '▶' }}</span>
        <span class="category-name">{{ category.label }}</span>
      </div>
      
      <div v-if="expandedCategories.includes(category.name)" class="category-components">
        <div 
          v-for="comp in getComponentsByCategory(category.name)" 
          :key="comp.type"
          class="component-item"
          draggable="true"
          @dragstart="handleDragStart($event, comp.type)"
          @click="handleComponentClick(comp.type)"
        >
          <span class="component-icon">{{ comp.icon }}</span>
          <span class="component-label">{{ comp.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ComponentDefinition, ComponentType } from '../types'

const emit = defineEmits<{
  (e: 'component-drag', type: ComponentType): void
}>()

const expandedCategories = ref<string[]>(['form', 'display', 'layout'])

const categories = [
  { name: 'form', label: '表单组件' },
  { name: 'display', label: '展示组件' },
  { name: 'layout', label: '布局组件' },
  { name: 'data', label: '数据组件' }
]

const componentDefinitions: ComponentDefinition[] = [
  {
    type: 'input',
    label: '输入框',
    icon: '📝',
    category: 'form',
    properties: [
      { name: 'placeholder', label: '占位符', type: 'text', default: '' },
      { name: 'type', label: '输入类型', type: 'select', options: [
        { label: '文本', value: 'text' },
        { label: '密码', value: 'password' },
        { label: '邮箱', value: 'email' },
        { label: '数字', value: 'number' }
      ], default: 'text' },
      { name: 'disabled', label: '禁用', type: 'boolean', default: false }
    ],
    defaultStyles: {
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      fontSize: '14px'
    },
    defaultProperties: {
      placeholder: '请输入',
      type: 'text',
      disabled: false
    }
  },
  {
    type: 'button',
    label: '按钮',
    icon: '🔘',
    category: 'form',
    properties: [
      { name: 'text', label: '按钮文本', type: 'text', default: '按钮' },
      { name: 'type', label: '按钮类型', type: 'select', options: [
        { label: '主按钮', value: 'primary' },
        { label: '次要按钮', value: 'secondary' },
        { label: '危险按钮', value: 'danger' }
      ], default: 'primary' },
      { name: 'disabled', label: '禁用', type: 'boolean', default: false }
    ],
    defaultStyles: {
      padding: '8px 16px',
      borderRadius: '4px',
      fontSize: '14px',
      cursor: 'pointer'
    },
    defaultProperties: {
      text: '按钮',
      type: 'primary',
      disabled: false
    }
  },
  {
    type: 'select',
    label: '下拉选择',
    icon: '📋',
    category: 'form',
    properties: [
      { name: 'placeholder', label: '占位符', type: 'text', default: '请选择' },
      { name: 'disabled', label: '禁用', type: 'boolean', default: false }
    ],
    defaultStyles: {
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      fontSize: '14px'
    },
    defaultProperties: {
      placeholder: '请选择',
      disabled: false
    }
  },
  {
    type: 'textarea',
    label: '多行文本',
    icon: '📄',
    category: 'form',
    properties: [
      { name: 'placeholder', label: '占位符', type: 'text', default: '请输入' },
      { name: 'rows', label: '行数', type: 'number', default: 4 },
      { name: 'disabled', label: '禁用', type: 'boolean', default: false }
    ],
    defaultStyles: {
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      fontSize: '14px',
      resize: 'vertical'
    },
    defaultProperties: {
      placeholder: '请输入',
      rows: 4,
      disabled: false
    }
  },
  {
    type: 'checkbox',
    label: '复选框',
    icon: '☑️',
    category: 'form',
    properties: [
      { name: 'label', label: '标签', type: 'text', default: '选项' },
      { name: 'checked', label: '选中', type: 'boolean', default: false },
      { name: 'disabled', label: '禁用', type: 'boolean', default: false }
    ],
    defaultStyles: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px'
    },
    defaultProperties: {
      label: '选项',
      checked: false,
      disabled: false
    }
  },
  {
    type: 'radio',
    label: '单选框',
    icon: '🔲',
    category: 'form',
    properties: [
      { name: 'label', label: '标签', type: 'text', default: '选项' },
      { name: 'checked', label: '选中', type: 'boolean', default: false },
      { name: 'disabled', label: '禁用', type: 'boolean', default: false }
    ],
    defaultStyles: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px'
    },
    defaultProperties: {
      label: '选项',
      checked: false,
      disabled: false
    }
  },
  {
    type: 'date-picker',
    label: '日期选择',
    icon: '📅',
    category: 'form',
    properties: [
      { name: 'placeholder', label: '占位符', type: 'text', default: '选择日期' },
      { name: 'format', label: '日期格式', type: 'text', default: 'YYYY-MM-DD' },
      { name: 'disabled', label: '禁用', type: 'boolean', default: false }
    ],
    defaultStyles: {
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      fontSize: '14px'
    },
    defaultProperties: {
      placeholder: '选择日期',
      format: 'YYYY-MM-DD',
      disabled: false
    }
  },
  {
    type: 'text',
    label: '文本',
    icon: '📝',
    category: 'display',
    properties: [
      { name: 'content', label: '文本内容', type: 'textarea', default: '文本内容' },
      { name: 'tag', label: 'HTML标签', type: 'select', options: [
        { label: '段落', value: 'p' },
        { label: '标题1', value: 'h1' },
        { label: '标题2', value: 'h2' },
        { label: '标题3', value: 'h3' },
        { label: '标题4', value: 'h4' },
        { label: '标题5', value: 'h5' },
        { label: '标题6', value: 'h6' },
        { label: '跨度', value: 'span' }
      ], default: 'p' }
    ],
    defaultStyles: {
      fontSize: '14px',
      lineHeight: '1.5',
      margin: '0'
    },
    defaultProperties: {
      content: '文本内容',
      tag: 'p'
    }
  },
  {
    type: 'image',
    label: '图片',
    icon: '🖼️',
    category: 'display',
    properties: [
      { name: 'src', label: '图片地址', type: 'text', default: '' },
      { name: 'alt', label: '替代文本', type: 'text', default: '图片' },
      { name: 'fit', label: '填充方式', type: 'select', options: [
        { label: '覆盖', value: 'cover' },
        { label: '包含', value: 'contain' },
        { label: '填充', value: 'fill' },
        { label: '无', value: 'none' }
      ], default: 'cover' }
    ],
    defaultStyles: {
      maxWidth: '100%',
      height: 'auto'
    },
    defaultProperties: {
      src: '',
      alt: '图片',
      fit: 'cover'
    }
  },
  {
    type: 'card',
    label: '卡片',
    icon: '🃏',
    category: 'display',
    properties: [
      { name: 'title', label: '卡片标题', type: 'text', default: '卡片标题' },
      { name: 'shadow', label: '阴影', type: 'boolean', default: true },
      { name: 'border', label: '边框', type: 'boolean', default: true }
    ],
    defaultStyles: {
      padding: '16px',
      borderRadius: '8px',
      backgroundColor: '#fff'
    },
    defaultProperties: {
      title: '卡片标题',
      shadow: true,
      border: true
    }
  },
  {
    type: 'divider',
    label: '分割线',
    icon: '➖',
    category: 'display',
    properties: [
      { name: 'orientation', label: '方向', type: 'select', options: [
        { label: '水平', value: 'horizontal' },
        { label: '垂直', value: 'vertical' }
      ], default: 'horizontal' },
      { name: 'color', label: '颜色', type: 'color', default: '#e5e7eb' }
    ],
    defaultStyles: {
      height: '1px',
      backgroundColor: '#e5e7eb',
      margin: '16px 0'
    },
    defaultProperties: {
      orientation: 'horizontal',
      color: '#e5e7eb'
    }
  },
  {
    type: 'container',
    label: '容器',
    icon: '📦',
    category: 'layout',
    properties: [
      { name: 'direction', label: '布局方向', type: 'select', options: [
        { label: '垂直', value: 'column' },
        { label: '水平', value: 'row' }
      ], default: 'column' },
      { name: 'gap', label: '间距', type: 'number', default: 8 },
      { name: 'justify', label: '水平对齐', type: 'select', options: [
        { label: '起始', value: 'flex-start' },
        { label: '居中', value: 'center' },
        { label: '结束', value: 'flex-end' },
        { label: '两端', value: 'space-between' }
      ], default: 'flex-start' },
      { name: 'align', label: '垂直对齐', type: 'select', options: [
        { label: '起始', value: 'flex-start' },
        { label: '居中', value: 'center' },
        { label: '结束', value: 'flex-end' },
        { label: '拉伸', value: 'stretch' }
      ], default: 'flex-start' }
    ],
    defaultStyles: {
      display: 'flex',
      padding: '16px'
    },
    defaultProperties: {
      direction: 'column',
      gap: 8,
      justify: 'flex-start',
      align: 'flex-start'
    }
  },
  {
    type: 'form',
    label: '表单',
    icon: '📋',
    category: 'data',
    properties: [
      { name: 'action', label: '提交地址', type: 'text', default: '' },
      { name: 'method', label: '提交方法', type: 'select', options: [
        { label: 'POST', value: 'POST' },
        { label: 'GET', value: 'GET' }
      ], default: 'POST' },
      { name: 'enctype', label: '编码类型', type: 'select', options: [
        { label: 'URL编码', value: 'application/x-www-form-urlencoded' },
        { label: '多部分', value: 'multipart/form-data' },
        { label: '纯文本', value: 'text/plain' }
      ], default: 'application/x-www-form-urlencoded' }
    ],
    defaultStyles: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    defaultProperties: {
      action: '',
      method: 'POST',
      enctype: 'application/x-www-form-urlencoded'
    }
  },
  {
    type: 'list',
    label: '列表',
    icon: '📃',
    category: 'data',
    properties: [
      { name: 'type', label: '列表类型', type: 'select', options: [
        { label: '无序列表', value: 'ul' },
        { label: '有序列表', value: 'ol' }
      ], default: 'ul' },
      { name: 'itemCount', label: '默认项数', type: 'number', default: 3 }
    ],
    defaultStyles: {
      margin: '0',
      paddingLeft: '20px'
    },
    defaultProperties: {
      type: 'ul',
      itemCount: 3
    }
  },
  {
    type: 'table',
    label: '表格',
    icon: '📊',
    category: 'data',
    properties: [
      { name: 'columns', label: '列数', type: 'number', default: 3 },
      { name: 'rows', label: '行数', type: 'number', default: 3 },
      { name: 'border', label: '边框', type: 'boolean', default: true },
      { name: 'striped', label: '斑马纹', type: 'boolean', default: false }
    ],
    defaultStyles: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    defaultProperties: {
      columns: 3,
      rows: 3,
      border: true,
      striped: false
    }
  },
  {
    type: 'chart',
    label: '图表',
    icon: '📈',
    category: 'data',
    properties: [
      { name: 'type', label: '图表类型', type: 'select', options: [
        { label: '折线图', value: 'line' },
        { label: '柱状图', value: 'bar' },
        { label: '饼图', value: 'pie' },
        { label: '雷达图', value: 'radar' },
        { label: '散点图', value: 'scatter' }
      ], default: 'line' },
      { name: 'title', label: '图表标题', type: 'text', default: '图表' },
      { name: 'height', label: '高度', type: 'number', default: 300 }
    ],
    defaultStyles: {
      width: '100%'
    },
    defaultProperties: {
      type: 'line',
      title: '图表',
      height: 300
    }
  },
  {
    type: 'tabs',
    label: '标签页',
    icon: '📑',
    category: 'layout',
    properties: [
      { name: 'tabCount', label: '标签数量', type: 'number', default: 3 },
      { name: 'activeIndex', label: '激活索引', type: 'number', default: 0 },
      { name: 'type', label: '样式类型', type: 'select', options: [
        { label: '卡片', value: 'card' },
        { label: '线条', value: 'line' }
      ], default: 'line' }
    ],
    defaultStyles: {
      width: '100%'
    },
    defaultProperties: {
      tabCount: 3,
      activeIndex: 0,
      type: 'line'
    }
  }
]

function getComponentsByCategory(category: string): ComponentDefinition[] {
  return componentDefinitions.filter(c => c.category === category)
}

function toggleCategory(category: string) {
  const index = expandedCategories.value.indexOf(category)
  if (index > -1) {
    expandedCategories.value.splice(index, 1)
  } else {
    expandedCategories.value.push(category)
  }
}

function handleDragStart(event: DragEvent, type: ComponentType) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('componentType', type)
    event.dataTransfer.effectAllowed = 'copy'
  }
}

function handleComponentClick(type: ComponentType) {
  emit('component-drag', type)
}
</script>

<style scoped>
.component-library {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.library-header {
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.library-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.category-section {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.category-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.category-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.toggle-icon {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  width: 12px;
}

.category-name {
  font-size: 0.875rem;
  font-weight: 500;
}

.category-components {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  padding: 0 0.75rem 0.75rem;
}

.component-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: grab;
  transition: all 0.2s;
}

.component-item:hover {
  background: rgba(74, 222, 128, 0.1);
  border-color: rgba(74, 222, 128, 0.3);
}

.component-item:active {
  cursor: grabbing;
}

.component-icon {
  font-size: 1.5rem;
}

.component-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
}
</style>
