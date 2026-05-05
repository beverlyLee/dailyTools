import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import { Database as IDatabase, DatabaseConfig } from "../types";
import * as fs from "fs";
import * as path from "path";

export class Database implements IDatabase {
  private db: SqlJsDatabase;
  private filename: string;
  
  private constructor(db: SqlJsDatabase, filename: string) {
    this.db = db;
    this.filename = filename;
  }
  
  // 静态工厂方法创建数据库实例
  static async create(config: DatabaseConfig): Promise<Database> {
    const SQL = await initSqlJs();
    let db: SqlJsDatabase;
    
    // 检查文件是否存在
    if (config.filename === ":memory:") {
      // 内存数据库
      db = new SQL.Database();
    } else if (fs.existsSync(config.filename)) {
      // 从现有文件加载
      const fileBuffer = fs.readFileSync(config.filename);
      db = new SQL.Database(fileBuffer);
    } else {
      // 创建新数据库
      db = new SQL.Database();
    }
    
    return new Database(db, config.filename);
  }
  
  // 保存数据库到文件
  private saveToFile(): void {
    if (this.filename === ":memory:") {
      return; // 内存数据库不需要保存
    }
    
    // 确保目录存在
    const dir = path.dirname(this.filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.filename, buffer);
  }
  
  // 执行查询并返回结果
  query(sql: string, params: any[] = []): any[] {
    const stmt = this.db.prepare(sql);
    
    // 绑定参数
    if (params.length > 0) {
      stmt.bind(params);
    }
    
    const results: any[] = [];
    
    // 获取列名
    const columnNames = stmt.getColumnNames();
    
    // 遍历结果
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(row);
    }
    
    stmt.free();
    return results;
  }
  
  // 执行写入操作（INSERT, UPDATE, DELETE）
  run(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
    const stmt = this.db.prepare(sql);
    
    // 绑定参数
    if (params.length > 0) {
      stmt.bind(params);
    }
    
    // 执行
    const hasMore = stmt.step();
    const changes = this.db.getRowsModified();
    
    stmt.free();
    
    // 获取最后插入的 ID
    const lastIdResult = this.query("SELECT last_insert_rowid() as id");
    const lastInsertRowid = lastIdResult.length > 0 ? lastIdResult[0].id : 0;
    
    // 保存到文件
    this.saveToFile();
    
    return {
      lastInsertRowid: Number(lastInsertRowid),
      changes
    };
  }
  
  // 执行事务
  transaction(fn: () => void): void {
    this.exec("BEGIN TRANSACTION");
    try {
      fn();
      this.exec("COMMIT");
    } catch (error) {
      this.exec("ROLLBACK");
      throw error;
    }
  }
  
  // 关闭数据库连接
  close(): void {
    this.saveToFile();
    this.db.close();
  }
  
  // 执行 SQL 脚本（用于迁移）
  exec(sql: string): void {
    this.db.run(sql);
    this.saveToFile();
  }
  
  // 获取底层的 sql.js 实例（用于高级操作）
  getRawInstance(): SqlJsDatabase {
    return this.db;
  }
}
