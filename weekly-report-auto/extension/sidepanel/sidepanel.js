class SidePanelController {
  constructor() {
    this.currentReport = null;
    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadLatestReport();
    await this.loadHistory();
    await this.loadDataSource();
  }

  bindEvents() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    document.getElementById('generateBtn').addEventListener('click', () => this.generateReport());
    document.getElementById('copyReportBtn').addEventListener('click', () => this.copyReport());
    document.getElementById('showFeedbackBtn').addEventListener('click', () => this.toggleFeedbackSection());
    document.getElementById('submitFeedbackBtn').addEventListener('click', () => this.submitFeedback());
    document.getElementById('refreshDataBtn').addEventListener('click', () => this.loadDataSource());
  }

  switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
  }

  async loadLatestReport() {
    try {
      const reports = await dbManager.getReports();
      
      if (reports.length > 0) {
        this.currentReport = reports[0];
        this.renderReport(reports[0]);
        this.updateReportDate(reports[0]);
      }
    } catch (error) {
      console.error('Failed to load latest report:', error);
    }
  }

  async loadHistory() {
    const container = document.getElementById('historyList');
    
    try {
      const reports = await dbManager.getReports();
      
      if (reports.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📂</div>
            <div class="empty-state-text">暂无历史记录</div>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="history-list">
          ${reports.map((report, index) => `
            <div class="history-item" data-index="${index}">
              <div class="history-item-date">${this.formatDate(report.createdAt)}</div>
              <div class="history-item-preview">${this.truncateText(report.content, 100)}</div>
            </div>
          `).join('')}
        </div>
      `;

      container.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
          const index = parseInt(item.dataset.index);
          this.currentReport = reports[index];
          this.renderReport(reports[index]);
          this.switchTab('report');
        });
      });
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }

  async loadDataSource() {
    const container = document.getElementById('dataList');
    
    try {
      const chatRecords = await dbManager.getChatRecords();
      const docFragments = await dbManager.getDocumentFragments();
      
      const allData = [
        ...chatRecords.map(r => ({ ...r, sourceType: r.source })),
        ...docFragments.map(f => ({ ...f, sourceType: f.sourceType || 'document' }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      if (allData.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📊</div>
            <div class="empty-state-text">暂无采集的数据</div>
            <div class="empty-state-subtext">请在Popup中采集聊天记录或Git提交</div>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="data-list">
          ${allData.slice(0, 50).map(item => `
            <div class="data-item">
              <div class="data-item-header">
                <span class="data-item-sender">${item.sender || item.sourceType || '未知'}</span>
                <span class="data-item-time">${this.formatTime(item.timestamp)}</span>
              </div>
              <div class="data-item-content">${this.truncateText(item.content || '', 80)}</div>
              <span class="data-item-source source-${item.sourceType || item.source}">
                ${this.getSourceLabel(item.sourceType || item.source)}
              </span>
            </div>
          `).join('')}
        </div>
      `;
    } catch (error) {
      console.error('Failed to load data source:', error);
    }
  }

  renderReport(report) {
    const container = document.getElementById('reportContent');
    container.innerHTML = `
      <div class="report-viewer">${this.escapeHtml(report.content)}</div>
    `;
    
    document.getElementById('reportActions').style.display = 'flex';
    document.getElementById('feedbackSection').style.display = 'none';
  }

  updateReportDate(report) {
    const dateEl = document.getElementById('reportDate');
    dateEl.textContent = this.formatDate(report.createdAt);
  }

  async generateReport() {
    const btn = document.getElementById('generateBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<div class="loading-spinner" style="width: 16px; height: 16px;"></div> 生成中...';
    btn.disabled = true;

    try {
      const weekStart = this.getWeekStartDate();
      const chatRecords = await dbManager.getChatRecords({ since: weekStart });
      const docFragments = await dbManager.getDocumentFragments({ since: weekStart });

      const context = {
        chatRecords: chatRecords || [],
        documentFragments: docFragments || [],
        weekStart: weekStart,
        weekEnd: new Date().toISOString().split('T')[0]
      };

      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_REPORT',
        context
      });

      if (response.success && response.report) {
        const savedReport = await dbManager.saveReport({
          content: response.report,
          weekStart: weekStart
        });
        
        this.currentReport = savedReport;
        this.renderReport(savedReport);
        this.updateReportDate(savedReport);
        this.showToast('周报生成成功！', 'success');
        
        await this.loadHistory();
      } else {
        this.showToast(response.error || '生成周报失败', 'error');
      }
    } catch (error) {
      this.showToast('生成失败: ' + error.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  async copyReport() {
    if (!this.currentReport) return;
    
    try {
      await navigator.clipboard.writeText(this.currentReport.content);
      this.showToast('已复制到剪贴板', 'success');
    } catch (error) {
      this.showToast('复制失败', 'error');
    }
  }

  toggleFeedbackSection() {
    const section = document.getElementById('feedbackSection');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
  }

  async submitFeedback() {
    const feedbackInput = document.getElementById('feedbackInput');
    const modifiedReportInput = document.getElementById('modifiedReportInput');
    
    const feedback = feedbackInput.value.trim();
    const modifiedReport = modifiedReportInput.value.trim();

    if (!feedback && !modifiedReport) {
      this.showToast('请填写反馈内容或修改后的报告', 'error');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SUBMIT_FEEDBACK',
        reportId: this.currentReport?.id,
        originalReport: this.currentReport?.content,
        modifiedReport: modifiedReport || null,
        feedback: feedback || null
      });

      if (response.success) {
        await dbManager.addFeedback({
          reportId: this.currentReport?.id,
          originalReport: this.currentReport?.content,
          modifiedReport: modifiedReport,
          feedback: feedback
        });
        
        this.showToast('反馈已提交，AI将学习您的偏好', 'success');
        feedbackInput.value = '';
        modifiedReportInput.value = '';
        this.toggleFeedbackSection();
      } else {
        this.showToast(response.error || '提交失败', 'error');
      }
    } catch (error) {
      this.showToast('提交失败: ' + error.message, 'error');
    }
  }

  getSourceLabel(source) {
    const labels = {
      wework: '企业微信',
      dingtalk: '钉钉',
      git: 'Git提交',
      document: '文档'
    };
    return labels[source] || source;
  }

  getWeekStartDate() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  }

  formatTime(dateStr) {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
  new SidePanelController();
});
