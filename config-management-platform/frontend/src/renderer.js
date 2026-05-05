const DiffMatchPatch = require('diff-match-patch');
const dmp = new DiffMatchPatch();

let monaco = null;
let configEditor = null;
let leftEditor = null;
let rightEditor = null;
let mergePreviewEditor = null;

let currentTab = 'config-center';
let currentEnvironment = null;
let currentConfig = null;
let environments = [];
let configs = [];
let versions = [];

let leftFileName = null;
let rightFileName = null;
let leftFilePath = null;
let rightFilePath = null;
let folderLeftPath = null;
let folderRightPath = null;

let currentDiffResult = null;
let currentDetailedDiff = null;
let leftDecorations = [];
let rightDecorations = [];
let leftGutterWidgets = [];
let rightGutterWidgets = [];

let mergeWizardState = {
  currentStep: 1,
  direction: null,
  conflicts: [],
  selectedResolutions: {}
};

require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }});

require(['vs/editor/editor.main'], function() {
  monaco = window.monaco;
  initializeApp();
});

function initializeApp() {
  initializeEditors();
  initializeEventListeners();
  initializeIPCListeners();
  loadSampleData();
}

function initializeEditors() {
  monaco.editor.defineTheme('platformTheme', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#2a2d2e',
      'editorLineNumber.foreground': '#858585',
      'editorGutter.background': '#1e1e1e',
    }
  });
  
  monaco.editor.setTheme('platformTheme');
  
  const editorOptions = {
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    lineNumbers: 'on',
    renderLineHighlight: 'all',
    automaticLayout: true,
    wordWrap: 'on',
    tabSize: 2,
    insertSpaces: true,
    renderWhitespace: 'selection',
    guides: {
      bracketPairs: true,
      indentation: true
    }
  };
  
  const configEditorContainer = document.getElementById('config-editor');
  if (configEditorContainer) {
    configEditor = monaco.editor.create(configEditorContainer, {
      ...editorOptions,
      language: 'plaintext',
      value: '// 选择环境和配置项开始编辑\n// 或点击"新建"创建新配置'
    });
    
    configEditor.onDidChangeModelContent(() => {
      updateConfigEditorButtons();
    });
  }
  
  const leftEditorContainer = document.getElementById('editor-left');
  if (leftEditorContainer) {
    leftEditor = monaco.editor.create(leftEditorContainer, {
      ...editorOptions,
      language: 'plaintext',
      value: '// 在此输入或打开左侧文本\n// 点击"比较差异"按钮开始比较'
    });
    
    leftEditor.onDidChangeModelContent(() => {
      clearDiffHighlights();
      updateDiffStats();
    });
  }
  
  const rightEditorContainer = document.getElementById('editor-right');
  if (rightEditorContainer) {
    rightEditor = monaco.editor.create(rightEditorContainer, {
      ...editorOptions,
      language: 'plaintext',
      value: '// 在此输入或打开右侧文本\n// 点击"比较差异"按钮开始比较'
    });
    
    rightEditor.onDidChangeModelContent(() => {
      clearDiffHighlights();
      updateDiffStats();
    });
  }
  
  const mergePreviewContainer = document.getElementById('merge-preview');
  if (mergePreviewContainer) {
    mergePreviewEditor = monaco.editor.create(mergePreviewContainer, {
      ...editorOptions,
      language: 'plaintext',
      readOnly: true,
      value: '// 合并预览将显示在此处'
    });
  }
  
  if (leftEditor && rightEditor) {
    syncScroll();
  }
}

function syncScroll() {
  let syncing = false;
  
  leftEditor.onDidScrollChange((e) => {
    if (syncing) return;
    syncing = true;
    rightEditor.setScrollPosition(e);
    syncing = false;
  });
  
  rightEditor.onDidScrollChange((e) => {
    if (syncing) return;
    syncing = true;
    leftEditor.setScrollPosition(e);
    syncing = false;
  });
}

function initializeEventListeners() {
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      switchTab(button.dataset.tab);
    });
  });
  
  document.getElementById('btn-new-env')?.addEventListener('click', showNewEnvironmentModal);
  document.getElementById('btn-new-config')?.addEventListener('click', showNewConfigModal);
  document.getElementById('btn-save-config')?.addEventListener('click', saveConfig);
  document.getElementById('btn-encrypt')?.addEventListener('click', encryptSensitiveFields);
  document.getElementById('btn-compare-versions')?.addEventListener('click', compareVersions);
  document.getElementById('btn-clear-config')?.addEventListener('click', clearConfigEditor);
  document.getElementById('btn-import-config')?.addEventListener('click', importConfig);
  document.getElementById('btn-export-config')?.addEventListener('click', exportConfig);
  
  document.getElementById('config-format')?.addEventListener('change', (e) => {
    updateConfigEditorLanguage(e.target.value);
  });
  
  document.getElementById('btn-open-left')?.addEventListener('click', () => openFile('left'));
  document.getElementById('btn-open-right')?.addEventListener('click', () => openFile('right'));
  document.getElementById('btn-save-left')?.addEventListener('click', () => saveFile('left'));
  document.getElementById('btn-save-right')?.addEventListener('click', () => saveFile('right'));
  document.getElementById('btn-clear-left')?.addEventListener('click', () => clearEditor('left'));
  document.getElementById('btn-clear-right')?.addEventListener('click', () => clearEditor('right'));
  
  document.getElementById('btn-compare')?.addEventListener('click', compareFiles);
  document.getElementById('btn-swap')?.addEventListener('click', swapEditors);
  document.getElementById('btn-merge-all-right')?.addEventListener('click', () => mergeAll('right'));
  document.getElementById('btn-merge-all-left')?.addEventListener('click', () => mergeAll('left'));
  
  document.getElementById('diff-mode')?.addEventListener('change', (e) => {
    switchDiffMode(e.target.value);
  });
  
  document.getElementById('btn-close-wizard')?.addEventListener('click', closeMergeWizard);
  document.getElementById('btn-wizard-prev')?.addEventListener('click', () => navigateWizardStep(-1));
  document.getElementById('btn-wizard-next')?.addEventListener('click', () => navigateWizardStep(1));
  document.getElementById('btn-wizard-apply')?.addEventListener('click', applyMerge);
  document.getElementById('btn-wizard-cancel')?.addEventListener('click', closeMergeWizard);
  
  document.querySelectorAll('.direction-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.direction-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      mergeWizardState.direction = option.dataset.direction;
    });
  });
  
  document.getElementById('modal-backdrop')?.addEventListener('click', hideModal);
}

function initializeIPCListeners() {
  if (window.electronAPI) {
    window.electronAPI.onMenuOpenFile(() => {
      if (currentTab === 'config-center') {
        importConfig();
      } else {
        openFile('left');
      }
    });
    
    window.electronAPI.onMenuSaveFile(() => {
      if (currentTab === 'config-center') {
        saveConfig();
      } else {
        saveFile('left');
      }
    });
    
    window.electronAPI.onSwitchTab((tabName) => {
      switchTab(tabName);
    });
  }
}

function loadSampleData() {
  environments = [
    { id: 'env-1', name: '开发环境', key: 'development', icon: '🔧', configCount: 3 },
    { id: 'env-2', name: '测试环境', key: 'testing', icon: '🧪', configCount: 2 },
    { id: 'env-3', name: '生产环境', key: 'production', icon: '🚀', configCount: 4 }
  ];
  
  renderEnvironmentList();
}

function switchTab(tabName) {
  currentTab = tabName;
  
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === tabName);
  });
  
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${tabName}`);
  });
  
  if (tabName === 'config-center') {
    if (configEditor) {
      setTimeout(() => configEditor.layout(), 100);
    }
  } else {
    if (leftEditor && rightEditor) {
      setTimeout(() => {
        leftEditor.layout();
        rightEditor.layout();
      }, 100);
    }
  }
}

function switchDiffMode(mode) {
  document.querySelectorAll('.diff-mode-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  const targetPanel = document.getElementById(`diff-${mode}-mode`);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }
  
  if (mode === 'text') {
    if (leftEditor && rightEditor) {
      setTimeout(() => {
        leftEditor.layout();
        rightEditor.layout();
      }, 100);
    }
  }
}

function renderEnvironmentList() {
  const envList = document.getElementById('env-list');
  if (!envList) return;
  
  if (environments.length === 0) {
    envList.innerHTML = `
      <div class="empty-state">
        <p>暂无环境配置</p>
        <p class="empty-hint">点击"新建"创建第一个环境</p>
      </div>
    `;
    return;
  }
  
  envList.innerHTML = environments.map(env => `
    <div class="env-item ${currentEnvironment?.id === env.id ? 'active' : ''}" 
         data-id="${env.id}" 
         onclick="selectEnvironment('${env.id}')">
      <span class="env-icon">${env.icon}</span>
      <span class="env-name">${env.name}</span>
      <span class="env-badge">${env.configCount}</span>
    </div>
  `).join('');
}

function selectEnvironment(envId) {
  const env = environments.find(e => e.id === envId);
  if (!env) return;
  
  currentEnvironment = env;
  renderEnvironmentList();
  
  document.getElementById('current-env-name').textContent = env.name;
  
  configs = [
    { id: 'cfg-1', name: '应用配置', key: 'app.config', format: 'json', version: 3 },
    { id: 'cfg-2', name: '数据库配置', key: 'database.yaml', format: 'yaml', version: 5 },
    { id: 'cfg-3', name: '环境变量', key: '.env', format: 'keyvalue', version: 2 }
  ];
  
  renderConfigList();
  clearConfigEditor();
}

function renderConfigList() {
  const configList = document.getElementById('config-list');
  if (!configList) return;
  
  if (configs.length === 0) {
    configList.innerHTML = `
      <div class="empty-state">
        <p>暂无配置项</p>
        <p class="empty-hint">点击"新建"创建第一个配置</p>
      </div>
    `;
    return;
  }
  
  configList.innerHTML = configs.map(cfg => `
    <div class="config-item ${currentConfig?.id === cfg.id ? 'active' : ''}" 
         data-id="${cfg.id}" 
         onclick="selectConfig('${cfg.id}')">
      <span class="config-icon">${getConfigIcon(cfg.format)}</span>
      <span class="config-name">${cfg.name}</span>
    </div>
  `).join('');
}

function getConfigIcon(format) {
  const icons = {
    json: '📄',
    yaml: '📋',
    keyvalue: '🔑'
  };
  return icons[format] || '📄';
}

function selectConfig(configId) {
  const config = configs.find(c => c.id === configId);
  if (!config) return;
  
  currentConfig = config;
  renderConfigList();
  
  document.getElementById('config-editor-title').textContent = config.name;
  document.getElementById('config-format').value = config.format;
  updateConfigEditorLanguage(config.format);
  
  const sampleContent = getSampleContent(config.format, config.key);
  configEditor.setValue(sampleContent);
  
  versions = [
    { id: 'v-1', version: 'v1.0.3', timestamp: '2024-01-15 14:30:00', author: 'admin' },
    { id: 'v-2', version: 'v1.0.2', timestamp: '2024-01-10 09:15:00', author: 'developer' },
    { id: 'v-3', version: 'v1.0.1', timestamp: '2024-01-05 16:45:00', author: 'admin' }
  ];
  
  renderVersionList();
  updateConfigEditorButtons();
}

function getSampleContent(format, key) {
  if (format === 'json') {
    return JSON.stringify({
      app: {
        name: "My Application",
        version: "1.0.0",
        debug: true,
        port: 8080
      },
      database: {
        host: "localhost",
        port: 5432,
        name: "mydb",
        username: "admin",
        password: "ENC(encrypted_password_here)"
      },
      features: {
        enableCache: true,
        enableLogging: false,
        maxConnections: 100
      }
    }, null, 2);
  } else if (format === 'yaml') {
    return `database:
  host: localhost
  port: 5432
  name: mydb
  username: admin
  password: ENC(encrypted_password_here)

logging:
  level: info
  format: json
  outputs:
    - console
    - file

cache:
  enabled: true
  ttl: 3600
  maxSize: 1000
`;
  } else {
    return `# 应用配置
APP_NAME=My Application
APP_VERSION=1.0.0
APP_DEBUG=true
APP_PORT=8080

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_USERNAME=admin
DB_PASSWORD=ENC(encrypted_password_here)

# 功能开关
FEATURE_CACHE_ENABLED=true
FEATURE_LOGGING_ENABLED=false
FEATURE_MAX_CONNECTIONS=100
`;
  }
}

function renderVersionList() {
  const versionList = document.getElementById('version-list');
  if (!versionList) return;
  
  if (versions.length === 0) {
    versionList.innerHTML = `
      <div class="empty-state">
        <p>暂无版本历史</p>
      </div>
    `;
    return;
  }
  
  versionList.innerHTML = versions.map(v => `
    <div class="version-item" 
         data-id="${v.id}" 
         onclick="selectVersion('${v.id}')">
      <span class="version-icon">📌</span>
      <div>
        <span class="version-number">${v.version}</span>
        <span class="version-time">${v.timestamp.split(' ')[0]}</span>
      </div>
    </div>
  `).join('');
}

function selectVersion(versionId) {
  const version = versions.find(v => v.id === versionId);
  if (!version) return;
  
  showToast('info', `已选择版本 ${version.version}`);
}

function updateConfigEditorLanguage(format) {
  if (!configEditor) return;
  
  const languageMap = {
    json: 'json',
    yaml: 'yaml',
    keyvalue: 'plaintext'
  };
  
  monaco.editor.setModelLanguage(configEditor.getModel(), languageMap[format] || 'plaintext');
}

function updateConfigEditorButtons() {
  const saveBtn = document.getElementById('btn-save-config');
  const encryptBtn = document.getElementById('btn-encrypt');
  const compareBtn = document.getElementById('btn-compare-versions');
  
  const hasContent = configEditor && configEditor.getValue().trim().length > 0;
  const hasConfig = currentConfig !== null;
  
  if (saveBtn) saveBtn.disabled = !hasContent;
  if (encryptBtn) encryptBtn.disabled = !hasContent;
  if (compareBtn) compareBtn.disabled = !hasConfig || versions.length < 2;
}

function showNewEnvironmentModal() {
  showModal(`
    <div class="modal-header">
      <h3>新建环境</h3>
      <button class="btn btn-close" onclick="hideModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label for="env-name">环境名称</label>
        <input type="text" id="env-name" placeholder="例如：开发环境">
      </div>
      <div class="form-group">
        <label for="env-key">环境标识</label>
        <input type="text" id="env-key" placeholder="例如：development">
      </div>
      <div class="form-group">
        <label for="env-icon">图标</label>
        <select id="env-icon" class="select-input">
          <option value="🔧">🔧 开发</option>
          <option value="🧪">🧪 测试</option>
          <option value="🚀">🚀 生产</option>
          <option value="🔬">🔬 实验</option>
          <option value="📦">📦 预发布</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="hideModal()">取消</button>
      <button class="btn btn-primary" onclick="createEnvironment()">创建</button>
    </div>
  `);
}

function createEnvironment() {
  const name = document.getElementById('env-name')?.value?.trim();
  const key = document.getElementById('env-key')?.value?.trim();
  const icon = document.getElementById('env-icon')?.value || '🔧';
  
  if (!name || !key) {
    showToast('error', '请填写环境名称和标识');
    return;
  }
  
  const newEnv = {
    id: `env-${Date.now()}`,
    name,
    key,
    icon,
    configCount: 0
  };
  
  environments.push(newEnv);
  renderEnvironmentList();
  hideModal();
  showToast('success', `环境 "${name}" 创建成功`);
}

function showNewConfigModal() {
  if (!currentEnvironment) {
    showToast('warning', '请先选择一个环境');
    return;
  }
  
  showModal(`
    <div class="modal-header">
      <h3>新建配置项</h3>
      <button class="btn btn-close" onclick="hideModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label for="config-name">配置名称</label>
        <input type="text" id="config-name" placeholder="例如：应用配置">
      </div>
      <div class="form-group">
        <label for="config-key">配置键名</label>
        <input type="text" id="config-key" placeholder="例如：app.config">
      </div>
      <div class="form-group">
        <label for="config-format">配置格式</label>
        <select id="config-format-modal" class="select-input">
          <option value="json">JSON</option>
          <option value="yaml">YAML</option>
          <option value="keyvalue">Key-Value (.env)</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="hideModal()">取消</button>
      <button class="btn btn-primary" onclick="createConfig()">创建</button>
    </div>
  `);
}

function createConfig() {
  const name = document.getElementById('config-name')?.value?.trim();
  const key = document.getElementById('config-key')?.value?.trim();
  const format = document.getElementById('config-format-modal')?.value || 'json';
  
  if (!name || !key) {
    showToast('error', '请填写配置名称和键名');
    return;
  }
  
  const newConfig = {
    id: `cfg-${Date.now()}`,
    name,
    key,
    format,
    version: 1
  };
  
  configs.push(newConfig);
  renderConfigList();
  hideModal();
  showToast('success', `配置项 "${name}" 创建成功`);
}

function saveConfig() {
  if (!configEditor) return;
  
  const content = configEditor.getValue();
  
  if (!currentConfig) {
    showToast('warning', '请先选择或创建一个配置项');
    return;
  }
  
  currentConfig.version = (currentConfig.version || 0) + 1;
  
  const newVersion = {
    id: `v-${Date.now()}`,
    version: `v1.0.${currentConfig.version}`,
    timestamp: new Date().toLocaleString('zh-CN'),
    author: '当前用户'
  };
  
  versions.unshift(newVersion);
  renderVersionList();
  
  showToast('success', `配置已保存，版本已更新到 v1.0.${currentConfig.version}`);
}

function encryptSensitiveFields() {
  if (!configEditor) return;
  
  const content = configEditor.getValue();
  const format = document.getElementById('config-format')?.value || 'json';
  
  let encryptedContent = content;
  let encryptedCount = 0;
  
  const sensitiveKeys = ['password', 'secret', 'token', 'api_key', 'apikey', 'private_key', 'privatekey'];
  
  if (format === 'json') {
    try {
      const obj = JSON.parse(content);
      const encryptValues = (o) => {
        for (const key in o) {
          if (typeof o[key] === 'string' && sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
            if (!o[key].startsWith('ENC(')) {
              o[key] = `ENC(${btoa(o[key])})`;
              encryptedCount++;
            }
          } else if (typeof o[key] === 'object' && o[key] !== null) {
            encryptValues(o[key]);
          }
        }
      };
      encryptValues(obj);
      encryptedContent = JSON.stringify(obj, null, 2);
    } catch (e) {
      showToast('error', 'JSON 格式错误，无法加密');
      return;
    }
  } else if (format === 'yaml' || format === 'keyvalue') {
    const lines = content.split('\n');
    encryptedContent = lines.map(line => {
      const lowerLine = line.toLowerCase();
      if (sensitiveKeys.some(sk => lowerLine.includes(sk))) {
        if (format === 'keyvalue') {
          const match = line.match(/^(\w+)=(.+)$/);
          if (match && !match[2].startsWith('ENC(')) {
            encryptedCount++;
            return `${match[1]}=ENC(${btoa(match[2])})`;
          }
        } else {
          const match = line.match(/^(\s*\w+:)\s*(.+)$/);
          if (match && !match[2].startsWith('ENC(')) {
            encryptedCount++;
            return `${match[1]} ENC(${btoa(match[2])})`;
          }
        }
      }
      return line;
    }).join('\n');
  }
  
  configEditor.setValue(encryptedContent);
  
  if (encryptedCount > 0) {
    showToast('success', `已加密 ${encryptedCount} 个敏感字段`);
  } else {
    showToast('info', '未找到需要加密的敏感字段');
  }
}

function compareVersions() {
  if (versions.length < 2) {
    showToast('warning', '需要至少两个版本才能进行对比');
    return;
  }
  
  switchTab('diff-viewer');
  
  if (leftEditor && rightEditor) {
    leftEditor.setValue(getSampleContent(currentConfig.format, currentConfig.key));
    rightEditor.setValue(`# 旧版本配置\n# 版本: ${versions[1].version}\n\n${getSampleContent(currentConfig.format, currentConfig.key)}`);
    
    document.getElementById('left-title').textContent = `当前版本 (v1.0.${currentConfig.version})`;
    document.getElementById('right-title').textContent = `${versions[1].version}`;
    
    setTimeout(() => compareFiles(), 500);
  }
}

function clearConfigEditor() {
  if (configEditor) {
    configEditor.setValue('');
  }
  document.getElementById('config-editor-title').textContent = '配置编辑器';
  updateConfigEditorButtons();
}

async function importConfig() {
  if (!window.electronAPI) return;
  
  const result = await window.electronAPI.openFileDialog();
  if (result && !result.error) {
    configEditor.setValue(result.content);
    document.getElementById('config-editor-title').textContent = result.fileName;
    
    const format = detectFormat(result.fileName);
    document.getElementById('config-format').value = format;
    updateConfigEditorLanguage(format);
    
    showToast('success', `已导入 ${result.fileName}`);
  }
}

async function exportConfig() {
  if (!window.electronAPI || !configEditor) return;
  
  const content = configEditor.getValue();
  if (!content.trim()) {
    showToast('warning', '没有内容可导出');
    return;
  }
  
  const result = await window.electronAPI.saveFileDialog(content);
  if (result && !result.error) {
    showToast('success', `已导出到 ${result.fileName}`);
  }
}

function detectFormat(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'json') return 'json';
  if (ext === 'yaml' || ext === 'yml') return 'yaml';
  if (ext === 'env' || ext === 'properties' || ext === 'conf') return 'keyvalue';
  return 'json';
}

async function openFile(side) {
  if (!window.electronAPI) return;
  
  const result = await window.electronAPI.openFileDialog();
  if (result && !result.error) {
    const editor = side === 'left' ? leftEditor : rightEditor;
    editor.setValue(result.content);
    
    if (side === 'left') {
      leftFileName = result.fileName;
      leftFilePath = result.filePath;
      document.getElementById('left-title').textContent = result.fileName;
    } else {
      rightFileName = result.fileName;
      rightFilePath = result.filePath;
      document.getElementById('right-title').textContent = result.fileName;
    }
    
    const lang = detectLanguage(result.fileName);
    monaco.editor.setModelLanguage(editor.getModel(), lang);
    
    clearDiffHighlights();
  }
}

async function saveFile(side) {
  if (!window.electronAPI) return;
  
  const editor = side === 'left' ? leftEditor : rightEditor;
  const content = editor.getValue();
  const defaultPath = side === 'left' ? leftFilePath : rightFilePath;
  
  const result = await window.electronAPI.saveFileDialog(content, defaultPath);
  if (result && !result.error) {
    if (side === 'left') {
      leftFileName = result.fileName;
      leftFilePath = result.filePath;
      document.getElementById('left-title').textContent = result.fileName;
    } else {
      rightFileName = result.fileName;
      rightFilePath = result.filePath;
      document.getElementById('right-title').textContent = result.fileName;
    }
    
    showToast('success', `已保存 ${result.fileName}`);
  }
}

function clearEditor(side) {
  const editor = side === 'left' ? leftEditor : rightEditor;
  editor.setValue('');
  
  if (side === 'left') {
    leftFileName = null;
    leftFilePath = null;
    document.getElementById('left-title').textContent = '左侧文本';
  } else {
    rightFileName = null;
    rightFilePath = null;
    document.getElementById('right-title').textContent = '右侧文本';
  }
  
  monaco.editor.setModelLanguage(editor.getModel(), 'plaintext');
  clearDiffHighlights();
}

function swapEditors() {
  const leftContent = leftEditor.getValue();
  const rightContent = rightEditor.getValue();
  
  leftEditor.setValue(rightContent);
  rightEditor.setValue(leftContent);
  
  [leftFileName, rightFileName] = [rightFileName, leftFileName];
  [leftFilePath, rightFilePath] = [rightFilePath, leftFilePath];
  
  const leftTitle = document.getElementById('left-title').textContent;
  const rightTitle = document.getElementById('right-title').textContent;
  document.getElementById('left-title').textContent = rightTitle;
  document.getElementById('right-title').textContent = leftTitle;
  
  clearDiffHighlights();
}

function detectLanguage(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const langMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'scss',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'json': 'json',
    'md': 'markdown',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'sh': 'shell',
    'bat': 'bat',
    'sql': 'sql',
    'go': 'go',
    'rs': 'rust',
    'env': 'plaintext',
    'properties': 'plaintext'
  };
  return langMap[ext] || 'plaintext';
}

function compareFiles() {
  const leftText = leftEditor.getValue();
  const rightText = rightEditor.getValue();
  
  if (!leftText.trim() && !rightText.trim()) {
    showToast('warning', '请先在两侧输入或打开文本文件');
    return;
  }
  
  clearDiffHighlights();
  
  currentDiffResult = getLineBasedDiff(leftText, rightText);
  currentDetailedDiff = getDetailedLineDiff(leftText, rightText);
  
  const diffs = dmp.diff_main(leftText, rightText);
  dmp.diff_cleanupSemantic(diffs);
  
  applyDiffHighlights(diffs);
  addMergeButtons();
  updateDiffStats();
  
  showToast('info', '差异比较完成');
}

function getLineBasedDiff(leftText, rightText) {
  const leftLines = leftText.split('\n');
  const rightLines = rightText.split('\n');
  const m = leftLines.length;
  const n = rightLines.length;
  
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (leftLines[i - 1] === rightLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  const result = [];
  let i = m, j = n;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      result.unshift({ type: 'equal', line: leftLines[i - 1], leftIndex: i - 1, rightIndex: j - 1 });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'insert', line: rightLines[j - 1], leftIndex: i, rightIndex: j - 1 });
      j--;
    } else {
      result.unshift({ type: 'delete', line: leftLines[i - 1], leftIndex: i - 1, rightIndex: j });
      i--;
    }
  }
  
  return result;
}

function getDetailedLineDiff(leftText, rightText) {
  const blocks = [];
  const lineBasedDiff = getLineBasedDiff(leftText, rightText);
  
  let currentBlock = null;
  
  for (const item of lineBasedDiff) {
    if (!currentBlock || currentBlock.type !== item.type) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        type: item.type,
        leftLines: [],
        rightLines: []
      };
    }
    
    if (item.type === 'equal' || item.type === 'delete') {
      currentBlock.leftLines.push({ lineNumber: item.leftIndex + 1, text: item.line });
    }
    if (item.type === 'equal' || item.type === 'insert') {
      currentBlock.rightLines.push({ lineNumber: item.rightIndex + 1, text: item.line });
    }
  }
  
  if (currentBlock) {
    blocks.push(currentBlock);
  }
  
  return { blocks };
}

function applyDiffHighlights(diffs) {
  const leftModel = leftEditor.getModel();
  const rightModel = rightEditor.getModel();
  
  let leftLine = 1;
  let rightLine = 1;
  let leftColumn = 1;
  let rightColumn = 1;
  
  const newLeftDecorations = [];
  const newRightDecorations = [];
  
  for (const diff of diffs) {
    const type = diff[0];
    const text = diff[1];
    const lines = text.split('\n');
    
    if (type === 0) {
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          leftLine++;
          rightLine++;
          leftColumn = 1;
          rightColumn = 1;
        }
        leftColumn += lines[i].length;
        rightColumn += lines[i].length;
      }
    } else if (type === -1) {
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          leftLine++;
          leftColumn = 1;
        }
        
        if (lines[i].length > 0 || i > 0) {
          const startLine = leftLine;
          const endLine = leftLine;
          const startCol = leftColumn;
          const endCol = leftColumn + lines[i].length;
          
          newLeftDecorations.push({
            range: new monaco.Range(startLine, startCol, endLine, endCol > startCol ? endCol : startCol + 1),
            options: {
              isWholeLine: lines[i].length === 0 && i > 0,
              className: 'deletion-decoration',
              glyphMarginClassName: 'gutter-deletion',
              linesDecorationsClassName: 'line-number-deletion'
            }
          });
        }
        
        leftColumn += lines[i].length;
      }
    } else if (type === 1) {
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          rightLine++;
          rightColumn = 1;
        }
        
        if (lines[i].length > 0 || i > 0) {
          const startLine = rightLine;
          const endLine = rightLine;
          const startCol = rightColumn;
          const endCol = rightColumn + lines[i].length;
          
          newRightDecorations.push({
            range: new monaco.Range(startLine, startCol, endLine, endCol > startCol ? endCol : startCol + 1),
            options: {
              isWholeLine: lines[i].length === 0 && i > 0,
              className: 'insertion-decoration',
              glyphMarginClassName: 'gutter-insertion',
              linesDecorationsClassName: 'line-number-insertion'
            }
          });
        }
        
        rightColumn += lines[i].length;
      }
    }
  }
  
  leftDecorations = leftEditor.deltaDecorations(leftDecorations, newLeftDecorations);
  rightDecorations = rightEditor.deltaDecorations(rightDecorations, newRightDecorations);
}

function clearDiffHighlights() {
  if (leftEditor) {
    leftDecorations = leftEditor.deltaDecorations(leftDecorations, []);
    for (const widget of leftGutterWidgets) {
      leftEditor.removeContentWidget(widget);
    }
    leftGutterWidgets = [];
  }
  if (rightEditor) {
    rightDecorations = rightEditor.deltaDecorations(rightDecorations, []);
    for (const widget of rightGutterWidgets) {
      rightEditor.removeContentWidget(widget);
    }
    rightGutterWidgets = [];
  }
  currentDiffResult = null;
  currentDetailedDiff = null;
  document.getElementById('diff-stats').textContent = '';
}

function updateDiffStats() {
  const statsElement = document.getElementById('diff-stats');
  if (!statsElement) return;
  
  if (!currentDiffResult) {
    statsElement.innerHTML = '';
    return;
  }
  
  const leftText = leftEditor.getValue();
  const rightText = rightEditor.getValue();
  
  const diffs = dmp.diff_main(leftText, rightText);
  dmp.diff_cleanupSemantic(diffs);
  
  let insertions = 0;
  let deletions = 0;
  
  for (const diff of diffs) {
    const type = diff[0];
    const text = diff[1];
    const lineCount = text.split('\n').length - 1 || (text.length > 0 ? 1 : 0);
    
    if (type === 1) {
      insertions += lineCount;
    } else if (type === -1) {
      deletions += lineCount;
    }
  }
  
  let statsHtml = '';
  if (insertions > 0) {
    statsHtml += `
      <div class="diff-stat">
        <span class="diff-stat-icon added"></span>
        <span>新增: ${insertions} 行</span>
      </div>
    `;
  }
  if (deletions > 0) {
    statsHtml += `
      <div class="diff-stat">
        <span class="diff-stat-icon removed"></span>
        <span>删除: ${deletions} 行</span>
      </div>
    `;
  }
  
  statsElement.innerHTML = statsHtml || '<div class="diff-stat"><span class="diff-stat-icon unchanged"></span><span>无差异</span></div>';
}

function addMergeButtons() {
  if (!currentDetailedDiff) return;
  
  const blocks = currentDetailedDiff.blocks;
  
  blocks.forEach((block, blockIndex) => {
    if (block.type === 'equal') return;
    
    if (block.leftLines.length > 0) {
      const startLine = block.leftLines[0].lineNumber;
      const widget = createMergeWidget('left', startLine, blockIndex, block.type);
      leftEditor.addContentWidget(widget);
      leftGutterWidgets.push(widget);
    }
    
    if (block.rightLines.length > 0) {
      const startLine = block.rightLines[0].lineNumber;
      const widget = createMergeWidget('right', startLine, blockIndex, block.type);
      rightEditor.addContentWidget(widget);
      rightGutterWidgets.push(widget);
    }
  });
}

function createMergeWidget(side, lineNumber, blockIndex, blockType) {
  const id = `merge-widget-${side}-${lineNumber}-${Date.now()}`;
  const domNode = document.createElement('div');
  domNode.className = 'merge-widget';
  domNode.style.marginTop = '2px';
  
  const buttonToRight = document.createElement('button');
  buttonToRight.className = 'merge-btn merge-btn-right';
  buttonToRight.title = side === 'left' ? '将此更改合并到右侧' : '将此更改应用到左侧';
  buttonToRight.innerHTML = '→';
  buttonToRight.onclick = (e) => {
    e.stopPropagation();
    openMergeWizard(blockIndex, 'right');
  };
  
  const buttonToLeft = document.createElement('button');
  buttonToLeft.className = 'merge-btn merge-btn-left';
  buttonToLeft.title = side === 'right' ? '将此更改合并到左侧' : '将此更改应用到右侧';
  buttonToLeft.innerHTML = '←';
  buttonToLeft.onclick = (e) => {
    e.stopPropagation();
    openMergeWizard(blockIndex, 'left');
  };
  
  if (side === 'left') {
    domNode.appendChild(buttonToRight);
  } else {
    domNode.appendChild(buttonToLeft);
  }
  
  return {
    getId: function() { return id; },
    getDomNode: function() { return domNode; },
    getPosition: function() {
      return {
        position: {
          lineNumber: lineNumber + 1,
          column: 1
        },
        preference: [monaco.editor.ContentWidgetPositionPreference.TOP_LEFT]
      };
    }
  };
}

function mergeAll(direction) {
  if (!currentDiffResult) {
    showToast('warning', '请先比较差异');
    return;
  }
  
  const leftText = leftEditor.getValue();
  const rightText = rightEditor.getValue();
  
  if (direction === 'right') {
    rightEditor.setValue(leftText);
  } else {
    leftEditor.setValue(rightText);
  }
  
  clearDiffHighlights();
  showToast('success', `已全部合并到${direction === 'right' ? '右侧' : '左侧'}`);
}

function openMergeWizard(blockIndex, initialDirection) {
  if (!currentDetailedDiff) {
    showToast('warning', '请先比较差异');
    return;
  }
  
  const blocks = currentDetailedDiff.blocks;
  const conflictBlocks = blocks.filter(b => b.type !== 'equal');
  
  if (conflictBlocks.length === 0) {
    showToast('info', '没有需要合并的差异');
    return;
  }
  
  mergeWizardState = {
    currentStep: 1,
    direction: initialDirection || 'left-to-right',
    conflicts: conflictBlocks.map((block, idx) => ({
      index: blocks.indexOf(block),
      block: block,
      resolution: null
    })),
    selectedResolutions: {}
  };
  
  const wizard = document.getElementById('merge-wizard');
  if (wizard) {
    wizard.classList.remove('hidden');
    updateWizardUI();
  }
}

function closeMergeWizard() {
  const wizard = document.getElementById('merge-wizard');
  if (wizard) {
    wizard.classList.add('hidden');
  }
  mergeWizardState = {
    currentStep: 1,
    direction: null,
    conflicts: [],
    selectedResolutions: {}
  };
}

function navigateWizardStep(delta) {
  const newStep = mergeWizardState.currentStep + delta;
  
  if (newStep < 1 || newStep > 3) return;
  
  if (newStep === 2 && !mergeWizardState.direction) {
    showToast('warning', '请先选择合并方向');
    return;
  }
  
  mergeWizardState.currentStep = newStep;
  updateWizardUI();
}

function updateWizardUI() {
  document.querySelectorAll('.wizard-step').forEach(step => {
    const stepNum = parseInt(step.dataset.step);
    step.classList.toggle('active', stepNum === mergeWizardState.currentStep);
  });
  
  document.querySelectorAll('.wizard-panel').forEach(panel => {
    const stepNum = parseInt(panel.dataset.step);
    panel.classList.toggle('active', stepNum === mergeWizardState.currentStep);
  });
  
  const prevBtn = document.getElementById('btn-wizard-prev');
  const nextBtn = document.getElementById('btn-wizard-next');
  const applyBtn = document.getElementById('btn-wizard-apply');
  
  if (prevBtn) prevBtn.disabled = mergeWizardState.currentStep === 1;
  if (nextBtn) {
    nextBtn.style.display = mergeWizardState.currentStep === 3 ? 'none' : 'inline-flex';
  }
  if (applyBtn) {
    applyBtn.classList.toggle('hidden', mergeWizardState.currentStep !== 3);
  }
  
  if (mergeWizardState.currentStep === 2) {
    renderConflictList();
  } else if (mergeWizardState.currentStep === 3) {
    updateMergePreview();
  }
}

function renderConflictList() {
  const conflictList = document.getElementById('conflict-list');
  if (!conflictList) return;
  
  if (mergeWizardState.conflicts.length === 0) {
    conflictList.innerHTML = `
      <div class="empty-state">
        <p>没有检测到冲突</p>
      </div>
    `;
    return;
  }
  
  conflictList.innerHTML = mergeWizardState.conflicts.map((conflict, idx) => {
    const block = conflict.block;
    const leftText = block.leftLines.map(l => l.text).join('\n');
    const rightText = block.rightLines.map(l => l.text).join('\n');
    
    const typeText = {
      'delete': '删除',
      'insert': '新增',
      'replace': '修改'
    }[block.type] || '修改';
    
    return `
      <div class="conflict-item" data-index="${conflict.index}">
        <div class="conflict-header">
          <div class="conflict-info">
            <span class="conflict-line">冲突 ${idx + 1}: 行 ${block.leftLines[0]?.lineNumber || '-'} - ${block.rightLines[0]?.lineNumber || '-'}</span>
            <span class="conflict-type">${typeText}</span>
          </div>
          <div class="conflict-resolution">
            <button class="btn btn-sm ${conflict.resolution === 'left' ? 'btn-primary' : 'btn-secondary'}" 
                    onclick="setConflictResolution(${conflict.index}, 'left')">
              保留左侧
            </button>
            <button class="btn btn-sm ${conflict.resolution === 'right' ? 'btn-primary' : 'btn-secondary'}" 
                    onclick="setConflictResolution(${conflict.index}, 'right')">
              保留右侧
            </button>
            <button class="btn btn-sm ${conflict.resolution === 'both' ? 'btn-primary' : 'btn-secondary'}" 
                    onclick="setConflictResolution(${conflict.index}, 'both')">
              保留双方
            </button>
          </div>
        </div>
        <div class="conflict-content">
          <div class="conflict-side">
            <div class="conflict-side-title">左侧</div>
            <div class="conflict-code deleted">${escapeHtml(leftText)}</div>
          </div>
          <div class="conflict-side">
            <div class="conflict-side-title">右侧</div>
            <div class="conflict-code added">${escapeHtml(rightText)}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function setConflictResolution(conflictIndex, resolution) {
  const conflict = mergeWizardState.conflicts.find(c => c.index === conflictIndex);
  if (conflict) {
    conflict.resolution = resolution;
    mergeWizardState.selectedResolutions[conflictIndex] = resolution;
    renderConflictList();
  }
}

function updateMergePreview() {
  if (!mergePreviewEditor) return;
  
  const leftText = leftEditor.getValue();
  const rightText = rightEditor.getValue();
  const direction = mergeWizardState.direction;
  
  let result = direction === 'left-to-right' ? rightText : leftText;
  const sourceText = direction === 'left-to-right' ? leftText : rightText;
  
  for (const conflict of mergeWizardState.conflicts) {
    const resolution = conflict.resolution || (direction === 'left-to-right' ? 'left' : 'right');
    
    if (resolution === 'left' && direction === 'left-to-right') {
      const block = conflict.block;
      const replaceText = block.leftLines.map(l => l.text).join('\n');
      const searchText = block.rightLines.map(l => l.text).join('\n');
      
      if (searchText) {
        result = result.replace(searchText, replaceText);
      }
    } else if (resolution === 'right' && direction === 'right-to-left') {
      const block = conflict.block;
      const replaceText = block.rightLines.map(l => l.text).join('\n');
      const searchText = block.leftLines.map(l => l.text).join('\n');
      
      if (searchText) {
        result = result.replace(searchText, replaceText);
      }
    } else if (resolution === 'both') {
      const block = conflict.block;
      const leftContent = block.leftLines.map(l => l.text).join('\n');
      const rightContent = block.rightLines.map(l => l.text).join('\n');
      const combined = `${leftContent}\n${rightContent}`;
      
      const searchText = direction === 'left-to-right' ? rightContent : leftContent;
      if (searchText) {
        result = result.replace(searchText, combined);
      }
    }
  }
  
  mergePreviewEditor.setValue(result);
}

function applyMerge() {
  if (!mergePreviewEditor) return;
  
  const result = mergePreviewEditor.getValue();
  const targetEditor = mergeWizardState.direction === 'left-to-right' ? rightEditor : leftEditor;
  
  targetEditor.setValue(result);
  clearDiffHighlights();
  closeMergeWizard();
  
  showToast('success', '合并已应用');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showModal(content) {
  const container = document.getElementById('modal-container');
  const modalContent = document.getElementById('modal-content');
  
  if (container && modalContent) {
    modalContent.innerHTML = content;
    container.classList.remove('hidden');
  }
}

function hideModal() {
  const container = document.getElementById('modal-container');
  if (container) {
    container.classList.add('hidden');
  }
}

function showToast(type, message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-message">${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

window.selectEnvironment = selectEnvironment;
window.selectConfig = selectConfig;
window.selectVersion = selectVersion;
window.createEnvironment = createEnvironment;
window.createConfig = createConfig;
window.hideModal = hideModal;
window.setConflictResolution = setConflictResolution;
