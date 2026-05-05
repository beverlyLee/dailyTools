const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    },
    title: '医疗影像辅助诊断系统',
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  createMenu();
}

function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开 DICOM',
          click: () => {
            mainWindow.webContents.send('open-dicom');
          }
        },
        {
          label: '退出',
          role: 'quit'
        }
      ]
    },
    {
      label: '视图',
      submenu: [
        {
          label: '智能阅片',
          click: () => {
            mainWindow.loadFile('smart-viewer/index.html');
          }
        },
        {
          label: '报告管理',
          click: () => {
            mainWindow.loadFile('structured-report/index.html');
          }
        },
        {
          type: 'separator'
        },
        {
          label: '开发者工具',
          role: 'toggleDevTools'
        },
        {
          label: '刷新',
          role: 'reload'
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.on('open-smart-viewer', (event, arg) => {
  mainWindow.loadFile('smart-viewer/index.html');
});

ipcMain.on('open-structured-report', (event, arg) => {
  mainWindow.loadFile('structured-report/index.html');
});
