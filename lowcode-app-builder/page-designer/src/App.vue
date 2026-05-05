<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-left">
        <span class="app-title">📐 页面设计器</span>
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
        <button @click="savePage" class="primary-btn">
          💾 保存
        </button>
        <button @click="showCodePreview = true" class="secondary-btn">
          📄 生成代码
        </button>
      </div>
    </header>

    <main class="main-content">
      <aside class="sidebar-left">
        <ComponentLibrary @component-drag="handleComponentDrag" />
      </aside>

      <section class="editor-area">
        <PageBuilder 
          ref="pageBuilderRef"
          @component-select="handleComponentSelect"
          @event-create="handleEventCreate"
        />
      </section>

      <aside class="sidebar-right">
        <div class="tabs">
          <button 
            :class="['tab-btn', { active: rightTab === 'properties' }]"
            @click="rightTab = 'properties'"
          >
            属性
          </button>
          <button 
            :class="['tab-btn', { active: rightTab === 'events' }]"
            @click="rightTab = 'events'"
          >
            事件
          </button>
        </div>
        
        <div class="tab-content">
          <PropertyPanel 
            v-if="rightTab === 'properties' && selectedComponent"
            :component="selectedComponent"
            @update-properties="handleUpdateProperties"
          />
          <EventPanel 
            v-else-if="rightTab === 'events' && selectedComponent"
            :component="selectedComponent"
            @add-event="handleAddEvent"
            @remove-event="handleRemoveEvent"
          />
          <div v-else class="empty-panel">
            <p>请选择一个组件</p>
          </div>
        </div>
      </aside>
    </main>

    <CodePreview 
      v-if="showCodePreview"
      :page-id="currentPageId"
      @close="showCodePreview = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ComponentLibrary from './components/ComponentLibrary.vue'
import PageBuilder from './components/PageBuilder.vue'
import PropertyPanel from './components/PropertyPanel.vue'
import EventPanel from './components/EventPanel.vue'
import CodePreview from './components/CodePreview.vue'
import type { Component, EventBinding } from './types'
import { savePage as savePageApi } from './api'

const currentView = ref<'designer' | 'preview'>('designer')
const rightTab = ref<'properties' | 'events'>('properties')
const showCodePreview = ref(false)
const currentPageId = ref('page-1')
const pageBuilderRef = ref<InstanceType<typeof PageBuilder> | null>(null)
const selectedComponent = ref<Component | null>(null)

const navItems = [
  { id: 'designer' as const, label: '设计', icon: '🎨' },
  { id: 'preview' as const, label: '预览', icon: '👁️' }
]

function handleComponentDrag(componentType: string) {
  if (pageBuilderRef.value) {
    pageBuilderRef.value.addComponent(componentType)
  }
}

function handleComponentSelect(component: Component) {
  selectedComponent.value = component
}

function handleUpdateProperties(properties: Record<string, any>) {
  if (pageBuilderRef.value && selectedComponent.value) {
    pageBuilderRef.value.updateComponentProperties(selectedComponent.value.id, properties)
  }
}

function handleEventCreate(event: EventBinding) {
  console.log('Event created:', event)
}

function handleAddEvent(event: EventBinding) {
  if (pageBuilderRef.value && selectedComponent.value) {
    pageBuilderRef.value.addEventBinding(selectedComponent.value.id, event)
  }
}

function handleRemoveEvent(eventId: string) {
  if (pageBuilderRef.value && selectedComponent.value) {
    pageBuilderRef.value.removeEventBinding(selectedComponent.value.id, eventId)
  }
}

async function savePage() {
  if (pageBuilderRef.value) {
    const pageData = pageBuilderRef.value.getPageData()
    try {
      await savePageApi({
        id: currentPageId.value,
        name: 'My Page',
        description: 'Created with LowCode Builder',
        content: pageData.content,
        components: pageData.components,
        events: pageData.events
      })
      alert('页面已保存！')
    } catch (error) {
      console.error('保存失败:', error)
      alert('保存失败')
    }
  }
}
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

.secondary-btn {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s;
}

.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar-left {
  width: 280px;
  background: rgba(255, 255, 255, 0.03);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  overflow-y: auto;
}

.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #0f0f1a;
}

.sidebar-right {
  width: 320px;
  background: rgba(255, 255, 255, 0.03);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
}

.tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tab-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.95rem;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.tab-btn.active {
  color: #4ade80;
  border-bottom: 2px solid #4ade80;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.empty-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: rgba(255, 255, 255, 0.5);
}
</style>
