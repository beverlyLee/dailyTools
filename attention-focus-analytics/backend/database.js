const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.resolve(__dirname, 'attention-focus.db')

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message)
  } else {
    console.log('成功连接到SQLite数据库')
    initializeDatabase()
  }
})

function initializeDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        external_id TEXT,
        description TEXT,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        duration INTEGER NOT NULL,
        project TEXT,
        tags TEXT,
        productivity_score INTEGER DEFAULT 50,
        is_deep_work INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('创建time_entries表失败:', err.message)
      } else {
        console.log('time_entries表已就绪')
      }
    })

    db.run(`
      CREATE TABLE IF NOT EXISTS daily_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL UNIQUE,
        total_time INTEGER DEFAULT 0,
        deep_work_time INTEGER DEFAULT 0,
        shallow_work_time INTEGER DEFAULT 0,
        efficiency_score REAL DEFAULT 0,
        focus_score REAL DEFAULT 0,
        peak_focus_hour INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('创建daily_metrics表失败:', err.message)
      } else {
        console.log('daily_metrics表已就绪')
      }
    })

    db.run(`
      CREATE TABLE IF NOT EXISTS api_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL UNIQUE,
        api_key TEXT,
        access_token TEXT,
        refresh_token TEXT,
        is_active INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('创建api_configs表失败:', err.message)
      } else {
        console.log('api_configs表已就绪')
      }
    })

    db.run(`
      CREATE TABLE IF NOT EXISTS sync_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        sync_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        entry_count INTEGER DEFAULT 0,
        error_message TEXT,
        started_at DATETIME,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('创建sync_records表失败:', err.message)
      } else {
        console.log('sync_records表已就绪')
      }
    })
  })
}

module.exports = db
