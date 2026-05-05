const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onLoadDicom: (callback) => ipcRenderer.on('load-dicom', callback),
  onLoadDicomFolder: (callback) => ipcRenderer.on('load-dicom-folder', callback),
  onResetView: (callback) => ipcRenderer.on('reset-view', callback),
  onWindowPreset: (callback) => ipcRenderer.on('window-preset', callback),
  onActivateTool: (callback) => ipcRenderer.on('activate-tool', callback),
  onClearMeasurements: (callback) => ipcRenderer.on('clear-measurements', callback),
  onAiDetectLesions: (callback) => ipcRenderer.on('ai-detect-lesions', callback),
  onAiSegmentation: (callback) => ipcRenderer.on('ai-segmentation', callback),
  onToggleAiHighlight: (callback) => ipcRenderer.on('toggle-ai-highlight', callback),
  onExportScreenshot: (callback) => ipcRenderer.on('export-screenshot', callback),
  onNewReport: (callback) => ipcRenderer.on('new-report', callback),
  onAddImageToReport: (callback) => ipcRenderer.on('add-image-to-report', callback),
  
  openDicomDialog: () => ipcRenderer.send('open-dicom-dialog'),
  saveScreenshot: (imageData) => ipcRenderer.send('save-screenshot', imageData),
  onScreenshotSaved: (callback) => ipcRenderer.on('screenshot-saved', callback)
});
