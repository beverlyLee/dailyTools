<template>
  <div class="markdown-preview" ref="previewContainer">
    <div class="preview-header">
      <span class="title">预览</span>
    </div>
    <div class="preview-content" v-html="renderedContent"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { marked } from 'marked'
import { linkApi } from '@/services/api'

const props = defineProps<{
  content: string
  currentPath?: string
}>()

const emit = defineEmits<{
  (e: 'navigate', path: string): void
}>()

const previewContainer = ref<HTMLDivElement | null>(null)

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: true,
  mangle: false
})

// 渲染内容
const renderedContent = computed(() => {
  if (!props.content) return ''
  
  let html = marked.parse(props.content) as string
  
  // 处理 Wiki Links - 先进行简单的客户端解析
  // 复杂的解析应该使用后端 API，但为了性能可以先在前端处理
  html = renderWikiLinks(html, props.currentPath || '')
  
  return html
})

// 简单的 Wiki Links 渲染（用于客户端快速预览）
function renderWikiLinks(html: string, currentPath: string): string {
  // 匹配 [[链接]] 格式
  // 注意：这里需要处理已经被 marked 转换的情况
  // 在预览中，我们需要在原始 Markdown 中处理 Wiki Links
  
  // 这个函数作为备用，实际应该在解析 Markdown 前处理
  return html
}

// 处理预览中的链接点击
function handleLinkClick(event: Event) {
  const target = event.target as HTMLElement
  
  // 检查是否是 Wiki Link
  if (target.classList.contains('wiki-link')) {
    event.preventDefault()
    
    const path = target.getAttribute('data-path')
    if (path) {
      emit('navigate', path)
    }
  }
  
  // 处理普通的锚点链接
  if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) {
    event.preventDefault()
    const anchor = target.getAttribute('href')
    if (anchor) {
      const element = previewContainer.value?.querySelector(anchor)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }
}

// 监听内容变化，重新渲染
watch(() => props.content, () => {
  // 内容变化会自动触发 computed 属性更新
}, { immediate: true })

// 添加点击事件监听
watch(previewContainer, (container) => {
  if (container) {
    container.addEventListener('click', handleLinkClick)
    
    return () => {
      container.removeEventListener('click', handleLinkClick)
    }
  }
})
</script>

<style scoped>
.markdown-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #1e1e1e;
  color: #d4d4d4;
  font-size: 14px;
}

.preview-header {
  padding: 8px 16px;
  border-bottom: 1px solid #2d2d2d;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #858585;
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  line-height: 1.6;
}

/* Markdown 样式 */
.preview-content :deep(h1),
.preview-content :deep(h2),
.preview-content :deep(h3),
.preview-content :deep(h4),
.preview-content :deep(h5),
.preview-content :deep(h6) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
  color: #e6e6e6;
}

.preview-content :deep(h1) {
  font-size: 2em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #2d2d2d;
}

.preview-content :deep(h2) {
  font-size: 1.5em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #2d2d2d;
}

.preview-content :deep(h3) {
  font-size: 1.25em;
}

.preview-content :deep(h4) {
  font-size: 1em;
}

.preview-content :deep(p) {
  margin-top: 0;
  margin-bottom: 16px;
}

.preview-content :deep(a) {
  color: #569cd6;
  text-decoration: none;
}

.preview-content :deep(a:hover) {
  text-decoration: underline;
}

.preview-content :deep(ul),
.preview-content :deep(ol) {
  padding-left: 2em;
  margin-top: 0;
  margin-bottom: 16px;
}

.preview-content :deep(li) {
  margin-bottom: 4px;
}

.preview-content :deep(code) {
  background-color: #2d2d2d;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: '"Fira Code", "Source Code Pro", Consolas, monospace';
  font-size: 0.9em;
  color: #ce9178;
}

.preview-content :deep(pre) {
  background-color: #2d2d2d;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  margin-top: 0;
  margin-bottom: 16px;
}

.preview-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: #d4d4d4;
}

.preview-content :deep(blockquote) {
  margin: 0;
  padding: 0 1em;
  color: #858585;
  border-left: 0.25em solid #3c3c3c;
  margin-bottom: 16px;
}

.preview-content :deep(table) {
  border-spacing: 0;
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
}

.preview-content :deep(th),
.preview-content :deep(td) {
  padding: 6px 13px;
  border: 1px solid #3c3c3c;
}

.preview-content :deep(th) {
  background-color: #2d2d2d;
  font-weight: 600;
}

.preview-content :deep(tr:nth-child(even)) {
  background-color: #252526;
}

.preview-content :deep(hr) {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: #2d2d2d;
  border: 0;
}

.preview-content :deep(img) {
  max-width: 100%;
  border-radius: 4px;
}

.preview-content :deep(.task-list-item) {
  list-style-type: none;
}

.preview-content :deep(input[type="checkbox"]) {
  margin-right: 0.5em;
}

/* Wiki Links 样式 */
.preview-content :deep(.wiki-link) {
  color: #569cd6;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 2px;
}

.preview-content :deep(.wiki-link:hover) {
  color: #9cdcfe;
  text-decoration-style: solid;
}

.preview-content :deep(.wiki-link.unresolved) {
  color: #f44747;
  cursor: pointer;
}

.preview-content :deep(.wiki-link.unresolved:hover) {
  color: #f14c4c;
}

/* 滚动条样式 */
.preview-content::-webkit-scrollbar {
  width: 10px;
}

.preview-content::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.preview-content::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
}

.preview-content::-webkit-scrollbar-thumb:hover {
  background: #4f4f4f;
}
</style>
