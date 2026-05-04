class OptionsController {
  constructor() {
    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadSettings();
    await this.checkBackendStatus();
  }

  bindEvents() {
    document.getElementById('saveBtn').addEventListener('click', () => this.saveSettings());
    document.getElementById('resetBtn').addEventListener('click', () => this.resetSettings());
    
    document.getElementById('testConnectionBtn').addEventListener('click', () => this.checkBackendStatus());
    
    document.getElementById('maxTokens').addEventListener('input', (e) => {
      document.getElementById('maxTokensValue').textContent = e.target.value;
    });
    
    document.getElementById('temperature').addEventListener('input', (e) => {
      document.getElementById('temperatureValue').textContent = (e.target.value / 100).toFixed(2);
    });
    
    document.getElementById('resetPromptBtn').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('customSystemPrompt').value = '';
    });
    
    document.getElementById('exportAllBtn').addEventListener('click', () => this.exportData('all'));
    document.getElementById('exportChatsBtn').addEventListener('click', () => this.exportData('chats'));
    document.getElementById('exportReportsBtn').addEventListener('click', () => this.exportData('reports'));
    
    document.getElementById('clearChatsBtn').addEventListener('click', () => this.clearData('chats'));
    document.getElementById('clearAllBtn').addEventListener('click', () => this.clearData('all'));
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get('config');
      const config = result.config || {};
      
      if (config.apiKey) {
        document.getElementById('apiKey').value = config.apiKey;
      }
      
      if (config.model) {
        document.getElementById('model').value = config.model;
      }
      
      if (config.maxTokens) {
        document.getElementById('maxTokens').value = config.maxTokens;
        document.getElementById('maxTokensValue').textContent = config.maxTokens;
      }
      
      if (config.temperature !== undefined) {
        const tempValue = Math.round(config.temperature * 100);
        document.getElementById('temperature').value = tempValue;
        document.getElementById('temperatureValue').textContent = config.temperature.toFixed(2);
      }
      
      if (config.backendUrl) {
        document.getElementById('backendUrl').value = config.backendUrl;
      }
      
      if (config.includeSections) {
        document.getElementById('sectionWorkDone').checked = config.includeSections.includes('work_done');
        document.getElementById('sectionIssues').checked = config.includeSections.includes('issues');
        document.getElementById('sectionPlans').checked = config.includeSections.includes('plans');
        document.getElementById('sectionMeetings').checked = config.includeSections.includes('meetings');
      }
      
      if (config.customSystemPrompt) {
        document.getElementById('customSystemPrompt').value = config.customSystemPrompt;
      }
      
      if (config.useLearnedPreferences !== undefined) {
        document.getElementById('useLearnedPreferences').checked = config.useLearnedPreferences;
      }
      
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.showToast('加载设置失败', 'error');
    }
  }

  async saveSettings() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('model').value;
    const maxTokens = parseInt(document.getElementById('maxTokens').value);
    const temperature = parseInt(document.getElementById('temperature').value) / 100;
    const backendUrl = document.getElementById('backendUrl').value.trim();
    const customSystemPrompt = document.getElementById('customSystemPrompt').value.trim();
    const useLearnedPreferences = document.getElementById('useLearnedPreferences').checked;
    
    const includeSections = [];
    if (document.getElementById('sectionWorkDone').checked) includeSections.push('work_done');
    if (document.getElementById('sectionIssues').checked) includeSections.push('issues');
    if (document.getElementById('sectionPlans').checked) includeSections.push('plans');
    if (document.getElementById('sectionMeetings').checked) includeSections.push('meetings');
    
    try {
      const config = {
        apiKey,
        model,
        maxTokens,
        temperature,
        backendUrl: backendUrl || 'http://localhost:5000',
        includeSections,
        customSystemPrompt,
        useLearnedPreferences
      };
      
      await chrome.storage.local.set({ config });
      
      await chrome.runtime.sendMessage({
        type: 'SAVE_CONFIG',
        config
      });
      
      this.showToast('设置已保存', 'success');
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showToast('保存设置失败', 'error');
    }
  }

  async resetSettings() {
    if (!confirm('确定要重置所有设置为默认值吗？')) {
      return;
    }
    
    try {
      await chrome.storage.local.remove('config');
      
      document.getElementById('apiKey').value = '';
      document.getElementById('model').value = 'gpt-4-turbo-preview';
      document.getElementById('maxTokens').value = 4000;
      document.getElementById('maxTokensValue').textContent = '4000';
      document.getElementById('temperature').value = 70;
      document.getElementById('temperatureValue').textContent = '0.70';
      document.getElementById('backendUrl').value = 'http://localhost:5000';
      document.getElementById('customSystemPrompt').value = '';
      document.getElementById('useLearnedPreferences').checked = true;
      
      document.getElementById('sectionWorkDone').checked = true;
      document.getElementById('sectionIssues').checked = true;
      document.getElementById('sectionPlans').checked = true;
      document.getElementById('sectionMeetings').checked = false;
      
      this.showToast('设置已重置', 'success');
      
    } catch (error) {
      console.error('Failed to reset settings:', error);
      this.showToast('重置设置失败', 'error');
    }
  }

  async checkBackendStatus() {
    const statusBadge = document.getElementById('backendStatus');
    
    try {
      const backendUrl = document.getElementById('backendUrl').value.trim() || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/health`);
      
      if (response.ok) {
        statusBadge.className = 'status-badge connected';
        statusBadge.innerHTML = '<span class="status-dot"></span><span>已连接</span>';
        return true;
      } else {
        throw new Error('Backend not healthy');
      }
    } catch (error) {
      statusBadge.className = 'status-badge disconnected';
      statusBadge.innerHTML = '<span class="status-dot"></span><span>未连接</span>';
      return false;
    }
  }

  async exportData(type) {
    try {
      let data = {};
      
      if (type === 'all') {
        const result = await this.executeInPage(() => dbManager.exportAllData());
        data = result;
      } else if (type === 'chats') {
        const chats = await this.executeInPage(() => dbManager.getChatRecords());
        data = { chatRecords: chats };
      } else if (type === 'reports') {
        const reports = await this.executeInPage(() => dbManager.getReports());
        data = { reports: reports };
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weekly-report-${type}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.showToast('数据导出成功', 'success');
      
    } catch (error) {
      console.error('Export failed:', error);
      this.showToast('导出失败', 'error');
    }
  }

  async clearData(type) {
    let message = type === 'all' 
      ? '确定要清除所有数据吗？此操作无法撤销！'
      : '确定要清除所有聊天记录吗？此操作无法撤销！';
    
    if (!confirm(message)) {
      return;
    }
    
    try {
      if (type === 'all') {
        await this.executeInPage(() => {
          dbManager.clearStore('chatRecords');
          dbManager.clearStore('documentFragments');
          dbManager.clearStore('reports');
          dbManager.clearStore('feedbacks');
        });
      } else if (type === 'chats') {
        await this.executeInPage(() => dbManager.clearStore('chatRecords'));
      }
      
      this.showToast('数据已清除', 'success');
      
    } catch (error) {
      console.error('Clear failed:', error);
      this.showToast('清除失败', 'error');
    }
  }

  executeInPage(func, ...args) {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
          resolve(null);
          return;
        }
        
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: func,
          args: args
        }, (results) => {
          if (chrome.runtime.lastError) {
            resolve(null);
          } else {
            resolve(results && results[0] ? results[0].result : null);
          }
        });
      });
    });
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show';
    
    if (type === 'success') {
      toast.style.background = '#34a853';
    } else if (type === 'error') {
      toast.style.background = '#ea4335';
    } else {
      toast.style.background = '#333';
    }
    
    setTimeout(() => {
      toast.className = 'toast';
    }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OptionsController();
});
