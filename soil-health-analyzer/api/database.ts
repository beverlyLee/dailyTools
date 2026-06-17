import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '..', 'data', 'soil-health.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    initTables(db)
  }
  return db
}

function initTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS soil_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ph REAL NOT NULL,
      organic_matter REAL NOT NULL,
      total_nitrogen REAL NOT NULL,
      available_phosphorus REAL NOT NULL,
      available_potassium REAL NOT NULL,
      shi REAL NOT NULL,
      grade TEXT NOT NULL,
      test_date TEXT NOT NULL,
      ph_score REAL NOT NULL,
      om_score REAL NOT NULL,
      n_score REAL NOT NULL,
      p_score REAL NOT NULL,
      k_score REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prescription_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      soil_record_id INTEGER NOT NULL,
      lime_dosage REAL NOT NULL DEFAULT 0,
      organic_fertilizer_dosage REAL NOT NULL DEFAULT 0,
      green_manure_suggestion TEXT NOT NULL DEFAULT '',
      details_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (soil_record_id) REFERENCES soil_records(id)
    );

    CREATE INDEX IF NOT EXISTS idx_soil_records_date ON soil_records(test_date);
    CREATE INDEX IF NOT EXISTS idx_prescription_records_soil ON prescription_records(soil_record_id);
  `)
}
