export interface Document {
    id: number;
    title: string;
    content: string;
    fields: Record<string, string>;
}
export interface SearchResult {
    doc_id: number;
    score: number;
    snippet: string;
}
export type SortMethod = 'bm25' | 'tfidf';
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
export interface DataProcessingSearchOptions {
    wasmModule?: any;
    defaultSortMethod?: SortMethod;
}
