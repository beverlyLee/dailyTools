import "reflect-metadata";
import { ColumnType, ColumnMetadata } from "../types";
import { COLUMNS_METADATA_KEY } from "./Table";

// Column 装饰器选项
export interface ColumnOptions {
  name?: string;
  type?: ColumnType;
  nullable?: boolean;
  default?: any;
}

// Column 装饰器
export function Column(options?: ColumnOptions): PropertyDecorator {
  return function(target: Object, propertyKey: string | symbol) {
    const propertyKeyString = String(propertyKey);
    
    // 获取目标的构造函数
    const constructor = target.constructor;
    
    // 获取或创建列元数据
    let columns: ColumnMetadata[] = Reflect.getMetadata(COLUMNS_METADATA_KEY, target) || [];
    
    // 推断列类型
    let columnType: ColumnType = "TEXT";
    const reflectedType = Reflect.getMetadata("design:type", target, propertyKey);
    
    if (reflectedType) {
      switch (reflectedType.name) {
        case "Number":
          columnType = "INTEGER";
          break;
        case "Boolean":
          columnType = "BOOLEAN";
          break;
        case "Date":
          columnType = "DATE";
          break;
        default:
          columnType = "TEXT";
      }
    }
    
    // 合并选项
    const columnMetadata: ColumnMetadata = {
      propertyKey: propertyKeyString,
      columnName: options?.name || propertyKeyString,
      type: options?.type || columnType,
      isPrimaryKey: false,
      isAutoIncrement: false,
      isNullable: options?.nullable !== false, // 默认允许为空
      defaultValue: options?.default
    };
    
    // 检查是否已存在相同的列
    const existingIndex = columns.findIndex(c => c.propertyKey === propertyKeyString);
    if (existingIndex >= 0) {
      // 合并已有的元数据（比如可能有 @PrimaryKey 装饰器）
      columns[existingIndex] = { ...columns[existingIndex], ...columnMetadata };
    } else {
      columns.push(columnMetadata);
    }
    
    // 更新元数据
    Reflect.defineMetadata(COLUMNS_METADATA_KEY, columns, target);
  };
}
