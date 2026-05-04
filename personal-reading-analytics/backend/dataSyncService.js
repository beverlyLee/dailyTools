const db = require('./database')
const fs = require('fs')
const path = require('path')

class DataSyncService {
  constructor() {}

  /**
   * 从CSV文件导入阅读记录
   * @param {string} filePath - CSV文件路径
   * @returns {Object} - 导入结果
   */
  async importFromCSV(filePath) {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', async (err, data) => {
        if (err) {
          return reject({ success: false, error: '无法读取文件', details: err.message })
        }
        
        try {
          const lines = data.split('\n')
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
          
          let importedCount = 0
          const errors = []
          
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue
            
            const values = lines[i].split(',').map(v => v.trim())
            
            try {
              const record = this.parseCSVRecord(headers, values)
              
              if (record.type === 'book') {
                await this.importBook(record)
              } else if (record.type === 'session') {
                await this.importSession(record)
              } else if (record.type === 'note') {
                await this.importNote(record)
              }
              
              importedCount++
            } catch (parseErr) {
              errors.push({ line: i + 1, error: parseErr.message })
            }
          }
          
          resolve({
            success: true,
            importedCount,
            errors,
            message: `成功导入 ${importedCount} 条记录`
          })
        } catch (parseErr) {
          reject({
            success: false,
            error: '解析CSV文件失败',
            details: parseErr.message
          })
        }
      })
    })
  }

  /**
   * 解析CSV记录
   * @param {Array} headers - 表头数组
   * @param {Array} values - 值数组
   * @returns {Object} - 解析后的记录对象
   */
  parseCSVRecord(headers, values) {
    const record = {}
    
    headers.forEach((header, index) => {
      if (index < values.length) {
        record[header] = values[index]
      }
    })
    
    // 确定记录类型
    if (record.title && !record.session_id) {
      record.type = 'book'
    } else if (record.start_time || record.book_id) {
      record.type = 'session'
    } else if (record.content && record.session_id) {
      record.type = 'note'
    } else {
      throw new Error('无法确定记录类型')
    }
    
    return record
  }

  /**
   * 导入书籍记录
   * @param {Object} record - 书籍记录
   */
  async importBook(record) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO books (title, author, publisher, publication_date, total_pages, genre, isbn, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      
      db.run(query, [
        record.title,
        record.author || null,
        record.publisher || null,
        record.publication_date || null,
        record.total_pages ? parseInt(record.total_pages) : null,
        record.genre || null,
        record.isbn || null,
        record.description || null
      ], function(err) {
        if (err) {
          reject(err)
        } else {
          resolve({ id: this.lastID })
        }
      })
    })
  }

  /**
   * 导入阅读会话记录
   * @param {Object} record - 阅读会话记录
   */
  async importSession(record) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO reading_sessions (book_id, start_time, end_time, start_page, end_page, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      
      db.run(query, [
        record.book_id ? parseInt(record.book_id) : null,
        record.start_time || null,
        record.end_time || null,
        record.start_page ? parseInt(record.start_page) : null,
        record.end_page ? parseInt(record.end_page) : null,
        record.notes || null
      ], function(err) {
        if (err) {
          reject(err)
        } else {
          resolve({ id: this.lastID })
        }
      })
    })
  }

  /**
   * 导入阅读笔记记录
   * @param {Object} record - 阅读笔记记录
   */
  async importNote(record) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO reading_notes (session_id, page_number, content)
        VALUES (?, ?, ?)
      `
      
      db.run(query, [
        record.session_id ? parseInt(record.session_id) : null,
        record.page_number ? parseInt(record.page_number) : null,
        record.content || null
      ], function(err) {
        if (err) {
          reject(err)
        } else {
          resolve({ id: this.lastID })
        }
      })
    })
  }

  /**
   * 导出数据为CSV格式
   * @param {string} type - 导出类型: 'all', 'books', 'sessions', 'notes'
   * @returns {string} - CSV格式的字符串
   */
  async exportToCSV(type = 'all') {
    return new Promise(async (resolve, reject) => {
      try {
        let csvContent = ''
        
        if (type === 'all' || type === 'books') {
          const books = await this.getAllBooks()
          if (books.length > 0) {
            const headers = Object.keys(books[0])
            csvContent += 'type,' + headers.join(',') + '\n'
            books.forEach(book => {
              csvContent += 'book,' + headers.map(h => `"${book[h] || ''}"`).join(',') + '\n'
            })
          }
        }
        
        if (type === 'all' || type === 'sessions') {
          const sessions = await this.getAllSessions()
          if (sessions.length > 0) {
            if (!csvContent) {
              const headers = Object.keys(sessions[0])
              csvContent += 'type,' + headers.join(',') + '\n'
            }
            sessions.forEach(session => {
              const headers = Object.keys(session)
              csvContent += 'session,' + headers.map(h => `"${session[h] || ''}"`).join(',') + '\n'
            })
          }
        }
        
        if (type === 'all' || type === 'notes') {
          const notes = await this.getAllNotes()
          if (notes.length > 0) {
            if (!csvContent) {
              const headers = Object.keys(notes[0])
              csvContent += 'type,' + headers.join(',') + '\n'
            }
            notes.forEach(note => {
              const headers = Object.keys(note)
              csvContent += 'note,' + headers.map(h => `"${note[h] || ''}"`).join(',') + '\n'
            })
          }
        }
        
        resolve(csvContent)
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * 获取所有书籍
   */
  getAllBooks() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM books', [], (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
  }

  /**
   * 获取所有阅读会话
   */
  getAllSessions() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM reading_sessions', [], (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
  }

  /**
   * 获取所有阅读笔记
   */
  getAllNotes() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM reading_notes', [], (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
  }

  /**
   * 模拟OAuth 2.0连接（用于未来扩展）
   * @param {string} provider - 服务提供商名称
   * @returns {Object} - 模拟的OAuth配置
   */
  getMockOAuthConfig(provider) {
    const mockConfigs = {
      kindle: {
        authorizationUrl: 'https://api.amazon.com/auth/o2/create/codepair',
        tokenUrl: 'https://api.amazon.com/auth/o2/token',
        clientId: 'mock_client_id',
        clientSecret: 'mock_client_secret',
        scope: 'profile:user_id',
        useMock: process.env.USE_MOCK_OAUTH === 'true'
      },
      goodreads: {
        authorizationUrl: 'https://www.goodreads.com/oauth/authorize',
        tokenUrl: 'https://www.goodreads.com/oauth/access_token',
        clientId: 'mock_client_id',
        clientSecret: 'mock_client_secret',
        useMock: process.env.USE_MOCK_OAUTH === 'true'
      }
    }
    
    return mockConfigs[provider] || null
  }

  /**
   * 检查是否使用Mock OAuth
   * @param {string} provider - 服务提供商名称
   * @returns {boolean} - 是否使用Mock
   */
  isUsingMockOAuth(provider) {
    return process.env.USE_MOCK_OAUTH === 'true' || 
           (provider === 'kindle' && process.env.KINDLE_USE_MOCK === 'true') ||
           (provider === 'goodreads' && process.env.GOODREADS_USE_MOCK === 'true')
  }
}

module.exports = DataSyncService
