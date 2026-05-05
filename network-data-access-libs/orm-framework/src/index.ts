/**
 * Lightweight ORM - A TypeScript ORM framework
 * 
 * Features:
 * - Decorator-based model definition (@Table, @Column)
 * - Type-safe CRUD operations
 * - Query builder with chainable methods
 * - Simple migration system
 */

import 'reflect-metadata';

// Re-export core modules
export * from './decorators';
export * from './connection';
export * from './model';
export * from './query-builder';
export * from './migration';
export * from './metadata';
