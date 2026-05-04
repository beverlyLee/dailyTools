const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

let mainWindow;
let backendProcess;
const API_BASE = 'http://127.0.0.1:8000/api';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'public', 'icon.png')
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startBackend() {
  const backendPath = path.join(__dirname, '..', 'backend');
  
  backendProcess = spawn('python', ['run.py'], {
    cwd: backendPath,
    stdio: 'inherit',
    shell: true
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}

app.whenReady().then(() => {
  startBackend();
  setTimeout(() => {
    createWindow();
  }, 2000);
});

app.on('window-all-closed', function () {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff'] }
    ]
  });
  return result.filePaths;
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('select-save-path', async (event, defaultPath) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultPath,
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }
    ]
  });
  return result.filePath;
});

ipcMain.handle('api-get', async (event, endpoint, params) => {
  try {
    const response = await axios.get(`${API_BASE}${endpoint}`, { params });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('api-post', async (event, endpoint, data, config) => {
  try {
    const response = await axios.post(`${API_BASE}${endpoint}`, data, config);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('api-put', async (event, endpoint, data) => {
  try {
    const response = await axios.put(`${API_BASE}${endpoint}`, data);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('api-delete', async (event, endpoint) => {
  try {
    const response = await axios.delete(`${API_BASE}${endpoint}`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-file-info', async (event, filePath) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const stats = fs.statSync(filePath);
    return {
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
      sizeFormatted: formatFileSize(stats.size),
      modified: stats.mtime.toISOString(),
      created: stats.birthtime.toISOString()
    };
  } catch (error) {
    return { error: error.message };
  }
});

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
