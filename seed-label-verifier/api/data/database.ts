import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.join(__dirname, '../../data.sqlite');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initDatabase(db);
  }
  return db;
}

function initDatabase(database: Database.Database): void {
  const migrationPath = path.join(__dirname, '../../migrations/001_init.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  database.exec(sql);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
