<template>
  <div class="monaco-editor-container" :style="containerStyle">
    <div ref="editorContainer" class="editor"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount, nextTick } from 'vue'
import * as monaco from 'monaco-editor'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'plaintext'
  },
  theme: {
    type: String,
    default: 'vs'
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  height: {
    type: [String, Number],
    default: '500px'
  },
  width: {
    type: [String, Number],
    default: '100%'
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const editorContainer = ref(null)
let editor = null

const containerStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height
}))

const initEditor = () => {
  if (!editorContainer.value) return

  editor = monaco.editor.create(editorContainer.value, {
    value: props.modelValue,
    language: props.language,
    theme: props.theme,
    readOnly: props.readOnly,
    automaticLayout: true,
    minimap: {
      enabled: false
    },
    fontSize: 16,
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    wordWrapColumn: 80,
    wrappingIndent: 'indent',
    renderLineHighlight: 'all',
    selectOnLineNumbers: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on'
  })

  editor.onDidChangeModelContent(() => {
    const value = editor.getValue()
    emit('update:modelValue', value)
    emit('change', value)
  })
}

const updateEditorValue = (value) => {
  if (editor && editor.getValue() !== value) {
    editor.setValue(value)
  }
}

const updateDecorations = (decorations) => {
  if (!editor) return

  const model = editor.getModel()
  if (!model) return

  const monacoDecorations = decorations.map(dec => ({
    range: new monaco.Range(dec.range.startLineNumber, dec.range.startColumn, dec.range.endLineNumber, dec.range.endColumn),
    options: dec.options
  }))

  editor.deltaDecorations([], monacoDecorations)
}

watch(() => props.modelValue, (newVal) => {
  updateEditorValue(newVal)
})

watch(() => props.language, (newLang) => {
  if (editor) {
    monaco.editor.setModelLanguage(editor.getModel(), newLang)
  }
})

watch(() => props.theme, (newTheme) => {
  if (editor) {
    monaco.editor.setTheme(newTheme)
  }
})

onMounted(() => {
  nextTick(() => {
    initEditor()
  })
})

onBeforeUnmount(() => {
  if (editor) {
    editor.dispose()
    editor = null
  }
})

defineExpose({
  getEditor: () => editor,
  getValue: () => editor?.getValue() || '',
  setValue: (value) => updateEditorValue(value),
  updateDecorations
})
</script>

<style scoped>
.monaco-editor-container {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.editor {
  width: 100%;
  height: 100%;
}
</style>
