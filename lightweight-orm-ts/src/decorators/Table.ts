import "reflect-metadata";
import { TableMetadata } from "../types";

const TABLE_METADATA_KEY = "lightweight_orm:table";
const COLUMNS_METADATA_KEY = "lightweight_orm:columns";

// 获取或创建表元数据
function getOrCreateTableMetadata(target: Function): TableMetadata {
  let metadata = Reflect.getMetadata(TABLE_METADATA_KEY, target);
  
  if (!metadata) {
    metadata = {
      tableName: "",
      columns: new Map<string, any>(),
      primaryKey: undefined
    };
    Reflect.defineMetadata(TABLE_METADATA_KEY, metadata, target);
  }
  
  return metadata;
}

// Table 装饰器
export function Table(tableName?: string): ClassDecorator {
  return function(target: Function) {
    const metadata = getOrCreateTableMetadata(target);
    metadata.tableName = tableName || target.name.toLowerCase();
    
    // 也将表名直接附加到类上，方便访问
    (target as any).tableName = metadata.tableName;
    
    // 同时处理列元数据
    const columns = Reflect.getMetadata(COLUMNS_METADATA_KEY, target.prototype) || [];
    const columnsMap = new Map<string, any>();
    let primaryKey = undefined;
    
    for (const column of columns) {
      columnsMap.set(column.propertyKey, column);
      if (column.isPrimaryKey) {
        primaryKey = column;
        (target as any).primaryKey = column.propertyKey;
      }
    }
    
    metadata.columns = columnsMap;
    metadata.primaryKey = primaryKey;
    
    // 将列元数据附加到类上
    (target as any).columns = columnsMap;
    
    // 重新定义元数据
    Reflect.defineMetadata(TABLE_METADATA_KEY, metadata, target);
  };
}

// 导出元数据键，供内部使用
export { TABLE_METADATA_KEY, COLUMNS_METADATA_KEY, getOrCreateTableMetadata };
