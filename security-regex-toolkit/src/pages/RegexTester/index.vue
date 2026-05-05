<template>
  <div class="regex-tester-container">
    <div class="main-layout">
      <div class="left-panel">
        <div class="regex-input-section card">
          <div class="section-header">
            <h3>正则表达式</h3>
            <div class="regex-flags">
              <label class="flag-label">
                <input type="checkbox" v-model="flags.g" @change="updateFlags">
                <span>全局 (g)</span>
              </label>
              <label class="flag-label">
                <input type="checkbox" v-model="flags.i" @change="updateFlags">
                <span>忽略大小写 (i)</span>
              </label>
              <label class="flag-label">
                <input type="checkbox" v-model="flags.m" @change="updateFlags">
                <span>多行 (m)</span>
              </label>
              <label class="flag-label">
                <input type="checkbox" v-model="flags.s" @change="updateFlags">
                <span>点号匹配所有 (s)</span>
              </label>
            </div>
          </div>
          <div class="regex-input-wrapper">
            <span class="regex-delimiter">/</span>
            <input 
              type="text" 
              v-model="pattern" 
              placeholder="输入正则表达式..." 
              class="regex-input"
              @input="debounceMatch"
            />
            <span class="regex-delimiter">/</span>
            <span class="flags-display">{{ flagsString }}</span>
          </div>
          <div class="regex-actions">
            <button @click="saveToLibrary" class="btn btn-primary">
              ⭐ 收藏到常用库
            </button>
          </div>
        </div>

        <div class="test-text-section card">
          <div class="section-header">
            <h3>测试文本</h3>
            <div class="match-info">
              <span :class="['match-count', { error: hasError }]">
                匹配: {{ matchCount }}
              </span>
              <span v-if="errorMessage" class="error-message">{{ errorMessage }}</span>
            </div>
          </div>
          <textarea 
            v-model="testText" 
            placeholder="在这里输入测试文本..."
            class="test-textarea"
            @input="debounceMatch"
          ></textarea>
        </div>

        <div class="replace-section card" v-if="enableReplace">
          <div class="section-header">
            <h3>替换测试</h3>
            <label class="toggle-switch">
              <input type="checkbox" v-model="enableReplace">
              <span class="slider"></span>
              <span class="toggle-label">启用替换</span>
            </label>
          </div>
          <div class="replace-inputs">
            <div class="form-group">
              <label>替换为:</label>
              <input 
                type="text" 
                v-model="replaceText" 
                placeholder="输入替换字符串..."
                class="form-input"
                @input="debounceMatch"
              />
            </div>
            <div class="form-group">
              <label>替换结果:</label>
              <div class="result-preview">
                <pre><code>{{ replaceResult }}</code></pre>
              </div>
            </div>
          </div>
        </div>

        <div class="explanation-section card">
          <div class="section-header">
            <h3>正则解释</h3>
          </div>
          <div class="explanation-content">
            <p v-if="!pattern" class="placeholder">输入正则表达式后，这里将显示通俗易懂的解释...</p>
            <div v-else-if="explanations.length === 0" class="placeholder">无法解析此正则表达式...</div>
            <div v-else class="explanation-list">
              <div v-for="(item, index) in explanations" :key="index" class="explanation-item">
                <span class="explanation-token">{{ escapeHtml(item.token) }}</span>
                <span class="explanation-text">{{ item.explanation }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="right-panel" :class="{ open: showLibrary }">
        <div class="library-header">
          <h3>常用正则库</h3>
          <button @click="toggleLibrary" class="btn btn-secondary btn-icon">&times;</button>
        </div>
        <div class="library-filters">
          <input 
            type="text" 
            v-model="searchTerm" 
            placeholder="搜索正则表达式..."
            class="input"
            @input="filterPatterns"
          />
          <select v-model="selectedCategory" class="form-select" @change="filterPatterns">
            <option value="all">所有分类</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
        <div class="library-list">
          <div v-if="filteredPatterns.length === 0" class="empty-state">
            <p>暂无保存的正则表达式</p>
          </div>
          <div v-for="pattern in filteredPatterns" :key="pattern.id" class="pattern-item card">
            <div class="pattern-name">{{ pattern.name }}</div>
            <div class="pattern-pattern">/{{ pattern.pattern }}/{{ pattern.flags || '' }}</div>
            <div class="pattern-category">{{ pattern.category || '常规' }}</div>
            <div class="pattern-actions">
              <button @click="usePattern(pattern)" class="btn btn-secondary btn-small">使用</button>
              <button @click="editPattern(pattern)" class="btn btn-secondary btn-small">编辑</button>
              <button @click="deletePattern(pattern.id)" class="btn btn-danger btn-small">删除</button>
            </div>
          </div>
        </div>
        <div class="library-actions">
          <button @click="openAddModal" class="btn btn-primary">
            + 添加新正则
          </button>
          <button @click="toggleLibrary" class="btn btn-secondary">
            关闭
          </button>
        </div>
      </div>
    </div>

    <button v-if="!showLibrary" @click="toggleLibrary" class="floating-library-btn">
      📚 常用库
    </button>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingPatternId ? '编辑正则表达式' : '添加正则表达式' }}</h3>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>名称 *</label>
            <input type="text" v-model="formData.name" placeholder="例如: 邮箱地址" class="form-input" />
          </div>
          <div class="form-group">
            <label>正则表达式 *</label>
            <input type="text" v-model="formData.pattern" placeholder="例如: [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" class="form-input" />
          </div>
          <div class="form-group">
            <label>标志</label>
            <input type="text" v-model="formData.flags" placeholder="例如: gi" class="form-input" />
          </div>
          <div class="form-group">
            <label>分类</label>
            <select v-model="formData.category" class="form-select">
              <option value="general">常规</option>
              <option value="网络">网络</option>
              <option value="联系方式">联系方式</option>
              <option value="时间">时间</option>
              <option value="身份">身份</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea v-model="formData.description" rows="3" placeholder="描述这个正则表达式的用途..." class="form-textarea"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeModal" class="btn btn-secondary">取消</button>
          <button @click="savePattern" class="btn btn-primary" :disabled="!formData.name || !formData.pattern">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import * as api from '@/lib/api';
import type { RegexPattern, NewRegexPattern, RegexMatch } from '@/types';

const pattern = ref('');
const testText = ref('在这里输入测试文本...\n\n例如：\n联系邮箱：test@example.com\n手机号：13812345678\n网站：https://www.example.com\n日期：2024-01-15');
const flags = ref({ g: true, i: false, m: false, s: false });
const enableReplace = ref(false);
const replaceText = ref('');
const replaceResult = ref('');
const matchCount = ref(0);
const errorMessage = ref('');
const hasError = ref(false);
const currentMatches = ref<RegexMatch[]>([]);
const debounceTimer = ref<number | null>(null);

const showLibrary = ref(false);
const patterns = ref<RegexPattern[]>([]);
const searchTerm = ref('');
const selectedCategory = ref('all');
const categories = ref<string[]>([]);

const showModal = ref(false);
const editingPatternId = ref<number | null>(null);
const formData = ref<NewRegexPattern>({
  name: '',
  pattern: '',
  flags: '',
  category: 'general',
  description: '',
});

const flagsString = computed(() => {
  let result = '';
  if (flags.value.g) result += 'g';
  if (flags.value.i) result += 'i';
  if (flags.value.m) result += 'm';
  if (flags.value.s) result += 's';
  return result;
});

const filteredPatterns = computed(() => {
  if (!searchTerm.value && selectedCategory.value === 'all') {
    return patterns.value;
  }
  
  return patterns.value.filter(p => {
    const matchesSearch = !searchTerm.value || 
      p.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      p.pattern.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.value.toLowerCase()));
    
    const matchesCategory = selectedCategory.value === 'all' || p.category === selectedCategory.value;
    
    return matchesSearch && matchesCategory;
  });
});

const explanations = computed(() => {
  if (!pattern.value) return [];
  return explainRegex(pattern.value);
});

function updateFlags() {
  debounceMatch();
}

function debounceMatch() {
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value);
  }
  debounceTimer.value = window.setTimeout(() => {
    performMatch();
  }, 150);
}

function performMatch() {
  matchCount.value = 0;
  errorMessage.value = '';
  hasError.value = false;
  currentMatches.value = [];
  replaceResult.value = '';

  if (!pattern.value) {
    return;
  }

  try {
    const regex = new RegExp(pattern.value, flagsString.value);
    const matches: RegexMatch[] = [];
    let match;

    if (flags.value.g) {
      while ((match = regex.exec(testText.value)) !== null) {
        matches.push({
          text: match[0],
          index: match.index,
          groups: match.slice(1),
        });
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }
    } else {
      match = regex.exec(testText.value);
      if (match) {
        matches.push({
          text: match[0],
          index: match.index,
          groups: match.slice(1),
        });
      }
    }

    currentMatches.value = matches;
    matchCount.value = matches.length;

    if (enableReplace.value) {
      const regex = new RegExp(pattern.value, flagsString.value);
      replaceResult.value = testText.value.replace(regex, replaceText.value);
    }
  } catch (error) {
    hasError.value = true;
    errorMessage.value = error instanceof Error ? error.message : '正则表达式错误';
    matchCount.value = -1;
  }
}

function explainRegex(regexPattern: string): { token: string; explanation: string }[] {
  const explanations: { token: string; explanation: string }[] = [];
  let i = 0;

  while (i < regexPattern.length) {
    const char = regexPattern[i];
    const nextChar = regexPattern[i + 1];

    if (char === '\\' && nextChar) {
      const escapeSeq = char + nextChar;
      const explanation = getEscapeSequenceExplanation(nextChar);
      if (explanation) {
        explanations.push({ token: escapeSeq, explanation });
      } else {
        explanations.push({ token: escapeSeq, explanation: `字面字符 "${nextChar}"` });
      }
      i += 2;
      continue;
    }

    if (char === '.') {
      explanations.push({ token: '.', explanation: '匹配除换行符以外的任意单个字符' });
      i++;
      continue;
    }

    if (char === '*') {
      explanations.push({ token: '*', explanation: '匹配前面的字符 0 次或多次' });
      i++;
      continue;
    }

    if (char === '+') {
      explanations.push({ token: '+', explanation: '匹配前面的字符 1 次或多次' });
      i++;
      continue;
    }

    if (char === '?') {
      if (nextChar && ['*', '+', '?', '{'].includes(nextChar)) {
        explanations.push({ token: '?', explanation: '使前面的量词变为非贪婪模式' });
      } else {
        explanations.push({ token: '?', explanation: '匹配前面的字符 0 次或 1 次' });
      }
      i++;
      continue;
    }

    if (char === '^') {
      explanations.push({ token: '^', explanation: '匹配字符串的开头' });
      i++;
      continue;
    }

    if (char === '$') {
      explanations.push({ token: '$', explanation: '匹配字符串的结尾' });
      i++;
      continue;
    }

    if (char === '|') {
      explanations.push({ token: '|', explanation: '或操作，匹配左边或右边的表达式' });
      i++;
      continue;
    }

    if (char === '(') {
      if (nextChar === '?') {
        if (regexPattern[i + 2] === ':') {
          explanations.push({ token: '(?:', explanation: '非捕获分组，用于分组但不捕获匹配内容' });
          i += 3;
          continue;
        } else if (regexPattern[i + 2] === '=') {
          explanations.push({ token: '(?=', explanation: '正向先行断言，匹配后面跟随指定内容的位置' });
          i += 3;
          continue;
        } else if (regexPattern[i + 2] === '!') {
          explanations.push({ token: '(?!', explanation: '负向先行断言，匹配后面不跟随指定内容的位置' });
          i += 3;
          continue;
        } else if (regexPattern[i + 2] === '<') {
          if (regexPattern[i + 3] === '=') {
            explanations.push({ token: '(?<=', explanation: '正向后行断言，匹配前面是指定内容的位置' });
            i += 4;
            continue;
          } else if (regexPattern[i + 3] === '!') {
            explanations.push({ token: '(?<!', explanation: '负向后行断言，匹配前面不是指定内容的位置' });
            i += 4;
            continue;
          }
        }
      }
      explanations.push({ token: '(', explanation: '开始一个捕获分组' });
      i++;
      continue;
    }

    if (char === ')') {
      explanations.push({ token: ')', explanation: '结束分组' });
      i++;
      continue;
    }

    if (char === '[') {
      let endBracket = i + 1;
      while (endBracket < regexPattern.length && regexPattern[endBracket] !== ']') {
        if (regexPattern[endBracket] === '\\') endBracket++;
        endBracket++;
      }
      const charClass = regexPattern.substring(i, endBracket + 1);
      explanations.push({ 
        token: charClass, 
        explanation: `字符类，匹配方括号中的任意一个字符` 
      });
      i = endBracket + 1;
      continue;
    }

    if (char === '{') {
      let endBrace = i + 1;
      while (endBrace < regexPattern.length && regexPattern[endBrace] !== '}') {
        endBrace++;
      }
      const quantifier = regexPattern.substring(i, endBrace + 1);
      
      const match = quantifier.match(/\{(\d+)(?:,(\d*))?\}/);
      if (match) {
        const min = match[1];
        const max = match[2];
        if (max === undefined) {
          explanations.push({ token: quantifier, explanation: `精确匹配前面的字符 ${min} 次` });
        } else if (max === '') {
          explanations.push({ token: quantifier, explanation: `匹配前面的字符至少 ${min} 次` });
        } else {
          explanations.push({ token: quantifier, explanation: `匹配前面的字符 ${min} 到 ${max} 次` });
        }
      } else {
        explanations.push({ token: quantifier, explanation: '量词，指定匹配次数' });
      }
      i = endBrace + 1;
      continue;
    }

    explanations.push({ token: char, explanation: `字面字符 "${char}"` });
    i++;
  }

  return explanations;
}

function getEscapeSequenceExplanation(char: string): string | null {
  const escapeMap: Record<string, string> = {
    'd': '匹配任意数字 [0-9]',
    'D': '匹配任意非数字 [^0-9]',
    'w': '匹配任意单词字符 [a-zA-Z0-9_]',
    'W': '匹配任意非单词字符 [^a-zA-Z0-9_]',
    's': '匹配任意空白字符 (空格、制表符、换行符等)',
    'S': '匹配任意非空白字符',
    'b': '匹配单词边界',
    'B': '匹配非单词边界',
    'n': '匹配换行符',
    't': '匹配制表符 (Tab)',
    'r': '匹配回车符',
    'f': '匹配换页符',
    'v': '匹配垂直制表符',
    '0': '匹配空字符',
    'c': '控制字符 (后跟字母)',
    'x': '十六进制字符 (后跟两位数字)',
    'u': 'Unicode 字符 (后跟四位数字)',
  };
  return escapeMap[char] || null;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function toggleLibrary() {
  showLibrary.value = !showLibrary.value;
}

function filterPatterns() {
  updateCategories();
}

function updateCategories() {
  const cats = new Set<string>();
  patterns.value.forEach(p => {
    if (p.category) cats.add(p.category);
  });
  categories.value = Array.from(cats);
}

async function loadPatterns() {
  try {
    patterns.value = await api.getAllRegexPatterns();
    updateCategories();
  } catch (error) {
    console.error('Failed to load patterns:', error);
  }
}

function usePattern(p: RegexPattern) {
  pattern.value = p.pattern;
  
  flags.value.g = p.flags?.includes('g') || false;
  flags.value.i = p.flags?.includes('i') || false;
  flags.value.m = p.flags?.includes('m') || false;
  flags.value.s = p.flags?.includes('s') || false;
  
  debounceMatch();
  showLibrary.value = false;
}

function saveToLibrary() {
  if (!pattern.value) {
    alert('请先输入正则表达式');
    return;
  }
  
  editingPatternId.value = null;
  formData.value = {
    name: '',
    pattern: pattern.value,
    flags: flagsString.value,
    category: 'general',
    description: '',
  };
  showModal.value = true;
}

function editPattern(p: RegexPattern) {
  editingPatternId.value = p.id;
  formData.value = {
    name: p.name,
    pattern: p.pattern,
    flags: p.flags || '',
    category: p.category || 'general',
    description: p.description || '',
  };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editingPatternId.value = null;
}

function openAddModal() {
  editingPatternId.value = null;
  formData.value = {
    name: '',
    pattern: pattern.value,
    flags: flagsString.value,
    category: 'general',
    description: '',
  };
  showModal.value = true;
}

async function savePattern() {
  try {
    if (editingPatternId.value) {
      await api.updateRegexPattern(editingPatternId.value, formData.value);
    } else {
      await api.addRegexPattern(formData.value);
    }
    
    closeModal();
    await loadPatterns();
  } catch (error) {
    console.error('Failed to save pattern:', error);
    alert('保存失败，请重试');
  }
}

async function deletePattern(id: number) {
  if (!confirm('确定要删除这个正则表达式吗？')) return;
  
  try {
    await api.deleteRegexPattern(id);
    await loadPatterns();
  } catch (error) {
    console.error('Failed to delete pattern:', error);
    alert('删除失败，请重试');
  }
}

watch(pattern, debounceMatch);
watch(flags, debounceMatch, { deep: true });
watch(testText, debounceMatch);
watch(enableReplace, () => {
  if (enableReplace.value) {
    debounceMatch();
  }
});
watch(replaceText, debounceMatch);

onMounted(async () => {
  await loadPatterns();
  debounceMatch();
});
</script>

<style scoped>
.regex-tester-container {
  min-height: 100%;
}

.main-layout {
  display: flex;
  gap: 1.5rem;
  height: 100%;
}

.left-panel {
  flex: 1;
  min-width: 0;
}

.right-panel {
  width: 400px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  z-index: 100;
}

.right-panel.open {
  transform: translateX(0);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.section-header h3 {
  margin-bottom: 0;
  font-size: 1.1rem;
}

.regex-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.flag-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
}

.flag-label input[type="checkbox"] {
  accent-color: var(--accent);
}

.regex-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

.regex-delimiter {
  color: var(--text-muted);
  font-family: monospace;
  font-size: 1.2rem;
}

.regex-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--accent);
  font-family: monospace;
  font-size: 1.1rem;
  outline: none;
}

.flags-display {
  color: var(--text-muted);
  font-family: monospace;
  font-size: 1.1rem;
}

.regex-actions {
  display: flex;
  gap: 0.5rem;
}

.test-textarea {
  width: 100%;
  min-height: 200px;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  outline: none;
}

.test-textarea:focus {
  border-color: var(--accent);
}

.match-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.match-count {
  color: var(--accent);
  font-weight: 500;
}

.match-count.error {
  color: var(--danger);
}

.error-message {
  color: var(--danger);
  font-size: 0.9rem;
}

.toggle-switch {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.toggle-switch input[type="checkbox"] {
  display: none;
}

.toggle-switch .slider {
  width: 40px;
  height: 20px;
  background: var(--border);
  border-radius: 10px;
  position: relative;
  transition: background 0.3s;
}

.toggle-switch .slider::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  background: var(--text-secondary);
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 0.3s, background 0.3s;
}

.toggle-switch input[type="checkbox"]:checked + .slider {
  background: rgba(74, 222, 128, 0.3);
}

.toggle-switch input[type="checkbox"]:checked + .slider::before {
  transform: translateX(20px);
  background: var(--accent);
}

.toggle-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.replace-inputs {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-preview {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 1rem;
  max-height: 200px;
  overflow-y: auto;
}

.result-preview pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.result-preview code {
  color: var(--text-primary);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.5;
}

.explanation-content {
  min-height: 100px;
}

.placeholder {
  color: var(--text-muted);
  font-style: italic;
}

.explanation-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.explanation-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.explanation-token {
  font-family: 'Consolas', 'Monaco', monospace;
  color: var(--accent);
  background: rgba(74, 222, 128, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.95rem;
  white-space: nowrap;
}

.explanation-text {
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.4;
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.library-header h3 {
  margin-bottom: 0;
}

.btn-icon {
  padding: 0.5rem;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.library-filters {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}

.library-filters .input,
.library-filters .form-select {
  flex: 1;
  min-width: 120px;
}

.library-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pattern-item {
  padding: 1rem;
}

.pattern-name {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.pattern-pattern {
  font-family: 'Consolas', 'Monaco', monospace;
  color: var(--accent);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  word-break: break-all;
}

.pattern-category {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}

.pattern-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-small {
  padding: 0.375rem 0.75rem;
  font-size: 0.85rem;
}

.library-actions {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
}

.library-actions .btn {
  flex: 1;
}

.floating-library-btn {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  background: var(--accent);
  color: #000;
  border: none;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 50;
  transition: transform 0.2s, box-shadow 0.2s;
}

.floating-library-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

@media (max-width: 1024px) {
  .main-layout {
    flex-direction: column;
  }
  
  .right-panel {
    width: 100%;
    height: 60vh;
  }
  
  .regex-flags {
    width: 100%;
  }
}
</style>
