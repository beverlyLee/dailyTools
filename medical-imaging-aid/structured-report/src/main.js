const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    },
    title: '报告结构化录入系统',
    icon: path.join(__dirname, '..', 'assets', 'icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

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
          label: '新建报告',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('new-report');
          }
        },
        {
          label: '打开报告',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            openReportFile();
          }
        },
        {
          type: 'separator'
        },
        {
          label: '保存报告',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('save-report');
          }
        },
        {
          label: '另存为...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow.webContents.send('save-report-as');
          }
        },
        {
          type: 'separator'
        },
        {
          label: '打印报告',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            mainWindow.webContents.send('print-report');
          }
        },
        {
          type: 'separator'
        },
        {
          label: '退出',
          role: 'quit'
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        {
          label: '撤销',
          role: 'undo'
        },
        {
          label: '重做',
          role: 'redo'
        },
        {
          type: 'separator'
        },
        {
          label: '剪切',
          role: 'cut'
        },
        {
          label: '复制',
          role: 'copy'
        },
        {
          label: '粘贴',
          role: 'paste'
        },
        {
          type: 'separator'
        },
        {
          label: '插入影像截图',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            mainWindow.webContents.send('insert-image');
          }
        }
      ]
    },
    {
      label: '模板',
      submenu: [
        {
          label: '模板管理',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            mainWindow.webContents.send('manage-templates');
          }
        },
        {
          type: 'separator'
        },
        {
          label: '保存当前为模板',
          click: () => {
            mainWindow.webContents.send('save-as-template');
          }
        }
      ]
    },
    {
      label: '视图',
      submenu: [
        {
          label: '预览模式',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => {
            mainWindow.webContents.send('toggle-preview');
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
      label: '导出',
      submenu: [
        {
          label: '导出为 PDF',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('export-pdf');
          }
        },
        {
          label: '导出为 Word',
          click: () => {
            mainWindow.webContents.send('export-word');
          }
        },
        {
          type: 'separator'
        },
        {
          label: '导出到 HIS 系统',
          click: () => {
            mainWindow.webContents.send('export-his');
          }
        },
        {
          label: '导出到 RIS 系统',
          click: () => {
            mainWindow.webContents.send('export-ris');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function openReportFile() {
  dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: '报告文件', extensions: ['json', 'report'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const reportData = JSON.parse(content);
        mainWindow.webContents.send('load-report', {
          filePath: filePath,
          data: reportData
        });
      } catch (error) {
        dialog.showErrorBox('打开失败', `无法读取报告文件: ${error.message}`);
      }
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.on('save-report-dialog', (event, reportData) => {
  dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(app.getPath('documents'), `report_${Date.now()}.json`),
    filters: [
      { name: '报告文件', extensions: ['json'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled && result.filePath) {
      try {
        fs.writeFileSync(result.filePath, JSON.stringify(reportData, null, 2));
        event.reply('report-saved', { success: true, path: result.filePath });
      } catch (error) {
        event.reply('report-saved', { success: false, error: error.message });
      }
    }
  });
});

ipcMain.on('select-image-dialog', (event) => {
  dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'gif'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      try {
        const imageBuffer = fs.readFileSync(filePath);
        const base64 = imageBuffer.toString('base64');
        const mimeType = path.extname(filePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
        event.reply('image-selected', {
          success: true,
          filePath: filePath,
          base64: `data:${mimeType};base64,${base64}`,
          fileName: path.basename(filePath)
        });
      } catch (error) {
        event.reply('image-selected', { success: false, error: error.message });
      }
    }
  });
});

ipcMain.on('print-report-dialog', (event) => {
  mainWindow.webContents.print({
    silent: false,
    printBackground: true,
    color: true
  }, (success, errorType) => {
    if (!success) {
      console.error(`打印失败: ${errorType}`);
    }
  });
});
