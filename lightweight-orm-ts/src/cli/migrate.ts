#!/usr/bin/env node

import { Database } from "../database/Database";
import { MigrationManager, Migration } from "../migrations/MigrationManager";
import * as fs from "fs";
import * as path from "path";

// 加载配置
function loadConfig(): { database: { filename: string }; migrationsDir: string } {
  const configPath = path.join(process.cwd(), "ormconfig.json");
  
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return {
      database: config.database || { filename: "database.db" },
      migrationsDir: config.migrationsDir || "./migrations"
    };
  }
  
  // 默认配置
  return {
    database: { filename: "database.db" },
    migrationsDir: "./migrations"
  };
}

// 动态加载迁移文件
async function loadMigrations(migrationsDir: string): Promise<Migration[]> {
  const migrations: Migration[] = [];
  const fullPath = path.join(process.cwd(), migrationsDir);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`Migrations directory not found: ${fullPath}`);
    return migrations;
  }
  
  // 读取所有 .ts 文件（排除 index.ts）
  const files = fs.readdirSync(fullPath)
    .filter(file => file.endsWith(".ts") && file !== "index.ts")
    .sort(); // 按名称排序
  
  for (const file of files) {
    const filePath = path.join(fullPath, file);
    // 动态导入迁移文件
    const migrationModule = await import(filePath);
    
    // 迁移文件应该导出一个 default 或 named migration
    if (migrationModule.default) {
      migrations.push(migrationModule.default);
    } else if (migrationModule.migration) {
      migrations.push(migrationModule.migration);
    }
  }
  
  return migrations;
}

// 主函数
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const config = loadConfig();
  
  // 创建数据库连接
  const db = await Database.create(config.database);
  
  // 创建迁移管理器
  const migrationManager = new MigrationManager(db, config.migrationsDir);
  
  // 加载迁移
  const migrations = await loadMigrations(config.migrationsDir);
  migrationManager.registerMigrations(migrations);
  
  try {
    switch (command) {
      case "up":
        console.log("Running migrations up...");
        const upResult = await migrationManager.up();
        if (upResult.applied.length > 0) {
          console.log(`Successfully applied ${upResult.applied.length} migration(s)`);
        }
        break;
        
      case "down":
        const steps = args[1] ? parseInt(args[1]) : 1;
        console.log(`Running migrations down (${steps} step(s))...`);
        const downResult = await migrationManager.down(steps);
        if (downResult.rolledBack.length > 0) {
          console.log(`Successfully rolled back ${downResult.rolledBack.length} migration(s)`);
        }
        break;
        
      case "status":
        console.log("Migration status:");
        const status = migrationManager.status();
        for (const migration of status) {
          const symbol = migration.applied ? "✓" : "○";
          console.log(`  ${symbol} ${migration.name}`);
        }
        break;
        
      default:
        console.log(`
Usage: migrate <command> [options]

Commands:
  up          Apply all pending migrations
  down [n]    Rollback last n migrations (default: 1)
  status      Show migration status

Examples:
  npm run migrate up
  npm run migrate down 2
  npm run migrate status
        `);
    }
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// 运行主函数
main();
