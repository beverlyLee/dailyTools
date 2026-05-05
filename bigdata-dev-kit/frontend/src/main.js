const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

let mainWindow;
const API_BASE_URL = 'http://localhost:8080/api';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    },
    title: '大数据处理开发套件',
    icon: path.join(__dirname, '../assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
  
  mainWindow.webContents.openDevTools();
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle('open-file-dialog', async (event, options) => {
  const defaultOptions = {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] }
    ]
  };
  
  const result = await dialog.showOpenDialog(mainWindow, { ...defaultOptions, ...options });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      filePath: filePath,
      fileName: path.basename(filePath),
      content: content
    };
  }
  return null;
});

ipcMain.handle('save-file-dialog', async (event, content, defaultPath, options) => {
  const defaultOptions = {
    defaultPath: defaultPath || 'untitled.sql',
    filters: [
      { name: 'SQL Files', extensions: ['sql'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  };
  
  const result = await dialog.showSaveDialog(mainWindow, { ...defaultOptions, ...options });
  
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return {
      filePath: result.filePath,
      fileName: path.basename(result.filePath)
    };
  }
  return null;
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return {
        success: true,
        content: content,
        fileName: path.basename(filePath)
      };
    }
    return { success: false, error: '文件不存在' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, fileName: path.basename(filePath) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('list-files', async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      return { success: false, error: '目录不存在' };
    }
    
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    const result = files.map(file => ({
      name: file.name,
      isDirectory: file.isDirectory(),
      isFile: file.isFile()
    }));
    
    return { success: true, files: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-api-base-url', async () => {
  return API_BASE_URL;
});
