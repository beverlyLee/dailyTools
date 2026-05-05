const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

let mainWindow;
let backendServerProcess = null;

const BACKEND_HOST = 'localhost';
const BACKEND_PORT = 8080;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    },
    title: '配置管理与差异对比平台'
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开文件',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu-open-file');
          }
        },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu-save-file');
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        {
          label: '重新加载',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.reload();
          }
        },
        {
          label: '切换开发者工具',
          accelerator: 'F12',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: '工具',
      submenu: [
        {
          label: '配置中心',
          click: () => {
            mainWindow.webContents.send('switch-tab', 'config-center');
          }
        },
        {
          label: '差异对比',
          click: () => {
            mainWindow.webContents.send('switch-tab', 'diff-viewer');
          }
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于',
              message: '配置管理与差异对比平台',
              detail: `版本: 1.0.0\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode.js: ${process.versions.node}`
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
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

app.on('before-quit', () => {
  if (backendServerProcess) {
    backendServerProcess.kill();
  }
});

ipcMain.handle('open-file-dialog', async (event, options = {}) => {
  const defaultOptions = {
    properties: ['openFile'],
    filters: [
      { name: '配置文件', extensions: ['json', 'yaml', 'yml', 'env', 'properties', 'conf', 'cfg'] },
      { name: '文本文件', extensions: ['txt', 'text', 'md', 'js', 'ts', 'html', 'css', 'py', 'java', 'c', 'cpp', 'h', 'go', 'rs'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  };

  const result = await dialog.showOpenDialog(mainWindow, { ...defaultOptions, ...options });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return {
        filePath: filePath,
        fileName: path.basename(filePath),
        content: content
      };
    } catch (error) {
      return { error: error.message };
    }
  }
  return null;
});

ipcMain.handle('save-file-dialog', async (event, content, defaultPath) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultPath || 'untitled.txt',
    filters: [
      { name: '配置文件', extensions: ['json', 'yaml', 'yml', 'env', 'properties', 'conf', 'cfg'] },
      { name: '文本文件', extensions: ['txt', 'text', 'md', 'js', 'ts', 'html', 'css', 'py', 'java', 'c', 'cpp', 'h', 'go', 'rs'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    try {
      fs.writeFileSync(result.filePath, content, 'utf-8');
      return {
        filePath: result.filePath,
        fileName: path.basename(result.filePath)
      };
    } catch (error) {
      return { error: error.message };
    }
  }
  return null;
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      filePath: filePath,
      fileName: path.basename(filePath),
      content: content
    };
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return {
      filePath: filePath,
      fileName: path.basename(filePath)
    };
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('list-directory', async (event, dirPath) => {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const result = [];
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      const stats = fs.statSync(fullPath);
      result.push({
        name: item.name,
        path: fullPath,
        isDirectory: item.isDirectory(),
        isFile: item.isFile(),
        size: stats.size,
        modifiedTime: stats.mtime.toISOString()
      });
    }
    
    return result;
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('backend-request', async (event, method, endpoint, data) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data ? Buffer.byteLength(JSON.stringify(data)) : 0
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({
            status: res.statusCode,
            data: response
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: body,
            error: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 0,
        error: error.message
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
});

ipcMain.handle('show-message', async (event, type, title, message, detail) => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: type || 'info',
    title: title || '消息',
    message: message,
    detail: detail
  });
  return result;
});

ipcMain.handle('show-confirm', async (event, title, message, detail) => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: title || '确认',
    message: message,
    detail: detail,
    buttons: ['取消', '确认'],
    defaultId: 1,
    cancelId: 0
  });
  return result.response === 1;
});
