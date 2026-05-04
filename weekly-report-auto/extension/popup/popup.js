class PopupController {
  constructor() {
    this.init();
  }

  async init() {
    this.bindEvents();
    await this.checkBackendStatus();
    await this.loadStats();
    await this.loadDataSources();
  }

  bindEvents() {
    document.getElementById('scrapeChatBtn').addEventListener('click', () => this.scrapeChatData());
    document.getElementById('fetchGitBtn').addEventListener('click', () => this.fetchGitCommits());
    document.getElementById('generateReportBtn').addEventListener('click', () => this.generateReport());
    document.getElementById('openSettingsBtn').addEventListener('click', () => this.openSettings());
    document.getElementById('openSidePanelBtn').addEventListener('click', () => this.openSidePanel());
    document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());
  }

  async checkBackendStatus() {
    const statusBadge = document.getElementById('backendStatus');
    try {
      const response = await fetch('http://localhost:5000/api/health');
      if (response.ok) {
        statusBadge.textContent = '已连接';
        statusBadge.className = 'status-badge connected';
      } else {
        throw new Error('Backend not healthy');
      }
    } catch (error) {
      statusBadge.textContent = '未连接';
      statusBadge.className = 'status-badge disconnected';
    }
  }

  async loadStats() {
    try {
      const chatRecords = await this.executeInPage(() => dbManager.getChatRecords());
      const reports = await this.executeInPage(() => dbManager.getReports());
      
      this.updateStat(0, chatRecords.length || 0);
      this.updateStat(3, reports.length || 0);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  async loadDataSources() {
    const container = document.getElementById('dataSources');
    
    try {
      const chatRecords = await this.executeInPage(() => dbManager.getChatRecords());
      
      if (!chatRecords || chatRecords.length === 0) {
        container.innerHTML = '<div class="section-empty">请先采集数据</div>';
        return;
      }

      const weworkCount = chatRecords.filter(r => r.source === 'wework').length;
      const dingtalkCount = chatRecords.filter(r => r.source === 'dingtalk').length;

      container.innerHTML = `
        ${weworkCount > 0 ? `
        <div class="source-item">
          <div class="source-info">
            <div class="source-icon wework">W</div>
            <div>
              <div class="source-name">企业微信</div>
              <div class="source-count">${weworkCount} 条记录</div>
            </div>
          </div>
        </div>
        ` : ''}
        ${dingtalkCount > 0 ? `
        <div class="source-item">
          <div class="source-info">
            <div class="source-icon dingtalk">D</div>
            <div>
              <div class="source-name">钉钉</div>
              <div class="source-count">${dingtalkCount} 条记录</div>
            </div>
          </div>
        </div>
        ` : ''}
      `;
    } catch (error) {
      container.innerHTML = '<div class="section-empty">加载数据失败</div>';
    }
  }

  updateStat(index, value) {
    const statItems = document.querySelectorAll('.stat-item');
    if (statItems[index]) {
      statItems[index].querySelector('.stat-value').textContent = value;
    }
  }

  async scrapeChatData() {
    const btn = document.getElementById('scrapeChatBtn');
    this.setButtonLoading(btn, true);
    
    try {
      const response = await chrome.runtime.sendMessage({ type: 'SCRAPE_CHAT_DATA' });
      
      if (response.success && response.data) {
        const messages = response.data.messages || [];
        await this.executeInPage((msgs) => dbManager.addChatRecords(msgs), messages);
        
        this.showToast(`成功抓取 ${messages.length} 条聊天记录`, 'success');
        await this.loadStats();
        await this.loadDataSources();
      } else {
        this.showToast(response.error || '抓取失败', 'error');
      }
    } catch (error) {
      this.showToast('抓取失败: ' + error.message, 'error');
    } finally {
      this.setButtonLoading(btn, false);
    }
  }

  async fetchGitCommits() {
    const btn = document.getElementById('fetchGitBtn');
    this.setButtonLoading(btn, true);
    
    try {
      const repoPath = prompt('请输入Git仓库路径 (可选，留空使用当前目录):');
      
      const response = await chrome.runtime.sendMessage({
        type: 'FETCH_GIT_COMMITS',
        repoPath: repoPath || null,
        since: this.getWeekStartDate()
      });
      
      if (response.success && response.commits) {
        const fragments = response.commits.map(commit => ({
          sourceType: 'git',
          content: `[${commit.shortHash}] ${commit.author}: ${commit.message}`,
          metadata: commit,
          timestamp: commit.date
        }));
        
        for (const fragment of fragments) {
          await this.executeInPage((f) => dbManager.addDocumentFragment(f), fragment);
        }
        
        this.showToast(`成功获取 ${fragments.length} 条Git提交`, 'success');
        await this.loadStats();
      } else {
        this.showToast(response.error || '获取Git提交失败', 'error');
      }
    } catch (error) {
      this.showToast('获取失败: ' + error.message, 'error');
    } finally {
      this.setButtonLoading(btn, false);
    }
  }

  async generateReport() {
    const btn = document.getElementById('generateReportBtn');
    this.setButtonLoading(btn, true);
    
    try {
      const chatRecords = await this.executeInPage(() => dbManager.getChatRecords({ since: this.getWeekStartDate() }));
      const docFragments = await this.executeInPage(() => dbManager.getDocumentFragments({ since: this.getWeekStartDate() }));
      
      const context = {
        chatRecords: chatRecords || [],
        documentFragments: docFragments || [],
        weekStart: this.getWeekStartDate(),
        weekEnd: new Date().toISOString().split('T')[0]
      };
      
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_REPORT',
        context
      });
      
      if (response.success && response.report) {
        await this.executeInPage((report) => dbManager.saveReport({
          content: report,
          weekStart: this.getWeekStartDate()
        }), response.report);
        
        this.showToast('周报生成成功！', 'success');
        await this.loadStats();
        this.openSidePanel();
      } else {
        this.showToast(response.error || '生成周报失败', 'error');
      }
    } catch (error) {
      this.showToast('生成失败: ' + error.message, 'error');
    } finally {
      this.setButtonLoading(btn, false);
    }
  }

  async openSettings() {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options/options.html'));
    }
  }

  async openSidePanel() {
    try {
      await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });
    } catch (error) {
      this.showToast('打开侧边栏失败', 'error');
    }
  }

  async exportData() {
    try {
      const data = await this.executeInPage(() => dbManager.exportAllData());
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weekly-report-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('数据导出成功', 'success');
    } catch (error) {
      this.showToast('导出失败: ' + error.message, 'error');
    }
  }

  executeInPage(func, ...args) {
    return new Promise((resolve, reject) => {
      chrome.scripting.executeScript({
        target: { tabId: chrome.devtools.inspectedWindow.tabId },
        func: func,
        args: args
      }, (results) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(results && results[0] ? results[0].result : null);
        }
      });
    });
  }

  setButtonLoading(btn, loading) {
    if (loading) {
      btn.disabled = true;
      const originalHTML = btn.innerHTML;
      btn.dataset.originalHTML = originalHTML;
      btn.innerHTML = '<div class="loading-spinner"></div> 处理中...';
    } else {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.originalHTML || btn.innerHTML;
    }
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

  getWeekStartDate() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
