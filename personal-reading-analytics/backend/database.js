const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.resolve(__dirname, 'reading-analytics.db')

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
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT,
        publisher TEXT,
        publication_date TEXT,
        total_pages INTEGER,
        genre TEXT,
        isbn TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('创建books表失败:', err.message)
      } else {
        console.log('books表已就绪')
      }
    })

    db.run(`
      CREATE TABLE IF NOT EXISTS reading_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        start_page INTEGER DEFAULT 0,
        end_page INTEGER,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id)
      )
    `, (err) => {
      if (err) {
        console.error('创建reading_sessions表失败:', err.message)
      } else {
        console.log('reading_sessions表已就绪')
      }
    })

    db.run(`
      CREATE TABLE IF NOT EXISTS reading_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        page_number INTEGER,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES reading_sessions(id)
      )
    `, (err) => {
      if (err) {
        console.error('创建reading_notes表失败:', err.message)
      } else {
        console.log('reading_notes表已就绪')
      }
    })

    db.run(`
      CREATE TABLE IF NOT EXISTS import_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_type TEXT NOT NULL,
        file_name TEXT,
        imported_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )
    `, (err) => {
      if (err) {
        console.error('创建import_records表失败:', err.message)
      } else {
        console.log('import_records表已就绪')
      }
    })
  })
}

module.exports = db
