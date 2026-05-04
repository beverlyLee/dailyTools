<template>
  <div class="code-editor" ref="editorContainer"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { EditorState, Compartment } from '@codemirror/state'
import { EditorView, basicSetup, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'

const props = defineProps<{
  modelValue: string
  readOnly?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (e: 'save'): void
}>()

const editorContainer = ref<HTMLDivElement | null>(null)
let editorView: EditorView | null = null
const language = new Compartment()
const readOnlyConfig = new Compartment()

// 自定义主题扩展
const theme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '14px',
    fontFamily: '"Fira Code", "Source Code Pro", Consolas, monospace',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: '"Fira Code", "Source Code Pro", Consolas, monospace',
    lineHeight: '1.6',
  },
  '.cm-content': {
    padding: '16px',
    caretColor: '#aeafad',
  },
  '.cm-line': {
    padding: '0 4px',
  },
  '.cm-gutters': {
    backgroundColor: '#1e1e1e',
    borderRight: '1px solid #2d2d2d',
    color: '#858585',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#2a2d2e',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  '.cm-cursor': {
    borderLeftColor: '#aeafad',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'rgba(255, 200, 0, 0.2)',
  },
  // Wiki Links 样式
  '.cm-wiki-link': {
    color: '#569cd6',
    textDecoration: 'underline',
  },
}, { dark: true })

// 自动保存节流
let saveTimeout: ReturnType<typeof setTimeout> | null = null

// 创建编辑器状态
function createEditorState(content: string, isReadOnly: boolean = false) {
  return EditorState.create({
    doc: content,
    extensions: [
      basicSetup,
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        ...completionKeymap,
        indentWithTab,
        {
          key: 'Mod-s',
          run: () => {
            emit('save')
            return true
          }
        }
      ]),
      lineNumbers.of(() => true),
      highlightActiveLineGutter.of(() => true),
      highlightActiveLine.of(() => true),
      history(),
      autocompletion(),
      highlightSelectionMatches(),
      language.of(markdown()),
      readOnlyConfig.of(EditorView.editable.of(!isReadOnly)),
      theme,
      oneDark,
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      // 内容变化监听
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newContent = update.state.doc.toString()
          emit('update:modelValue', newContent)
          emit('change', newContent)
          
          // 自动保存节流
          if (saveTimeout) {
            clearTimeout(saveTimeout)
          }
          saveTimeout = setTimeout(() => {
            // 可以在这里触发自动保存
          }, 2000)
        }
      })
    ]
  })
}

// 初始化编辑器
function initEditor() {
  if (!editorContainer.value) return
  
  if (editorView) {
    editorView.destroy()
  }
  
  const state = createEditorState(props.modelValue || '', props.readOnly || false)
  editorView = new EditorView({
    state,
    parent: editorContainer.value
  })
}

// 监听内容变化
watch(() => props.modelValue, (newValue) => {
  if (!editorView) return
  
  const currentContent = editorView.state.doc.toString()
  if (newValue !== currentContent) {
    const state = createEditorState(newValue, props.readOnly || false)
    editorView.setState(state)
  }
})

// 监听只读状态变化
watch(() => props.readOnly, (newValue) => {
  if (!editorView) return
  
  editorView.dispatch({
    effects: readOnlyConfig.reconfigure(EditorView.editable.of(!newValue))
  })
})

// 生命周期
onMounted(() => {
  initEditor()
})

onUnmounted(() => {
  if (editorView) {
    editorView.destroy()
    editorView = null
  }
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
})

// 暴露方法给父组件
defineExpose({
  focus: () => {
    editorView?.focus()
  },
  getSelection: () => {
    if (!editorView) return ''
    const { from, to } = editorView.state.selection.main
    return editorView.state.doc.sliceString(from, to)
  },
  insertText: (text: string) => {
    if (!editorView) return
    const { from, to } = editorView.state.selection.main
    editorView.dispatch({
      changes: { from, to, insert: text }
    })
  }
})
</script>

<style scoped>
.code-editor {
  width: 100%;
  height: 100%;
  background-color: #1e1e1e;
  overflow: hidden;
}

:deep(.cm-editor) {
  height: 100%;
}

:deep(.cm-scroller) {
  min-height: 100%;
}
</style>
