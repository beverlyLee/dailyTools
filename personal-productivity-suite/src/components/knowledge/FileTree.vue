<template>
  <div class="file-tree">
    <div 
      v-for="item in displayItems" 
      :key="item.path"
      class="tree-item"
    >
      <div 
        class="tree-item-header"
        @click="handleItemClick(item)"
        :class="{ active: isActiveItem(item) }"
      >
        <span class="expand-icon" v-if="item.is_dir">
          {{ isExpandedItem(item) ? '▼' : '▶' }}
        </span>
        <span class="file-icon">
          {{ item.is_dir ? '📁' : '📄' }}
        </span>
        <span class="file-name">{{ item.name }}</span>
      </div>
      <div 
        v-if="item.is_dir && isExpandedItem(item) && item.children && item.children.length > 0"
        class="tree-children"
      >
        <RecursiveTree 
          :items="item.children"
          :expanded-paths="expandedPaths"
          :selected-path="selectedPath"
          @select="(path, isDir) => $emit('select', path, isDir)"
          @toggle="handleToggle"
          @select-item="handleSelect"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineComponent, h } from 'vue'
import type { FileNode } from '@/types'

const props = defineProps<{
  items: FileNode | FileNode[] | null
}>()

const expandedPaths = ref<Set<string>>(new Set())
const selectedPath = ref<string>('')

const displayItems = computed(() => {
  if (!props.items) return []
  if (Array.isArray(props.items)) {
    return props.items.length > 0 ? props.items : []
  }
  if (props.items.children && props.items.children.length > 0) {
    return props.items.children
  }
  return [props.items]
})

function isExpandedItem(item: FileNode): boolean {
  return expandedPaths.value.has(item.path)
}

function isActiveItem(item: FileNode): boolean {
  return selectedPath.value === item.path && !item.is_dir
}

function handleToggle(path: string) {
  if (expandedPaths.value.has(path)) {
    expandedPaths.value.delete(path)
  } else {
    expandedPaths.value.add(path)
  }
}

function handleSelect(path: string) {
  selectedPath.value = path
}

function handleItemClick(item: FileNode) {
  if (item.is_dir) {
    handleToggle(item.path)
  } else {
    handleSelect(item.path)
    $emit('select', item.path, false)
  }
}

const RecursiveTree = defineComponent({
  name: 'RecursiveTree',
  props: {
    items: { type: Array as () => FileNode[], required: true },
    expandedPaths: { type: Set as () => Set<string>, required: true },
    selectedPath: { type: String, required: true }
  },
  emits: ['select', 'toggle', 'select-item'],
  setup(props, { emit }) {
    return () => h('div', { class: 'file-tree' }, 
      props.items.map((item: FileNode) => 
        h('div', { class: 'tree-item', key: item.path }, [
          h('div', { 
            class: [
              'tree-item-header',
              { active: props.selectedPath === item.path && !item.is_dir }
            ],
            onClick: () => {
              if (item.is_dir) {
                emit('toggle', item.path)
              } else {
                emit('select-item', item.path)
                emit('select', item.path, false)
              }
            }
          }, [
            item.is_dir ? h('span', { class: 'expand-icon' }, 
              props.expandedPaths.has(item.path) ? '▼' : '▶'
            ) : null,
            h('span', { class: 'file-icon' }, item.is_dir ? '📁' : '📄'),
            h('span', { class: 'file-name' }, item.name)
          ]),
          item.is_dir && props.expandedPaths.has(item.path) && item.children && item.children.length > 0
            ? h('div', { class: 'tree-children' }, [
                h(RecursiveTree, { 
                  items: item.children,
                  expandedPaths: props.expandedPaths,
                  selectedPath: props.selectedPath,
                  onSelect: (path: string, isDir: boolean) => emit('select', path, isDir),
                  onToggle: (path: string) => emit('toggle', path),
                  onSelectItem: (path: string) => emit('select-item', path)
                })
              ])
            : null
        ])
      )
    )
  }
})
</script>

<style scoped>
.file-tree {
  width: 100%;
}

.tree-item {
  width: 100%;
}

.tree-item-header {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  gap: 6px;
}

.tree-item-header:hover {
  background: #e9ecef;
}

.tree-item-header.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
}

.expand-icon {
  font-size: 10px;
  color: #6c757d;
  min-width: 12px;
  text-align: center;
}

.file-icon {
  font-size: 14px;
}

.file-name {
  font-size: 13px;
  color: #495057;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-children {
  margin-left: 20px;
}
</style>
