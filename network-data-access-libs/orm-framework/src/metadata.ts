/**
 * Metadata management for ORM
 * 
 * Handles storage and retrieval of table and column metadata
 * using Reflect Metadata API.
 */

// Metadata keys
const METADATA_KEY_TABLE = 'orm:table';
const METADATA_KEY_COLUMNS = 'orm:columns';
const METADATA_KEY_PRIMARY_KEY = 'orm:primaryKey';
const METADATA_KEY_RELATIONS = 'orm:relations';

/**
 * Column type definitions
 */
export enum ColumnType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Date = 'date',
  DateTime = 'datetime',
  Text = 'text',
  Integer = 'integer',
  Float = 'float',
  Decimal = 'decimal',
  Json = 'json',
  Binary = 'binary',
}

/**
 * Column metadata
 */
export interface ColumnMetadata {
  propertyName: string;
  columnName: string;
  type: ColumnType;
  isNullable: boolean;
  isPrimary: boolean;
  isGenerated: boolean;
  isUnique: boolean;
  default?: any;
  length?: number;
  precision?: number;
  scale?: number;
}

/**
 * Table metadata
 */
export interface TableMetadata {
  name: string;
  schema?: string;
  primaryKey?: string;
}

/**
 * Model metadata storage
 */
export interface ModelMetadata {
  table: TableMetadata;
  columns: Map<string, ColumnMetadata>;
  primaryKey?: string;
}

// Global metadata storage
const metadataStorage = new Map<Function, ModelMetadata>();

/**
 * Get metadata for a model class
 */
export function getModelMetadata(target: Function): ModelMetadata | undefined {
  return metadataStorage.get(target);
}

/**
 * Get or create metadata for a model class
 */
export function getOrCreateModelMetadata(target: Function): ModelMetadata {
  let metadata = metadataStorage.get(target);
  if (!metadata) {
    metadata = {
      table: { name: target.name },
      columns: new Map(),
    };
    metadataStorage.set(target, metadata);
  }
  return metadata;
}

/**
 * Set table metadata for a class
 */
export function setTableMetadata(target: Function, table: TableMetadata): void {
  const metadata = getOrCreateModelMetadata(target);
  metadata.table = table;
}

/**
 * Add column metadata for a class property
 */
export function addColumnMetadata(
  target: Object,
  propertyName: string,
  column: ColumnMetadata
): void {
  const constructor = target.constructor;
  const metadata = getOrCreateModelMetadata(constructor);
  metadata.columns.set(propertyName, column);
  
  if (column.isPrimary) {
    metadata.primaryKey = propertyName;
  }
}

/**
 * Get column metadata for a property
 */
export function getColumnMetadata(
  target: Object,
  propertyName: string
): ColumnMetadata | undefined {
  const constructor = target.constructor;
  const metadata = getModelMetadata(constructor);
  return metadata?.columns.get(propertyName);
}

/**
 * Get all columns for a model
 */
export function getColumns(target: Function): ColumnMetadata[] {
  const metadata = getModelMetadata(target);
  if (!metadata) return [];
  return Array.from(metadata.columns.values());
}

/**
 * Get table name for a model
 */
export function getTableName(target: Function): string {
  const metadata = getModelMetadata(target);
  return metadata?.table.name || target.name;
}

/**
 * Get primary key for a model
 */
export function getPrimaryKey(target: Function): string | undefined {
  const metadata = getModelMetadata(target);
  return metadata?.primaryKey;
}

/**
 * Check if a class is a valid model
 */
export function isModel(target: Function): boolean {
  return metadataStorage.has(target);
}

/**
 * Get all registered models
 */
export function getAllModels(): Function[] {
  return Array.from(metadataStorage.keys());
}

/**
 * Clear all metadata (for testing)
 */
export function clearMetadata(): void {
  metadataStorage.clear();
}
