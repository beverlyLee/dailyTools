<template>
  <div class="password-manager-container">
    <!-- 锁定界面 -->
    <div v-if="isLocked" class="lock-screen">
      <div class="lock-container">
        <div class="lock-icon">🔐</div>
        <h2>本地密码管理器</h2>
        
        <div v-if="!isInitialized" class="setup-section">
          <p class="setup-text">首次使用，请设置主密码</p>
          <input
            v-model="newMasterPassword"
            type="password"
            placeholder="输入主密码"
            class="password-input"
            @keyup.enter="handleSetMasterPassword"
          />
          <input
            v-model="confirmMasterPassword"
            type="password"
            placeholder="确认主密码"
            class="password-input"
            @keyup.enter="handleSetMasterPassword"
          />
          <button
            @click="handleSetMasterPassword"
            class="btn btn-primary"
            :disabled="!newMasterPassword || !confirmMasterPassword"
          >
            设置主密码
          </button>
          <p v-if="setupError" class="error-text">{{ setupError }}</p>
        </div>
        
        <div v-else class="unlock-section">
          <p class="unlock-text">请输入主密码解锁</p>
          <input
            v-model="masterPassword"
            type="password"
            placeholder="主密码"
            class="password-input"
            @keyup.enter="handleUnlock"
          />
          <button
            @click="handleUnlock"
            class="btn btn-primary"
            :disabled="!masterPassword"
          >
            解锁
          </button>
          <p v-if="unlockError" class="error-text">{{ unlockError }}</p>
        </div>
      </div>
    </div>
    
    <!-- 主界面 -->
    <div v-else class="main-app">
      <!-- 顶部导航 -->
      <div class="sub-nav">
        <button
          v-for="item in navItems"
          :key="item.id"
          @click="currentView = item.id"
          :class="['nav-btn', { active: currentView === item.id }]"
        >
          {{ item.icon }} {{ item.label }}
        </button>
      </div>
      
      <!-- 主内容区 -->
      <div class="main-content">
        <!-- 保险库视图 -->
        <div v-if="currentView === 'vault'" class="vault-view">
          <div class="vault-header">
            <h3 class="section-title">我的密码</h3>
            <button @click="openAddModal" class="btn btn-primary">
              ➕ 添加密码
            </button>
          </div>
          
          <div class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索密码..."
              class="input"
            />
          </div>
          
          <div v-if="filteredEntries.length === 0" class="empty-state">
            <div class="empty-icon">📭</div>
            <p>暂无密码条目</p>
            <p class="empty-hint">点击上方按钮添加第一个密码</p>
          </div>
          
          <div v-else class="password-list">
            <div
              v-for="entry in filteredEntries"
              :key="entry.id"
              class="password-item card"
            >
              <div class="item-header">
                <span class="item-title">{{ entry.title }}</span>
                <div class="item-actions">
                  <button @click="copyPassword(entry.password)" class="action-btn" title="复制密码">
                    📋
                  </button>
                  <button @click="openEditModal(entry)" class="action-btn" title="编辑">
                    ✏️
                  </button>
                  <button @click="handleDeleteEntry(entry.id)" class="action-btn delete" title="删除">
                    🗑️
                  </button>
                </div>
              </div>
              <div class="item-details">
                <div class="detail-row">
                  <span class="detail-label">用户名:</span>
                  <span class="detail-value">{{ entry.username }}</span>
                </div>
                <div v-if="entry.url" class="detail-row">
                  <span class="detail-label">网址:</span>
                  <span class="detail-value">{{ entry.url }}</span>
                </div>
                <div v-if="entry.category" class="detail-row">
                  <span class="detail-label">分类:</span>
                  <span class="detail-value">{{ entry.category }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 密码生成器视图 -->
        <div v-else-if="currentView === 'generator'" class="generator-view">
          <h3 class="section-title">密码生成器</h3>
          
          <div class="generator-section card">
            <h4>随机密码</h4>
            
            <div class="generated-result">
              <span class="result-text">{{ generatedPassword }}</span>
              <button @click="copyPassword(generatedPassword)" class="btn btn-secondary">
                📋 复制
              </button>
            </div>
            
            <div class="generator-options">
              <div class="option-group">
                <label>长度: {{ passwordLength }}</label>
                <input
                  v-model.number="passwordLength"
                  type="range"
                  min="8"
                  max="64"
                  class="slider"
                />
              </div>
              
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input v-model="includeUppercase" type="checkbox" />
                  大写字母 (A-Z)
                </label>
                <label class="checkbox-label">
                  <input v-model="includeLowercase" type="checkbox" />
                  小写字母 (a-z)
                </label>
                <label class="checkbox-label">
                  <input v-model="includeNumbers" type="checkbox" />
                  数字 (0-9)
                </label>
                <label class="checkbox-label">
                  <input v-model="includeSymbols" type="checkbox" />
                  特殊符号 (!@#$%)
                </label>
              </div>
              
              <button @click="handleGeneratePassword" class="btn btn-primary">
                🔄 生成密码
              </button>
            </div>
            
            <div v-if="generatedPassword" class="strength-indicator">
              <div class="strength-label">
                密码强度: 
                <span :class="['strength-value', strengthClass]">
                  {{ passwordStrength?.label || '未知' }}
                </span>
              </div>
              <div class="strength-bar">
                <div
                  :class="['strength-fill', strengthClass]"
                  :style="{ width: (passwordStrength?.score || 0) * 10 + '%' }"
                ></div>
              </div>
              <div v-if="passwordStrength?.issues.length" class="strength-issues">
                <p class="issues-title">问题:</p>
                <ul>
                  <li v-for="(issue, index) in passwordStrength.issues" :key="index">
                    ⚠️ {{ issue }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="generator-section card">
            <h4>Passphrase (助记词)</h4>
            
            <div class="generated-result">
              <span class="result-text">{{ generatedPassphrase }}</span>
              <button @click="copyPassword(generatedPassphrase)" class="btn btn-secondary">
                📋 复制
              </button>
            </div>
            
            <div class="generator-options">
              <div class="option-group">
                <label>单词数量: {{ passphraseWordCount }}</label>
                <input
                  v-model.number="passphraseWordCount"
                  type="range"
                  min="3"
                  max="8"
                  class="slider"
                />
              </div>
              
              <div class="option-group">
                <label>分隔符:</label>
                <select v-model="passphraseSeparator" class="form-select">
                  <option value="-">- (连字符)</option>
                  <option value="_">_ (下划线)</option>
                  <option value=".">. (点号)</option>
                  <option value=" "> (空格)</option>
                </select>
              </div>
              
              <button @click="handleGeneratePassphrase" class="btn btn-primary">
                🔄 生成 Passphrase
              </button>
            </div>
          </div>
        </div>
        
        <!-- 安全审计视图 -->
        <div v-else-if="currentView === 'audit'" class="audit-view">
          <div class="audit-header">
            <h3 class="section-title">安全审计</h3>
            <button @click="handleRunAudit" class="btn btn-primary" :disabled="isRunningAudit">
              {{ isRunningAudit ? '⏳ 审计中...' : '🔍 运行审计' }}
            </button>
          </div>
          
          <div v-if="!auditReport" class="empty-state">
            <div class="empty-icon">🔍</div>
            <p>尚未运行安全审计</p>
            <p class="empty-hint">点击上方按钮开始审计您的密码安全</p>
          </div>
          
          <div v-else class="audit-results">
            <div class="audit-overview">
              <div class="overview-card card">
                <div class="overview-value">{{ auditReport.total_entries }}</div>
                <div class="overview-label">总密码数</div>
              </div>
              <div class="overview-card card warning">
                <div class="overview-value">{{ auditReport.weak_passwords.length }}</div>
                <div class="overview-label">弱密码</div>
              </div>
              <div class="overview-card card warning">
                <div class="overview-value">{{ auditReport.duplicate_passwords.length }}</div>
                <div class="overview-label">重复密码</div>
              </div>
              <div class="overview-card card danger">
                <div class="overview-value">{{ auditReport.pwned_passwords.length }}</div>
                <div class="overview-label">已泄露密码</div>
              </div>
            </div>
            
            <div v-if="auditReport.weak_passwords.length > 0" class="audit-section">
              <h4>⚠️ 弱密码 ({{ auditReport.weak_passwords.length }})</h4>
              <div class="audit-list">
                <div
                  v-for="entry in auditReport.weak_passwords"
                  :key="entry.id"
                  class="audit-item card"
                >
                  <span class="item-title">{{ entry.title }}</span>
                  <span class="item-username">{{ entry.username }}</span>
                </div>
              </div>
            </div>
            
            <div v-if="auditReport.duplicate_passwords.length > 0" class="audit-section">
              <h4>⚠️ 重复密码 ({{ auditReport.duplicate_passwords.length }})</h4>
              <div
                v-for="(group, index) in auditReport.duplicate_passwords"
                :key="index"
                class="audit-group card"
              >
                <p class="group-title">共有 {{ group.entries.length }} 个条目使用相同密码:</p>
                <div class="audit-list">
                  <div
                    v-for="entry in group.entries"
                    :key="entry.id"
                    class="audit-item"
                  >
                    <span class="item-title">{{ entry.title }}</span>
                    <span class="item-username">{{ entry.username }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="auditReport.pwned_passwords.length > 0" class="audit-section">
              <h4>🚨 已泄露密码 ({{ auditReport.pwned_passwords.length }})</h4>
              <p class="warning-text">这些密码已在数据泄露中被发现，请立即修改！</p>
              <div class="audit-list">
                <div
                  v-for="entry in auditReport.pwned_passwords"
                  :key="entry.id"
                  class="audit-item card danger"
                >
                  <span class="item-title">{{ entry.title }}</span>
                  <span class="item-username">{{ entry.username }}</span>
                </div>
              </div>
            </div>
            
            <div class="audit-footer">
              上次审计时间: {{ formatDate(auditReport.last_audit) }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 添加/编辑密码模态框 -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingEntry ? '编辑密码' : '添加密码' }}</h3>
          <button @click="closeModal" class="close-btn">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>标题 *</label>
            <input v-model="formData.title" type="text" placeholder="例如: Gmail" class="form-input" />
          </div>
          
          <div class="form-group">
            <label>用户名/邮箱 *</label>
            <input v-model="formData.username" type="text" placeholder="例如: user@example.com" class="form-input" />
          </div>
          
          <div class="form-group">
            <label>密码 *</label>
            <div class="password-input-group">
              <input
                v-model="formData.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="密码"
                class="form-input"
              />
              <button @click="showPassword = !showPassword" class="toggle-btn">
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
              <button @click="generateAndFillPassword" class="toggle-btn" title="生成密码">
                🔄
              </button>
            </div>
          </div>
          
          <div class="form-group">
            <label>网址</label>
            <input v-model="formData.url" type="url" placeholder="https://example.com" class="form-input" />
          </div>
          
          <div class="form-group">
            <label>分类</label>
            <select v-model="formData.category" class="form-select">
              <option value="">无分类</option>
              <option value="社交">社交</option>
              <option value="工作">工作</option>
              <option value="金融">金融</option>
              <option value="购物">购物</option>
              <option value="其他">其他</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>备注</label>
            <textarea v-model="formData.notes" placeholder="其他信息..." class="form-textarea"></textarea>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeModal" class="btn btn-secondary">取消</button>
          <button @click="handleSaveEntry" class="btn btn-primary" :disabled="!formData.title || !formData.username || !formData.password">
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { writeText } from '@tauri-apps/api/clipboard';
import * as api from '@/lib/api';
import type { PasswordEntry, NewPasswordEntry, PasswordStrength, SecurityAuditReport } from '@/types';

const isLocked = ref(true);
const isInitialized = ref(false);
const currentView = ref<'vault' | 'generator' | 'audit'>('vault');

const masterPassword = ref('');
const newMasterPassword = ref('');
const confirmMasterPassword = ref('');
const unlockError = ref('');
const setupError = ref('');

const entries = ref<PasswordEntry[]>([]);
const searchQuery = ref('');

const generatedPassword = ref('');
const generatedPassphrase = ref('');
const passwordLength = ref(16);
const includeUppercase = ref(true);
const includeLowercase = ref(true);
const includeNumbers = ref(true);
const includeSymbols = ref(true);
const passphraseWordCount = ref(4);
const passphraseSeparator = ref('-');
const passwordStrength = ref<PasswordStrength | null>(null);
const showPassword = ref(false);

const auditReport = ref<SecurityAuditReport | null>(null);
const isRunningAudit = ref(false);

const showModal = ref(false);
const editingEntry = ref<PasswordEntry | null>(null);
const formData = ref<NewPasswordEntry>({
  title: '',
  username: '',
  password: '',
  url: '',
  notes: '',
  category: '',
});

const navItems = [
  { id: 'vault' as const, label: '保险库', icon: '🔐' },
  { id: 'generator' as const, label: '生成器', icon: '🔑' },
  { id: 'audit' as const, label: '安全审计', icon: '🔍' },
];

const filteredEntries = computed(() => {
  if (!searchQuery.value) return entries.value;
  const query = searchQuery.value.toLowerCase();
  return entries.value.filter(
    entry =>
      entry.title.toLowerCase().includes(query) ||
      entry.username.toLowerCase().includes(query) ||
      (entry.url && entry.url.toLowerCase().includes(query)) ||
      (entry.category && entry.category.toLowerCase().includes(query))
  );
});

const strengthClass = computed(() => {
  if (!passwordStrength.value) return '';
  const score = passwordStrength.value.score;
  if (score <= 3) return 'weak';
  if (score <= 6) return 'medium';
  if (score <= 8) return 'strong';
  return 'very-strong';
});

async function initializeApp() {
  try {
    await api.initializeDatabase();
    const locked = await api.isVaultLocked();
    isLocked.value = locked;
    
    if (!locked) {
      await loadEntries();
    }
  } catch (error) {
    console.error('初始化失败:', error);
  }
}

async function handleSetMasterPassword() {
  if (newMasterPassword.value !== confirmMasterPassword.value) {
    setupError.value = '两次输入的密码不一致';
    return;
  }
  
  if (newMasterPassword.value.length < 8) {
    setupError.value = '主密码至少需要8个字符';
    return;
  }
  
  try {
    await api.setMasterPassword(newMasterPassword.value);
    isInitialized.value = true;
    isLocked.value = false;
    newMasterPassword.value = '';
    confirmMasterPassword.value = '';
    setupError.value = '';
  } catch (error) {
    setupError.value = '设置主密码失败: ' + error;
  }
}

async function handleUnlock() {
  try {
    const success = await api.verifyMasterPassword(masterPassword.value);
    if (success) {
      isLocked.value = false;
      masterPassword.value = '';
      unlockError.value = '';
      await loadEntries();
    } else {
      unlockError.value = '主密码错误';
    }
  } catch (error) {
    unlockError.value = '解锁失败: ' + error;
  }
}

async function loadEntries() {
  try {
    entries.value = await api.getAllPasswordEntries();
  } catch (error) {
    console.error('加载密码条目失败:', error);
  }
}

async function handleGeneratePassword() {
  try {
    generatedPassword.value = await api.generatePassword(
      passwordLength.value,
      includeUppercase.value,
      includeLowercase.value,
      includeNumbers.value,
      includeSymbols.value
    );
    await updatePasswordStrength(generatedPassword.value);
  } catch (error) {
    console.error('生成密码失败:', error);
  }
}

async function handleGeneratePassphrase() {
  try {
    generatedPassphrase.value = await api.generatePassphrase(
      passphraseWordCount.value,
      passphraseSeparator.value
    );
  } catch (error) {
    console.error('生成 Passphrase 失败:', error);
  }
}

async function updatePasswordStrength(password: string) {
  if (password) {
    passwordStrength.value = await api.auditPasswordStrength(password);
  } else {
    passwordStrength.value = null;
  }
}

watch(generatedPassword, updatePasswordStrength);

function openAddModal() {
  editingEntry.value = null;
  formData.value = {
    title: '',
    username: '',
    password: '',
    url: '',
    notes: '',
    category: '',
  };
  showModal.value = true;
}

function openEditModal(entry: PasswordEntry) {
  editingEntry.value = entry;
  formData.value = {
    title: entry.title,
    username: entry.username,
    password: entry.password,
    url: entry.url || '',
    notes: entry.notes || '',
    category: entry.category || '',
  };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editingEntry.value = null;
}

async function generateAndFillPassword() {
  try {
    formData.value.password = await api.generatePassword(
      16,
      true,
      true,
      true,
      true
    );
  } catch (error) {
    console.error('生成密码失败:', error);
  }
}

async function handleSaveEntry() {
  try {
    if (editingEntry.value) {
      await api.updatePasswordEntry(editingEntry.value.id, formData.value);
    } else {
      await api.addPasswordEntry(formData.value);
    }
    closeModal();
    await loadEntries();
  } catch (error) {
    console.error('保存条目失败:', error);
  }
}

async function handleDeleteEntry(id: number) {
  if (confirm('确定要删除这个密码条目吗？')) {
    try {
      await api.deletePasswordEntry(id);
      await loadEntries();
    } catch (error) {
      console.error('删除条目失败:', error);
    }
  }
}

async function handleRunAudit() {
  isRunningAudit.value = true;
  try {
    auditReport.value = await api.getSecurityAuditReport(entries.value);
  } catch (error) {
    console.error('安全审计失败:', error);
  } finally {
    isRunningAudit.value = false;
  }
}

async function copyPassword(password: string) {
  try {
    await writeText(password);
    alert('已复制到剪贴板');
  } catch (error) {
    console.error('复制失败:', error);
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN');
}

onMounted(async () => {
  await initializeApp();
  await handleGeneratePassword();
  await handleGeneratePassphrase();
});
</script>

<style scoped>
.password-manager-container {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.lock-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
}

.lock-container {
  text-align: center;
  padding: 3rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 400px;
  width: 100%;
}

.lock-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.lock-container h2 {
  margin-bottom: 2rem;
  color: #fff;
}

.setup-text,
.unlock-text {
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 1.5rem;
}

.password-input {
  width: 100%;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.3s;
}

.password-input:focus {
  border-color: #4ade80;
}

.main-app {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.sub-nav {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
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

.main-content {
  flex: 1;
}

.vault-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.vault-header h3 {
  margin-bottom: 0;
}

.search-box {
  margin-bottom: 1.5rem;
}

.search-box .input {
  max-width: 400px;
}

.password-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.password-item {
  transition: transform 0.2s;
}

.password-item:hover {
  transform: translateY(-2px);
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.item-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
}

.item-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.5rem;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.action-btn.delete:hover {
  background: rgba(248, 113, 113, 0.2);
}

.item-details {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.9rem;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.detail-label {
  color: rgba(255, 255, 255, 0.5);
}

.detail-value {
  color: rgba(255, 255, 255, 0.8);
}

.generator-section h4 {
  margin-bottom: 1rem;
  color: #4ade80;
}

.generated-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  margin-bottom: 1.5rem;
  word-break: break-all;
}

.result-text {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 1.1rem;
  color: #4ade80;
}

.generator-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-group label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.95rem;
}

.slider {
  width: 100%;
  max-width: 300px;
  accent-color: #4ade80;
}

.checkbox-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 1.1rem;
  height: 1.1rem;
  accent-color: #4ade80;
}

.strength-indicator {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.strength-label {
  margin-bottom: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
}

.strength-value {
  font-weight: 600;
}

.strength-value.weak { color: #f87171; }
.strength-value.medium { color: #fbbf24; }
.strength-value.strong { color: #4ade80; }
.strength-value.very-strong { color: #22c55e; }

.strength-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.strength-fill {
  height: 100%;
  transition: width 0.3s, background 0.3s;
}

.strength-fill.weak { background: #f87171; }
.strength-fill.medium { background: #fbbf24; }
.strength-fill.strong { background: #4ade80; }
.strength-fill.very-strong { background: #22c55e; }

.strength-issues {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
}

.issues-title {
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #fbbf24;
}

.strength-issues ul {
  list-style: none;
  padding-left: 0;
}

.strength-issues li {
  margin-bottom: 0.25rem;
}

.audit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.audit-header h3 {
  margin-bottom: 0;
}

.audit-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.overview-card {
  text-align: center;
}

.overview-card.warning {
  border-color: rgba(251, 191, 36, 0.3);
  background: rgba(251, 191, 36, 0.05);
}

.overview-card.danger {
  border-color: rgba(248, 113, 113, 0.3);
  background: rgba(248, 113, 113, 0.05);
}

.overview-value {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: #fff;
}

.overview-card.warning .overview-value { color: #fbbf24; }
.overview-card.danger .overview-value { color: #f87171; }

.overview-label {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.6);
}

.audit-section {
  margin-bottom: 2rem;
}

.audit-section h4 {
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.audit-group {
  margin-bottom: 1rem;
}

.group-title {
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.75rem;
}

.audit-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.audit-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.audit-item.danger {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.2);
}

.audit-item .item-title {
  font-size: 1rem;
  font-weight: 500;
}

.audit-item .item-username {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
}

.warning-text {
  color: #f87171;
  margin-bottom: 1rem;
  font-weight: 500;
}

.audit-footer {
  text-align: right;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.password-input-group {
  display: flex;
  gap: 0.5rem;
}

.password-input-group .form-input {
  flex: 1;
}

.toggle-btn {
  width: 3rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 1rem;
}

.toggle-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

@media (max-width: 768px) {
  .sub-nav {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .vault-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .search-box .input {
    max-width: 100%;
  }
  
  .generated-result {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .checkbox-group {
    grid-template-columns: 1fr;
  }
  
  .audit-overview {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
