const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.resolve(__dirname, 'carbon-footprint.db')

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
      CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        subtype TEXT NOT NULL,
        amount REAL NOT NULL,
        unit TEXT NOT NULL,
        carbon_emission REAL NOT NULL,
        date TEXT NOT NULL,
        note TEXT,
        custom_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('创建records表失败:', err.message)
      } else {
        console.log('records表已就绪')
      }
    })

    db.all("PRAGMA table_info(records)", [], (err, columns) => {
      if (err) {
        console.error('检查表结构失败:', err.message)
        return
      }
      
      const hasCustomData = columns.some(col => col.name === 'custom_data')
      if (!hasCustomData) {
        db.run('ALTER TABLE records ADD COLUMN custom_data TEXT', (alterErr) => {
          if (alterErr) {
            console.error('添加custom_data字段失败:', alterErr.message)
          } else {
            console.log('已添加custom_data字段')
          }
        })
      }
    })
  })
}

module.exports = db
