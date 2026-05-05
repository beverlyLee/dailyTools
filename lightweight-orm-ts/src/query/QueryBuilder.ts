import { Database, WhereCondition, OrderByClause, ColumnMetadata, ModelClass } from "../types";

export class QueryBuilder<T = any> {
  private db: Database;
  private tableName: string;
  private columns: Map<string, ColumnMetadata>;
  private primaryKey: string;
  private modelClass?: ModelClass<T>;
  
  // 构建状态
  private _select: string[] = [];
  private _where: WhereCondition[] = [];
  private _orderBy: OrderByClause[] = [];
  private _limit: number | null = null;
  private _offset: number | null = null;
  
  constructor(
    db: Database,
    tableName: string,
    columns: Map<string, ColumnMetadata>,
    primaryKey: string = "id",
    modelClass?: ModelClass<T>
  ) {
    this.db = db;
    this.tableName = tableName;
    this.columns = columns;
    this.primaryKey = primaryKey;
    this.modelClass = modelClass;
  }
  
  // 将普通对象转换为模型实例
  private toModelInstance(data: any): T {
    if (!this.modelClass) {
      return data as T;
    }
    
    const instance = new this.modelClass();
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        (instance as any)[key] = data[key];
      }
    }
    return instance;
  }
  
  // 将结果数组转换为模型实例数组
  private toModelInstances(results: any[]): T[] {
    return results.map(r => this.toModelInstance(r));
  }
  
  // 规范化参数值（处理 Date 等特殊类型）
  private normalizeValue(value: any): any {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value === null || value === undefined) {
      return null;
    }
    return value;
  }
  
  // 规范化参数数组
  private normalizeValues(values: any[]): any[] {
    return values.map(v => this.normalizeValue(v));
  }
  
  // 重置构建状态
  private reset(): void {
    this._select = [];
    this._where = [];
    this._orderBy = [];
    this._limit = null;
    this._offset = null;
  }
  
  // 选择列
  select(...columns: string[]): QueryBuilder<T> {
    this._select = columns;
    return this;
  }
  
  // 添加 WHERE 条件
  where(column: keyof T, operator: string, value: any): QueryBuilder<T> {
    this._where.push({
      column: String(column),
      operator: operator as any,
      value
    });
    return this;
  }
  
  // 便捷方法：等于
  whereEq(column: keyof T, value: any): QueryBuilder<T> {
    return this.where(column, "=", value);
  }
  
  // 添加 ORDER BY
  orderBy(column: keyof T, direction: "ASC" | "DESC" = "ASC"): QueryBuilder<T> {
    this._orderBy.push({
      column: String(column),
      direction
    });
    return this;
  }
  
  // 添加 LIMIT
  limit(limit: number): QueryBuilder<T> {
    this._limit = limit;
    return this;
  }
  
  // 添加 OFFSET
  offset(offset: number): QueryBuilder<T> {
    this._offset = offset;
    return this;
  }
  
  // 构建 SELECT SQL
  private buildSelectSQL(): { sql: string; params: any[] } {
    const columns = this._select.length > 0 ? this._select : ["*"];
    let sql = `SELECT ${columns.join(", ")} FROM ${this.tableName}`;
    const params: any[] = [];
    
    // 添加 WHERE 子句
    if (this._where.length > 0) {
      const whereClauses = this._where.map(cond => {
        if (cond.operator === "IN" || cond.operator === "NOT IN") {
          const placeholders = cond.value.map(() => "?").join(", ");
          params.push(...this.normalizeValues(cond.value));
          return `${cond.column} ${cond.operator} (${placeholders})`;
        } else {
          params.push(this.normalizeValue(cond.value));
          return `${cond.column} ${cond.operator} ?`;
        }
      });
      sql += ` WHERE ${whereClauses.join(" AND ")}`;
    }
    
    // 添加 ORDER BY 子句
    if (this._orderBy.length > 0) {
      const orderClauses = this._orderBy.map(o => `${o.column} ${o.direction}`);
      sql += ` ORDER BY ${orderClauses.join(", ")}`;
    }
    
    // 添加 LIMIT 子句
    if (this._limit !== null) {
      sql += ` LIMIT ?`;
      params.push(this._limit);
      
      if (this._offset !== null) {
        sql += ` OFFSET ?`;
        params.push(this._offset);
      }
    }
    
    return { sql, params };
  }
  
  // 执行查询并返回结果
  async find(): Promise<T[]> {
    const { sql, params } = this.buildSelectSQL();
    const results = this.db.query(sql, params);
    this.reset();
    return this.toModelInstances(results);
  }
  
  // 查找单个记录
  async findOne(): Promise<T | null> {
    const results = await this.limit(1).find();
    return results.length > 0 ? results[0] : null;
  }
  
  // 通过 ID 查找
  async findById(id: number | string): Promise<T | null> {
    return await this.where(this.primaryKey as keyof T, "=", id).findOne();
  }
  
  // 执行插入
  async insert(data: Partial<T>): Promise<number> {
    const columnNames: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];
    
    for (const [propertyKey, metadata] of this.columns.entries()) {
      // 跳过自增主键
      if (metadata.isAutoIncrement && data[propertyKey as keyof T] === undefined) {
        continue;
      }
      
      if (data[propertyKey as keyof T] !== undefined) {
        columnNames.push(metadata.columnName);
        placeholders.push("?");
        values.push(this.normalizeValue(data[propertyKey as keyof T]));
      }
    }
    
    if (columnNames.length === 0) {
      throw new Error("No columns to insert");
    }
    
    const sql = `INSERT INTO ${this.tableName} (${columnNames.join(", ")}) VALUES (${placeholders.join(", ")})`;
    const result = this.db.run(sql, values);
    
    return result.lastInsertRowid as number;
  }
  
  // 执行更新
  async update(data: Partial<T>): Promise<number> {
    const setClauses: string[] = [];
    const values: any[] = [];
    
    for (const [propertyKey, metadata] of this.columns.entries()) {
      // 不更新主键
      if (metadata.isPrimaryKey) {
        continue;
      }
      
      if (data[propertyKey as keyof T] !== undefined) {
        setClauses.push(`${metadata.columnName} = ?`);
        values.push(this.normalizeValue(data[propertyKey as keyof T]));
      }
    }
    
    if (setClauses.length === 0) {
      throw new Error("No columns to update");
    }
    
    let sql = `UPDATE ${this.tableName} SET ${setClauses.join(", ")}`;
    
    // 添加 WHERE 子句
    if (this._where.length > 0) {
      const whereClauses = this._where.map(cond => {
        if (cond.operator === "IN" || cond.operator === "NOT IN") {
          const placeholders = cond.value.map(() => "?").join(", ");
          values.push(...this.normalizeValues(cond.value));
          return `${cond.column} ${cond.operator} (${placeholders})`;
        } else {
          values.push(this.normalizeValue(cond.value));
          return `${cond.column} ${cond.operator} ?`;
        }
      });
      sql += ` WHERE ${whereClauses.join(" AND ")}`;
    }
    
    const result = this.db.run(sql, values);
    this.reset();
    
    return result.changes;
  }
  
  // 执行删除
  async delete(): Promise<number> {
    let sql = `DELETE FROM ${this.tableName}`;
    const values: any[] = [];
    
    // 添加 WHERE 子句
    if (this._where.length > 0) {
      const whereClauses = this._where.map(cond => {
        if (cond.operator === "IN" || cond.operator === "NOT IN") {
          const placeholders = cond.value.map(() => "?").join(", ");
          values.push(...this.normalizeValues(cond.value));
          return `${cond.column} ${cond.operator} (${placeholders})`;
        } else {
          values.push(this.normalizeValue(cond.value));
          return `${cond.column} ${cond.operator} ?`;
        }
      });
      sql += ` WHERE ${whereClauses.join(" AND ")}`;
    }
    
    const result = this.db.run(sql, values);
    this.reset();
    
    return result.changes;
  }
  
  // 获取生成的 SQL（用于调试）
  toSQL(): string {
    const { sql, params } = this.buildSelectSQL();
    // 简单地替换参数为值，用于展示
    let sqlWithValues = sql;
    let paramIndex = 0;
    sqlWithValues = sqlWithValues.replace(/\?/g, () => {
      const value = params[paramIndex++];
      if (typeof value === "string") {
        return `'${value}'`;
      }
      return String(value);
    });
    return sqlWithValues;
  }
}
