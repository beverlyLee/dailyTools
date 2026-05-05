export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';

export type MissingValueStrategy = 'fill' | 'drop' | 'error' | 'ignore';

export type OutlierMethod = 'iqr' | 'zscore';

export interface ValidationRule {
  type: 'email' | 'phone' | 'url' | 'pattern' | 'range' | 'enum' | 'length' | 'custom';
  pattern?: string | RegExp;
  min?: number;
  max?: number;
  values?: any[];
  validator?: (value: any) => boolean;
  message?: string;
}

export interface FieldDefinition {
  type: FieldType;
  required?: boolean;
  nullable?: boolean;
  default?: any;
  missingStrategy?: MissingValueStrategy;
  outlierDetection?: boolean;
  outlierMethod?: OutlierMethod;
  outlierAction?: 'remove' | 'mark' | 'error';
  rules?: ValidationRule[];
  items?: FieldDefinition;
  properties?: Record<string, FieldDefinition>;
  transform?: (value: any) => any;
}

export interface SchemaDefinition {
  fields: Record<string, FieldDefinition>;
  strict?: boolean;
}

export interface ValidationError {
  field: string;
  value: any;
  message: string;
  rule: string;
}

export interface OutlierInfo {
  field: string;
  value: number;
  index: number;
  method: OutlierMethod;
  isOutlier: boolean;
}

export interface CleanResult<T = any> {
  data: T[];
  removedRows: number[];
  outliers: OutlierInfo[];
  errors: ValidationError[];
  transformations: Array<{
    field: string;
    index: number;
    from: any;
    to: any;
  }>;
}

export interface ColumnStats {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
  missingCount: number;
  totalCount: number;
}
