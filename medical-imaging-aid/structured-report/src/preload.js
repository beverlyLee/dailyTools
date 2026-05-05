const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onNewReport: (callback) => ipcRenderer.on('new-report', callback),
  onLoadReport: (callback) => ipcRenderer.on('load-report', callback),
  onSaveReport: (callback) => ipcRenderer.on('save-report', callback),
  onSaveReportAs: (callback) => ipcRenderer.on('save-report-as', callback),
  onPrintReport: (callback) => ipcRenderer.on('print-report', callback),
  onInsertImage: (callback) => ipcRenderer.on('insert-image', callback),
  onManageTemplates: (callback) => ipcRenderer.on('manage-templates', callback),
  onSaveAsTemplate: (callback) => ipcRenderer.on('save-as-template', callback),
  onTogglePreview: (callback) => ipcRenderer.on('toggle-preview', callback),
  onExportPdf: (callback) => ipcRenderer.on('export-pdf', callback),
  onExportWord: (callback) => ipcRenderer.on('export-word', callback),
  onExportHis: (callback) => ipcRenderer.on('export-his', callback),
  onExportRis: (callback) => ipcRenderer.on('export-ris', callback),

  saveReportDialog: (reportData) => ipcRenderer.send('save-report-dialog', reportData),
  onReportSaved: (callback) => ipcRenderer.on('report-saved', callback),
  
  selectImageDialog: () => ipcRenderer.send('select-image-dialog'),
  onImageSelected: (callback) => ipcRenderer.on('image-selected', callback),
  
  printReportDialog: () => ipcRenderer.send('print-report-dialog'),
  
  showToast: (message) => {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 50px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(79, 70, 229, 0.95);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 0.9rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      animation: fadeInUp 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'fadeInUp 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
});
