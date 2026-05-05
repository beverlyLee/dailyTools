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
    title: '智能阅片工作站',
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
          label: '打开 DICOM 文件',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            openDicomFile();
          }
        },
        {
          label: '打开文件夹',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            openDicomFolder();
          }
        },
        {
          type: 'separator'
        },
        {
          label: '导出截图',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('export-screenshot');
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
      label: '视图',
      submenu: [
        {
          label: '重置视图',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.send('reset-view');
          }
        },
        {
          type: 'separator'
        },
        {
          label: '窗宽窗位预设',
          submenu: [
            {
              label: '胸部',
              click: () => {
                mainWindow.webContents.send('window-preset', { ww: 1500, wl: -500 });
              }
            },
            {
              label: '腹部',
              click: () => {
                mainWindow.webContents.send('window-preset', { ww: 400, wl: 40 });
              }
            },
            {
              label: '骨窗',
              click: () => {
                mainWindow.webContents.send('window-preset', { ww: 2000, wl: 400 });
              }
            },
            {
              label: '脑窗',
              click: () => {
                mainWindow.webContents.send('window-preset', { ww: 80, wl: 40 });
              }
            }
          ]
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
      label: '工具',
      submenu: [
        {
          label: '长度测量',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            mainWindow.webContents.send('activate-tool', 'length');
          }
        },
        {
          label: '角度测量',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            mainWindow.webContents.send('activate-tool', 'angle');
          }
        },
        {
          label: '矩形 ROI',
          accelerator: 'CmdOrCtrl+3',
          click: () => {
            mainWindow.webContents.send('activate-tool', 'rectangle');
          }
        },
        {
          label: '椭圆 ROI',
          accelerator: 'CmdOrCtrl+4',
          click: () => {
            mainWindow.webContents.send('activate-tool', 'ellipse');
          }
        },
        {
          type: 'separator'
        },
        {
          label: '清除所有测量',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => {
            mainWindow.webContents.send('clear-measurements');
          }
        }
      ]
    },
    {
      label: 'AI 诊断',
      submenu: [
        {
          label: 'AI 病灶检测',
          accelerator: 'CmdOrCtrl+A',
          click: () => {
            mainWindow.webContents.send('ai-detect-lesions');
          }
        },
        {
          label: '器官分割',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => {
            mainWindow.webContents.send('ai-segmentation');
          }
        },
        {
          type: 'separator'
        },
        {
          label: '隐藏 AI 高亮',
          click: () => {
            mainWindow.webContents.send('toggle-ai-highlight', false);
          }
        },
        {
          label: '显示 AI 高亮',
          click: () => {
            mainWindow.webContents.send('toggle-ai-highlight', true);
          }
        }
      ]
    },
    {
      label: '报告',
      submenu: [
        {
          label: '新建报告',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('new-report');
          }
        },
        {
          label: '添加当前视图到报告',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            mainWindow.webContents.send('add-image-to-report');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function openDicomFile() {
  dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'DICOM 文件', extensions: ['dcm', 'dicom'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const fileBuffer = fs.readFileSync(filePath);
      const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
      mainWindow.webContents.send('load-dicom', {
        filePath: filePath,
        fileName: path.basename(filePath),
        arrayBuffer: arrayBuffer
      });
    }
  });
}

function openDicomFolder() {
  dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0];
      const dicomFiles = [];
      
      try {
        const files = fs.readdirSync(folderPath);
        files.forEach(file => {
          const ext = path.extname(file).toLowerCase();
          if (ext === '.dcm' || ext === '.dicom' || !ext) {
            const fullPath = path.join(folderPath, file);
            try {
              const stats = fs.statSync(fullPath);
              if (stats.isFile()) {
                dicomFiles.push({
                  name: file,
                  path: fullPath
                });
              }
            } catch (e) {}
          }
        });
      } catch (e) {
        console.error('读取文件夹失败:', e);
      }
      
      mainWindow.webContents.send('load-dicom-folder', {
        folderPath: folderPath,
        files: dicomFiles
      });
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

ipcMain.on('open-dicom-dialog', (event) => {
  openDicomFile();
});

ipcMain.on('save-screenshot', (event, imageData) => {
  dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(app.getPath('pictures'), `screenshot_${Date.now()}.png`),
    filters: [
      { name: 'PNG 图片', extensions: ['png'] },
      { name: 'JPEG 图片', extensions: ['jpg', 'jpeg'] }
    ]
  }).then(result => {
    if (!result.canceled && result.filePath) {
      const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(result.filePath, base64Data, 'base64');
      event.reply('screenshot-saved', { success: true, path: result.filePath });
    }
  });
});
