<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>代码生成预览</h3>
        <button @click="$emit('close')" class="close-btn">✕</button>
      </div>
      
      <div class="modal-body">
        <div class="framework-selector">
          <button 
            v-for="framework in frameworks" 
            :key="framework.value"
            @click="selectedFramework = framework.value"
            :class="['framework-btn', { active: selectedFramework === framework.value }]"
          >
            {{ framework.label }}
          </button>
        </div>
        
        <div class="code-tabs">
          <button 
            v-for="tab in codeTabs" 
            :key="tab.value"
            @click="activeTab = tab.value"
            :class="['code-tab-btn', { active: activeTab === tab.value }]"
          >
            {{ tab.label }}
          </button>
        </div>
        
        <div class="code-container">
          <div class="code-header">
            <span class="file-name">{{ getFileName }}</span>
            <button @click="copyCurrentCode" class="copy-btn">
              📋 复制
            </button>
          </div>
          <pre class="code-content"><code>{{ currentCode }}</code></pre>
        </div>
        
        <div class="download-section">
          <button @click="downloadAll" class="download-btn">
            ⬇️ 下载所有文件
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { generateCode } from '../api'
import type { GeneratedCode } from '../types'

const props = defineProps<{
  pageId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const frameworks = [
  { value: 'vue' as const, label: 'Vue 3' },
  { value: 'react' as const, label: 'React' }
]

const codeTabs = [
  { value: 'html' as const, label: 'HTML' },
  { value: 'css' as const, label: 'CSS' },
  { value: 'javascript' as const, label: 'JavaScript' }
]

const selectedFramework = ref<'vue' | 'react'>('vue')
const activeTab = ref<'html' | 'css' | 'javascript'>('html')
const generatedCode = ref<GeneratedCode | null>(null)
const isLoading = ref(false)

const getFileName = computed(() => {
  const extMap: Record<string, string> = {
    html: selectedFramework.value === 'react' ? 'jsx' : 'vue',
    css: 'css',
    javascript: selectedFramework.value === 'react' ? 'jsx' : 'ts'
  }
  const baseName = selectedFramework.value === 'react' ? 'Page' : 'Page'
  return `${baseName}.${extMap[activeTab.value]}`
})

const currentCode = computed(() => {
  if (!generatedCode.value) return ''
  
  const codeMap: Record<string, string> = {
    html: generatedCode.value.html,
    css: generatedCode.value.css,
    javascript: generatedCode.value.javascript
  }
  
  return codeMap[activeTab.value] || ''
})

async function loadGeneratedCode() {
  isLoading.value = true
  try {
    generatedCode.value = await generateCode(props.pageId, selectedFramework.value)
  } catch (error) {
    console.error('生成代码失败:', error)
    generatedCode.value = {
      html: generateSampleHTML(),
      css: generateSampleCSS(),
      javascript: generateSampleJavaScript(),
      framework: selectedFramework.value
    }
  } finally {
    isLoading.value = false
  }
}

function generateSampleHTML(): string {
  if (selectedFramework.value === 'vue') {
    return `<template>
  <div class="page-container">
    <header class="page-header">
      <h1>{{ title }}</h1>
    </header>
    <main class="page-main">
      <div class="form-section">
        <input 
          v-model="formData.name" 
          type="text" 
          placeholder="姓名"
          class="form-input"
        />
        <button @click="handleSubmit" class="submit-btn">
          提交
        </button>
      </div>
    </main>
  </div>
</template>`
  }
  
  return `function Page() {
  const [title, setTitle] = useState('我的页面');
  const [formData, setFormData] = useState({ name: '' });

  const handleSubmit = () => {
    console.log('提交:', formData);
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>{title}</h1>
      </header>
      <main className="page-main">
        <div className="form-section">
          <input 
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            type="text" 
            placeholder="姓名"
            className="form-input"
          />
          <button onClick={handleSubmit} className="submit-btn">
            提交
          </button>
        </div>
      </main>
    </div>
  );
}

export default Page;`
}

function generateSampleCSS(): string {
  return `.page-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.page-header {
  padding: 2rem;
  text-align: center;
  color: white;
}

.page-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
}

.page-main {
  padding: 2rem;
}

.form-section {
  max-width: 500px;
  margin: 0 auto;
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.form-input {
  width: 100%;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
}

.submit-btn {
  width: 100%;
  margin-top: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}`
}

function generateSampleJavaScript(): string {
  const scriptEnd = '</scr' + 'ipt>';
  if (selectedFramework.value === 'vue') {
    return `<script setup>
import { ref, reactive } from 'vue';

const title = ref('我的页面');

const formData = reactive({
  name: ''
});

function handleSubmit() {
  console.log('表单数据:', formData);
  alert('提交成功！姓名: ' + formData.name);
}
${scriptEnd}`
  }
  
  return `import { useState } from 'react';

function Page() {
  const [title] = useState('我的页面');
  const [formData, setFormData] = useState({
    name: ''
  });

  const handleSubmit = () => {
    console.log('表单数据:', formData);
    alert('提交成功！姓名: ' + formData.name);
  };

  return (
    // ... 组件内容
  );
}

export default Page;`
}

function copyCurrentCode() {
  navigator.clipboard.writeText(currentCode.value)
    .then(() => {
      alert('代码已复制到剪贴板！')
    })
    .catch(() => {
      alert('复制失败')
    })
}

function downloadAll() {
  const files = [
    { name: getFileName, content: generatedCode.value?.html || '' },
    { name: 'style.css', content: generatedCode.value?.css || '' },
    { name: selectedFramework.value === 'react' ? 'Page.jsx' : 'script.ts', content: generatedCode.value?.javascript || '' }
  ]
  
  files.forEach(file => {
    const blob = new Blob([file.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })
}

watch(selectedFramework, () => {
  loadGeneratedCode()
})

onMounted(() => {
  loadGeneratedCode()
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
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
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
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
  font-size: 1.1rem;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
}

.framework-selector {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.framework-btn {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.framework-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.framework-btn.active {
  background: rgba(74, 222, 128, 0.2);
  border-color: rgba(74, 222, 128, 0.3);
  color: #4ade80;
}

.code-tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5rem;
}

.code-tab-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  border-radius: 6px 6px 0 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.code-tab-btn:hover {
  color: rgba(255, 255, 255, 0.7);
}

.code-tab-btn.active {
  background: rgba(255, 255, 255, 0.05);
  color: #4ade80;
  font-weight: 600;
}

.code-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #0a0a14;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.file-name {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
}

.copy-btn {
  padding: 0.375rem 0.75rem;
  background: rgba(74, 222, 128, 0.2);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 4px;
  color: #4ade80;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: rgba(74, 222, 128, 0.3);
}

.code-content {
  flex: 1;
  overflow: auto;
  margin: 0;
  padding: 1rem;
}

.code-content code {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  color: #e5e7eb;
  white-space: pre-wrap;
  word-break: break-all;
}

.download-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.download-btn {
  width: 100%;
  padding: 0.875rem 1.5rem;
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  border: none;
  border-radius: 8px;
  color: #000;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.download-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}
</style>
