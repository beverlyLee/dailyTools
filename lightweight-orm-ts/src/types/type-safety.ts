import { ColumnType } from "../types";

// 类型映射：将数据库列类型映射到 TypeScript 类型
export type TypeMap = {
  TEXT: string;
  INTEGER: number;
  REAL: number;
  BOOLEAN: boolean;
  DATE: Date | string;
  BLOB: Buffer;
};

// 获取列类型对应的 TypeScript 类型
export type ColumnTypeToTS<T extends ColumnType> = TypeMap[T];

// 模型属性类型：根据列元数据推断类型
export interface ColumnTypeInfo {
  propertyKey: string;
  columnName: string;
  type: ColumnType;
  isNullable: boolean;
  isPrimaryKey: boolean;
}

// 类型化的查询条件
export type TypedWhereCondition<T, K extends keyof T> = {
  column: K;
  operator: "=" | "!=" | ">" | ">=" | "<" | "<=" | "LIKE";
  value: T[K] | null;
};

export type TypedWhereClause<T> = TypedWhereCondition<T, keyof T>[];

// 类型化的 IN 条件
export type TypedInCondition<T, K extends keyof T> = {
  column: K;
  operator: "IN" | "NOT IN";
  value: T[K][];
};

// 类型化的排序
export type TypedOrderBy<T> = {
  column: keyof T;
  direction: "ASC" | "DESC";
};

// 类型化的更新值
export type TypedUpdateValues<T> = Partial<{
  [K in keyof T]: T[K] | null;
}>;

// 类型化的插入值
export type TypedInsertValues<T> = Partial<{
  [K in keyof T]: T[K] | null;
}>;

// 模型类型守卫：在运行时验证值是否匹配模型定义
export function createTypeGuard<T extends object>(
  columns: Map<string, { type: ColumnType; isNullable: boolean }>
): (value: any) => value is T {
  return function(value: any): value is T {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    
    for (const [propertyKey, metadata] of columns.entries()) {
      const propValue = value[propertyKey];
      
      // 检查空值
      if (propValue === null || propValue === undefined) {
        if (!metadata.isNullable) {
          return false;
        }
        continue;
      }
      
      // 检查类型
      switch (metadata.type) {
        case "INTEGER":
        case "REAL":
          if (typeof propValue !== "number") {
            return false;
          }
          break;
        case "TEXT":
          if (typeof propValue !== "string") {
            return false;
          }
          break;
        case "BOOLEAN":
          if (typeof propValue !== "boolean") {
            return false;
          }
          break;
        case "DATE":
          if (!(propValue instanceof Date) && typeof propValue !== "string") {
            return false;
          }
          break;
        case "BLOB":
          if (!(propValue instanceof Buffer)) {
            return false;
          }
          break;
      }
    }
    
    return true;
  };
}

// 列名验证：确保列名存在于模型定义中
export function validateColumnName<T>(
  columns: Map<string, any>,
  columnName: keyof T
): void {
  const propertyKey = String(columnName);
  if (!columns.has(propertyKey)) {
    throw new Error(`Column "${propertyKey}" does not exist in model definition`);
  }
}

// 操作符验证：确保操作符适合列类型
export function validateOperator(
  columnType: ColumnType,
  operator: string
): void {
  const operatorsByType: Record<ColumnType, string[]> = {
    TEXT: ["=", "!=", "LIKE", "IN", "NOT IN"],
    INTEGER: ["=", "!=", ">", ">=", "<", "<=", "IN", "NOT IN"],
    REAL: ["=", "!=", ">", ">=", "<", "<=", "IN", "NOT IN"],
    BOOLEAN: ["=", "!=", "IN", "NOT IN"],
    DATE: ["=", "!=", ">", ">=", "<", "<=", "IN", "NOT IN"],
    BLOB: ["=", "!=", "IN", "NOT IN"]
  };
  
  const validOperators = operatorsByType[columnType] || ["=", "!="];
  
  if (!validOperators.includes(operator)) {
    throw new Error(
      `Operator "${operator}" is not valid for column type "${columnType}". Valid operators: ${validOperators.join(", ")}`
    );
  }
}

// 值验证：确保值与列类型匹配
export function validateValue(
  columnType: ColumnType,
  isNullable: boolean,
  value: any,
  operator?: string
): void {
  // 处理空值
  if (value === null || value === undefined) {
    if (!isNullable) {
      throw new Error(`Value cannot be null for non-nullable column`);
    }
    return;
  }
  
  // 处理 IN/NOT IN 操作符
  if (operator === "IN" || operator === "NOT IN") {
    if (!Array.isArray(value)) {
      throw new Error(`Value must be an array for IN/NOT IN operator`);
    }
    // 验证数组中的每个值
    for (const item of value) {
      validateValue(columnType, isNullable, item);
    }
    return;
  }
  
  // 验证单个值的类型
  switch (columnType) {
    case "INTEGER":
      if (typeof value !== "number" || !Number.isInteger(value)) {
        throw new Error(`Value "${value}" is not a valid INTEGER`);
      }
      break;
    case "REAL":
      if (typeof value !== "number") {
        throw new Error(`Value "${value}" is not a valid REAL`);
      }
      break;
    case "TEXT":
      if (typeof value !== "string") {
        throw new Error(`Value "${value}" is not a valid TEXT`);
      }
      break;
    case "BOOLEAN":
      if (typeof value !== "boolean") {
        throw new Error(`Value "${value}" is not a valid BOOLEAN`);
      }
      break;
    case "DATE":
      if (!(value instanceof Date) && typeof value !== "string") {
        throw new Error(`Value "${value}" is not a valid DATE`);
      }
      break;
    case "BLOB":
      if (!(value instanceof Buffer)) {
        throw new Error(`Value is not a valid BLOB (Buffer)`);
      }
      break;
  }
}
