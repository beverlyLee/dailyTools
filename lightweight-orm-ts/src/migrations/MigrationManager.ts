import { Database } from "../database/Database";
import { Migration } from "../types";

// 迁移记录模型（内部使用）
interface MigrationRecord {
  id: number;
  name: string;
  applied_at: string;
}

export class MigrationManager {
  private db: Database;
  private migrationsDir: string;
  private migrations: Map<string, Migration> = new Map();
  
  constructor(db: Database, migrationsDir: string = "./migrations") {
    this.db = db;
    this.migrationsDir = migrationsDir;
    this.initMigrationTable();
  }
  
  // 初始化迁移记录表
  private initMigrationTable(): void {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    this.db.exec(sql);
  }
  
  // 注册迁移
  registerMigration(migration: Migration): void {
    if (this.migrations.has(migration.name)) {
      throw new Error(`Migration "${migration.name}" already registered`);
    }
    this.migrations.set(migration.name, migration);
  }
  
  // 批量注册迁移
  registerMigrations(migrations: Migration[]): void {
    for (const migration of migrations) {
      this.registerMigration(migration);
    }
  }
  
  // 获取已应用的迁移
  private getAppliedMigrations(): string[] {
    const results = this.db.query(
      "SELECT name FROM migrations ORDER BY id ASC"
    ) as MigrationRecord[];
    return results.map(r => r.name);
  }
  
  // 检查迁移是否已应用
  private isMigrationApplied(name: string): boolean {
    const results = this.db.query(
      "SELECT 1 FROM migrations WHERE name = ?",
      [name]
    );
    return results.length > 0;
  }
  
  // 记录迁移已应用
  private recordMigrationApplied(name: string): void {
    this.db.run(
      "INSERT INTO migrations (name, applied_at) VALUES (?, CURRENT_TIMESTAMP)",
      [name]
    );
  }
  
  // 移除迁移记录
  private removeMigrationRecord(name: string): void {
    this.db.run(
      "DELETE FROM migrations WHERE name = ?",
      [name]
    );
  }
  
  // 获取所有迁移，按名称排序
  private getAllMigrations(): Migration[] {
    const migrations = Array.from(this.migrations.values());
    // 按名称排序（假设名称格式是 001_xxx, 002_xxx）
    return migrations.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  // 执行 migrate up（应用所有未应用的迁移）
  async up(): Promise<{ applied: string[] }> {
    const allMigrations = this.getAllMigrations();
    const appliedMigrations = new Set(this.getAppliedMigrations());
    const migrationsToApply = allMigrations.filter(m => !appliedMigrations.has(m.name));
    
    const applied: string[] = [];
    
    for (const migration of migrationsToApply) {
      console.log(`Applying migration: ${migration.name}`);
      
      // 在事务中执行迁移
      this.db.transaction(() => {
        migration.up(this.db);
        this.recordMigrationApplied(migration.name);
      });
      
      applied.push(migration.name);
      console.log(`Applied migration: ${migration.name}`);
    }
    
    if (migrationsToApply.length === 0) {
      console.log("No migrations to apply");
    }
    
    return { applied };
  }
  
  // 执行 migrate down（回滚最后一个迁移，或指定数量）
  async down(steps: number = 1): Promise<{ rolledBack: string[] }> {
    const allMigrations = this.getAllMigrations();
    const appliedMigrations = this.getAppliedMigrations();
    
    // 获取最近应用的迁移
    const migrationsToRollback = appliedMigrations
      .slice(-steps)
      .reverse()
      .map(name => {
        const migration = this.migrations.get(name);
        if (!migration) {
          throw new Error(`Migration "${name}" not found`);
        }
        return migration;
      });
    
    const rolledBack: string[] = [];
    
    for (const migration of migrationsToRollback) {
      console.log(`Rolling back migration: ${migration.name}`);
      
      // 在事务中执行回滚
      this.db.transaction(() => {
        migration.down(this.db);
        this.removeMigrationRecord(migration.name);
      });
      
      rolledBack.push(migration.name);
      console.log(`Rolled back migration: ${migration.name}`);
    }
    
    if (migrationsToRollback.length === 0) {
      console.log("No migrations to rollback");
    }
    
    return { rolledBack };
  }
  
  // 获取迁移状态
  status(): { name: string; applied: boolean }[] {
    const allMigrations = this.getAllMigrations();
    const appliedMigrations = new Set(this.getAppliedMigrations());
    
    return allMigrations.map(migration => ({
      name: migration.name,
      applied: appliedMigrations.has(migration.name)
    }));
  }
}

// 导出 Migration 接口别名
export { Migration };
