/**
 * Database connection management
 * 
 * Provides connection pooling and SQL execution capabilities.
 */

import sqlite3 from 'sqlite3';
import { EventEmitter } from 'events';

/**
 * Database configuration
 */
export interface ConnectionConfig {
  filename: string;
  mode?: number;
  verbose?: boolean;
}

/**
 * Query result
 */
export interface QueryResult {
  rows: any[];
  lastInsertId?: number;
  changes?: number;
}

/**
 * Connection pool configuration
 */
export interface PoolConfig {
  maxConnections?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
}

/**
 * Database connection class
 * 
 * Wraps sqlite3.Database with promise-based API and connection management.
 */
export class DatabaseConnection {
  private db: sqlite3.Database;
  private connected: boolean = false;
  private inTransaction: boolean = false;

  constructor(private config: ConnectionConfig) {
    if (config.verbose) {
      sqlite3.verbose();
    }
  }

  /**
   * Connect to the database
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const mode = this.config.mode || sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE;
      
      this.db = new sqlite3.Database(this.config.filename, mode, (err) => {
        if (err) {
          reject(err);
        } else {
          this.connected = true;
          resolve();
        }
      });
    });
  }

  /**
   * Close the database connection
   */
  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.db) {
        resolve();
        return;
      }
      
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.connected = false;
          resolve();
        }
      });
    });
  }

  /**
   * Execute a query that returns rows (SELECT)
   */
  all(sql: string, params?: any[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to database'));
        return;
      }
      
      this.db.all(sql, params || [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Execute a query that returns a single row
   */
  get(sql: string, params?: any[]): Promise<any | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to database'));
        return;
      }
      
      this.db.get(sql, params || [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Execute a query that modifies data (INSERT, UPDATE, DELETE)
   */
  run(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to database'));
        return;
      }
      
      this.db.run(sql, params || [], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }

  /**
   * Execute a raw SQL statement
   */
  exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to database'));
        return;
      }
      
      this.db.exec(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<void> {
    await this.exec('BEGIN TRANSACTION');
    this.inTransaction = true;
  }

  /**
   * Commit a transaction
   */
  async commit(): Promise<void> {
    await this.exec('COMMIT');
    this.inTransaction = false;
  }

  /**
   * Rollback a transaction
   */
  async rollback(): Promise<void> {
    await this.exec('ROLLBACK');
    this.inTransaction = false;
  }

  /**
   * Check if in a transaction
   */
  isInTransaction(): boolean {
    return this.inTransaction;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get the underlying sqlite3 database instance
   */
  getRawDatabase(): sqlite3.Database {
    return this.db;
  }
}

/**
 * Connection manager
 * 
 * Manages database connections and provides a simple interface
 * for getting and releasing connections.
 */
export class ConnectionManager {
  private static instance: ConnectionManager | null = null;
  private connection: DatabaseConnection | null = null;
  private config: ConnectionConfig | null = null;
  private isInitialized: boolean = false;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  /**
   * Initialize the connection manager with configuration
   */
  initialize(config: ConnectionConfig): void {
    this.config = config;
    this.isInitialized = false;
  }

  /**
   * Get a database connection
   */
  async getConnection(): Promise<DatabaseConnection> {
    if (!this.config) {
      throw new Error('ConnectionManager not initialized. Call initialize() first.');
    }

    if (!this.connection || !this.connection.isConnected()) {
      this.connection = new DatabaseConnection(this.config);
      await this.connection.connect();
      this.isInitialized = true;
    }

    return this.connection;
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
    this.isInitialized = false;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.isInitialized;
  }
}

/**
 * Create a database connection
 */
export async function createConnection(config: ConnectionConfig): Promise<DatabaseConnection> {
  const connection = new DatabaseConnection(config);
  await connection.connect();
  return connection;
}

/**
 * Initialize the ORM with database configuration
 */
export function initializeORM(config: ConnectionConfig): void {
  const manager = ConnectionManager.getInstance();
  manager.initialize(config);
}

/**
 * Get the current database connection
 */
export async function getConnection(): Promise<DatabaseConnection> {
  const manager = ConnectionManager.getInstance();
  return manager.getConnection();
}

/**
 * Execute a query and return all rows
 */
export async function query(sql: string, params?: any[]): Promise<any[]> {
  const conn = await getConnection();
  return conn.all(sql, params);
}

/**
 * Execute a query and return a single row
 */
export async function queryOne(sql: string, params?: any[]): Promise<any | undefined> {
  const conn = await getConnection();
  return conn.get(sql, params);
}

/**
 * Execute an insert/update/delete query
 */
export async function execute(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
  const conn = await getConnection();
  return conn.run(sql, params);
}
