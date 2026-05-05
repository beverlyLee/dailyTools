const { invoke } = window.__TAURI__.core;
const { clipboard } = window.__TAURI__.clipboard || { writeText: () => {} };

let autoRefreshInterval = null;
let isAutoRefreshing = true;
let currentSortField = 'pid';
let currentSortOrder = 'asc';
let processesData = [];
let isDatabaseInitialized = false;
let isVaultUnlocked = false;
let passwordsData = [];
let savedPatternsData = [];
let charts = {};
let pendingDeleteId = null;
let pendingDeleteType = null;

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN');
}

function showNotification(message, type = 'info') {
  const colors = {
    success: 'var(--success-color)',
    error: 'var(--danger-color)',
    warning: 'var(--warning-color)',
    info: 'var(--primary-color)'
  };
  
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background-color: ${colors[type]};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

async function initDatabase() {
  if (isDatabaseInitialized) return true;
  
  try {
    await invoke('init_database');
    isDatabaseInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
  }
}

function switchTab(tabName) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tabName);
  });
  
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });
  
  if (tabName === 'history') {
    initCharts();
  }
}

async function refreshSystemResources() {
  try {
    const resources = await invoke('get_system_resources');
    updateSystemResourcesUI(resources);
    
    if (isDatabaseInitialized) {
      try {
        await invoke('save_performance_data', { resources });
      } catch (e) {
        console.log('Failed to save performance data:', e);
      }
    }
  } catch (error) {
    console.error('Failed to get system resources:', error);
  }
}

function updateSystemResourcesUI(resources) {
  document.getElementById('cpu-avg').textContent = resources.cpu_avg_usage.toFixed(1) + '%';
  
  const cpuCoresContainer = document.getElementById('cpu-cores');
  cpuCoresContainer.innerHTML = '';
  
  resources.cpu_usage.forEach((usage, index) => {
    const coreEl = document.createElement('div');
    coreEl.className = 'cpu-core';
    coreEl.innerHTML = `
      <div class="core-bar">
        <div class="core-fill" style="height: ${Math.min(usage, 100)}%"></div>
      </div>
      <span class="core-label">${index + 1}</span>
    `;
    cpuCoresContainer.appendChild(coreEl);
  });
  
  document.getElementById('memory-percent').textContent = resources.memory_percentage.toFixed(1) + '%';
  document.getElementById('memory-bar').style.width = resources.memory_percentage + '%';
  document.getElementById('memory-used').textContent = formatBytes(resources.memory_used);
  document.getElementById('memory-total').textContent = formatBytes(resources.memory_total);
  document.getElementById('swap-used').textContent = formatBytes(resources.swap_used);
  document.getElementById('swap-total').textContent = formatBytes(resources.swap_total);
  
  const diskList = document.getElementById('disk-list');
  diskList.innerHTML = '';
  
  resources.disks.forEach(disk => {
    const percent = disk.total_space > 0 
      ? (disk.used_space / disk.total_space * 100) 
      : 0;
    
    const diskEl = document.createElement('div');
    diskEl.className = 'disk-item';
    diskEl.innerHTML = `
      <div class="disk-header">
        <span class="disk-name">${disk.name || '磁盘'}</span>
        <span class="disk-mount">${disk.mount_point}</span>
      </div>
      <div class="disk-progress">
        <div class="disk-fill" style="width: ${percent}%"></div>
      </div>
      <div class="disk-stats">
        <span>已用: ${formatBytes(disk.used_space)}</span>
        <span>总计: ${formatBytes(disk.total_space)}</span>
      </div>
    `;
    diskList.appendChild(diskEl);
  });
  
  const networkList = document.getElementById('network-list');
  networkList.innerHTML = '';
  
  resources.networks.forEach(network => {
    const netEl = document.createElement('div');
    netEl.className = 'network-item';
    netEl.innerHTML = `
      <div class="network-name">${network.name}</div>
      <div class="network-stats">
        <div class="network-stat">
          <span class="network-stat-label">下载</span>
          <span class="network-stat-value">${formatBytes(network.received_bytes)}</span>
        </div>
        <div class="network-stat">
          <span class="network-stat-label">上传</span>
          <span class="network-stat-value">${formatBytes(network.transmitted_bytes)}</span>
        </div>
      </div>
    `;
    networkList.appendChild(netEl);
  });
}

async function refreshProcesses() {
  try {
    processesData = await invoke('get_all_processes');
    renderProcesses();
  } catch (error) {
    console.error('Failed to get processes:', error);
  }
}

function renderProcesses() {
  const searchTerm = document.getElementById('process-search').value.toLowerCase();
  let filtered = processesData;
  
  if (searchTerm) {
    filtered = processesData.filter(p => 
      p.name.toLowerCase().includes(searchTerm) ||
      p.pid.toString().includes(searchTerm)
    );
  }
  
  filtered.sort((a, b) => {
    let comparison = 0;
    
    switch (currentSortField) {
      case 'pid':
        comparison = a.pid - b.pid;
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'cpu':
        comparison = a.cpu_usage - b.cpu_usage;
        break;
      case 'memory':
        comparison = a.memory_usage - b.memory_usage;
        break;
      default:
        comparison = 0;
    }
    
    return currentSortOrder === 'desc' ? -comparison : comparison;
  });
  
  const processList = document.getElementById('process-list');
  processList.innerHTML = '';
  
  filtered.forEach(process => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${process.pid}</td>
      <td>${process.name}</td>
      <td>${process.cpu_usage.toFixed(1)}%</td>
      <td>${formatBytes(process.memory_usage)}</td>
      <td>${process.status}</td>
      <td>${formatDuration(process.run_time)}</td>
      <td>
        <button class="btn btn-danger btn-small" onclick="confirmKillProcess(${process.pid}, '${process.name}')">
          结束
        </button>
      </td>
    `;
    processList.appendChild(row);
  });
}

async function confirmKillProcess(pid, name) {
  if (confirm(`确定要结束进程 "${name}" (PID: ${pid}) 吗？`)) {
    try {
      const success = await invoke('kill_process', { pid });
      if (success) {
        showNotification(`进程 ${name} 已结束`, 'success');
        refreshProcesses();
      } else {
        showNotification('无法结束进程', 'error');
      }
    } catch (error) {
      showNotification('结束进程失败: ' + error, 'error');
    }
  }
}

function initCharts() {
  const chartConfig = (label, color) => ({
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: label,
        data: [],
        borderColor: color,
        backgroundColor: color + '20',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.1)' },
          ticks: { color: '#94a3b8' }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.1)' },
          ticks: { color: '#94a3b8' },
          min: 0
        }
      }
    }
  });
  
  if (!charts.cpu) {
    charts.cpu = new Chart(
      document.getElementById('cpu-chart'),
      chartConfig('CPU 使用率 (%)', '#6366f1')
    );
  }
  
  if (!charts.memory) {
    charts.memory = new Chart(
      document.getElementById('memory-chart'),
      chartConfig('内存使用率 (%)', '#22c55e')
    );
  }
  
  if (!charts.disk) {
    charts.disk = new Chart(
      document.getElementById('disk-chart'),
      {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            { label: '读取', data: [], borderColor: '#6366f1', backgroundColor: '#6366f120', fill: true, tension: 0.4 },
            { label: '写入', data: [], borderColor: '#f59e0b', backgroundColor: '#f59e0b20', fill: true, tension: 0.4 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#94a3b8' } }
          },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } },
            y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } }
          }
        }
      }
    );
  }
  
  if (!charts.network) {
    charts.network = new Chart(
      document.getElementById('network-chart'),
      {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            { label: '下载', data: [], borderColor: '#22c55e', backgroundColor: '#22c55e20', fill: true, tension: 0.4 },
            { label: '上传', data: [], borderColor: '#ef4444', backgroundColor: '#ef444420', fill: true, tension: 0.4 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#94a3b8' } }
          },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } },
            y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } }
          }
        }
      }
    );
  }
}

async function loadHistoryData() {
  const hours = parseInt(document.getElementById('history-range').value);
  
  try {
    const history = await invoke('get_performance_history', { hours });
    
    if (history.length === 0) {
      showNotification('暂无历史数据', 'info');
      return;
    }
    
    const labels = history.map(h => formatTime(h.timestamp));
    const cpuData = history.map(h => h.cpu_avg);
    const memoryData = history.map(h => h.memory_percentage);
    const diskRead = history.map(h => h.disk_read);
    const diskWrite = history.map(h => h.disk_write);
    const networkRx = history.map(h => h.network_rx);
    const networkTx = history.map(h => h.network_tx);
    
    if (charts.cpu) {
      charts.cpu.data.labels = labels;
      charts.cpu.data.datasets[0].data = cpuData;
      charts.cpu.update();
    }
    
    if (charts.memory) {
      charts.memory.data.labels = labels;
      charts.memory.data.datasets[0].data = memoryData;
      charts.memory.update();
    }
    
    if (charts.disk) {
      charts.disk.data.labels = labels;
      charts.disk.data.datasets[0].data = diskRead;
      charts.disk.data.datasets[1].data = diskWrite;
      charts.disk.update();
    }
    
    if (charts.network) {
      charts.network.data.labels = labels;
      charts.network.data.datasets[0].data = networkRx;
      charts.network.data.datasets[1].data = networkTx;
      charts.network.update();
    }
    
    showNotification(`加载了 ${history.length} 条记录`, 'success');
  } catch (error) {
    showNotification('加载历史数据失败: ' + error, 'error');
  }
}

async function generatePassword() {
  const length = parseInt(document.getElementById('password-length').value);
  const includeNumbers = document.getElementById('include-numbers').checked;
  const includeSymbols = document.getElementById('include-symbols').checked;
  
  try {
    const password = await invoke('generate_password', { 
      length, 
      includeSymbols, 
      includeNumbers 
    });
    document.getElementById('generated-password').value = password;
    updatePasswordStrength(password);
  } catch (error) {
    showNotification('生成密码失败: ' + error, 'error');
  }
}

async function generatePassphrase() {
  try {
    const passphrase = await invoke('generate_passphrase', { wordCount: 4 });
    document.getElementById('generated-password').value = passphrase;
    updatePasswordStrength(passphrase);
  } catch (error) {
    showNotification('生成口令短语失败: ' + error, 'error');
  }
}

async function updatePasswordStrength(password) {
  if (!password) {
    document.getElementById('strength-level').textContent = '-';
    document.getElementById('strength-level').className = '';
    return;
  }
  
  try {
    const strength = await invoke('check_password_strength', { password });
    
    const levelNames = {
      weak: '弱',
      medium: '中等',
      strong: '强',
      very_strong: '非常强'
    };
    
    const levelEl = document.getElementById('strength-level');
    levelEl.textContent = `${levelNames[strength.level]} (${strength.score}/${strength.max_score})`;
    levelEl.className = `strength-${strength.level}`;
    
    if (strength.suggestions && strength.suggestions.length > 0) {
      console.log('改进建议:', strength.suggestions);
    }
  } catch (error) {
    console.error('检查密码强度失败:', error);
  }
}

async function setupMasterPassword() {
  const password = document.getElementById('master-password-input').value;
  
  if (!password || password.length < 8) {
    document.getElementById('unlock-error').textContent = '主密码至少需要8个字符';
    document.getElementById('unlock-error').style.display = 'block';
    return;
  }
  
  try {
    await invoke('set_master_password', { password });
    showNotification('主密码设置成功！', 'success');
    unlockVault(password);
  } catch (error) {
    showNotification('设置主密码失败: ' + error, 'error');
  }
}

async function unlockVault(password) {
  if (!password) {
    password = document.getElementById('master-password-input').value;
  }
  
  try {
    const success = await invoke('verify_master_password', { password });
    
    if (success) {
      isVaultUnlocked = true;
      document.getElementById('unlock-screen').style.display = 'none';
      document.getElementById('passwords-container').style.display = 'block';
      document.getElementById('unlock-btn').style.display = 'none';
      document.getElementById('add-password-btn').style.display = 'inline-flex';
      document.getElementById('unlock-error').style.display = 'none';
      loadPasswords();
    } else {
      document.getElementById('unlock-error').textContent = '密码错误';
      document.getElementById('unlock-error').style.display = 'block';
    }
  } catch (error) {
    document.getElementById('unlock-error').textContent = '验证失败: ' + error;
    document.getElementById('unlock-error').style.display = 'block';
  }
}

async function loadPasswords() {
  try {
    passwordsData = await invoke('get_all_password_entries');
    renderPasswords();
  } catch (error) {
    console.error('加载密码失败:', error);
    passwordsData = [];
    renderPasswords();
  }
}

function renderPasswords() {
  const container = document.getElementById('passwords-list');
  
  if (passwordsData.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔐</div>
        <p>暂无保存的密码</p>
        <p style="font-size: 12px; margin-top: 8px;">点击"添加密码"开始保存您的密码</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  
  passwordsData.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'password-card';
    card.innerHTML = `
      <div class="password-card-header">
        <div class="password-card-title">${entry.title}</div>
        <div class="password-card-actions">
          <button onclick="copyToClipboard('${entry.password}')" title="复制密码">📋</button>
          <button onclick="editPassword(${entry.id})" title="编辑">✏️</button>
          <button onclick="confirmDeletePassword(${entry.id})" title="删除">🗑️</button>
        </div>
      </div>
      <div class="password-card-content">
        <div class="password-card-row">
          <span class="password-card-label">用户名</span>
          <span class="password-card-value">${entry.username}</span>
        </div>
        <div class="password-card-row">
          <span class="password-card-label">密码</span>
          <span class="password-card-value">••••••••</span>
        </div>
        ${entry.url ? `
        <div class="password-card-row">
          <span class="password-card-label">URL</span>
          <span class="password-card-value">${entry.url}</span>
        </div>
        ` : ''}
        ${entry.notes ? `
        <div class="password-card-row">
          <span class="password-card-label">备注</span>
          <span class="password-card-value">${entry.notes}</span>
        </div>
        ` : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

async function copyToClipboard(text) {
  try {
    if (window.__TAURI__ && window.__TAURI__.clipboard) {
      await window.__TAURI__.clipboard.writeText(text);
    } else {
      await navigator.clipboard.writeText(text);
    }
    showNotification('已复制到剪贴板', 'success');
  } catch (error) {
    showNotification('复制失败: ' + error, 'error');
  }
}

function showPasswordModal(isEdit = false, entry = null) {
  const modal = document.getElementById('password-modal');
  const title = document.getElementById('modal-title');
  
  if (isEdit && entry) {
    title.textContent = '编辑密码';
    document.getElementById('edit-password-id').value = entry.id;
    document.getElementById('password-title').value = entry.title;
    document.getElementById('password-username').value = entry.username;
    document.getElementById('password-value').value = entry.password;
    document.getElementById('password-url').value = entry.url || '';
    document.getElementById('password-notes').value = entry.notes || '';
  } else {
    title.textContent = '添加密码';
    document.getElementById('edit-password-id').value = '';
    document.getElementById('password-form').reset();
  }
  
  modal.style.display = 'flex';
}

function editPassword(id) {
  const entry = passwordsData.find(p => p.id === id);
  if (entry) {
    showPasswordModal(true, entry);
  }
}

function confirmDeletePassword(id) {
  pendingDeleteId = id;
  pendingDeleteType = 'password';
  document.getElementById('confirm-message').textContent = '确定要删除这个密码条目吗？';
  document.getElementById('confirm-modal').style.display = 'flex';
}

async function savePasswordEntry(event) {
  event.preventDefault();
  
  const id = document.getElementById('edit-password-id').value;
  const entry = {
    id: id ? parseInt(id) : 0,
    title: document.getElementById('password-title').value,
    username: document.getElementById('password-username').value,
    password: document.getElementById('password-value').value,
    url: document.getElementById('password-url').value || null,
    notes: document.getElementById('password-notes').value || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  try {
    if (id) {
      await invoke('update_password_entry', { entry });
      showNotification('密码已更新', 'success');
    } else {
      await invoke('save_password_entry', { entry });
      showNotification('密码已保存', 'success');
    }
    
    document.getElementById('password-modal').style.display = 'none';
    loadPasswords();
  } catch (error) {
    showNotification('保存失败: ' + error, 'error');
  }
}

async function runSecurityAudit() {
  if (passwordsData.length === 0) {
    showNotification('暂无密码可审计', 'info');
    return;
  }
  
  const resultsEl = document.getElementById('audit-results');
  resultsEl.style.display = 'block';
  resultsEl.innerHTML = '<p>正在审计...</p>';
  
  const issues = [];
  const passwordCounts = {};
  
  for (const entry of passwordsData) {
    if (passwordCounts[entry.password]) {
      passwordCounts[entry.password]++;
    } else {
      passwordCounts[entry.password] = 1;
    }
    
    try {
      const strength = await invoke('check_password_strength', { password: entry.password });
      if (strength.level === 'weak' || strength.level === 'medium') {
        issues.push({
          type: 'weak',
          title: entry.title,
          message: `密码强度为 "${strength.level === 'weak' ? '弱' : '中等'}"`
        });
      }
      
      const isPwned = await invoke('check_pwned_password', { password: entry.password });
      if (isPwned) {
        issues.push({
          type: 'pwned',
          title: entry.title,
          message: '此密码曾在数据泄露中出现过！'
        });
      }
    } catch (e) {
      console.log('Audit check failed for', entry.title, ':', e);
    }
  }
  
  for (const [password, count] of Object.entries(passwordCounts)) {
    if (count > 1) {
      const entries = passwordsData.filter(p => p.password === password);
      issues.push({
        type: 'duplicate',
        title: entries.map(e => e.title).join(', '),
        message: `有 ${count} 个账户使用了相同的密码`
      });
    }
  }
  
  if (issues.length === 0) {
    resultsEl.innerHTML = `
      <div class="audit-item audit-item-success">
        <div class="audit-item-title">✅ 所有密码都通过了安全审计！</div>
      </div>
    `;
  } else {
    resultsEl.innerHTML = issues.map(issue => {
      const typeClass = issue.type === 'pwned' ? 'audit-item-danger' : 
                        issue.type === 'weak' ? 'audit-item-warning' : 'audit-item-warning';
      const icon = issue.type === 'pwned' ? '⚠️' : 
                   issue.type === 'weak' ? '⚡' : '🔄';
      
      return `
        <div class="audit-item ${typeClass}">
          <div class="audit-item-title">${icon} ${issue.title}</div>
          <div>${issue.message}</div>
        </div>
      `;
    }).join('');
  }
}

async function testRegex() {
  const pattern = document.getElementById('regex-pattern').value;
  const testText = document.getElementById('test-text').value;
  const flags = document.getElementById('regex-flags').value;
  
  if (!pattern) {
    showNotification('请输入正则表达式', 'warning');
    return;
  }
  
  try {
    const result = await invoke('test_regex', { pattern, testText: testText });
    updateRegexResults(result, pattern, testText, flags);
  } catch (error) {
    showNotification('测试失败: ' + error, 'error');
  }
}

function updateRegexResults(result, pattern, testText, flags) {
  const statusEl = document.getElementById('match-status');
  const matchesEl = document.getElementById('matches-list');
  const highlightEl = document.getElementById('highlighted-text');
  
  if (!result.success) {
    statusEl.className = 'match-status error';
    statusEl.textContent = '❌ 正则表达式错误: ' + result.error;
    matchesEl.innerHTML = '';
    highlightEl.textContent = testText;
    return;
  }
  
  if (result.is_match) {
    statusEl.className = 'match-status match-found';
    statusEl.textContent = `✅ 找到 ${result.match_count} 个匹配`;
    
    matchesEl.innerHTML = result.matches.map((m, i) => `
      <div class="match-item">
        <strong>匹配 ${i + 1}:</strong> "${m.match}" (位置: ${m.start}-${m.end})
      </div>
    `).join('');
    
    let highlighted = '';
    let lastIndex = 0;
    
    result.matches.forEach((match, i) => {
      if (match.start > lastIndex) {
        highlighted += testText.substring(lastIndex, match.start);
      }
      highlighted += `<span class="highlight-match">${testText.substring(match.start, match.end)}</span>`;
      lastIndex = match.end;
    });
    
    if (lastIndex < testText.length) {
      highlighted += testText.substring(lastIndex);
    }
    
    highlightEl.innerHTML = highlighted || testText;
  } else {
    statusEl.className = 'match-status no-match';
    statusEl.textContent = '❌ 未找到匹配';
    matchesEl.innerHTML = '';
    highlightEl.textContent = testText;
  }
}

async function explainRegex() {
  const pattern = document.getElementById('regex-pattern').value;
  
  if (!pattern) {
    showNotification('请输入正则表达式', 'warning');
    return;
  }
  
  try {
    const explanation = await invoke('explain_regex', { pattern });
    document.getElementById('regex-explanation').textContent = explanation;
  } catch (error) {
    document.getElementById('regex-explanation').textContent = '解释失败: ' + error;
  }
}

async function loadSavedPatterns() {
  try {
    savedPatternsData = await invoke('get_all_regex_patterns');
    renderSavedPatterns();
    document.getElementById('saved-patterns-panel').style.display = 'flex';
  } catch (error) {
    showNotification('加载收藏模式失败: ' + error, 'error');
  }
}

function renderSavedPatterns() {
  const container = document.getElementById('saved-patterns-list');
  
  if (savedPatternsData.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📚</div>
        <p>暂无收藏的正则模式</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  
  savedPatternsData.forEach(pattern => {
    const item = document.createElement('div');
    item.className = 'pattern-item';
    item.innerHTML = `
      <div class="pattern-item-name">${pattern.name}</div>
      <div class="pattern-item-pattern">${pattern.pattern}</div>
      <div class="pattern-item-description">${pattern.description}</div>
      <div class="pattern-item-actions">
        <button class="btn btn-primary btn-small" onclick="usePattern('${pattern.pattern}')">使用</button>
        <button class="btn btn-danger btn-small" onclick="confirmDeletePattern(${pattern.id})">删除</button>
      </div>
    `;
    container.appendChild(item);
  });
}

function usePattern(pattern) {
  document.getElementById('regex-pattern').value = pattern;
  document.getElementById('saved-patterns-panel').style.display = 'none';
}

function confirmDeletePattern(id) {
  pendingDeleteId = id;
  pendingDeleteType = 'pattern';
  document.getElementById('confirm-message').textContent = '确定要删除这个正则模式吗？';
  document.getElementById('confirm-modal').style.display = 'flex';
}

function showSavePatternModal() {
  const pattern = document.getElementById('regex-pattern').value;
  
  if (!pattern) {
    showNotification('请先输入正则表达式', 'warning');
    return;
  }
  
  document.getElementById('pattern-to-save').value = pattern;
  document.getElementById('save-pattern-form').reset();
  document.getElementById('pattern-to-save').value = pattern;
  document.getElementById('save-pattern-modal').style.display = 'flex';
}

async function savePattern(event) {
  event.preventDefault();
  
  const name = document.getElementById('pattern-name').value;
  const pattern = document.getElementById('pattern-to-save').value;
  const description = document.getElementById('pattern-description').value;
  const category = document.getElementById('pattern-category').value;
  
  try {
    await invoke('save_regex_pattern', { 
      name, 
      pattern, 
      description: description || null, 
      category 
    });
    showNotification('模式已保存', 'success');
    document.getElementById('save-pattern-modal').style.display = 'none';
  } catch (error) {
    showNotification('保存失败: ' + error, 'error');
  }
}

async function confirmDelete() {
  if (pendingDeleteType === 'password') {
    try {
      await invoke('delete_password_entry', { id: pendingDeleteId });
      showNotification('密码已删除', 'success');
      loadPasswords();
    } catch (error) {
      showNotification('删除失败: ' + error, 'error');
    }
  } else if (pendingDeleteType === 'pattern') {
    try {
      await invoke('delete_regex_pattern', { id: pendingDeleteId });
      showNotification('模式已删除', 'success');
      loadSavedPatterns();
    } catch (error) {
      showNotification('删除失败: ' + error, 'error');
    }
  }
  
  document.getElementById('confirm-modal').style.display = 'none';
  pendingDeleteId = null;
  pendingDeleteType = null;
}

function togglePasswordVisibility() {
  const input = document.getElementById('password-value');
  input.type = input.type === 'password' ? 'text' : 'password';
}

async function initApp() {
  await initDatabase();
  
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
  });
  
  document.getElementById('refresh-btn').addEventListener('click', refreshSystemResources);
  
  document.getElementById('auto-refresh-btn').addEventListener('click', () => {
    isAutoRefreshing = !isAutoRefreshing;
    const btn = document.getElementById('auto-refresh-btn');
    
    if (isAutoRefreshing) {
      btn.textContent = '⏸️ 暂停自动刷新';
      startAutoRefresh();
    } else {
      btn.textContent = '▶️ 开始自动刷新';
      stopAutoRefresh();
    }
  });
  
  document.getElementById('refresh-processes-btn').addEventListener('click', refreshProcesses);
  document.getElementById('process-search').addEventListener('input', renderProcesses);
  
  document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (currentSortField === field) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortField = field;
        currentSortOrder = 'asc';
      }
      renderProcesses();
    });
  });
  
  document.getElementById('load-history-btn').addEventListener('click', loadHistoryData);
  
  document.getElementById('password-length').addEventListener('input', (e) => {
    document.getElementById('password-length-value').textContent = e.target.value;
  });
  
  document.getElementById('generate-password-btn').addEventListener('click', generatePassword);
  document.getElementById('generate-passphrase-btn').addEventListener('click', generatePassphrase);
  document.getElementById('copy-password-btn').addEventListener('click', () => {
    const password = document.getElementById('generated-password').value;
    if (password) copyToClipboard(password);
  });
  
  document.getElementById('unlock-btn').addEventListener('click', () => {
    document.getElementById('unlock-screen').style.display = 'flex';
  });
  
  document.getElementById('unlock-confirm-btn').addEventListener('click', () => unlockVault());
  document.getElementById('setup-master-btn').addEventListener('click', setupMasterPassword);
  document.getElementById('add-password-btn').addEventListener('click', () => showPasswordModal(false));
  
  document.getElementById('password-form').addEventListener('submit', savePasswordEntry);
  document.getElementById('toggle-password-visibility').addEventListener('click', togglePasswordVisibility);
  document.getElementById('generate-for-form-btn').addEventListener('click', async () => {
    const password = await invoke('generate_password', { 
      length: 16, 
      includeSymbols: true, 
      includeNumbers: true 
    });
    document.getElementById('password-value').value = password;
  });
  
  document.getElementById('run-audit-btn').addEventListener('click', runSecurityAudit);
  
  document.getElementById('test-regex-btn').addEventListener('click', testRegex);
  document.getElementById('explain-regex-btn').addEventListener('click', explainRegex);
  document.getElementById('save-pattern-btn').addEventListener('click', showSavePatternModal);
  document.getElementById('load-saved-patterns-btn').addEventListener('click', loadSavedPatterns);
  document.getElementById('close-patterns-btn').addEventListener('click', () => {
    document.getElementById('saved-patterns-panel').style.display = 'none';
  });
  
  document.getElementById('save-pattern-form').addEventListener('submit', savePattern);
  
  document.querySelectorAll('#close-modal-btn, #cancel-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('password-modal').style.display = 'none';
    });
  });
  
  document.querySelectorAll('#close-pattern-modal-btn, #cancel-pattern-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('save-pattern-modal').style.display = 'none';
    });
  });
  
  document.querySelectorAll('#close-confirm-modal-btn, #cancel-confirm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('confirm-modal').style.display = 'none';
    });
  });
  
  document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);
  
  document.getElementById('master-password-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') unlockVault();
  });
  
  refreshSystemResources();
  refreshProcesses();
  startAutoRefresh();
}

function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  
  autoRefreshInterval = setInterval(() => {
    if (isAutoRefreshing) {
      refreshSystemResources();
    }
  }, 2000);
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

window.addEventListener('DOMContentLoaded', initApp);
