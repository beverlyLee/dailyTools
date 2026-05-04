class BatchImageProcessor {
  constructor() {
    this.selectedFiles = [];
    this.rules = [];
    this.currentRuleId = null;
    this.selectedPreviewImage = null;
    this.watermarkImagePath = null;
    
    this.init();
  }
  
  async init() {
    this.setupTabs();
    this.setupEventListeners();
    await this.loadRules();
    await this.loadHistory();
  }
  
  setupTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');
      });
    });
  }
  
  setupEventListeners() {
    document.getElementById('select-files-btn').addEventListener('click', () => this.selectFiles());
    document.getElementById('clear-files-btn').addEventListener('click', () => this.clearFiles());
    
    document.getElementById('rule-select').addEventListener('change', (e) => this.loadRule(e.target.value));
    document.getElementById('save-rule-btn').addEventListener('click', () => this.saveRule());
    document.getElementById('delete-rule-btn').addEventListener('click', () => this.deleteRule());
    
    this.setupCheckboxToggles();
    this.setupRenameRuleListeners();
    
    document.getElementById('enable-resize').addEventListener('change', (e) => {
      document.getElementById('resize-options').classList.toggle('hidden', !e.target.checked);
    });
    document.getElementById('enable-crop').addEventListener('change', (e) => {
      document.getElementById('crop-options').classList.toggle('hidden', !e.target.checked);
    });
    
    document.getElementById('rotation-angle').addEventListener('change', (e) => {
      document.getElementById('custom-rotation-group').classList.toggle('hidden', e.target.value !== 'custom');
    });
    
    document.getElementById('output-quality').addEventListener('input', (e) => {
      document.getElementById('quality-value').textContent = `${e.target.value}%`;
    });
    
    document.getElementById('enable-watermark').addEventListener('change', (e) => {
      document.getElementById('watermark-options').classList.toggle('hidden', !e.target.checked);
    });
    
    document.getElementById('watermark-type').addEventListener('change', (e) => {
      document.getElementById('text-watermark-options').classList.toggle('hidden', e.target.value !== 'text');
      document.getElementById('image-watermark-options').classList.toggle('hidden', e.target.value !== 'image');
    });
    
    document.getElementById('select-watermark-image').addEventListener('click', () => this.selectWatermarkImage());
    
    document.getElementById('watermark-opacity').addEventListener('input', (e) => {
      document.getElementById('opacity-value').textContent = `${e.target.value}%`;
    });
    
    document.getElementById('select-output-dir-btn').addEventListener('click', () => this.selectOutputDir());
    
    document.getElementById('generate-preview-btn').addEventListener('click', () => this.generatePreview());
    document.getElementById('preview-image-select').addEventListener('change', (e) => this.selectPreviewImage(e.target.value));
    
    document.getElementById('refresh-history-btn').addEventListener('click', () => this.loadHistory());
    
    document.getElementById('process-btn').addEventListener('click', () => this.startBatchProcessing());
  }
  
  setupCheckboxToggles() {
    const toggles = [
      { checkbox: 'use-sequence', options: 'sequence-options' },
      { checkbox: 'use-date', options: 'date-options' },
      { checkbox: 'use-exif', options: 'exif-options' },
      { checkbox: 'use-custom-text', options: 'custom-text-options' }
    ];
    
    toggles.forEach(({ checkbox, options }) => {
      document.getElementById(checkbox).addEventListener('change', (e) => {
        document.getElementById(options).classList.toggle('hidden', !e.target.checked);
        this.updateRenamePreview();
      });
    });
  }
  
  setupRenameRuleListeners() {
    const ruleInputs = [
      'use-sequence', 'sequence-start', 'sequence-padding', 'sequence-prefix', 'sequence-suffix',
      'use-date', 'date-source', 'date-format',
      'use-exif', 'exif-fields',
      'use-custom-text', 'custom-text', 'custom-text-position',
      'separator'
    ];
    
    ruleInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => this.updateRenamePreview());
        el.addEventListener('input', () => this.updateRenamePreview());
      }
    });
  }
  
  async selectFiles() {
    const files = await window.electronAPI.selectFiles();
    if (files && files.length > 0) {
      for (const file of files) {
        if (!this.selectedFiles.find(f => f.path === file)) {
          const info = await window.electronAPI.getFileInfo(file);
          if (!info.error) {
            this.selectedFiles.push(info);
          }
        }
      }
      this.renderImagesList();
      this.updatePreviewImageSelect();
    }
  }
  
  clearFiles() {
    this.selectedFiles = [];
    this.renderImagesList();
    this.updatePreviewImageSelect();
  }
  
  renderImagesList() {
    const emptyEl = document.getElementById('images-empty');
    const listEl = document.getElementById('images-list');
    const countEl = document.getElementById('files-count');
    
    countEl.textContent = `已选择: ${this.selectedFiles.length} 张图片`;
    
    if (this.selectedFiles.length === 0) {
      emptyEl.classList.remove('hidden');
      listEl.classList.add('hidden');
      return;
    }
    
    emptyEl.classList.add('hidden');
    listEl.classList.remove('hidden');
    
    listEl.innerHTML = this.selectedFiles.map((file, index) => `
      <div class="image-item" data-index="${index}">
        <div class="image-thumbnail" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem;">
          🖼️
        </div>
        <div class="image-info">
          <div class="image-name" title="${file.name}">${file.name}</div>
          <div class="image-size">${file.sizeFormatted}</div>
        </div>
      </div>
    `).join('');
  }
  
  updatePreviewImageSelect() {
    const select = document.getElementById('preview-image-select');
    select.innerHTML = '<option value="">-- 选择图片 --</option>' +
      this.selectedFiles.map((file, index) => 
        `<option value="${index}">${file.name}</option>`
      ).join('');
  }
  
  async loadRules() {
    const result = await window.electronAPI.apiGet('/rules/');
    if (result.success) {
      this.rules = result.data;
      this.updateRuleSelect();
    }
  }
  
  updateRuleSelect() {
    const select = document.getElementById('rule-select');
    select.innerHTML = '<option value="">-- 选择规则 --</option>' +
      this.rules.map(rule => 
        `<option value="${rule.id}">${rule.name}</option>`
      ).join('');
  }
  
  loadRule(ruleId) {
    if (!ruleId) {
      this.currentRuleId = null;
      this.resetRuleForm();
      return;
    }
    
    const rule = this.rules.find(r => r.id === parseInt(ruleId));
    if (!rule) return;
    
    this.currentRuleId = rule.id;
    
    document.getElementById('use-sequence').checked = rule.use_sequence;
    document.getElementById('sequence-start').value = rule.sequence_start;
    document.getElementById('sequence-padding').value = rule.sequence_padding;
    document.getElementById('sequence-prefix').value = rule.sequence_prefix || '';
    document.getElementById('sequence-suffix').value = rule.sequence_suffix || '';
    document.getElementById('sequence-options').classList.toggle('hidden', !rule.use_sequence);
    
    document.getElementById('use-date').checked = rule.use_date;
    document.getElementById('date-source').value = rule.date_source;
    document.getElementById('date-format').value = rule.date_format;
    document.getElementById('date-options').classList.toggle('hidden', !rule.use_date);
    
    document.getElementById('use-exif').checked = rule.use_exif;
    document.getElementById('exif-fields').value = rule.exif_fields || '';
    document.getElementById('exif-options').classList.toggle('hidden', !rule.use_exif);
    
    document.getElementById('use-custom-text').checked = rule.use_custom_text;
    document.getElementById('custom-text').value = rule.custom_text || '';
    document.getElementById('custom-text-position').value = rule.custom_text_position;
    document.getElementById('custom-text-options').classList.toggle('hidden', !rule.use_custom_text);
    
    document.getElementById('separator').value = rule.separator;
    
    this.updateRenamePreview();
  }
  
  resetRuleForm() {
    document.getElementById('use-sequence').checked = true;
    document.getElementById('sequence-start').value = 1;
    document.getElementById('sequence-padding').value = 4;
    document.getElementById('sequence-prefix').value = '';
    document.getElementById('sequence-suffix').value = '';
    document.getElementById('sequence-options').classList.remove('hidden');
    
    document.getElementById('use-date').checked = false;
    document.getElementById('date-source').value = 'file_modified';
    document.getElementById('date-format').value = '%Y%m%d';
    document.getElementById('date-options').classList.add('hidden');
    
    document.getElementById('use-exif').checked = false;
    document.getElementById('exif-fields').value = 'Make,Model';
    document.getElementById('exif-options').classList.add('hidden');
    
    document.getElementById('use-custom-text').checked = false;
    document.getElementById('custom-text').value = '';
    document.getElementById('custom-text-position').value = 'prefix';
    document.getElementById('custom-text-options').classList.add('hidden');
    
    document.getElementById('separator').value = '_';
    
    this.updateRenamePreview();
  }
  
  async saveRule() {
    const ruleName = prompt('请输入规则名称:');
    if (!ruleName) return;
    
    const ruleData = {
      name: ruleName,
      use_sequence: document.getElementById('use-sequence').checked,
      sequence_start: parseInt(document.getElementById('sequence-start').value) || 1,
      sequence_padding: parseInt(document.getElementById('sequence-padding').value) || 4,
      sequence_prefix: document.getElementById('sequence-prefix').value,
      sequence_suffix: document.getElementById('sequence-suffix').value,
      use_date: document.getElementById('use-date').checked,
      date_source: document.getElementById('date-source').value,
      date_format: document.getElementById('date-format').value,
      use_exif: document.getElementById('use-exif').checked,
      exif_fields: document.getElementById('exif-fields').value,
      use_custom_text: document.getElementById('use-custom-text').checked,
      custom_text: document.getElementById('custom-text').value,
      custom_text_position: document.getElementById('custom-text-position').value,
      separator: document.getElementById('separator').value
    };
    
    let result;
    if (this.currentRuleId) {
      result = await window.electronAPI.apiPut(`/rules/${this.currentRuleId}`, ruleData);
    } else {
      result = await window.electronAPI.apiPost('/rules/', ruleData);
    }
    
    if (result.success) {
      this.showToast('规则保存成功', 'success');
      await this.loadRules();
    } else {
      this.showToast('保存失败: ' + result.error, 'error');
    }
  }
  
  async deleteRule() {
    if (!this.currentRuleId) {
      this.showToast('请先选择要删除的规则', 'error');
      return;
    }
    
    if (!confirm('确定要删除此规则吗？')) return;
    
    const result = await window.electronAPI.apiDelete(`/rules/${this.currentRuleId}`);
    if (result.success) {
      this.showToast('规则已删除', 'success');
      this.currentRuleId = null;
      document.getElementById('rule-select').value = '';
      this.resetRuleForm();
      await this.loadRules();
    } else {
      this.showToast('删除失败: ' + result.error, 'error');
    }
  }
  
  updateRenamePreview() {
    const previewEl = document.getElementById('preview-new-filename');
    
    const parts = [];
    
    if (document.getElementById('use-custom-text').checked) {
      const text = document.getElementById('custom-text').value;
      const position = document.getElementById('custom-text-position').value;
      if (text && position === 'prefix') {
        parts.push(text);
      }
    }
    
    if (document.getElementById('use-date').checked) {
      const format = document.getElementById('date-format').value;
      const dateStr = this.formatDate(new Date(), format);
      parts.push(dateStr);
    }
    
    if (document.getElementById('use-exif').checked) {
      const fields = document.getElementById('exif-fields').value;
      if (fields) {
        parts.push('[EXIF]');
      }
    }
    
    if (document.getElementById('use-sequence').checked) {
      const start = parseInt(document.getElementById('sequence-start').value) || 1;
      const padding = parseInt(document.getElementById('sequence-padding').value) || 4;
      const prefix = document.getElementById('sequence-prefix').value;
      const suffix = document.getElementById('sequence-suffix').value;
      const seqStr = String(start).padStart(padding, '0');
      parts.push(`${prefix}${seqStr}${suffix}`);
    }
    
    if (document.getElementById('use-custom-text').checked) {
      const text = document.getElementById('custom-text').value;
      const position = document.getElementById('custom-text-position').value;
      if (text && position === 'suffix') {
        parts.push(text);
      }
    }
    
    const separator = document.getElementById('separator').value;
    const filename = parts.length > 0 ? parts.join(separator) : 'image';
    
    previewEl.textContent = `${filename}.jpg`;
  }
  
  formatDate(date, format) {
    const formatMap = {
      '%Y': date.getFullYear(),
      '%m': String(date.getMonth() + 1).padStart(2, '0'),
      '%d': String(date.getDate()).padStart(2, '0'),
      '%H': String(date.getHours()).padStart(2, '0'),
      '%M': String(date.getMinutes()).padStart(2, '0'),
      '%S': String(date.getSeconds()).padStart(2, '0')
    };
    
    return format.replace(/%[YmdHMS]/g, match => formatMap[match]);
  }
  
  async selectWatermarkImage() {
    const folder = await window.electronAPI.selectFolder();
    if (folder) {
      const files = await window.electronAPI.selectFiles();
      if (files && files.length > 0) {
        this.watermarkImagePath = files[0];
        document.getElementById('watermark-image-path').textContent = 
          this.watermarkImagePath.split(/[/\\]/).pop();
      }
    }
  }
  
  async selectOutputDir() {
    const folder = await window.electronAPI.selectFolder();
    if (folder) {
      document.getElementById('output-dir').value = folder;
    }
  }
  
  async selectPreviewImage(index) {
    if (index === '') return;
    
    const file = this.selectedFiles[parseInt(index)];
    if (!file) return;
    
    this.selectedPreviewImage = file;
    
    const originalPreview = document.getElementById('original-preview');
    originalPreview.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; color: #6b7280;">
        <span style="font-size: 3rem; margin-bottom: 8px;">🖼️</span>
        <span>${file.name}</span>
      </div>
    `;
    
    document.getElementById('original-info').textContent = 
      `大小: ${file.sizeFormatted} | 修改时间: ${new Date(file.modified).toLocaleDateString()}`;
  }
  
  async generatePreview() {
    if (this.selectedFiles.length === 0) {
      this.showToast('请先选择图片', 'error');
      return;
    }
    
    const selectedIndex = document.getElementById('preview-image-select').value;
    if (selectedIndex === '') {
      this.showToast('请选择要预览的图片', 'error');
      return;
    }
    
    const file = this.selectedFiles[parseInt(selectedIndex)];
    
    const options = {
      resize_width: document.getElementById('enable-resize').checked ? 
        parseInt(document.getElementById('resize-width').value) || null : null,
      resize_height: document.getElementById('enable-resize').checked ? 
        parseInt(document.getElementById('resize-height').value) || null : null,
      resize_keep_aspect: document.getElementById('resize-keep-aspect').checked,
      crop_x: document.getElementById('enable-crop').checked ? 
        parseInt(document.getElementById('crop-x').value) || null : null,
      crop_y: document.getElementById('enable-crop').checked ? 
        parseInt(document.getElementById('crop-y').value) || null : null,
      crop_width: document.getElementById('enable-crop').checked ? 
        parseInt(document.getElementById('crop-width').value) || null : null,
      crop_height: document.getElementById('enable-crop').checked ? 
        parseInt(document.getElementById('crop-height').value) || null : null,
      rotation_angle: this.getRotationAngle()
    };
    
    if (document.getElementById('enable-watermark').checked) {
      options.watermark_type = document.getElementById('watermark-type').value;
      options.watermark_text = document.getElementById('watermark-text').value;
      options.watermark_image_path = this.watermarkImagePath;
      options.watermark_position = document.getElementById('watermark-position').value;
      options.watermark_opacity = parseInt(document.getElementById('watermark-opacity').value) / 100;
      options.watermark_size = options.watermark_type === 'text' ?
        parseInt(document.getElementById('watermark-text-size').value) :
        parseInt(document.getElementById('watermark-image-size').value);
    }
    
    try {
      const response = await fetch(file.path);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('file', blob, file.name);
      formData.append('options', JSON.stringify(options));
      
      const result = await window.electronAPI.apiPost('/preview/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (result.success && result.data.preview) {
        const processedPreview = document.getElementById('processed-preview');
        processedPreview.innerHTML = `<img src="${result.data.preview}" alt="处理后">`;
        
        if (result.data.processed_dimensions) {
          document.getElementById('processed-info').textContent = 
            `尺寸: ${result.data.processed_dimensions.width}x${result.data.processed_dimensions.height}`;
        }
        
        this.showToast('预览生成成功', 'success');
      } else {
        this.showToast('预览生成失败', 'error');
      }
    } catch (error) {
      this.showToast('预览生成失败: ' + error.message, 'error');
    }
  }
  
  getRotationAngle() {
    const select = document.getElementById('rotation-angle');
    if (select.value === 'custom') {
      return parseFloat(document.getElementById('custom-rotation-angle').value) || 0;
    }
    return parseFloat(select.value) || 0;
  }
  
  async loadHistory() {
    const result = await window.electronAPI.apiGet('/images/history/');
    if (result.success) {
      const history = result.data;
      this.renderHistory(history);
    }
  }
  
  renderHistory(history) {
    const emptyEl = document.getElementById('history-empty');
    const listEl = document.getElementById('history-list');
    
    if (history.length === 0) {
      emptyEl.classList.remove('hidden');
      listEl.classList.add('hidden');
      return;
    }
    
    emptyEl.classList.add('hidden');
    listEl.classList.remove('hidden');
    
    listEl.innerHTML = history.map(item => `
      <div class="history-item">
        <div class="history-thumbnail" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem;">
          🖼️
        </div>
        <div class="history-details">
          <div class="history-filename">${item.new_filename}</div>
          <div class="history-meta">原文件: ${item.original_filename} | 处理时间: ${new Date(item.processed_at).toLocaleString()}</div>
        </div>
        <div class="history-status ${item.status}">${item.status === 'success' ? '成功' : '失败'}</div>
      </div>
    `).join('');
  }
  
  async startBatchProcessing() {
    if (this.selectedFiles.length === 0) {
      this.showToast('请先选择要处理的图片', 'error');
      return;
    }
    
    const modal = document.getElementById('processing-modal');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const progressStats = document.getElementById('progress-stats');
    
    modal.classList.remove('hidden');
    
    const options = {
      resize_width: document.getElementById('enable-resize').checked ? 
        parseInt(document.getElementById('resize-width').value) || null : null,
      resize_height: document.getElementById('enable-resize').checked ? 
        parseInt(document.getElementById('resize-height').value) || null : null,
      resize_keep_aspect: document.getElementById('resize-keep-aspect').checked,
      crop_x: document.getElementById('enable-crop').checked ? 
        parseInt(document.getElementById('crop-x').value) || null : null,
      crop_y: document.getElementById('enable-crop').checked ? 
        parseInt(document.getElementById('crop-y').value) || null : null,
      crop_width: document.getElementById('enable-crop').checked ? 
        parseInt(document.getElementById('crop-width').value) || null : null,
      crop_height: document.getElementById('enable-crop').checked ? 
        parseInt(document.getElementById('crop-height').value) || null : null,
      rotation_angle: this.getRotationAngle(),
      output_format: document.getElementById('output-format').value,
      output_quality: parseInt(document.getElementById('output-quality').value),
      rule_id: this.currentRuleId
    };
    
    if (document.getElementById('enable-watermark').checked) {
      options.watermark_type = document.getElementById('watermark-type').value;
      options.watermark_text = document.getElementById('watermark-text').value;
      options.watermark_image_path = this.watermarkImagePath;
      options.watermark_position = document.getElementById('watermark-position').value;
      options.watermark_opacity = parseInt(document.getElementById('watermark-opacity').value) / 100;
      options.watermark_size = options.watermark_type === 'text' ?
        parseInt(document.getElementById('watermark-text-size').value) :
        parseInt(document.getElementById('watermark-image-size').value);
    }
    
    const outputDir = document.getElementById('output-dir').value || null;
    
    const requestData = {
      image_paths: this.selectedFiles.map(f => f.path),
      options: options,
      output_dir: outputDir
    };
    
    try {
      let processed = 0;
      const total = this.selectedFiles.length;
      
      const results = [];
      
      for (const file of this.selectedFiles) {
        progressText.textContent = `正在处理: ${file.name}`;
        progressStats.textContent = `${processed} / ${total}`;
        progressFill.style.width = `${(processed / total) * 100}%`;
        
        const result = await window.electronAPI.apiPost('/images/process/batch', {
          image_paths: [file.path],
          options: options,
          output_dir: outputDir
        });
        
        results.push(result);
        processed++;
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      progressFill.style.width = '100%';
      progressText.textContent = '处理完成!';
      progressStats.textContent = `${processed} / ${total}`;
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = total - successCount;
      
      setTimeout(() => {
        modal.classList.add('hidden');
        
        if (errorCount === 0) {
          this.showToast(`全部处理完成! 成功: ${successCount} 张`, 'success');
        } else {
          this.showToast(`处理完成! 成功: ${successCount} 张, 失败: ${errorCount} 张`, 'error');
        }
        
        this.loadHistory();
      }, 1000);
      
    } catch (error) {
      modal.classList.add('hidden');
      this.showToast('处理失败: ' + error.message, 'error');
    }
  }
  
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new BatchImageProcessor();
});
