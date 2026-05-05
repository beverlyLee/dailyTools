/**
 * Base Model class
 * 
 * Provides CRUD operations and query building capabilities.
 */

import { getColumns, getTableName, getPrimaryKey, ColumnMetadata, ColumnType } from './metadata';
import { QueryBuilder } from './query-builder';
import { getConnection } from './connection';

/**
 * Type for model class constructor
 */
export type ModelClass<T extends Model> = new () => T;

/**
 * Type-safe query conditions
 */
export type QueryConditions<T> = Partial<{
  [K in keyof T]: T[K] | { operator: string; value: any };
}>;

/**
 * Base Model class
 * 
 * All models should extend this class to get CRUD capabilities.
 */
export abstract class Model {
  /**
   * Get the query builder for this model
   */
  static query<T extends Model>(this: ModelClass<T>): QueryBuilder<T> {
    const tableName = getTableName(this);
    return new QueryBuilder<T>(tableName, this);
  }

  /**
   * Find a record by primary key
   */
  static async find<T extends Model>(
    this: ModelClass<T>,
    id: any
  ): Promise<T | undefined> {
    const qb = this.query();
    return qb.find(id);
  }

  /**
   * Find all records with optional conditions
   */
  static async findAll<T extends Model>(
    this: ModelClass<T>,
    conditions?: QueryConditions<T>
  ): Promise<T[]> {
    const qb = this.query();
    
    if (conditions) {
      for (const [key, value] of Object.entries(conditions)) {
        if (value === undefined || value === null) continue;
        
        if (typeof value === 'object' && 'operator' in value) {
          qb.where(key, value.operator as any, value.value);
        } else {
          qb.where(key, value);
        }
      }
    }
    
    return qb.get();
  }

  /**
   * Find the first record matching conditions
   */
  static async findOne<T extends Model>(
    this: ModelClass<T>,
    conditions: QueryConditions<T>
  ): Promise<T | undefined> {
    const results = await this.findAll(conditions);
    return results[0];
  }

  /**
   * Create a new record
   */
  static async create<T extends Model>(
    this: ModelClass<T>,
    data: Partial<T>
  ): Promise<T> {
    const instance = new this();
    
    // Set properties from data
    for (const [key, value] of Object.entries(data)) {
      (instance as any)[key] = value;
    }
    
    await instance.save();
    return instance;
  }

  /**
   * Update records by conditions
   */
  static async update<T extends Model>(
    this: ModelClass<T>,
    conditions: QueryConditions<T>,
    data: Partial<T>
  ): Promise<number> {
    const columns = getColumns(this);
    const tableName = getTableName(this);
    const primaryKey = getPrimaryKey(this);
    
    // Get columns to update
    const updateColumns: string[] = [];
    const updateValues: any[] = [];
    
    for (const [key, value] of Object.entries(data)) {
      const col = columns.find(c => c.propertyName === key);
      if (col && col.propertyName !== primaryKey) {
        updateColumns.push(`${col.columnName} = ?`);
        updateValues.push(this.convertToDatabaseValue(value, col.type));
      }
    }
    
    if (updateColumns.length === 0) {
      return 0;
    }
    
    // Build WHERE clause
    const whereConditions: string[] = [];
    const whereValues: any[] = [];
    
    for (const [key, value] of Object.entries(conditions)) {
      if (value === undefined || value === null) continue;
      
      const col = columns.find(c => c.propertyName === key);
      if (col) {
        if (typeof value === 'object' && 'operator' in value) {
          whereConditions.push(`${col.columnName} ${value.operator} ?`);
          whereValues.push(this.convertToDatabaseValue(value.value, col.type));
        } else {
          whereConditions.push(`${col.columnName} = ?`);
          whereValues.push(this.convertToDatabaseValue(value, col.type));
        }
      }
    }
    
    let sql = `UPDATE ${tableName} SET ${updateColumns.join(', ')}`;
    
    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    const params = [...updateValues, ...whereValues];
    const conn = await getConnection();
    const result = await conn.run(sql, params);
    return result.changes;
  }

  /**
   * Delete records by conditions
   */
  static async destroy<T extends Model>(
    this: ModelClass<T>,
    conditions: QueryConditions<T>
  ): Promise<number> {
    const columns = getColumns(this);
    const tableName = getTableName(this);
    
    // Build WHERE clause
    const whereConditions: string[] = [];
    const whereValues: any[] = [];
    
    for (const [key, value] of Object.entries(conditions)) {
      if (value === undefined || value === null) continue;
      
      const col = columns.find(c => c.propertyName === key);
      if (col) {
        if (typeof value === 'object' && 'operator' in value) {
          whereConditions.push(`${col.columnName} ${value.operator} ?`);
          whereValues.push(this.convertToDatabaseValue(value.value, col.type));
        } else {
          whereConditions.push(`${col.columnName} = ?`);
          whereValues.push(this.convertToDatabaseValue(value, col.type));
        }
      }
    }
    
    if (whereConditions.length === 0) {
      throw new Error('Cannot delete without conditions (use truncate() to delete all)');
    }
    
    const sql = `DELETE FROM ${tableName} WHERE ${whereConditions.join(' AND ')}`;
    
    const conn = await getConnection();
    const result = await conn.run(sql, whereValues);
    return result.changes;
  }

  /**
   * Delete all records from the table
   */
  static async truncate<T extends Model>(
    this: ModelClass<T>
  ): Promise<number> {
    const tableName = getTableName(this);
    const sql = `DELETE FROM ${tableName}`;
    
    const conn = await getConnection();
    const result = await conn.run(sql, []);
    return result.changes;
  }

  /**
   * Count records
   */
  static async count<T extends Model>(
    this: ModelClass<T>,
    conditions?: QueryConditions<T>
  ): Promise<number> {
    const qb = this.query();
    
    if (conditions) {
      for (const [key, value] of Object.entries(conditions)) {
        if (value === undefined || value === null) continue;
        
        if (typeof value === 'object' && 'operator' in value) {
          qb.where(key, value.operator as any, value.value);
        } else {
          qb.where(key, value);
        }
      }
    }
    
    return qb.count();
  }

  /**
   * Insert a new record (instance method)
   */
  async insert(): Promise<this> {
    const modelClass = this.constructor as any;
    const columns = getColumns(modelClass);
    const tableName = getTableName(modelClass);
    const primaryKey = getPrimaryKey(modelClass);
    
    // Get columns to insert
    const insertColumns: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];
    
    for (const col of columns) {
      // Skip auto-generated primary keys
      if (col.isPrimary && col.isGenerated) {
        continue;
      }
      
      const value = (this as any)[col.propertyName];
      
      // Use default if value is undefined and column has default
      if (value === undefined && col.default !== undefined) {
        insertColumns.push(col.columnName);
        placeholders.push('?');
        values.push(modelClass.convertToDatabaseValue(col.default, col.type));
      } else if (value !== undefined) {
        insertColumns.push(col.columnName);
        placeholders.push('?');
        values.push(modelClass.convertToDatabaseValue(value, col.type));
      }
    }
    
    if (insertColumns.length === 0) {
      throw new Error('No columns to insert');
    }
    
    const sql = `INSERT INTO ${tableName} (${insertColumns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    
    const conn = await getConnection();
    const result = await conn.run(sql, values);
    
    // Set the auto-generated primary key
    if (primaryKey && result.lastID) {
      (this as any)[primaryKey] = result.lastID;
    }
    
    return this;
  }

  /**
   * Update an existing record (instance method)
   */
  async update(): Promise<this> {
    const modelClass = this.constructor as any;
    const columns = getColumns(modelClass);
    const tableName = getTableName(modelClass);
    const primaryKey = getPrimaryKey(modelClass);
    
    if (!primaryKey) {
      throw new Error('Model does not have a primary key defined');
    }
    
    const primaryKeyValue = (this as any)[primaryKey];
    
    if (primaryKeyValue === undefined || primaryKeyValue === null) {
      throw new Error('Primary key value is required for update');
    }
    
    // Get columns to update
    const updateColumns: string[] = [];
    const values: any[] = [];
    
    for (const col of columns) {
      // Skip primary key
      if (col.isPrimary) {
        continue;
      }
      
      const value = (this as any)[col.propertyName];
      
      if (value !== undefined) {
        updateColumns.push(`${col.columnName} = ?`);
        values.push(modelClass.convertToDatabaseValue(value, col.type));
      }
    }
    
    if (updateColumns.length === 0) {
      return this;
    }
    
    // Add primary key value for WHERE clause
    const primaryKeyCol = columns.find(c => c.propertyName === primaryKey);
    if (primaryKeyCol) {
      values.push(modelClass.convertToDatabaseValue(primaryKeyValue, primaryKeyCol.type));
    } else {
      values.push(primaryKeyValue);
    }
    
    const sql = `UPDATE ${tableName} SET ${updateColumns.join(', ')} WHERE ${primaryKey} = ?`;
    
    const conn = await getConnection();
    await conn.run(sql, values);
    
    return this;
  }

  /**
   * Save the model (insert if new, update if existing)
   */
  async save(): Promise<this> {
    const modelClass = this.constructor as any;
    const primaryKey = getPrimaryKey(modelClass);
    
    if (primaryKey) {
      const primaryKeyValue = (this as any)[primaryKey];
      
      // Check if record exists
      if (primaryKeyValue !== undefined && primaryKeyValue !== null) {
        const existing = await modelClass.find(primaryKeyValue);
        if (existing) {
          return this.update();
        }
      }
    }
    
    // Default to insert
    return this.insert();
  }

  /**
   * Delete this record
   */
  async delete(): Promise<boolean> {
    const modelClass = this.constructor as any;
    const primaryKey = getPrimaryKey(modelClass);
    
    if (!primaryKey) {
      throw new Error('Model does not have a primary key defined');
    }
    
    const primaryKeyValue = (this as any)[primaryKey];
    
    if (primaryKeyValue === undefined || primaryKeyValue === null) {
      throw new Error('Primary key value is required for delete');
    }
    
    const tableName = getTableName(modelClass);
    const sql = `DELETE FROM ${tableName} WHERE ${primaryKey} = ?`;
    
    const conn = await getConnection();
    const result = await conn.run(sql, [primaryKeyValue]);
    
    return result.changes > 0;
  }

  /**
   * Convert TypeScript value to database value
   */
  private static convertToDatabaseValue(value: any, type: ColumnType): any {
    if (value === null || value === undefined) {
      return null;
    }

    switch (type) {
      case ColumnType.Boolean:
        return value ? 1 : 0;
      case ColumnType.Date:
      case ColumnType.DateTime:
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      case ColumnType.Json:
        if (typeof value === 'string') {
          return value;
        }
        return JSON.stringify(value);
      default:
        return value;
    }
  }
}
