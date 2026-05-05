/**
 * Query Builder for type-safe SQL queries
 * 
 * Provides chainable methods for building SQL queries with
 * type safety based on model definitions.
 */

import { getColumns, getTableName, getPrimaryKey, ColumnMetadata, ColumnType } from './metadata';
import { getConnection } from './connection';

/**
 * Comparison operators
 */
export type ComparisonOperator =
  | '='
  | '!='
  | '<>'
  | '>'
  | '>='
  | '<'
  | '<='
  | 'LIKE'
  | 'NOT LIKE'
  | 'IN'
  | 'NOT IN'
  | 'IS NULL'
  | 'IS NOT NULL'
  | 'BETWEEN';

/**
 * Logical operators
 */
export type LogicalOperator = 'AND' | 'OR';

/**
 * Order direction
 */
export type OrderDirection = 'ASC' | 'DESC';

/**
 * Where clause condition
 */
export interface WhereCondition {
  column: string;
  operator: ComparisonOperator;
  value?: any;
  values?: any[];
  logicalOperator?: LogicalOperator;
}

/**
 * Order by clause
 */
export interface OrderByClause {
  column: string;
  direction: OrderDirection;
}

/**
 * Join type
 */
export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';

/**
 * Join clause
 */
export interface JoinClause {
  type: JoinType;
  table: string;
  on: string;
}

/**
 * Query builder class
 * 
 * Provides fluent API for building SQL queries.
 */
export class QueryBuilder<T = any> {
  private tableName: string;
  private modelClass: Function | null = null;
  private columns: string[] = ['*'];
  private distinctFlag: boolean = false;
  private whereConditions: WhereCondition[] = [];
  private orWhereConditions: WhereCondition[] = [];
  private orderByClauses: OrderByClause[] = [];
  private joinClauses: JoinClause[] = [];
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private groupByColumns: string[] = [];
  private havingConditions: WhereCondition[] = [];
  private params: any[] = [];

  constructor(tableName: string, modelClass?: Function) {
    this.tableName = tableName;
    if (modelClass) {
      this.modelClass = modelClass;
    }
  }

  /**
   * Select specific columns
   */
  select(...columns: string[]): this {
    this.columns = columns.length > 0 ? columns : ['*'];
    return this;
  }

  /**
   * Add DISTINCT to the query
   */
  distinct(): this {
    this.distinctFlag = true;
    return this;
  }

  /**
   * Add a WHERE clause
   */
  where(column: string, operator: ComparisonOperator, value?: any): this;
  where(column: string, value: any): this;
  where(column: string, operatorOrValue: ComparisonOperator | any, value?: any): this {
    let operator: ComparisonOperator;
    let actualValue: any;

    if (value === undefined) {
      operator = '=';
      actualValue = operatorOrValue;
    } else {
      operator = operatorOrValue as ComparisonOperator;
      actualValue = value;
    }

    this.whereConditions.push({
      column,
      operator,
      value: actualValue,
      logicalOperator: 'AND',
    });

    return this;
  }

  /**
   * Add an OR WHERE clause
   */
  orWhere(column: string, operator: ComparisonOperator, value?: any): this;
  orWhere(column: string, value: any): this;
  orWhere(column: string, operatorOrValue: ComparisonOperator | any, value?: any): this {
    let operator: ComparisonOperator;
    let actualValue: any;

    if (value === undefined) {
      operator = '=';
      actualValue = operatorOrValue;
    } else {
      operator = operatorOrValue as ComparisonOperator;
      actualValue = value;
    }

    this.whereConditions.push({
      column,
      operator,
      value: actualValue,
      logicalOperator: 'OR',
    });

    return this;
  }

  /**
   * Add WHERE IN clause
   */
  whereIn(column: string, values: any[]): this {
    if (values.length === 0) {
      return this;
    }

    this.whereConditions.push({
      column,
      operator: 'IN',
      values,
      logicalOperator: 'AND',
    });

    return this;
  }

  /**
   * Add WHERE NOT IN clause
   */
  whereNotIn(column: string, values: any[]): this {
    if (values.length === 0) {
      return this;
    }

    this.whereConditions.push({
      column,
      operator: 'NOT IN',
      values,
      logicalOperator: 'AND',
    });

    return this;
  }

  /**
   * Add WHERE IS NULL clause
   */
  whereNull(column: string): this {
    this.whereConditions.push({
      column,
      operator: 'IS NULL',
      logicalOperator: 'AND',
    });
    return this;
  }

  /**
   * Add WHERE IS NOT NULL clause
   */
  whereNotNull(column: string): this {
    this.whereConditions.push({
      column,
      operator: 'IS NOT NULL',
      logicalOperator: 'AND',
    });
    return this;
  }

  /**
   * Add WHERE BETWEEN clause
   */
  whereBetween(column: string, start: any, end: any): this {
    this.whereConditions.push({
      column,
      operator: 'BETWEEN',
      values: [start, end],
      logicalOperator: 'AND',
    });
    return this;
  }

  /**
   * Add ORDER BY clause
   */
  orderBy(column: string, direction: OrderDirection = 'ASC'): this {
    this.orderByClauses.push({ column, direction });
    return this;
  }

  /**
   * Add ORDER BY ... DESC
   */
  orderByDesc(column: string): this {
    return this.orderBy(column, 'DESC');
  }

  /**
   * Add LIMIT clause
   */
  limit(limit: number): this {
    this.limitValue = limit;
    return this;
  }

  /**
   * Add OFFSET clause
   */
  offset(offset: number): this {
    this.offsetValue = offset;
    return this;
  }

  /**
   * Add JOIN clause
   */
  join(table: string, on: string, type: JoinType = 'INNER'): this {
    this.joinClauses.push({ type, table, on });
    return this;
  }

  /**
   * Add LEFT JOIN
   */
  leftJoin(table: string, on: string): this {
    return this.join(table, on, 'LEFT');
  }

  /**
   * Add RIGHT JOIN
   */
  rightJoin(table: string, on: string): this {
    return this.join(table, on, 'RIGHT');
  }

  /**
   * Add GROUP BY clause
   */
  groupBy(...columns: string[]): this {
    this.groupByColumns = [...this.groupByColumns, ...columns];
    return this;
  }

  /**
   * Add HAVING clause
   */
  having(column: string, operator: ComparisonOperator, value: any): this {
    this.havingConditions.push({
      column,
      operator,
      value,
      logicalOperator: 'AND',
    });
    return this;
  }

  /**
   * Build the SELECT SQL query
   */
  buildSelect(): { sql: string; params: any[] } {
    let sql = 'SELECT ';
    
    if (this.distinctFlag) {
      sql += 'DISTINCT ';
    }
    
    sql += this.columns.join(', ');
    sql += ` FROM ${this.tableName}`;

    // Add JOINs
    for (const join of this.joinClauses) {
      sql += ` ${join.type} JOIN ${join.table} ON ${join.on}`;
    }

    // Add WHERE
    const params: any[] = [];
    if (this.whereConditions.length > 0) {
      sql += ' WHERE ';
      const conditions = this.whereConditions.map((cond, index) => {
        const prefix = index === 0 ? '' : `${cond.logicalOperator} `;
        return this.buildCondition(cond, params, prefix);
      });
      sql += conditions.join(' ');
    }

    // Add GROUP BY
    if (this.groupByColumns.length > 0) {
      sql += ` GROUP BY ${this.groupByColumns.join(', ')}`;
    }

    // Add HAVING
    if (this.havingConditions.length > 0) {
      sql += ' HAVING ';
      const conditions = this.havingConditions.map((cond, index) => {
        const prefix = index === 0 ? '' : `${cond.logicalOperator} `;
        return this.buildCondition(cond, params, prefix);
      });
      sql += conditions.join(' ');
    }

    // Add ORDER BY
    if (this.orderByClauses.length > 0) {
      const orders = this.orderByClauses.map(
        (o) => `${o.column} ${o.direction}`
      );
      sql += ` ORDER BY ${orders.join(', ')}`;
    }

    // Add LIMIT
    if (this.limitValue !== null) {
      sql += ` LIMIT ${this.limitValue}`;
    }

    // Add OFFSET
    if (this.offsetValue !== null) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    return { sql, params };
  }

  /**
   * Build a single WHERE condition
   */
  private buildCondition(cond: WhereCondition, params: any[], prefix: string): string {
    let sql = prefix;

    switch (cond.operator) {
      case 'IS NULL':
      case 'IS NOT NULL':
        sql += `${cond.column} ${cond.operator}`;
        break;
      case 'IN':
      case 'NOT IN':
        if (cond.values && cond.values.length > 0) {
          const placeholders = cond.values.map(() => '?').join(', ');
          sql += `${cond.column} ${cond.operator} (${placeholders})`;
          params.push(...cond.values);
        }
        break;
      case 'BETWEEN':
        if (cond.values && cond.values.length >= 2) {
          sql += `${cond.column} BETWEEN ? AND ?`;
          params.push(cond.values[0], cond.values[1]);
        }
        break;
      default:
        sql += `${cond.column} ${cond.operator} ?`;
        params.push(cond.value);
    }

    return sql;
  }

  /**
   * Build COUNT query
   */
  buildCount(): { sql: string; params: any[] } {
    const originalColumns = this.columns;
    this.columns = ['COUNT(*) as count'];
    const result = this.buildSelect();
    this.columns = originalColumns;
    return result;
  }

  /**
   * Execute the query and return all results
   */
  async get(): Promise<T[]> {
    const { sql, params } = this.buildSelect();
    const conn = await getConnection();
    const rows = await conn.all(sql, params);
    
    if (this.modelClass) {
      return rows.map((row) => this.mapRowToModel(row));
    }
    
    return rows as T[];
  }

  /**
   * Execute the query and return the first result
   */
  async first(): Promise<T | undefined> {
    this.limitValue = 1;
    const results = await this.get();
    return results[0];
  }

  /**
   * Find by primary key
   */
  async find(id: any): Promise<T | undefined> {
    if (!this.modelClass) {
      throw new Error('Model class not set for QueryBuilder');
    }
    
    const primaryKey = getPrimaryKey(this.modelClass);
    if (!primaryKey) {
      throw new Error('Model does not have a primary key defined');
    }
    
    this.where(primaryKey, id);
    return this.first();
  }

  /**
   * Get count of matching records
   */
  async count(): Promise<number> {
    const { sql, params } = this.buildCount();
    const conn = await getConnection();
    const result = await conn.get(sql, params);
    return result?.count || 0;
  }

  /**
   * Check if any records match
   */
  async exists(): Promise<boolean> {
    const count = await this.count();
    return count > 0;
  }

  /**
   * Map database row to model instance
   */
  private mapRowToModel(row: any): T {
    if (!this.modelClass) {
      return row as T;
    }

    const columns = getColumns(this.modelClass);
    const instance: any = new (this.modelClass as any)();

    for (const col of columns) {
      const dbValue = row[col.columnName];
      const typedValue = this.convertValue(dbValue, col.type);
      instance[col.propertyName] = typedValue;
    }

    return instance;
  }

  /**
   * Convert database value to TypeScript type
   */
  private convertValue(value: any, type: ColumnType): any {
    if (value === null || value === undefined) {
      return null;
    }

    switch (type) {
      case ColumnType.Number:
      case ColumnType.Integer:
      case ColumnType.Float:
      case ColumnType.Decimal:
        return Number(value);
      case ColumnType.Boolean:
        return value === 1 || value === true || value === '1' || value === 'true';
      case ColumnType.Date:
      case ColumnType.DateTime:
        return new Date(value);
      case ColumnType.Json:
        if (typeof value === 'string') {
          return JSON.parse(value);
        }
        return value;
      default:
        return value;
    }
  }

  /**
   * Get the generated SQL (for debugging)
   */
  toSQL(): string {
    const { sql, params } = this.buildSelect();
    let result = sql;
    for (const param of params) {
      const escaped = typeof param === 'string' ? `'${param.replace(/'/g, "''")}'` : String(param);
      result = result.replace('?', escaped);
    }
    return result;
  }
}
