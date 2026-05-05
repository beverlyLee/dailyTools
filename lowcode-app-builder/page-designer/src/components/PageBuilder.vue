<template>
  <div class="page-builder">
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <button @click="undo" class="toolbar-btn" title="撤销">↶</button>
        <button @click="redo" class="toolbar-btn" title="重做">↷</button>
        <div class="toolbar-divider"></div>
        <button @click="clearCanvas" class="toolbar-btn" title="清空画布">🗑️</button>
      </div>
      <div class="toolbar-center">
        <button 
          v-for="device in devices" 
          :key="device.id"
          @click="setDevice(device.id)"
          :class="['device-btn', { active: currentDevice === device.id }]"
          :title="device.label"
        >
          {{ device.icon }}
        </button>
      </div>
      <div class="toolbar-right">
        <button @click="zoomIn" class="toolbar-btn" title="放大">➕</button>
        <span class="zoom-level">{{ zoomLevel }}%</span>
        <button @click="zoomOut" class="toolbar-btn" title="缩小">➖</button>
      </div>
    </div>
    
    <div class="canvas-container" ref="canvasContainer">
      <div ref="editorContainer" id="gjs-editor"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import grapesjs from 'grapesjs'
import 'grapesjs/dist/css/grapes.min.css'
import 'grapesjs-blocks-basic'
import 'grapesjs-preset-webpage'
import 'grapesjs-preset-webpage/dist/grapesjs-preset-webpage.min.css'
import type { Component, EventBinding, ComponentType } from '../types'

const emit = defineEmits<{
  (e: 'component-select', component: Component): void
  (e: 'event-create', event: EventBinding): void
}>()

const canvasContainer = ref<HTMLElement | null>(null)
const editorContainer = ref<HTMLElement | null>(null)
const currentDevice = ref('desktop')
const zoomLevel = ref(100)
const editor = ref<any>(null)
const selectedComponentData = ref<Component | null>(null)

const devices = [
  { id: 'desktop', label: '桌面', icon: '🖥️' },
  { id: 'tablet', label: '平板', icon: '📱' },
  { id: 'mobile', label: '手机', icon: '📲' }
]

const componentIdMap = new Map<string, Component>()

function initEditor() {
  if (!editorContainer.value) return

  editor.value = grapesjs.init({
    container: editorContainer.value,
    height: '100%',
    width: '100%',
    fromElement: false,
    showOffsets: true,
    noticeOnUnload: false,
    storageManager: { type: 'none' },
    undoManager: {
      trackSelection: true
    },
    plugins: ['gjs-blocks-basic', 'grapesjs-preset-webpage'],
    pluginsOpts: {
      'gjs-preset-webpage': {
        blocksBasicOpts: {
          flexGrid: true
        }
      }
    },
    blockManager: {
      appendTo: '#blocks',
      blocks: []
    },
    layerManager: {
      appendTo: '#layers'
    },
    styleManager: {
      appendTo: '#style-manager-container',
      sectors: [
        {
          name: 'General',
          open: false,
          buildProps: ['display', 'float', 'position', 'top', 'right', 'left', 'bottom']
        },
        {
          name: 'Flex',
          open: false,
          buildProps: ['flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content', 'order', 'flex-basis', 'flex-grow', 'flex-shrink', 'align-self']
        },
        {
          name: 'Dimension',
          open: false,
          buildProps: ['width', 'height', 'max-width', 'min-height', 'margin', 'padding']
        },
        {
          name: 'Typography',
          open: false,
          buildProps: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-shadow', 'text-align']
        },
        {
          name: 'Decorations',
          open: false,
          buildProps: ['border-radius-c', 'background-color', 'border-radius', 'border', 'box-shadow', 'background']
        },
        {
          name: 'Extra',
          open: false,
          buildProps: ['transition', 'transform']
        }
      ]
    },
    traitManager: {
      appendTo: '#traits-container'
    },
    deviceManager: {
      devices: [
        {
          name: 'Desktop',
          width: '',
          widthMedia: ''
        },
        {
          name: 'Tablet',
          width: '768px',
          widthMedia: '992px'
        },
        {
          name: 'Mobile',
          width: '320px',
          widthMedia: '576px'
        }
      ]
    },
    panels: {
      defaults: [
        {
          id: 'layers',
          el: '#layers',
          resizable: {
            tc: 0,
            cl: 1,
            cr: 0,
            bc: 0,
            keyWidth: 'flex-basis'
          }
        }
      ]
    }
  })

  editor.value.on('component:selected', (comp: any) => {
    handleComponentSelect(comp)
  })

  editor.value.on('component:add', (comp: any) => {
    handleComponentAdd(comp)
  })

  editor.value.on('component:remove', (comp: any) => {
    handleComponentRemove(comp)
  })

  editor.value.on('component:update', (comp: any) => {
    handleComponentUpdate(comp)
  })

  registerCustomBlocks()
  registerCustomComponents()
}

function registerCustomBlocks() {
  if (!editor.value) return

  const blockManager = editor.value.BlockManager

  blockManager.add('custom-input', {
    label: '输入框',
    category: '表单',
    content: {
      type: 'custom-input',
      tagName: 'input',
      attributes: {
        type: 'text',
        placeholder: '请输入',
        'data-custom-component': 'input'
      },
      components: [],
      styles: {
        padding: '8px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        fontSize: '14px'
      }
    }
  })

  blockManager.add('custom-button', {
    label: '按钮',
    category: '表单',
    content: {
      type: 'custom-button',
      tagName: 'button',
      attributes: {
        'data-custom-component': 'button'
      },
      components: [{ type: 'textnode', content: '按钮' }],
      styles: {
        padding: '8px 16px',
        backgroundColor: '#4ade80',
        color: '#000',
        border: 'none',
        borderRadius: '4px',
        fontSize: '14px',
        cursor: 'pointer'
      }
    }
  })

  blockManager.add('custom-card', {
    label: '卡片',
    category: '展示',
    content: {
      type: 'custom-card',
      tagName: 'div',
      attributes: {
        'data-custom-component': 'card'
      },
      components: [
        {
          tagName: 'div',
          components: [{ type: 'textnode', content: '卡片标题' }],
          styles: {
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '8px'
          }
        },
        {
          tagName: 'div',
          components: [{ type: 'textnode', content: '这是卡片内容' }],
          styles: {
            fontSize: '14px',
            color: '#666'
          }
        }
      ],
      styles: {
        padding: '16px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }
    }
  })

  blockManager.add('custom-chart', {
    label: '图表',
    category: '数据',
    content: {
      type: 'custom-chart',
      tagName: 'div',
      attributes: {
        'data-custom-component': 'chart'
      },
      components: [{ type: 'textnode', content: '图表区域' }],
      styles: {
        width: '100%',
        height: '300px',
        backgroundColor: '#f9fafb',
        border: '2px dashed #d1d5db',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9ca3af'
      }
    }
  })
}

function registerCustomComponents() {
  if (!editor.value) return

  const domComponents = editor.value.DomComponents

  domComponents.addType('custom-input', {
    isComponent: (el: HTMLElement) => el.dataset?.customComponent === 'input',
    model: {
      defaults: {
        tagName: 'input',
        traits: [
          {
            type: 'text',
            label: '占位符',
            name: 'placeholder'
          },
          {
            type: 'select',
            label: '输入类型',
            name: 'type',
            options: [
              { value: 'text', name: '文本' },
              { value: 'password', name: '密码' },
              { value: 'email', name: '邮箱' },
              { value: 'number', name: '数字' }
            ]
          },
          {
            type: 'checkbox',
            label: '禁用',
            name: 'disabled'
          }
        ]
      }
    }
  })

  domComponents.addType('custom-button', {
    isComponent: (el: HTMLElement) => el.dataset?.customComponent === 'button',
    model: {
      defaults: {
        tagName: 'button',
        traits: [
          {
            type: 'text',
            label: '按钮文本',
            name: 'text'
          },
          {
            type: 'select',
            label: '按钮类型',
            name: 'btnType',
            options: [
              { value: 'primary', name: '主按钮' },
              { value: 'secondary', name: '次要按钮' },
              { value: 'danger', name: '危险按钮' }
            ]
          },
          {
            type: 'checkbox',
            label: '禁用',
            name: 'disabled'
          }
        ]
      }
    }
  })

  domComponents.addType('custom-card', {
    isComponent: (el: HTMLElement) => el.dataset?.customComponent === 'card',
    model: {
      defaults: {
        tagName: 'div',
        traits: [
          {
            type: 'text',
            label: '卡片标题',
            name: 'title'
          },
          {
            type: 'checkbox',
            label: '显示阴影',
            name: 'shadow'
          },
          {
            type: 'checkbox',
            label: '显示边框',
            name: 'border'
          }
        ]
      }
    }
  })

  domComponents.addType('custom-chart', {
    isComponent: (el: HTMLElement) => el.dataset?.customComponent === 'chart',
    model: {
      defaults: {
        tagName: 'div',
        traits: [
          {
            type: 'select',
            label: '图表类型',
            name: 'chartType',
            options: [
              { value: 'line', name: '折线图' },
              { value: 'bar', name: '柱状图' },
              { value: 'pie', name: '饼图' },
              { value: 'radar', name: '雷达图' },
              { value: 'scatter', name: '散点图' }
            ]
          },
          {
            type: 'text',
            label: '图表标题',
            name: 'title'
          },
          {
            type: 'number',
            label: '高度',
            name: 'height'
          }
        ]
      }
    }
  })
}

function handleComponentSelect(comp: any) {
  if (!comp) {
    selectedComponentData.value = null
    return
  }

  const componentType = getComponentType(comp)
  const component: Component = {
    id: comp.getId(),
    type: componentType,
    properties: {
      ...comp.getAttributes(),
      ...comp.get('traits')
    },
    styles: comp.getStyle(),
    children: []
  }

  selectedComponentData.value = component
  componentIdMap.set(component.id, component)
  emit('component-select', component)
}

function handleComponentAdd(comp: any) {
  const componentType = getComponentType(comp)
  const component: Component = {
    id: comp.getId(),
    type: componentType,
    properties: {
      ...comp.getAttributes()
    },
    styles: comp.getStyle(),
    children: []
  }

  componentIdMap.set(component.id, component)
}

function handleComponentRemove(comp: any) {
  const id = comp.getId()
  componentIdMap.delete(id)
}

function handleComponentUpdate(comp: any) {
  const id = comp.getId()
  const existing = componentIdMap.get(id)
  if (existing) {
    existing.properties = {
      ...existing.properties,
      ...comp.getAttributes()
    }
    existing.styles = comp.getStyle()
  }
}

function getComponentType(comp: any): ComponentType {
  const dataType = comp.get('attributes')?.['data-custom-component']
  
  if (dataType) {
    return dataType as ComponentType
  }

  const tagName = comp.get('tagName')?.toLowerCase()
  const type = comp.get('type')

  if (type === 'text' || tagName === 'p' || tagName === 'span' || tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
    return 'text'
  }
  if (tagName === 'input') return 'input'
  if (tagName === 'button') return 'button'
  if (tagName === 'img') return 'image'
  if (tagName === 'form') return 'form'
  if (tagName === 'ul' || tagName === 'ol') return 'list'
  if (tagName === 'table') return 'table'
  if (tagName === 'select') return 'select'
  if (tagName === 'textarea') return 'textarea'
  if (tagName === 'div' || type === 'default' || type === 'wrapper') return 'container'

  return 'container'
}

function addComponent(componentType: ComponentType) {
  if (!editor.value) return

  const domComponents = editor.value.DomComponents
  const wrapper = domComponents.getWrapper()
  
  if (!wrapper) return

  const content = getComponentContent(componentType)
  const newComponent = domComponents.addType(componentType, {
    model: {
      defaults: content
    }
  })

  wrapper.append(content)
}

function getComponentContent(type: ComponentType): any {
  switch (type) {
    case 'input':
      return {
        type: 'custom-input',
        tagName: 'input',
        attributes: {
          type: 'text',
          placeholder: '请输入',
          'data-custom-component': 'input'
        },
        styles: {
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontSize: '14px'
        }
      }
    case 'button':
      return {
        type: 'custom-button',
        tagName: 'button',
        attributes: {
          'data-custom-component': 'button'
        },
        components: [{ type: 'textnode', content: '按钮' }],
        styles: {
          padding: '8px 16px',
          backgroundColor: '#4ade80',
          color: '#000',
          border: 'none',
          borderRadius: '4px',
          fontSize: '14px',
          cursor: 'pointer'
        }
      }
    case 'text':
      return {
        type: 'text',
        tagName: 'p',
        components: [{ type: 'textnode', content: '文本内容' }],
        styles: {
          fontSize: '14px',
          lineHeight: '1.5',
          margin: '0'
        }
      }
    case 'container':
      return {
        type: 'default',
        tagName: 'div',
        components: [],
        styles: {
          padding: '16px',
          minHeight: '50px',
          border: '1px dashed #d1d5db',
          borderRadius: '4px'
        }
      }
    case 'card':
      return {
        type: 'custom-card',
        tagName: 'div',
        attributes: {
          'data-custom-component': 'card'
        },
        components: [
          {
            tagName: 'div',
            components: [{ type: 'textnode', content: '卡片标题' }],
            styles: {
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '8px'
            }
          },
          {
            tagName: 'div',
            components: [{ type: 'textnode', content: '这是卡片内容' }],
            styles: {
              fontSize: '14px',
              color: '#666'
            }
          }
        ],
        styles: {
          padding: '16px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }
      }
    case 'chart':
      return {
        type: 'custom-chart',
        tagName: 'div',
        attributes: {
          'data-custom-component': 'chart'
        },
        components: [{ type: 'textnode', content: '图表区域' }],
        styles: {
          width: '100%',
          height: '300px',
          backgroundColor: '#f9fafb',
          border: '2px dashed #d1d5db',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af'
        }
      }
    default:
      return {
        type: 'default',
        tagName: 'div',
        components: []
      }
  }
}

function updateComponentProperties(componentId: string, properties: Record<string, any>) {
  if (!editor.value) return

  const domComponents = editor.value.DomComponents
  const component = domComponents.getById(componentId)
  
  if (component) {
    component.setAttributes(properties)
  }
}

function addEventBinding(componentId: string, event: EventBinding) {
  console.log('Adding event binding:', componentId, event)
  emit('event-create', event)
}

function removeEventBinding(componentId: string, eventId: string) {
  console.log('Removing event binding:', componentId, eventId)
}

function getPageData() {
  if (!editor.value) {
    return {
      content: {},
      components: Array.from(componentIdMap.values()),
      events: []
    }
  }

  const html = editor.value.getHtml()
  const css = editor.value.getCss()
  const js = editor.value.getJs()

  return {
    content: {
      html,
      css,
      js
    },
    components: Array.from(componentIdMap.values()),
    events: []
  }
}

function undo() {
  if (editor.value) {
    editor.value.UndoManager.undo()
  }
}

function redo() {
  if (editor.value) {
    editor.value.UndoManager.redo()
  }
}

function clearCanvas() {
  if (!editor.value) return
  
  const domComponents = editor.value.DomComponents
  const wrapper = domComponents.getWrapper()
  
  if (wrapper && confirm('确定要清空画布吗？')) {
    wrapper.empty()
    componentIdMap.clear()
  }
}

function setDevice(deviceId: string) {
  if (!editor.value) return
  
  const deviceManager = editor.value.DeviceManager
  deviceManager.select(deviceId)
  currentDevice.value = deviceId
}

function zoomIn() {
  if (zoomLevel.value < 200) {
    zoomLevel.value += 10
    updateZoom()
  }
}

function zoomOut() {
  if (zoomLevel.value > 50) {
    zoomLevel.value -= 10
    updateZoom()
  }
}

function updateZoom() {
  if (canvasContainer.value) {
    canvasContainer.value.style.transform = `scale(${zoomLevel.value / 100})`
    canvasContainer.value.style.transformOrigin = 'center top'
  }
}

onMounted(() => {
  initEditor()
})

onUnmounted(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})

defineExpose({
  addComponent,
  updateComponentProperties,
  addEventBinding,
  removeEventBinding,
  getPageData,
  undo,
  redo,
  clearCanvas
})
</script>

<style scoped>
.page-builder {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.toolbar-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 0.5rem;
}

.device-btn {
  width: 36px;
  height: 32px;
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

.device-btn:hover {
  color: rgba(255, 255, 255, 0.7);
}

.device-btn.active {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.zoom-level {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  min-width: 40px;
  text-align: center;
}

.canvas-container {
  flex: 1;
  overflow: auto;
  padding: 1rem;
  background: #0a0a14;
}

#gjs-editor {
  height: 100%;
  min-height: 600px;
}

:deep(#gjs-editor .gjs-cv-canvas) {
  background: #ffffff;
}

:deep(#gjs-editor .gjs-blocks-cs) {
  background: #1a1a2e;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(#gjs-editor .gjs-pn-panel) {
  background: #1a1a2e;
}

:deep(#gjs-editor .gjs-pn-btn) {
  color: rgba(255, 255, 255, 0.7);
}

:deep(#gjs-editor .gjs-pn-btn:hover) {
  color: #fff;
}

:deep(#gjs-editor .gjs-field) {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: #fff;
}

:deep(#gjs-editor .gjs-sm-sector-title) {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
}

:deep(#gjs-editor .gjs-sm-property) {
  color: rgba(255, 255, 255, 0.7);
}
</style>
