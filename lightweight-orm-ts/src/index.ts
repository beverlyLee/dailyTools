import "reflect-metadata";

// Export decorators
export { Table, Column, PrimaryKey, AutoIncrement } from "./decorators";

// Export query builder
export { QueryBuilder } from "./query/QueryBuilder";

// Export model base class
export { Model, setGlobalDatabase, getGlobalDatabase } from "./model/Model";

// Export database connection
export { Database } from "./database/Database";

// Export migration system
export { Migration, MigrationManager } from "./migrations/MigrationManager";

// Export types
export * from "./types";
export * from "./types/type-safety";
