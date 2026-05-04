const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('./database');

let mainWindow;
let database;

async function createWindow() {
  database = new Database();
  await database.init();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    },
    title: '文本差异比较工具'
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
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

ipcMain.handle('open-file-dialog', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt', 'text', 'md', 'json', 'js', 'ts', 'html', 'css', 'py', 'java', 'c', 'cpp', 'h'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

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

ipcMain.handle('save-file-dialog', async (event, content, defaultPath) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultPath || 'untitled.txt',
    filters: [
      { name: 'Text Files', extensions: ['txt', 'text', 'md', 'json', 'js', 'ts', 'html', 'css', 'py', 'java', 'c', 'cpp', 'h'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return {
      filePath: result.filePath,
      fileName: path.basename(result.filePath)
    };
  }
  return null;
});

ipcMain.handle('save-comparison', async (event, data) => {
  if (!database) return null;
  const { leftFileName, rightFileName, leftContent, rightContent } = data;
  return database.saveComparison(leftFileName, rightFileName, leftContent, rightContent);
});

ipcMain.handle('get-comparisons', async (event) => {
  if (!database) return [];
  return database.getComparisons(50);
});

ipcMain.handle('delete-comparison', async (event, id) => {
  if (!database) return false;
  return database.deleteComparison(id);
});
