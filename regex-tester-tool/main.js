const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const initSqlJs = require('sql.js');

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');

let mainWindow;
let db;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initDatabase() {
  const SQL = await initSqlJs();
  
  const dbPath = path.join(__dirname, 'regex-library.db');
  
  try {
    const fs = require('fs');
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }
  } catch (error) {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS regex_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      pattern TEXT NOT NULL,
      flags TEXT DEFAULT '',
      description TEXT,
      category TEXT DEFAULT 'general',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const result = db.exec("SELECT COUNT(*) as count FROM regex_patterns");
  if (result.length > 0 && result[0].values[0][0] === 0) {
    const defaultPatterns = [
      { name: '邮箱地址', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', flags: 'g', description: '匹配标准邮箱地址格式', category: '网络' },
      { name: '手机号码', pattern: '1[3-9]\\d{9}', flags: 'g', description: '匹配中国大陆手机号码', category: '联系方式' },
      { name: 'URL地址', pattern: 'https?://[\\w-]+(\\.[\\w-]+)+([\\w.,@?^=%&:/~+#-]*[\\w@?^=%&/~+#-])?', flags: 'gi', description: '匹配HTTP/HTTPS URL地址', category: '网络' },
      { name: 'IPv4地址', pattern: '\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b', flags: 'g', description: '匹配IPv4地址', category: '网络' },
      { name: '日期格式', pattern: '\\d{4}[-/\\.]\\d{1,2}[-/\\.]\\d{1,2}', flags: 'g', description: '匹配YYYY-MM-DD等日期格式', category: '时间' },
      { name: '身份证号', pattern: '[1-9]\\d{5}(?:19|20)\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]', flags: 'g', description: '匹配18位中国大陆身份证号', category: '身份' }
    ];

    for (const pattern of defaultPatterns) {
      db.run(
        "INSERT INTO regex_patterns (name, pattern, flags, description, category) VALUES (?, ?, ?, ?, ?)",
        [pattern.name, pattern.pattern, pattern.flags, pattern.description, pattern.category]
      );
    }
  }

  saveDatabase();
}

function saveDatabase() {
  const fs = require('fs');
  const dbPath = path.join(__dirname, 'regex-library.db');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

app.whenReady().then(async () => {
  await initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('get-all-patterns', () => {
  const result = db.exec("SELECT * FROM regex_patterns ORDER BY created_at DESC");
  if (result.length === 0) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, index) => {
      obj[col] = row[index];
    });
    return obj;
  });
});

ipcMain.handle('add-pattern', (event, pattern) => {
  db.run(
    "INSERT INTO regex_patterns (name, pattern, flags, description, category) VALUES (?, ?, ?, ?, ?)",
    [pattern.name, pattern.pattern, pattern.flags || '', pattern.description || '', pattern.category || 'general']
  );
  saveDatabase();
  return { success: true, id: db.exec("SELECT last_insert_rowid() as id")[0].values[0][0] };
});

ipcMain.handle('update-pattern', (event, pattern) => {
  db.run(
    "UPDATE regex_patterns SET name = ?, pattern = ?, flags = ?, description = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [pattern.name, pattern.pattern, pattern.flags || '', pattern.description || '', pattern.category || 'general', pattern.id]
  );
  saveDatabase();
  return { success: true };
});

ipcMain.handle('delete-pattern', (event, id) => {
  db.run("DELETE FROM regex_patterns WHERE id = ?", [id]);
  saveDatabase();
  return { success: true };
});

ipcMain.handle('get-pattern-by-id', (event, id) => {
  const result = db.exec("SELECT * FROM regex_patterns WHERE id = ?", [id]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  
  const columns = result[0].columns;
  const row = result[0].values[0];
  const obj = {};
  columns.forEach((col, index) => {
    obj[col] = row[index];
  });
  return obj;
});
