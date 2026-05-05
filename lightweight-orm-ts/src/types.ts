// Column types
export type ColumnType = "TEXT" | "INTEGER" | "REAL" | "BOOLEAN" | "DATE" | "BLOB";

// Column metadata
export interface ColumnMetadata {
  propertyKey: string;
  columnName: string;
  type: ColumnType;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
  isNullable: boolean;
  defaultValue?: any;
}

// Table metadata
export interface TableMetadata {
  tableName: string;
  columns: Map<string, ColumnMetadata>;
  primaryKey?: ColumnMetadata;
}

// Where conditions
export type WhereOperator = "=" | "!=" | ">" | ">=" | "<" | "<=" | "LIKE" | "IN" | "NOT IN";

export interface WhereCondition {
  column: string;
  operator: WhereOperator;
  value: any;
}

export type WhereClause = WhereCondition[];

// Order by
export type OrderDirection = "ASC" | "DESC";

export interface OrderByClause {
  column: string;
  direction: OrderDirection;
}

// Query options
export interface QueryOptions {
  where?: WhereClause;
  orderBy?: OrderByClause[];
  limit?: number;
  offset?: number;
  select?: string[];
}

// Update values
export type UpdateValues<T> = Partial<Omit<T, "id">>;

// Insert values
export type InsertValues<T> = Partial<T>;

// Migration interface
export interface Migration {
  name: string;
  up: (db: Database) => Promise<void>;
  down: (db: Database) => Promise<void>;
}

// Database connection interface
export interface DatabaseConfig {
  filename: string;
}

export interface Database {
  query(sql: string, params?: any[]): any[];
  run(sql: string, params?: any[]): { lastInsertRowid: number; changes: number };
  transaction(fn: () => void): void;
  close(): void;
}

// Model interface
export interface ModelClass<T> {
  new (): T;
  tableName: string;
  columns: Map<string, ColumnMetadata>;
  primaryKey?: string;
}

// Query result type
export type QueryResult<T> = T[];

// ID type
export type ID = number | string;
