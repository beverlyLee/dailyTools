import "reflect-metadata";
import { ColumnMetadata } from "../types";
import { COLUMNS_METADATA_KEY } from "./Table";

// AutoIncrement 装饰器
export function AutoIncrement(): PropertyDecorator {
  return function(target: Object, propertyKey: string | symbol) {
    const propertyKeyString = String(propertyKey);
    
    // 获取或创建列元数据
    let columns: ColumnMetadata[] = Reflect.getMetadata(COLUMNS_METADATA_KEY, target) || [];
    
    // 检查是否已存在相同的列
    const existingIndex = columns.findIndex(c => c.propertyKey === propertyKeyString);
    
    if (existingIndex >= 0) {
      columns[existingIndex] = {
        ...columns[existingIndex],
        isAutoIncrement: true
      };
    } else {
      // 如果列不存在，创建一个默认的列定义
      columns.push({
        propertyKey: propertyKeyString,
        columnName: propertyKeyString,
        type: "INTEGER",
        isPrimaryKey: false,
        isAutoIncrement: true,
        isNullable: false
      });
    }
    
    // 更新元数据
    Reflect.defineMetadata(COLUMNS_METADATA_KEY, columns, target);
  };
}
