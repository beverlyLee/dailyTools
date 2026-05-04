import { useState, useCallback, useEffect, useRef } from 'react';
import * as duckdb from '@duckdb/duckdb-wasm';

interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
}

export const useDuckDB = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const dbRef = useRef<duckdb.AsyncDuckDB | null>(null);
  const connRef = useRef<duckdb.AsyncDuckDBConnection | null>(null);

  const initDuckDB = useCallback(async () => {
    if (initialized || dbRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
      const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

      const worker_url = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker!}");`], { type: 'text/javascript' })
      );

      const worker = new Worker(worker_url);
      const logger = new duckdb.ConsoleLogger();
      const db = new duckdb.AsyncDuckDB(logger, worker);

      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      const conn = await db.connect();

      dbRef.current = db;
      connRef.current = conn;
      setInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'DuckDB 初始化失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [initialized]);

  const loadCSV = useCallback(async (name: string, csvContent: string): Promise<void> => {
    if (!connRef.current) {
      await initDuckDB();
    }

    if (!connRef.current) throw new Error('数据库未初始化');

    setLoading(true);
    try {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      await connRef.current.query(`
        CREATE OR REPLACE TABLE ${name} AS 
        SELECT * FROM read_csv_auto('${url}')
      `);
      
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载 CSV 失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [initDuckDB]);

  const query = useCallback(async (sql: string): Promise<QueryResult> => {
    if (!connRef.current) {
      await initDuckDB();
    }

    if (!connRef.current) throw new Error('数据库未初始化');

    setLoading(true);
    setError(null);

    try {
      const result = await connRef.current.query(sql);
      const columns = result.schema.fields.map(f => f.name);
      const rows: Record<string, unknown>[] = [];
      
      for (let i = 0; i < result.numRows; i++) {
        const row: Record<string, unknown> = {};
        columns.forEach((col, idx) => {
          row[col] = result.getChildAt(idx)?.toArray()[i];
        });
        rows.push(row);
      }

      return { columns, rows };
    } catch (err) {
      const message = err instanceof Error ? err.message : '查询失败';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [initDuckDB]);

  const getTableNames = useCallback(async (): Promise<string[]> => {
    const result = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'");
    return result.rows.map(r => String(r.table_name));
  }, [query]);

  const getTableSchema = useCallback(async (tableName: string): Promise<{ name: string; type: string }[]> => {
    const result = await query(`PRAGMA table_info('${tableName}')`);
    return result.rows.map(r => ({
      name: String(r.name),
      type: String(r.type)
    }));
  }, [query]);

  useEffect(() => {
    return () => {
      if (connRef.current) {
        connRef.current.close();
      }
    };
  }, []);

  return {
    loading,
    error,
    initialized,
    initDuckDB,
    loadCSV,
    query,
    getTableNames,
    getTableSchema
  };
};
