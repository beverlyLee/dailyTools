import { QueryBuilder } from "../query/QueryBuilder";
import { Database } from "../database/Database";
import { ColumnMetadata, ModelClass } from "../types";

// 全局数据库连接（可选）
let globalDatabase: Database | null = null;

// 设置全局数据库连接
export function setGlobalDatabase(db: Database): void {
  globalDatabase = db;
}

// 获取全局数据库连接
export function getGlobalDatabase(): Database | null {
  return globalDatabase;
}

// 模型基类
export class Model {
  // 静态属性，需要在子类中通过 @Table 装饰器设置
  static tableName: string;
  static columns: Map<string, ColumnMetadata>;
  static primaryKey?: string;
  
  // 实例属性
  [key: string]: any;
  
  // 获取模型的数据库连接
  private static getDatabase(): Database {
    if (!globalDatabase) {
      throw new Error("No database connection. Please use setGlobalDatabase() first.");
    }
    return globalDatabase;
  }
  
  // 验证模型是否正确配置
  private static validateModel(): void {
    if (!this.tableName) {
      throw new Error(`Model ${this.name} is missing @Table decorator`);
    }
    if (!this.columns) {
      throw new Error(`Model ${this.name} has no columns defined`);
    }
  }
  
  // 创建查询构建器
  static query<T extends Model>(): QueryBuilder<T> {
    const self = this as any;
    self.validateModel();
    const db = self.getDatabase();
    
    return new QueryBuilder<T>(
      db,
      self.tableName,
      self.columns,
      self.primaryKey || "id",
      this as any
    );
  }
  
  // 静态方法：查询所有记录
  static async find<T extends Model>(): Promise<T[]> {
    return this.query<T>().find();
  }
  
  // 静态方法：查询单个记录
  static async findOne<T extends Model>(): Promise<T | null> {
    return this.query<T>().findOne();
  }
  
  // 静态方法：通过 ID 查找
  static async findById<T extends Model>(id: number | string): Promise<T | null> {
    return this.query<T>().findById(id);
  }
  
  // 静态方法：插入记录
  static async insert<T extends Model>(data: Partial<T>): Promise<number> {
    return this.query<T>().insert(data);
  }
  
  // 静态方法：更新记录
  static async update<T extends Model>(data: Partial<T>): Promise<number> {
    return this.query<T>().update(data);
  }
  
  // 静态方法：删除记录
  static async delete<T extends Model>(): Promise<number> {
    return this.query<T>().delete();
  }
  
  // 实例方法：保存（插入或更新）
  async save(): Promise<void> {
    const cls = this.constructor as any;
    cls.validateModel();
    
    const primaryKey = cls.primaryKey || "id";
    const id = this[primaryKey];
    
    if (id) {
      // 存在 ID，执行更新
      const updateData: any = {};
      for (const [propertyKey, metadata] of cls.columns.entries()) {
        // 不更新主键
        if (metadata.isPrimaryKey) {
          continue;
        }
        if (this[propertyKey] !== undefined) {
          updateData[propertyKey] = this[propertyKey];
        }
      }
      
      await cls.query()
        .where(primaryKey as keyof Model, "=", id)
        .update(updateData);
    } else {
      // 不存在 ID，执行插入
      const insertData: any = {};
      for (const [propertyKey, metadata] of cls.columns.entries()) {
        // 跳过自增主键
        if (metadata.isAutoIncrement && this[propertyKey] === undefined) {
          continue;
        }
        if (this[propertyKey] !== undefined) {
          insertData[propertyKey] = this[propertyKey];
        }
      }
      
      const newId = await cls.query().insert(insertData);
      
      // 将新生成的 ID 赋值给实例
      if (cls.primaryKey) {
        this[cls.primaryKey] = newId;
      }
    }
  }
  
  // 实例方法：删除
  async delete(): Promise<number> {
    const cls = this.constructor as any;
    cls.validateModel();
    
    const primaryKey = cls.primaryKey || "id";
    const id = this[primaryKey];
    
    if (!id) {
      throw new Error("Cannot delete a model without an ID");
    }
    
    return await cls.query()
      .where(primaryKey as keyof Model, "=", id)
      .delete();
  }
  
  // 静态方法：创建表（用于迁移）
  static createTable(): string {
    const self = this as any;
    self.validateModel();
    
    const columnDefinitions: string[] = [];
    const primaryKeys: string[] = [];
    
    for (const [propertyKey, metadata] of self.columns.entries()) {
      let columnDef = `${metadata.columnName} ${metadata.type}`;
      
      if (metadata.isPrimaryKey) {
        primaryKeys.push(metadata.columnName);
        if (metadata.isAutoIncrement) {
          columnDef += " PRIMARY KEY AUTOINCREMENT";
        } else {
          columnDef += " PRIMARY KEY";
        }
      } else {
        if (!metadata.isNullable) {
          columnDef += " NOT NULL";
        }
        if (metadata.defaultValue !== undefined) {
          columnDef += ` DEFAULT ${typeof metadata.defaultValue === "string" ? `'${metadata.defaultValue}'` : metadata.defaultValue}`;
        }
      }
      
      columnDefinitions.push(columnDef);
    }
    
    return `CREATE TABLE IF NOT EXISTS ${self.tableName} (
      ${columnDefinitions.join(",\n      ")}
    )`;
  }
  
  // 静态方法：删除表（用于迁移）
  static dropTable(): string {
    const self = this as any;
    self.validateModel();
    return `DROP TABLE IF EXISTS ${self.tableName}`;
  }
}
