const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'comparisons.db');

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    const SQL = await initSqlJs();
    
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS comparisons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        left_file_name TEXT,
        right_file_name TEXT,
        left_content TEXT,
        right_content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.save();
  }

  save() {
    if (this.db) {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
    }
  }

  saveComparison(leftFileName, rightFileName, leftContent, rightContent) {
    if (!this.db) return null;

    const stmt = this.db.prepare(`
      INSERT INTO comparisons (left_file_name, right_file_name, left_content, right_content)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run([leftFileName, rightFileName, leftContent, rightContent]);
    stmt.free();
    this.save();

    const result = this.db.exec('SELECT last_insert_rowid() as id');
    return result[0]?.values[0]?.[0] || null;
  }

  getComparisons(limit = 50) {
    if (!this.db) return [];

    const result = this.db.exec(`
      SELECT id, left_file_name, right_file_name, left_content, right_content, created_at
      FROM comparisons
      ORDER BY created_at DESC
      LIMIT ?
    `, [limit]);

    if (result.length === 0) return [];

    const columns = result[0].columns;
    const rows = result[0].values;

    return rows.map(row => {
      const obj = {};
      columns.forEach((col, index) => {
        obj[col] = row[index];
      });
      return obj;
    });
  }

  deleteComparison(id) {
    if (!this.db) return false;

    const stmt = this.db.prepare('DELETE FROM comparisons WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    this.save();

    return true;
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

module.exports = Database;
