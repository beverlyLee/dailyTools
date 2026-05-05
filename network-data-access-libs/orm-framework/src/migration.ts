/**
 * Migration system
 * 
 * Provides simple schema migration commands (migrate up, migrate down).
 */

import { getColumns, getTableName, getPrimaryKey, ColumnMetadata, ColumnType, getAllModels } from './metadata';
import { getConnection } from './connection';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Migration interface
 */
export interface Migration {
  name: string;
  timestamp: number;
  up: string;
  down: string;
}

/**
 * Migration file structure
 */
export interface MigrationFile {
  timestamp: number;
  name: string;
  up: string | string[];
  down: string | string[];
}

/**
 * Migrations table name
 */
const MIGRATIONS_TABLE = '__migrations__';

/**
 * Migration manager
 */
export class MigrationManager {
  private migrationsDir: string;
  private migrations: Migration[] = [];

  constructor(migrationsDir: string) {
    this.migrationsDir = migrationsDir;
  }

  /**
   * Initialize migrations table
   */
  async initialize(): Promise<void> {
    const conn = await getConnection();
    
    // Create migrations table if not exists
    const sql = `
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        timestamp INTEGER NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await conn.exec(sql);
  }

  /**
   * Load migrations from directory
   */
  async loadMigrations(): Promise<Migration[]> {
    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }
    
    const files = fs.readdirSync(this.migrationsDir)
      .filter((file) => file.endsWith('.ts') || file.endsWith('.js'))
      .sort();
    
    this.migrations = [];
    
    for (const file of files) {
      const filePath = path.join(this.migrationsDir, file);
      
      // Parse filename format: timestamp_name.ts
      const match = file.match(/^(\d+)_(.+)\.(ts|js)$/);
      if (match) {
        const timestamp = parseInt(match[1], 10);
        const name = match[2];
        
        // Load migration module
        try {
          // For simplicity, we'll read the file and extract up/down
          // In a real implementation, you would use require() or dynamic import
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Simple parsing for demonstration
          const upMatch = content.match(/up:\s*['"]([\s\S]*?)['"]|up:\s*\[([\s\S]*?)\]/);
          const downMatch = content.match(/down:\s*['"]([\s\S]*?)['"]|down:\s*\[([\s\S]*?)\]/);
          
          let upSql = '';
          let downSql = '';
          
          if (upMatch) {
            upSql = upMatch[1] || upMatch[2] || '';
          }
          
          if (downMatch) {
            downSql = downMatch[1] || downMatch[2] || '';
          }
          
          this.migrations.push({
            name,
            timestamp,
            up: upSql,
            down: downSql,
          });
        } catch (e) {
          console.error(`Failed to load migration ${file}:`, e);
        }
      }
    }
    
    // Sort by timestamp
    this.migrations.sort((a, b) => a.timestamp - b.timestamp);
    
    return this.migrations;
  }

  /**
   * Get applied migrations
   */
  async getAppliedMigrations(): Promise<string[]> {
    const conn = await getConnection();
    const rows = await conn.all(
      `SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY timestamp ASC`
    );
    return rows.map((row) => row.name);
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const applied = await this.getAppliedMigrations();
    return this.migrations.filter((m) => !applied.includes(m.name));
  }

  /**
   * Run migrations up
   */
  async up(count?: number): Promise<Migration[]> {
    await this.initialize();
    await this.loadMigrations();
    
    const pending = await this.getPendingMigrations();
    const toApply = count ? pending.slice(0, count) : pending;
    const applied: Migration[] = [];
    
    const conn = await getConnection();
    
    for (const migration of toApply) {
      try {
        // Begin transaction
        await conn.beginTransaction();
        
        // Execute up migration
        if (migration.up) {
          // Split multiple statements
          const statements = migration.up
            .split(';')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          
          for (const stmt of statements) {
            await conn.exec(stmt);
          }
        }
        
        // Record migration
        await conn.run(
          `INSERT INTO ${MIGRATIONS_TABLE} (name, timestamp) VALUES (?, ?)`,
          [migration.name, migration.timestamp]
        );
        
        // Commit
        await conn.commit();
        
        applied.push(migration);
        console.log(`Applied migration: ${migration.name}`);
      } catch (e) {
        // Rollback on error
        try {
          await conn.rollback();
        } catch (rollbackErr) {
          console.error('Failed to rollback:', rollbackErr);
        }
        
        console.error(`Failed to apply migration ${migration.name}:`, e);
        throw e;
      }
    }
    
    return applied;
  }

  /**
   * Rollback migrations down
   */
  async down(count: number = 1): Promise<Migration[]> {
    await this.initialize();
    await this.loadMigrations();
    
    const appliedNames = await this.getAppliedMigrations();
    const applied = this.migrations.filter((m) => appliedNames.includes(m.name));
    const toRollback = applied.slice(-count).reverse();
    const rolledBack: Migration[] = [];
    
    const conn = await getConnection();
    
    for (const migration of toRollback) {
      try {
        // Begin transaction
        await conn.beginTransaction();
        
        // Execute down migration
        if (migration.down) {
          // Split multiple statements
          const statements = migration.down
            .split(';')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          
          for (const stmt of statements) {
            await conn.exec(stmt);
          }
        }
        
        // Remove migration record
        await conn.run(
          `DELETE FROM ${MIGRATIONS_TABLE} WHERE name = ?`,
          [migration.name]
        );
        
        // Commit
        await conn.commit();
        
        rolledBack.push(migration);
        console.log(`Rolled back migration: ${migration.name}`);
      } catch (e) {
        // Rollback on error
        try {
          await conn.rollback();
        } catch (rollbackErr) {
          console.error('Failed to rollback:', rollbackErr);
        }
        
        console.error(`Failed to rollback migration ${migration.name}:`, e);
        throw e;
      }
    }
    
    return rolledBack;
  }

  /**
   * Generate migration from model metadata
   */
  generateMigrationFromModel(modelClass: Function, migrationName: string): string {
    const tableName = getTableName(modelClass);
    const columns = getColumns(modelClass);
    const primaryKey = getPrimaryKey(modelClass);
    
    // Build CREATE TABLE statement
    const columnDefs: string[] = [];
    
    for (const col of columns) {
      const colDef = this.buildColumnDefinition(col, primaryKey === col.propertyName);
      columnDefs.push(colDef);
    }
    
    const createTableSql = `CREATE TABLE ${tableName} (
      ${columnDefs.join(',\n      ')}
    )`;
    
    const dropTableSql = `DROP TABLE IF EXISTS ${tableName}`;
    
    // Generate migration file content
    const timestamp = Date.now();
    const migrationContent = `/**
 * Migration: ${migrationName}
 * Generated at: ${new Date().toISOString()}
 */

import { MigrationFile } from 'lightweight-orm';

const migration: MigrationFile = {
  timestamp: ${timestamp},
  name: '${migrationName}',
  up: \`
    ${createTableSql}
  \`,
  down: \`
    ${dropTableSql}
  \`
};

export default migration;
`;
    
    return migrationContent;
  }

  /**
   * Build column definition for CREATE TABLE
   */
  private buildColumnDefinition(col: ColumnMetadata, isPrimary: boolean): string {
    let def = `${col.columnName} `;
    
    // Determine SQL type
    switch (col.type) {
      case ColumnType.String:
        const length = col.length || 255;
        def += `VARCHAR(${length})`;
        break;
      case ColumnType.Text:
        def += 'TEXT';
        break;
      case ColumnType.Integer:
      case ColumnType.Number:
        if (isPrimary && col.isGenerated) {
          def += 'INTEGER PRIMARY KEY AUTOINCREMENT';
        } else {
          def += 'INTEGER';
        }
        break;
      case ColumnType.Float:
      case ColumnType.Decimal:
        def += 'REAL';
        break;
      case ColumnType.Boolean:
        def += 'INTEGER';
        break;
      case ColumnType.Date:
      case ColumnType.DateTime:
        def += 'DATETIME';
        break;
      case ColumnType.Json:
        def += 'TEXT';
        break;
      case ColumnType.Binary:
        def += 'BLOB';
        break;
      default:
        def += 'TEXT';
    }
    
    // Constraints
    if (!col.isNullable && !isPrimary) {
      def += ' NOT NULL';
    }
    
    if (col.isUnique) {
      def += ' UNIQUE';
    }
    
    if (col.default !== undefined) {
      let defaultVal = col.default;
      if (typeof defaultVal === 'string') {
        defaultVal = `'${defaultVal.replace(/'/g, "''")}'`;
      }
      def += ` DEFAULT ${defaultVal}`;
    }
    
    return def;
  }

  /**
   * Create a new migration file
   */
  createMigration(name: string, content: string): string {
    const timestamp = Date.now();
    const fileName = `${timestamp}_${name}.ts`;
    const filePath = path.join(this.migrationsDir, fileName);
    
    // Ensure migrations directory exists
    if (!fs.existsSync(this.migrationsDir)) {
      fs.mkdirSync(this.migrationsDir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Created migration: ${filePath}`);
    
    return filePath;
  }
}

/**
 * Generate CREATE TABLE SQL from model
 */
export function generateCreateTableSQL(modelClass: Function): string {
  const tableName = getTableName(modelClass);
  const columns = getColumns(modelClass);
  const primaryKey = getPrimaryKey(modelClass);
  
  const columnDefs: string[] = [];
  
  for (const col of columns) {
    let def = `${col.columnName} `;
    
    // Determine SQL type
    switch (col.type) {
      case ColumnType.String:
        const length = col.length || 255;
        def += `VARCHAR(${length})`;
        break;
      case ColumnType.Text:
        def += 'TEXT';
        break;
      case ColumnType.Integer:
      case ColumnType.Number:
        if (primaryKey === col.propertyName && col.isGenerated) {
          def += 'INTEGER PRIMARY KEY AUTOINCREMENT';
        } else {
          def += 'INTEGER';
        }
        break;
      case ColumnType.Float:
      case ColumnType.Decimal:
        def += 'REAL';
        break;
      case ColumnType.Boolean:
        def += 'INTEGER';
        break;
      case ColumnType.Date:
      case ColumnType.DateTime:
        def += 'DATETIME';
        break;
      default:
        def += 'TEXT';
    }
    
    // Constraints
    if (!col.isNullable && primaryKey !== col.propertyName) {
      def += ' NOT NULL';
    }
    
    if (col.isUnique) {
      def += ' UNIQUE';
    }
    
    columnDefs.push(def);
  }
  
  return `CREATE TABLE ${tableName} (
  ${columnDefs.join(',\n  ')}
)`;
}

/**
 * Generate DROP TABLE SQL from model
 */
export function generateDropTableSQL(modelClass: Function): string {
  const tableName = getTableName(modelClass);
  return `DROP TABLE IF EXISTS ${tableName}`;
}
